// Bot Configuration - UPDATED PRICING
export const BOT_CONFIG = {
    DAILY_FEE: 2000, // Tăng từ 1000 lên 2000đ/ngày
    MINIMUM_DAYS: 7,
    TRIAL_DAYS: 3,
    REFERRAL_REWARD: 10000,
    SEARCH_SERVICE_FEE: 5000,
} as const

// Categories and Subcategories
export const CATEGORIES = {
    'BẤT ĐỘNG SẢN': {
        icon: '🏠',
        name: 'BẤT ĐỘNG SẢN',
        keywords: ['nhà', 'đất', 'bất động sản', 'real estate', 'property', 'nhà ở', 'chung cư', 'mặt bằng', 'đất nền', 'biệt thự', 'nhà phố', 'apartment', 'house', 'land'],
        subcategories: [
            { key: 'NHÀ_Ở', icon: '🏘️', name: 'NHÀ Ở', keywords: ['nhà riêng', 'nhà phố', 'biệt thự', 'nhà cấp 4', 'house', 'villa', 'townhouse', 'detached house'] },
            { key: 'CHUNG_CƯ', icon: '🏢', name: 'CHUNG CƯ', keywords: ['căn hộ', 'penthouse', 'duplex', 'apartment', 'condo', 'studio', 'loft'] },
            { key: 'MẶT_BẰNG', icon: '🏪', name: 'MẶT BẰNG', keywords: ['mặt bằng kinh doanh', 'văn phòng', 'kho bãi', 'shop', 'office', 'warehouse', 'commercial'] },
            { key: 'ĐẤT_NỀN', icon: '🌾', name: 'ĐẤT NỀN', keywords: ['đất thổ cư', 'đất nông nghiệp', 'đất dự án', 'land', 'plot', 'agricultural land', 'residential land'] }
        ]
    },
    'Ô TÔ': {
        icon: '🚗',
        name: 'Ô TÔ',
        keywords: ['xe hơi', 'ô tô', 'car', 'automobile', 'vehicle', 'xe', 'honda', 'toyota', 'hyundai', 'kia', 'mazda', 'ford', 'chevrolet', 'nissan', 'mitsubishi'],
        subcategories: [
            { key: 'SEDAN', icon: '🚙', name: 'SEDAN', keywords: ['honda city', 'toyota vios', 'hyundai accent', 'kia cerato', 'sedan', 'xe sedan', '4 cửa'] },
            { key: 'SUV', icon: '🚐', name: 'SUV', keywords: ['honda cr-v', 'toyota fortuner', 'mazda cx-5', 'hyundai tucson', 'suv', 'xe suv', '7 chỗ', '5 chỗ'] },
            { key: 'HATCHBACK', icon: '🚗', name: 'HATCHBACK', keywords: ['honda jazz', 'toyota yaris', 'ford fiesta', 'hyundai i10', 'hatchback', 'xe hatchback', 'xe nhỏ'] },
            { key: 'PICKUP', icon: '🛻', name: 'PICKUP', keywords: ['ford ranger', 'toyota hilux', 'isuzu d-max', 'mitsubishi triton', 'pickup', 'xe bán tải', 'xe tải nhỏ'] }
        ]
    },
    'ĐIỆN TỬ': {
        icon: '📱',
        name: 'ĐIỆN TỬ',
        keywords: ['điện tử', 'điện thoại', 'laptop', 'máy tính', 'tablet', 'phụ kiện', 'electronics', 'phone', 'computer', 'accessories', 'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo'],
        subcategories: [
            { key: 'ĐIỆN_THOẠI', icon: '📱', name: 'ĐIỆN THOẠI', keywords: ['iphone', 'samsung galaxy', 'xiaomi', 'oppo', 'vivo', 'điện thoại', 'smartphone', 'mobile phone', 'cell phone'] },
            { key: 'LAPTOP', icon: '💻', name: 'LAPTOP', keywords: ['macbook', 'dell', 'hp', 'asus', 'lenovo', 'laptop', 'máy tính xách tay', 'notebook', 'computer'] },
            { key: 'TABLET', icon: '📱', name: 'TABLET', keywords: ['ipad', 'samsung tab', 'huawei', 'xiaomi', 'tablet', 'máy tính bảng', 'ipad pro', 'galaxy tab'] },
            { key: 'PHỤ_KIỆN', icon: '🎧', name: 'PHỤ KIỆN', keywords: ['tai nghe', 'sạc', 'ốp lưng', 'cáp', 'headphone', 'charger', 'case', 'cable', 'accessories', 'phụ kiện'] }
        ]
    },
    'THỜI TRANG': {
        icon: '👕',
        name: 'THỜI TRANG',
        keywords: ['thời trang', 'quần áo', 'giày dép', 'phụ kiện', 'fashion', 'clothing', 'shoes', 'accessories', 'quần', 'áo', 'váy', 'đầm', 'giày', 'dép'],
        subcategories: [
            { key: 'QUẦN_ÁO_NAM', icon: '👔', name: 'QUẦN ÁO NAM', keywords: ['áo sơ mi', 'quần âu', 'áo thun', 'quần jean', 'áo polo', 'quần short', 'áo khoác', 'men clothing', 'nam'] },
            { key: 'QUẦN_ÁO_NỮ', icon: '👗', name: 'QUẦN ÁO NỮ', keywords: ['váy', 'đầm', 'áo blouse', 'quần short', 'áo thun nữ', 'quần jean nữ', 'áo khoác nữ', 'women clothing', 'nữ'] },
            { key: 'GIÀY_DÉP', icon: '👟', name: 'GIÀY DÉP', keywords: ['giày thể thao', 'giày tây', 'dép', 'sandal', 'boots', 'sneakers', 'shoes', 'footwear'] },
            { key: 'PHỤ_KIỆN', icon: '👜', name: 'PHỤ KIỆN', keywords: ['túi xách', 'ví', 'đồng hồ', 'trang sức', 'bag', 'wallet', 'watch', 'jewelry', 'accessories'] }
        ]
    },
    'ẨM THỰC': {
        icon: '🍽️',
        name: 'ẨM THỰC',
        keywords: ['ẩm thực', 'đồ ăn', 'thức uống', 'bánh kẹo', 'nguyên liệu', 'food', 'beverage', 'cooking', 'restaurant', 'cafe', 'món ăn', 'nước uống'],
        subcategories: [
            { key: 'MÓN_ĂN', icon: '🍜', name: 'MÓN ĂN', keywords: ['cơm', 'phở', 'bún', 'chả cá', 'bánh mì', 'bún bò', 'phở bò', 'cơm tấm', 'bún chả', 'food', 'món ăn'] },
            { key: 'ĐỒ_UỐNG', icon: '☕', name: 'ĐỒ UỐNG', keywords: ['cà phê', 'trà sữa', 'nước ép', 'sinh tố', 'nước ngọt', 'bia', 'rượu', 'coffee', 'tea', 'juice', 'smoothie'] },
            { key: 'BÁNH_KẸO', icon: '🍰', name: 'BÁNH KẸO', keywords: ['bánh ngọt', 'kẹo', 'bánh mì', 'bánh tráng', 'bánh kem', 'bánh quy', 'chocolate', 'candy', 'cake', 'cookie'] },
            { key: 'NGUYÊN_LIỆU', icon: '🥬', name: 'NGUYÊN LIỆU', keywords: ['gạo', 'thịt', 'rau củ', 'gia vị', 'hải sản', 'trái cây', 'ingredients', 'spices', 'vegetables', 'meat', 'seafood'] }
        ]
    },
    'DỊCH VỤ': {
        icon: '🔧',
        name: 'DỊCH VỤ',
        keywords: ['dịch vụ', 'service', 'gia sư', 'massage', 'giao hàng', 'sửa chữa', 'công nghệ', 'tài chính', 'pháp lý', 'bất động sản', 'du lịch', 'ẩm thực', 'thời trang', 'giải trí', 'nông nghiệp', 'xây dựng', 'vệ sinh', 'bảo vệ'],
        subcategories: [
            { key: 'GIÁO_DỤC', icon: '📚', name: 'GIÁO DỤC', keywords: ['gia sư', 'dạy kèm', 'luyện thi', 'ngoại ngữ', 'toán', 'lý', 'hóa', 'văn', 'anh văn', 'tiếng anh', 'tiếng nhật', 'tiếng hàn', 'tiếng trung', 'ielts', 'toeic', 'tutoring', 'teacher'] },
            { key: 'SỨC_KHỎE', icon: '💪', name: 'SỨC KHỎE', keywords: ['massage', 'yoga', 'gym', 'spa', 'fitness', 'thể dục', 'thể hình', 'massage', 'xông hơi', 'chăm sóc da', 'làm đẹp', 'nails', 'tóc', 'skincare'] },
            { key: 'VẬN_CHUYỂN', icon: '🚚', name: 'VẬN CHUYỂN', keywords: ['giao hàng', 'chuyển nhà', 'taxi', 'xe máy', 'shipping', 'logistics', 'vận chuyển', 'giao đồ ăn', 'grab', 'uber', 'be', 'gojek'] },
            { key: 'SỬA_CHỮA', icon: '🔧', name: 'SỬA CHỮA', keywords: ['sửa chữa', 'điện tử', 'xe máy', 'điện lạnh', 'nội thất', 'máy tính', 'điện thoại', 'tủ lạnh', 'máy giặt', 'điều hòa', 'repair', 'maintenance'] },
            { key: 'CÔNG_NGHỆ', icon: '💻', name: 'CÔNG NGHỆ', keywords: ['lập trình', 'website', 'app', 'software', 'IT', 'công nghệ thông tin', 'phần mềm', 'thiết kế', 'design', 'marketing', 'seo', 'facebook ads'] },
            { key: 'TÀI_CHÍNH', icon: '💰', name: 'TÀI CHÍNH', keywords: ['kế toán', 'thuế', 'bảo hiểm', 'ngân hàng', 'đầu tư', 'chứng khoán', 'tài chính', 'kế toán', 'bookkeeping', 'tax', 'insurance'] },
            { key: 'PHÁP_LÝ', icon: '⚖️', name: 'PHÁP LÝ', keywords: ['luật sư', 'pháp lý', 'tư vấn pháp luật', 'giấy tờ', 'thủ tục', 'hành chính', 'lawyer', 'legal', 'consultation', 'documentation'] },
            { key: 'BẤT_ĐỘNG_SẢN', icon: '🏠', name: 'BẤT ĐỘNG SẢN', keywords: ['môi giới', 'bất động sản', 'nhà đất', 'cho thuê', 'bán nhà', 'real estate', 'broker', 'rent', 'sale', 'property'] },
            { key: 'DU_LỊCH', icon: '✈️', name: 'DU LỊCH', keywords: ['du lịch', 'tour', 'khách sạn', 'vé máy bay', 'booking', 'travel', 'tourism', 'hotel', 'flight', 'ticket'] },
            { key: 'ẨM_THỰC', icon: '🍽️', name: 'ẨM THỰC', keywords: ['nấu ăn', 'catering', 'tiệc', 'đồ ăn', 'thức uống', 'cooking', 'catering', 'party', 'food', 'beverage'] },
            { key: 'THỜI_TRANG', icon: '👗', name: 'THỜI TRANG', keywords: ['may đo', 'thiết kế', 'thời trang', 'quần áo', 'giày dép', 'fashion', 'tailor', 'design', 'clothing', 'shoes'] },
            { key: 'GIẢI_TRÍ', icon: '🎭', name: 'GIẢI TRÍ', keywords: ['sự kiện', 'tổ chức', 'party', 'ca nhạc', 'khiêu vũ', 'entertainment', 'event', 'music', 'dance', 'celebration'] },
            { key: 'NÔNG_NGHIỆP', icon: '🌾', name: 'NÔNG NGHIỆP', keywords: ['nông nghiệp', 'chăn nuôi', 'trồng trọt', 'thủy sản', 'agriculture', 'farming', 'livestock', 'fishing', 'aquaculture'] },
            { key: 'XÂY_DỰNG', icon: '🏗️', name: 'XÂY DỰNG', keywords: ['xây dựng', 'sửa chữa nhà', 'nội thất', 'kiến trúc', 'construction', 'renovation', 'interior', 'architecture', 'building'] },
            { key: 'VỆ_SINH', icon: '🧹', name: 'VỆ SINH', keywords: ['vệ sinh', 'dọn dẹp', 'giặt ủi', 'cleaning', 'laundry', 'housekeeping', 'maintenance', 'hygiene'] },
            { key: 'BẢO_VỆ', icon: '🛡️', name: 'BẢO VỆ', keywords: ['bảo vệ', 'an ninh', 'security', 'guard', 'safety', 'protection', 'surveillance'] },
            { key: 'KHÁC', icon: '🔧', name: 'DỊCH VỤ KHÁC', keywords: ['dịch vụ khác', 'other services', 'miscellaneous', 'tùy chỉnh', 'custom'] }
        ]
    },
    'ĐỒ GIA DỤNG': {
        icon: '🏠',
        name: 'ĐỒ GIA DỤNG',
        keywords: ['đồ gia dụng', 'thiết bị gia đình', 'nội thất', 'đồ dùng nhà bếp', 'đồ điện gia dụng', 'furniture', 'home appliances', 'kitchen', 'household'],
        subcategories: [
            { key: 'NỘI_THẤT', icon: '🛏️', name: 'NỘI THẤT', keywords: ['sofa', 'bàn ghế', 'tủ', 'kệ', 'giường', 'tủ lạnh', 'máy giặt', 'điều hòa', 'furniture', 'sofa', 'bed', 'wardrobe'] },
            { key: 'ĐIỆN_GIA_DỤNG', icon: '🔌', name: 'ĐIỆN GIA DỤNG', keywords: ['tủ lạnh', 'máy giặt', 'điều hòa', 'lò vi sóng', 'máy hút bụi', 'quạt', 'bếp điện', 'refrigerator', 'washing machine', 'air conditioner'] },
            { key: 'NHÀ_BẾP', icon: '🍳', name: 'NHÀ BẾP', keywords: ['nồi', 'chảo', 'bát', 'đĩa', 'dao', 'thớt', 'ấm', 'ly', 'kitchen', 'cookware', 'utensils', 'pots', 'pans'] },
            { key: 'TRANG_TRÍ', icon: '🖼️', name: 'TRANG TRÍ', keywords: ['tranh', 'đồng hồ', 'gương', 'thảm', 'rèm', 'đèn', 'decoration', 'painting', 'mirror', 'carpet', 'curtain'] }
        ]
    },
    'THỂ THAO': {
        icon: '⚽',
        name: 'THỂ THAO',
        keywords: ['thể thao', 'thể dục', 'gym', 'fitness', 'bóng đá', 'cầu lông', 'tennis', 'bơi lội', 'yoga', 'sports', 'exercise', 'football', 'badminton'],
        subcategories: [
            { key: 'THỂ_DỤC', icon: '💪', name: 'THỂ DỤC', keywords: ['gym', 'fitness', 'tập gym', 'máy tập', 'tạ', 'yoga', 'aerobics', 'cardio', 'strength training'] },
            { key: 'BÓNG_ĐÁ', icon: '⚽', name: 'BÓNG ĐÁ', keywords: ['bóng đá', 'quả bóng', 'giày đá bóng', 'áo bóng đá', 'football', 'soccer', 'ball', 'cleats'] },
            { key: 'CẦU_LÔNG', icon: '🏸', name: 'CẦU LÔNG', keywords: ['cầu lông', 'vợt', 'giày cầu lông', 'áo cầu lông', 'badminton', 'racket', 'shuttlecock'] },
            { key: 'BƠI_LỘI', icon: '🏊', name: 'BƠI LỘI', keywords: ['áo bơi', 'kính bơi', 'mũ bơi', 'phụ kiện bơi', 'swimming', 'swimwear', 'goggles'] }
        ]
    },
    'SÁCH': {
        icon: '📚',
        name: 'SÁCH',
        keywords: ['sách', 'truyện', 'tài liệu', 'giáo trình', 'sách giáo khoa', 'tiểu thuyết', 'sách kinh tế', 'books', 'novels', 'textbooks', 'documents'],
        subcategories: [
            { key: 'GIÁO_TRÌNH', icon: '📖', name: 'GIÁO TRÌNH', keywords: ['giáo trình', 'sách giáo khoa', 'tài liệu học tập', 'textbook', 'curriculum', 'study materials'] },
            { key: 'TIỂU_THUYẾT', icon: '📕', name: 'TIỂU THUYẾT', keywords: ['tiểu thuyết', 'truyện dài', 'novel', 'fiction', 'literature'] },
            { key: 'SÁCH_KINH_TẾ', icon: '💼', name: 'SÁCH KINH TẾ', keywords: ['sách kinh tế', 'kinh doanh', 'marketing', 'business', 'economics', 'management'] },
            { key: 'SÁCH_THIẾU_NHI', icon: '🧸', name: 'SÁCH THIẾU NHI', keywords: ['truyện thiếu nhi', 'sách trẻ em', 'children books', 'kids', 'fairy tales'] }
        ]
    },
    'ĐỒ CHƠI': {
        icon: '🧸',
        name: 'ĐỒ CHƠI',
        keywords: ['đồ chơi', 'trò chơi', 'games', 'toys', 'puzzle', 'board games', 'video games', 'lego', 'xếp hình'],
        subcategories: [
            { key: 'ĐỒ_CHƠI_TRẺ_EM', icon: '🧸', name: 'ĐỒ CHƠI TRẺ EM', keywords: ['đồ chơi trẻ em', 'xe đồ chơi', 'búp bê', 'kids toys', 'children toys'] },
            { key: 'GAME', icon: '🎮', name: 'GAME', keywords: ['game', 'trò chơi điện tử', 'video games', 'mobile games', 'board games'] },
            { key: 'XẾP_HÌNH', icon: '🧩', name: 'XẾP HÌNH', keywords: ['xếp hình', 'puzzle', 'lego', 'rubik', 'jigsaw'] },
            { key: 'ĐỒ_CHƠI_GIÁO_DỤC', icon: '🎓', name: 'ĐỒ CHƠI GIÁO DỤC', keywords: ['đồ chơi giáo dục', 'flashcard', 'educational toys', 'learning toys'] }
        ]
    }
} as const

