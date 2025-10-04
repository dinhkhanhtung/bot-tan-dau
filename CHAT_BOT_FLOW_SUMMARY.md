# Chat Bot Flow Implementation - Summary

## Ý tưởng chính
Tạo nút "Chat Bot" để phân biệt rõ ràng giữa tin nhắn thường và tin nhắn trong bot, giúp tránh lỗi spam check và tạo trải nghiệm người dùng tốt hơn.

## Luồng hoạt động mới

### 1. **Tin nhắn chào mừng bên ngoài** (Admin cài đặt)
- "Chào bạn ghé thăm Đinh Khánh Tùng. Hôm nay tôi có thể giúp gì cho bạn?"
- Có nút "🤖 CHAT BOT" để user chọn

### 2. **Khi user ấn nút "Chat Bot"**
- User được đưa vào **Bot Mode**
- Hiển thị tin nhắn chào mừng phù hợp:
  - **User đã đăng ký**: Menu chính với các chức năng
  - **User chưa đăng ký**: Thông tin cộng đồng + nút đăng ký
- Tất cả nút đều có nút "🚪 THOÁT BOT"

### 3. **Khi user ấn nút "Thoát Bot"**
- User được đưa ra khỏi **Bot Mode**
- Hiển thị tin nhắn xác nhận thoát
- Gửi nút để quay lại bot hoặc chat thường

### 4. **Khi user gửi tin nhắn thường (không trong Bot Mode)**
- Tin nhắn được chuyển đến admin
- Hiển thị thông báo "Tin nhắn đã được chuyển đến admin"
- Gửi nút để chọn Chat Bot hoặc Chat thường

## Các tính năng đã implement

### ✅ **Bot Mode Management**
- `setUserBotMode()` - Đưa user vào bot mode
- `exitUserBotMode()` - Đưa user ra khỏi bot mode  
- `checkUserBotMode()` - Kiểm tra user có trong bot mode không
- `shouldShowChatBotButton()` - Kiểm tra có nên hiển thị nút Chat Bot không (chỉ 1 lần duy nhất)
- Auto-exit sau 24 giờ

### ✅ **Welcome Messages**
- `sendChatBotWelcome()` - Tin nhắn chào mừng khi vào bot mode
- Phân biệt user đã đăng ký vs chưa đăng ký
- Luôn có nút "Thoát Bot" trong mọi menu

### ✅ **Exit Logic**
- `handleBotExit()` - Xử lý thoát bot với thông báo rõ ràng
- Chỉ có nút "Chat Bot" để quay lại

### ✅ **Anti-Spam Integration**
- Chỉ áp dụng chống spam khi user trong **Bot Mode**
- Tin nhắn thường được chuyển đến admin
- Không ảnh hưởng đến flow đăng ký

## Logic mới

### **User chưa trong Bot Mode:**
1. **Tin nhắn 1**: Chào mừng + nút "Chat Bot"
2. **Tin nhắn 2**: Chỉ thông báo chuyển admin, KHÔNG có nút
3. **Tin nhắn 3+**: Bot dừng hoàn toàn, không gửi gì cả
4. Không áp dụng chống spam

### **User trong Bot Mode:**
1. Tin nhắn → Xử lý bởi bot
2. Áp dụng chống spam (nếu cần)
3. Luôn có nút "Thoát Bot"

### **Flow đăng ký:**
1. User ấn "Chat Bot" → Vào Bot Mode
2. User ấn "Đăng ký" → Bắt đầu flow
3. Trong flow → Không áp dụng chống spam
4. Hoàn thành flow → Quay về menu bot

## Files đã sửa

- `src/lib/anti-spam.ts` - Bot mode management + welcome messages
- `src/app/api/webhook/route.ts` - Xử lý nút Chat Bot/Thoát Bot
- `src/lib/core/unified-entry-point.ts` - Logic xử lý tin nhắn theo bot mode
- `test-chat-bot-flow.js` - Test script

## Kết quả mong đợi

✅ **Phân biệt rõ ràng** giữa tin nhắn thường và tin nhắn trong bot
✅ **Không còn lỗi spam check** cho tin nhắn thường
✅ **Flow đăng ký hoạt động mượt mà** trong bot mode
✅ **Trải nghiệm người dùng tốt hơn** với nút rõ ràng
✅ **Admin có thể xử lý tin nhắn thường** mà không bị bot can thiệp

## Cách test

1. **Lần 1**: Gửi tin nhắn thường → Chào mừng + nút "Chat Bot"
2. **Lần 2**: Gửi tin nhắn thường → Chỉ thông báo chuyển admin, KHÔNG có nút
3. **Lần 3+**: Gửi tin nhắn thường → Bot dừng hoàn toàn, không gửi gì cả
4. Ấn nút "Chat Bot" → Vào bot mode + hiển thị menu phù hợp
5. Sử dụng bot bình thường → Có nút "Thoát Bot"
6. Ấn nút "Thoát Bot" → Ra khỏi bot mode + chỉ có nút "Chat Bot"
7. Test đăng ký trong bot mode → Hoạt động bình thường
