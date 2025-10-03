# Anti-Spam System Fixes - Summary

## Vấn đề ban đầu
1. **Bot khóa toàn bộ hệ thống** thay vì chỉ khóa user vi phạm
2. **User chưa đăng ký bị khóa** khi họ cần gửi tin nhắn để đăng ký
3. **Logic đăng ký bị ảnh hưởng** vì user cần gửi tin nhắn text trong quá trình đăng ký

## Các sửa đổi đã thực hiện

### 1. Sửa Anti-Spam Logic (`src/lib/anti-spam.ts`)
- **Thay đổi logic cho user chưa đăng ký**: Từ khóa ngay tin nhắn thứ 2 → chỉ cảnh báo nhẹ
- **Thêm logic đặc biệt**: User chưa đăng ký trong flow đăng ký được phép gửi tin nhắn
- **Cải thiện flow detection**: Kiểm tra `currentFlow` để quyết định có áp dụng chống spam hay không

### 2. Sửa Webhook Handler (`src/app/api/webhook/route.ts`)
- **Thêm flow detection**: Kiểm tra user có đang trong flow đăng ký không trước khi áp dụng anti-spam
- **Cải thiện xử lý user chưa đăng ký**: Cho phép xử lý tin nhắn bình thường khi trong flow đăng ký
- **Truyền currentFlow**: Truyền thông tin flow hiện tại cho anti-spam system

### 3. Sửa Unified Bot System (`src/lib/core/unified-entry-point.ts`)
- **Thêm flow detection trong handleNewUserText**: Kiểm tra user có đang trong flow đăng ký không
- **Cải thiện xử lý tin nhắn**: Xử lý tin nhắn bình thường khi user trong flow đăng ký
- **Thêm getUserSession function**: Lấy session của user để kiểm tra flow hiện tại

## Logic mới

### User chưa đăng ký:
1. **Tin nhắn đầu tiên**: Gửi welcome message đầy đủ
2. **Tin nhắn thứ 2+ (không trong flow)**: Chỉ cảnh báo nhẹ, KHÔNG khóa
3. **Tin nhắn trong flow đăng ký**: Cho phép gửi tin nhắn bình thường

### User đã đăng ký:
1. **Tin nhắn trong flow hợp lệ**: Không áp dụng chống spam
2. **Tin nhắn thường**: Áp dụng chống spam theo ngữ cảnh

### Admin:
- **Luôn được miễn trừ** khỏi tất cả các kiểm tra chống spam

## Kết quả mong đợi

✅ **User chưa đăng ký có thể đăng ký bình thường** mà không bị khóa
✅ **Chỉ user vi phạm bị khóa**, không ảnh hưởng đến user khác
✅ **Flow đăng ký hoạt động mượt mà** với khả năng gửi tin nhắn text
✅ **Hệ thống chống spam vẫn hoạt động** cho các trường hợp spam thực sự

## Test Cases

1. **User chưa đăng ký - tin nhắn đầu tiên**: Gửi welcome
2. **User chưa đăng ký - tin nhắn thứ 2**: Cảnh báo nhẹ
3. **User chưa đăng ký - trong flow đăng ký**: Cho phép gửi tin nhắn
4. **User đã đăng ký - tin nhắn thường**: Xử lý bình thường
5. **User đã đăng ký - trong flow search/listing**: Không áp dụng chống spam
6. **Admin**: Luôn được miễn trừ

## Files đã sửa

- `src/lib/anti-spam.ts` - Logic chống spam chính
- `src/app/api/webhook/route.ts` - Webhook handler
- `src/lib/core/unified-entry-point.ts` - Unified bot system
- `test-anti-spam.js` - Test script (mới tạo)

## Cách test

1. Chạy bot và thử đăng ký với user mới
2. Gửi nhiều tin nhắn liên tiếp để test chống spam
3. Kiểm tra log để đảm bảo logic hoạt động đúng
4. Test với admin để đảm bảo không bị ảnh hưởng
