# 🔍 Hướng dẫn Test Admin Login trên Vercel

## ❌ **Vấn đề hiện tại:**
- File HTML local không thể gọi API do **CORS policy**
- Cần test trực tiếp trên Vercel

## 🎯 **Cách test chính xác:**

### **Bước 1: Mở trang admin login**
1. Vào: https://bot-tan-dau.vercel.app/admin/login
2. Mở **Developer Tools** (F12)
3. Vào tab **Console**

### **Bước 2: Test login**
1. Nhập **Username:** `admin`
2. Nhập **Password:** `admin123`
3. Click **"Đăng nhập"**
4. Xem console logs

### **Bước 3: Kiểm tra kết quả**

#### **✅ Nếu thành công:**
- Console sẽ hiển thị:
  ```
  🔄 Form submitted with: {username: "admin", password: "admin123"}
  🚀 Attempting login for user: admin
  📡 Response status: 200
  📦 Response data: {success: true, message: "Đăng nhập thành công", ...}
  ✅ Login successful, storing token and redirecting...
  🔄 Redirecting to dashboard...
  ```
- Trang sẽ redirect đến dashboard

#### **❌ Nếu có lỗi:**
- Console sẽ hiển thị error message
- Cần copy/paste error để debug

## 🔍 **Các lỗi có thể gặp:**

### **1. Network Error**
```
❌ Error: NetworkError when attempting to fetch resource
```
**Nguyên nhân:** CORS policy, network issue
**Giải pháp:** Test trực tiếp trên Vercel

### **2. JavaScript Error**
```
❌ Error: [specific error message]
```
**Nguyên nhân:** Code error, missing dependency
**Giải pháp:** Kiểm tra code, fix error

### **3. API Error**
```
📦 Response data: {success: false, message: "..."}
```
**Nguyên nhân:** Backend error, database issue
**Giải pháp:** Kiểm tra backend logs

### **4. Redirect Issue**
```
✅ Login successful, storing token and redirecting...
```
Nhưng không redirect
**Nguyên nhân:** JavaScript redirect issue
**Giải pháp:** Kiểm tra redirect code

## 🛠️ **Debug Commands:**

### **Kiểm tra token trong console:**
```javascript
// Mở Console và chạy:
console.log('Token:', localStorage.getItem('admin_token'));
console.log('Admin info:', localStorage.getItem('admin_info'));
console.log('Cookies:', document.cookie);
```

### **Test API trực tiếp:**
```javascript
// Mở Console và chạy:
fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
.then(response => response.json())
.then(data => console.log('API Response:', data));
```

## 📊 **Kết quả mong đợi:**

### **Khi test thành công:**
1. ✅ Form submit không có lỗi
2. ✅ API call trả về success: true
3. ✅ Token được lưu trong localStorage
4. ✅ Redirect đến dashboard thành công

### **Khi có vấn đề:**
1. ❌ Console hiển thị error cụ thể
2. ❌ Cần copy/paste error message
3. ❌ Cần kiểm tra Network tab

## 🎯 **Next Steps:**

1. **Test theo hướng dẫn trên**
2. **Copy/paste console logs** nếu có lỗi
3. **Screenshot** nếu cần thiết
4. **Report lại kết quả** để tôi hỗ trợ cụ thể

## 📞 **Thông tin cần cung cấp:**

Khi test, hãy cung cấp:
1. **Console logs** (copy/paste)
2. **Error messages** (nếu có)
3. **Behavior mô tả** (có redirect không? có lỗi gì?)
4. **Screenshot** (nếu cần)

Điều này sẽ giúp tôi xác định chính xác vấn đề và đưa ra giải pháp cụ thể!
