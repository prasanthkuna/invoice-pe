-- Create SMS logs table for tracking SMS activities
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    phone VARCHAR(15) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'otp', 'created', 'reminder', 'payment_received'
    template_id VARCHAR(100),
    message_id VARCHAR(100), -- MSG91 message ID
    status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_invoice_id ON sms_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);

-- Add RLS policies
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see SMS logs for their own invoices
CREATE POLICY "Users can view their own SMS logs" ON sms_logs
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM invoices WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert SMS logs for their own invoices
CREATE POLICY "Users can insert SMS logs for their invoices" ON sms_logs
    FOR INSERT WITH CHECK (
        invoice_id IN (
            SELECT id FROM invoices WHERE user_id = auth.uid()
        )
    );

-- Simple view for SMS tracking
CREATE OR REPLACE VIEW sms_summary AS
SELECT
    type,
    COUNT(*) as total_sent,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    ROUND(
        COUNT(CASE WHEN status = 'sent' THEN 1 END) * 100.0 / COUNT(*),
        2
    ) as success_rate
FROM sms_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY type;

-- Grant permissions
GRANT SELECT ON sms_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE sms_logs IS 'Simple SMS activity logging for InvoicePe';
COMMENT ON COLUMN sms_logs.type IS 'Type of SMS: otp, created, reminder, payment_received';
COMMENT ON COLUMN sms_logs.template_id IS 'MSG91 template ID used for sending';
COMMENT ON COLUMN sms_logs.message_id IS 'MSG91 message ID for tracking';
COMMENT ON COLUMN sms_logs.status IS 'SMS status: sent or failed';
COMMENT ON VIEW sms_summary IS 'Simple SMS performance summary';

-- AI Debugging Context Table (minimal, high-performance)
CREATE TABLE IF NOT EXISTS debug_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature TEXT NOT NULL, -- 'card-management', 'payment', 'auth', 'invoice', 'sms'
    session_id TEXT,
    user_id UUID REFERENCES users(id),
    context JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_debug_context_feature ON debug_context(feature);
CREATE INDEX IF NOT EXISTS idx_debug_context_created ON debug_context(created_at);
CREATE INDEX IF NOT EXISTS idx_debug_context_user ON debug_context(user_id);

-- Auto-cleanup old debug logs (keep last 24 hours for performance)
CREATE OR REPLACE FUNCTION cleanup_debug_context()
RETURNS void AS $$
BEGIN
    DELETE FROM debug_context
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Smart debug logging function (handles all tables)
CREATE OR REPLACE FUNCTION smart_debug_log()
RETURNS TRIGGER AS $$
DECLARE
    feature_name TEXT;
    user_context UUID;
    session_context TEXT;
    debug_data JSONB;
BEGIN
    -- Determine feature and user from table/operation
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
        WHEN 'otp_sessions' THEN
            feature_name := 'auth';
            user_context := NULL; -- No user_id in otp_sessions
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
           (TG_TABLE_NAME = 'sms_logs' AND OLD.status != NEW.status)
       ))
       OR TG_OP = 'DELETE' THEN

        INSERT INTO debug_context (feature, user_id, session_id, context)
        VALUES (feature_name, user_context, session_context, debug_data);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to all relevant tables
DROP TRIGGER IF EXISTS saved_cards_debug ON saved_cards;
CREATE TRIGGER saved_cards_debug
    AFTER INSERT OR UPDATE OR DELETE ON saved_cards
    FOR EACH ROW EXECUTE FUNCTION smart_debug_log();

DROP TRIGGER IF EXISTS payments_debug ON payments;
CREATE TRIGGER payments_debug
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION smart_debug_log();

DROP TRIGGER IF EXISTS invoices_debug ON invoices;
CREATE TRIGGER invoices_debug
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION smart_debug_log();

DROP TRIGGER IF EXISTS sms_logs_debug ON sms_logs;
CREATE TRIGGER sms_logs_debug
    AFTER INSERT OR UPDATE ON sms_logs
    FOR EACH ROW EXECUTE FUNCTION smart_debug_log();

DROP TRIGGER IF EXISTS otp_sessions_debug ON otp_sessions;
CREATE TRIGGER otp_sessions_debug
    AFTER INSERT OR UPDATE ON otp_sessions
    FOR EACH ROW EXECUTE FUNCTION smart_debug_log();

-- RLS for debug_context
ALTER TABLE debug_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debug context" ON debug_context
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Grant permissions
GRANT SELECT ON debug_context TO authenticated;
GRANT INSERT ON debug_context TO authenticated;

-- Comments
COMMENT ON TABLE debug_context IS 'Minimal AI debugging context for InvoicePe';
COMMENT ON COLUMN debug_context.feature IS 'Feature area: card-management, payment, auth, invoice, sms';
COMMENT ON COLUMN debug_context.context IS 'JSON context data for debugging';
COMMENT ON FUNCTION smart_debug_log() IS 'Auto-logs significant database operations for AI debugging';
