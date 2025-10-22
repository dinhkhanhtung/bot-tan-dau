// Bot Configuration - UPDATED PRICING
export const BOT_CONFIG = {
    DAILY_FEE: 3000, // Chỉ với 3,000đ/ngày - cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu
    MINIMUM_DAYS: 3,
    TRIAL_DAYS: 3,
    REFERRAL_REWARD: 10000,
    SEARCH_SERVICE_FEE: 5000,
} as const

// Bot Information
export const BOT_INFO = {
    SLOGAN: 'Cùng nhau kết nối - cùng nhau thịnh vượng',
    WELCOME_MESSAGE: 'Chào mừng bạn đến với cộng đồng Tân Dậu Việt!',
    PRICING_MESSAGE: 'Chỉ với 3,000đ mỗi ngày bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu',
    COMMUNITY_SIZE: '2 triệu Tân Dậu',
    DAILY_FEE_FORMATTED: '3,000đ/ngày',
} as const

// Categories and Subcategories
export const CATEGORIES = {
    'Y TẾ': {
        icon: '🏥',
        name: 'Y TẾ',
        keywords: ['y tế', 'bệnh viện', 'phòng khám', 'thuốc', 'dược phẩm', 'chăm sóc sức khỏe', 'bác sĩ', 'nha khoa', 'mắt', 'tai mũi họng', 'da liễu', 'sản phụ khoa', 'nội khoa', 'ngoại khoa', 'nhi khoa', 'medical', 'healthcare', 'hospital', 'clinic', 'pharmacy', 'medicine', 'doctor', 'dentist', 'ophthalmology', 'ent', 'dermatology', 'obstetrics', 'internal medicine', 'surgery', 'pediatrics'],
        subcategories: [
            { key: 'ĐÔNG_Y', icon: '🌿', name: 'ĐÔNG Y', keywords: ['đông y', 'thuốc nam', 'thuốc bắc', 'traditional medicine', 'herbal medicine', 'acupuncture', 'châm cứu', 'bấm huyệt', 'cây thuốc', 'thảo dược'] },
            { key: 'BỆNH_VIỆN', icon: '🏥', name: 'BỆNH VIỆN', keywords: ['bệnh viện', 'hospital', 'cơ sở y tế', 'medical center', 'healthcare facility'] },
            { key: 'PHÒNG_KHÁM', icon: '🏥', name: 'PHÒNG KHÁM', keywords: ['phòng khám', 'clinic', 'phòng mạch', 'private practice', 'medical office'] },
            { key: 'NHÀ_THUỐC', icon: '💊', name: 'NHÀ THUỐC', keywords: ['nhà thuốc', 'pharmacy', 'quầy thuốc', 'drugstore', 'thuốc tây', 'medicine'] },
            { key: 'NHA_KHOA', icon: '🦷', name: 'NHA KHOA', keywords: ['nha khoa', 'răng hàm mặt', 'dentist', 'dental', 'nha sĩ', 'chỉnh nha', 'implant'] },
            { key: 'MẮT', icon: '👁️', name: 'MẮT', keywords: ['mắt', 'nhãn khoa', 'kính mắt', 'ophthalmology', 'eye doctor', 'glasses', 'contact lens'] },
            { key: 'TAI_MŨI_HỌNG', icon: '👂', name: 'TAI MŨI HỌNG', keywords: ['tai mũi họng', 'ent', 'tai', 'mũi', 'họng', 'ear nose throat', 'otorhinolaryngology'] },
            { key: 'DA_LIỄU', icon: '🧴', name: 'DA LIỄU', keywords: ['da liễu', 'dermatology', 'da', 'liễu', 'chăm sóc da', 'skincare', 'skin doctor'] },
            { key: 'SẢN_PHỤ_KHOA', icon: '🤰', name: 'SẢN PHỤ KHOA', keywords: ['sản phụ khoa', 'obstetrics', 'phụ khoa', 'sản khoa', 'maternity', 'gynecology'] },
            { key: 'NỘI_KHOA', icon: '🩺', name: 'NỘI KHOA', keywords: ['nội khoa', 'internal medicine', 'nội tổng hợp', 'general medicine', 'physician'] },
            { key: 'NGOẠI_KHOA', icon: '🔪', name: 'NGOẠI KHOA', keywords: ['ngoại khoa', 'surgery', 'phẫu thuật', 'surgeon', 'general surgery'] },
            { key: 'NHI_KHOA', icon: '👶', name: 'NHI KHOA', keywords: ['nhi khoa', 'pediatrics', 'trẻ em', 'children', 'pediatrician', 'kids doctor'] },
            { key: 'CHẨN_DOÁN_HÌNH_ẢNH', icon: '🩻', name: 'CHẨN ĐOÁN HÌNH ẢNH', keywords: ['x-quang', 'siêu âm', 'ct scan', 'mri', 'x-ray', 'ultrasound', 'radiology'] },
            { key: 'XÉT_NGHIỆM', icon: '🧪', name: 'XÉT NGHIỆM', keywords: ['xét nghiệm', 'lab test', 'blood test', 'medical test', 'laboratory'] },
            { key: 'VẬT_LÝ_TRỊ_LIỆU', icon: '💪', name: 'VẬT LÝ TRỊ LIỆU', keywords: ['vật lý trị liệu', 'physiotherapy', 'rehabilitation', 'physical therapy', 'phục hồi chức năng'] },
            { key: 'TÂM_LÝ', icon: '🧠', name: 'TÂM LÝ', keywords: ['tâm lý', 'psychology', 'tư vấn tâm lý', 'psychologist', 'mental health', 'counseling'] },
            { key: 'THẨM_MỸ', icon: '💅', name: 'THẨM MỸ', keywords: ['thẩm mỹ', 'làm đẹp', 'cosmetic', 'beauty', 'spa', 'aesthetic', 'plastic surgery'] },
            { key: 'THÚ_Y', icon: '🐕', name: 'THÚ Y', keywords: ['thú y', 'veterinary', 'thú cưng', 'pet', 'animal doctor', 'vet clinic'] },
            { key: 'KHÁC', icon: '🏥', name: 'Y TẾ KHÁC', keywords: ['y tế khác', 'other medical', 'specialized', 'chuyên khoa khác'] }
        ]
    },
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
    },
    'NÔNG NGHIỆP': {
        icon: '🌾',
        name: 'NÔNG NGHIỆP',
        keywords: ['nông nghiệp', 'trồng trọt', 'chăn nuôi', 'thủy sản', 'cây trồng', 'vật nuôi', 'phân bón', 'thuốc trừ sâu', 'máy nông nghiệp', 'agriculture', 'farming', 'crops', 'livestock'],
        subcategories: [
            { key: 'CÂY_TRỒNG', icon: '🌱', name: 'CÂY TRỒNG', keywords: ['cây giống', 'hạt giống', 'cây ăn quả', 'cây công nghiệp', 'rau củ', 'hoa màu', 'seeds', 'plants', 'crops'] },
            { key: 'VẬT_NUÔI', icon: '🐄', name: 'VẬT NUÔI', keywords: ['gia súc', 'gia cầm', 'thú cưng', 'cá cảnh', 'chim cảnh', 'livestock', 'poultry', 'pets', 'fish', 'birds'] },
            { key: 'PHÂN_BÓN', icon: '🌿', name: 'PHÂN BÓN', keywords: ['phân hữu cơ', 'phân hóa học', 'phân bón lá', 'phân vi sinh', 'fertilizer', 'organic fertilizer', 'chemical fertilizer'] },
            { key: 'THUỐC_TRỪ_SÂU', icon: '🛡️', name: 'THUỐC TRỪ SÂU', keywords: ['thuốc trừ sâu', 'thuốc diệt cỏ', 'thuốc kích thích', 'pesticides', 'herbicides', 'growth stimulants'] },
            { key: 'MÁY_NÔNG_NGHIỆP', icon: '🚜', name: 'MÁY NÔNG NGHIỆP', keywords: ['máy cày', 'máy gặt', 'máy phun thuốc', 'máy tưới', 'agricultural machinery', 'tractor', 'harvester'] },
            { key: 'THỦY_SẢN', icon: '🐟', name: 'THỦY SẢN', keywords: ['cá', 'tôm', 'cua', 'nhuyễn thể', 'thức ăn thủy sản', 'fish', 'shrimp', 'crab', 'shellfish', 'aquaculture'] }
        ]
    },
    'XÂY DỰNG': {
        icon: '🏗️',
        name: 'XÂY DỰNG',
        keywords: ['xây dựng', 'thi công', 'vật liệu xây dựng', 'thiết kế', 'kiến trúc', 'nội thất', 'construction', 'building materials', 'design', 'architecture', 'interior'],
        subcategories: [
            { key: 'VẬT_LIỆU', icon: '🧱', name: 'VẬT LIỆU XÂY DỰNG', keywords: ['xi măng', 'cát', 'đá', 'gạch', 'sắt thép', 'cement', 'sand', 'stone', 'brick', 'steel'] },
            { key: 'THI_CÔNG', icon: '👷', name: 'THI CÔNG', keywords: ['thi công xây dựng', 'nhà thầu', 'đội thợ', 'construction contractor', 'builder', 'construction team'] },
            { key: 'THIẾT_KẾ', icon: '📐', name: 'THIẾT KẾ', keywords: ['thiết kế nhà', 'kiến trúc sư', 'bản vẽ', 'architect', 'design', 'blueprint'] },
            { key: 'NỘI_THẤT', icon: '🛋️', name: 'NỘI THẤT', keywords: ['thiết kế nội thất', 'đồ gỗ', 'trang trí nội thất', 'interior design', 'furniture', 'decoration'] },
            { key: 'ĐIỆN_NƯỚC', icon: '🔌', name: 'ĐIỆN NƯỚC', keywords: ['lắp đặt điện', 'lắp đặt nước', 'điều hòa', 'electrical', 'plumbing', 'air conditioning'] }
        ]
    },
    'MỸ PHẨM': {
        icon: '💄',
        name: 'MỸ PHẨM',
        keywords: ['mỹ phẩm', 'làm đẹp', 'chăm sóc da', 'trang điểm', 'nước hoa', 'son môi', 'kem dưỡng', 'cosmetics', 'beauty', 'skincare', 'makeup', 'perfume'],
        subcategories: [
            { key: 'CHĂM_SÓC_DA', icon: '🧴', name: 'CHĂM SÓC DA', keywords: ['kem dưỡng da', 'sữa rửa mặt', 'toner', 'serum', 'mặt nạ', 'skincare', 'moisturizer', 'cleanser'] },
            { key: 'TRANG_ĐIỂM', icon: '💅', name: 'TRANG ĐIỂM', keywords: ['son môi', 'phấn nền', 'mascara', 'eyeliner', 'makeup', 'lipstick', 'foundation'] },
            { key: 'NƯỚC_HOA', icon: '🌸', name: 'NƯỚC HOA', keywords: ['nước hoa nam', 'nước hoa nữ', 'xịt phòng', 'perfume', 'cologne', 'room spray'] },
            { key: 'CHĂM_SÓC_TÓC', icon: '💇', name: 'CHĂM SÓC TÓC', keywords: ['dầu gội', 'dầu xả', 'thuốc nhuộm tóc', 'uốn tóc', 'shampoo', 'conditioner', 'hair dye'] },
            { key: 'CHĂM_SÓC_MÓNG', icon: '💅', name: 'CHĂM SÓC MÓNG', keywords: ['sơn móng tay', 'dụng cụ làm móng', 'nail polish', 'nail tools', 'manicure', 'pedicure'] }
        ]
    },
    'ĐỒ THỂ THAO': {
        icon: '🏃',
        name: 'ĐỒ THỂ THAO',
        keywords: ['đồ thể thao', 'quần áo thể thao', 'giày thể thao', 'dụng cụ thể thao', 'gym', 'fitness', 'sports wear', 'sportswear', 'athletic wear'],
        subcategories: [
            { key: 'QUẦN_ÁO', icon: '👕', name: 'QUẦN ÁO THỂ THAO', keywords: ['áo thun thể thao', 'quần short', 'áo tank top', 'leggings', 'sports shirt', 'athletic wear'] },
            { key: 'GIÀY_DÉP', icon: '👟', name: 'GIÀY THỂ THAO', keywords: ['giày chạy bộ', 'giày bóng đá', 'giày tennis', 'dép sandal', 'running shoes', 'soccer shoes'] },
            { key: 'DỤNG_CỤ', icon: '🏋️', name: 'DỤNG CỤ THỂ THAO', keywords: ['tạ tay', 'máy chạy bộ', 'xà đơn', 'bóng rổ', 'dumbbells', 'treadmill', 'pull-up bar'] },
            { key: 'PHỤ_KIỆN', icon: '🧢', name: 'PHỤ KIỆN THỂ THAO', keywords: ['mũ lưỡi trai', 'túi thể thao', 'bình nước', 'đồng hồ thể thao', 'sports cap', 'sports bag'] }
        ]
    },
    'ĐỒ ĐIỆN GIA DỤNG': {
        icon: '🔌',
        name: 'ĐỒ ĐIỆN GIA DỤNG',
        keywords: ['đồ điện', 'điện gia dụng', 'điện tử gia đình', 'điện lạnh', 'điều hòa', 'tủ lạnh', 'máy giặt', 'appliances', 'electronics', 'home appliances'],
        subcategories: [
            { key: 'ĐIỆN_LẠNH', icon: '❄️', name: 'ĐIỆN LẠNH', keywords: ['điều hòa', 'tủ lạnh', 'máy lạnh', 'quạt điều hòa', 'air conditioner', 'refrigerator', 'air conditioning'] },
            { key: 'MÁY_GIẶT', icon: '💧', name: 'MÁY GIẶT', keywords: ['máy giặt cửa trước', 'máy giặt cửa trên', 'máy sấy', 'washing machine', 'dryer'] },
            { key: 'NHÀ_BẾP', icon: '🍳', name: 'ĐỒ ĐIỆN NHÀ BẾP', keywords: ['lò vi sóng', 'bếp điện', 'máy xay sinh tố', 'nồi cơm điện', 'microwave', 'electric stove'] },
            { key: 'LÀM_SẠCH', icon: '🧹', name: 'MÁY LÀM SẠCH', keywords: ['máy hút bụi', 'máy lau nhà', 'máy lọc không khí', 'vacuum cleaner', 'floor cleaner'] }
        ]
    },
    'SỨC KHỎE': {
        icon: '💊',
        name: 'SỨC KHỎE',
        keywords: ['sức khỏe', 'dinh dưỡng', 'thực phẩm chức năng', 'vitamin', 'thuốc bổ', 'health', 'nutrition', 'supplements', 'vitamins', 'medicine'],
        subcategories: [
            { key: 'THỰC_PHẨM_CHỨC_NĂNG', icon: '💊', name: 'THỰC PHẨM CHỨC NĂNG', keywords: ['vitamin', 'khoáng chất', 'collagen', 'omega 3', 'supplements', 'vitamins', 'minerals'] },
            { key: 'DINH_DƯỠNG', icon: '🥗', name: 'DINH DƯỠNG', keywords: ['sữa bột', 'ngũ cốc', 'thực phẩm ăn kiêng', 'protein', 'milk powder', 'cereals', 'diet food'] },
            { key: 'CHĂM_SÓC_CÁ_NHÂN', icon: '🧴', name: 'CHĂM SÓC CÁ NHÂN', keywords: ['bàn chải đánh răng', 'kem đánh răng', 'xà phòng', 'dầu gội', 'toothbrush', 'toothpaste'] },
            { key: 'Y_TẾ_GIA_ĐÌNH', icon: '🏥', name: 'Y TẾ GIA ĐÌNH', keywords: ['nhiệt kế', 'máy đo huyết áp', 'khẩu trang', 'thermometer', 'blood pressure monitor'] }
        ]
    },
    'SÁCH VÀ VĂN PHÒNG PHẨM': {
        icon: '📚',
        name: 'SÁCH VÀ VĂN PHÒNG PHẨM',
        keywords: ['sách', 'vở', 'bút', 'tập', 'dụng cụ học tập', 'văn phòng phẩm', 'books', 'notebooks', 'pens', 'stationery', 'office supplies'],
        subcategories: [
            { key: 'SÁCH', icon: '📖', name: 'SÁCH', keywords: ['sách giáo khoa', 'tiểu thuyết', 'sách tham khảo', 'truyện tranh', 'textbooks', 'novels'] },
            { key: 'VỞ_TẬP', icon: '📓', name: 'VỞ TẬP', keywords: ['vở học sinh', 'tập học sinh', 'sổ tay', 'notebooks', 'student notebooks'] },
            { key: 'BÚT_VIẾT', icon: '🖊️', name: 'BÚT VIẾT', keywords: ['bút bi', 'bút chì', 'bút máy', 'bút màu', 'ballpoint pen', 'pencil', 'fountain pen'] },
            { key: 'VĂN_PHÒNG_PHẨM', icon: '📎', name: 'VĂN PHÒNG PHẨM', keywords: ['kẹp giấy', 'băng keo', 'file hồ sơ', 'stapler', 'tape', 'folders'] }
        ]
    },
    'Ô TÔ VÀ XE MÁY': {
        icon: '🚗',
        name: 'Ô TÔ VÀ XE MÁY',
        keywords: ['ô tô', 'xe máy', 'phụ tùng', 'phụ kiện xe', 'dầu nhớt', 'lốp xe', 'car', 'motorcycle', 'auto parts', 'accessories', 'oil', 'tires'],
        subcategories: [
            { key: 'Ô_TÔ', icon: '🚗', name: 'Ô TÔ', keywords: ['xe hơi', 'phụ tùng ô tô', 'đồ chơi ô tô', 'car', 'auto parts', 'car accessories'] },
            { key: 'XE_MÁY', icon: '🏍️', name: 'XE MÁY', keywords: ['xe máy', 'phụ tùng xe máy', 'nón bảo hiểm', 'motorcycle', 'bike parts', 'helmet'] },
            { key: 'DẦU_NHỚT', icon: '⛽', name: 'DẦU NHỚT', keywords: ['dầu động cơ', 'nhớt xe máy', 'dầu hộp số', 'engine oil', 'motor oil', 'gear oil'] },
            { key: 'LỐP_XE', icon: '🛞', name: 'LỐP XE', keywords: ['lốp ô tô', 'lốp xe máy', 'vá lốp', 'car tires', 'motorcycle tires', 'tire repair'] }
        ]
    },
    'ĐỒ CỔ VÀ ĐỒ SƯU TẦM': {
        icon: '🏺',
        name: 'ĐỒ CỔ VÀ ĐỒ SƯU TẦM',
        keywords: ['đồ cổ', 'tiền cổ', 'tem thư', 'đồ sưu tầm', 'antiques', 'ancient coins', 'stamps', 'collectibles', 'vintage items'],
        subcategories: [
            { key: 'ĐỒ_CỔ', icon: '🏺', name: 'ĐỒ CỔ', keywords: ['đồ cổ Việt Nam', 'đồ cổ Trung Quốc', 'gốm sứ cổ', 'vietnamese antiques', 'chinese antiques'] },
            { key: 'TIỀN_CỔ', icon: '🪙', name: 'TIỀN CỔ', keywords: ['tiền cổ Việt Nam', 'tiền xu cổ', 'giấy bạc cổ', 'ancient coins', 'old currency'] },
            { key: 'TEM_THƯ', icon: '📮', name: 'TEM THƯ', keywords: ['tem thư Việt Nam', 'tem thư thế giới', 'album tem', 'vietnamese stamps', 'world stamps'] },
            { key: 'ĐỒ_SƯU_TẦM', icon: '🎴', name: 'ĐỒ SƯU TẦM', keywords: ['card sưu tầm', 'mô hình', 'figurine', 'collectible cards', 'models'] }
        ]
    },
    'ĐỒ CHƠI VÀ GAME': {
        icon: '🎮',
        name: 'ĐỒ CHƠI VÀ GAME',
        keywords: ['đồ chơi', 'game', 'trò chơi', 'board game', 'video game', 'toys', 'games', 'puzzle', 'lego', 'rubik'],
        subcategories: [
            { key: 'ĐỒ_CHƠI_TRẺ_EM', icon: '🧸', name: 'ĐỒ CHƠI TRẺ EM', keywords: ['xe đồ chơi', 'búp bê', 'xếp hình', 'kids toys', 'dolls', 'building blocks'] },
            { key: 'BOARD_GAME', icon: '🎲', name: 'BOARD GAME', keywords: ['cờ vua', 'cờ caro', 'uno', 'monopoly', 'chess', 'checkers', 'card games'] },
            { key: 'VIDEO_GAME', icon: '🎮', name: 'VIDEO GAME', keywords: ['game ps4', 'game ps5', 'game nintendo', 'playstation', 'xbox', 'nintendo switch'] },
            { key: 'PUZZLE', icon: '🧩', name: 'PUZZLE', keywords: ['xếp hình', 'rubik', 'jigsaw puzzle', 'lego', 'rubik cube'] }
        ]
    },
    'ĐỒ DÙNG GIA ĐÌNH': {
        icon: '🏠',
        name: 'ĐỒ DÙNG GIA ĐÌNH',
        keywords: ['đồ dùng gia đình', 'đồ gia dụng', 'nội thất', 'đồ dùng nhà bếp', 'đồ dùng phòng ngủ', 'household items', 'home supplies', 'furniture', 'kitchenware'],
        subcategories: [
            { key: 'NỘI_THẤT', icon: '🛏️', name: 'NỘI THẤT', keywords: ['sofa', 'bàn ghế', 'tủ quần áo', 'giường ngủ', 'sofa', 'tables', 'wardrobe', 'bed'] },
            { key: 'NHÀ_BẾP', icon: '🍳', name: 'ĐỒ DÙNG NHÀ BẾP', keywords: ['nồi', 'chảo', 'bát', 'đĩa', 'đồ dùng nấu ăn', 'pots', 'pans', 'bowls', 'plates'] },
            { key: 'PHÒNG_NGỦ', icon: '🛏️', name: 'ĐỒ DÙNG PHÒNG NGỦ', keywords: ['chăn ga gối', 'tủ đầu giường', 'đèn ngủ', 'bedding', 'nightstand', 'bed lamp'] },
            { key: 'PHÒNG_KHÁCH', icon: '🛋️', name: 'ĐỒ DÙNG PHÒNG KHÁCH', keywords: ['kệ tivi', 'tủ rượu', 'đèn trang trí', 'tv stand', 'wine cabinet', 'decoration lights'] }
        ]
    },
    'ĐỒ DÙNG CÁ NHÂN': {
        icon: '👜',
        name: 'ĐỒ DÙNG CÁ NHÂN',
        keywords: ['đồ dùng cá nhân', 'túi xách', 'ví tiền', 'đồng hồ', 'mắt kính', 'personal items', 'handbags', 'wallets', 'watches', 'glasses'],
        subcategories: [
            { key: 'TÚI_XÁCH', icon: '👜', name: 'TÚI XÁCH', keywords: ['túi nữ', 'balo', 'cặp sách', 'handbags', 'backpacks', 'briefcases'] },
            { key: 'VÍ_TIỀN', icon: '👛', name: 'VÍ TIỀN', keywords: ['ví nam', 'ví nữ', 'ví cầm tay', 'wallets', 'purses', 'clutches'] },
            { key: 'ĐỒNG_HỒ', icon: '⌚', name: 'ĐỒNG HỒ', keywords: ['đồng hồ nam', 'đồng hồ nữ', 'đồng hồ treo tường', 'watches', 'wall clocks'] },
            { key: 'MẮT_KÍNH', icon: '👓', name: 'MẮT KÍNH', keywords: ['kính mát', 'gọng kính', 'tròng kính', 'sunglasses', 'eyeglasses', 'lenses'] }
        ]
    },
    'ĐỒ ĂN VÀ ĐỒ UỐNG': {
        icon: '🍜',
        name: 'ĐỒ ĂN VÀ ĐỒ UỐNG',
        keywords: ['đồ ăn', 'đồ uống', 'thực phẩm', 'bánh kẹo', 'trái cây', 'rau củ', 'food', 'beverages', 'groceries', 'snacks', 'fruits', 'vegetables'],
        subcategories: [
            { key: 'THỰC_PHẨM_TƯƠI', icon: '🥩', name: 'THỰC PHẨM TƯƠI', keywords: ['thịt', 'cá', 'rau củ', 'trái cây', 'meat', 'fish', 'vegetables', 'fruits'] },
            { key: 'ĐỒ_KHÔ', icon: '🍜', name: 'ĐỒ KHÔ', keywords: ['mì gói', 'ngũ cốc', 'đồ hộp', 'instant noodles', 'cereals', 'canned food'] },
            { key: 'BÁNH_KẸO', icon: '🍬', name: 'BÁNH KẸO', keywords: ['kẹo', 'bánh ngọt', 'snack', 'candy', 'cakes', 'snacks'] },
            { key: 'ĐỒ_UỐNG', icon: '🥤', name: 'ĐỒ UỐNG', keywords: ['nước ngọt', 'bia', 'rượu', 'trà', 'cà phê', 'soft drinks', 'beer', 'wine', 'tea', 'coffee'] }
        ]
    },
    'ĐỒ DÙNG MẸ VÀ BÉ': {
        icon: '👶',
        name: 'ĐỒ DÙNG MẸ VÀ BÉ',
        keywords: ['đồ dùng mẹ bé', 'sữa bột', 'tã bỉm', 'quần áo trẻ em', 'đồ chơi trẻ em', 'baby supplies', 'milk powder', 'diapers', 'baby clothes', 'baby toys'],
        subcategories: [
            { key: 'SỮA_BỘT', icon: '🍼', name: 'SỮA BỘT', keywords: ['sữa cho bé', 'sữa công thức', 'sữa mẹ', 'baby formula', 'infant formula'] },
            { key: 'TÃ_BỈM', icon: '🧷', name: 'TÃ BỈM', keywords: ['tã dán', 'tã quần', 'bỉm', 'diapers', 'baby diapers'] },
            { key: 'QUẦN_ÁO_TRẺ_EM', icon: '👕', name: 'QUẦN ÁO TRẺ EM', keywords: ['quần áo sơ sinh', 'quần áo trẻ em', 'baby clothes', 'kids clothing'] },
            { key: 'ĐỒ_DÙNG_TRẺ_EM', icon: '🧸', name: 'ĐỒ DÙNG TRẺ EM', keywords: ['xe đẩy', 'cũi', 'ghế ăn', 'stroller', 'crib', 'high chair'] }
        ]
    }
} as const

