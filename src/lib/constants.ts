// App Configuration
export const APP_CONFIG = {
    name: 'BOT TÂN DẬU 1981',
    version: '1.0.0',
    description: 'Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981',
    url: 'https://bot-tan-dau-1981.vercel.app',
    supportEmail: 'support@bot-tan-dau-1981.com',
    phone: '1900-1981',
} as const

// Business Configuration
export const BUSINESS_CONFIG = {
    trialDays: 3,
    dailyFee: 1000, // VND
    minPaymentDays: 7,
    gracePeriodHours: 24,
    maxConnectionsPerDay: 20,
    maxListingsPerDay: 5,
    maxMessagesPerMinute: 5,
} as const

// Target Year for Age Verification
export const TARGET_YEAR = 1981
export const TARGET_ZODIAC = 'Tân Dậu'

// Vietnamese Provinces/Cities
export const VIETNAM_LOCATIONS = [
    'Hà Nội',
    'TP. Hồ Chí Minh',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    'An Giang',
    'Bà Rịa - Vũng Tàu',
    'Bắc Giang',
    'Bắc Kạn',
    'Bạc Liêu',
    'Bắc Ninh',
    'Bến Tre',
    'Bình Định',
    'Bình Dương',
    'Bình Phước',
    'Bình Thuận',
    'Cà Mau',
    'Cao Bằng',
    'Đắk Lắk',
    'Đắk Nông',
    'Điện Biên',
    'Đồng Nai',
    'Đồng Tháp',
    'Gia Lai',
    'Hà Giang',
    'Hà Nam',
    'Hà Tĩnh',
    'Hải Dương',
    'Hậu Giang',
    'Hòa Bình',
    'Hưng Yên',
    'Khánh Hòa',
    'Kiên Giang',
    'Kon Tum',
    'Lai Châu',
    'Lâm Đồng',
    'Lạng Sơn',
    'Lào Cai',
    'Long An',
    'Nam Định',
    'Nghệ An',
    'Ninh Bình',
    'Ninh Thuận',
    'Phú Thọ',
    'Phú Yên',
    'Quảng Bình',
    'Quảng Nam',
    'Quảng Ngãi',
    'Quảng Ninh',
    'Quảng Trị',
    'Sóc Trăng',
    'Sơn La',
    'Tây Ninh',
    'Thái Bình',
    'Thái Nguyên',
    'Thanh Hóa',
    'Thừa Thiên Huế',
    'Tiền Giang',
    'Trà Vinh',
    'Tuyên Quang',
    'Vĩnh Long',
    'Vĩnh Phúc',
    'Yên Bái',
] as const

// Product Categories
export const PRODUCT_CATEGORIES = [
    'Bất động sản',
    'Ô tô - Xe máy',
    'Điện tử - Công nghệ',
    'Thời trang - Làm đẹp',
    'Ẩm thực - Đồ uống',
    'Nội thất - Gia dụng',
    'Thể thao - Du lịch',
    'Sách - Văn phòng phẩm',
    'Đồ chơi - Trẻ em',
    'Khác',
] as const

// Service Categories
export const SERVICE_CATEGORIES = [
    'Tư vấn pháp luật',
    'Xây dựng - Sửa chữa',
    'Y tế - Sức khỏe',
    'Kế toán - Thuế',
    'Giáo dục - Đào tạo',
    'Du lịch - Dịch vụ',
    'Công nghệ thông tin',
    'Tài chính - Ngân hàng',
    'Bất động sản',
    'Khác',
] as const

// User Status
export const USER_STATUS = {
    TRIAL: 'trial',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    BANNED: 'banned',
} as const

// Listing Status
export const LISTING_STATUS = {
    ACTIVE: 'active',
    SOLD: 'sold',
    EXPIRED: 'expired',
    HIDDEN: 'hidden',
} as const

// Payment Status
export const PAYMENT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const

// Achievement Types
export const ACHIEVEMENTS = {
    NEW_MEMBER: 'New Member',
    FIRST_SALE: 'First Sale',
    TOP_SELLER: 'Top Seller',
    ACTIVE_USER: 'Active User',
    COMMUNITY_BUILDER: 'Community Builder',
    POWER_SELLER: 'Power Seller',
    TRUSTED_MEMBER: 'Trusted Member',
} as const

