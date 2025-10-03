# 🚀 HỆ THỐNG FLOW MỚI - TÁI CẤU TRÚC BOT TÂN DẬU

## 📋 Tổng quan

Hệ thống mới được tái cấu trúc để giải quyết vấn đề luồng hoạt động phức tạp trong file `bot-handlers.ts` cũ. Thay vì xử lý tất cả trong một file lớn, giờ đây mỗi luồng được tách thành file riêng biệt để dễ quản lý và mở rộng.

## 🏗️ Cấu trúc mới

```
src/lib/
├── flows/                    # Các luồng chức năng
│   ├── auth-flow.ts         # Đăng ký, xác thực
│   ├── marketplace-flow.ts  # Mua bán, tìm kiếm
│   ├── community-flow.ts    # Cộng đồng, sự kiện
│   ├── payment-flow.ts      # Thanh toán, gói dịch vụ
│   ├── utility-flow.ts      # Tiện ích, hỗ trợ
│   ├── admin-flow.ts        # Quản lý admin
│   └── index.ts             # Export tất cả
├── core/                    # Thành phần cốt lõi
│   ├── message-router.ts    # Điều phối luồng chính
│   ├── session-manager.ts   # Quản lý session
│   ├── flow-adapter.ts      # Tích hợp với hệ thống cũ
│   └── test-flow-system.js  # Script test
└── handlers/                # Giữ nguyên các handler cũ
```

## ✨ Lợi ích đạt được

### 🔧 **Dễ bảo trì**
- Mỗi luồng trong file riêng biệt
- Dễ tìm và sửa lỗi
- Code ngắn gọn, tập trung

### 🚀 **Dễ mở rộng**
- Thêm chức năng mới mà không ảnh hưởng luồng khác
- Tách biệt trách nhiệm rõ ràng
- Có thể phát triển song song

### ⚡ **Tối ưu performance**
- Message router xử lý định tuyến thông minh
- Session manager tập trung
- Giảm độ phức tạp của logic

### 🛡️ **Bảo toàn chức năng**
- Không làm mất bất kỳ tính năng hiện tại nào
- Adapter cho phép chuyển đổi dần dần
- Fallback system đảm bảo an toàn

## 🚀 Cách sử dụng

### 1. Import hệ thống mới

```javascript
// Import tất cả
const {
    flowAdapter,
    handleMessage,
    handlePostback,
    AuthFlow,
    MarketplaceFlow
} = require('./lib/flows')

// Hoặc import riêng lẻ
const { AuthFlow } = require('./lib/flows/auth-flow')
const { messageRouter } = require('./lib/core/message-router')
```

### 2. Sử dụng Adapter (Khuyến nghị)

```javascript
// Bật hệ thống mới
flowAdapter.enableNewSystem()

// Xử lý tin nhắn
await handleMessage(user, text)
await handlePostback(user, postback)
```

### 3. Sử dụng trực tiếp Message Router

```javascript
const context = {
    user,
    text,
    isPostback: false,
    postback: '',
    session: null
}

await messageRouter.routeMessage(context)
```

### 4. Tùy chỉnh Flow riêng lẻ

```javascript
const authFlow = new AuthFlow()
await authFlow.handleRegistration(user)
await authFlow.handleStep(user, text, session)
```

## 🧪 Test hệ thống

### Chạy test tự động

```bash
cd src/lib/core
node test-flow-system.js
```

### Test thủ công

```javascript
const { flowAdapter } = require('../flows')

// Test với user mẫu
const testUser = {
    facebook_id: 'test_123',
    name: 'Test User',
    status: 'trial'
}

// Test tin nhắn
await flowAdapter.handleMessage(testUser, 'đăng ký')
await flowAdapter.handleMessage(testUser, 'tìm kiếm nhà')

// Test postback
await flowAdapter.handlePostback(testUser, 'REGISTER')
await flowAdapter.handlePostback(testUser, 'LISTING')
```

## 🔄 Chuyển đổi từ hệ thống cũ

### Bước 1: Test song song

```javascript
// Hệ thống mới chạy song song với cũ
// Có fallback tự động nếu có lỗi
flowAdapter.enableNewSystem()
// Không disable fallback để đảm bảo an toàn
```

### Bước 2: Monitor và debug

```javascript
// Kiểm tra trạng thái
console.log(flowAdapter.getStatus())

// Test các trường hợp edge case
await flowAdapter.testNewSystem(user, 'đăng ký')
```

### Bước 3: Chuyển đổi hoàn toàn

```javascript
// Khi đã chắc chắn hệ thống mới ổn định
flowAdapter.enableNewSystem()
flowAdapter.disableFallback()

// Thay thế hoàn toàn trong webhook
// app/api/webhook/route.ts sẽ sử dụng handleMessage, handlePostback từ adapter
```

## 📚 API Reference

### MessageRouter

```typescript
class MessageRouter {
    async routeMessage(context: MessageContext): Promise<void>
}
```

### SessionManager

```typescript
class SessionManager {
    async createSession(facebookId: string, flow: string, data?: any): Promise<void>
    async updateSession(facebookId: string, step: string, data: any): Promise<void>
    async getSession(facebookId: string): Promise<SessionData | null>
    async clearSession(facebookId: string): Promise<void>
}
```

### FlowAdapter

```typescript
class FlowAdapter {
    enableNewSystem(): void
    disableFallback(): void
    async handleMessage(user: any, text: string): Promise<void>
    async handlePostback(user: any, postback: string): Promise<void>
    getStatus(): { newSystem: boolean, fallback: boolean }
}
```

## 🔧 Các Flow hiện có

### AuthFlow
- Đăng ký người dùng mới
- Xác thực thông tin cá nhân
- Xử lý birthday verification
- Quản lý session đăng ký

### MarketplaceFlow
- Niêm yết sản phẩm/dịch vụ
- Tìm kiếm thông minh
- Xử lý danh mục và vị trí
- Quản lý tin đăng

### CommunityFlow
- Sự kiện cộng đồng
- Birthday notifications
- Top seller rankings
- Community support

### PaymentFlow
- Thanh toán gói dịch vụ
- Upload biên lai
- Lịch sử thanh toán
- Gia hạn tài khoản

### UtilityFlow
- Tử vi hàng ngày
- Hệ thống điểm thưởng
- Cài đặt người dùng
- Hỗ trợ khách hàng

### AdminFlow
- Dashboard quản lý
- Quản lý users, payments, listings
- Thống kê và báo cáo
- Cài đặt hệ thống

## 🚨 Lưu ý quan trọng

1. **Backup trước khi deploy**: Luôn backup code cũ trước khi tích hợp
2. **Test kỹ lưỡng**: Chạy đầy đủ test cases trước khi production
3. **Monitor sau deploy**: Theo dõi logs và user feedback
4. **Fallback an toàn**: Luôn có cơ chế fallback về hệ thống cũ
5. **Gradual rollout**: Chuyển đổi từng phần một để giảm rủi ro

## 📞 Hỗ trợ

Nếu gặp vấn đề khi sử dụng hệ thống mới:
1. Kiểm tra logs để tìm lỗi cụ thể
2. Chạy test script để debug
3. Sử dụng fallback về hệ thống cũ nếu cần
4. Liên hệ developer để được hỗ trợ

---

**🎉 Chúc bạn sử dụng hệ thống mới hiệu quả!**

*Hệ thống được tái cấu trúc bởi AI với mục tiêu tối ưu trải nghiệm người dùng và dễ bảo trì.*
