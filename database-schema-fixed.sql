-- BOT TÂN DẬU 1981 - Database Schema (Fixed with IF NOT EXISTS)
-- PostgreSQL Database for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Core Tables
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  birthday DATE,
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'banned')),
  membership_expires_at TIMESTAMP,
  rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_transactions INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  referral_code TEXT UNIQUE,
  avatar_url TEXT,
  email TEXT,
  bio TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('product', 'service')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  price DECIMAL(12,2),
  description TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'hidden')),
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product specific fields
CREATE TABLE IF NOT EXISTS product_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  size TEXT,
  weight DECIMAL(8,2),
  dimensions JSONB, -- {length, width, height}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Service specific fields
CREATE TABLE IF NOT EXISTS service_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  experience_years INTEGER,
  price_type TEXT NOT NULL CHECK (price_type IN ('hourly', 'daily', 'project', 'consultation')),
  availability JSONB DEFAULT '{}', -- {monday: true, tuesday: false, ...}
  working_hours JSONB, -- {start: "08:00", end: "17:00"}
  service_area TEXT[],
  certifications TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1 UUID REFERENCES users(id) ON DELETE CASCADE,
  user2 UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1, user2, listing_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  receipt_image TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Community Tables
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(reviewer_id, reviewee_id)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP,
  location TEXT,
  organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  event_type TEXT DEFAULT 'meetup' CHECK (event_type IN ('meetup', 'webinar', 'trading', 'social')),
  max_participants INTEGER,
  registration_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'listing', 'payment', 'rating', 'event', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achieved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- Advertising Tables
CREATE TABLE IF NOT EXISTS ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  target_locations TEXT[] DEFAULT '{}',
  target_categories TEXT[] DEFAULT '{}',
  budget DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  placement_type TEXT NOT NULL CHECK (placement_type IN ('homepage_banner', 'search_boost', 'cross_sell', 'featured_listing')),
  position INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Premium Services Tables
CREATE TABLE IF NOT EXISTS search_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  category TEXT,
  location TEXT,
  budget_range TEXT,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  admin_notes TEXT,
  result_count INTEGER DEFAULT 0,
  price DECIMAL(12,2) DEFAULT 5000,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_request_id UUID REFERENCES search_requests(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_amount DECIMAL(12,2) DEFAULT 10000,
  reward_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Analytics Tables
CREATE TABLE IF NOT EXISTS user_analytics (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  total_listings INTEGER DEFAULT 0,
  total_connections INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0, -- in minutes
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  revenue_generated DECIMAL(12,2) DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  trial_users INTEGER DEFAULT 0,
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  daily_revenue DECIMAL(12,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

-- Gamification Tables
CREATE TABLE IF NOT EXISTS user_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_earned INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('discount', 'badge', 'feature')),
  value DECIMAL(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Astrology Tables
CREATE TABLE IF NOT EXISTS user_astrology (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  chinese_zodiac TEXT DEFAULT 'Tân Dậu',
  element TEXT DEFAULT 'Kim',
  lucky_numbers INTEGER[],
  lucky_colors TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_fortunes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  zodiac_sign TEXT NOT NULL,
  overall_luck INTEGER CHECK (overall_luck >= 1 AND overall_luck <= 5),
  finance_luck INTEGER CHECK (finance_luck >= 1 AND finance_luck <= 5),
  health_luck INTEGER CHECK (health_luck >= 1 AND health_luck <= 5),
  love_luck INTEGER CHECK (love_luck >= 1 AND love_luck <= 5),
  advice TEXT,
  lucky_activities TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, zodiac_sign)
);

-- Storytelling Tables
CREATE TABLE IF NOT EXISTS community_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('childhood', 'career', 'family', 'memories')),
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES community_stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'comment', 'share')),
  comment_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, user_id, interaction_type)
);

CREATE TABLE IF NOT EXISTS memory_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  stories UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Entertainment Tables
CREATE TABLE IF NOT EXISTS fun_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('quiz', 'contest', 'flash_sale', 'webinar')),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  participation_reward INTEGER DEFAULT 0,
  winner_reward INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fun_event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES fun_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT FALSE,
  participated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  theme TEXT CHECK (theme IN ('80s_nostalgia', 'music_1981', 'childhood')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit INTEGER, -- in seconds
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_title_gin ON listings USING gin(to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_ratings_reviewee_id ON ratings(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer_id ON ratings(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_ads_user_id ON ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_start_date ON ads(start_date);
CREATE INDEX IF NOT EXISTS idx_ads_end_date ON ads(end_date);

CREATE INDEX IF NOT EXISTS idx_search_requests_user_id ON search_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_search_requests_status ON search_requests(status);
CREATE INDEX IF NOT EXISTS idx_search_requests_created_at ON search_requests(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and public data
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Listings are public for reading
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON listings;
CREATE POLICY "Listings are viewable by everyone" ON listings
  FOR SELECT USING (true);

-- Users can manage their own listings
DROP POLICY IF EXISTS "Users can manage own listings" ON listings;
CREATE POLICY "Users can manage own listings" ON listings
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Conversations are private to participants
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (
    auth.uid()::text = user1::text OR 
    auth.uid()::text = user2::text
  );

-- Messages are private to conversation participants
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON messages;
CREATE POLICY "Users can read messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.user1::text = auth.uid()::text OR conversations.user2::text = auth.uid()::text)
    )
  );

-- Users can send messages to their conversations
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.user1::text = auth.uid()::text OR conversations.user2::text = auth.uid()::text)
    )
  );

