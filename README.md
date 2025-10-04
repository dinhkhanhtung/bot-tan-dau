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
