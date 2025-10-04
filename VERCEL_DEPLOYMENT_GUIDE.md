# 🚀 Vercel Deployment Guide - BOT Tân Dậu

## Cập nhật biến môi trường trên Vercel

### 1. Truy cập Vercel Dashboard
- Đăng nhập vào [vercel.com](https://vercel.com)
- Chọn project "bot_tan_dau"
- Vào tab **Settings** → **Environment Variables**

### 2. Cập nhật các biến môi trường

Copy các biến sau từ file `vercel-env-variables-clean.env` và thêm vào Vercel:

#### ✅ Biến đã có sẵn (kiểm tra lại):
```
FACEBOOK_PAGE_ID=2571120902929642
ENABLE_PERSONAL_ADMINS=false
```

#### 🔧 Các biến cần thêm mới:
```
# Admin Configuration
ENABLE_PERSONAL_ADMINS=false
```

### 3. Cấu hình Environment

Đảm bảo các biến được set cho:
- **Production** ✅
- **Preview** ✅  
- **Development** ✅

### 4. Redeploy

Sau khi cập nhật biến môi trường:
1. Vào tab **Deployments**
2. Click **Redeploy** trên deployment mới nhất
3. Hoặc push code mới để trigger auto-deploy

## Test Admin Functionality

### 1. Test Admin Fanpage
- Gửi tin nhắn từ fanpage Facebook
- Bot sẽ tự động hiển thị admin dashboard với các nút:
  - 💬 Vào cuộc trò chuyện
  - 💰 Quản lý thanh toán
  - 👥 Quản lý người dùng
  - 🛒 Quản lý tin đăng
  - 📊 Xem thống kê
  - 🔔 Thông báo
  - 📤 Gửi link đăng ký
  - ⚙️ Quản lý admin
  - 🚫 Spam logs

### 2. Test Admin Commands
Gửi các lệnh sau từ fanpage:
- `admin`
- `quản trị`
- `dashboard`

## Troubleshooting

### Admin không hiển thị nút:
1. ✅ Kiểm tra `FACEBOOK_PAGE_ID` có đúng không
2. ✅ Kiểm tra tin nhắn có từ fanpage không
3. ✅ Kiểm tra Vercel logs để debug

### Lỗi database:
1. ✅ Kiểm tra `SUPABASE_SERVICE_ROLE_KEY` có đúng không
2. ✅ Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` có đúng không
3. ✅ Chạy script `database-final-complete.sql` trong Supabase

## Cấu trúc Admin mới

### 🎯 Admin Fanpage (Mặc định)
- **ID**: `2571120902929642`
- **Quyền**: Toàn quyền quản lý
- **Cách hoạt động**: Tự động nhận diện từ `FACEBOOK_PAGE_ID`

### 👥 Admin Cá nhân (Tùy chọn)
- **Bật/tắt**: `ENABLE_PERSONAL_ADMINS=true/false`
- **Quản lý**: Bảng `admin_users` trong database
- **Phân quyền**: Có thể tùy chỉnh chi tiết

## Database Schema

Bảng `admin_users` đã có sẵn:
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

## Lưu ý quan trọng

- ⚠️ **Không commit file .env** vào GitHub
- ✅ **Chỉ cập nhật biến môi trường trên Vercel**
- 🔒 **Bảo mật**: Không chia sẻ `SUPABASE_SERVICE_ROLE_KEY`
- 🚀 **Deploy**: Sau khi cập nhật biến, cần redeploy

## Kết quả mong đợi

Sau khi cập nhật và deploy:
1. ✅ Admin fanpage có thể quản trị bot
2. ✅ Hiển thị đầy đủ các nút chức năng admin
3. ✅ Có thể quản lý thanh toán, user, tin đăng
4. ✅ Có thể xem thống kê và gửi thông báo
5. ✅ Hỗ trợ cả admin fanpage và admin cá nhân (nếu bật)
