-- Quick Win USPs Database Enhancements
-- Single migration for all 4 features: Idempotency, Dual Notifications, UPI Auto-Collect, CSV Export

-- 1. IDEMPOTENCY: Add idempotency key to payments table
ALTER TABLE payments ADD COLUMN idempotency_key TEXT UNIQUE;

-- 2. DUAL NOTIFICATIONS: Add notifications table for push notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'payment_success', 'payment_failed', 'invoice_reminder'
    data JSONB, -- Additional notification data
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_upi ON vendors(upi_id) WHERE upi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- 4. RLS POLICIES for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 5. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
