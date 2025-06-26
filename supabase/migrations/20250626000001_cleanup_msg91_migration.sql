-- ===== MSG91 TO SUPABASE + TWILIO CLEANUP MIGRATION =====
-- Removes MSG91-specific components and optimizes for Supabase native auth
-- Maintains all business functionality while simplifying auth stack

-- Step 1: Remove OTP sessions table (no longer needed with Supabase auth)
DROP TABLE IF EXISTS otp_sessions CASCADE;

-- Step 2: Clean up SMS logs for Twilio compatibility
-- Remove MSG91-specific columns and add Twilio support
ALTER TABLE sms_logs DROP COLUMN IF EXISTS template_id;
ALTER TABLE sms_logs DROP COLUMN IF EXISTS message_id;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'twilio';
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS twilio_sid VARCHAR(100);

-- Step 3: Update SMS logs indexes for better performance
DROP INDEX IF EXISTS idx_sms_logs_template_id;
DROP INDEX IF EXISTS idx_sms_logs_message_id;
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider ON sms_logs(provider);
CREATE INDEX IF NOT EXISTS idx_sms_logs_twilio_sid ON sms_logs(twilio_sid);

-- Step 4: Remove OTP sessions debug trigger (table no longer exists)
-- Skip if table doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'otp_sessions') THEN
        DROP TRIGGER IF EXISTS otp_sessions_debug ON otp_sessions;
    END IF;
END $$;

-- Step 5: Update smart_debug_log function to remove otp_sessions references
CREATE OR REPLACE FUNCTION smart_debug_log()
RETURNS TRIGGER AS $$
DECLARE
    feature_name TEXT;
    user_context UUID;
    session_context TEXT;
    debug_data JSONB;
BEGIN
    -- Determine feature and user from table/operation (removed otp_sessions case)
    CASE TG_TABLE_NAME
        WHEN 'saved_cards' THEN
            feature_name := 'card-management';
            user_context := COALESCE(NEW.user_id, OLD.user_id);
        WHEN 'payments' THEN
            feature_name := 'payment';
            user_context := (SELECT user_id FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id));
        WHEN 'invoices' THEN
            feature_name := 'invoice';
            user_context := COALESCE(NEW.user_id, OLD.user_id);
        WHEN 'sms_logs' THEN
            feature_name := 'sms';
            user_context := (SELECT user_id FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id));
        WHEN 'users' THEN
            feature_name := 'auth';
            user_context := COALESCE(NEW.id, OLD.id);
        ELSE
            RETURN COALESCE(NEW, OLD);
    END CASE;

    -- Build context data
    debug_data := jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'timestamp', NOW()
    );

    -- Add relevant data based on operation
    IF TG_OP = 'DELETE' THEN
        debug_data := debug_data || jsonb_build_object('old_data', to_jsonb(OLD));
    ELSIF TG_OP = 'UPDATE' THEN
        debug_data := debug_data || jsonb_build_object(
            'old_data', to_jsonb(OLD),
            'new_data', to_jsonb(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(to_jsonb(NEW))
                WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key
            )
        );
    ELSE -- INSERT
        debug_data := debug_data || jsonb_build_object('new_data', to_jsonb(NEW));
    END IF;

    -- Only log significant operations (errors, status changes, new records)
    IF TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND (
           (TG_TABLE_NAME = 'payments' AND OLD.status != NEW.status) OR
           (TG_TABLE_NAME = 'invoices' AND OLD.status != NEW.status) OR
           (TG_TABLE_NAME = 'saved_cards' AND OLD.is_active != NEW.is_active) OR
           (TG_TABLE_NAME = 'sms_logs' AND OLD.status != NEW.status) OR
           (TG_TABLE_NAME = 'users' AND (OLD.business_name IS DISTINCT FROM NEW.business_name OR OLD.gstin IS DISTINCT FROM NEW.gstin))
       ))
       OR TG_OP = 'DELETE' THEN

        INSERT INTO debug_context (feature, user_id, session_id, context)
        VALUES (feature_name, user_context, session_context, debug_data);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add debug trigger for users table (for auth debugging)
DROP TRIGGER IF EXISTS users_debug ON users;
CREATE TRIGGER users_debug
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION smart_debug_log();

-- Step 7: Update comments for new architecture
COMMENT ON TABLE sms_logs IS 'SMS activity logging for InvoicePe - Twilio compatible';
COMMENT ON COLUMN sms_logs.provider IS 'SMS provider: twilio (default)';
COMMENT ON COLUMN sms_logs.twilio_sid IS 'Twilio message SID for tracking';

-- Step 8: Log migration completion
INSERT INTO debug_context (feature, user_id, session_id, context)
VALUES (
    'auth',
    NULL,
    'migration',
    jsonb_build_object(
        'migration', '20250626000001_cleanup_msg91_migration',
        'action', 'msg91_cleanup_completed',
        'timestamp', NOW(),
        'description', 'Cleaned up MSG91 components, optimized for Supabase + Twilio',
        'changes', jsonb_build_array(
            'Removed otp_sessions table',
            'Updated sms_logs for Twilio compatibility',
            'Cleaned up debug triggers',
            'Added users table debugging'
        )
    )
);

-- Step 9: Verify critical tables and policies still exist
DO $$
BEGIN
    -- Verify users table and policies
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Critical error: users table missing after migration';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own data') THEN
        RAISE EXCEPTION 'Critical error: users RLS policy missing after migration';
    END IF;
    
    -- Verify sms_logs table structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_logs' AND column_name = 'provider') THEN
        RAISE EXCEPTION 'Critical error: sms_logs provider column missing after migration';
    END IF;
END $$;
