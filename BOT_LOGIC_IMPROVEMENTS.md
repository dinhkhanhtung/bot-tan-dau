# 🤖 Cải thiện Logic Bot - Linh hoạt hơn

## 🎯 **Mục tiêu:**
- Làm cho bot linh hoạt hơn, không dừng cứng nhắc sau tin nhắn thứ 3
- Đảm bảo flow đăng ký hoạt động mượt mà, không bị ảnh hưởng bởi logic dừng bot
- Thêm cơ chế reset counter khi admin kết thúc chat
- Tạm dừng counter khi admin vào chat

## ✅ **Các thay đổi đã thực hiện:**

### **1. Sửa logic thứ tự xử lý trong `unified-entry-point.ts`**
- **Trước:** Counter logic chạy trước → Flow đăng ký bị ảnh hưởng
- **Sau:** Flow đăng ký được ưu tiên trước → Counter logic chỉ áp dụng cho tin nhắn chào mừng

```typescript
// QUAN TRỌNG: Kiểm tra flow đăng ký TRƯỚC khi xử lý counter
const session = await this.getUserSession(user.facebook_id)
const currentFlow = session?.current_flow || null

// Nếu đang trong flow đăng ký, xử lý tin nhắn bình thường - KHÔNG áp dụng counter
if (currentFlow === 'registration') {
    await this.handleFlowMessage(user, text, session)
    return
}
```

### **2. Thêm hàm reset counter trong `anti-spam.ts`**
- `resetWelcomeCounter()`: Reset counter về 0 khi admin kết thúc chat
- `pauseWelcomeCounter()`: Tạm dừng counter khi admin vào chat
- `isUserInAdminChat()`: Kiểm tra user có đang trong admin chat không

```typescript
// Hàm reset counter khi admin kết thúc chat
export async function resetWelcomeCounter(facebookId: string): Promise<void> {
    // Xóa counter hiện tại để reset về 0
    await supabaseAdmin
        .from('chat_bot_offer_counts')
        .delete()
        .eq('facebook_id', facebookId)
}
```

### **3. Cập nhật logic admin chat trong `admin-handlers.ts`**
- **Khi admin nhận chat:** Tạm dừng counter
- **Khi admin kết thúc chat:** Reset counter về 0

```typescript
// Khi admin nhận chat
const { pauseWelcomeCounter } = await import('../anti-spam')
await pauseWelcomeCounter(session.user_id)

// Khi admin kết thúc chat
const { resetWelcomeCounter } = await import('../anti-spam')
await resetWelcomeCounter(session.user_id)
```

### **4. Cải thiện logic bot mode**
- User trong bot mode: Không áp dụng counter logic
- User trong flow đăng ký: Không áp dụng counter logic
- User trong admin chat: Không tăng counter

```typescript
// Kiểm tra user có đang trong admin chat không - nếu có thì không tăng counter
const isInAdminChat = await isUserInAdminChat(user.facebook_id)

if (!isInAdminChat) {
    // Tăng counter cho mỗi tin nhắn thường (chỉ khi không trong admin chat)
    await incrementNormalMessageCount(user.facebook_id)
}
```

### **5. Thêm migration script cho database**
- Thêm cột `paused_for_admin` vào bảng `user_bot_modes`
- Tạo index để tăng tốc query

```sql
-- Thêm cột paused_for_admin vào bảng user_bot_modes
ALTER TABLE user_bot_modes 
ADD COLUMN IF NOT EXISTS paused_for_admin BOOLEAN DEFAULT FALSE;
```

## 🔄 **Luồng hoạt động mới:**

### **Luồng chào mừng (không trong bot mode):**
1. **Tin nhắn 1:** Chào mừng + câu hỏi
2. **Tin nhắn 2:** Giới thiệu bot + nút "Chat Bot"
3. **Tin nhắn 3:** Thông báo admin (không có nút)
4. **Tin nhắn 4+:** Bot dừng hoàn toàn

### **Luồng đăng ký:**
- **Luôn được ưu tiên** - không bị ảnh hưởng bởi counter
- User có thể đăng ký bình thường trong bot mode

### **Luồng admin chat:**
- **Admin vào chat:** Tạm dừng counter
- **Admin kết thúc chat:** Reset counter về 0
- User có thể chat bình thường với admin

### **Luồng bot mode:**
- **Không áp dụng counter logic**
- User có thể sử dụng tất cả tính năng bot bình thường

## 🎯 **Kết quả đạt được:**

✅ **Flow đăng ký hoạt động mượt mà** - không bị ảnh hưởng bởi counter  
✅ **Bot linh hoạt hơn** - admin có thể reset counter khi cần  
✅ **Tạm dừng counter khi admin chat** - không tăng counter trong thời gian admin chat  
✅ **Reset counter khi admin kết thúc chat** - user có thể chat lại bình thường  
✅ **Không ảnh hưởng luồng khác** - bot mode và flow đăng ký hoạt động độc lập  

## 📋 **Cách test:**

1. **Test flow đăng ký:**
   - User gửi tin nhắn → Ấn "Chat Bot" → Ấn "Đăng ký"
   - Điền thông tin đăng ký bình thường (không bị dừng bot)

2. **Test admin chat:**
   - User gửi tin nhắn → Admin nhận chat
   - User chat với admin bình thường
   - Admin kết thúc chat → User có thể chat lại bình thường

3. **Test bot mode:**
   - User ấn "Chat Bot" → Sử dụng tất cả tính năng bot
   - Không bị ảnh hưởng bởi counter logic

## 🚀 **Triển khai:**

1. **Chạy migration script:**
   ```sql
   -- Chạy file add-paused-for-admin-column.sql trong Supabase
   ```

2. **Deploy code:**
   - Các thay đổi đã được thực hiện trong code
   - Không cần thay đổi thêm gì

3. **Test:**
   - Test các luồng theo hướng dẫn trên
   - Kiểm tra log để đảm bảo logic hoạt động đúng