// Complete locations - All provinces and cities in Vietnam
export const LOCATIONS = [
    // Major cities (Thành phố lớn)
    'HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ',

    // Northern provinces (Miền Bắc)
    'BẮC GIANG', 'BẮC KẠN', 'BẮC NINH', 'CAO BẰNG', 'ĐIỆN BIÊN',
    'HÀ GIANG', 'HÀ NAM', 'HÀ TĨNH', 'HẢI DƯƠNG', 'HÒA BÌNH',
    'HƯNG YÊN', 'LẠNG SƠN', 'LÀO CAI', 'NAM ĐỊNH', 'NGHỆ AN',
    'NINH BÌNH', 'PHÚ THỌ', 'QUẢNG NINH', 'SƠN LA', 'THÁI BÌNH',
    'THÁI NGUYÊN', 'THANH HÓA', 'TUYÊN QUANG', 'VĨNH PHÚC', 'YÊN BÁI',

    // Central provinces (Miền Trung)
    'BÌNH ĐỊNH', 'BÌNH THUẬN', 'KHÁNH HÒA', 'KONTUM', 'LÂM ĐỒNG', 'NINH THUẬN',
    'PHÚ YÊN', 'QUẢNG BÌNH', 'QUẢNG NAM', 'QUẢNG NGÃI', 'QUẢNG TRỊ',
    'THỪA THIÊN HUẾ',

    // Southern provinces (Miền Nam)
    'AN GIANG', 'BẠC LIÊU', 'BẾN TRE', 'BÌNH DƯƠNG', 'BÌNH PHƯỚC',
    'CÀ MAU', 'ĐẮK LẮK', 'ĐẮK NÔNG', 'ĐỒNG NAI', 'ĐỒNG THÁP',
    'GIA LAI', 'HẬU GIANG', 'KIÊN GIANG', 'LONG AN', 'SÓC TRĂNG',
    'TÂY NINH', 'TIỀN GIANG', 'TRÀ VINH', 'VĨNH LONG'
] as const

