-- Script khắc phục lỗi "value too long for type character varying(20)"
-- Chạy file này trong Supabase SQL Editor

-- 1. Kiểm tra các user có phone dài hơn 20 ký tự
SELECT facebook_id, phone, LENGTH(phone) as phone_length
FROM users
WHERE LENGTH(phone) > 20
ORDER BY phone_length DESC;

-- 2. Cập nhật các phone quá dài bằng cách cắt ngắn chúng
UPDATE users
SET phone = LEFT(phone, 20)
WHERE LENGTH(phone) > 20;

-- 3. Kiểm tra lại sau khi cập nhật
SELECT facebook_id, phone, LENGTH(phone) as phone_length
FROM users
WHERE LENGTH(phone) > 20
ORDER BY phone_length DESC;

-- 4. Đếm số user bị ảnh hưởng
SELECT COUNT(*) as users_with_long_phone
FROM users
WHERE LENGTH(phone) > 20;

-- Thông báo hoàn thành
SELECT '✅ Phone length fix completed successfully!' as status;
