-- Tạo bảng messages cho anti-spam
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index cho messages
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Tạo bảng spam_logs
CREATE TABLE IF NOT EXISTS spam_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL DEFAULT 'blocked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index cho spam_logs
CREATE INDEX IF NOT EXISTS idx_spam_logs_user_id ON spam_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_spam_logs_blocked_at ON spam_logs(blocked_at);

-- Tạo bảng admin_users
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

-- Tạo index cho admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_facebook_id ON admin_users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- Thêm admin mặc định
INSERT INTO admin_users (facebook_id, name, role, permissions, is_active)
VALUES ('31268544269455564', 'Default Admin', 'super_admin', '{"all": true}', true)
ON CONFLICT (facebook_id) DO NOTHING;

-- Kiểm tra bảng đã tạo
SELECT 'Tables created successfully' as status;
