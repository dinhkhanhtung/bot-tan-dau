# BOT Tân Dậu - Hỗ Trợ Chéo

Facebook Messenger Bot kết nối mua bán cho cộng đồng Tân Dậu - Hỗ Trợ Chéo.

## 🎯 Mục đích

- **Platform kết nối mua bán** cho thành viên sinh năm 1981
- **Chỉ thu phí niêm yết**: 1,000đ/ngày, tối thiểu 7 ngày
- **Bot chỉ kết nối, không tham gia giao dịch**
- **Trial 3 ngày miễn phí** → yêu cầu thanh toán sau
- **Xác nhận tuổi Tân Dậu - Hỗ Trợ Chéo dựa trên tin tưởng**

## 📱 Platform Architecture

- **100% Facebook Messenger Bot** - Không có web app cho user
- **Admin cũng sử dụng qua chat** - Không có web dashboard
- **Next.js 14** + **TypeScript** + **Supabase** + **Vercel**
- **Tất cả tương tác qua chat messages** với các nút bấm điều hướng
- **Typing indicator** cho mọi phản hồi của bot

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd bot-tan-dau-1981
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình environment variables

Tạo file `.env.local` từ `env.example`:

```bash
cp env.example .env.local
```

Cập nhật các giá trị trong `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Facebook Messenger Configuration
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_VERIFY_TOKEN=your_facebook_verify_token

# Payment Configuration
PAYMENT_BANK_ACCOUNT=0123456789
PAYMENT_BANK_NAME=Vietcombank
PAYMENT_ACCOUNT_HOLDER=BOT TÂN DẬU

# Bot Configuration
BOT_DAILY_FEE=1000
BOT_MINIMUM_DAYS=7
BOT_TRIAL_DAYS=3
BOT_REFERRAL_REWARD=10000
BOT_SEARCH_SERVICE_FEE=5000
```

### 4. Setup Supabase Database

