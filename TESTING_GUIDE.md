# Hướng Dẫn Testing - Bot Tân Dậu 1981

## 🧪 Testing Trước Khi Deploy

### 1. Kiểm Tra TypeScript
```bash
npm run type-check
```
- Kiểm tra lỗi TypeScript
- Đảm bảo tất cả types đúng

### 2. Kiểm Tra Linter
```bash
npm run lint
```
- Kiểm tra lỗi ESLint
- Đảm bảo code style đúng

### 3. Test Logic Tìm Kiếm
```bash
npm run test-search
```
- Test các hàm tìm kiếm
- Kiểm tra category detection
- Kiểm tra location detection
- Kiểm tra relevance scoring

### 4. Test Toàn Bộ
```bash
npm run test
```
- Chạy tất cả tests
- Type-check + Lint + Search test

## 🔍 Tính Năng Tìm Kiếm Mới

### Tìm Kiếm Thông Minh
- **"nhà ở hà nội"** → Tìm nhà tại Hà Nội
- **"xe honda city"** → Tìm xe Honda City
- **"gia sư toán"** → Tìm gia sư dạy toán
- **"massage spa"** → Tìm dịch vụ massage

### Gợi Ý Tìm Kiếm
- Khi không tìm thấy kết quả
- Hiển thị gợi ý phù hợp
- Có thể click để tìm kiếm

### Phân Loại Tự Động
- Tự động nhận diện danh mục
- Tự động nhận diện địa điểm
- Tìm kiếm chính xác hơn

## 🚀 Deploy Process

### 1. Test Local
```bash
npm run test
npm run build
```

### 2. Deploy Vercel
```bash
# Push to GitHub
git add .
git commit -m "feat: enhance search functionality"
git push origin main

# Vercel sẽ tự động deploy
```

### 3. Test Production
- Test bot trên Facebook Messenger
- Kiểm tra tìm kiếm hoạt động
- Kiểm tra gợi ý hiển thị

## 📊 Monitoring

### Logs Quan Trọng
- Search queries
- Category detection
- Location detection
- Error rates

### Metrics Cần Theo Dõi
- Search success rate
- User engagement
- Popular search terms
- Error frequency

## 🔧 Troubleshooting

### Lỗi Thường Gặp
1. **TypeScript errors** → Chạy `npm run type-check`
2. **Linter errors** → Chạy `npm run lint`
3. **Search not working** → Kiểm tra constants.ts
4. **Database errors** → Kiểm tra Supabase connection

### Debug Steps
1. Check console logs
2. Test individual functions
3. Verify database queries
4. Check Facebook API responses

## 🎯 Chuẩn Bị Cho AI

### Cấu Trúc Sẵn Sàng
- Keywords database
- Search helpers
- Relevance scoring
- Query parsing

### Khi Có AI
- Thay thế `parseSearchQuery` bằng AI
- Cải thiện `calculateRelevanceScore`
- Thêm natural language processing
- Tích hợp machine learning

## 📝 Notes

- Tất cả tests phải pass trước khi deploy
- Backup database trước khi deploy
- Monitor logs sau khi deploy
- Chuẩn bị rollback plan nếu cần
