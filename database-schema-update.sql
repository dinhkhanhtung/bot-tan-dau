-- Add bot_settings table for bot control
CREATE TABLE IF NOT EXISTS bot_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default bot status
INSERT INTO bot_settings (key, value) 
VALUES ('bot_status', 'active') 
ON CONFLICT (key) DO NOTHING;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_bot_settings_key ON bot_settings(key);
