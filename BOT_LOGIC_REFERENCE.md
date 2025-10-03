# 📋 TỔNG HỢP LOGIC HỆ THỐNG BOT - THAM KHẢO

## 🎯 1. PHÂN LOẠI USER (UserType)

```javascript
enum UserType {
    ADMIN = 'admin',              // Admin - toàn quyền
    REGISTERED_USER = 'registered_user', // User đã đăng ký chính thức
    TRIAL_USER = 'trial_user',    // User dùng thử
    PENDING_USER = 'pending_user', // User chờ duyệt
    NEW_USER = 'new_user',        // User mới hoàn toàn
    EXPIRED_USER = 'expired_user' // User hết hạn
}
```

## 🎯 2. QUYỀN HẠN TỪNG LOẠI USER

### 👑 ADMIN:
```javascript
✅ canUseBot: true
✅ canSearch: true
✅ canViewListings: true
✅ canCreateListings: true
✅ canContactSellers: true
✅ canMakePayments: true
✅ canUseAdminChat: true
✅ canAccessCommunity: true
✅ canUsePoints: true
✅ canAccessSettings: true
🚫 Không bị chống spam
🚫 Không bị giới hạn gì
```

### ✅ REGISTERED_USER (Đã đăng ký):
```javascript
✅ canUseBot: true
✅ canSearch: true
✅ canViewListings: true
✅ canCreateListings: true
✅ canContactSellers: true
✅ canMakePayments: true
✅ canUseAdminChat: true
✅ canAccessCommunity: true
✅ canUsePoints: true
✅ canAccessSettings: true
⚠️ maxListingsPerDay: 10
⚠️ maxSearchesPerDay: 50
⚠️ maxMessagesPerDay: 100
```

### 🎁 TRIAL_USER (Dùng thử):
```javascript
✅ canUseBot: true
✅ canSearch: true
✅ canViewListings: true
✅ canCreateListings: true
✅ canContactSellers: true
✅ canMakePayments: true
✅ canUseAdminChat: true
✅ canAccessCommunity: true
✅ canUsePoints: true
✅ canAccessSettings: true
⚠️ maxListingsPerDay: 5
⚠️ maxSearchesPerDay: 20
⚠️ maxMessagesPerDay: 50
```

### ⏳ PENDING_USER (Chờ duyệt):
```javascript
✅ canUseBot: true
✅ canSearch: true
✅ canViewListings: true
❌ canCreateListings: false
❌ canContactSellers: false
❌ canMakePayments: false
✅ canUseAdminChat: true
❌ canAccessCommunity: false
❌ canUsePoints: false
❌ canAccessSettings: false
⚠️ maxSearchesPerDay: 10
⚠️ maxMessagesPerDay: 20
```

### 🆕 NEW_USER (Mới hoàn toàn):
```javascript
❌ canUseBot: false
❌ canSearch: false
❌ canViewListings: false
❌ canCreateListings: false
❌ canContactSellers: false
❌ canMakePayments: false
✅ canUseAdminChat: true
❌ canAccessCommunity: false
❌ canUsePoints: false
❌ canAccessSettings: false
⚠️ maxMessagesPerDay: 5
```

### ⏰ EXPIRED_USER (Hết hạn):
```javascript
❌ canUseBot: false
❌ canSearch: false
❌ canViewListings: false
❌ canCreateListings: false
❌ canContactSellers: false
✅ canMakePayments: true
✅ canUseAdminChat: true
❌ canAccessCommunity: false
❌ canUsePoints: false
❌ canAccessSettings: false
⚠️ maxMessagesPerDay: 5
```

## 🎯 3. LOGIC XỬ LÝ TIN NHẮN

### 📱 Thứ tự ưu tiên xử lý:
```javascript
// 1. ADMIN (Ưu tiên cao nhất)
if (isAdminUser) {
    await this.handleAdminMessage(user, text, isPostback, postback)
    return
}

// 2. ADMIN CHAT MODE
if (isInAdminChat) {
    await this.handleAdminChatMessage(user, text)
    return
}

// 3. FLOW SESSION (Ưu tiên cao - không bị chống spam)
if (currentFlow && ['registration', 'listing', 'search'].includes(currentFlow)) {
    await this.handleFlowMessage(user, text, session)
    return
}

// 4. TIN NHẮN THƯỜNG (Áp dụng chống spam)
if (isPostback && postback) {
    await this.handlePostbackAction(user, postback)
} else if (text) {
    await this.handleTextMessage(user, text)
}
```

## 🎯 4. LOGIC CHỐNG SPAM THÔNG MINH

