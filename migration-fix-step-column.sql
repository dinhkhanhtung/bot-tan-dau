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
