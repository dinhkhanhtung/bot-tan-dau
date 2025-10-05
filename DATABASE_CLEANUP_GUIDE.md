# 🧹 Hướng Dẫn Làm Sạch Database

## 🎯 **Trả lời câu hỏi của bạn:**

### ❓ **"Tôi vừa xóa 1 số hàng trong Supabase. Có sao ko?"**
**Trả lời:** Không sao! Bot được thiết kế để hoạt động ổn định ngay cả khi thiếu dữ liệu. Tuy nhiên, để đảm bảo hoạt động tốt nhất, nên làm sạch hoàn toàn.

### ❓ **"Có cách nào làm sạch dữ liệu lại từ đầu ko?"**
**Trả lời:** Có! Tôi đã tạo script cleanup cho bạn.

### ❓ **"Nút ở dashboard có hoạt động đúng ko?"**
**Trả lời:** Hiện tại các nút trong admin dashboard đều là **mock (giả lập)**. Chúng chưa có chức năng thực sự.

---

## 🚀 **Cách Làm Sạch Database Hoàn Toàn:**

### **Phương pháp 1: Sử dụng SQL Script (Khuyến nghị)**

1. **🔗 Truy cập Supabase Dashboard:**
   ```
   https://supabase.com/dashboard
   ```

2. **📊 Vào SQL Editor và chạy script sau:**

```sql
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
DELETE FROM users WHERE facebook_id != 'YOUR_FACEBOOK_PAGE_ID';

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
VALUES ('YOUR_FACEBOOK_PAGE_ID', 'Admin Tân Dậu', '0000000000', 'Hà Nội', 1981, 'active', NOW() + INTERVAL '1 year', 'ADMIN-1981', true, NOW())
ON CONFLICT (facebook_id) DO NOTHING;
```

3. **⚠️ Thay thế `YOUR_FACEBOOK_PAGE_ID` bằng Facebook Page ID thực của bạn**

### **Phương pháp 2: Sử dụng Script Node.js**

```bash
# Chạy script cleanup
node cleanup-database.js
```

---

## 📊 **Các Bảng Quan Trọng Cần Làm Sạch:**

### **🔴 Bảng Chính (Quan trọng):**
- `users` - Thông tin người dùng
- `bot_sessions` - Session đăng ký
- `spam_tracking` - Theo dõi spam
- `chat_bot_offer_counts` - Đếm tin nhắn chào mừng
- `user_bot_modes` - Trạng thái bot mode

### **🟡 Bảng Phụ (Có thể xóa):**
- `listings` - Sản phẩm/dịch vụ
- `messages` - Tin nhắn chat
- `conversations` - Cuộc trò chuyện
- `payments` - Thanh toán
- `ratings` - Đánh giá

### **🟢 Bảng Hệ Thống (Nên giữ):**
- `bot_settings` - Cài đặt bot
- `admin_users` - Thông tin admin

---

## 🎯 **Kết Quả Sau Khi Cleanup:**

✅ **Database sạch hoàn toàn** - Không còn dữ liệu cũ  
✅ **Bot hoạt động bình thường** - Không bị lỗi do dữ liệu thiếu  
✅ **Admin user được tạo** - Có thể đăng nhập admin dashboard  
✅ **Settings được reset** - Bot về trạng thái mặc định  
✅ **Không ảnh hưởng code** - Chỉ xóa dữ liệu, không thay đổi logic  

---

## 🔧 **Về Admin Dashboard:**

### **❌ Các chức năng hiện tại là MOCK:**
- `handleSyncData()` - Chỉ hiển thị toast
- `handleExportData()` - Chỉ hiển thị toast  
- `handleCleanupData()` - Chỉ hiển thị toast
- `handleResetSpamCounter()` - Chỉ hiển thị toast

### **✅ Các chức năng hoạt động thực sự:**
- Xem thống kê (nếu có dữ liệu)
- Xem danh sách users/listings/payments
- Phê duyệt/từ chối payments

---

## 🚨 **Lưu Ý Quan Trọng:**

1. **⚠️ Backup trước khi cleanup** - Nếu có dữ liệu quan trọng
2. **🔑 Thay đổi Facebook Page ID** - Trong script SQL
3. **🔄 Restart bot sau cleanup** - Để đảm bảo cache được clear
4. **📱 Test lại chức năng** - Đăng ký, chat, admin dashboard

---

## 🎉 **Sau Khi Cleanup:**

Bot sẽ hoạt động như mới với:
- ✅ Không còn lỗi do dữ liệu cũ
- ✅ Registration flow hoạt động mượt mà  
- ✅ Admin dashboard sạch sẽ
- ✅ Không còn session cũ gây xung đột
- ✅ Spam counter được reset về 0

**🚀 Bot sẽ hoạt động ổn định và không còn vấn đề!**
