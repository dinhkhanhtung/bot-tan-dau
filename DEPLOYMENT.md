# Hướng dẫn triển khai BOT TÂN DẬU 1981

## 📋 Checklist trước khi deploy

- [ ] Đã có tài khoản Supabase
- [ ] Đã có Facebook App với Messenger product
- [ ] Đã có tài khoản Vercel
- [ ] Đã có tài khoản ngân hàng để nhận thanh toán

## 1️⃣ Setup Supabase

### Bước 1: Tạo project mới

1. Đăng nhập vào [Supabase](https://supabase.com)
2. Click "New Project"
3. Nhập thông tin project:
   - Name: `bot-tan-dau-1981`
   - Database Password: Lưu lại password này
   - Region: Chọn `Singapore` (gần Việt Nam nhất)
4. Click "Create new project"

### Bước 2: Chạy SQL Schema

1. Vào tab "SQL Editor"
2. Copy toàn bộ nội dung file `database-schema.sql`
3. Paste vào SQL Editor và click "Run"
4. Chờ đến khi tất cả tables được tạo

### Bước 3: Lấy API Keys

1. Vào tab "Settings" → "API"
2. Copy các giá trị sau:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

## 2️⃣ Setup Facebook App

### Bước 1: Tạo Facebook App

1. Đăng nhập vào [Facebook Developers](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Chọn "Business" type
4. Nhập thông tin:
   - App Name: `Bot Tân Dậu 1981`
   - App Contact Email: Email của bạn
5. Click "Create App"

### Bước 2: Thêm Messenger Product

1. Trong app dashboard, click "Add Product"
2. Tìm "Messenger" và click "Set Up"
3. Scroll down đến "Access Tokens"
4. Chọn hoặc tạo Facebook Page
5. Click "Generate Token"
6. Copy token này → `FACEBOOK_ACCESS_TOKEN`

### Bước 3: Lấy App ID và App Secret

1. Vào "Settings" → "Basic"
2. Copy các giá trị:
   - `App ID` → `FACEBOOK_APP_ID`
   - `App Secret` → `FACEBOOK_APP_SECRET` (click "Show")

### Bước 4: Tạo Verify Token

1. Tạo một string ngẫu nhiên (ví dụ: `my_verify_token_123`)
2. Lưu lại → `FACEBOOK_VERIFY_TOKEN`

## 3️⃣ Setup Vercel

### Bước 1: Deploy lên Vercel

1. Đăng nhập vào [Vercel](https://vercel.com)
2. Click "New Project"
3. Import GitHub repository
4. Cấu hình:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Click "Deploy"

### Bước 2: Cấu hình Environment Variables

1. Vào "Settings" → "Environment Variables"
2. Thêm các biến sau:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
FACEBOOK_APP_ID=<your-facebook-app-id>
FACEBOOK_APP_SECRET=<your-facebook-app-secret>
FACEBOOK_ACCESS_TOKEN=<your-facebook-access-token>
FACEBOOK_VERIFY_TOKEN=<your-verify-token>
PAYMENT_BANK_ACCOUNT=<your-bank-account>
PAYMENT_BANK_NAME=<your-bank-name>
PAYMENT_ACCOUNT_HOLDER=<your-account-holder-name>
BOT_DAILY_FEE=1000
BOT_MINIMUM_DAYS=7
BOT_TRIAL_DAYS=3
BOT_REFERRAL_REWARD=10000
BOT_SEARCH_SERVICE_FEE=5000
```

3. Click "Save"

### Bước 3: Redeploy

1. Vào "Deployments"
2. Click "Redeploy" trên deployment mới nhất
3. Chờ deployment hoàn thành

## 4️⃣ Cấu hình Facebook Webhook

### Bước 1: Setup Webhook

1. Vào Facebook App → "Messenger" → "Settings"
2. Scroll đến "Webhooks"
3. Click "Add Callback URL"
4. Nhập:
   - Callback URL: `https://your-vercel-domain.vercel.app/api/webhook`
   - Verify Token: `<your-verify-token>` (giống với `FACEBOOK_VERIFY_TOKEN`)
5. Click "Verify and Save"

### Bước 2: Subscribe to Events

1. Chọn các events:
   - `messages`
   - `messaging_postbacks`
   - `message_deliveries`
   - `message_reads`
2. Click "Save"

### Bước 3: Subscribe Page

1. Scroll đến "Webhooks"
2. Click "Add Subscriptions"
3. Chọn Facebook Page
4. Chọn các events giống như bước 2
5. Click "Subscribe"

## 5️⃣ Test Bot

### Bước 1: Test trên Facebook Page

1. Vào Facebook Page của bạn
2. Click "Send Message"
3. Gửi tin nhắn "Xin chào"
4. Bot sẽ trả lời với welcome message

### Bước 2: Test đăng ký

1. Gửi "Đăng ký"
2. Làm theo hướng dẫn của bot
3. Nhập thông tin:
   - Họ tên
   - Số điện thoại
   - Vị trí
   - Xác nhận tuổi 1981

### Bước 3: Test niêm yết

1. Gửi "Niêm yết"
2. Chọn category
3. Nhập thông tin sản phẩm
4. Upload hình ảnh
5. Xác nhận đăng tin

## 6️⃣ Cấu hình Admin

### Bước 1: Tạo Admin User

1. Vào Supabase → "Table Editor"
2. Chọn table `users`
3. Tìm user có `facebook_id = 'admin'`
4. Cập nhật `facebook_id` thành Facebook ID của bạn
5. Để kiểm tra Facebook ID:
   - Vào Facebook → Settings → Profile
   - Copy Facebook ID

### Bước 2: Test Admin Commands

1. Gửi `/admin` cho bot
2. Bot sẽ hiển thị Admin Dashboard
3. Test các chức năng:
   - Duyệt thanh toán
   - Quản lý user
   - Quản lý tin đăng
   - Xem thống kê

## 7️⃣ Monitoring & Maintenance

### Logging

1. Vào Vercel → "Functions" → "Logs"
2. Xem logs real-time
3. Filter theo function

### Error Tracking

1. Setup Sentry (optional):
   ```bash
   npm install @sentry/nextjs
   ```
2. Cấu hình Sentry trong `next.config.js`

### Database Backup

1. Vào Supabase → "Database" → "Backups"
2. Enable daily backups
3. Download backup định kỳ

### Performance Monitoring

1. Vào Vercel → "Analytics"
2. Xem metrics:
   - Response time
   - Request count
   - Error rate

## 8️⃣ Troubleshooting

### Webhook không hoạt động

1. Kiểm tra Verify Token đúng chưa
2. Kiểm tra Callback URL đúng chưa
3. Xem logs trên Vercel
4. Test webhook với curl:
   ```bash
   curl -X POST https://your-vercel-domain.vercel.app/api/webhook \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":[{"messaging":[{"sender":{"id":"123"},"message":{"text":"test"}}]}]}'
   ```

### Bot không trả lời

1. Kiểm tra Page có subscribe webhook chưa
2. Kiểm tra Access Token còn hạn không
3. Xem logs trên Vercel
4. Test API endpoint:
   ```bash
   curl https://your-vercel-domain.vercel.app/api/webhook?hub.mode=subscribe&hub.verify_token=your-verify-token&hub.challenge=test
   ```

### Database error

1. Kiểm tra Supabase connection
2. Kiểm tra API keys đúng chưa
3. Xem logs trên Supabase
4. Test connection:
   ```bash
   curl https://your-supabase-url.supabase.co/rest/v1/users \
     -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key"
   ```

## 9️⃣ Security Checklist

- [ ] Đã enable Row Level Security (RLS) trên Supabase
- [ ] Đã verify webhook signature
- [ ] Đã validate user input
- [ ] Đã hide sensitive data trong logs
- [ ] Đã setup rate limiting
- [ ] Đã enable HTTPS only
- [ ] Đã backup database định kỳ

## 🔟 Next Steps

1. Customize bot messages theo nhu cầu
2. Thêm custom logic cho business rules
3. Setup analytics và tracking
4. Optimize performance
5. Add more features theo feedback

## 📞 Support

Nếu gặp vấn đề, liên hệ:
- Email: support@tandau1981.com
- Facebook: https://facebook.com/bot.tandau1981
- GitHub Issues: https://github.com/your-repo/issues
