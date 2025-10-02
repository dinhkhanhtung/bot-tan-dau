-- Migration: Add welcome message tracking and admin chat sessions
-- Run this in Supabase SQL Editor

-- Add welcome_message_sent field to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS welcome_message_sent BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_welcome_message_sent ON users(welcome_message_sent);

-- Update existing users to have welcome_message_sent = true (since they already exist)
UPDATE users SET welcome_message_sent = TRUE WHERE welcome_message_sent IS NULL OR welcome_message_sent = FALSE;

-- Create admin chat sessions table
CREATE TABLE IF NOT EXISTS admin_chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
    admin_id VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_user_id ON admin_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_status ON admin_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_admin_id ON admin_chat_sessions(admin_id);
