-- Anti-spam system database setup
-- Run this SQL to create required tables

-- 1. Create messages table for spam tracking
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);

-- 2. Create spam_logs table
CREATE TABLE IF NOT EXISTS spam_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL DEFAULT 'blocked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spam_logs_user_id ON spam_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_spam_logs_blocked_at ON spam_logs(blocked_at);

-- Add comments
COMMENT ON TABLE messages IS 'Logs all user messages for spam tracking';
COMMENT ON COLUMN messages.user_id IS 'Facebook ID of the user';
COMMENT ON COLUMN messages.content IS 'Message content';
COMMENT ON COLUMN messages.message_id IS 'Facebook message ID';

COMMENT ON TABLE spam_logs IS 'Logs spam attempts and blocks';
COMMENT ON COLUMN spam_logs.user_id IS 'Facebook ID of the user';
COMMENT ON COLUMN spam_logs.reason IS 'Reason for blocking';
COMMENT ON COLUMN spam_logs.action IS 'Action taken (blocked, warned, etc.)';

-- 3. Add admin_ids column to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 4. Create admin_users table for better admin management
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin if not exists
INSERT INTO admin_users (facebook_id, name, role, permissions)
VALUES ('31268544269455564', 'Default Admin', 'super_admin', '{"all": true}')
ON CONFLICT (facebook_id) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_users_facebook_id ON admin_users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

COMMENT ON TABLE admin_users IS 'Admin users management';
COMMENT ON COLUMN admin_users.facebook_id IS 'Facebook ID of the admin';
COMMENT ON COLUMN admin_users.role IS 'Admin role (admin, super_admin)';
COMMENT ON COLUMN admin_users.permissions IS 'Admin permissions as JSON';
