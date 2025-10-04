# 🔧 Sửa lỗi Facebook API

## ❌ **Vấn đề:**
Bot gặp lỗi 400 Bad Request khi gửi tin nhắn đến Facebook API:
```
Error sending message: Y [AxiosError]: Request failed with status code 400
```

## 🔍 **Nguyên nhân:**
- Code sử dụng `process.env.FACEBOOK_ACCESS_TOKEN` 
- Nhưng trong file environment có `FACEBOOK_PAGE_ACCESS_TOKEN`
- Dẫn đến `access_token` bị `undefined`

## ✅ **Giải pháp:**

### **1. Sửa facebook-api.ts:**
```typescript
// Trước
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN!

// Sau  
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!
```

### **2. Sửa utils.ts:**
```typescript
// Trước
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN

// Sau
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
```

### **3. Sửa fetch API call:**
```typescript
// Trước
const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`, {

// Sau
const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`, {
```

## 🎯 **Kết quả:**
- ✅ Bot có thể gửi tin nhắn thành công
- ✅ Không còn lỗi 400 Bad Request
- ✅ Access token được sử dụng đúng
- ✅ Tin nhắn chào mừng hoạt động bình thường

## 📋 **File đã sửa:**
- `src/lib/facebook-api.ts`
- `src/lib/utils.ts`

Bot bây giờ sẽ hoạt động bình thường! 🚀