// Complete locations - All provinces and cities in Vietnam (63 tỉnh thành)
export const LOCATIONS = [
    // Thành phố trực thuộc trung ương (5 thành phố lớn)
    'HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ',

    // Miền Bắc (25 tỉnh)
    'BẮC GIANG', 'BẮC KẠN', 'BẮC NINH', 'CAO BẰNG', 'ĐIỆN BIÊN',
    'HÀ GIANG', 'HÀ NAM', 'HÀ TĨNH', 'HẢI DƯƠNG', 'HÒA BÌNH',
    'HƯNG YÊN', 'LẠNG SƠN', 'LÀO CAI', 'NAM ĐỊNH', 'NGHỆ AN',
    'NINH BÌNH', 'PHÚ THỌ', 'QUẢNG NINH', 'SƠN LA', 'THÁI BÌNH',
    'THÁI NGUYÊN', 'THANH HÓA', 'TUYÊN QUANG', 'VĨNH PHÚC', 'YÊN BÁI',

    // Miền Trung (14 tỉnh)
    'BÌNH ĐỊNH', 'BÌNH THUẬN', 'KHÁNH HÒA', 'KONTUM', 'LÂM ĐỒNG',
    'NINH THUẬN', 'PHÚ YÊN', 'QUẢNG BÌNH', 'QUẢNG NAM', 'QUẢNG NGÃI',
    'QUẢNG TRỊ', 'THỪA THIÊN HUẾ',

    // Miền Nam (19 tỉnh)
    'AN GIANG', 'BẠC LIÊU', 'BẾN TRE', 'BÌNH DƯƠNG', 'BÌNH PHƯỚC',
    'CÀ MAU', 'ĐẮK LẮK', 'ĐẮK NÔNG', 'ĐỒNG NAI', 'ĐỒNG THÁP',
    'GIA LAI', 'HẬU GIANG', 'KIÊN GIANG', 'LONG AN', 'SÓC TRĂNG',
    'TÂY NINH', 'TIỀN GIANG', 'TRÀ VINH', 'VĨNH LONG',

    // Các địa danh phổ biến khác
    'VŨNG TÀU', 'BUÔN MA THUỘT', 'QUY NHƠN', 'NHA TRANG', 'ĐÀ LẠT',
    'PHAN THIẾT', 'MỸ THO', 'VĨNH YÊN', 'BẮC NINH', 'THỦ DẦU MỘT',
    'BIÊN HÒA', 'VŨNG TÀU', 'RẠCH GIÁ', 'CẦU GIẤY', 'TÂN BÌNH',
    'BÌNH THẠNH', 'QUẬN 1', 'QUẬN 3', 'QUẬN 7', 'QUẬN 10'
] as const

