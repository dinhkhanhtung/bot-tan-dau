-- Tạo bảng spam_tracking để lưu trữ thông tin chống spam thông minh
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

-- Tạo index để tối ưu hiệu suất truy vấn
CREATE INDEX IF NOT EXISTS idx_spam_tracking_user_id ON spam_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_spam_tracking_locked_until ON spam_tracking(locked_until) WHERE locked_until IS NOT NULL;

-- Thêm trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_spam_tracking_updated_at BEFORE UPDATE ON spam_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Thêm comment cho bảng
COMMENT ON TABLE spam_tracking IS 'Lưu trữ thông tin chống spam thông minh cho từng user';
COMMENT ON COLUMN spam_tracking.user_id IS 'Facebook ID của user';
COMMENT ON COLUMN spam_tracking.message_count IS 'Số tin nhắn đã gửi trong phiên hiện tại';
COMMENT ON COLUMN spam_tracking.last_message_time IS 'Thời gian gửi tin nhắn cuối cùng';
COMMENT ON COLUMN spam_tracking.warning_count IS 'Số lần cảnh báo đã gửi';
COMMENT ON COLUMN spam_tracking.locked_until IS 'Thời gian khóa bot đến khi nào (NULL nếu không khóa)';
COMMENT ON COLUMN spam_tracking.current_flow IS 'Luồng hiện tại mà user đang tham gia';

-- Thêm một số dữ liệu mẫu để test (tùy chọn)
-- INSERT INTO spam_tracking (user_id, message_count, last_message_time, warning_count, locked_until, current_flow)
-- VALUES
--     ('test_user_1', 0, NOW(), 0, NULL, NULL),
--     ('test_user_2', 2, NOW() - INTERVAL '5 minutes', 1, NULL, 'registration');
