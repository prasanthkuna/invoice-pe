-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE payment_method AS ENUM ('card', 'upi');
CREATE TYPE payment_status AS ENUM ('initiated', 'succeeded', 'failed');
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'failed');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(25) UNIQUE NOT NULL,
    business_name TEXT,
    gstin VARCHAR(15),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor categories
CREATE TABLE vendor_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES vendor_categories(id),
    upi_id TEXT,
    bank_account TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'INR',
    status invoice_status DEFAULT 'pending',
    pdf_path TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    phonepe_txn_id TEXT,
    method payment_method NOT NULL,
    masked_card VARCHAR(25),
    status payment_status DEFAULT 'initiated',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP sessions for authentication
CREATE TABLE otp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(25) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_phonepe_txn_id ON payments(phonepe_txn_id);
CREATE INDEX idx_otp_sessions_phone ON otp_sessions(phone);
CREATE INDEX idx_otp_sessions_expires_at ON otp_sessions(expires_at);

-- Insert default vendor categories
INSERT INTO vendor_categories (name) VALUES 
    ('Office Supplies'),
    ('Technology'),
    ('Marketing'),
    ('Professional Services'),
    ('Utilities'),
    ('Travel'),
    ('Food & Beverage'),
    ('Other');

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can insert users" ON users
    FOR INSERT WITH CHECK (true);

-- RLS Policies for vendors
CREATE POLICY "Users can view own vendors" ON vendors
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own vendors" ON vendors
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own vendors" ON vendors
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own vendors" ON vendors
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        auth.uid()::text = (
            SELECT user_id::text FROM invoices WHERE invoices.id = payments.invoice_id
        )
    );

CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT WITH CHECK (
        auth.uid()::text = (
            SELECT user_id::text FROM invoices WHERE invoices.id = payments.invoice_id
        )
    );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