// Districts and cities for major provinces - Đầy đủ hành chính Việt Nam
export const DISTRICTS: Record<string, string[]> = {
    // Hà Nội - 30 quận huyện
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

    // TP.HCM - 24 quận huyện
    'TP.HỒ CHÍ MINH': [
        'QUẬN 1', 'QUẬN 2', 'QUẬN 3', 'QUẬN 4', 'QUẬN 5', 'QUẬN 6',
        'QUẬN 7', 'QUẬN 8', 'QUẬN 9', 'QUẬN 10', 'QUẬN 11', 'QUẬN 12',
        'QUẬN THỦ ĐỨC', 'QUẬN BÌNH THẠNH', 'QUẬN GÒ VẤP', 'QUẬN TÂN BÌNH',
        'QUẬN TÂN PHÚ', 'QUẬN PHÚ NHUẬN', 'QUẬN BÌNH TÂN', 'QUẬN HỐC MÔN',
        'QUẬN CỦ CHI', 'QUẬN BÌNH CHÁNH', 'QUẬN NHÀ BÈ', 'QUẬN CẦN GIỜ'
    ],

    // Các tỉnh lớn khác
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

    // Các tỉnh khác sẽ trả về mảng rỗng và xử lý chung
    'AN GIANG': [], 'BẠC LIÊU': [], 'BẾN TRE': [], 'BÌNH PHƯỚC': [],
    'CÀ MAU': [], 'ĐẮK LẮK': [], 'ĐẮK NÔNG': [], 'ĐỒNG THÁP': [],
    'GIA LAI': [], 'HẬU GIANG': [], 'KIÊN GIANG': [], 'LONG AN': [],
    'SÓC TRĂNG': [], 'TÂY NINH': [], 'TIỀN GIANG': [], 'TRÀ VINH': [],
    'VĨNH LONG': [], 'BẮC GIANG': [], 'BẮC KẠN': [], 'BẮC NINH': [],
    'CAO BẰNG': [], 'ĐIỆN BIÊN': [], 'HÀ GIANG': [], 'HÀ NAM': [],
    'HÀ TĨNH': [], 'HẢI DƯƠNG': [], 'HÒA BÌNH': [], 'HƯNG YÊN': [],
    'LẠNG SƠN': [], 'LÀO CAI': [], 'NAM ĐỊNH': [], 'NGHỆ AN': [],
    'NINH BÌNH': [], 'PHÚ THỌ': [], 'QUẢNG NINH': [], 'SƠN LA': [],
    'THÁI BÌNH': [], 'THÁI NGUYÊN': [], 'THANH HÓA': [], 'TUYÊN QUANG': [],
    'VĨNH PHÚC': [], 'YÊN BÁI': [], 'BÌNH ĐỊNH': [], 'BÌNH THUẬN': [],
    'KHÁNH HÒA': [], 'KONTUM': [], 'LÂM ĐỒNG': [], 'NINH THUẬN': [],
    'PHÚ YÊN': [], 'QUẢNG BÌNH': [], 'QUẢNG NAM': [], 'QUẢNG NGÃI': [],
    'QUẢNG TRỊ': [], 'THỪA THIÊN HUẾ': []
}

