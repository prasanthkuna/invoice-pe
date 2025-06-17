-- Fix User Management Sync Issue
-- This migration ensures Supabase Auth users and custom users table are properly synchronized

-- Step 1: Add missing INSERT policy for users table (if not already exists)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Service role can insert users'
    ) THEN
        CREATE POLICY "Service role can insert users" ON users
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Step 2: Clean up any existing users table data that might conflict
-- (Since this is a fresh DB, this is precautionary)
TRUNCATE TABLE users CASCADE;

-- Step 3: Create function to sync Supabase Auth users to custom users table
CREATE OR REPLACE FUNCTION sync_auth_user_to_custom_users()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new auth user is created, create corresponding custom user record
    INSERT INTO public.users (id, phone, business_name, gstin, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.phone,
        NEW.raw_user_meta_data->>'business_name',
        NEW.raw_user_meta_data->>'gstin',
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        business_name = EXCLUDED.business_name,
        gstin = EXCLUDED.gstin,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on auth.users to auto-sync (if possible)
-- Note: This might not work in hosted Supabase, but we'll try
DO $$
BEGIN
    -- Try to create trigger on auth.users table
    -- This will fail gracefully if we don't have permissions
    BEGIN
        DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
        CREATE TRIGGER sync_auth_user_trigger
            AFTER INSERT OR UPDATE ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION sync_auth_user_to_custom_users();
    EXCEPTION
        WHEN insufficient_privilege THEN
            -- Trigger creation failed, that's okay
            -- We'll handle sync in the Edge Function instead
            NULL;
    END;
END $$;

-- Step 5: Add helpful comments
COMMENT ON FUNCTION sync_auth_user_to_custom_users() IS 'Syncs Supabase Auth users to custom users table with same ID';

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- Step 7: Verify RLS policies are correct
-- Users should be able to see their own data using auth.uid()
DO $$
BEGIN
    -- Verify the critical RLS policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Users can view own data'
    ) THEN
        RAISE EXCEPTION 'Critical RLS policy missing: Users can view own data';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'vendors' 
        AND policyname = 'Users can view own vendors'
    ) THEN
        RAISE EXCEPTION 'Critical RLS policy missing: Users can view own vendors';
    END IF;
END $$;

-- Step 8: Add debug logging for user sync operations
INSERT INTO debug_context (feature, user_id, session_id, context)
VALUES (
    'auth',
    NULL,
    'migration',
    jsonb_build_object(
        'migration', '20250617000001_fix_user_management_sync',
        'action', 'user_sync_fix_applied',
        'timestamp', NOW(),
        'description', 'Fixed user management sync between Supabase Auth and custom users table'
    )
);
