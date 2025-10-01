-- Create messages table for spam tracking
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);

-- Add comment
COMMENT ON TABLE messages IS 'Logs all user messages for spam tracking';
COMMENT ON COLUMN messages.user_id IS 'Facebook ID of the user';
COMMENT ON COLUMN messages.content IS 'Message content';
COMMENT ON COLUMN messages.message_id IS 'Facebook message ID';
