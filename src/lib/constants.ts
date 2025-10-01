// Bot Configuration
export const BOT_CONFIG = {
    DAILY_FEE: 1000,
    MINIMUM_DAYS: 7,
    TRIAL_DAYS: 3,
    REFERRAL_REWARD: 10000,
    SEARCH_SERVICE_FEE: 5000,
} as const

// Categories and Subcategories
export const CATEGORIES = {
    'BẤT ĐỘNG SẢN': {
        'NHÀ Ở': ['Nhà riêng', 'Nhà phố', 'Biệt thự', 'Nhà cấp 4'],
        'CHUNG CƯ': ['Căn hộ', 'Penthouse', 'Duplex'],
        'MẶT BẰNG': ['Mặt bằng kinh doanh', 'Văn phòng', 'Kho bãi'],
        'ĐẤT NỀN': ['Đất thổ cư', 'Đất nông nghiệp', 'Đất dự án']
    },
    'Ô TÔ': {
        'SEDAN': ['Honda City', 'Toyota Vios', 'Hyundai Accent', 'Kia Cerato'],
        'SUV': ['Honda CR-V', 'Toyota Fortuner', 'Mazda CX-5', 'Hyundai Tucson'],
        'HATCHBACK': ['Honda Jazz', 'Toyota Yaris', 'Ford Fiesta', 'Hyundai i10'],
        'PICKUP': ['Ford Ranger', 'Toyota Hilux', 'Isuzu D-Max', 'Mitsubishi Triton']
    },
    'ĐIỆN TỬ': {
        'ĐIỆN THOẠI': ['iPhone', 'Samsung Galaxy', 'Xiaomi', 'Oppo', 'Vivo'],
        'LAPTOP': ['MacBook', 'Dell', 'HP', 'Asus', 'Lenovo'],
        'TABLET': ['iPad', 'Samsung Tab', 'Huawei', 'Xiaomi'],
        'PHỤ KIỆN': ['Tai nghe', 'Sạc', 'Ốp lưng', 'Cáp']
    },
    'THỜI TRANG': {
        'QUẦN ÁO NAM': ['Áo sơ mi', 'Quần âu', 'Áo thun', 'Quần jean'],
        'QUẦN ÁO NỮ': ['Váy', 'Đầm', 'Áo blouse', 'Quần short'],
        'GIÀY DÉP': ['Giày thể thao', 'Giày tây', 'Dép', 'Sandal'],
        'PHỤ KIỆN': ['Túi xách', 'Ví', 'Đồng hồ', 'Trang sức']
    },
    'ẨM THỰC': {
        'MÓN ĂN': ['Cơm', 'Phở', 'Bún', 'Chả cá'],
        'ĐỒ UỐNG': ['Cà phê', 'Trà sữa', 'Nước ép', 'Sinh tố'],
        'BÁNH KẸO': ['Bánh ngọt', 'Kẹo', 'Bánh mì', 'Bánh tráng'],
        'NGUYÊN LIỆU': ['Gạo', 'Thịt', 'Rau củ', 'Gia vị']
    },
    'DỊCH VỤ': {
        'GIÁO DỤC': ['Gia sư', 'Dạy kèm', 'Luyện thi', 'Ngoại ngữ'],
        'SỨC KHỎE': ['Massage', 'Yoga', 'Gym', 'Spa'],
        'VẬN CHUYỂN': ['Giao hàng', 'Chuyển nhà', 'Taxi', 'Xe máy'],
        'SỬA CHỮA': ['Điện tử', 'Xe máy', 'Điện lạnh', 'Nội thất']
    }
} as const

// Locations
export const LOCATIONS = [
    'HÀ NỘI', 'TP.HCM', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ',
    'AN GIANG', 'BẠC LIÊU', 'BẮC GIANG', 'BẮC KẠN', 'BẮC NINH',
    'BẾN TRE', 'BÌNH DƯƠNG', 'BÌNH PHƯỚC', 'BÌNH THUẬN',
    'CÀ MAU', 'CAO BẰNG', 'ĐẮK LẮK', 'ĐẮK NÔNG', 'ĐIỆN BIÊN',
    'ĐỒNG NAI', 'ĐỒNG THÁP', 'GIA LAI', 'HÀ GIANG', 'HÀ NAM',
    'HÀ TĨNH', 'HẢI DƯƠNG', 'HẬU GIANG', 'HÒA BÌNH', 'HƯNG YÊN',
    'KHÁNH HÒA', 'KIÊN GIANG', 'KONTUM', 'LAI CHÂU', 'LÂM ĐỒNG',
    'LẠNG SƠN', 'LÀO CAI', 'LONG AN', 'NAM ĐỊNH', 'NGHỆ AN',
    'NINH BÌNH', 'NINH THUẬN', 'PHÚ THỌ', 'PHÚ YÊN', 'QUẢNG BÌNH',
    'QUẢNG NAM', 'QUẢNG NGÃI', 'QUẢNG NINH', 'QUẢNG TRỊ', 'SÓC TRĂNG',
    'SƠN LA', 'TAY NINH', 'THÁI BÌNH', 'THÁI NGUYÊN', 'THANH HÓA',
    'THỪA THIÊN HUẾ', 'TIỀN GIANG', 'TRÀ VINH', 'TUYÊN QUANG',
    'VĨNH LONG', 'VĨNH PHÚC', 'YÊN BÁI'
] as const

