# Hướng Dẫn Tìm Kiếm AI - Bot Tân Dậu 1981

## 🎯 Tổng Quan

Hệ thống tìm kiếm AI đã được nâng cấp với khả năng tìm kiếm thông minh, hỗ trợ đầy đủ 63 tỉnh thành Việt Nam và 17+ danh mục dịch vụ đa dạng.

## 🗺️ Địa Lý - 63 Tỉnh Thành

### Cấu Trúc Dữ Liệu
```typescript
{
  code: 'HN',           // Mã tỉnh thành
  name: 'HÀ NỘI',       // Tên đầy đủ
  type: 'municipality', // Loại: municipality/province
  region: 'north'       // Vùng: north/central/south
}
```

### 5 Thành Phố Trực Thuộc Trung Ương
- **HÀ NỘI** (HN) - Miền Bắc
- **TP.HỒ CHÍ MINH** (HCM) - Miền Nam  
- **ĐÀ NẴNG** (DN) - Miền Trung
- **HẢI PHÒNG** (HP) - Miền Bắc
- **CẦN THƠ** (CT) - Miền Nam

### Phân Chia Theo Vùng
- **Miền Bắc**: 25 tỉnh thành
- **Miền Trung**: 11 tỉnh thành  
- **Miền Nam**: 27 tỉnh thành

## 🛍️ Danh Mục Sản Phẩm & Dịch Vụ

### 6 Danh Mục Chính
1. **🏠 BẤT ĐỘNG SẢN** - 4 subcategories
2. **🚗 Ô TÔ** - 4 subcategories
3. **📱 ĐIỆN TỬ** - 4 subcategories
4. **👕 THỜI TRANG** - 4 subcategories
5. **🍽️ ẨM THỰC** - 4 subcategories
6. **🔧 DỊCH VỤ** - 17 subcategories

### Dịch Vụ Đa Dạng (17 Loại)
- 📚 **GIÁO DỤC**: Gia sư, dạy kèm, luyện thi, ngoại ngữ
- 💪 **SỨC KHỎE**: Massage, yoga, gym, spa, làm đẹp
- 🚚 **VẬN CHUYỂN**: Giao hàng, chuyển nhà, taxi, grab
- 🔧 **SỬA CHỮA**: Điện tử, xe máy, điện lạnh, nội thất
- 💻 **CÔNG NGHỆ**: Lập trình, website, app, marketing
- 💰 **TÀI CHÍNH**: Kế toán, thuế, bảo hiểm, đầu tư
- ⚖️ **PHÁP LÝ**: Luật sư, tư vấn pháp luật, giấy tờ
- 🏠 **BẤT ĐỘNG SẢN**: Môi giới, cho thuê, bán nhà
- ✈️ **DU LỊCH**: Tour, khách sạn, vé máy bay
- 🍽️ **ẨM THỰC**: Nấu ăn, catering, tiệc
- 👗 **THỜI TRANG**: May đo, thiết kế, thời trang
- 🎭 **GIẢI TRÍ**: Sự kiện, tổ chức, ca nhạc
- 🌾 **NÔNG NGHIỆP**: Chăn nuôi, trồng trọt, thủy sản
- 🏗️ **XÂY DỰNG**: Xây dựng, sửa chữa nhà, kiến trúc
- 🧹 **VỆ SINH**: Dọn dẹp, giặt ủi, vệ sinh
- 🛡️ **BẢO VỆ**: An ninh, bảo vệ, giám sát
- 🔧 **KHÁC**: Dịch vụ tùy chỉnh

## 🤖 Tính Năng Tìm Kiếm AI

### 1. Tìm Kiếm Theo Từ Khóa
```typescript
// Tìm danh mục theo từ khóa
const category = SEARCH_HELPERS.findCategoryByKeyword('nhà')
// Kết quả: 'BẤT ĐỘNG SẢN'

// Tìm subcategory theo từ khóa  
const subcategory = SEARCH_HELPERS.findSubcategoryByKeyword('honda city')
// Kết quả: { category: 'Ô TÔ', subcategory: 'SEDAN' }
```

