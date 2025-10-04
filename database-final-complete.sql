-- ========================================
-- BOT Tân Dậu - DATABASE SETUP HOÀN CHỈNH
-- ========================================
-- Chạy file này 1 lần duy nhất trong Supabase SQL Editor
-- Bao gồm tất cả tables + welcome tracking + admin chat sessions

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. DROP EXISTING TABLES (Nếu có)
-- ========================================

DROP TABLE IF EXISTS admin_chat_sessions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS event_participants CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ads CASCADE;
DROP TABLE IF EXISTS search_requests CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS user_points CASCADE;
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS bot_sessions CASCADE;
DROP TABLE IF EXISTS user_messages CASCADE;
DROP TABLE IF EXISTS spam_logs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- ========================================
-- 2. MAIN TABLES
-- ========================================

-- Users table (Đã thêm welcome_message_sent column)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(100) NOT NULL,
    birthday INTEGER NOT NULL CHECK (birthday = 1981),
    product_service TEXT,
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'suspended', 'pending')),
    membership_expires_at TIMESTAMP WITH TIME ZONE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_transactions INTEGER DEFAULT 0,
    achievements TEXT[] DEFAULT '{}',
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    avatar_url TEXT,
    email VARCHAR(255),
    bio TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    welcome_message_sent BOOLEAN DEFAULT FALSE,
    welcome_interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('product', 'service')),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    price BIGINT NOT NULL,
    description TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    location VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'pending')),
    is_featured BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id, listing_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    receipt_image TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reviewer_id, reviewee_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(500) NOT NULL,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event participants table
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('listing', 'message', 'birthday', 'horoscope', 'payment', 'event', 'ai_suggestion', 'security')),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ads table
CREATE TABLE IF NOT EXISTS ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    budget BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search requests table
CREATE TABLE IF NOT EXISTS search_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    budget_range VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    price BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    reward_amount BIGINT NOT NULL,
    reward_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(referrer_id, referred_id)
);

-- User points table
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    level VARCHAR(20) DEFAULT 'Đồng' CHECK (level IN ('Đồng', 'Bạc', 'Vàng', 'Bạch kim')),
    streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Point transactions table
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot sessions table
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id VARCHAR(255) NOT NULL,
    session_data JSONB DEFAULT '{}',
    current_flow VARCHAR(100),
    current_step INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. ANTI-SPAM TABLES
-- ========================================

-- User messages table
CREATE TABLE IF NOT EXISTS user_messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spam logs table
CREATE TABLE IF NOT EXISTS spam_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL DEFAULT 'blocked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BẢNG CHỐNG SPAM THÔNG MINH (MỚI)
-- ========================================

-- Spam tracking table - Lưu trữ thông tin chống spam thông minh
CREATE TABLE IF NOT EXISTS spam_tracking (
    user_id TEXT PRIMARY KEY,
    message_count INTEGER DEFAULT 0,
    last_message_time TIMESTAMPTZ DEFAULT NOW(),
    warning_count INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    current_flow TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo index để tối ưu hiệu suất truy vấn cho spam_tracking
CREATE INDEX IF NOT EXISTS idx_spam_tracking_user_id ON spam_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_spam_tracking_locked_until ON spam_tracking(locked_until) WHERE locked_until IS NOT NULL;

-- Thêm trigger để tự động cập nhật updated_at cho spam_tracking
DROP TRIGGER IF EXISTS update_spam_tracking_updated_at ON spam_tracking;
CREATE TRIGGER update_spam_tracking_updated_at BEFORE UPDATE ON spam_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin users table
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

-- Bot settings table (QUAN TRỌNG - để lưu trạng thái bot active/stopped)
CREATE TABLE IF NOT EXISTS bot_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. NEW TABLES (Từ migration)
-- ========================================

-- Admin chat sessions table (MỚI)
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

-- ========================================
-- 5. INDEXES
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_welcome_message_sent ON users(welcome_message_sent);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Admin chat sessions indexes (MỚI)
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_user_id ON admin_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_status ON admin_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_admin_id ON admin_chat_sessions(admin_id);

-- ========================================
-- 6. TRIGGERS & FUNCTIONS
-- ========================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_chat_sessions_updated_at ON admin_chat_sessions;
CREATE TRIGGER update_admin_chat_sessions_updated_at BEFORE UPDATE ON admin_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. DEFAULT DATA
-- ========================================
-- ADMIN SYSTEM UPDATE - FANPAGE-BASED
-- ========================================

-- Drop admin_users table if it exists (no longer needed)
DROP TABLE IF EXISTS admin_users CASCADE;

-- Admin system now uses FACEBOOK_PAGE_ID environment variable
-- Messages from fanpage (FACEBOOK_PAGE_ID) are automatically treated as admin
-- No need for admin_users table anymore

-- Update existing users to have welcome_message_sent = true
UPDATE users SET welcome_message_sent = TRUE WHERE welcome_message_sent IS NULL OR welcome_message_sent = FALSE;

-- ========================================
-- 8. PENDING_USER SYSTEM TABLES
-- ========================================

-- User Activities Table (for rate limiting and monitoring)
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id TEXT NOT NULL,
    date DATE NOT NULL,
    listings_count INTEGER DEFAULT 0,
    searches_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    admin_chat_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate entries for same user and date
    UNIQUE(facebook_id, date)
);

