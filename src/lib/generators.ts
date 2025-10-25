// Generation utilities

// Generate referral code
export function generateReferralCode(userId: string): string {
    return `TD1981-${userId.slice(-6).toUpperCase()}`
}

// Generate unique ID (UUID v4)
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
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
        // ... (keep the full list as in original utils.ts)
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