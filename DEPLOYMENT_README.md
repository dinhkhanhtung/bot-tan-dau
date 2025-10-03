# 🚀 Hướng Dẫn Deploy Bot Tân Dậu lên Vercel

## 📋 Yêu cầu trước khi deploy

### 1. Tạo tài khoản Vercel
- Truy cập [vercel.com](https://vercel.com) và đăng ký tài khoản
- Cài đặt Vercel CLI: `npm i -g vercel`

### 2. Chuẩn bị Environment Variables
1. Copy file `.env.local.example` thành `.env.local`
2. Điền các thông tin thực tế:
   ```bash
   cp .env.local.example .env.local
   ```

3. Cập nhật các biến môi trường quan trọng:
   - **SUPABASE_SERVICE_ROLE_KEY**: Key service role từ Supabase Dashboard
   - **FACEBOOK_ACCESS_TOKEN**: Token Facebook Page Access Token
   - **CRON_SECRET**: Tạo một secret key ngẫu nhiên cho cron jobs

### 3. Cấu hình Facebook Webhook
1. Truy cập Facebook Developers Console
2. Chọn app của bạn
3. Thêm Webhook URL: `https://your-domain.vercel.app/api/webhook`
4. Subscribe các events: `messages`, `messaging_postbacks`

## 🛠️ Các bước Deploy

### Phương pháp 1: Deploy qua Vercel Dashboard (Khuyến nghị)

#### Bước 1: Import Project
1. Truy cập [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Kết nối với GitHub repository của bạn
4. Chọn repository `bot-tan-dau`

#### Bước 2: Cấu hình Environment Variables
Trong phần "Environment Variables", thêm tất cả biến từ file `.env.local`:

**Supabase Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://oxornnooldwivlexsnkf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Facebook Variables:**
```
FACEBOOK_APP_ID=1246774479717275
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_page_access_token
FACEBOOK_VERIFY_TOKEN=my_verify_token_123
```

**Bot Configuration:**
```
BOT_DAILY_FEE=2000
BOT_MINIMUM_DAYS=7
BOT_TRIAL_DAYS=3
BOT_REFERRAL_REWARD=10000
BOT_SEARCH_SERVICE_FEE=5000
```

**Admin Configuration:**
```
ADMIN_IDS=31268544269455564,31298980306415271
```

**Cron Jobs:**
```
CRON_SECRET=your_secure_random_string
```

#### Bước 3: Deploy
1. Click "Deploy"
2. Chờ build hoàn thành (khoảng 2-3 phút)
3. Copy domain được cung cấp (ví dụ: `https://your-project.vercel.app`)

### Phương pháp 2: Deploy qua Vercel CLI

#### Bước 1: Login Vercel
```bash
vercel login
```

#### Bước 2: Deploy
```bash
vercel --prod
```

#### Bước 3: Thêm Environment Variables
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Lặp lại cho tất cả các biến cần thiết
```

## 🔧 Cấu hình sau khi Deploy

### 1. Cập nhật Facebook Webhook
1. Truy cập Facebook Developers Console
2. Vào phần Webhooks
3. Cập nhật Webhook URL thành: `https://your-domain.vercel.app/api/webhook`
4. Verify token: `my_verify_token_123`

### 2. Cấu hình Supabase Cron Jobs (Optional)
Để sử dụng cron jobs trên Vercel, bạn có thể sử dụng các dịch vụ như:
- **Vercel Cron**: Cấu hình trong vercel.json
- **External Service**: Sử dụng cron-job.org hoặc tương tự

### 3. Domain tùy chỉnh (Optional)
1. Trong Vercel Dashboard, vào Settings → Domains
2. Thêm domain tùy chỉnh của bạn
3. Cập nhật DNS records

## 🧪 Test Deployment

### 1. Kiểm tra API Health
```bash
curl https://your-domain.vercel.app/api/health
```

### 2. Kiểm tra Webhook
```bash
curl -X GET "https://your-domain.vercel.app/api/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=my_verify_token_123"
```

### 3. Test Facebook Messenger
1. Gửi tin nhắn đến Facebook Page của bạn
2. Kiểm tra logs trong Vercel Dashboard

## 📊 Monitoring & Logs

### 1. Vercel Dashboard
- Xem real-time logs
- Monitor function invocations
- Check performance metrics

### 2. Facebook Webhook Logs
- Sử dụng `console.log` trong code
- Logs sẽ hiển thị trong Vercel Dashboard

### 3. Error Tracking (Optional)
Cân nhắc sử dụng:
- Sentry
- LogRocket
- Bugsnag

## 🔒 Security Checklist

- [ ] Environment variables đã được cấu hình đúng
- [ ] Facebook Access Token có đủ permissions
- [ ] Supabase RLS policies đã được cấu hình
- [ ] Webhook verify token đã được thiết lập
- [ ] Không có sensitive data trong code

## 🚨 Troubleshooting

### Lỗi thường gặp:

**1. Build Failed**
- Kiểm tra dependencies: `npm install`
- Kiểm tra TypeScript errors: `npm run type-check`
- Kiểm tra environment variables

**2. Webhook không hoạt động**
- Verify webhook URL trong Facebook
- Kiểm tra logs trong Vercel
- Test với Postman/curl

**3. Database connection failed**
- Kiểm tra Supabase credentials
- Verify RLS policies
- Check network connectivity

**4. Functions timeout**
- Tăng timeout trong vercel.json
- Optimize database queries
- Use caching when possible

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra Vercel Dashboard logs
2. Test API endpoints
3. Verify environment variables
4. Check Facebook Webhook configuration

---

🎉 **Chúc mừng! Bot của bạn đã sẵn sàng phục vụ cộng đồng Tân Dậu - Hỗ Trợ Chéo!**
