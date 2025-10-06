-- ========================================
-- FIX BOT_SESSIONS STEP COLUMN
-- ========================================
-- Script đơn giản để sửa lỗi registration flow
-- Chạy script này trong Supabase SQL Editor

-- 1. Kiểm tra cấu trúc hiện tại của bảng bot_sessions
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bot_sessions' 
AND column_name IN ('step', 'current_step')
ORDER BY column_name;

-- 2. Nếu cột step không tồn tại, tạo mới
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bot_sessions' 
        AND column_name = 'step'
    ) THEN
        ALTER TABLE bot_sessions ADD COLUMN step INTEGER DEFAULT 0;
        RAISE NOTICE 'Added step column to bot_sessions table';
    ELSE
        RAISE NOTICE 'Step column already exists in bot_sessions table';
    END IF;
END $$;

-- 3. Đảm bảo cột step có kiểu INTEGER và giá trị mặc định
ALTER TABLE bot_sessions 
ALTER COLUMN step TYPE INTEGER,
ALTER COLUMN step SET DEFAULT 0;

-- 4. Cập nhật dữ liệu hiện tại (nếu có)
UPDATE bot_sessions 
SET step = COALESCE(current_step, 0) 
WHERE step IS NULL OR step = 0;

-- 5. Thêm comment
COMMENT ON COLUMN bot_sessions.step IS 'Current step in registration flow (0=name, 1=phone, 2=location, 3=birthday)';

-- 6. Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bot_sessions' 
AND column_name IN ('step', 'current_step')
ORDER BY column_name;

-- 7. Hiển thị dữ liệu mẫu
SELECT 
    facebook_id, 
    current_flow, 
    current_step, 
    step, 
    data
FROM bot_sessions 
LIMIT 5;

SELECT 'Bot sessions step column fixed successfully!' as status;
