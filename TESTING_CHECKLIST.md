# 📋 CHECKLIST KIỂM TRA BOT TÂN DẬU 1981

## 🚀 TRƯỚC KHI BẮT ĐẦU

### ✅ Chuẩn bị môi trường
- [ ] Đã chạy migration: `migration-add-welcome-tracking.sql`
- [ ] Đã deploy tất cả code changes
- [ ] Đã cấu hình `ADMIN_IDS` environment variable
- [ ] Bot đang hoạt động và nhận webhook từ Facebook

### ✅ Chạy automated tests
```bash
node test-bot-fixes.js
```
- [ ] Tất cả tests PASSED

---

## 🧪 MANUAL TESTING

### 1. ✅ ADMIN FUNCTIONALITY

#### Test với Admin Account:
- [ ] **Admin bypass spam check:**
  - Gửi 10+ tin nhắn liên tiếp từ admin account
  - ✅ Bot không bao giờ stop hoặc warning
  - ✅ Admin luôn nhận phản hồi

- [ ] **Admin command:**
  - Gửi `/admin`
  - ✅ Hiển thị admin dashboard với buttons
  - ✅ Không bị redirect đến registration

- [ ] **Admin bypass trial/expiration:**
  - Admin gửi bất kỳ command nào
  - ✅ Không bao giờ nhận thông báo trial/expired
  - ✅ Có thể sử dụng tất cả tính năng

### 2. ✅ WELCOME MESSAGE TRACKING

#### Test với User Account mới:
- [ ] **Lần đầu gửi tin nhắn:**
  - User mới gửi tin nhắn bất kỳ
  - ✅ Nhận welcome message đầy đủ
  - ✅ Nhận menu options

- [ ] **Lần thứ 2 gửi tin nhắn:**
  - Cùng user gửi tin nhắn khác
  - ✅ KHÔNG nhận welcome message nữa
  - ✅ Chỉ nhận brief response hoặc menu

#### Test với User đã tồn tại:
- [ ] **User cũ quay lại:**
  - User đã từng chat với bot trước đây
  - ✅ Không nhận welcome message
  - ✅ Bot nhớ trạng thái user

### 3. ✅ ADMIN CHAT FUNCTIONALITY

#### Test User Request Chat:
- [ ] **Bắt đầu chat với admin:**
  - User chọn: Support → Chat với Admin → Bắt đầu chat
  - ✅ User nhận thông báo "đang chờ admin"
  - ✅ Bot dừng phản hồi user (chỉ hiển thị "đang chờ admin")

- [ ] **User gửi tin nhắn khi đang chờ:**
  - User gửi tin nhắn bất kỳ
  - ✅ Bot không phản hồi, chỉ hiển thị "đang chờ admin"

#### Test Admin Receive & Respond:
- [ ] **Admin nhận notification:**
  - Khi user request chat
  - ✅ Tất cả admin nhận notification với button "Nhận chat"

- [ ] **Admin nhận chat:**
  - Admin click "Nhận chat"
  - ✅ Admin nhận thông báo thành công
  - ✅ User nhận thông báo "Admin đã vào chat"

- [ ] **Admin gửi tin nhắn:**
  - Admin gửi tin nhắn bất kỳ
  - ✅ User nhận tin nhắn từ admin
  - ✅ Tin nhắn hiển thị đúng format

- [ ] **User trả lời admin:**
  - User gửi tin nhắn khi đang chat với admin
  - ✅ Admin nhận tin nhắn từ user
  - ✅ Bot không can thiệp

#### Test End Chat:
- [ ] **Admin kết thúc chat:**
  - Admin click "Kết thúc chat"
  - ✅ User nhận thông báo chat đã kết thúc
  - ✅ Bot hoạt động bình thường trở lại cho user

- [ ] **User sử dụng bot sau khi chat kết thúc:**
  - User gửi tin nhắn hoặc click button
  - ✅ Bot phản hồi bình thường
  - ✅ Tất cả tính năng hoạt động

### 4. ✅ REGISTRATION FLOW

#### Test Normal User Registration:
- [ ] **User chưa đăng ký:**
  - User chọn "Đăng ký"
  - ✅ Bắt đầu registration flow
  - ✅ Hoàn thành tất cả steps thành công

- [ ] **User đã đăng ký:**
  - User đã registered chọn "Đăng ký" lại
  - ✅ Thông báo đã đăng ký
  - ✅ Không bắt đầu registration lại

#### Test Admin Registration:
- [ ] **Admin chọn đăng ký:**
  - Admin click "Đăng ký"
  - ✅ Được redirect đến admin dashboard
  - ✅ Không phải làm registration flow

### 5. ✅ ANTI-SPAM SYSTEM

#### Test Normal User Spam:
- [ ] **User gửi nhiều tin nhắn:**
  - User thường gửi 5+ tin nhắn liên tiếp
  - ✅ Nhận warning về spam
  - ✅ Bot có thể stop nếu spam quá nhiều

#### Test Admin Spam Immunity:
- [ ] **Admin gửi nhiều tin nhắn:**
  - Admin gửi 10+ tin nhắn liên tiếp
  - ✅ Không bao giờ nhận warning
  - ✅ Bot không bao giờ stop

### 6. ✅ GENERAL FUNCTIONALITY

#### Test Core Features:
- [ ] **Main menu:**
  - User click "Trang chủ"
  - ✅ Hiển thị main menu đúng

- [ ] **Search function:**
  - User chọn "Tìm kiếm"
  - ✅ Search flow hoạt động bình thường

- [ ] **Listing function:**
  - User chọn "Niêm yết"
  - ✅ Listing flow hoạt động bình thường

---

## 🚨 CRITICAL ISSUES TO WATCH

### ❌ Red Flags (Phải sửa ngay):
- Admin nhận spam warning
- Welcome message gửi nhiều lần cho cùng user
- Bot không dừng khi user chat với admin
- Admin không thể access admin panel
- Database errors trong logs

### ⚠️ Yellow Flags (Cần kiểm tra):
- Response time chậm
- Một số buttons không hoạt động
- Logs có warnings (nhưng không crash)

---

## 📊 COMPLETION CHECKLIST

### ✅ All Tests Passed:
- [ ] Admin functionality: 100% working
- [ ] Welcome message: Only sent once
- [ ] Admin chat: Full flow working
- [ ] Registration: Working for both user & admin
- [ ] Anti-spam: Admin immune, user protected
- [ ] General features: All working

### ✅ Production Ready:
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] All admin accounts tested
- [ ] User experience smooth

---

## 🔧 TROUBLESHOOTING

### Nếu có vấn đề:
1. **Check logs** để xem error messages
2. **Verify database** migration đã chạy thành công
3. **Check environment variables** đặc biệt ADMIN_IDS
4. **Test từng tính năng riêng biệt** để isolate issue
5. **Rollback** nếu có critical issue

### Liên hệ hỗ trợ:
- Cung cấp logs chi tiết
- Mô tả steps để reproduce issue
- Screenshot nếu có thể