### ⚠️ CHỈ ÁP DỤNG KHI:
```javascript
❌ KHÔNG áp dụng khi:
   - User là admin
   - User đang trong flow hợp lệ (registration, listing, search)
   - User click nút bấm (postback)

✅ ÁP DỤNG KHI:
   - User gửi tin nhắn thường
   - User không trong flow
   - User không phải admin
```

### 📊 Logic cho User chưa đăng ký:
```javascript
Lần 1: Hiển thị welcome + menu
Lần 2: Hiển thị lại menu
Lần 3+: Im lặng hoàn toàn
```

### 📊 Logic cho User đã đăng ký:
```javascript
// Trong luồng tìm kiếm/đăng bán:
⚠️ 5 tin nhắn/30 giây → Cảnh báo
🚫 Vượt quá → Khóa 30 phút

// Trong luồng hỗ trợ admin:
⚠️ 5 tin nhắn/1 phút → Cảnh báo
🚫 Vượt quá → Khóa 2 giờ
```

## 🎯 5. DATABASE SCHEMA

### 📋 Bảng chính:
```sql
users - Thông tin user
listings - Tin đăng mua bán
conversations - Hội thoại
messages - Tin nhắn
payments - Thanh toán
ratings - Đánh giá
notifications - Thông báo
admin_users - Admin users
bot_sessions - Session bot
spam_tracking - Theo dõi spam
```

### 📋 Cấu trúc spam_tracking:
```sql
user_id - Facebook ID
message_count - Số tin nhắn trong phiên
last_message_time - Thời gian tin nhắn cuối
warning_count - Số lần cảnh báo
locked_until - Thời gian khóa đến khi nào
current_flow - Luồng hiện tại
```

## 🎯 6. CÁCH THÊM ADMIN

### 📝 Environment Variables (Đơn giản nhất):
```bash
ADMIN_IDS=31268544269455564,facebook_id_của_bạn
```

### 📝 Database (Chính thức):
```sql
INSERT INTO admin_users (facebook_id, name, role, permissions, is_active)
VALUES ('31268544269455564', 'Admin Tên', 'super_admin', '{"all": true}", true)
```

## 🎯 7. LUỒNG ĐĂNG KÝ

### 📝 Bước 1: Họ tên
### 📝 Bước 2: Số điện thoại
### 📝 Bước 3: Vị trí (tỉnh/thành)
### 📝 Bước 4: Xác nhận tuổi (1981)

### 🎁 Kết quả:
```javascript
✅ Status: 'trial'
✅ Trial: 7 ngày miễn phí
✅ Phí: 2,000đ/ngày
✅ Được dùng đầy đủ tính năng
```

## 🎯 8. ƯU ĐIỂM THIẾT KẾ

1. **✅ Phân cấp rõ ràng** - Mỗi user type có quyền hạn phù hợp
2. **✅ Chống spam thông minh** - Không cản trở user chân chính
3. **✅ Tôn trọng user** - Không ép buộc, không làm phiền
4. **✅ Dễ quản lý** - Admin dễ dàng kiểm soát
5. **✅ Linh hoạt** - Tự động thích ứng với ngữ cảnh

## 🎯 9. CÁCH HOẠT ĐỘNG

### 🔄 Flow đăng ký mượt mà:
```
User nhập thông tin → Xử lý ngay → Tiếp tục bước tiếp
→ Không bị chống spam can thiệp
```

### ⚠️ Chống spam thông minh:
```
User spam → Cảnh báo → Khóa tạm thời
→ Chỉ áp dụng khi thực sự cần thiết
```

### 👑 Admin toàn quyền:
```
Admin nhắn gì cũng được → Không bị giới hạn
→ Toàn quyền quản lý hệ thống
```

## 🎯 10. CÁCH SỬ DỤNG

### 📝 Để chạy database:
```sql
-- Copy toàn bộ nội dung từ database-final-complete.sql
-- Paste vào Supabase SQL Editor và chạy
```

### 📝 Để thêm admin:
```bash
# Thêm vào .env.local hoặc Vercel Environment Variables
ADMIN_IDS=31268544269455564,facebook_id_của_bạn
```

### 📝 Để test bot:
1. Gửi tin nhắn bất kỳ → Xem cách bot phản hồi
2. Click các nút → Xem flow hoạt động
3. Test đăng ký → Xem quá trình xử lý

---

**🎉 Hệ thống đã hoàn thiện và sẵn sàng sử dụng!**

*Tạo bởi: Cline - AI Assistant*
*Ngày: 10/3/2025*
