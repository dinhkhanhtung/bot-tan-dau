import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReplyNoTyping,
    sendQuickReply,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId } from '../utils'
// AI Manager removed - using simple horoscope logic

export class UtilityFlow {
    async handleHoroscope(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        // Simple horoscope generation (AI removed)
        const horoscope = {
            fortune: 'Tài lộc khá tốt, có cơ hội đầu tư',
            love: 'Tình cảm ổn định, nên quan tâm gia đình',
            health: 'Sức khỏe tốt, nên tập thể dục thường xuyên',
            advice: 'Hôm nay nên tập trung vào công việc chính',
            luckyColor: 'Vàng',
            luckyNumber: '8'
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '🔮 TỬ VI TÂN DẬU HÔM NAY',
            `📅 ${new Date().toLocaleDateString('vi-VN')}`,
            `🐓 Tuổi: Tân Dậu (1981)`,
            `⭐ Tổng quan: 4/5 sao`,
            '',
            `💰 Tài lộc: ${horoscope.fortune}`,
            `❤️ Tình cảm: ${horoscope.love}`,
            `🏥 Sức khỏe: ${horoscope.health}`,
            '',
            `🎯 Lời khuyên: ${horoscope.advice}`,
            `🎨 Màu may mắn: ${horoscope.luckyColor}`,
            `🔢 Số may mắn: ${horoscope.luckyNumber}`
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🎲 XEM CHI TIẾT', 'HOROSCOPE_DETAIL'),
                createQuickReply('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
                createQuickReply('🔮 XEM THÁNG', 'HOROSCOPE_MONTH'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )
    }

    async handlePoints(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        try {
            // Get user points
            const { data: userData, error } = await supabaseAdmin
                .from('users')
                .select('points, level')
                .eq('facebook_id', user.facebook_id)
                .single()

            if (error) {
                console.error('Error fetching user points:', error)
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải điểm thưởng.')
                return
            }

            const points = userData?.points || 0
            const level = userData?.level || 1
            const nextLevelPoints = this.getNextLevelPoints(level)

            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ HỆ THỐNG ĐIỂM THƯỞNG',
                `🏆 Level hiện tại: ${this.getLevelName(level)} (${points}/${nextLevelPoints} điểm)`,
                `⭐ Tổng điểm: ${points} điểm`,
                `🎯 Streak: 7 ngày liên tiếp`,
                '',
                '📈 Hoạt động hôm nay:',
                '• Đăng nhập: +2 điểm ✅',
                '• Tạo tin đăng: +10 điểm ✅',
                '• Nhận đánh giá: +5 điểm ✅',
                '• Chia sẻ kỷ niệm: +3 điểm ✅'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Chọn chức năng:',
                [
                    createQuickReply('💳 Giảm giá', 'POINTS_REWARDS_DISCOUNT'),
                    createQuickReply('🏆 Huy hiệu', 'POINTS_REWARDS_BADGES'),
                    createQuickReply('🎁 Quà tặng', 'POINTS_REWARDS_GIFTS'),
                    createQuickReply('🎮 Game', 'POINTS_REWARDS_GAMES'),
                    createQuickReply('📊 XEM LỊCH SỬ', 'POINTS_HISTORY'),
                    createQuickReply('🎯 THÀNH TÍCH', 'POINTS_ACHIEVEMENTS'),
                    createQuickReply('🏆 LEADERBOARD', 'POINTS_LEADERBOARD'),
                    createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in points:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    async handleSettings(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Cài đặt:',
            [
                createQuickReply('👤 THÔNG TIN CÁ NHÂN', 'SETTINGS_PROFILE'),
                createQuickReply('🔔 THÔNG BÁO', 'SETTINGS_NOTIFICATIONS'),
                createQuickReply('🔒 BẢO MẬT', 'SETTINGS_SECURITY'),
                createQuickReply('🌐 NGÔN NGỮ', 'SETTINGS_LANGUAGE'),
                createQuickReply('🎨 GIAO DIỆN', 'SETTINGS_THEME'),
                createQuickReply('📊 PRIVACY', 'SETTINGS_PRIVACY'),
                createQuickReply('❓ HỖ TRỢ', 'SUPPORT'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )
    }

    async handleSupport(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Loại hỗ trợ:',
            [
                createQuickReply('🤖 CHAT BOT', 'SUPPORT_BOT'),
                createQuickReply('👨‍💼 CHAT ADMIN', 'SUPPORT_ADMIN'),
                createQuickReply('❓ FAQ', 'SUPPORT_FAQ'),
                createQuickReply('📞 LIÊN HỆ', 'SUPPORT_CONTACT'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )
    }

    async handleDefaultMessageRegistered(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🛒 NIÊM YẾT', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💬 KẾT NỐI', 'CONNECT'),
                createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
                createQuickReply('⭐ ĐIỂM THƯỞNG', 'POINTS'),
                createQuickReply('🔮 TỬ VI', 'HOROSCOPE'),
                createQuickReply('⚙️ CÀI ĐẶT', 'SETTINGS'),
                createQuickReply('❌ THOÁT', 'EXIT_BOT')
            ]
        )
    }

    private getNextLevelPoints(level: number): number {
        return level * 200
    }

    private getLevelName(level: number): string {
        const levels = ['Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương']
        return levels[Math.min(level - 1, levels.length - 1)] || 'Đồng'
    }
}
