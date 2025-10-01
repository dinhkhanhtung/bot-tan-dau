-- Create spam_logs table
CREATE TABLE IF NOT EXISTS spam_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL DEFAULT 'blocked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_spam_logs_user_id ON spam_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_spam_logs_blocked_at ON spam_logs(blocked_at);

-- Add comment
COMMENT ON TABLE spam_logs IS 'Logs spam attempts and blocks';
COMMENT ON COLUMN spam_logs.user_id IS 'Facebook ID of the user';
COMMENT ON COLUMN spam_logs.reason IS 'Reason for blocking';
COMMENT ON COLUMN spam_logs.action IS 'Action taken (blocked, warned, etc.)';
