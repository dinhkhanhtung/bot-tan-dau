# 🐛 Debug Counter Issue

## ❌ **Vấn đề:**
Bot không hoạt động đúng theo logic counter:
- **Tin nhắn 1**: Gửi 4 tin nhắn (chào mừng + nút) ✅
- **Tin nhắn 2**: Gửi 4 tin nhắn (chào mừng + nút) ❌ **SAI**
- **Tin nhắn 3**: Gửi 1 tin nhắn (thông báo admin) ❌ **SAI**

## 🔍 **Nguyên nhân có thể:**

### **1. Map bị reset giữa requests**
- Trong môi trường serverless (Vercel), Map có thể bị reset
- Mỗi request có thể tạo instance mới của Map

### **2. Counter không được tăng đúng**
- Logic `incrementNormalMessageCount` có vấn đề
- Counter bị ghi đè thay vì tăng

### **3. Logic điều kiện sai**
- `currentCount` không đúng
- Điều kiện `if/else` không hoạt động

## 🔧 **Giải pháp debug:**

### **1. Thêm logging chi tiết:**
```typescript
// Trong incrementNormalMessageCount
console.log(`🔢 incrementNormalMessageCount for ${facebookId}:`, {
    before: offerData,
    mapSize: userChatBotOfferCount.size
})

// Trong UnifiedBotSystem
console.log(`📊 Counter check for ${user.facebook_id}:`, {
    offerData,
    currentCount,
    message: text
})
```

### **2. Thêm logging cho từng điều kiện:**
```typescript
if (currentCount === 1) {
    console.log(`🎯 Executing count=1 logic for ${user.facebook_id}`)
    // Logic tin nhắn 1
} else if (currentCount === 2) {
    console.log(`🎯 Executing count=2 logic for ${user.facebook_id}`)
    // Logic tin nhắn 2
} else {
    console.log(`🎯 Executing count=${currentCount} logic for ${user.facebook_id} - bot stops completely`)
    // Logic tin nhắn 3+
}
```

## 📋 **Cách test:**

1. **Gửi tin nhắn 1**: Xem log counter
2. **Gửi tin nhắn 2**: Xem log counter có tăng không
3. **Gửi tin nhắn 3**: Xem log counter và logic

## 🎯 **Kết quả mong đợi:**

```
Tin nhắn 1:
🔢 incrementNormalMessageCount: { before: undefined, mapSize: 0 }
✅ Created new counter: count=1
📊 Counter check: { currentCount: 1 }
🎯 Executing count=1 logic

Tin nhắn 2:
🔢 incrementNormalMessageCount: { before: { count: 1 }, mapSize: 1 }
✅ Incremented counter: count=2
📊 Counter check: { currentCount: 2 }
🎯 Executing count=2 logic

Tin nhắn 3:
🔢 incrementNormalMessageCount: { before: { count: 2 }, mapSize: 1 }
✅ Incremented counter: count=3
📊 Counter check: { currentCount: 3 }
🎯 Executing count=3 logic - bot stops completely
```

Với logging này, chúng ta sẽ tìm ra nguyên nhân chính xác! 🔍
