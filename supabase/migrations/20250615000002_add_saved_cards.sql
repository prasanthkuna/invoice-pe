-- Add saved cards functionality
CREATE TYPE card_type AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX');

-- Saved cards table for tokenized card storage
CREATE TABLE saved_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phonepe_token TEXT NOT NULL UNIQUE,
    masked_card VARCHAR(20) NOT NULL,
    card_type card_type NOT NULL,
    expiry_month VARCHAR(2) NOT NULL,
    expiry_year VARCHAR(4) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add saved_card_id to payments table
ALTER TABLE payments ADD COLUMN saved_card_id UUID REFERENCES saved_cards(id);

-- Update payment_method enum to include saved_card
ALTER TYPE payment_method ADD VALUE 'saved_card';

-- Indexes for performance
CREATE INDEX idx_saved_cards_user_id ON saved_cards(user_id);
CREATE INDEX idx_saved_cards_user_active ON saved_cards(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_saved_cards_user_default ON saved_cards(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_payments_saved_card ON payments(saved_card_id);

-- RLS policies for saved cards
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved cards
CREATE POLICY "Users can view own saved cards" ON saved_cards
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saved cards
CREATE POLICY "Users can insert own saved cards" ON saved_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved cards
CREATE POLICY "Users can update own saved cards" ON saved_cards
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved cards
CREATE POLICY "Users can delete own saved cards" ON saved_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Function to ensure only one default card per user
CREATE OR REPLACE FUNCTION ensure_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a card as default, unset all other default cards for this user
    IF NEW.is_default = TRUE THEN
        UPDATE saved_cards 
        SET is_default = FALSE, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single default card
CREATE TRIGGER ensure_single_default_card_trigger
    BEFORE INSERT OR UPDATE ON saved_cards
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_card();

-- Function to automatically set first card as default
CREATE OR REPLACE FUNCTION set_first_card_default()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is the user's first card, make it default
    IF NOT EXISTS (
        SELECT 1 FROM saved_cards 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id
    ) THEN
        NEW.is_default = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set first card as default
CREATE TRIGGER set_first_card_default_trigger
    BEFORE INSERT ON saved_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_first_card_default();
