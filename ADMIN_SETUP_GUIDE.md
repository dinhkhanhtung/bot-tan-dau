# 🔧 Admin Setup Guide - BOT Tân Dậu

## Tổng quan

Hệ thống admin đã được cập nhật để hỗ trợ cả **admin fanpage** và **admin cá nhân** với khả năng bật/tắt linh hoạt.

## Cấu hình Admin

### 1. Admin Fanpage (Mặc định - Luôn bật)
- Tin nhắn từ fanpage (`FACEBOOK_PAGE_ID`) được tự động nhận diện là admin
- Không cần cấu hình thêm
- Có toàn quyền quản lý hệ thống

### 2. Admin Cá nhân (Tùy chọn)
- Có thể bật/tắt bằng biến `ENABLE_PERSONAL_ADMINS`
- Quản lý thông qua bảng `admin_users` trong database
- Có thể phân quyền chi tiết

## Biến Môi trường

### Cập nhật file `.env.local`:

```env
# Admin Configuration
ENABLE_PERSONAL_ADMINS=false  # Bật admin cá nhân (true/false)
FACEBOOK_PAGE_ID=2571120902929642  # ID fanpage (admin mặc định)
```

## Cấu hình Database

### Bảng `admin_users` (đã có sẵn):
```sql
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    facebook_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Cách sử dụng

### 1. Chạy script setup:
```bash
node admin-setup.js
```

### 2. Test admin fanpage:
- Gửi tin nhắn từ fanpage
- Bot sẽ tự động hiển thị admin dashboard

### 3. Thêm admin cá nhân (nếu bật):
```sql
INSERT INTO admin_users (facebook_id, name, role, permissions, is_active) 
VALUES ('1234567890123456', 'Admin Name', 'admin', '{"all": true}', true);
```

## Chức năng Admin

### Dashboard chính:
- 💬 Vào cuộc trò chuyện
- 💰 Quản lý thanh toán
- 👥 Quản lý người dùng
- 🛒 Quản lý tin đăng
- 📊 Xem thống kê
- 🔔 Thông báo
- 📤 Gửi link đăng ký
- ⚙️ Quản lý admin
- 🚫 Spam logs

### Lệnh admin:
- `admin` - Hiển thị dashboard
- `quản trị` - Hiển thị dashboard
- `dashboard` - Hiển thị dashboard

## Troubleshooting

### Admin không hiển thị nút:
1. Kiểm tra `FACEBOOK_PAGE_ID` có đúng không
2. Kiểm tra tin nhắn có từ fanpage không
3. Kiểm tra log console để debug

### Admin cá nhân không hoạt động:
1. Kiểm tra `ENABLE_PERSONAL_ADMINS=true`
2. Kiểm tra user có trong bảng `admin_users` không
3. Kiểm tra `is_active=true`

## Cập nhật từ phiên bản cũ

### 1. Cập nhật biến môi trường:
```bash
# Thêm vào .env.local
ENABLE_PERSONAL_ADMINS=false
```

### 2. Cập nhật database (nếu cần):
```sql
-- Bảng admin_users đã có sẵn, không cần tạo mới
```

### 3. Test chức năng:
```bash
node admin-setup.js
```

## Lưu ý quan trọng

- **Admin fanpage** luôn có quyền cao nhất
- **Admin cá nhân** chỉ hoạt động khi `ENABLE_PERSONAL_ADMINS=true`
- Có thể chạy cả hai loại admin cùng lúc
- Database schema đã được cập nhật đầy đủ
