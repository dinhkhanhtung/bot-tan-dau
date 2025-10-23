-- ========================================
-- FIX ADMIN TAKEOVER STATES TABLE
-- ========================================
-- Migration script để khắc phục lỗi "consecutive_message_count column not found"
-- Chạy script này trong Supabase SQL Editor

-- Kiểm tra cấu trúc bảng hiện tại
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_takeover_states'
ORDER BY ordinal_position;

-- Thêm các cột thiếu
ALTER TABLE admin_takeover_states
ADD COLUMN IF NOT EXISTS consecutive_message_count INTEGER DEFAULT 0;

ALTER TABLE admin_takeover_states
ADD COLUMN IF NOT EXISTS last_user_message_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE admin_takeover_states
ADD COLUMN IF NOT EXISTS user_waiting_for_admin BOOLEAN DEFAULT FALSE;

-- Tạo indexes cho hiệu suất
CREATE INDEX IF NOT EXISTS idx_admin_takeover_states_consecutive_count
ON admin_takeover_states(consecutive_message_count);

CREATE INDEX IF NOT EXISTS idx_admin_takeover_states_waiting_for_admin
ON admin_takeover_states(user_waiting_for_admin)
WHERE user_waiting_for_admin = TRUE;

CREATE INDEX IF NOT EXISTS idx_admin_takeover_states_last_message
ON admin_takeover_states(last_user_message_at);

-- Kiểm tra cấu trúc bảng sau khi cập nhật
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_takeover_states'
ORDER BY ordinal_position;

-- Reset message counters để tránh lỗi
UPDATE admin_takeover_states
SET
    consecutive_message_count = 0,
    last_user_message_at = NULL,
    user_waiting_for_admin = FALSE
WHERE consecutive_message_count IS NULL;

-- Thông báo hoàn thành
SELECT '✅ Admin takeover states table fixed successfully!' as status;
SELECT '🎉 All columns added and ready for admin takeover service!' as completion_message;