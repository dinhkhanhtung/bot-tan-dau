# 🧹 Complete Database Cleanup Script

Script này thực hiện việc xóa sạch toàn bộ dữ liệu và reset database về trạng thái ban đầu để test lại từ đầu.

## 📋 Những gì script sẽ làm:

### 1. **Xóa tất cả bot sessions** và reset về trạng thái ban đầu
- Xóa toàn bộ dữ liệu trong bảng `bot_sessions`

### 2. **Reset user interaction states** về trạng thái welcome chưa gửi
- Đặt lại `bot_active: false`
- Đặt lại `welcome_sent: false`
- Đặt lại `current_flow: null` và `current_step: 0`
- Reset `last_activity` về thời gian hiện tại

### 3. **Clear tất cả conversations** và messages
- Xóa toàn bộ messages trước (để tránh foreign key constraints)
- Xóa toàn bộ conversations

### 4. **Reset user states** về trạng thái ban đầu
- Reset user points về 0 và level 'Đồng'
- Xóa toàn bộ point transactions
- Reset notifications về trạng thái unread

### 5. **Clear cache** và temporary data
- Xóa AI analytics
- Xóa system metrics
- Xóa spam logs và spam tracking
- Xóa user activities và activity logs

### 6. **Reset admin states** nếu cần thiết
- Đặt admin chat sessions về trạng thái inactive
- Reset bot settings về mặc định

## 🚨 Lưu ý quan trọng:

- **Script này sẽ xóa sạch toàn bộ dữ liệu!**
- Chỉ sử dụng khi thực sự muốn test lại từ đầu
- Đảm bảo đã backup dữ liệu quan trọng trước khi chạy
- Script sẽ giữ lại cấu trúc bảng và admin users

## 📖 Cách sử dụng:

### Chạy trực tiếp:
```bash
node complete-cleanup.js
```

### Chạy với environment variables:
```bash
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node complete-cleanup.js
```

### Import vào script khác:
```javascript
const { completeCleanup } = require('./complete-cleanup')

// Chạy cleanup
completeCleanup()
```

## 🔧 Cấu hình cần thiết:

Trước khi chạy script, cần có các environment variables:

- `SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📊 Output mẫu:

```
🧹 Starting complete database cleanup...
⚠️ This will delete ALL data and reset to initial state!

1️⃣ Clearing bot sessions...
✅ Bot sessions cleared successfully

2️⃣ Resetting user interaction states...
✅ User interaction states reset to initial state

3️⃣ Clearing conversations and messages...
✅ Messages cleared successfully
✅ Conversations cleared successfully

...

🎉 Complete cleanup finished!
📊 Database has been reset to initial state
🔄 Ready for fresh testing!

Summary of what was cleaned:
✅ Bot sessions cleared
✅ User interaction states reset
✅ Conversations and messages cleared
✅ User activities cleared
✅ Cache and temporary data cleared
✅ Business data cleared
✅ Admin states reset
✅ Bot settings reset to defaults

🚀 You can now start fresh testing!
```

## 🛠️ Troubleshooting:

### Lỗi kết nối Supabase:
- Kiểm tra lại SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY
- Đảm bảo service role key có đủ quyền truy cập

### Lỗi foreign key constraints:
- Script đã được thiết kế để xóa theo đúng thứ tự
- Nếu vẫn gặp lỗi, kiểm tra lại cấu trúc database

### Một số bảng không tồn tại:
- Script sẽ bỏ qua các bảng không tồn tại
- Đây là hành vi bình thường

## 🔄 Thứ tự cleanup:

Script thực hiện cleanup theo thứ tự an toàn để tránh foreign key constraints:

1. Bot sessions (không có dependencies)
2. User interaction states (reset, không xóa)
3. Messages → Conversations (xóa từ con đến cha)
4. Activity logs và cache data
5. User points và transactions
6. Business data (ads, events, listings, payments, ratings, referrals)
7. Admin states và bot settings

## 🚀 Sau khi cleanup:

- Database sẽ ở trạng thái sạch hoàn toàn
- Bot sẽ hoạt động như lần đầu tiên chạy
- Tất cả users sẽ cần bắt đầu lại từ đầu
- Admin users vẫn được giữ lại
- Bot settings được reset về mặc định