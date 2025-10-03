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
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'suspended')),
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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_chat_sessions_updated_at BEFORE UPDATE ON admin_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. DEFAULT DATA
-- ========================================

-- Insert default admin user
INSERT INTO admin_users (facebook_id, name, role, permissions, is_active)
VALUES ('31268544269455564', 'Default Admin', 'super_admin', '{"all": true}', true)
ON CONFLICT (facebook_id) DO NOTHING;

-- Update existing users to have welcome_message_sent = true
UPDATE users SET welcome_message_sent = TRUE WHERE welcome_message_sent IS NULL OR welcome_message_sent = FALSE;

-- ========================================
-- 8. VERIFICATION
-- ========================================

SELECT 'Database setup hoàn chỉnh!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'users', 'listings', 'conversations', 'messages', 'payments', 'ratings',
    'events', 'event_participants', 'notifications', 'ads', 'search_requests',
    'referrals', 'user_points', 'point_transactions', 'bot_sessions',
    'user_messages', 'spam_logs', 'admin_users', 'admin_chat_sessions'
);