// Districts and cities for major provinces
export const DISTRICTS = {
    'HÀ NỘI': [
        'QUẬN BA ĐÌNH', 'QUẬN HOÀN KIẾM', 'QUẬN TÂY HỒ', 'QUẬN LONG BIÊN',
        'QUẬN CẦU GIẤY', 'QUẬN ĐỐNG ĐA', 'QUẬN HAI BÀ TRƯNG', 'QUẬN HOÀNG MAI',
        'QUẬN THANH XUÂN', 'QUẬN HÀ ĐÔNG', 'QUẬN NAM TỪ LIÊM', 'QUẬN BẮC TỪ LIÊM',
        'HUYỆN SÓC SƠN', 'HUYỆN ĐÔNG ANH', 'HUYỆN GIA LÂM', 'HUYỆN NAM TỪ LIÊM',
        'HUYỆN THANH TRÌ', 'HUYỆN BẮC TỪ LIÊM', 'HUYỆN MÊ LINH', 'HUYỆN HÀ ĐÔNG',
        'HUYỆN SƠN TÂY', 'HUYỆN BA VÌ', 'HUYỆN PHÚC THỌ', 'HUYỆN ĐAN PHƯỢNG',
        'HUYỆN HOÀI ĐỨC', 'HUYỆN QUỐC OAI', 'HUYỆN THẠCH THẤT', 'HUYỆN CHƯƠNG MỸ',
        'HUYỆN THANH OAI', 'HUYỆN THƯỜNG TÍN', 'HUYỆN PHÚ XUYÊN', 'HUYỆN ỨNG HÒA',
        'HUYỆN MỸ ĐỨC'
    ],
    'TP.HỒ CHÍ MINH': [
        'QUẬN 1', 'QUẬN 2', 'QUẬN 3', 'QUẬN 4', 'QUẬN 5', 'QUẬN 6',
        'QUẬN 7', 'QUẬN 8', 'QUẬN 9', 'QUẬN 10', 'QUẬN 11', 'QUẬN 12',
        'QUẬN THỦ ĐỨC', 'QUẬN BÌNH THẠNH', 'QUẬN GÒ VẤP', 'QUẬN TÂN BÌNH',
        'QUẬN TÂN PHÚ', 'QUẬN PHÚ NHUẬN', 'QUẬN BÌNH TÂN', 'QUẬN HỐC MÔN',
        'QUẬN CỦ CHI', 'QUẬN BÌNH CHÁNH', 'QUẬN NHÀ BÈ', 'QUẬN CẦN GIỜ'
    ],
    'ĐÀ NẴNG': [
        'QUẬN HẢI CHÂU', 'QUẬN THANH KHÊ', 'QUẬN SƠN TRÀ', 'QUẬN NGŨ HÀNH SƠN',
        'QUẬN LIÊN CHIỂU', 'QUẬN CẨM LỆ', 'HUYỆN HÒA VANG', 'HUYỆN HOÀNG SA'
    ],
    'HẢI PHÒNG': [
        'QUẬN HỒNG BÀNG', 'QUẬN NGÔ QUYỀN', 'QUẬN LÊ CHÂN', 'QUẬN HẢI AN',
        'QUẬN KIẾN AN', 'QUẬN ĐỒ SƠN', 'QUẬN DƯƠNG KINH', 'HUYỆN THUỶ NGUYÊN',
        'HUYỆN AN DƯƠNG', 'HUYỆN AN LÃO', 'HUYỆN KIẾN THUỴ', 'HUYỆN TIÊN LÃNG',
        'HUYỆN VĨNH BẢO', 'HUYỆN CÁT HẢI', 'HUYỆN BẠCH LONG VĨ'
    ],
    'CẦN THƠ': [
        'QUẬN NINH KIỀU', 'QUẬN Ô MÔN', 'QUẬN BÌNH THỦY', 'QUẬN CÁI RĂNG',
        'QUẬN THỐT NỐT', 'HUYỆN VĨNH THẠNH', 'HUYỆN CỜ ĐỎ', 'HUYỆN PHONG ĐIỀN',
        'HUYỆN THỚI LAI'
    ],
    'BÌNH DƯƠNG': [
        'THÀNH PHỐ THỦ DẦU MỘT', 'THÀNH PHỐ DĨ AN', 'THÀNH PHỐ THUẬN AN',
        'THÀNH PHỐ TÂN UYÊN', 'THÀNH PHỐ BẾN CÁT', 'HUYỆN BẮC TÂN UYÊN',
        'HUYỆN BÀU BÀNG', 'HUYỆN DẦU TIẾNG', 'HUYỆN PHÚ GIÁO'
    ],
    'ĐỒNG NAI': [
        'THÀNH PHỐ BIÊN HÒA', 'THÀNH PHỐ LONG KHÁNH', 'HUYỆN TÂN PHÚ',
        'HUYỆN VĨNH CỬU', 'HUYỆN ĐỊNH QUÁN', 'HUYỆN TRẢNG BOM',
        'HUYỆN THỐNG NHẤT', 'HUYỆN CẨM MỸ', 'HUYỆN LONG THÀNH',
        'HUYỆN XUÂN LỘC', 'HUYỆN NHƠN TRẠCH'
    ],
    'KHÁNH HÒA': [
        'THÀNH PHỐ NHA TRANG', 'THÀNH PHỐ CAM RANH', 'THÀNH PHỐ CAM LÂM',
        'HUYỆN CAM LÂM', 'HUYỆN VẠN NINH', 'HUYỆN NINH HÒA',
        'HUYỆN KHÁNH VĨNH', 'HUYỆN DIÊN KHÁNH', 'HUYỆN KHÁNH SƠN',
        'HUYỆN TRƯỜNG SA'
    ],
    'LÂM ĐỒNG': [
        'THÀNH PHỐ ĐÀ LẠT', 'THÀNH PHỐ BẢO LỘC', 'HUYỆN ĐAM RÔNG',
        'HUYỆN LẠC DƯƠNG', 'HUYỆN LÂM HÀ', 'HUYỆN ĐỨC TRỌNG',
        'HUYỆN ĐƠN DƯƠNG', 'HUYỆN ĐỨC LINH', 'HUYỆN BẢO LÂM',
        'HUYỆN CÁT TIÊN', 'HUYỆN DI LINH'
    ],
    'THỪA THIÊN HUẾ': [
        'THÀNH PHỐ HUẾ', 'THỊ XÃ HƯƠNG THỦY', 'THỊ XÃ HƯƠNG TRÀ',
        'HUYỆN PHONG ĐIỀN', 'HUYỆN QUẢNG ĐIỀN', 'HUYỆN PHÚ VANG',
        'HUYỆN PHÚ LỘC', 'HUYỆN A LƯỚI', 'HUYỆN NAM ĐÔNG'
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

// Horoscope data for Tân Dậu - Hỗ Trợ Chéo
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

// HASHTAG_MAPPING - Map hashtags to categories and keywords
export const HASHTAG_MAPPING = {
    // Bất động sản
    '#nhadat': { category: 'BẤT ĐỘNG SẢN', keywords: ['nhà', 'đất', 'bất động sản'] },
    '#nhathue': { category: 'BẤT ĐỘNG SẢN', keywords: ['nhà thuê', 'cho thuê nhà'] },
    '#chungcu': { category: 'BẤT ĐỘNG SẢN', keywords: ['chung cư', 'căn hộ'] },
    '#matbang': { category: 'BẤT ĐỘNG SẢN', keywords: ['mặt bằng', 'kinh doanh'] },
    '#bietthu': { category: 'BẤT ĐỘNG SẢN', keywords: ['biệt thự', 'villa'] },

    // Ô tô
    '#oto': { category: 'Ô TÔ', keywords: ['ô tô', 'xe hơi'] },
    '#xemay': { category: 'Ô TÔ', keywords: ['xe máy', 'motor'] },
    '#xehoi': { category: 'Ô TÔ', keywords: ['xe hơi', 'ô tô'] },
    '#honda': { category: 'Ô TÔ', keywords: ['honda', 'xe honda'] },
    '#toyota': { category: 'Ô TÔ', keywords: ['toyota', 'xe toyota'] },
    '#yamaha': { category: 'Ô TÔ', keywords: ['yamaha', 'xe yamaha'] },

    // Điện tử
    '#dienthoai': { category: 'ĐIỆN TỬ', keywords: ['điện thoại', 'smartphone'] },
    '#laptop': { category: 'ĐIỆN TỬ', keywords: ['laptop', 'máy tính'] },
    '#iphone': { category: 'ĐIỆN TỬ', keywords: ['iphone', 'apple'] },
    '#samsung': { category: 'ĐIỆN TỬ', keywords: ['samsung', 'galaxy'] },
    '#maytinh': { category: 'ĐIỆN TỬ', keywords: ['máy tính', 'pc'] },
    '#tivi': { category: 'ĐIỆN TỬ', keywords: ['tivi', 'tv'] },

    // Thời trang
    '#quanao': { category: 'THỜI TRANG', keywords: ['quần áo', 'thời trang'] },
    '#giaydep': { category: 'THỜI TRANG', keywords: ['giày dép', 'giày', 'dép'] },
    '#tui': { category: 'THỜI TRANG', keywords: ['túi', 'balo', 'ví'] },
    '#dongho': { category: 'THỜI TRANG', keywords: ['đồng hồ', 'watch'] },
    '#trangsuc': { category: 'THỜI TRANG', keywords: ['trang sức', 'nhẫn', 'dây chuyền'] },

    // Ẩm thực
    '#monan': { category: 'ẨM THỰC', keywords: ['món ăn', 'thức ăn'] },
    '#comtrua': { category: 'ẨM THỰC', keywords: ['cơm trưa', 'cơm văn phòng'] },
    '#banh': { category: 'ẨM THỰC', keywords: ['bánh', 'bánh ngọt'] },
    '#traicay': { category: 'ẨM THỰC', keywords: ['trái cây', 'hoa quả'] },
    '#cafe': { category: 'ẨM THỰC', keywords: ['cà phê', 'coffee'] },

    // Dịch vụ
    '#giasu': { category: 'DỊCH VỤ', keywords: ['gia sư', 'dạy kèm'] },
    '#massage': { category: 'DỊCH VỤ', keywords: ['massage', 'xoa bóp'] },
    '#spa': { category: 'DỊCH VỤ', keywords: ['spa', 'làm đẹp'] },
    '#sua': { category: 'DỊCH VỤ', keywords: ['sửa chữa', 'sửa'] },
    '#vanchuyen': { category: 'DỊCH VỤ', keywords: ['vận chuyển', 'chuyển nhà'] },
    '#nauan': { category: 'DỊCH VỤ', keywords: ['nấu ăn', 'đầu bếp'] },
    '#trongtre': { category: 'DỊCH VỤ', keywords: ['trông trẻ', 'babysitter'] },
    '#dondep': { category: 'DỊCH VỤ', keywords: ['dọn dẹp', 'giúp việc'] },

    // Địa điểm
    '#hanoi': { category: null, location: 'HÀ NỘI', keywords: ['hà nội', 'hanoi'] },
    '#hcm': { category: null, location: 'TP.HỒ CHÍ MINH', keywords: ['hồ chí minh', 'hcm', 'sài gòn'] },
    '#danang': { category: null, location: 'ĐÀ NẴNG', keywords: ['đà nẵng', 'danang'] },
    '#haiphong': { category: null, location: 'HẢI PHÒNG', keywords: ['hải phòng', 'haiphong'] },
    '#cantho': { category: null, location: 'CẦN THƠ', keywords: ['cần thơ', 'cantho'] },

    // Giá cả
    '#re': { category: null, location: null, keywords: ['rẻ', 'giá rẻ', 'khuyến mãi'] },
    '#cao': { category: null, location: null, keywords: ['cao cấp', 'premium', 'đắt'] },
    '#mienphi': { category: null, location: null, keywords: ['miễn phí', 'free', 'tặng'] },

    // Trạng thái
    '#moi': { category: null, location: null, keywords: ['mới', 'mới tinh', 'chưa sử dụng'] },
    '#cu': { category: null, location: null, keywords: ['cũ', 'đã sử dụng', 'second hand'] },
    '#tot': { category: null, location: null, keywords: ['tốt', 'chất lượng', 'uy tín'] }
} as const

// POPULAR_HASHTAGS - Most used hashtags for suggestions
export const POPULAR_HASHTAGS = [
    '#quanao', '#dienthoai', '#nhadat', '#oto', '#giasu',
    '#massage', '#monan', '#laptop', '#hanoi', '#hcm',
    '#re', '#moi', '#tot', '#mienphi', '#spa'
] as const

// Simple Search Helper Functions (No AI - Cost Effective)
export const SEARCH_HELPERS = {
    // Find category by keyword (simple string matching)
    findCategoryByKeyword: (keyword: string): string | null => {
        const normalizedKeyword = keyword.toLowerCase().trim()

        for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
            // Check main category keywords
            if (category.keywords?.some(k => k.toLowerCase().includes(normalizedKeyword))) {
                return categoryKey
            }

            // Check subcategory keywords
            for (const subcategory of category.subcategories) {
                if (subcategory.keywords?.some(k => k.toLowerCase().includes(normalizedKeyword))) {
                    return categoryKey
                }
            }
        }
        return null
    },

    // Find subcategory by keyword
    findSubcategoryByKeyword: (keyword: string): { category: string; subcategory: string } | null => {
        const normalizedKeyword = keyword.toLowerCase().trim()

        for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
            for (const subcategory of category.subcategories) {
                if (subcategory.keywords?.some(k => k.toLowerCase().includes(normalizedKeyword))) {
                    return { category: categoryKey, subcategory: subcategory.key }
                }
            }
        }
        return null
    },

    // Find location by keyword (simple string matching)
    findLocationByKeyword: (keyword: string): string | null => {
        const normalizedKeyword = keyword.toLowerCase().trim()
        return LOCATIONS.find(location =>
            location.toLowerCase().includes(normalizedKeyword)
        ) || null
    },

    // Get districts for a province
    getDistrictsForProvince: (province: string): string[] => {
        return [...(DISTRICTS[province as keyof typeof DISTRICTS] || [])]
    },

    // Check if location is a major city
    isMajorCity: (location: string): boolean => {
        const majorCities = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ']
        return majorCities.includes(location)
    },

    // Generate simple search suggestions
    generateSearchSuggestions: (query: string): string[] => {
        const normalizedQuery = query.toLowerCase().trim()
        const suggestions: string[] = []

        // Add category suggestions
        for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
            if (category.name.toLowerCase().includes(normalizedQuery)) {
                suggestions.push(category.name)
            }
            if (category.keywords?.some(k => k.toLowerCase().includes(normalizedQuery))) {
                suggestions.push(category.name)
            }
        }

        // Add location suggestions
        for (const location of LOCATIONS) {
            if (location.toLowerCase().includes(normalizedQuery)) {
                suggestions.push(location)
            }
        }

        return Array.from(new Set(suggestions)).slice(0, 8) // Remove duplicates and limit to 8
    },

    // Simple search relevance score (no AI)
    calculateRelevanceScore: (item: any, query: string): number => {
        const normalizedQuery = query.toLowerCase().trim()
        let score = 0

        // Check title match (highest priority)
        if (item.title?.toLowerCase().includes(normalizedQuery)) {
            score += 10
        }

        // Check description match
        if (item.description?.toLowerCase().includes(normalizedQuery)) {
            score += 5
        }

        // Check category match
        if (item.category) {
            const category = CATEGORIES[item.category as keyof typeof CATEGORIES]
            if (category?.keywords?.some(k => k.toLowerCase().includes(normalizedQuery))) {
                score += 3
            }
        }

        // Check location match
        if (item.location?.toLowerCase().includes(normalizedQuery)) {
            score += 2
        }

        return score
    },

    // Simple search function
    searchListings: (listings: any[], query: string): any[] => {
        if (!query.trim()) return listings

        const scoredListings = listings.map(item => ({
            ...item,
            relevanceScore: SEARCH_HELPERS.calculateRelevanceScore(item, query)
        }))

        return scoredListings
            .filter(item => item.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
    },

    // Get popular search terms (for future AI upgrade)
    getPopularSearchTerms: (): string[] => {
        return [
            'nhà', 'xe', 'điện thoại', 'laptop', 'gia sư', 'massage',
            'hà nội', 'tp.hồ chí minh', 'đà nẵng', 'bình dương', 'đồng nai'
        ]
    },

    // Hashtag functions
    findHashtagByKeyword: (keyword: string): string | null => {
        const normalizedKeyword = keyword.toLowerCase().trim()

        for (const [hashtag, mapping] of Object.entries(HASHTAG_MAPPING)) {
            if (hashtag.toLowerCase() === normalizedKeyword) {
                return hashtag
            }
            // Check if keyword matches any of the hashtag's keywords
            if (mapping.keywords.some(k => k.toLowerCase().includes(normalizedKeyword))) {
                return hashtag
            }
        }

        return null
    },

    getHashtagMapping: (hashtag: string) => {
        return HASHTAG_MAPPING[hashtag as keyof typeof HASHTAG_MAPPING] || null
    },

    parseHashtags: (query: string): { hashtags: string[], remainingQuery: string } => {
        const hashtagRegex = /#\w+/g
        const hashtags = query.match(hashtagRegex) || []
        const remainingQuery = query.replace(hashtagRegex, '').trim()

        return { hashtags, remainingQuery }
    },

    getPopularHashtags: (): string[] => {
        return [...POPULAR_HASHTAGS]
    },

    searchWithHashtags: (listings: any[], query: string): any[] => {
        const { hashtags, remainingQuery } = SEARCH_HELPERS.parseHashtags(query)

        if (hashtags.length === 0) {
            return SEARCH_HELPERS.searchListings(listings, query)
        }

        let filteredListings = listings

        // Apply hashtag filters
        for (const hashtag of hashtags) {
            const mapping = SEARCH_HELPERS.getHashtagMapping(hashtag)
            if (!mapping) continue

            if (mapping.category) {
                filteredListings = filteredListings.filter(listing =>
                    listing.category === mapping.category
                )
            }

            if ('location' in mapping && mapping.location) {
                filteredListings = filteredListings.filter(listing =>
                    listing.location?.toLowerCase().includes(mapping.location!.toLowerCase())
                )
            }

            // Apply keyword filters
            if (mapping.keywords.length > 0) {
                filteredListings = filteredListings.filter(listing => {
                    const searchText = `${listing.title} ${listing.description}`.toLowerCase()
                    return mapping.keywords.some(keyword =>
                        searchText.includes(keyword.toLowerCase())
                    )
                })
            }
        }

        // Apply remaining query search
        if (remainingQuery) {
            filteredListings = SEARCH_HELPERS.searchListings(filteredListings, remainingQuery)
        }

        return filteredListings
    }
} as const
