-- Migration script để khắc phục lỗi "last_welcome_sent column"
-- Chạy file này trong Supabase SQL Editor

-- 1. Thêm cột last_welcome_sent vào bảng users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_welcome_sent TIMESTAMP WITH TIME ZONE;

-- 2. Tạo index cho cột mới để tăng tốc query
CREATE INDEX IF NOT EXISTS idx_users_last_welcome_sent
ON users(last_welcome_sent)
WHERE last_welcome_sent IS NOT NULL;

-- 3. Thêm comment cho cột
COMMENT ON COLUMN users.last_welcome_sent IS 'Thời gian gửi welcome message cuối cùng (để tính 24h cooldown)';

-- 4. Đồng bộ dữ liệu hiện có từ user_interactions
UPDATE users
SET last_welcome_sent = ui.last_welcome_sent
FROM user_interactions ui
WHERE users.facebook_id = ui.facebook_id
AND ui.last_welcome_sent IS NOT NULL
AND users.last_welcome_sent IS NULL;

-- 5. Nếu user đã có welcome_sent = true nhưng không có last_welcome_sent
-- thì đặt last_welcome_sent = NOW() - 24h (để tránh spam)
UPDATE users
SET last_welcome_sent = NOW() - INTERVAL '24 hours'
WHERE welcome_sent = true
AND last_welcome_sent IS NULL;

-- 6. Kiểm tra kết quả
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'last_welcome_sent';

-- 7. Hiển thị một vài user có last_welcome_sent để kiểm tra
SELECT facebook_id, welcome_sent, last_welcome_sent
FROM users
WHERE last_welcome_sent IS NOT NULL
LIMIT 5;

-- Thông báo hoàn thành
SELECT '✅ Migration completed successfully! The "last_welcome_sent column" error should be fixed.' as status;