### 2. Tìm Kiếm Địa Lý
```typescript
// Tìm tỉnh thành theo từ khóa
const location = SEARCH_HELPERS.findLocationByKeyword('hà nội')
// Kết quả: { code: 'HN', name: 'HÀ NỘI', type: 'municipality', region: 'north' }

// Lấy danh sách theo vùng
const northLocations = SEARCH_HELPERS.getLocationsByRegion('north')
// Kết quả: 25 tỉnh thành miền Bắc
```

### 3. Gợi Ý Tìm Kiếm
```typescript
// Tạo gợi ý tìm kiếm
const suggestions = SEARCH_HELPERS.generateSearchSuggestions('nhà')
// Kết quả: ['BẤT ĐỘNG SẢN', 'HÀ NỘI', 'HẢI PHÒNG', ...]
```

### 4. Tính Điểm Liên Quan
```typescript
// Tính điểm liên quan cho kết quả tìm kiếm
const item = { title: 'Nhà 3 tầng', description: 'Nhà đẹp', category: 'BẤT ĐỘNG SẢN' }
const score = SEARCH_HELPERS.calculateRelevanceScore(item, 'nhà')
// Kết quả: 13 (title: 10 + description: 5 + category: 3)
```

## 🔍 Cách Sử Dụng Trong Code

### Import
```typescript
import { SEARCH_HELPERS, CATEGORIES, LOCATIONS } from './constants'
```

### Tìm Kiếm Nâng Cao
```typescript
function advancedSearch(query: string, items: any[]): any[] {
    // Tính điểm liên quan
    const scoredItems = items.map(item => ({
        ...item,
        relevanceScore: SEARCH_HELPERS.calculateRelevanceScore(item, query)
    }))
    
    // Sắp xếp theo điểm cao nhất
    return scoredItems
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .filter(item => item.relevanceScore > 0)
}
```

### Tìm Kiếm Thông Minh
```typescript
function smartSearch(query: string) {
    // 1. Tìm danh mục phù hợp
    const category = SEARCH_HELPERS.findCategoryByKeyword(query)
    
    // 2. Tìm subcategory phù hợp
    const subcategory = SEARCH_HELPERS.findSubcategoryByKeyword(query)
    
    // 3. Tìm địa điểm phù hợp
    const location = SEARCH_HELPERS.findLocationByKeyword(query)
    
    // 4. Tạo gợi ý
    const suggestions = SEARCH_HELPERS.generateSearchSuggestions(query)
    
    return { category, subcategory, location, suggestions }
}
```

## 📊 Thống Kê Dữ Liệu

### Tổng Quan
- **63 tỉnh thành** Việt Nam
- **6 danh mục chính** sản phẩm
- **17 loại dịch vụ** đa dạng
- **1000+ từ khóa** tìm kiếm
- **3 vùng địa lý** (Bắc/Trung/Nam)

### Phân Bố Dịch Vụ
- **Giáo dục**: 15+ từ khóa
- **Sức khỏe**: 12+ từ khóa  
- **Công nghệ**: 10+ từ khóa
- **Tài chính**: 8+ từ khóa
- **Và nhiều hơn nữa...**

## 🚀 Lợi Ích

### Cho Người Dùng
- ✅ Tìm kiếm chính xác hơn
- ✅ Gợi ý thông minh
- ✅ Hỗ trợ đa ngôn ngữ (Việt/Anh)
- ✅ Tìm kiếm theo vùng miền
- ✅ Phân loại tự động

### Cho Developer
- ✅ API dễ sử dụng
- ✅ TypeScript support
- ✅ Performance cao
- ✅ Dễ mở rộng
- ✅ Tài liệu chi tiết

## 🔧 Demo & Test

Chạy file demo để xem các tính năng:
```bash
npx ts-node src/lib/search-demo.ts
```

## 📝 Ghi Chú

- Tất cả từ khóa đều được normalize (lowercase, trim)
- Hỗ trợ tìm kiếm partial match
- Có thể mở rộng thêm từ khóa mới
- Tương thích với tất cả trình duyệt hiện đại
