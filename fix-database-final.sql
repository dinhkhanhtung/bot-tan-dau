-- Fix database tables - Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/oxornnooldwivlexsnkf/sql/44e6e180-2d37-4ab8-96ec-14407de7e662

-- 1. Drop the conflicting messages table
DROP TABLE IF EXISTS messages CASCADE;

-- 2. Recreate the original messages table for conversations
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create index for original messages table
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- 4. Create separate table for spam tracking
CREATE TABLE IF NOT EXISTS user_messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create index for user_messages table
CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON user_messages(created_at);

-- 6. Create spam_logs table if not exists
CREATE TABLE IF NOT EXISTS spam_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL DEFAULT 'blocked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create index for spam_logs
CREATE INDEX IF NOT EXISTS idx_spam_logs_user_id ON spam_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_spam_logs_blocked_at ON spam_logs(blocked_at);

-- 8. Create admin_users table if not exists
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

-- 9. Create index for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_facebook_id ON admin_users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- 10. Add admin user
INSERT INTO admin_users (facebook_id, name, role, permissions, is_active)
VALUES ('31268544269455564', 'Default Admin', 'super_admin', '{"all": true}', true)
ON CONFLICT (facebook_id) DO NOTHING;

-- 11. Verify tables exist
SELECT 'Database fixed successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('messages', 'user_messages', 'spam_logs', 'admin_users');
