# 🐓 BOT TÂN DẬU 1981

Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981 (tuổi Tân Dậu).

## 🎯 Tính năng chính

- **Marketplace**: Mua bán sản phẩm và dịch vụ trong cộng đồng Tân Dậu
- **Chat Kết Nối**: Trò chuyện trực tiếp với người bán/mua
- **Cộng Đồng**: Kết nối với những người cùng tuổi Tân Dậu
- **Xác Minh Tuổi**: Chỉ dành cho thành viên sinh năm 1981
- **Trial 3 ngày**: Miễn phí 3 ngày đầu, sau đó 1,000đ/ngày
- **Gamification**: Hệ thống điểm thưởng và achievement
- **Tử Vi**: Dự báo hàng ngày cho tuổi Tân Dậu
- **Storytelling**: Chia sẻ ký ức và câu chuyện cộng đồng

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Facebook Login API
- **Deployment**: Vercel
- **Database**: PostgreSQL với Row Level Security

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/your-username/bot-tan-dau-1981.git
cd bot-tan-dau-1981
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình environment variables

Tạo file `.env.local`:

```env
# Facebook API
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_VERIFY_TOKEN=your_verify_token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin
SUPER_ADMIN_ID=your_facebook_id
ADMIN_IDS=your_facebook_id

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
SESSION_SECRET=your_session_secret
```

### 4. Thiết lập database

Chạy file `database-schema.sql` trong Supabase SQL Editor để tạo các bảng và functions.

### 5. Chạy development server

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## 📁 Cấu trúc project

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   ├── (main)/            # Main app pages
│   └── (admin)/           # Admin pages
├── components/            # React components
│   ├── ui/               # UI components
│   ├── auth/             # Auth components
│   ├── marketplace/      # Marketplace components
│   ├── chat/             # Chat components
│   └── community/        # Community components
├── lib/                  # Utilities và configs
└── types/                # TypeScript types
```

## 🗄️ Database Schema

### Core Tables
- `users` - Thông tin người dùng
- `listings` - Tin đăng sản phẩm/dịch vụ
- `conversations` - Cuộc trò chuyện
- `messages` - Tin nhắn
- `payments` - Thanh toán

### Community Tables
- `ratings` - Đánh giá người dùng
- `events` - Sự kiện cộng đồng
- `notifications` - Thông báo
- `user_achievements` - Thành tích

### Premium Tables
- `ads` - Quảng cáo trả phí
- `search_requests` - Yêu cầu tìm kiếm hộ
- `referrals` - Giới thiệu thành viên

### Analytics Tables
- `user_analytics` - Phân tích người dùng
- `platform_analytics` - Phân tích platform

## 🔐 Authentication

Sử dụng Facebook Login API với xác minh tuổi:
- Chỉ chấp nhận người dùng sinh năm 1981
- Tự động tạo trial 3 ngày
- Tích hợp với Supabase Auth

## 💰 Business Model

- **Trial**: 3 ngày miễn phí
- **Membership**: 1,000đ/ngày (tối thiểu 7 ngày)
- **Ads**: Quảng cáo trả phí
- **Search Service**: Dịch vụ tìm kiếm hộ 5,000đ/lần
- **Referrals**: Thưởng 10,000đ/người giới thiệu

## 🎮 Gamification

- **Point System**: Kiếm điểm từ các hoạt động
- **Achievements**: Badge và thành tích
- **Leaderboards**: Bảng xếp hạng
- **Rewards**: Đổi điểm lấy phần thưởng

## 📱 Mobile-First Design

- Responsive design cho mọi thiết bị
- PWA support
- Touch-friendly interface
- Offline support

## 🚀 Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Manual Deployment

```bash
npm run build
npm start
```

## 📊 Monitoring

- Real-time analytics
- Error tracking
- Performance monitoring
- User behavior tracking

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 📞 Support

- Email: support@bot-tan-dau-1981.com
- Phone: 1900-1981
- Facebook: [BOT TÂN DẬU 1981](https://facebook.com/bot-tan-dau-1981)

## 🎉 Roadmap

### Phase 1 (Completed)
- [x] Project setup
- [x] Facebook authentication
- [x] Age verification
- [x] Basic marketplace
- [x] Database schema

### Phase 2 (In Progress)
- [ ] Chat system
- [ ] Rating system
- [ ] Payment system
- [ ] Admin dashboard

### Phase 3 (Planned)
- [ ] Gamification
- [ ] Astrology features
- [ ] Storytelling system
- [ ] Mobile app

---

**Made with ❤️ for Tân Dậu 1981 community**
