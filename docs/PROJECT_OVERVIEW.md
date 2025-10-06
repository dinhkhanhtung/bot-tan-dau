# BOT Tân Dậu - Database Schema Overview

## Tổng quan dự án
Đây là tài liệu tổng hợp các schema database và hướng dẫn cho dự án BOT Tân Dậu - một hệ thống chatbot Facebook với các tính năng thương mại điện tử, quản lý người dùng và chống spam thông minh.

**Lưu ý quan trọng:** File `database-schema.sql` là file cập nhật chính thức và được giữ lại trong dự án. Các file khác đã được gộp vào tài liệu này để dễ quản lý và tra cứu.

## Nội dung tài liệu

### 1. Database Schema Chính (`database-schema.sql`)
Đây là file schema database chính thức được giữ lại trong dự án với tất cả các bảng và tính năng nâng cao. File này chứa toàn bộ cấu trúc database hoàn chỉnh và được sử dụng để thiết lập cơ sở dữ liệu.

```sql
-- ========================================
-- BOT Tân Dậu - DATABASE SETUP HOÀN CHỈNH
-- ========================================
-- Cập nhật: Thêm các trường cho Admin Dashboard Mobile-Friendly
-- Chạy file này 1 lần duy nhất trong Supabase SQL Editor
-- Bao gồm tất cả tables + welcome tracking + admin chat sessions + bot settings

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

-- Các bảng khác được định nghĩa đầy đủ trong file gốc...
```

### 2. Database Schema Tối Ưu (`database-schema-optimized.sql`)
Phiên bản tối ưu chỉ chứa những bảng thực sự cần thiết cho hoạt động cơ bản.

```sql
-- ========================================
-- BOT Tân Dậu - DATABASE SCHEMA TỐI ƯU
-- ========================================
-- Chỉ giữ lại những bảng thực sự cần thiết
-- Đã fix lỗi thiếu cột 'step' trong bot_sessions

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. DROP EXISTING TABLES (Nếu có)
-- ========================================

DROP TABLE IF EXISTS admin_chat_sessions CASCADE;
DROP TABLE IF EXISTS user_messages CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS spam_logs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- ========================================
-- 2. CORE TABLES (Những bảng thực sự cần thiết)
-- ========================================

-- Users table - Bảng chính cho người dùng
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

-- Các bảng khác được định nghĩa tối ưu trong file gốc...
```

### 3. Quick Fix Script (`quick-fix.sql`)
Script khắc phục nhanh lỗi thiếu cột `step` trong bảng `bot_sessions`.

```sql
-- QUICK FIX: Chỉ tạo bảng bot_sessions với cột step
-- Chạy cái này TRƯỚC để fix lỗi ngay lập tức

-- Xóa bảng cũ nếu có
DROP TABLE IF EXISTS bot_sessions CASCADE;

-- Tạo bảng mới với cột step
CREATE TABLE bot_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    current_flow VARCHAR(100) DEFAULT NULL,
    current_step INTEGER DEFAULT 0,
    step VARCHAR(50) DEFAULT NULL, -- CỘT QUAN TRỌNG NÀY
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index
CREATE INDEX IF NOT EXISTS idx_bot_sessions_facebook_id ON bot_sessions(facebook_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_current_flow ON bot_sessions(current_flow) WHERE current_flow IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_sessions_step ON bot_sessions(step) WHERE step IS NOT NULL;

-- Thêm comment
COMMENT ON COLUMN bot_sessions.step IS 'Tên bước hiện tại trong flow (name, phone, location, birthday, etc.)';
COMMENT ON COLUMN bot_sessions.current_step IS 'Số thứ tự bước hiện tại (integer counter)';

-- Trigger để tự động cập nhật updated_at
DROP TRIGGER IF EXISTS update_bot_sessions_updated_at ON bot_sessions;
CREATE TRIGGER update_bot_sessions_updated_at BEFORE UPDATE ON bot_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ bot_sessions table created with step column!' as status;
```

### 4. Migration Fix Script (`migration-fix-step-column.sql`)
Script migration để khắc phục lỗi thiếu cột `step`.

```sql
-- Migration script để fix lỗi 'Could not find the step column'
-- Chạy script này trong Supabase SQL Editor

-- Thêm cột step vào bảng bot_sessions
ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS step VARCHAR(50) DEFAULT NULL;

-- Tạo index cho cột mới
CREATE INDEX IF NOT EXISTS idx_bot_sessions_step
ON bot_sessions(step)
WHERE step IS NOT NULL;

-- Thêm comments cho clarity
COMMENT ON COLUMN bot_sessions.step IS 'Tên bước hiện tại trong flow (name, phone, location, birthday, etc.)';
COMMENT ON COLUMN bot_sessions.current_step IS 'Số thứ tự bước hiện tại (integer counter)';

-- Verify migration
SELECT 'Migration completed successfully' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bot_sessions'
AND column_name IN ('step', 'current_step', 'current_flow')
ORDER BY column_name;
```