1. Tạo project mới trên [Supabase](https://supabase.com)
2. Chạy script SQL trong `database-schema.sql` để tạo các bảng
3. Cập nhật URL và keys trong `.env.local`

### 5. Setup Facebook App

1. Tạo app mới trên [Facebook Developers](https://developers.facebook.com)
2. Thêm Messenger product
3. Cấu hình webhook URL: `https://your-domain.com/api/webhook`
4. Cập nhật tokens trong `.env.local`

### 6. Chạy development server

```bash
npm run dev
```

### 7. Deploy lên Vercel

```bash
npm run build
vercel --prod
```

## 🗄️ Database Schema

### Bảng chính:

- **users**: Thông tin người dùng
- **listings**: Tin đăng sản phẩm/dịch vụ
- **conversations**: Cuộc trò chuyện giữa users
- **payments**: Thanh toán
- **ratings**: Đánh giá
- **events**: Sự kiện cộng đồng
- **notifications**: Thông báo
- **ads**: Quảng cáo
- **search_requests**: Yêu cầu tìm kiếm hộ
- **referrals**: Giới thiệu
- **user_points**: Điểm thưởng
- **bot_sessions**: Session bot

## 🔧 API Endpoints

### Webhook
- `POST /api/webhook` - Facebook Messenger webhook

### Users
- `POST /api/users` - Tạo user mới
- `GET /api/users?facebook_id=xxx` - Lấy user theo Facebook ID
- `PUT /api/users` - Cập nhật user
- `DELETE /api/users?facebook_id=xxx` - Xóa user

### Listings
- `POST /api/listings` - Tạo tin đăng mới
- `GET /api/listings` - Lấy danh sách tin đăng
- `PUT /api/listings` - Cập nhật tin đăng
- `DELETE /api/listings?id=xxx` - Xóa tin đăng

### Payments
- `POST /api/payments` - Tạo thanh toán mới
- `GET /api/payments` - Lấy danh sách thanh toán
- `PUT /api/payments` - Cập nhật trạng thái thanh toán
- `DELETE /api/payments?id=xxx` - Xóa thanh toán

## 🎯 Tính năng chính

### 1. Đăng ký & Xác thực
- Đăng ký đơn giản: Họ tên, SĐT, Vị trí, Xác nhận tuổi 1981
- Không cần Facebook Login phức tạp
- Dựa trên tin tưởng, không kiểm tra chặt chẽ
- Tạo referral code: TD1981-{USER_ID}
- Trial 3 ngày tự động kích hoạt

### 2. Niêm yết sản phẩm/dịch vụ
- Chia nhỏ từng bước: Chọn loại → Nhập tiêu đề → Giá → Mô tả → Vị trí → Hình ảnh
- Categories: BĐS, Ô tô, Điện tử, Thời trang, Ẩm thực, Dịch vụ
- Mỗi bước có nút bấm rõ ràng
- Xác nhận thông tin trước khi đăng

### 3. Tìm kiếm & Kết nối
- Tìm kiếm theo category và loại sản phẩm
- Hiển thị kết quả với nút "XEM CHI TIẾT" và "KẾT NỐI"
- Chi tiết sản phẩm: Thông tin, mô tả, hình ảnh, đánh giá người bán
- Kết nối tạo conversation giữa 2 user

### 4. Chat Dual Mode
- **Bot Chat**: Hệ thống tự động, gợi ý sản phẩm, cross-selling
- **Admin Chat**: Hỗ trợ trực tiếp, tư vấn cá nhân hóa
- User chọn chế độ chat qua nút bấm

### 5. Thanh toán
- Nhắc nhở trial: 48h, 24h, khi hết hạn
- Thông tin chuyển khoản: STK, Ngân hàng, Chủ TK, Nội dung
- Upload biên lai qua chat
- Admin duyệt qua chat với nút "DUYỆT"/"TỪ CHỐI"
- Tự động gia hạn khi duyệt

### 6. Cộng đồng Tân Dậu
- **Top Sellers**: Ranking hàng tuần dựa trên rating và giao dịch
- **Birthday Notifications**: Thông báo sinh nhật hàng ngày
- **Rating System**: Đánh giá 1-5 sao sau mỗi giao dịch
- **Hỗ trợ chéo**: Tìm việc, nhà trọ, đi chung xe, trông trẻ, nấu ăn, tư vấn
- **Sự kiện cộng đồng**: Gặp mặt, triển lãm, hội chợ

### 7. Tính năng nâng cao
- **Cross-selling**: Gợi ý sản phẩm sau 3 tin nhắn
- **Quảng cáo**: Homepage Banner, Search Boost, Cross-sell Spot, Featured Listing
- **Dịch vụ tìm kiếm hộ**: 5,000đ/lần
- **Referral**: Mã giới thiệu TD1981-{USER_ID}, thưởng 10,000đ
- **Tử vi**: Tử vi hàng ngày cho Tân Dậu - Hỗ Trợ Chéo
- **Điểm thưởng**: Hệ thống điểm và level
- **Admin**: Quản lý qua chat với duyệt thanh toán và thống kê

## 🔧 Admin Commands

Gửi `/admin` để vào admin dashboard:

- **THANH TOÁN**: Duyệt thanh toán với nút "DUYỆT"/"TỪ CHỐI"
- **USER**: Quản lý user và xem thống kê
- **TIN ĐĂNG**: Quản lý tin đăng
- **THỐNG KÊ**: Xem thống kê real-time

## 📊 Thống kê

- **User**: Tin đăng, kết nối, đánh giá, doanh thu
- **Admin**: Tổng user, doanh thu, tin đăng, kết nối
- **Real-time**: Cập nhật liên tục
- **Xuất báo cáo**: Excel/CSV

## 🚀 Triển khai

### Vercel (Recommended)

1. Connect GitHub repository với Vercel
2. Cấu hình environment variables
3. Deploy tự động khi push code

### Manual Deploy

```bash
npm run build
vercel --prod
```

## 🔒 Bảo mật

- Webhook signature verification
- Input validation
- SQL injection protection
- Rate limiting
- Error handling

## 📝 License

MIT License

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📞 Support

Liên hệ admin qua chat bot hoặc email: support@tandau1981.com

---

## 📋 **TÀI LIỆU CHI TIẾT HỆ THỐNG**

### 💰 **REVENUE MODEL**

| **Gói dịch vụ** | **Giá** | **Tính năng** |
|----------------|---------|---------------|
| **FREE** | 0đ | Xem tin, tìm kiếm cơ bản |
| **BASIC** | 50,000đ/tháng | Đăng tin không giới hạn, tìm kiếm nâng cao |
| **VIP** | 100,000đ/tháng | Tất cả BASIC + Ưu tiên hiển thị + Analytics |
| **Add-ons** | | |
| Featured Listing | 15,000đ/tuần | Ưu tiên hiển thị |
| Search Boost | 10,000đ/tuần | Tăng khả năng tìm thấy |
| Business Match | 50,000đ/lần | Kết nối đối tác phù hợp |

### 👥 **USER JOURNEY**

#### **1. Onboarding Flow**
```typescript
👋 Welcome Message
📝 Registration (5 bước đơn giản)
🎁 Trial 7 ngày miễn phí
💰 Payment Options
✅ Account Activated
🚀 Start Using Features
```

#### **2. Main Features**
```typescript
🛒 Marketplace:
• Đăng sản phẩm/dịch vụ
• Tìm kiếm thông minh
• Kết nối mua bán
• Rating & Review

👥 Community:
• Birthday notifications
• Top sellers
• Community events
• Support groups

💰 Payment:
• Real-time tracking
• Multiple payment methods
• Auto approval
• Payment history

🔮 Entertainment:
• Daily horoscope
• Fortune telling
• Fun facts
• Community games
```

### ⚙️ **ADMIN FEATURES**

#### **1. Dashboard Overview**
```typescript
📊 Real-time Stats:
• Today: Users, Revenue, Listings
• Growth metrics
• System health

⚠️ Priority Actions:
• Pending payments
• Trial expiring
• Spam reports
• System alerts

🎛️ Management Tools:
• User management
• Payment approval
• Content moderation
• Analytics & Reports
```

#### **2. Bulk Operations**
```typescript
⚡ Smart Bulk Actions:
• Bulk approve payments (by priority)
• Bulk feature listings
• Bulk send notifications
• Bulk delete spam
```

### 🤖 **AI FEATURES**

#### **1. Intent Classification**
```typescript
🎯 Smart Intent Detection:
• Natural language processing
• Context awareness
• Personalized responses
• Conversation flow management
```

#### **2. Smart Recommendations**
```typescript
🧠 AI-powered Suggestions:
• Product recommendations
• Business opportunities
• Community connections
• Personalized content
```

### 📱 **TECHNICAL ARCHITECTURE**

#### **1. Core Technologies**
```typescript
Frontend: Next.js 14 + TypeScript
Backend: Next.js API Routes
Database: Supabase (PostgreSQL)
Cache: In-memory + Redis-ready
AI: Gemini API + Fallback
Deployment: Vercel
```

#### **2. Performance Features**
```typescript
⚡ Optimization:
• Multi-level caching
• Database query optimization
• Image lazy loading
• CDN integration

🛡️ Security:
• Input validation
• Rate limiting
• Anti-spam system
• Error handling
```

### 🔧 **CẤU HÌNH ENVIRONMENT VARIABLES**

#### **Bước 1: Chỉnh sửa file .env**

```bash
# Mở file .env và cập nhật các biến sau:

# === CHỌN 1 TRONG 3 AI PROVIDER ===
# OpenAI (Khuyến nghị)
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# HOẶC Google AI
GOOGLE_AI_ENABLED=true
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
GOOGLE_AI_MODEL=gemini-pro

# HOẶC Claude
CLAUDE_ENABLED=true
CLAUDE_API_KEY=your-claude-api-key-here
CLAUDE_MODEL=claude-3-sonnet-20240229

# === BẬT CÁC TÍNH NĂNG AI ===
AI_SMART_SEARCH=true
AI_CONTENT_GENERATION=true
AI_CHAT_ASSISTANT=true
AI_RECOMMENDATIONS=true
AI_AUTO_REPLY=false  # Tắt auto reply để an toàn

# === GIỚI HẠN SỬ DỤNG ===
AI_DAILY_LIMIT=100
AI_REQUEST_TIMEOUT=30000
AI_MAX_RETRIES=3

# === FACEBOOK & DATABASE ===
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FACEBOOK_ACCESS_TOKEN=your_facebook_token
FACEBOOK_VERIFY_TOKEN=your_verify_token
CRON_SECRET=your-super-secret-key
```

### 🗄️ **DATABASE SETUP**

#### **✅ TIN VUI: Không cần thêm cột nào!**

Database hiện tại đã hoàn hảo cho AI:
- ✅ `users` - Lưu thông tin user và preferences
- ✅ `listings` - Lưu sản phẩm để AI phân tích
- ✅ `conversations` - Lưu lịch sử chat
- ✅ `messages` - Lưu tin nhắn để AI học
- ✅ `bot_sessions` - Lưu session để AI context

#### **Các bảng đã sẵn sàng:**
```sql
-- Các bảng này đã có trong database-complete.sql
users (id, facebook_id, name, phone, location, preferences...)
listings (id, user_id, title, description, category, price...)
conversations (id, user1_id, user2_id, listing_id...)
messages (id, conversation_id, sender_id, content...)
bot_sessions (id, facebook_id, session_data, current_flow...)
```

### ⚡ **TRIỂN KHAI AI AN TOÀN**

#### **📋 KIỂM TRA AN TOÀN TRƯỚC KHI TRIỂN KHAI**

Trước khi bật AI, hãy chạy script kiểm tra an toàn:

```bash
# Trong thư mục src/lib
node ai-safety-verification.js
```

**Kết quả mong đợi:**
- ✅ Import Safety: Tất cả AI modules import thành công
- ✅ Memory Usage: Tăng < 50MB
- ✅ Performance: Import < 50ms
- ✅ Fallback: Tất cả fallback hoạt động
- ✅ Backward Compatibility: Code cũ vẫn chạy
- ✅ ENV: Có thể bật AI an toàn

#### **Phase 1: Test AI cơ bản (1-2 giờ)**

1. **Bật 1 AI Provider trước:**
```bash
# Chỉ bật OpenAI để test
OPENAI_ENABLED=true
GOOGLE_AI_ENABLED=false
CLAUDE_ENABLED=false

AI_SMART_SEARCH=true
AI_CONTENT_GENERATION=false  # Tắt các tính năng khác
AI_CHAT_ASSISTANT=false
AI_RECOMMENDATIONS=false
```

2. **Test lệnh tìm kiếm:**
```
User: "tìm nhà dưới 2 tỷ ở Hà Nội"
Bot: [Có thể trả lời cơ bản hoặc AI nâng cao]
```

#### **Phase 2: Bật đầy đủ tính năng (2-4 giờ)**

1. **Bật tất cả tính năng:**
```bash
AI_SMART_SEARCH=true
AI_CONTENT_GENERATION=true
AI_CHAT_ASSISTANT=true
AI_RECOMMENDATIONS=true
AI_AUTO_REPLY=false  # Vẫn tắt auto reply
```

2. **Test các tính năng:**
```
User: "Tôi muốn bán nhà, giúp tôi viết mô tả"
Bot: [AI tạo mô tả hấp dẫn]

User: "Chào bot, bạn có thể giúp gì?"
Bot: [AI chat thông minh]

User: "Tôi thích nhà này, có gì tương tự không?"
Bot: [AI gợi ý sản phẩm liên quan]
```

#### **Phase 3: Tối ưu và Monitor (Ongoing)**

1. **Theo dõi performance:**
```typescript
// Trong code có thể gọi
const health = await aiManager.getAIHealthStatus()
console.log(health)
```

2. **Điều chỉnh giới hạn:**
```bash
# Nếu quá tải, giảm giới hạn
AI_DAILY_LIMIT=50  # Giảm từ 100 xuống 50

# Nếu ổn định, tăng dần
AI_DAILY_LIMIT=200  # Tăng lên 200
```

### 🏗️ **HỆ THỐNG FLOW MỚI**

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

#### 🔧 **Dễ bảo trì**
- Mỗi luồng trong file riêng biệt
- Dễ tìm và sửa lỗi
- Code ngắn gọn, tập trung

#### 🚀 **Dễ mở rộng**
- Thêm chức năng mới mà không ảnh hưởng luồng khác
- Tách biệt trách nhiệm rõ ràng
- Có thể phát triển song song

#### ⚡ **Tối ưu performance**
- Message router xử lý định tuyến thông minh
- Session manager tập trung
- Giảm độ phức tạp của logic

#### 🛡️ **Bảo toàn chức năng**
- Không làm mất bất kỳ tính năng hiện tại nào
- Adapter cho phép chuyển đổi dần dần
- Fallback system đảm bảo an toàn

### 🔧 **CÁCH SETUP CRON JOBS**

#### **Option 1: Sử dụng cron-job.org (Khuyến nghị)**

1. **Đăng ký tài khoản**: https://cron-job.org/
2. **Tạo cron job mới**:
   - **URL**: `https://your-domain.vercel.app/api/cron`
   - **Method**: `GET`
   - **Headers**:
     ```
     Authorization: Bearer your-secret-key
     Content-Type: application/json
     ```
   - **Schedule**: Mỗi giờ (0 * * * *)

3. **Cấu hình Environment Variables**:
   ```bash
   CRON_SECRET=your-secret-key
   ```

#### **Option 2: Sử dụng Vercel Cron Jobs**

1. **Vào Vercel Dashboard**
2. **Chọn project** → **Settings** → **Functions**
3. **Thêm cron job**:
   ```json
   {
     "schedule": "0 * * * *",
     "path": "/api/cron"
   }
   ```

#### **Option 3: Sử dụng Local Cron (Development)**

```bash
# Linux/Mac
crontab -e
# Thêm dòng:
# 0 * * * * curl -H "Authorization: Bearer your-secret-key" https://your-domain.vercel.app/api/cron

# Windows Task Scheduler
# Tạo task chạy mỗi giờ với command:
# curl -H "Authorization: Bearer your-secret-key" https://your-domain.vercel.app/api/cron
```

### 📅 **LỊCH CHẠY CRON JOBS**

| Cron Job | Thời gian | Mục đích |
|----------|-----------|----------|
| `sendTrialReminders()` | Mỗi giờ | Gửi nhắc nhở hết hạn trial (48h, 24h) |
| `sendBirthdayNotifications()` | 8:00 AM hàng ngày | Thông báo sinh nhật cộng đồng |
| `sendHoroscopeUpdates()` | 7:00 AM hàng ngày | Tử vi Tân Dậu hàng ngày |
| `sendPaymentFollowUps()` | Mỗi giờ | Nhắc nhở thanh toán quá hạn |
| `cleanupOldData()` | Hàng ngày | Dọn dẹp dữ liệu cũ |

### 🔐 **BẢO MẬT CRON JOBS**

#### **1. Tạo Secret Key mạnh**
```bash
# Tạo random secret
openssl rand -hex 32
# Hoặc dùng online generator
```

#### **2. Cấu hình Environment Variables**
```bash
# .env.local
CRON_SECRET=your-super-secret-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### **3. Kiểm tra Authorization**
```bash
# Test cron job
curl -H "Authorization: Bearer your-secret-key" \
     https://your-domain.vercel.app/api/cron
```

### 📊 **MONITORING & LOGGING**

#### **Kiểm tra AI Health:**
```typescript
const aiManager = AIManager.getInstance()
const health = await aiManager.getAIHealthStatus()
console.log('AI Health:', health)
```

#### **Kiểm tra Usage Stats:**
```typescript
const stats = aiManager.getUsageStats()
console.log('AI Usage:', stats)
```

#### **Log AI Events:**
```typescript
aiManager.logAIMonitoringEvent({
    type: 'request',
    provider: 'openai',
    requestId: 'req_123',
    timestamp: new Date()
})
```

### 🚀 **DEPLOYMENT GUIDE**

#### **📋 Yêu cầu trước khi deploy**

##### **1. Tạo tài khoản Vercel**
- Truy cập [vercel.com](https://vercel.com) và đăng ký tài khoản
- Cài đặt Vercel CLI: `npm i -g vercel`

##### **2. Chuẩn bị Environment Variables**
1. Copy file `.env.local.example` thành `.env.local`
2. Điền các thông tin thực tế:
   ```bash
   cp .env.local.example .env.local
   ```

3. Cập nhật các biến môi trường quan trọng:
   - **SUPABASE_SERVICE_ROLE_KEY**: Key service role từ Supabase Dashboard
   - **FACEBOOK_ACCESS_TOKEN**: Token Facebook Page Access Token
   - **CRON_SECRET**: Tạo một secret key ngẫu nhiên cho cron jobs

##### **3. Cấu hình Facebook Webhook**
1. Truy cập Facebook Developers Console
2. Chọn app của bạn
3. Thêm Webhook URL: `https://your-domain.vercel.app/api/webhook`
4. Subscribe các events: `messages`, `messaging_postbacks`

#### **🛠️ Các bước Deploy**

##### **Phương pháp 1: Deploy qua Vercel Dashboard (Khuyến nghị)**

###### **Bước 1: Import Project**
1. Truy cập [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Kết nối với GitHub repository của bạn
4. Chọn repository `bot-tan-dau`

###### **Bước 2: Cấu hình Environment Variables**
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

###### **Bước 3: Deploy**
1. Click "Deploy"
2. Chờ build hoàn thành (khoảng 2-3 phút)
3. Copy domain được cung cấp (ví dụ: `https://your-project.vercel.app`)

#### **Phương pháp 2: Deploy qua Vercel CLI**

##### **Bước 1: Login Vercel**
```bash
vercel login
```

##### **Bước 2: Deploy**
```bash
vercel --prod
```

##### **Bước 3: Thêm Environment Variables**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Lặp lại cho tất cả các biến cần thiết
```

#### **🔧 Cấu hình sau khi Deploy**

##### **1. Cập nhật Facebook Webhook**
1. Truy cập Facebook Developers Console
2. Vào phần Webhooks
3. Cập nhật Webhook URL thành: `https://your-domain.vercel.app/api/webhook`
4. Verify token: `my_verify_token_123`

##### **2. Cấu hình Supabase Cron Jobs (Optional)**
Để sử dụng cron jobs trên Vercel, bạn có thể sử dụng các dịch vụ như:
- **Vercel Cron**: Cấu hình trong vercel.json
- **External Service**: Sử dụng cron-job.org hoặc tương tự

##### **3. Domain tùy chỉnh (Optional)**
1. Trong Vercel Dashboard, vào Settings → Domains
2. Thêm domain tùy chỉnh của bạn
3. Cập nhật DNS records

#### **🧪 Test Deployment**

##### **1. Kiểm tra API Health**
```bash
curl https://your-domain.vercel.app/api/health
```

##### **2. Kiểm tra Webhook**
```bash
curl -X GET "https://your-domain.vercel.app/api/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=my_verify_token_123"
```

##### **3. Test Facebook Messenger**
1. Gửi tin nhắn đến Facebook Page của bạn
2. Kiểm tra logs trong Vercel Dashboard

### 🔄 **ROLLBACK STRATEGY**

#### **Nếu có vấn đề:**

1. **Tắt AI ngay lập tức:**
```bash
OPENAI_ENABLED=false
GOOGLE_AI_ENABLED=false
CLAUDE_ENABLED=false
```

2. **Kiểm tra logs:**
```bash
# Xem logs để tìm nguyên nhân
tail -f logs/ai-error.log
```

3. **Chạy lại Safety Verification:**
```bash
node src/lib/ai-safety-verification.js
```

4. **Khắc phục từng bước:**
- Fix lỗi cụ thể
- Test lại với 1 user
- Dần dần mở rộng

### 🚨 **LƯU Ý QUAN TRỌNG**

#### **🚨 Critical Setup Requirements**

##### **1. Environment Variables (BẮT BUỘC)**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FACEBOOK_ACCESS_TOKEN=your_facebook_token
FACEBOOK_VERIFY_TOKEN=your_verify_token
CRON_SECRET=your-super-secret-key
```

##### **2. Database Setup (BẮT BUỘC)**
```sql
-- Chạy file database-complete.sql trong Supabase
-- Verify tất cả 18 tables được tạo
-- Check indexes và triggers hoạt động
```

##### **3. Cron Jobs Setup (BẮT BUỘC)**
```bash
# Sử dụng cron-job.org hoặc Vercel Cron
URL: https://your-domain.vercel.app/api/cron
Schedule: mỗi giờ (0 * * * *)
Headers:
  - Authorization: Bearer your-secret-key
  - Content-Type: application/json
```

#### **⚠️ Common Issues & Solutions**

##### **1. Webhook Verification**
```bash
# Test webhook
curl -X GET "https://your-domain.vercel.app/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test"
```

##### **2. Database Connection**
```bash
# Test database
curl -X GET "https://your-domain.vercel.app/api/health"
```

##### **3. Facebook API**
```bash
# Test Facebook connection
curl -X POST "https://graph.facebook.com/v18.0/me/messages" \
  -H "Content-Type: application/json" \
  -d '{"recipient":{"id":"USER_ID"},"message":{"text":"Test"}}'
```

### 🔧 **Maintenance & Monitoring**

#### **1. Daily Tasks**
- [ ] Kiểm tra logs trên Vercel
- [ ] Monitor payment approvals
- [ ] Check system health
- [ ] Review user feedback

#### **2. Weekly Tasks**
- [ ] Analyze revenue reports
- [ ] Review user engagement
- [ ] Update content/marketing
- [ ] Optimize performance

#### **3. Monthly Tasks**
- [ ] Review business metrics
- [ ] Plan feature updates
- [ ] Community engagement
- [ ] Revenue optimization

### 📊 **Performance Metrics**

#### **1. User Engagement**
```typescript
🎯 Target Metrics:
• Daily Active Users: 500+
• Message Response Rate: 95%+
• User Retention: 80%+
• Conversion Rate: 20%+
```

#### **2. Business Metrics**
```typescript
💰 Revenue Targets:
• Monthly Revenue: 10M+ VND
• ARPU: 50k+ VND
• Customer LTV: 300k+ VND
• Churn Rate: <5%
```

#### **3. System Performance**
```typescript
⚡ Performance Targets:
• Response Time: <500ms
• Uptime: 99.9%+
• Error Rate: <0.1%
• Cache Hit Rate: 85%+
```

### 🚀 **Deployment Checklist**

#### **Pre-deployment**
- [ ] Environment variables configured
- [ ] Database schema updated
- [ ] Facebook webhook configured
- [ ] Cron jobs setup
- [ ] Health check endpoint working

#### **Post-deployment**
- [ ] Test all user flows
- [ ] Test admin functions
- [ ] Verify payment system
- [ ] Check automated systems
- [ ] Monitor performance

### 🔒 **Security Considerations**

#### **1. Data Protection**
- [ ] User data encrypted
- [ ] Payment info secured
- [ ] Admin access restricted
- [ ] Rate limiting enabled

#### **2. Spam Prevention**
- [ ] Anti-spam system active
- [ ] User verification required
- [ ] Content moderation enabled
- [ ] Blacklist management

### 💡 **Best Practices**

#### **1. User Experience**
- [ ] Natural conversation flow
- [ ] Personalized responses
- [ ] Quick problem resolution
- [ ] Regular engagement

#### **2. Admin Management**
- [ ] Regular dashboard review
- [ ] Prompt payment approval
- [ ] Community moderation
- [ ] Performance monitoring

#### **3. Business Growth**
- [ ] Regular content updates
- [ ] Community engagement
- [ ] Feature optimization
- [ ] Revenue tracking

### 🎯 **SUCCESS METRICS**

#### **🎯 User Satisfaction**
- **Response Time**: < 1 second
- **Problem Resolution**: < 5 minutes
- **User Retention**: 80%+
- **Satisfaction Score**: 4.8/5+

#### **💰 Business Success**
- **Monthly Revenue**: 10M+ VND
- **User Growth**: 100+/month
- **Conversion Rate**: 20%+
- **Customer LTV**: 300k+ VND

#### **⚡ System Performance**
- **Uptime**: 99.9%+
- **Response Time**: <500ms
- **Error Rate**: <0.1%
- **Scalability**: 1000+ users

### 🚀 **NEXT STEPS**

#### **Immediate (Week 1)**
1. **Deploy to production**
2. **Setup monitoring**
3. **Test all features**
4. **User training**

#### **Short-term (Month 1)**
1. **User acquisition campaign**
2. **Content creation**
3. **Community building**
4. **Revenue optimization**

#### **Long-term (Quarter 1)**
1. **Feature expansion**
2. **Mobile app development**
3. **Partnership programs**
4. **Business scaling**

### 📞 **HỖ TRỢ**

Nếu gặp vấn đề:
1. Kiểm tra logs trên Vercel
2. Test API endpoints: `/api/health`, `/api/cron`
3. Kiểm tra environment variables
4. Setup cron jobs theo hướng dẫn

### 🎉 **KẾT LUẬN**

**🎉 CHÚC MỪNG! Bot Tân Dậu - Hỗ Trợ Chéo đã sẵn sàng chinh phục cộng đồng và tạo thu nhập bền vững!**

**🌟 Chúc bạn thành công rực rỡ với dự án tuyệt vời này!**

---

## 📋 **CHI TIẾT LUỒNG HOẠT ĐỘNG BOT**

### **🎯 LUỒNG ĐĂNG KÝ & XÁC THỰC**

#### **Bước 1: Welcome Message**
```
🤖 Chào mừng bạn đến với BOT Tân Dậu - Hỗ Trợ Chéo! 🐓

Tôi là Thích Tân Dậu - trợ lý mua bán thông minh của cộng đồng Tân Dậu - hỗ trợ chéo.

🎯 Tôi giúp bạn:
• Niêm yết sản phẩm/dịch vụ
• Tìm kiếm & kết nối mua bán
• Tham gia cộng đồng Tân Dậu - hỗ trợ chéo
• Nhận lời khuyên tử vi hàng ngày

📱 Để bắt đầu, hãy chọn:

[🔐 ĐĂNG KÝ] [ℹ️ TÌM HIỂU THÊM]
```

#### **Bước 2: Bắt đầu đăng ký**
```
User click "ĐĂNG KÝ"
↓
Bot typing... (3 giây)
↓
Bot gửi:

"📝 ĐĂNG KÝ THÀNH VIÊN

Chào bạn! Tôi sẽ hướng dẫn bạn đăng ký từng bước.

Bước 1/4: Họ tên
👤 Vui lòng nhập họ tên đầy đủ của bạn:

[📝 Nhập họ tên...]"
```

#### **Bước 3: Nhập họ tên**
```
User nhập họ tên: "Đinh Khánh Tùng"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"✅ Họ tên: Đinh Khánh Tùng

Bước 2/4: Số điện thoại
📱 Vui lòng nhập số điện thoại của bạn:

[📝 Nhập SĐT...]"
```

#### **Bước 4: Nhập số điện thoại**
```
User nhập SĐT: "0982581222"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"✅ SĐT: 0982581222

Bước 3/4: Vị trí
📍 Vui lòng chọn tỉnh/thành bạn đang sinh sống:

[🏠 HÀ NỘI] [🏢 TP.HCM] [🏖️ ĐÀ NẴNG] [🌊 HẢI PHÒNG]
[🏔️ CẦN THƠ] [🌾 AN GIANG] [🏞️ KHÁC...]"
```

#### **Bước 5: Chọn vị trí**
```
User chọn "HÀ NỘI"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"✅ Vị trí: Hà Nội

Bước 4/4: Xác nhận tuổi
🎂 Đây là bước quan trọng nhất!

Bot Tân Dậu - Hỗ Trợ Chéo được tạo ra dành riêng cho cộng đồng Tân Dậu - Hỗ Trợ Chéo.

❓ Bạn có phải sinh năm 1981 không?

[✅ CÓ - TÔI SINH NĂM 1981] [❌ KHÔNG - TÔI SINH NĂM KHÁC]"

#### **Bước 6: Xác nhận tuổi**
```
User chọn "CÓ - TÔI SINH NĂM 1981"
↓
Bot typing... (3 giây)
↓
Bot gửi:

"🎉 XÁC NHẬN THÀNH CÔNG!

✅ Chào mừng anh/chị Tân Dậu - Hỗ Trợ Chéo!
👥 Bạn đã gia nhập cộng đồng Tân Dậu - hỗ trợ chéo

📱 Thông tin tài khoản:
• Họ tên: Đinh Khánh Tùng
• SĐT: 0982581222
• Vị trí: Hà Nội
• Sinh nhật: 1981 (42 tuổi)
• Mã giới thiệu: TD1981-{USER_ID}

🎯 Trial 3 ngày miễn phí đã được kích hoạt
⏰ Hết hạn: 18/01/2024

[🏠 VÀO TRANG CHỦ] [💬 HỖ TRỢ]"
```

### **🛒 LUỒNG NIÊM YẾT SẢN PHẨM/DỊCH VỤ**

#### **Bước 1: Chọn loại tin đăng**
```
User click "NIÊM YẾT"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"🛒 NIÊM YẾT SẢN PHẨM/DỊCH VỤ

Chọn loại tin đăng bạn muốn đăng:

[🏠 BẤT ĐỘNG SẢN] [🚗 Ô TÔ] [📱 ĐIỆN TỬ]
[👕 THỜI TRANG] [🍽️ ẨM THỰC] [🔧 DỊCH VỤ]"
```

#### **Bước 2: Chọn category**
```
User chọn "BẤT ĐỘNG SẢN"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"🏠 BẤT ĐỘNG SẢN

Chọn loại BĐS bạn muốn đăng:

[🏠 NHÀ Ở] [🏢 CHUNG CƯ] [🏪 MẶT BẰNG] [🏗️ ĐẤT NỀN]
[🔄 QUAY LẠI]"
```

#### **Bước 3: Nhập thông tin chi tiết**
```
User chọn "NHÀ Ở"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"🏠 NHÀ Ở - Bước 1/5

📝 Tiêu đề sản phẩm
Vui lòng nhập tiêu đề hấp dẫn cho sản phẩm:

VD: Nhà 3PN, Q7, 100m², view sông

[📝 Nhập tiêu đề...]"
```

### **💰 LUỒNG THANH TOÁN**

#### **Bước 1: Thông báo trial sắp hết**
```
Trial còn 48 giờ
↓
Bot typing... (3 giây)
↓
Bot gửi:

"⏰ THÔNG BÁO QUAN TRỌNG

Trial của bạn còn 48 giờ!

💳 Phí duy trì: 1,000đ/ngày
📅 Gói tối thiểu: 7 ngày = 7,000đ

[💰 THANH TOÁN NGAY] [⏰ NHẮC LẠI SAU] [ℹ️ TÌM HIỂU]"
```

#### **Bước 2: Upload biên lai**
```
User click "THANH TOÁN NGAY"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"💰 THANH TOÁN

🏦 THÔNG TIN CHUYỂN KHOẢN:
• STK: 0982581222
• Ngân hàng: Vietcombank
• Chủ TK: BOT TÂN DẬU
• Nội dung: TANDẬU [SĐT_CỦA_BẠN]

📸 Vui lòng gửi ảnh biên lai chuyển khoản rõ nét:

[📷 Chụp ảnh] [📁 Chọn từ thư viện] [❌ HỦY]"
```

### **👥 LUỒNG CỘNG ĐỒNG TÂN DẬU**

#### **Bước 1: Vào cộng đồng**
```
User click "CỘNG ĐỒNG TÂN DẬU"
↓
Bot typing... (2 giây)
↓
Bot gửi:

"👥 CỘNG ĐỒNG TÂN DẬU - HỖ TRỢ CHÉO

[🎂 SINH NHẬT] [🏆 TOP SELLER] [📖 KỶ NIỆM]
[🎪 SỰ KIỆN] [⭐ THÀNH TÍCH] [🔮 TỬ VI]
[🤝 HỖ TRỢ CHÉO] [💬 CHAT NHÓM]"
```

#### **Bước 2: Top Sellers**
```
User click "TOP SELLER"
↓
Bot typing... (3 giây)
↓
Bot gửi:

"🏆 TOP SELLER TUẦN NÀY

🥇 Anh Minh (Hà Nội) - 4.9⭐
   • 15 giao dịch | 2.5M doanh thu
   • Chuyên: Bất động sản

🥈 Chị Lan (TP.HCM) - 4.8⭐
   • 12 giao dịch | 1.8M doanh thu
   • Chuyên: Ô tô

🥉 Anh Tuấn (Đà Nẵng) - 4.7⭐
   • 10 giao dịch | 1.2M doanh thu
   • Chuyên: Điện tử

[👀 XEM CHI TIẾT] [💬 KẾT NỐI] [📊 XEM TẤT CẢ]"
```

### **🔧 LUỒNG ADMIN (Qua Chat)**

#### **Bước 1: Admin login**
```
Admin gửi: "/admin"
↓
Bot typing... (3 giây)
↓
Bot gửi:

"🔧 ADMIN DASHBOARD

Chào admin! 👋

[💰 THANH TOÁN] [👥 USER] [🛒 TIN ĐĂNG] [📊 THỐNG KÊ]"
```

#### **Bước 2: Quản lý thanh toán**
```
Admin click "THANH TOÁN"
↓
Bot typing... (3 giây)
↓
Bot gửi:

"💰 THANH TOÁN CHỜ DUYỆT

1️⃣ Anh Minh - 7,000đ - 15/01/2024 14:30
   [✅ DUYỆT] [❌ TỪ CHỐI] [👀 XEM]

2️⃣ Chị Lan - 7,000đ - 15/01/2024 15:45
   [✅ DUYỆT] [❌ TỪ CHỐI] [👀 XEM]

[📊 XEM TẤT CẢ] [🔄 LÀM MỚI]"
```

### **🔮 LUỒNG TỬ VI**

#### **Bước 1: Xem tử vi**
```
User click "TỬ VI"
↓
Bot typing... (3 giây)
↓
Bot gửi:

"🔮 TỬ VI TÂN DẬU HÔM NAY

📅 Thứ 2, 15/01/2024
🐓 Tuổi: Tân Dậu (1981)
⭐ Tổng quan: 4/5 sao

💰 Tài lộc: Rất tốt - Nên đầu tư BĐS
❤️ Tình cảm: Tốt - Gặp gỡ bạn bè
🏥 Sức khỏe: Bình thường - Nghỉ ngơi

🎯 Lời khuyên: Hôm nay nên ký kết hợp đồng
🎨 Màu may mắn: Vàng, Trắng
🔢 Số may mắn: 1, 6, 8

[🎲 XEM CHI TIẾT] [📅 XEM TUẦN] [🔮 XEM THÁNG]"
```

---

*Tài liệu này được tạo bởi AI Assistant - Cline*
*Cập nhật lần cuối: 10/5/2025*
*Phiên bản: 2.0.0 Enhanced*