// Point System
export const POINT_SYSTEM = {
    LISTING_CREATED: 10,
    LISTING_SOLD: 50,
    REVIEW_GIVEN: 5,
    REVIEW_RECEIVED: 3,
    DAILY_LOGIN: 2,
    REFERRAL_COMPLETED: 100,
    EVENT_PARTICIPATION: 20,
    BIRTHDAY_GREETING: 1,
    CHALLENGE_COMPLETED: 30,
} as const

// Rewards
export const REWARDS = {
    DISCOUNT_VOUCHERS: [
        { points: 100, discount: '10% phí niêm yết' },
        { points: 200, discount: '1 ngày miễn phí' },
        { points: 500, discount: 'Featured listing 1 tuần' },
    ],
    SPECIAL_BADGES: [
        { points: 1000, badge: 'Tân Dậu Siêu Sao 🐓' },
        { points: 2000, badge: 'Thành Viên Vàng ✨' },
        { points: 5000, badge: 'Huyền Thoại Tân Dậu 🌟' },
    ],
} as const

// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
        FACEBOOK: '/api/auth/facebook',
        LOGOUT: '/api/auth/logout',
    },
    USERS: '/api/users',
    LISTINGS: '/api/listings',
    CHAT: '/api/chat',
    PAYMENTS: '/api/payments',
    ADS: '/api/ads',
    SEARCH_REQUESTS: '/api/search-requests',
    REFERRALS: '/api/referrals',
    ANALYTICS: '/api/analytics',
    COMMUNITY: {
        BIRTHDAYS: '/api/community/birthdays',
        EVENTS: '/api/community/events',
        RATINGS: '/api/community/ratings',
    },
} as const

// Cache Configuration
export const CACHE_CONFIG = {
    USER_DATA: 24 * 60 * 60 * 1000, // 24 hours
    LISTINGS: 60 * 60 * 1000, // 1 hour
    CONVERSATIONS: 30 * 60 * 1000, // 30 minutes
    SEARCH_RESULTS: 10 * 60 * 1000, // 10 minutes
    ADS: 5 * 60 * 1000, // 5 minutes
} as const

// Rate Limiting
export const RATE_LIMITS = {
    MESSAGES: { window: 60 * 1000, max: 5 }, // 5 per minute
    LISTINGS: { window: 24 * 60 * 60 * 1000, max: 5 }, // 5 per day
    CONNECTIONS: { window: 24 * 60 * 60 * 1000, max: 20 }, // 20 per day
    SEARCHES: { window: 60 * 60 * 1000, max: 10 }, // 10 per hour
} as const

// UI Configuration
export const UI_CONFIG = {
    ITEMS_PER_PAGE: 20,
    MOBILE_BREAKPOINT: 640,
    TABLET_BREAKPOINT: 768,
    DESKTOP_BREAKPOINT: 1024,
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
} as const

// Error Messages
export const ERROR_MESSAGES = {
    AUTH_REQUIRED: 'Vui lòng đăng nhập để tiếp tục',
    AGE_VERIFICATION_FAILED: 'Chỉ dành cho thành viên sinh năm 1981',
    TRIAL_EXPIRED: 'Trial đã hết hạn. Vui lòng thanh toán để tiếp tục sử dụng',
    RATE_LIMIT_EXCEEDED: 'Bạn đã vượt quá giới hạn. Vui lòng thử lại sau',
    INVALID_INPUT: 'Dữ liệu không hợp lệ',
    NETWORK_ERROR: 'Lỗi kết nối. Vui lòng thử lại',
    UNAUTHORIZED: 'Bạn không có quyền thực hiện hành động này',
    NOT_FOUND: 'Không tìm thấy dữ liệu',
    SERVER_ERROR: 'Lỗi hệ thống. Vui lòng thử lại sau',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Đăng nhập thành công!',
    REGISTRATION_SUCCESS: 'Đăng ký thành công!',
    LISTING_CREATED: 'Đăng tin thành công!',
    PAYMENT_SUCCESS: 'Thanh toán thành công!',
    MESSAGE_SENT: 'Tin nhắn đã được gửi!',
    PROFILE_UPDATED: 'Cập nhật thông tin thành công!',
} as const
