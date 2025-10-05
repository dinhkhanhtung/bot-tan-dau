/**
 * Script cleanup nhanh - chỉ xóa dữ liệu quan trọng
 */

console.log('🧹 QUICK CLEANUP - Làm sạch dữ liệu nhanh')
console.log('')

console.log('📋 Các bước để làm sạch database:')
console.log('')
console.log('1. 🔗 Truy cập Supabase Dashboard:')
console.log('   https://supabase.com/dashboard')
console.log('')
console.log('2. 📊 Vào SQL Editor và chạy các lệnh sau:')
console.log('')

const cleanupSQL = `
-- Xóa tất cả dữ liệu trong các bảng chính
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM listings;
DELETE FROM payments;
DELETE FROM ratings;
DELETE FROM events;
DELETE FROM event_participants;
DELETE FROM notifications;
DELETE FROM ads;
DELETE FROM search_requests;
DELETE FROM referrals;
DELETE FROM user_points;
DELETE FROM point_transactions;
DELETE FROM bot_sessions;
DELETE FROM user_messages;
DELETE FROM spam_logs;
DELETE FROM spam_tracking;
DELETE FROM chat_bot_offer_counts;
DELETE FROM user_bot_modes;
DELETE FROM admin_chat_sessions;
DELETE FROM user_activities;
DELETE FROM user_activity_logs;
DELETE FROM system_metrics;

-- Xóa tất cả users (trừ admin)
DELETE FROM users WHERE facebook_id != '${process.env.FACEBOOK_PAGE_ID || 'YOUR_FACEBOOK_PAGE_ID'}';

-- Reset bot settings
INSERT INTO bot_settings (id, bot_status, maintenance_mode, welcome_message, max_daily_messages, spam_threshold, updated_at)
VALUES ('main', 'active', false, 'Chào mừng bạn đến với Bot Tân Dậu!', 50, 10, NOW())
ON CONFLICT (id) DO UPDATE SET
    bot_status = 'active',
    maintenance_mode = false,
    welcome_message = 'Chào mừng bạn đến với Bot Tân Dậu!',
    max_daily_messages = 50,
    spam_threshold = 10,
    updated_at = NOW();

-- Tạo admin user mặc định (nếu chưa có)
INSERT INTO users (facebook_id, name, phone, location, birthday, status, membership_expires_at, referral_code, welcome_message_sent, created_at)
VALUES ('${process.env.FACEBOOK_PAGE_ID || 'YOUR_FACEBOOK_PAGE_ID'}', 'Admin Tân Dậu', '0000000000', 'Hà Nội', 1981, 'active', NOW() + INTERVAL '1 year', 'ADMIN-1981', true, NOW())
ON CONFLICT (facebook_id) DO NOTHING;
`

console.log(cleanupSQL)
console.log('')
console.log('3. ✅ Sau khi chạy xong, database sẽ được làm sạch hoàn toàn')
console.log('')
console.log('4. 🔄 Bot sẽ hoạt động bình thường với dữ liệu mới')
console.log('')
console.log('⚠️ LƯU Ý: Thao tác này sẽ xóa TẤT CẢ dữ liệu!')
console.log('💡 Chỉ chạy khi bạn muốn reset hoàn toàn hệ thống')