-- User Activity Logs Table (for detailed monitoring)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id TEXT NOT NULL,
    user_type TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Metrics Table (for daily snapshots)
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    total_pending_users INTEGER DEFAULT 0,
    pending_users_today INTEGER DEFAULT 0,
    total_searches_today INTEGER DEFAULT 0,
    total_messages_today INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,
    error_rate_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate entries for same date
    UNIQUE(date)
);

-- ========================================
-- 9. INDEXES FOR NEW TABLES
-- ========================================

-- User Activities indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_facebook_date ON user_activities(facebook_id, date);
CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(date);
CREATE INDEX IF NOT EXISTS idx_user_activities_last_activity ON user_activities(last_activity);

-- User Activity Logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_facebook_id ON user_activity_logs(facebook_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_type ON user_activity_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_success ON user_activity_logs(success);

-- System Metrics indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(date);

-- ========================================
-- 10. FUNCTIONS FOR NEW TABLES
-- ========================================

-- Function to clean up old activity logs (older than specified days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS void AS $$
BEGIN
    DELETE FROM user_activity_logs 
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
END;
$$ language 'plpgsql';

-- Function to clean up old system metrics (older than specified days)
CREATE OR REPLACE FUNCTION cleanup_old_system_metrics(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM system_metrics 
    WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
END;
$$ language 'plpgsql';

-- Function to get daily system metrics summary
CREATE OR REPLACE FUNCTION get_daily_metrics_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_pending_users BIGINT,
    pending_users_today BIGINT,
    total_searches_today BIGINT,
    total_messages_today BIGINT,
    average_response_time_ms NUMERIC,
    error_rate_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'pending')::BIGINT as total_pending_users,
        (SELECT COUNT(*) FROM users WHERE status = 'pending' AND DATE(created_at) = target_date)::BIGINT as pending_users_today,
        (SELECT COALESCE(SUM(searches_count), 0) FROM user_activities WHERE date = target_date)::BIGINT as total_searches_today,
        (SELECT COALESCE(SUM(messages_count), 0) FROM user_activities WHERE date = target_date)::BIGINT as total_messages_today,
        (SELECT COALESCE(AVG(response_time_ms), 0) FROM user_activity_logs WHERE DATE(timestamp) = target_date AND success = true)::NUMERIC as average_response_time_ms,
        (SELECT COALESCE(
            (COUNT(*) FILTER (WHERE success = false)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            0
        ) FROM user_activity_logs WHERE DATE(timestamp) = target_date)::NUMERIC as error_rate_percentage;
END;
$$ language 'plpgsql';

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    target_facebook_id TEXT,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_activities BIGINT,
    success_rate NUMERIC,
    average_response_time_ms NUMERIC,
    action_counts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_activities,
        COALESCE(
            (COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*)::NUMERIC) * 100,
            0
        )::NUMERIC as success_rate,
        COALESCE(AVG(response_time_ms), 0)::NUMERIC as average_response_time_ms,
        jsonb_object_agg(action, action_count) as action_counts
    FROM (
        SELECT 
            action,
            COUNT(*) as action_count
        FROM user_activity_logs 
        WHERE facebook_id = target_facebook_id 
        AND timestamp >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY action
    ) action_stats;
END;
$$ language 'plpgsql';

-- ========================================
-- 11. VERIFICATION
-- ========================================

-- ========================================
-- CHAT BOT OFFER COUNTS TABLE
-- ========================================

-- Tạo bảng để lưu số lần hiển thị nút Chat Bot
CREATE TABLE IF NOT EXISTS chat_bot_offer_counts (
    id BIGSERIAL PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    count INTEGER DEFAULT 1 NOT NULL,
    last_offer TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table for user bot modes
CREATE TABLE IF NOT EXISTS user_bot_modes (
    id BIGSERIAL PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    in_bot BOOLEAN DEFAULT FALSE NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tạo index cho facebook_id để tăng tốc query
CREATE INDEX IF NOT EXISTS idx_chat_bot_offer_counts_facebook_id ON chat_bot_offer_counts(facebook_id);

-- Tạo function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_chat_bot_offer_counts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật updated_at
DROP TRIGGER IF EXISTS chat_bot_offer_counts_updated_at ON chat_bot_offer_counts;
CREATE TRIGGER chat_bot_offer_counts_updated_at
    BEFORE UPDATE ON chat_bot_offer_counts
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_bot_offer_counts_updated_at();

-- Tạo function cho user_bot_modes
CREATE OR REPLACE FUNCTION update_user_bot_modes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho user_bot_modes
DROP TRIGGER IF EXISTS user_bot_modes_updated_at ON user_bot_modes;
CREATE TRIGGER user_bot_modes_updated_at
    BEFORE UPDATE ON user_bot_modes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_bot_modes_updated_at();

-- Tạo function để tự động xóa record cũ hơn 24 giờ
CREATE OR REPLACE FUNCTION cleanup_old_chat_bot_offer_counts()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_bot_offer_counts
    WHERE last_offer < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE chat_bot_offer_counts IS 'Lưu số lần hiển thị nút Chat Bot cho mỗi user';
COMMENT ON COLUMN chat_bot_offer_counts.facebook_id IS 'Facebook ID của user';
COMMENT ON COLUMN chat_bot_offer_counts.count IS 'Số lần đã gửi tin nhắn thường';
COMMENT ON COLUMN chat_bot_offer_counts.last_offer IS 'Thời gian gửi tin nhắn cuối cùng';

-- ========================================
-- FINAL STATUS
-- ========================================

-- Insert default bot status nếu chưa có
INSERT INTO bot_settings (key, value, description)
VALUES ('bot_status', 'active', 'Trạng thái hoạt động của bot (active/stopped)')
ON CONFLICT (key) DO NOTHING;

-- Insert additional bot settings
INSERT INTO bot_settings (key, value, description)
VALUES 
    ('maintenance_mode', 'false', 'Chế độ bảo trì (true/false)'),
    ('max_users_per_hour', '1000', 'Số user tối đa mỗi giờ'),
    ('welcome_message_enabled', 'true', 'Tin nhắn chào mừng (true/false)')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- FIX DATABASE ERRORS
-- ========================================

-- Tạo index cho bot_settings nếu chưa có
CREATE INDEX IF NOT EXISTS idx_bot_settings_key ON bot_settings(key);

-- Tạo trigger để update updated_at cho bot_settings
CREATE OR REPLACE FUNCTION update_bot_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger cũ nếu có
DROP TRIGGER IF EXISTS update_bot_settings_updated_at ON bot_settings;

-- Tạo trigger mới
CREATE TRIGGER update_bot_settings_updated_at
    BEFORE UPDATE ON bot_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_settings_updated_at();

-- Kiểm tra và sửa lỗi users table nếu cần
-- Đảm bảo users table có đầy đủ columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_message_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_interaction_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Tạo index cho users table nếu chưa có
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ========================================
-- CREATE BOT_SETTINGS TABLE (FIX DATABASE ERROR)
-- ========================================

-- Tạo bảng bot_settings nếu chưa có (để fix lỗi "Bot settings table not found")
CREATE TABLE IF NOT EXISTS bot_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index cho bot_settings
CREATE INDEX IF NOT EXISTS idx_bot_settings_key ON bot_settings(key);

-- Insert default bot status nếu chưa có
INSERT INTO bot_settings (key, value, description)
VALUES ('bot_status', 'active', 'Trạng thái hoạt động của bot (active/stopped)')
ON CONFLICT (key) DO NOTHING;

-- Insert additional bot settings
INSERT INTO bot_settings (key, value, description)
VALUES 
    ('maintenance_mode', 'false', 'Chế độ bảo trì (true/false)'),
    ('max_users_per_hour', '1000', 'Số user tối đa mỗi giờ'),
    ('welcome_message_enabled', 'true', 'Tin nhắn chào mừng (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Tạo trigger để update updated_at cho bot_settings
CREATE OR REPLACE FUNCTION update_bot_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger cũ nếu có
DROP TRIGGER IF EXISTS update_bot_settings_updated_at ON bot_settings;

-- Tạo trigger mới
CREATE TRIGGER update_bot_settings_updated_at
    BEFORE UPDATE ON bot_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_settings_updated_at();

SELECT 'Database setup hoàn chỉnh với PENDING_USER system, ANTI-SPAM thông minh và CHAT BOT COUNTER!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'users', 'listings', 'conversations', 'messages', 'payments', 'ratings',
    'events', 'event_participants', 'notifications', 'ads', 'search_requests',
    'referrals', 'user_points', 'point_transactions', 'bot_sessions',
    'user_messages', 'spam_logs', 'spam_tracking', 'admin_users', 'admin_chat_sessions',
    'user_activities', 'user_activity_logs', 'system_metrics', 'chat_bot_offer_counts',
    'user_bot_modes', 'bot_settings'
);
