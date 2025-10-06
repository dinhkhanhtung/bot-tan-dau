-- ========================================
-- BOT Tân Dậu - DATABASE SETUP HOÀN CHỈNH
-- ========================================
-- Cập nhật: Fix registration flow và đồng bộ với code hiện tại
-- Chạy file này 1 lần duy nhất trong Supabase SQL Editor
-- Bao gồm tất cả tables + welcome tracking + admin chat sessions + bot settings

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. DROP EXISTING TABLES (Nếu có)
-- ========================================

DROP TABLE IF EXISTS user_interactions CASCADE;
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

-- User interactions table (Quản lý trạng thái tương tác)
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    welcome_sent BOOLEAN DEFAULT FALSE,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_welcome_sent TIMESTAMP WITH TIME ZONE,
    interaction_count INTEGER DEFAULT 0,
    bot_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user_interactions
CREATE INDEX IF NOT EXISTS idx_user_interactions_facebook_id ON user_interactions(facebook_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_bot_active ON user_interactions(bot_active);

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
    chat_mode VARCHAR(20) DEFAULT 'bot' CHECK (chat_mode IN ('bot', 'admin')),
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

-- Ads table - ENHANCED FOR MULTIPLE AD TYPES
CREATE TABLE IF NOT EXISTS ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('homepage_banner', 'search_boost', 'cross_sell_spot', 'featured_listing')),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    budget BIGINT NOT NULL,
    daily_budget BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER DEFAULT 1,
    target_category VARCHAR(100),
    target_location VARCHAR(200),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0.00,
    cpc DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Bot sessions table - FIXED với cột step (QUAN TRỌNG)
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    current_flow VARCHAR(100) DEFAULT NULL,
    current_step INTEGER DEFAULT 0,
    step INTEGER DEFAULT 0, -- FIX: Changed to INTEGER to match current_step
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bot_sessions_facebook_id ON bot_sessions(facebook_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_current_flow ON bot_sessions(current_flow) WHERE current_flow IS NOT NULL;

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
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
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
    user_facebook_id VARCHAR(255) NOT NULL,
    admin_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
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
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_user_facebook_id ON admin_chat_sessions(user_facebook_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_is_active ON admin_chat_sessions(is_active);
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

-- Insert default admin users nếu chưa có (sẽ được setup-admin.js ghi đè)
-- INSERT INTO admin_users (username, password_hash, name, email, role, permissions, is_active)
-- VALUES ('admin', '', 'Administrator', 'admin@example.com', 'super_admin', '{"all": true}', true)
-- ON CONFLICT (username) DO NOTHING;

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

-- ========================================
-- AI TABLES FOR ADMIN DASHBOARD
-- ========================================

-- AI Templates table - Lưu trữ các template prompt cho admin
CREATE TABLE IF NOT EXISTS ai_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    tone VARCHAR(20) NOT NULL CHECK (tone IN ('friendly', 'professional', 'casual')),
    context VARCHAR(20) NOT NULL CHECK (context IN ('user_type', 'situation', 'goal')),
    category VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Analytics table - Theo dõi việc sử dụng AI
CREATE TABLE IF NOT EXISTS ai_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES ai_templates(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tone VARCHAR(20) NOT NULL,
    context VARCHAR(20) NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- milliseconds
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for AI tables
CREATE INDEX IF NOT EXISTS idx_ai_templates_admin_id ON ai_templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_templates_category ON ai_templates(category);
CREATE INDEX IF NOT EXISTS idx_ai_templates_is_active ON ai_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_admin_id ON ai_analytics(admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_template_id ON ai_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_created_at ON ai_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_model_used ON ai_analytics(model_used);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_success ON ai_analytics(success);

-- Triggers for AI tables
DROP TRIGGER IF EXISTS update_ai_templates_updated_at ON ai_templates;
CREATE TRIGGER update_ai_templates_updated_at BEFORE UPDATE ON ai_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default AI templates
INSERT INTO ai_templates (admin_id, name, prompt, tone, context, category)
VALUES
    ('admin', 'Chào mừng người dùng mới', 'Tạo lời chào mừng thân thiện cho người dùng mới gia nhập cộng đồng Tân Dậu', 'friendly', 'situation', 'welcome'),
    ('admin', 'Hỗ trợ tìm kiếm sản phẩm', 'Giúp người dùng tìm kiếm sản phẩm phù hợp với nhu cầu của họ', 'professional', 'goal', 'search'),
    ('admin', 'Tư vấn bán hàng', 'Đưa ra lời khuyên hữu ích cho người bán về cách đăng tin hiệu quả', 'professional', 'user_type', 'selling'),
    ('admin', 'Xử lý khiếu nại', 'Tạo phản hồi chuyên nghiệp để xử lý khiếu nại của khách hàng', 'professional', 'situation', 'support'),
    ('admin', 'Khuyến khích tương tác', 'Tạo nội dung khuyến khích người dùng tương tác với cộng đồng', 'friendly', 'goal', 'engagement')
ON CONFLICT DO NOTHING;

-- Tạo function để tự động xóa record cũ hơn 24 giờ
CREATE OR REPLACE FUNCTION cleanup_old_chat_bot_offer_counts()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_bot_offer_counts
    WHERE last_offer < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- WORKFLOW API FUNCTIONS
-- ========================================

-- Execute SQL function for workflow API
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT, sql_params TEXT[] DEFAULT '{}')
RETURNS TABLE(
    id TEXT,
    data JSONB
) AS $$
DECLARE
    result RECORD;
    param TEXT;
    i INTEGER := 1;
BEGIN
    -- Replace parameter placeholders with actual values
    FOR param IN SELECT unnest(sql_params) LOOP
        sql_query := REPLACE(sql_query, '$' || i, quote_literal(param));
        i := i + 1;
    END LOOP;

    -- Execute the query and return results
    FOR result IN EXECUTE sql_query LOOP
        id := result.id::TEXT;
        data := row_to_json(result)::JSONB;
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE chat_bot_offer_counts IS 'Lưu số lần hiển thị nút Chat Bot cho mỗi user';
COMMENT ON COLUMN chat_bot_offer_counts.facebook_id IS 'Facebook ID của user';
COMMENT ON COLUMN chat_bot_offer_counts.count IS 'Số lần đã gửi tin nhắn thường';
COMMENT ON COLUMN chat_bot_offer_counts.last_offer IS 'Thời gian gửi tin nhắn cuối cùng';

-- ========================================
-- FINAL STATUS
-- ========================================

-- Insert default bot settings nếu chưa có
INSERT INTO bot_settings (key, value, description)
VALUES
    ('bot_status', 'active', 'Trạng thái hoạt động của bot (active/stopped)'),
    ('ai_status', 'active', 'Trạng thái hoạt động của AI (active/stopped)'),
    ('payment_fee', '7000', 'Phí dịch vụ mỗi ngày (VNĐ)'),
    ('trial_days', '3', 'Số ngày dùng thử miễn phí'),
    ('max_listings_per_user', '10', 'Số tin đăng tối đa mỗi user'),
    ('auto_approve_listings', 'false', 'Tự động duyệt tin đăng mới'),
    ('maintenance_mode', 'false', 'Chế độ bảo trì hệ thống'),
    ('auto_approve_payments', 'false', 'Tự động duyệt thanh toán'),
    ('payment_approval_timeout', '24', 'Thời gian chờ duyệt thanh toán (giờ)')
ON CONFLICT (key) DO NOTHING;

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

-- ========================================
-- MIGRATION: Thêm cột paused_for_admin vào user_bot_modes
-- ========================================
-- Cập nhật: Thêm cột mới cho tính năng tạm dừng counter khi admin chat

-- Thêm cột paused_for_admin vào bảng user_bot_modes
ALTER TABLE user_bot_modes
ADD COLUMN IF NOT EXISTS paused_for_admin BOOLEAN DEFAULT FALSE;

-- Tạo index cho cột mới để tăng tốc query
CREATE INDEX IF NOT EXISTS idx_user_bot_modes_paused_for_admin
ON user_bot_modes(paused_for_admin)
WHERE paused_for_admin = TRUE;

-- Cập nhật comment cho bảng
COMMENT ON COLUMN user_bot_modes.paused_for_admin IS 'Đánh dấu user đang trong admin chat để tạm dừng welcome counter';

-- ========================================
-- MIGRATION: Fix bot_sessions step column type
-- ========================================
-- Cập nhật: Sửa lỗi registration flow - step column phải là INTEGER

-- Thay đổi kiểu dữ liệu của cột step từ VARCHAR sang INTEGER (nếu cần)
-- Kiểm tra và chuyển đổi cột step nếu nó chưa phải INTEGER
DO $$
BEGIN
    -- Kiểm tra xem cột step có phải là VARCHAR không
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bot_sessions' 
        AND column_name = 'step' 
        AND data_type = 'character varying'
    ) THEN
        -- Chuyển đổi từ VARCHAR sang INTEGER
        ALTER TABLE bot_sessions 
        ALTER COLUMN step TYPE INTEGER USING CASE 
            WHEN step ~ '^[0-9]+$' THEN step::INTEGER 
            ELSE 0 
        END;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bot_sessions' 
        AND column_name = 'step' 
        AND data_type = 'integer'
    ) THEN
        -- Cột đã là INTEGER, chỉ cần đảm bảo giá trị mặc định
        ALTER TABLE bot_sessions 
        ALTER COLUMN step SET DEFAULT 0;
    ELSE
        -- Cột không tồn tại, tạo mới
        ALTER TABLE bot_sessions 
        ADD COLUMN step INTEGER DEFAULT 0;
    END IF;
END $$;

-- Đảm bảo giá trị mặc định cho cột step
ALTER TABLE bot_sessions 
ALTER COLUMN step SET DEFAULT 0;

-- Cập nhật comment
COMMENT ON COLUMN bot_sessions.step IS 'Current step in registration flow (0=name, 1=phone, 2=location, 3=birthday)';

-- Kiểm tra và sửa dữ liệu hiện tại (nếu có)
UPDATE bot_sessions 
SET step = COALESCE(current_step, 0) 
WHERE step IS NULL OR step = 0;

-- Hiển thị thông tin về cột step
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bot_sessions'
AND column_name IN ('step', 'current_step')
ORDER BY column_name;

-- ========================================
-- MIGRATION: Thêm cột last_welcome_sent vào user_interactions
-- ========================================
-- Cập nhật: Thêm cột để lưu thời gian gửi welcome cuối cùng

-- Thêm cột last_welcome_sent vào bảng user_interactions (nếu chưa có)
ALTER TABLE user_interactions
ADD COLUMN IF NOT EXISTS last_welcome_sent TIMESTAMP WITH TIME ZONE;

-- Tạo index cho cột mới để tăng tốc query
CREATE INDEX IF NOT EXISTS idx_user_interactions_last_welcome_sent
ON user_interactions(last_welcome_sent)
WHERE last_welcome_sent IS NOT NULL;

-- Cập nhật comment cho cột mới
COMMENT ON COLUMN user_interactions.last_welcome_sent IS 'Thời gian gửi welcome message cuối cùng (để tính 24h cooldown)';

-- Migration: Cập nhật dữ liệu hiện có
-- Nếu user đã gửi welcome (welcome_sent = true) nhưng không có last_welcome_sent
-- thì đặt last_welcome_sent = last_interaction
UPDATE user_interactions
SET last_welcome_sent = last_interaction
WHERE welcome_sent = true
AND last_welcome_sent IS NULL;

-- Hiển thị thông tin về bảng user_interactions sau khi cập nhật
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_interactions'
ORDER BY ordinal_position;

