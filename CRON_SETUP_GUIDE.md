# 🚀 HƯỚNG DẪN SETUP CRON JOBS - BOT Tân Dậu - Hỗ Trợ Chéo

## 📋 TỔNG QUAN CÁC CẢI TIẾN ĐÃ HOÀN THÀNH

### ✅ **Phase 1: Critical (Đã hoàn thành)**
1. **Admin Payment Approval UX** - Giao diện duyệt thanh toán trực quan
2. **User Payment Tracking** - Theo dõi trạng thái thanh toán chi tiết
3. **Cron Jobs System** - Hệ thống tự động hoàn chỉnh

### ✅ **Phase 2: Important (Đã hoàn thành)**
4. **Search Results Visual** - Kết quả tìm kiếm dạng carousel
5. **Registration Progress** - Thanh tiến trình đăng ký
6. **Listing Preview** - Xem trước tin đăng

---

## 🔧 CÁCH SETUP CRON JOBS

### **Option 1: Sử dụng cron-job.org (Khuyến nghị)**

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

### **Option 2: Sử dụng Vercel Cron Jobs**

1. **Vào Vercel Dashboard**
2. **Chọn project** → **Settings** → **Functions**
3. **Thêm cron job**:
   ```json
   {
     "schedule": "0 * * * *",
     "path": "/api/cron"
   }
   ```

### **Option 3: Sử dụng Local Cron (Development)**

```bash
# Linux/Mac
crontab -e
# Thêm dòng:
# 0 * * * * curl -H "Authorization: Bearer your-secret-key" https://your-domain.vercel.app/api/cron

# Windows Task Scheduler
# Tạo task chạy mỗi giờ với command:
# curl -H "Authorization: Bearer your-secret-key" https://your-domain.vercel.app/api/cron
```

---

## 📅 LỊCH CHẠY CRON JOBS

| Cron Job | Thời gian | Mục đích |
|----------|-----------|----------|
| `sendTrialReminders()` | Mỗi giờ | Gửi nhắc nhở hết hạn trial (48h, 24h) |
| `sendBirthdayNotifications()` | 8:00 AM hàng ngày | Thông báo sinh nhật cộng đồng |
| `sendHoroscopeUpdates()` | 7:00 AM hàng ngày | Tử vi Tân Dậu hàng ngày |
| `sendPaymentFollowUps()` | Mỗi giờ | Nhắc nhở thanh toán quá hạn |
| `cleanupOldData()` | Hàng ngày | Dọn dẹp dữ liệu cũ |

---

## 🔐 BẢO MẬT CRON JOBS

### **1. Tạo Secret Key mạnh**
```bash
# Tạo random secret
openssl rand -hex 32
# Hoặc dùng online generator
```

### **2. Cấu hình Environment Variables**
```bash
# .env.local
CRON_SECRET=your-super-secret-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### **3. Kiểm tra Authorization**
```bash
# Test cron job
curl -H "Authorization: Bearer your-secret-key" \
     https://your-domain.vercel.app/api/cron
```

---

## 🚨 THEO DÕI VÀ MONITORING

### **1. Logs trên Vercel**
- Vào **Vercel Dashboard** → **Functions** → **Logs**
- Theo dõi lỗi và performance

### **2. Health Check**
```bash
# Kiểm tra API hoạt động
curl https://your-domain.vercel.app/api/cron \
  -H "Authorization: Bearer your-secret-key"
```

### **3. Monitoring với UptimeRobot**
- Setup: https://uptimerobot.com/
- Monitor URL: `https://your-domain.vercel.app/api/cron`
- Interval: 5 phút

---

## 🛠️ TROUBLESHOOTING

### **Cron job không chạy**
1. ✅ Kiểm tra `CRON_SECRET` đúng
2. ✅ Kiểm tra URL accessible
3. ✅ Kiểm tra logs trên Vercel
4. ✅ Test manual với curl

### **Lỗi Database Connection**
1. ✅ Kiểm tra `DATABASE_URL`
2. ✅ Kiểm tra Supabase credentials
3. ✅ Kiểm tra network connectivity

### **Lỗi Facebook API**
1. ✅ Kiểm tra `FACEBOOK_ACCESS_TOKEN`
2. ✅ Kiểm tra rate limits
3. ✅ Kiểm tra message format

---

## 📊 KIỂM TRA CÁC TÍNH NĂNG MỚI

### **1. Test Admin Payment Approval**
```bash
# Tạo thanh toán test
curl -X POST https://your-domain.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "payment_approval"}'
```

### **2. Test User Payment Tracking**
- Đăng ký user mới
- Tạo thanh toán
- Kiểm tra trạng thái

### **3. Test Cron Jobs**
```bash
# Chạy manual
curl -X POST https://your-domain.vercel.app/api/cron \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"job": "trial_reminders"}'
```

---

## 🎯 CÁC TÍNH NĂNG MỚI SẴN SÀNG

### **Admin Dashboard**
- ✅ Payment approval với thông tin chi tiết
- ✅ Bulk approve payments
- ✅ View receipt images
- ✅ User details với lịch sử

### **User Experience**
- ✅ Payment status tracking real-time
- ✅ Registration với progress bar
- ✅ Visual search results (carousel)
- ✅ Listing preview trước khi đăng

### **Automated Systems**
- ✅ Trial expiry reminders (48h, 24h)
- ✅ Birthday notifications
- ✅ Daily horoscope updates
- ✅ Payment follow-ups
- ✅ Data cleanup

---

## 🚀 BƯỚC TIẾP THEO

1. **Setup cron jobs** theo hướng dẫn trên
2. **Test tất cả tính năng** với user thật
3. **Monitor performance** và lỗi
4. **Tối ưu hóa** dựa trên feedback thực tế

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra logs trên Vercel
2. Test API endpoints với curl
3. Kiểm tra environment variables
4. Liên hệ developer để hỗ trợ

---

**🎉 Chúc mừng! Bot Tân Dậu - Hỗ Trợ Chéo đã được cải thiện toàn diện và sẵn sàng phục vụ cộng đồng!**
