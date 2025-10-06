import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount)
}

// Format number with thousand separators
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('vi-VN').format(num)
}

// Generate referral code
export function generateReferralCode(userId: string): string {
    return `TD1981-${userId.slice(-6).toUpperCase()}`
}



// Calculate days until expiry
export function daysUntilExpiry(expiryDate: string): number {
    try {
        const now = new Date()
        const expiry = new Date(expiryDate)

        // Ensure both dates are valid
        if (isNaN(expiry.getTime()) || isNaN(now.getTime())) {
            console.error('Invalid date format:', { expiryDate, now: now.toISOString() })
            return 0
        }

        // Calculate difference in milliseconds
        const diffTime = expiry.getTime() - now.getTime()

        // Convert to days and round up
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Ensure we don't return negative days for expired accounts
        return Math.max(diffDays, 0)
    } catch (error) {
        console.error('Error calculating days until expiry:', error)
        return 0
    }
}

// Check if user is in trial
export function isTrialUser(expiryDate: string | null): boolean {
    if (!expiryDate) return true
    return daysUntilExpiry(expiryDate) > 0
}

// Check if user is expired
export function isExpiredUser(expiryDate: string | null): boolean {
    if (!expiryDate) return false
    return daysUntilExpiry(expiryDate) <= 0
}

// Calculate user level
export function calculateUserLevel(points: number): string {
    if (points >= 1000) return 'Bạch kim'
    if (points >= 500) return 'Vàng'
    if (points >= 200) return 'Bạc'
    return 'Đồng'
}

// Validate phone number
export function validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[0-9]{10,11}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Validate email
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Calculate rating average
export function calculateRatingAverage(ratings: number[]): number {
    if (ratings.length === 0) return 0
    const sum = ratings.reduce((acc, rating) => acc + rating, 0)
    return Math.round((sum / ratings.length) * 10) / 10
}