-- Payments are private to users
DROP POLICY IF EXISTS "Users can read own payments" ON payments;
CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Notifications are private to users
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Functions
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET rating = (
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM ratings 
    WHERE reviewee_id = NEW.reviewee_id
  )
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_rating_trigger ON ratings;
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Function to update user analytics
CREATE OR REPLACE FUNCTION update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_analytics (user_id, total_listings, total_connections, last_activity)
  VALUES (NEW.user_id, 1, 0, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_listings = user_analytics.total_listings + 1,
    last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_analytics_listings ON listings;
CREATE TRIGGER update_user_analytics_listings
  AFTER INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_analytics();

-- Function to check trial expiration
CREATE OR REPLACE FUNCTION check_trial_expiration()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET status = 'expired'
  WHERE status = 'trial' 
  AND membership_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO rewards (name, description, points_required, reward_type, value, is_active) VALUES
('Giảm giá 10%', 'Giảm 10% phí niêm yết', 100, 'discount', 0.1, true),
('Miễn phí 1 ngày', 'Miễn phí sử dụng 1 ngày', 200, 'feature', 1000, true),
('Featured Listing 1 tuần', 'Tin đăng nổi bật trong 1 tuần', 500, 'feature', 0, true),
('Tân Dậu Siêu Sao', 'Badge đặc biệt cho thành viên tích cực', 1000, 'badge', 0, true),
('Thành Viên Vàng', 'Badge cho thành viên VIP', 2000, 'badge', 0, true),
('Huyền Thoại Tân Dậu', 'Badge cao nhất cho thành viên huyền thoại', 5000, 'badge', 0, true)
ON CONFLICT DO NOTHING;

-- Insert sample daily fortune for Tân Dậu
INSERT INTO daily_fortunes (date, zodiac_sign, overall_luck, finance_luck, health_luck, love_luck, advice, lucky_activities) VALUES
(CURRENT_DATE, 'Tân Dậu', 4, 4, 3, 4, 'Hôm nay là ngày tốt để mua bán và kết nối với cộng đồng. Hãy tin tưởng vào trực giác của bạn.', ARRAY['Mua bán bất động sản', 'Kết nối với bạn bè cũ', 'Tham gia sự kiện cộng đồng'])
ON CONFLICT (date, zodiac_sign) DO NOTHING;

-- Insert sample quiz
INSERT INTO quizzes (title, questions, theme, difficulty, time_limit) VALUES
('Ký ức tuổi thơ 1981', 
 '[{"question": "Năm 1981, Việt Nam đang trong thời kỳ nào?", "options": ["Bao cấp", "Đổi mới", "Kháng chiến", "Thống nhất"], "answer": 0}, {"question": "Bài hát nào nổi tiếng nhất năm 1981?", "options": ["Mùa thu cho em", "Tình ca", "Như có Bác trong ngày vui đại thắng", "Tất cả đều đúng"], "answer": 3}]',
 '80s_nostalgia', 'easy', 300)
ON CONFLICT DO NOTHING;

-- Add table comments
COMMENT ON TABLE users IS 'Bảng người dùng - chỉ dành cho Tân Dậu 1981';
COMMENT ON TABLE listings IS 'Bảng tin đăng sản phẩm và dịch vụ';
COMMENT ON TABLE conversations IS 'Bảng cuộc trò chuyện giữa người dùng';
COMMENT ON TABLE messages IS 'Bảng tin nhắn trong cuộc trò chuyện';
COMMENT ON TABLE payments IS 'Bảng thanh toán phí thành viên';
COMMENT ON TABLE ratings IS 'Bảng đánh giá giữa người dùng';
COMMENT ON TABLE events IS 'Bảng sự kiện cộng đồng';
COMMENT ON TABLE notifications IS 'Bảng thông báo cho người dùng';
COMMENT ON TABLE ads IS 'Bảng quảng cáo trả phí';
COMMENT ON TABLE search_requests IS 'Bảng yêu cầu tìm kiếm hộ';
COMMENT ON TABLE referrals IS 'Bảng giới thiệu thành viên';
COMMENT ON TABLE user_analytics IS 'Bảng phân tích hành vi người dùng';
COMMENT ON TABLE platform_analytics IS 'Bảng phân tích tổng quan platform';
COMMENT ON TABLE user_points IS 'Bảng điểm thưởng gamification';
COMMENT ON TABLE rewards IS 'Bảng phần thưởng có thể đổi';
COMMENT ON TABLE daily_fortunes IS 'Bảng tử vi hàng ngày cho Tân Dậu';
COMMENT ON TABLE community_stories IS 'Bảng câu chuyện cộng đồng';
COMMENT ON TABLE fun_events IS 'Bảng sự kiện giải trí';
COMMENT ON TABLE quizzes IS 'Bảng câu hỏi quiz';