// Districts for major cities
export const DISTRICTS = {
    'HÀ NỘI': [
        'QUẬN BA ĐÌNH', 'QUẬN HOÀN KIẾM', 'QUẬN TÂY HỒ', 'QUẬN LONG BIÊN',
        'QUẬN CẦU GIẤY', 'QUẬN ĐỐNG ĐA', 'QUẬN HAI BÀ TRƯNG', 'QUẬN HOÀNG MAI',
        'QUẬN THANH XUÂN', 'QUẬN HÀ ĐÔNG', 'QUẬN NAM TỪ LIÊM', 'QUẬN BẮC TỪ LIÊM'
    ],
    'TP.HCM': [
        'QUẬN 1', 'QUẬN 2', 'QUẬN 3', 'QUẬN 4', 'QUẬN 5', 'QUẬN 6',
        'QUẬN 7', 'QUẬN 8', 'QUẬN 9', 'QUẬN 10', 'QUẬN 11', 'QUẬN 12',
        'QUẬN THỦ ĐỨC', 'QUẬN BÌNH THẠNH', 'QUẬN GÒ VẤP', 'QUẬN TÂN BÌNH',
        'QUẬN TÂN PHÚ', 'QUẬN PHÚ NHUẬN', 'QUẬN BÌNH TÂN', 'QUẬN HỐC MÔN',
        'QUẬN CỦ CHI', 'QUẬN BÌNH CHÁNH', 'QUẬN NHÀ BÈ', 'QUẬN CẦN GIỜ'
    ],
    'ĐÀ NẴNG': [
        'QUẬN HẢI CHÂU', 'QUẬN THANH KHÊ', 'QUẬN SƠN TRÀ', 'QUẬN NGŨ HÀNH SƠN',
        'QUẬN LIÊN CHIỂU', 'QUẬN CẨM LỆ', 'QUẬN HÒA VANG', 'QUẬN HOÀNG SA'
    ]
} as const

// Price ranges
export const PRICE_RANGES = [
    { label: 'Dưới 100 triệu', min: 0, max: 100000000 },
    { label: '100-500 triệu', min: 100000000, max: 500000000 },
    { label: '500 triệu - 1 tỷ', min: 500000000, max: 1000000000 },
    { label: '1-3 tỷ', min: 1000000000, max: 3000000000 },
    { label: '3-5 tỷ', min: 3000000000, max: 5000000000 },
    { label: 'Trên 5 tỷ', min: 5000000000, max: Infinity }
] as const

// Ad packages
export const AD_PACKAGES = {
    'HOMEPAGE_BANNER': {
        name: 'Homepage Banner',
        price: 50000,
        description: 'Hiển thị trên trang chủ, vị trí top, dễ nhìn'
    },
    'SEARCH_BOOST': {
        name: 'Search Boost',
        price: 30000,
        description: 'Tăng 3x khả năng hiển thị, ưu tiên trong kết quả tìm kiếm'
    },
    'CROSS_SELL_SPOT': {
        name: 'Cross-sell Spot',
        price: 20000,
        description: 'Ưu tiên trong gợi ý, hiển thị trong cross-selling'
    },
    'FEATURED_LISTING': {
        name: 'Featured Listing',
        price: 15000,
        description: 'Làm nổi bật tin đăng, badge "Nổi bật"'
    }
} as const

// Horoscope data for Tân Dậu 1981
export const HOROSCOPE_DATA = {
    general: {
        element: 'Kim',
        direction: 'Tây',
        color: 'Vàng, Trắng',
        luckyNumbers: [1, 6, 8],
        personality: 'Thông minh, nhanh nhẹn, có tài lãnh đạo'
    },
    daily: {
        fortune: ['Rất tốt', 'Tốt', 'Bình thường', 'Kém', 'Rất kém'],
        love: ['Rất tốt', 'Tốt', 'Bình thường', 'Kém', 'Rất kém'],
        health: ['Rất tốt', 'Tốt', 'Bình thường', 'Kém', 'Rất kém'],
        career: ['Rất tốt', 'Tốt', 'Bình thường', 'Kém', 'Rất kém']
    }
} as const

// Points system
export const POINTS_SYSTEM = {
    LOGIN: 2,
    CREATE_LISTING: 10,
    RECEIVE_RATING: 5,
    SHARE_MEMORY: 3,
    REFERRAL: 100,
    BIRTHDAY: 20,
    EVENT_PARTICIPATION: 15
} as const

// User levels
export const USER_LEVELS = {
    BRONZE: { min: 0, max: 200, name: 'Đồng' },
    SILVER: { min: 200, max: 500, name: 'Bạc' },
    GOLD: { min: 500, max: 1000, name: 'Vàng' },
    PLATINUM: { min: 1000, max: Infinity, name: 'Bạch kim' }
} as const