// Format date
export function formatDate(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

// Format datetime
export function formatDateTime(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Get time ago
export function getTimeAgo(date: string | Date): string {
    const now = new Date()
    const past = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Vừa xong'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`
    return `${Math.floor(diffInSeconds / 31536000)} năm trước`
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substr(0, maxLength) + '...'
}

// Check if string is valid JSON
export function isValidJSON(str: string): boolean {
    try {
        JSON.parse(str)
        return true
    } catch {
        return false
    }
}

// Deep clone object
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}

// Generate unique ID
export function generateId(): string {
    return Math.random().toString(36).substr(2, 9)
}

// Generate horoscope data
export async function generateHoroscope() {
    const horoscopes = [
        // TÀI LỘC
        {
            fortune: "Hôm nay là ngày tốt để đầu tư và kinh doanh. Các quyết định tài chính sẽ mang lại lợi nhuận cao. Có thể nhận được khoản tiền bất ngờ từ nguồn thu nhập phụ.",
            love: "Tình cảm gia đình hòa thuận, hạnh phúc. Có thể có tin vui từ người thân xa. Đời sống vợ chồng êm đềm, gắn bó.",
            health: "Sức khỏe ổn định, tinh thần sảng khoái. Nên duy trì chế độ tập luyện đều đặn và ăn uống điều độ.",
            advice: "Hãy tin tưởng vào khả năng của bản thân và mạnh dạn thực hiện kế hoạch đã ấp ủ từ lâu.",
            luckyColor: "Xanh dương",
            luckyNumber: "3, 7, 9"
        },
        {
            fortune: "Tài lộc dồi dào, có cơ hội hợp tác làm ăn thuận lợi. Nên mở rộng mối quan hệ kinh doanh và tìm kiếm đối tác tiềm năng.",
            love: "Tình yêu đôi lứa nồng nàn, có thể tiến triển tốt đẹp hơn mong đợi. Single có thể gặp được người phù hợp.",
            health: "Cơ thể khỏe mạnh, nhưng cần chú ý nghỉ ngơi đầy đủ để tránh kiệt sức do làm việc quá sức.",
            advice: "Đừng ngần ngại chia sẻ ý tưởng với đồng nghiệp, bạn sẽ nhận được sự hỗ trợ nhiệt tình và chân thành.",
            luckyColor: "Đỏ",
            luckyNumber: "1, 5, 8"
        },
        {
            fortune: "Có tin vui về tiền bạc, có thể nhận được khoản thưởng hoặc lợi nhuận từ đầu tư trước đó. Tài chính ổn định và có phần dư giả.",
            love: "Hạnh phúc gia đình đong đầy, các thành viên đều hòa thuận và yêu thương nhau. Con cái ngoan ngoãn, học hành tiến bộ.",
            health: "Sức khỏe tốt, nhưng cần chú ý chế độ ăn uống và giấc ngủ để duy trì phong độ và sức lực dồi dào.",
            advice: "Hôm nay là ngày thích hợp để học hỏi kiến thức mới và nâng cao trình độ chuyên môn của bản thân.",
            luckyColor: "Vàng",
            luckyNumber: "2, 6, 9"
        },
        {
            fortune: "Tài chính ổn định, có thể chi tiêu hợp lý cho những món đồ cần thiết cho công việc và cuộc sống hàng ngày.",
            love: "Tình cảm bạn bè thân thiết, có thể gặp gỡ bạn cũ và ôn lại kỷ niệm xưa đẹp đẽ của thời thanh xuân.",
            health: "Thể chất và tinh thần đều tốt, nên tận dụng ngày này để hoàn thành nhiều việc và đạt hiệu quả cao.",
            advice: "Hãy dành thời gian cho sở thích cá nhân để cân bằng cuộc sống và tìm thấy nguồn vui mới mẻ.",
            luckyColor: "Trắng",
            luckyNumber: "4, 7, 8"
        },
        {
            fortune: "Có cơ hội kiếm tiền từ công việc phụ hoặc sở thích cá nhân. Đừng bỏ qua cơ hội này vì nó có thể mang lại thu nhập tốt.",
            love: "Đời sống tình cảm êm đềm, có thể dành thời gian chất lượng cho người thương yêu và gia đình nhỏ của mình.",
            health: "Sức khỏe dồi dào, tinh thần lạc quan. Nên duy trì lối sống tích cực này để có cuộc sống vui vẻ.",
            advice: "Hôm nay là ngày tốt để bắt đầu dự án mới hoặc thay đổi môi trường làm việc để tìm kiếm cơ hội mới.",
            luckyColor: "Tím",
            luckyNumber: "3, 5, 9"
        },

        // CÔNG VIỆC
        {
            fortune: "Công việc thuận lợi, có thể được cấp trên giao phó nhiệm vụ quan trọng. Hãy cố gắng hoàn thành xuất sắc để được đánh giá cao.",
            love: "Tình cảm công sở có thể nảy sinh, nhưng cần giữ chừng mực để tránh ảnh hưởng đến công việc chính.",
            health: "Sức khỏe bình thường, chú ý không nên làm việc quá khuya để tránh ảnh hưởng đến sức khỏe lâu dài.",
            advice: "Hãy tập trung vào công việc hiện tại và tránh để cảm xúc chi phối các quyết định quan trọng.",
            luckyColor: "Xanh lá",
            luckyNumber: "2, 4, 6"
        },
        {
            fortune: "Có cơ hội thăng tiến trong công việc nếu bạn thể hiện được năng lực và sự nhiệt tình của mình với đồng nghiệp.",
            love: "Tình yêu chân thành, người ấy luôn bên cạnh hỗ trợ và động viên bạn trong mọi hoàn cảnh khó khăn.",
            health: "Cần chú ý đến sức khỏe tim mạch, nên đi bộ nhẹ nhàng sau bữa ăn để hỗ trợ tiêu hóa tốt hơn.",
            advice: "Đừng ngại thể hiện quan điểm cá nhân trong công việc, sự sáng tạo sẽ giúp bạn ghi điểm với cấp trên.",
            luckyColor: "Cam",
            luckyNumber: "1, 3, 7"
        },
        {
            fortune: "Tài chính từ công việc ổn định, có thể nhận được khoản tiền thưởng hoặc tăng lương trong thời gian tới đây.",
            love: "Hạnh phúc gia đình là nền tảng vững chắc, giúp bạn có thêm động lực để phấn đấu trong sự nghiệp.",
            health: "Sức khỏe tốt, tinh thần minh mẫn. Nên duy trì thói quen tập thể dục để có sức khỏe bền bỉ dài lâu.",
            advice: "Hôm nay là ngày tốt để học hỏi kinh nghiệm từ đồng nghiệp lớn tuổi và áp dụng vào công việc thực tế.",
            luckyColor: "Hồng",
            luckyNumber: "5, 8, 9"
        },

        // HỌC HÀNH
        {
            fortune: "Học hành tiến bộ, có thể tiếp thu kiến thức mới một cách nhanh chóng và dễ dàng hơn bình thường rất nhiều.",
            love: "Tình cảm học trò trong sáng, có thể tìm được người bạn cùng tiến và hỗ trợ nhau trong học tập.",
            health: "Sức khỏe trí não tốt, khả năng tập trung cao độ. Nên tranh thủ thời gian này để ôn tập bài vở.",
            advice: "Hãy kiên trì với mục tiêu học tập đã đề ra, sự nỗ lực sẽ mang lại kết quả xứng đáng với công sức bỏ ra.",
            luckyColor: "Xanh ngọc",
            luckyNumber: "2, 5, 8"
        },
        {
            fortune: "Có thể nhận được học bổng hoặc phần thưởng từ kết quả học tập xuất sắc trong thời gian gần đây.",
            love: "Tình cảm gia đình hỗ trợ, bố mẹ luôn ở bên cạnh động viên và tạo điều kiện tốt nhất cho việc học hành.",
            health: "Cần chú ý đến sức khỏe mắt do phải tiếp xúc nhiều với sách vở và màn hình máy tính trong thời gian dài.",
            advice: "Đừng ngần ngại hỏi thầy cô về những vấn đề chưa hiểu, sự chủ động sẽ giúp bạn tiến bộ nhanh chóng.",
            luckyColor: "Vàng nhạt",
            luckyNumber: "1, 4, 7"
        },

        // SỨC KHỎE
        {
            fortune: "Tài chính đủ đầy để chi tiêu cho việc chăm sóc sức khỏe và mua sắm những món đồ cần thiết cho bản thân.",
            love: "Tình cảm vợ chồng hòa hợp, cùng nhau chia sẻ và quan tâm đến sức khỏe của nhau một cách chân thành.",
            health: "Sức khỏe tốt, nhưng cần chú ý phòng ngừa các bệnh theo mùa và giữ gìn vệ sinh cá nhân sạch sẽ.",
            advice: "Hãy dành thời gian nghỉ ngơi hợp lý và kết hợp với chế độ dinh dưỡng cân bằng để có sức khỏe tốt nhất.",
            luckyColor: "Xanh lá cây",
            luckyNumber: "3, 6, 9"
        },
        {
            fortune: "Có thể kiếm thêm thu nhập từ việc chia sẻ kinh nghiệm chăm sóc sức khỏe với mọi người xung quanh.",
            love: "Tình cảm bạn bè quan tâm, có người thân thiết hỏi han và động viên khi bạn gặp vấn đề về sức khỏe.",
            health: "Cơ thể đang trong trạng thái hồi phục tốt, nên tiếp tục duy trì lối sống lành mạnh hiện tại.",
            advice: "Đừng chủ quan với sức khỏe, hãy đi khám định kỳ để phát hiện sớm các vấn đề tiềm ẩn nếu có.",
            luckyColor: "Trắng sữa",
            luckyNumber: "2, 5, 8"
        },

        // DU LỊCH
        {
            fortune: "Du lịch mang lại nhiều trải nghiệm thú vị và có thể mở ra cơ hội kinh doanh mới từ những mối quan hệ mới.",
            love: "Tình cảm lãng mạn khi đi du lịch cùng người ấy, có thể tạo nên những kỷ niệm đẹp khó quên trong đời.",
            health: "Sức khỏe tốt để khám phá những vùng đất mới, nhưng cần chú ý an toàn khi tham gia các hoạt động ngoài trời.",
            advice: "Hãy lên kế hoạch chi tiết cho chuyến đi và chuẩn bị đầy đủ để tránh những rủi ro không đáng có xảy ra.",
            luckyColor: "Xanh da trời",
            luckyNumber: "4, 7, 9"
        },
        {
            fortune: "Có thể tìm thấy cơ hội đầu tư bất động sản hoặc kinh doanh từ những chuyến du lịch khám phá vùng đất mới.",
            love: "Tình cảm gia đình gắn bó khi cùng nhau đi du lịch, tạo nên sự đoàn kết và yêu thương bền chặt hơn.",
            health: "Không khí trong lành từ việc đi du lịch giúp cải thiện sức khỏe hô hấp và tinh thần sảng khoái hơn.",
            advice: "Đừng quên ghi lại những khoảnh khắc đẹp trong chuyến đi để lưu giữ làm kỷ niệm cho bản thân và gia đình.",
            luckyColor: "Nâu đất",
            luckyNumber: "1, 3, 6"
        },

        // GIA ĐÌNH
        {
            fortune: "Tài chính gia đình ổn định, có thể tích lũy được một khoản tiền để dành cho những dự định tương lai quan trọng.",
            love: "Hạnh phúc gia đình là tài sản quý giá nhất, các thành viên luôn yêu thương và hỗ trợ lẫn nhau hết mình.",
            health: "Sức khỏe cả gia đình đều tốt, nên duy trì thói quen ăn uống và sinh hoạt lành mạnh cùng nhau.",
            advice: "Hãy dành nhiều thời gian hơn cho gia đình và tạo nên những bữa cơm sum họp ấm cúng mỗi ngày.",
            luckyColor: "Hồng phấn",
            luckyNumber: "2, 4, 8"
        },
        {
            fortune: "Có thể nhận được hỗ trợ tài chính từ người thân trong gia đình cho những dự án kinh doanh của bản thân.",
            love: "Tình cảm anh chị em hòa thuận, cùng nhau chia sẻ và giúp đỡ nhau vượt qua những khó khăn trong cuộc sống.",
            health: "Cần chú ý đến sức khỏe của các thành viên lớn tuổi trong gia đình và quan tâm chăm sóc họ chu đáo hơn.",
            advice: "Đừng quên thể hiện tình cảm với gia đình bằng những hành động thiết thực và lời nói chân thành mỗi ngày.",
            luckyColor: "Tím nhạt",
            luckyNumber: "5, 7, 9"
        },

        // BẠN BÈ
        {
            fortune: "Tình bạn giúp mở ra cơ hội kinh doanh mới, có thể hợp tác làm ăn với bạn bè thân thiết và tin cậy được.",
            love: "Tình cảm bạn bè chân thành, có thể tìm thấy người bạn đời từ những mối quan hệ xã giao quen biết lâu năm.",
            health: "Sức khỏe tốt khi có bạn bè ở bên cạnh động viên và chia sẻ những kinh nghiệm chăm sóc sức khỏe hữu ích.",
            advice: "Hãy trân trọng tình bạn và dành thời gian gặp gỡ bạn bè để duy trì mối quan hệ tốt đẹp lâu dài.",
            luckyColor: "Xanh rêu",
            luckyNumber: "1, 4, 6"
        },
        {
            fortune: "Có thể nhận được lời khuyên tài chính hữu ích từ bạn bè có kinh nghiệm trong lĩnh vực đầu tư và kinh doanh.",
            love: "Tình cảm đồng nghiệp thân thiết như người nhà, cùng nhau chia sẻ vui buồn trong công việc hàng ngày.",
            health: "Hoạt động thể thao cùng bạn bè giúp cải thiện sức khỏe và tạo nên sự gắn kết bền chặt hơn nữa.",
            advice: "Đừng ngần ngại nhờ bạn bè giúp đỡ khi gặp khó khăn, sự hỗ trợ chân thành sẽ giúp bạn vượt qua dễ dàng hơn.",
            luckyColor: "Cam nhạt",
            luckyNumber: "3, 6, 8"
        },

        // SÁNG TẠO
        {
            fortune: "Sáng tạo mang lại nguồn thu nhập mới, có thể kiếm tiền từ sở thích và đam mê nghệ thuật của bản thân.",
            love: "Tình cảm lãng mạn với người có cùng sở thích sáng tạo, cùng nhau tạo nên những tác phẩm nghệ thuật ý nghĩa.",
            health: "Sức khỏe tinh thần tốt khi được thỏa sức sáng tạo và thể hiện bản thân qua các tác phẩm nghệ thuật.",
            advice: "Hãy mạnh dạn theo đuổi đam mê sáng tạo, nó có thể trở thành nguồn thu nhập chính trong tương lai gần.",
            luckyColor: "Đen trắng",
            luckyNumber: "2, 5, 7"
        },
        {
            fortune: "Có thể bán được tác phẩm sáng tạo với giá cao và nhận được sự công nhận từ cộng đồng yêu nghệ thuật.",
            love: "Tình cảm gia đình ủng hộ sở thích sáng tạo, tạo điều kiện để bạn phát triển tài năng của bản thân.",
            health: "Cần chú ý đến sức khỏe cổ tay và mắt do phải làm việc nhiều với máy tính và dụng cụ sáng tạo khác.",
            advice: "Đừng bỏ cuộc giữa chừng, sự kiên trì với đam mê sáng tạo sẽ mang lại thành công ngoài mong đợi.",
            luckyColor: "Xám nghệ thuật",
            luckyNumber: "1, 4, 9"
        },

        // THỂ THAO
        {
            fortune: "Thể thao giúp mở ra cơ hội kinh doanh mới trong lĩnh vực thể dục thể thao và chăm sóc sức khỏe cộng đồng.",
            love: "Tình cảm với người có cùng sở thích thể thao, cùng nhau chia sẻ đam mê và động viên nhau tiến bộ hơn.",
            health: "Sức khỏe thể chất tốt nhờ việc duy trì thói quen tập luyện thể dục thể thao đều đặn mỗi ngày.",
            advice: "Hãy kết hợp thể thao với công việc để tạo nên sự cân bằng và tìm thấy niềm vui trong cuộc sống hàng ngày.",
            luckyColor: "Xanh neon",
            luckyNumber: "3, 6, 9"
        },
        {
            fortune: "Có thể kiếm thêm thu nhập từ việc huấn luyện thể thao hoặc bán dụng cụ thể thao cho người thân quen.",
            love: "Tình cảm bạn bè cùng chơi thể thao gắn bó, cùng nhau vượt qua những thử thách và đạt thành tích cao.",
            health: "Cơ thể săn chắc và dẻo dai nhờ việc tập luyện thể thao thường xuyên và chế độ dinh dưỡng hợp lý.",
            advice: "Đừng ép bản thân tập luyện quá sức, hãy lắng nghe cơ thể và điều chỉnh cường độ phù hợp với sức khỏe.",
            luckyColor: "Đỏ đô",
            luckyNumber: "2, 5, 8"
        },

        // ẨM THỰC
        {
            fortune: "Có thể kiếm tiền từ sở thích nấu nướng, mở cửa hàng ăn uống nhỏ hoặc bán đồ ăn online rất thành công.",
            love: "Tình cảm gia đình gắn bó qua những bữa cơm ngon, cùng nhau chia sẻ và trò chuyện vui vẻ mỗi ngày.",
            health: "Sức khỏe tốt nhờ chế độ ăn uống cân bằng và đa dạng các loại thực phẩm bổ dưỡng cho cơ thể.",
            advice: "Hãy học hỏi thêm công thức nấu ăn mới để làm phong phú thêm bữa ăn gia đình và tạo sự bất ngờ thú vị.",
            luckyColor: "Nâu socola",
            luckyNumber: "4, 7, 9"
        },
        {
            fortune: "Tài chính ổn định từ việc kinh doanh ẩm thực, có thể mở rộng quy mô cửa hàng trong thời gian tới đây.",
            love: "Tình cảm lãng mạn khi cùng người ấy khám phá những món ăn mới và chia sẻ sở thích ẩm thực với nhau.",
            health: "Cần chú ý đến vệ sinh an toàn thực phẩm để tránh các vấn đề về tiêu hóa và sức khỏe lâu dài.",
            advice: "Đừng ngần ngại thử nghiệm món ăn mới, sự sáng tạo trong ẩm thực sẽ mang lại thành công bất ngờ.",
            luckyColor: "Kem sữa",
            luckyNumber: "1, 3, 6"
        },

        // CÔNG NGHỆ
        {
            fortune: "Công nghệ mang lại cơ hội kinh doanh mới, có thể khởi nghiệp với ý tưởng công nghệ độc đáo và tiềm năng.",
            love: "Tình cảm với người cùng ngành công nghệ, cùng nhau chia sẻ kiến thức và hỗ trợ nhau phát triển sự nghiệp.",
            health: "Cần chú ý đến sức khỏe mắt và cột sống do phải làm việc nhiều với máy tính và thiết bị công nghệ.",
            advice: "Hãy cập nhật kiến thức công nghệ mới liên tục để không bị lạc hậu trong lĩnh vực này.",
            luckyColor: "Xanh điện tử",
            luckyNumber: "2, 5, 8"
        },
        {
            fortune: "Có thể nhận được dự án công nghệ với giá trị cao và mang lại nguồn thu nhập ổn định trong thời gian dài.",
            love: "Tình cảm gia đình thông cảm với đặc thù công việc công nghệ, tạo điều kiện để bạn tập trung làm việc.",
            health: "Sức khỏe tinh thần tốt khi được làm việc với lĩnh vực yêu thích và có cơ hội phát triển bản thân.",
            advice: "Đừng quên dành thời gian nghỉ ngơi giữa giờ làm việc để tránh tình trạng kiệt sức do áp lực công việc.",
            luckyColor: "Bạc",
            luckyNumber: "1, 4, 7"
        },

        // THIÊN NHIÊN
        {
            fortune: "Gần gũi thiên nhiên mang lại cảm hứng kinh doanh mới, có thể khởi nghiệp với sản phẩm thân thiện môi trường.",
            love: "Tình cảm chân thành với người có cùng sở thích khám phá thiên nhiên và bảo vệ môi trường sống xung quanh.",
            health: "Sức khỏe cải thiện rõ rệt khi được tiếp xúc với không khí trong lành và không gian xanh mát của thiên nhiên.",
            advice: "Hãy dành thời gian cho những chuyến đi bộ trong công viên hoặc những nơi có nhiều cây xanh để thư giãn.",
            luckyColor: "Xanh lá mạ",
            luckyNumber: "3, 6, 9"
        },
        {
            fortune: "Có thể kiếm tiền từ việc kinh doanh sản phẩm organic hoặc dịch vụ liên quan đến thiên nhiên và môi trường.",
            love: "Tình cảm gia đình hòa thuận khi cùng nhau tham gia các hoạt động ngoài trời và gần gũi với thiên nhiên.",
            health: "Cơ thể tràn đầy năng lượng tích cực khi được hòa mình vào thiên nhiên và rời xa khói bụi thành phố.",
            advice: "Đừng quên chăm sóc cây cối trong nhà, việc này không chỉ tốt cho sức khỏe mà còn mang lại tài lộc.",
            luckyColor: "Nâu đất sét",
            luckyNumber: "2, 5, 8"
        },

        // ÂM NHẠC
        {
            fortune: "Âm nhạc có thể trở thành nguồn thu nhập, hãy mạnh dạn theo đuổi đam mê và biến sở thích thành nghề tay trái.",
            love: "Tình cảm lãng mạn với người có cùng sở thích âm nhạc, cùng nhau chia sẻ những bản nhạc yêu thích.",
            health: "Sức khỏe tinh thần tốt hơn khi được nghe những bản nhạc yêu thích và thư giãn sau ngày làm việc mệt mỏi.",
            advice: "Hãy dành thời gian cho sở thích âm nhạc, nó sẽ giúp bạn cân bằng cuộc sống và tìm thấy niềm vui mới.",
            luckyColor: "Tím than",
            luckyNumber: "4, 7, 9"
        },
        {
            fortune: "Có thể kiếm tiền từ việc biểu diễn âm nhạc hoặc dạy nhạc cho những người có cùng sở thích và đam mê.",
            love: "Tình cảm bạn bè gắn bó qua những buổi sinh hoạt âm nhạc, cùng nhau tạo nên những kỷ niệm đẹp khó quên.",
            health: "Cần chú ý đến sức khỏe thanh quản nếu phải hát nhiều hoặc nói chuyện liên tục trong thời gian dài.",
            advice: "Đừng ngần ngại tham gia các câu lạc bộ âm nhạc, đây là cơ hội để mở rộng mối quan hệ và học hỏi thêm.",
            luckyColor: "Đỏ anh đào",
            luckyNumber: "1, 3, 6"
        },

        // ĐỌC SÁCH
        {
            fortune: "Đọc sách giúp mở mang kiến thức và có thể áp dụng vào công việc để mang lại hiệu quả kinh tế cao hơn.",
            love: "Tình cảm gia đình ấm áp khi cùng nhau đọc sách và chia sẻ những câu chuyện thú vị từ những cuốn sách hay.",
            health: "Sức khỏe trí tuệ tốt hơn khi được tiếp cận với nguồn tri thức phong phú từ việc đọc sách đều đặn hàng ngày.",
            advice: "Hãy dành ít nhất 30 phút mỗi ngày cho việc đọc sách, kiến thức tích lũy sẽ giúp bạn thành công hơn.",
            luckyColor: "Nâu sách vở",
            luckyNumber: "2, 5, 8"
        },
        {
            fortune: "Có thể kiếm thêm thu nhập từ việc viết lách hoặc chia sẻ review sách trên các nền tảng mạng xã hội.",
            love: "Tình cảm bạn bè tri kỷ qua việc trao đổi sách và cùng nhau thảo luận về những chủ đề thú vị trong sách.",
            health: "Cần chú ý đến ánh sáng khi đọc sách để bảo vệ đôi mắt và tránh tình trạng mỏi mắt do đọc sách quá lâu.",
            advice: "Đừng chỉ đọc sách một lĩnh vực, hãy đa dạng hóa kiến thức để có cái nhìn toàn diện hơn về cuộc sống.",
            luckyColor: "Xanh olive",
            luckyNumber: "1, 4, 7"
        },

        // NÔNG NGHIỆP
        {
            fortune: "Nông nghiệp có thể mang lại nguồn thu nhập ổn định nếu biết áp dụng khoa học kỹ thuật vào sản xuất nông sản.",
            love: "Tình cảm gia đình gắn bó khi cùng nhau tham gia các hoạt động nông nghiệp và gần gũi với thiên nhiên.",
            health: "Sức khỏe tốt hơn khi được làm việc ngoài trời và tiếp xúc với đất đai cây cối xanh tươi mỗi ngày.",
            advice: "Hãy học hỏi kinh nghiệm từ những người nông dân có kinh nghiệm để áp dụng vào hoạt động sản xuất của mình.",
            luckyColor: "Xanh lá đậm",
            luckyNumber: "3, 6, 9"
        },
        {
            fortune: "Có thể mở rộng quy mô nông nghiệp và xuất khẩu nông sản ra thị trường nước ngoài để tăng nguồn thu nhập.",
            love: "Tình cảm làng xóm hòa thuận, cùng nhau giúp đỡ và chia sẻ kinh nghiệm sản xuất nông nghiệp với nhau.",
            health: "Cơ thể khỏe mạnh nhờ việc lao động chân tay và hít thở không khí trong lành từ vùng nông thôn yên bình.",
            advice: "Đừng ngần ngại đầu tư vào nông nghiệp sạch, đây là xu hướng và có tiềm năng phát triển trong tương lai.",
            luckyColor: "Nâu đất phù sa",
            luckyNumber: "2, 5, 8"
        }
    ]

    // Randomly select a horoscope
    const randomIndex = Math.floor(Math.random() * horoscopes.length)
    return horoscopes[randomIndex]
}

// Validate Facebook ID format
function isValidFacebookId(facebookId: string): boolean {
    if (!facebookId || typeof facebookId !== 'string') {
        return false
    }

    // Facebook ID should be numeric and between 10-20 digits
    return /^\d{10,20}$/.test(facebookId)
}

// Get Facebook display name from Facebook API
export async function getFacebookDisplayName(facebookId: string): Promise<string | null> {
    try {
        const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

        // Check if access token exists
        if (!FACEBOOK_ACCESS_TOKEN) {
            console.log('Facebook access token not configured')
            return null
        }

        // Validate Facebook ID format
        if (!isValidFacebookId(facebookId)) {
            console.log('Invalid Facebook ID format:', facebookId)
            return null
        }

        console.log('Fetching Facebook profile for user:', facebookId)

        // Create AbortController for timeout functionality
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${facebookId}?fields=first_name,last_name,name&access_token=${FACEBOOK_ACCESS_TOKEN}`,
            {
                signal: controller.signal
            }
        )

        clearTimeout(timeoutId)

        console.log('Facebook API response status:', response.status)

        if (response.ok) {
            const data = await response.json()
            console.log('Facebook profile data:', JSON.stringify(data, null, 2))

            const displayName = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim()
            if (displayName) {
                console.log('Successfully got Facebook name:', displayName)
                return displayName
            } else {
                console.log('No name found in Facebook profile data')
                return null
            }
        }

        // Handle specific error codes with better logging
        if (response.status === 400) {
            console.warn('Facebook API 400 - Invalid Facebook ID or permissions:', facebookId)
        } else if (response.status === 401) {
            console.warn('Facebook API 401 - Access token invalid or expired')
        } else if (response.status === 403) {
            console.warn('Facebook API 403 - Insufficient permissions for user profile')
        } else if (response.status === 404) {
            console.warn('Facebook API 404 - User not found:', facebookId)
        } else {
            console.warn('Facebook API error:', response.status, response.statusText)
        }

        // Try to get error details for debugging
        try {
            const errorData = await response.json()
            console.warn('Facebook API error details:', JSON.stringify(errorData, null, 2))
        } catch (parseError) {
            console.warn('Could not parse Facebook API error response')
        }

        return null
    } catch (error) {
        // Handle network errors gracefully
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn('Facebook API request timeout for user:', facebookId)
        } else {
            console.warn('Error getting Facebook display name:', error instanceof Error ? error.message : String(error))
        }
        return null
    }
}







// Update bot session - FIXED VERSION
export async function updateBotSession(facebookId: string, sessionData: any) {
    try {
        const { supabaseAdmin } = await import('./supabase')

        console.log('🔄 updateBotSession called:', {
            facebookId,
            hasSessionData: !!sessionData,
            currentFlow: sessionData?.current_flow,
            step: sessionData?.step,
            stepType: typeof sessionData?.step
        })

        // Nếu sessionData là null, xóa session
        if (sessionData === null) {
            const { error } = await supabaseAdmin
                .from('bot_sessions')
                .delete()
                .eq('facebook_id', facebookId)

            if (error) {
                console.error('❌ Error deleting session:', error)
            } else {
                console.log('✅ Session deleted for user:', facebookId)
            }
            return
        }

        // Đơn giản hóa: chỉ lưu những gì cần thiết - FIX STEP HANDLING
        let stepValue: number = 0
        if (sessionData?.step !== undefined && sessionData?.step !== null) {
            stepValue = typeof sessionData.step === 'string' ? parseInt(sessionData.step) || 0 : sessionData.step
        }

        const sessionToSave = {
            facebook_id: facebookId,
            current_flow: sessionData.current_flow || 'registration',
            current_step: stepValue,  // Always save as number
            step: stepValue,  // Keep both fields for compatibility
            data: sessionData.data || {},
            updated_at: new Date().toISOString()
        }

        console.log('💾 Saving session data:', {
            facebookId,
            currentFlow: sessionToSave.current_flow,
            step: sessionToSave.step,
            current_step: sessionToSave.current_step,
            data: sessionToSave.data
        })

        // FIX: Sử dụng upsert với onConflict để tránh lỗi duplicate key
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .upsert(sessionToSave, {
                onConflict: 'facebook_id',
                ignoreDuplicates: false
            })

        if (error) {
            console.error('❌ updateBotSession error:', {
                facebookId,
                error: error.message,
                code: error.code,
                details: error.details,
                sessionData: sessionToSave
            })

            // FIX: Thử insert thay vì upsert nếu upsert thất bại
            if (error.code === '23505' || error.message.includes('duplicate')) {
                console.log('🔄 Retrying with insert for user:', facebookId)
                const { error: insertError } = await supabaseAdmin
                    .from('bot_sessions')
                    .insert(sessionToSave)

                if (insertError) {
                    console.error('❌ Insert also failed:', insertError)
                } else {
                    console.log('✅ Session inserted successfully')
                }
            }
            return
        }

        console.log('✅ updateBotSession success:', {
            facebookId,
            currentFlow: sessionToSave.current_flow,
            step: sessionToSave.step,
            current_step: sessionToSave.current_step,
            data: sessionToSave.data
        })

    } catch (error) {
        console.error('❌ Exception in updateBotSession:', error)
    }
}

// Get bot session - Simplified version
export async function getBotSession(facebookId: string) {
    try {
        const { supabaseAdmin } = await import('./supabase')

        console.log('🔍 getBotSession called for:', facebookId)

        const { data, error } = await supabaseAdmin
            .from('bot_sessions')
            .select('*')
            .eq('facebook_id', facebookId)
            .single()

        if (error) {
            // Nếu không tìm thấy record, trả về null (bình thường)
            if (error.code === 'PGRST116') {
                console.log('ℹ️ No session found for user:', facebookId)
                return null
            }

            // Các lỗi khác cũng trả về null
            console.error('❌ getBotSession error:', error)
            return null
        }

        // Đơn giản hóa: chỉ trả về data nếu có
        if (data) {
            // FIX STEP HANDLING - ensure numeric step value
            let stepValue: number = 0
            if (data.step !== undefined && data.step !== null) {
                stepValue = typeof data.step === 'string' ? parseInt(data.step) || 0 : data.step
            } else if (data.current_step !== undefined && data.current_step !== null) {
                stepValue = typeof data.current_step === 'string' ? parseInt(data.current_step) || 0 : data.current_step
            }

            console.log('✅ getBotSession success:', {
                facebookId,
                currentFlow: data.current_flow,
                step: stepValue,
                originalStep: data.step,
                originalCurrentStep: data.current_step
            })

            // Đảm bảo cấu trúc dữ liệu nhất quán
            return {
                facebook_id: data.facebook_id,
                current_flow: data.current_flow,
                step: stepValue,  // Return as number for consistent comparison
                current_step: stepValue,  // Keep both for compatibility
                data: data.data || {},
                updated_at: data.updated_at
            }
        }

        return null
    } catch (error) {
        console.error('❌ Exception in getBotSession:', error)
        return null
    }
}