## Hướng Dẫn Migration Thủ Công

### Vấn đề thường gặp
**Lỗi "Could not find the step column"** xảy ra khi bảng `bot_sessions` thiếu cột `step`, gây lỗi trong quá trình đăng ký người dùng.

### Các bước khắc phục

#### Bước 1: Thêm cột `step` bị thiếu
```sql
ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS step VARCHAR(50) DEFAULT NULL;
```

#### Bước 2: Tạo index để tối ưu hiệu suất
```sql
CREATE INDEX IF NOT EXISTS idx_bot_sessions_step
ON bot_sessions(step)
WHERE step IS NOT NULL;
```

#### Bước 3: Thêm mô tả cho các cột
```sql
COMMENT ON COLUMN bot_sessions.step IS 'Tên bước hiện tại trong flow (name, phone, location, birthday, etc.)';
COMMENT ON COLUMN bot_sessions.current_step IS 'Số thứ tự bước hiện tại (integer counter)';
```

#### Bước 4: Kiểm tra migration
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bot_sessions'
AND column_name IN ('step', 'current_step', 'current_flow')
ORDER BY column_name;
```

### Cách chạy trong Supabase Dashboard
1. Truy cập dashboard dự án Supabase
2. Vào "SQL Editor" ở thanh bên trái
3. Tạo query mới
4. Copy và paste từng câu SQL ở trên (chạy từng cái một)
5. Click "Run" cho mỗi câu lệnh

### Kết quả mong đợi
Sau khi chạy các lệnh này, bạn sẽ thấy:
- Cột `step` được thêm vào bảng `bot_sessions`
- Index được tạo cho cột `step`
- Comments được thêm để làm tài liệu
- Quy trình đăng ký hoạt động bình thường không còn lỗi "step column"

### Thay thế: Sử dụng file migration
Bạn cũng có thể copy toàn bộ nội dung từ `migration-fix-step-column.sql` và chạy như một query duy nhất trong Supabase SQL Editor.

### Kiểm tra
Sau khi chạy migration, test quy trình đăng ký bằng cách:
1. Gửi tin nhắn để kích hoạt đăng ký
2. Kiểm tra session updates hoạt động không lỗi
3. Xác nhận logs không còn hiển thị lỗi "step column"

## Cấu trúc Database

### Bảng chính
- **users**: Thông tin người dùng
- **bot_sessions**: Phiên làm việc của bot với người dùng
- **user_messages**: Tin nhắn của người dùng
- **spam_tracking**: Theo dõi spam thông minh
- **bot_settings**: Cấu hình bot
- **user_bot_modes**: Chế độ bot của user
- **chat_bot_offer_counts**: Đếm lượt offer chat bot

### Bảng tùy chọn
- **listings**: Danh sách sản phẩm (marketplace)
- **payments**: Thanh toán
- **notifications**: Thông báo
- **admin_chat_sessions**: Phiên chat admin
- **spam_logs**: Log spam

## Các tính năng chính

### 1. Hệ thống đăng ký người dùng
- Thu thập thông tin: tên, số điện thoại, địa điểm, ngày sinh
- Validation và kiểm tra dữ liệu
- Tích hợp với Facebook Messenger

### 2. Chống spam thông minh
- Theo dõi hành vi người dùng
- Tự động khóa tài khoản spam
- Hệ thống cảnh báo và xử phạt

### 3. Chat bot tự động
- Welcome message cho người dùng mới
- Hướng dẫn sử dụng bot
- Tương tác tự nhiên với người dùng

### 4. Admin Dashboard
- Quản lý người dùng
- Duyệt thanh toán
- Theo dõi hoạt động hệ thống

### 5. AI Integration
- Tạo phản hồi thông minh
- Phân tích hành vi người dùng
- Tối ưu trải nghiệm

## Lưu ý quan trọng

1. **Cột `step` trong `bot_sessions`**: Bắt buộc phải có để registration flow hoạt động
2. **Indexes**: Được tối ưu hóa cho hiệu suất truy vấn
3. **Triggers**: Tự động cập nhật `updated_at` cho các bảng quan trọng
4. **Default data**: Các cấu hình mặc định được thiết lập sẵn

## Khuyến nghị sử dụng

- **Production**: Sử dụng `database-schema-optimized.sql` để tối ưu hiệu suất
- **Development**: Sử dụng `database-schema.sql` đầy đủ tính năng để test toàn bộ
- **Quick fix**: Sử dụng `quick-fix.sql` khi gặp lỗi thiếu cột `step`

---

*Tài liệu được tạo tự động từ các file SQL gốc vào ngày 10/6/2025*