// Wards for major districts (Phường xã cho các quận huyện lớn)
export const WARDS: Record<string, string[]> = {
    'QUẬN 1': [
        'PHƯỜNG BẾN NGHÉ', 'PHƯỜNG BẾN THÀNH', 'PHƯỜNG CẦU KHO', 'PHƯỜNG CẦU ÔNG LÃNH',
        'PHƯỜNG CÔ GIANG', 'PHƯỜNG ĐA KAO', 'PHƯỜNG NGUYỄN CƯ TRINH', 'PHƯỜNG NGUYỄN THÁI BÌNH',
        'PHƯỜNG PHẠM NGŨ LÃO', 'PHƯỜNG TÂN ĐỊNH'
    ],
    'QUẬN 3': [
        'PHƯỜNG 1', 'PHƯỜNG 2', 'PHƯỜNG 3', 'PHƯỜNG 4', 'PHƯỜNG 5',
        'PHƯỜNG 6', 'PHƯỜNG 7', 'PHƯỜNG 8', 'PHƯỜNG 9', 'PHƯỜNG 10',
        'PHƯỜNG 11', 'PHƯỜNG 12', 'PHƯỜNG 13', 'PHƯỜNG 14'
    ],
    'QUẬN 7': [
        'PHƯỜNG BÌNH THUẬN', 'PHƯỜNG PHÚ MỸ', 'PHƯỜNG PHÚ THUẬN', 'PHƯỜNG TÂN HƯNG',
        'PHƯỜNG TÂN KIÊNG', 'PHƯỜNG TÂN PHÚ', 'PHƯỜNG TÂN QUY', 'PHƯỜNG TÂN THUẬN ĐÔNG',
        'PHƯỜNG TÂN THUẬN TÂY'
    ],
    'QUẬN BÌNH THẠNH': [
        'PHƯỜNG 1', 'PHƯỜNG 2', 'PHƯỜNG 3', 'PHƯỜNG 5', 'PHƯỜNG 6',
        'PHƯỜNG 7', 'PHƯỜNG 11', 'PHƯỜNG 12', 'PHƯỜNG 13', 'PHƯỜNG 14',
        'PHƯỜNG 15', 'PHƯỜNG 17', 'PHƯỜNG 19', 'PHƯỜNG 21', 'PHƯỜNG 22',
        'PHƯỜNG 24', 'PHƯỜNG 25', 'PHƯỜNG 26', 'PHƯỜNG 27', 'PHƯỜNG 28'
    ],
    'QUẬN TÂN BÌNH': [
        'PHƯỜNG 1', 'PHƯỜNG 2', 'PHƯỜNG 3', 'PHƯỜNG 4', 'PHƯỜNG 5',
        'PHƯỜNG 6', 'PHƯỜNG 7', 'PHƯỜNG 8', 'PHƯỜNG 9', 'PHƯỜNG 10',
        'PHƯỜNG 11', 'PHƯỜNG 12', 'PHƯỜNG 13', 'PHƯỜNG 14', 'PHƯỜNG 15'
    ],
    'QUẬN GÒ VẤP': [
        'PHƯỜNG 1', 'PHƯỜNG 3', 'PHƯỜNG 4', 'PHƯỜNG 5', 'PHƯỜNG 6',
        'PHƯỜNG 7', 'PHƯỜNG 8', 'PHƯỜNG 9', 'PHƯỜNG 10', 'PHƯỜNG 11',
        'PHƯỜNG 12', 'PHƯỜNG 13', 'PHƯỜNG 14', 'PHƯỜNG 15', 'PHƯỜNG 16',
        'PHƯỜNG 17'
    ],
    'QUẬN THỦ ĐỨC': [
        'PHƯỜNG AN KHÁNH', 'PHƯỜNG AN PHÚ', 'PHƯỜNG BÌNH CHỬU', 'PHƯỜNG BÌNH THỌ',
        'PHƯỜNG CÁT LÁI', 'PHƯỜNG HIỆP BÌNH CHÁNH', 'PHƯỜNG HIỆP BÌNH PHƯỚC',
        'PHƯỜNG HIỆP PHÚ', 'PHƯỜNG LINH CHIỂU', 'PHƯỜNG LINH ĐÔNG',
        'PHƯỜNG LINH TÂY', 'PHƯỜNG LINH TRUNG', 'PHƯỜNG LINH XUÂN',
        'PHƯỜNG LONG BÌNH', 'PHƯỜNG LONG PHƯỚC', 'PHƯỜNG LONG THẠNH MỸ',
        'PHƯỜNG LONG TRƯỜNG', 'PHƯỜNG PHÚ HỮU', 'PHƯỜNG PHƯỚC BÌNH',
        'PHƯỜNG PHƯỚC LONG A', 'PHƯỜNG PHƯỚC LONG B', 'PHƯỜNG TÂN PHÚ',
        'PHƯỜNG THẢO ĐIỀN', 'PHƯỜNG THỦ THIÊM', 'PHƯỜNG TRƯỜNG THẠNH',
        'PHƯỜNG TRƯỜNG THỌ'
    ]
}

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

// Enhanced Keywords System for Better UX
export const KEYWORDS_SYSTEM = {
    // Từ khóa phổ biến nhất - Hiển thị đầu tiên
    POPULAR_KEYWORDS: [
        'nhà', 'xe', 'điện thoại', 'laptop', 'gia sư', 'massage',
        'cơm', 'phở', 'cà phê', 'trà sữa', 'váy', 'áo', 'giày',
        'thuốc', 'bệnh viện', 'sửa chữa', 'vận chuyển', 'nội thất'
    ],

    // Từ khóa theo danh mục - Tổ chức thông minh
    CATEGORIES_KEYWORDS: {
        'Y TẾ': {
            primary: [
                'khám bệnh', 'thuốc', 'bệnh viện', 'phòng khám', 'nha khoa',
                'mắt', 'da liễu', 'sản phụ khoa', 'nội khoa', 'nhi khoa'
            ],
            secondary: [
                'đông y', 'thuốc nam', 'thuốc bắc', 'châm cứu', 'bấm huyệt',
                'siêu âm', 'xét nghiệm', 'vật lý trị liệu', 'tâm lý', 'thẩm mỹ',
                'thú y', 'chẩn đoán hình ảnh', 'x-quang', 'ct scan', 'mri'
            ],
            specialized: [
                'huyết áp', 'tiểu đường', 'tim mạch', 'ung thư', 'thần kinh',
                'hô hấp', 'tiêu hóa', 'thận tiết niệu', 'cơ xương khớp', 'dị ứng',
                'tai mũi họng', 'nhiễm trùng', 'dinh dưỡng', 'vaccine', 'khám sức khỏe'
            ]
        },
        'BẤT ĐỘNG SẢN': {
            primary: [
                'nhà ở', 'chung cư', 'mặt bằng', 'đất nền', 'biệt thự',
                'nhà phố', 'căn hộ', 'văn phòng', 'kho bãi', 'đất thổ cư'
            ],
            secondary: [
                'nhà cấp 4', 'nhà mặt tiền', 'nhà hẻm', 'penthouse', 'duplex',
                'studio', 'loft', 'officetel', 'shophouse', 'condotel'
            ],
            specialized: [
                'nhà nguyên căn', 'nhà xây sẵn', 'đất dự án', 'đất nông nghiệp',
                'nhà xưởng', 'khu công nghiệp', 'nhà trọ', 'phòng trọ', 'căn hộ dịch vụ'
            ]
        },
        'Ô TÔ': {
            primary: [
                'xe hơi', 'ô tô', 'honda', 'toyota', 'mazda',
                'hyundai', 'kia', 'ford', 'nissan', 'mitsubishi'
            ],
            secondary: [
                'sedan', 'suv', 'hatchback', 'pickup', 'crossover',
                'xe điện', 'xe hybrid', 'xe số sàn', 'xe số tự động', 'xe nhập khẩu'
            ],
            specialized: [
                'honda city', 'toyota vios', 'mazda cx-5', 'ford ranger', 'toyota fortuner',
                'honda cr-v', 'hyundai tucson', 'kia cerato', 'toyota hilux', 'isuzu d-max'
            ]
        },
        'ĐIỆN TỬ': {
            primary: [
                'điện thoại', 'laptop', 'máy tính', 'tablet', 'phụ kiện',
                'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo'
            ],
            secondary: [
                'macbook', 'dell', 'hp', 'asus', 'lenovo',
                'ipad', 'surface', 'gaming laptop', 'ultrabook', 'chromebook'
            ],
            specialized: [
                'tai nghe', 'sạc dự phòng', 'ốp lưng', 'củ sạc', 'cáp sạc',
                'miếng dán màn hình', 'thẻ nhớ', 'usb', 'chuột máy tính', 'bàn phím'
            ]
        },
        'THỜI TRANG': {
            primary: [
                'quần áo', 'váy', 'áo', 'quần', 'giày dép',
                'túi xách', 'đồng hồ', 'trang sức', 'nước hoa', 'phụ kiện'
            ],
            secondary: [
                'áo sơ mi', 'quần jean', 'áo thun', 'váy maxi', 'váy ngắn',
                'giày sneaker', 'giày cao gót', 'túi tote', 'túi clutch', 'đồng hồ cơ'
            ],
            specialized: [
                'áo khoác', 'quần short', 'áo polo', 'váy công sở', 'giày boot',
                'túi backpack', 'ví da', 'nhẫn', 'dây chuyền', 'bông tai'
            ]
        },
        'ẨM THỰC': {
            primary: [
                'cơm', 'phở', 'bún', 'cà phê', 'trà sữa',
                'bánh mì', 'bánh ngọt', 'trái cây', 'thức uống', 'đồ ăn'
            ],
            secondary: [
                'cơm tấm', 'phở bò', 'bún chả', 'cà phê sữa đá', 'trà sữa trân châu',
                'bánh mì thịt', 'bánh kem', 'sinh tố', 'nước ép', 'bia rượu'
            ],
            specialized: [
                'cơm văn phòng', 'phở gà', 'bún bò', 'cappuccino', 'latte',
                'croissant', 'macaron', 'smoothie', 'cocktail', 'mocktail'
            ]
        },
        'DỊCH VỤ': {
            primary: [
                'gia sư', 'massage', 'sửa chữa', 'vận chuyển', 'nấu ăn',
                'dọn dẹp', 'trông trẻ', 'làm đẹp', 'taxi', 'giao hàng'
            ],
            secondary: [
                'dạy kèm', 'xoa bóp', 'sửa điện', 'chuyển nhà', 'đầu bếp',
                'giúp việc', 'babysitter', 'spa', 'grab', 'uber'
            ],
            specialized: [
                'luyện thi', 'bấm huyệt', 'sửa chữa ô tô', 'cho thuê xe', 'catering',
                'tổng vệ sinh', 'chăm sóc người già', 'nails', 'makeup', 'haircut'
            ]
        },
        'ĐỒ GIA DỤNG': {
            primary: [
                'nội thất', 'điện gia dụng', 'nhà bếp', 'trang trí', 'đồ dùng',
                'sofa', 'tủ lạnh', 'máy giặt', 'điều hòa', 'bếp gas'
            ],
            secondary: [
                'bàn ghế', 'tủ quần áo', 'giường ngủ', 'lò vi sóng', 'máy hút bụi',
                'nồi cơm điện', 'chảo chống dính', 'bình đun siêu tốc', 'quạt điện', 'đèn trang trí'
            ],
            specialized: [
                'kệ sách', 'tủ giày', 'gương soi', 'ấm trà', 'dao thớt',
                'ly tách', 'đèn ngủ', 'thảm trải sàn', 'rèm cửa', 'đồng hồ treo tường'
            ]
        },
        'THỂ THAO': {
            primary: [
                'gym', 'bóng đá', 'cầu lông', 'bơi lội', 'yoga',
                'fitness', 'tennis', 'chạy bộ', 'đạp xe', 'aerobics'
            ],
            secondary: [
                'máy chạy bộ', 'tạ tay', 'quả bóng', 'vợt cầu lông', 'áo bóng đá',
                'giày sneaker', 'áo thun thể thao', 'quần short', 'kính bơi', 'mũ bảo hiểm'
            ],
            specialized: [
                'protein', 'whey', 'thảm yoga', 'dây nhảy', 'găng tay boxing',
                'vợt tennis', 'giày đá bóng', 'áo bơi', 'mũ lưỡi trai', 'balo thể thao'
            ]
        },
        'SÁCH': {
            primary: [
                'sách giáo khoa', 'tiểu thuyết', 'sách kinh tế', 'sách thiếu nhi', 'tài liệu',
                'truyện tranh', 'sách học tiếng anh', 'sách kỹ năng', 'sách nấu ăn', 'sách lịch sử'
            ],
            secondary: [
                'sách toán', 'sách lý', 'sách hóa', 'sách văn', 'sách anh văn',
                'harry potter', 'doraemon', 'conan', 'one piece', 'dragon ball'
            ],
            specialized: [
                'ielts', 'toeic', 'toeic', 'tiếng nhật', 'tiếng hàn', 'tiếng trung',
                'marketing', 'kinh doanh', 'tài chính', 'ngân hàng', 'bất động sản'
            ]
        },
        'ĐỒ CHƠI': {
            primary: [
                'đồ chơi trẻ em', 'lego', 'puzzle', 'board game', 'video game',
                'xe đồ chơi', 'búp bê', 'khối xếp hình', 'trò chơi giáo dục', 'đồ chơi gỗ'
            ],
            secondary: [
                'rubik', 'cờ vua', 'cờ caro', 'uno', 'domino',
                'xếp hình', 'truyện tranh', 'mô hình', 'đồ chơi điều khiển', 'bóng rổ mini'
            ],
            specialized: [
                'flashcard', 'thẻ học', 'đồ chơi phát triển trí tuệ', 'đồ chơi vận động',
                'đồ chơi nhập vai', 'đồ chơi âm nhạc', 'đồ chơi khoa học', 'stem toys'
            ]
        },
        'NÔNG NGHIỆP': {
            primary: [
                'cây giống', 'vật nuôi', 'phân bón', 'thuốc trừ sâu', 'máy nông nghiệp',
                'thủy sản', 'cây ăn quả', 'gia súc', 'gia cầm', 'cá giống'
            ],
            secondary: [
                'hạt giống', 'cây công nghiệp', 'thú cưng', 'phân hữu cơ', 'thuốc diệt cỏ',
                'máy cày', 'tôm giống', 'cua giống', 'thức ăn chăn nuôi', 'máy tưới'
            ],
            specialized: [
                'cây giống nhập khẩu', 'giống thuần chủng', 'phân vi sinh', 'thuốc sinh học',
                'máy gặt đập liên hợp', 'lưới nuôi cá', 'hệ thống tưới nhỏ giọt', 'nhà kính',
                'máy ấp trứng', 'máy chế biến thức ăn chăn nuôi'
            ]
        },
        'XÂY DỰNG': {
            primary: [
                'vật liệu xây dựng', 'thi công', 'thiết kế', 'nội thất', 'điện nước',
                'xi măng', 'gạch', 'sắt thép', 'cát đá', 'nhà thầu'
            ],
            secondary: [
                'thiết kế nhà', 'kiến trúc sư', 'đội thợ', 'lắp đặt điện', 'lắp đặt nước',
                'điều hòa', 'cửa nhôm', 'cửa gỗ', 'sơn nước', 'gạch men'
            ],
            specialized: [
                'thiết kế biệt thự', 'thi công nhà xưởng', 'lắp đặt điện thông minh', 'hệ thống nước nóng',
                'cửa chống cháy', 'sơn chống thấm', 'gạch nhập khẩu', 'thép xây dựng',
                'máy khoan bê tông', 'giàn giáo xây dựng'
            ]
        },
        'MỸ PHẨM': {
            primary: [
                'chăm sóc da', 'trang điểm', 'nước hoa', 'chăm sóc tóc', 'chăm sóc móng',
                'kem dưỡng', 'son môi', 'phấn nền', 'dầu gội', 'sơn móng'
            ],
            secondary: [
                'sữa rửa mặt', 'toner', 'serum', 'mặt nạ', 'mascara', 'eyeliner',
                'nước hoa nam', 'nước hoa nữ', 'dầu xả', 'thuốc nhuộm tóc'
            ],
            specialized: [
                'kem chống nắng', 'serum vitamin c', 'mặt nạ đất sét', 'son lì', 'phấn nước',
                'nước hoa chính hãng', 'dầu dưỡng tóc', 'gel vuốt tóc', 'sơn gel', 'dụng cụ nail'
            ]
        },
        'ĐỒ THỂ THAO': {
            primary: [
                'quần áo thể thao', 'giày thể thao', 'dụng cụ thể thao', 'phụ kiện thể thao',
                'áo thun', 'quần short', 'giày sneaker', 'tạ tay', 'bóng đá'
            ],
            secondary: [
                'áo tank top', 'leggings', 'giày chạy bộ', 'máy chạy bộ', 'xà đơn',
                'mũ lưỡi trai', 'túi thể thao', 'bình nước', 'đồng hồ thể thao', 'găng tay'
            ],
            specialized: [
                'áo compression', 'quần bó cơ', 'giày bóng rổ', 'vợt cầu lông', 'thảm yoga',
                'protein whey', 'bcaa', 'dây nhảy', 'bóng rổ', 'lưới cầu lông'
            ]
        },
        'ĐỒ ĐIỆN GIA DỤNG': {
            primary: [
                'điện lạnh', 'máy giặt', 'nhà bếp', 'làm sạch', 'điều hòa',
                'tủ lạnh', 'máy sấy', 'lò vi sóng', 'máy hút bụi', 'quạt điện'
            ],
            secondary: [
                'máy lạnh', 'máy giặt cửa trước', 'bếp điện', 'máy lau nhà', 'quạt điều hòa',
                'tủ đông', 'máy sấy quần áo', 'nồi cơm điện', 'máy lọc không khí', 'quạt trần'
            ],
            specialized: [
                'điều hòa inverter', 'tủ lạnh side by side', 'máy giặt sấy khối', 'bếp từ đôi',
                'máy hút bụi công nghiệp', 'máy lọc nước', 'quạt phun sương', 'đèn sưởi nhà tắm',
                'máy xay sinh tố', 'nồi áp suất điện'
            ]
        },
        'SỨC KHỎE': {
            primary: [
                'thực phẩm chức năng', 'dinh dưỡng', 'chăm sóc cá nhân', 'y tế gia đình',
                'vitamin', 'sữa bột', 'bàn chải đánh răng', 'nhiệt kế', 'khẩu trang'
            ],
            secondary: [
                'khoáng chất', 'collagen', 'omega 3', 'ngũ cốc', 'thực phẩm ăn kiêng',
                'kem đánh răng', 'xà phòng', 'máy đo huyết áp', 'khẩu trang y tế', 'nước súc miệng'
            ],
            specialized: [
                'vitamin c', 'canxi', 'sắt', 'kẽm', 'probiotics',
                'sữa ensure', 'sữa anlene', 'bàn chải điện', 'nhiệt kế điện tử', 'khẩu trang n95'
            ]
        },
        'SÁCH VÀ VĂN PHÒNG PHẨM': {
            primary: [
                'sách', 'vở tập', 'bút viết', 'văn phòng phẩm', 'sách giáo khoa',
                'vở học sinh', 'bút bi', 'kẹp giấy', 'file hồ sơ', 'sổ tay'
            ],
            secondary: [
                'tiểu thuyết', 'sách tham khảo', 'tập học sinh', 'bút chì', 'băng keo',
                'truyện tranh', 'sách kỹ năng', 'sổ công tác', 'bút máy', 'bao thư'
            ],
            specialized: [
                'sách ielts', 'sách toeic', 'sách tiếng nhật', 'bút kỹ thuật', 'máy tính cầm tay',
                'sách marketing', 'sách kinh doanh', 'sổ da', 'bút dạ quang', 'giấy in'
            ]
        },
        'Ô TÔ VÀ XE MÁY': {
            primary: [
                'ô tô', 'xe máy', 'phụ tùng', 'dầu nhớt', 'lốp xe',
                'phụ tùng ô tô', 'phụ tùng xe máy', 'dầu động cơ', 'lốp ô tô', 'nón bảo hiểm'
            ],
            secondary: [
                'đồ chơi ô tô', 'phụ kiện xe máy', 'nhớt xe máy', 'lốp xe máy', 'ắc quy',
                'dầu hộp số', 'lọc dầu', 'bugi', 'dây curoa', 'mâm xe'
            ],
            specialized: [
                'camera hành trình', 'đầu dvd ô tô', 'loa sub', 'dầu tổng hợp', 'lốp michelin',
                'nón fullface', 'nón 3/4', 'phuộc xe máy', 'heo dầu', 'mâm đúc'
            ]
        },
        'ĐỒ CỔ VÀ ĐỒ SƯU TẦM': {
            primary: [
                'đồ cổ', 'tiền cổ', 'tem thư', 'đồ sưu tầm', 'gốm sứ cổ',
                'tiền cổ Việt Nam', 'tem thư Việt Nam', 'card sưu tầm', 'mô hình cổ', 'tượng cổ'
            ],
            secondary: [
                'đồ cổ Trung Quốc', 'tiền xu cổ', 'tem thư thế giới', 'album tem', 'mô hình xe',
                'đồ đồng cổ', 'sứ cổ', 'họa tiết cổ', 'đồ gỗ cổ', 'tranh cổ'
            ],
            specialized: [
                'tiền Đông Dương', 'tem quý hiếm', 'card pokemon', 'mô hình máy bay', 'tượng đồng',
                'bình cổ', 'chén cổ', 'đĩa cổ', 'lọ hoa cổ', 'đèn dầu cổ'
            ]
        },
        'ĐỒ CHƠI VÀ GAME': {
            primary: [
                'đồ chơi trẻ em', 'board game', 'video game', 'puzzle', 'xe đồ chơi',
                'cờ vua', 'game ps4', 'xếp hình', 'búp bê', 'trò chơi điện tử'
            ],
            secondary: [
                'cờ caro', 'uno', 'game nintendo', 'rubik', 'khối xếp hình',
                'domino', 'game mobile', 'lego', 'bóng rổ mini', 'truyện tranh'
            ],
            specialized: [
                'monopoly', 'chess set', 'game ps5', 'rubik 3x3', 'lego creator',
                'card game', 'board game gia đình', 'puzzle 1000 mảnh', 'xếp hình 3d', 'đồ chơi gỗ'
            ]
        },
        'ĐỒ DÙNG GIA ĐÌNH': {
            primary: [
                'nội thất', 'nhà bếp', 'phòng ngủ', 'phòng khách', 'sofa',
                'nồi chảo', 'chăn ga gối', 'kệ tivi', 'bàn ghế', 'tủ quần áo'
            ],
            secondary: [
                'đồ gỗ', 'đồ dùng nấu ăn', 'tủ đầu giường', 'tủ rượu', 'giường ngủ',
                'dao thớt', 'ly tách', 'đèn ngủ', 'thảm trải sàn', 'rèm cửa'
            ],
            specialized: [
                'sofa da', 'nồi chống dính', 'chăn lông vũ', 'kệ tivi treo tường', 'bàn ăn gỗ',
                'dao nhật', 'ly thủy tinh', 'đèn led', 'thảm persian', 'rèm vải'
            ]
        },
        'ĐỒ DÙNG CÁ NHÂN': {
            primary: [
                'túi xách', 'ví tiền', 'đồng hồ', 'mắt kính', 'túi nữ',
                'ví nam', 'đồng hồ nam', 'kính mát', 'balo', 'cặp sách'
            ],
            secondary: [
                'ví cầm tay', 'đồng hồ nữ', 'gọng kính', 'túi tote', 'ví da',
                'đồng hồ treo tường', 'tròng kính', 'túi clutch', 'balo laptop', 'cặp da'
            ],
            specialized: [
                'túi gucci', 'ví hermes', 'đồng hồ rolex', 'kính rayban', 'balo jansport',
                'ví montblanc', 'đồng hồ citizen', 'kính oakley', 'túi backpack', 'cặp công sở'
            ]
        },
        'ĐỒ ĂN VÀ ĐỒ UỐNG': {
            primary: [
                'thực phẩm tươi', 'đồ khô', 'bánh kẹo', 'đồ uống', 'thịt',
                'mì gói', 'kẹo', 'nước ngọt', 'cá', 'ngũ cốc'
            ],
            secondary: [
                'rau củ', 'đồ hộp', 'bánh ngọt', 'bia rượu', 'trái cây',
                'gia vị', 'snack', 'trà', 'hải sản', 'thức ăn nhanh'
            ],
            specialized: [
                'thịt bò úc', 'mì ý', 'chocolate nhập khẩu', 'rượu vang', 'tôm hùm',
                'rau hữu cơ', 'đồ hộp organic', 'bánh trung thu', 'whisky', 'cà phê nguyên chất'
            ]
        },
        'ĐỒ DÙNG MẸ VÀ BÉ': {
            primary: [
                'sữa bột', 'tã bỉm', 'quần áo trẻ em', 'đồ dùng trẻ em', 'sữa cho bé',
                'tã dán', 'áo sơ sinh', 'xe đẩy', 'sữa công thức', 'tã quần'
            ],
            secondary: [
                'sữa mẹ', 'bỉm', 'quần áo sơ sinh', 'cũi', 'thức ăn dặm',
                'sữa bột ngoại', 'khăn sữa', 'ghế ăn', 'đồ chơi sơ sinh', 'bình sữa'
            ],
            specialized: [
                'sữa similac', 'tã pampers', 'áo bodysuit', 'xe đẩy combi', 'sữa nan',
                'bỉm merries', 'quần yếm', 'cũi đa năng', 'cháo ăn liền', 'bình sữa avent'
            ]
        }
    },

    // Từ khóa theo ngữ cảnh sử dụng
    CONTEXT_KEYWORDS: {
        'urgent': ['gấp', 'khẩn cấp', 'cần ngay', 'hỏa tốc', 'emergency'],
        'bargain': ['giá rẻ', 'khuyến mãi', 'sale', 'giảm giá', 'bargain', 'cheap'],
        'premium': ['cao cấp', 'sang trọng', 'premium', 'luxury', 'high-end'],
        'new': ['mới', 'mới tinh', 'chưa sử dụng', 'brand new', 'sealed'],
        'used': ['đã sử dụng', 'second hand', 'cũ nhưng tốt', 'used', 'pre-owned'],
        'local': ['gần nhà', 'cùng khu vực', 'local', 'nearby', 'trong vùng']
    },

    // Từ khóa gợi ý theo mùa/vụ
    SEASONAL_KEYWORDS: {
        'tet': ['tết', 'năm mới', 'holiday', 'festival', 'quà tết'],
        'summer': ['mùa hè', 'summer', 'du lịch', 'vacation', 'nghỉ mát'],
        'back_to_school': ['tựu trường', 'học sinh', 'sinh viên', 'school', 'university'],
        'wedding': ['cưới hỏi', 'đám cưới', 'wedding', 'hôn lễ', 'áo cưới']
    }
} as const

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

    // Get wards for a district
    getWardsForDistrict: (district: string): string[] => {
        return [...(WARDS[district as keyof typeof WARDS] || [])]
    },

    // Check if location is a major city
    isMajorCity: (location: string): boolean => {
        const majorCities = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ']
        return majorCities.includes(location)
    },

    // Check if location is a province
    isProvince: (location: string): boolean => {
        return LOCATIONS.includes(location as any)
    },

    // Check if location is a district
    isDistrict: (location: string): boolean => {
        for (const province of Object.keys(DISTRICTS)) {
            if (DISTRICTS[province as keyof typeof DISTRICTS]?.includes(location)) {
                return true
            }
        }
        return false
    },

    // Check if location is a ward
    isWard: (location: string): boolean => {
        for (const district of Object.keys(WARDS)) {
            if (WARDS[district as keyof typeof WARDS]?.includes(location)) {
                return true
            }
        }
        return false
    },

    // Get location hierarchy (Province -> District -> Ward)
    getLocationHierarchy: (location: string): { province?: string; district?: string; ward?: string } => {
        // Check if it's a ward first
        for (const [districtKey, wards] of Object.entries(WARDS)) {
            if (wards.includes(location)) {
                // Find which province this district belongs to
                for (const [provinceKey, districts] of Object.entries(DISTRICTS)) {
                    if (districts.includes(districtKey)) {
                        return {
                            province: provinceKey,
                            district: districtKey,
                            ward: location
                        }
                    }
                }
            }
        }

        // Check if it's a district
        for (const [provinceKey, districts] of Object.entries(DISTRICTS)) {
            if (districts.includes(location)) {
                return {
                    province: provinceKey,
                    district: location
                }
            }
        }

        // Check if it's a province
        if (LOCATIONS.includes(location as any)) {
            return { province: location }
        }

        return {}
    },

    // Get all locations for search suggestions
    getAllLocations: (): string[] => {
        const allLocations: string[] = []

        // Add provinces
        allLocations.push(...LOCATIONS)

        // Add major districts
        for (const districts of Object.values(DISTRICTS)) {
            allLocations.push(...districts)
        }

        // Add major wards
        for (const wards of Object.values(WARDS)) {
            allLocations.push(...wards)
        }

        return allLocations
    },

    // Enhanced location search
    searchLocations: (query: string): string[] => {
        const normalizedQuery = query.toLowerCase().trim()
        const results: string[] = []

        // Search in provinces
        for (const location of LOCATIONS) {
            if (location.toLowerCase().includes(normalizedQuery)) {
                results.push(location)
            }
        }

        // Search in districts
        for (const [province, districts] of Object.entries(DISTRICTS)) {
            for (const district of districts) {
                if (district.toLowerCase().includes(normalizedQuery)) {
                    results.push(district)
                }
            }
        }

        // Search in wards
        for (const [district, wards] of Object.entries(WARDS)) {
            for (const ward of wards) {
                if (ward.toLowerCase().includes(normalizedQuery)) {
                    results.push(ward)
                }
            }
        }

        return Array.from(new Set(results)).slice(0, 10)
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
