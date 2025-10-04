import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping,
    hideButtons
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId } from '../utils'
// AI Manager removed - using simple horoscope logic

// Handle horoscope
export async function handleHoroscope(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

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

// Handle horoscope detail
export async function handleHoroscopeDetail(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

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
        '🔮 TỬ VI CHI TIẾT TÂN DẬU',
        `📅 ${new Date().toLocaleDateString('vi-VN')}`,
        '',
        `💰 TÀI LỘC (4/5):`,
        `• ${horoscope.fortune}`,
        `• Hôm nay là ngày tốt để đầu tư và kinh doanh`,
        '',
        `❤️ TÌNH CẢM (4/5):`,
        `• ${horoscope.love}`,
        `• Tình cảm gia đình hòa thuận, hạnh phúc`,
        '',
        `🏥 SỨC KHỎE (4/5):`,
        `• ${horoscope.health}`,
        `• Sức khỏe ổn định, nên tập thể dục thường xuyên`,
        '',
        `🎯 HOẠT ĐỘNG MAY MẮN:`,
        `• Mua sắm, đầu tư, gặp gỡ bạn bè`
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createQuickReply('🔮 XEM THÁNG', 'HOROSCOPE_MONTH'),
            createQuickReply('🔙 QUAY LẠI', 'HOROSCOPE')
        ]
    )
}

// Handle horoscope week
export async function handleHoroscopeWeek(user: any) {
    await sendTypingIndicator(user.facebook_id)

    const weekStart = getWeekStartDate()
    const weekEnd = getWeekEndDate()

    await sendMessagesWithTyping(user.facebook_id, [
        '📅 TỬ VI TUẦN NÀY',
        `📅 ${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')}`,
        '🐓 Tuổi: Tân Dậu (1981)',
        '',
        '📊 TỔNG QUAN TUẦN:',
        '• Thứ 2-3: Tài lộc tốt, nên đầu tư',
        '• Thứ 4-5: Tình cảm thuận lợi',
        '• Thứ 6-7: Sức khỏe cần chú ý',
        '• Chủ nhật: Nghỉ ngơi, tụ tập bạn bè',
        '',
        '🎯 LỜI KHUYÊN TUẦN:',
        '• Nên ký kết hợp đồng vào thứ 2-3',
        '• Tránh tranh cãi vào thứ 6',
        '• Tập thể dục nhẹ nhàng',
        '• Gặp gỡ bạn bè cũ'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('🔮 XEM THÁNG', 'HOROSCOPE_MONTH'),
            createQuickReply('🎲 XEM CHI TIẾT', 'HOROSCOPE_DETAIL'),
            createQuickReply('🔙 QUAY LẠI', 'HOROSCOPE')
        ]
    )
}

// Handle horoscope month
export async function handleHoroscopeMonth(user: any) {
    await sendTypingIndicator(user.facebook_id)

    const now = new Date()
    const monthName = now.toLocaleDateString('vi-VN', { month: 'long' })

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI THÁNG NÀY',
        `📅 Tháng ${monthName} ${now.getFullYear()}`,
        '🐓 Tuổi: Tân Dậu (1981)',
        '',
        '📊 TỔNG QUAN THÁNG:',
        '• Tuần 1: Tài lộc rất tốt, cơ hội đầu tư',
        '• Tuần 2: Tình cảm có biến động',
        '• Tuần 3: Sức khỏe cần chú ý',
        '• Tuần 4: Công việc thuận lợi',
        '',
        '🎯 LỜI KHUYÊN THÁNG:',
        '• Nên đầu tư bất động sản',
        '• Cẩn thận trong tình cảm',
        '• Tập thể dục đều đặn',
        '• Kết nối với bạn bè cũ'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createQuickReply('🎲 XEM CHI TIẾT', 'HOROSCOPE_DETAIL'),
            createQuickReply('🔙 QUAY LẠI', 'HOROSCOPE')
        ]
    )
}

// Handle points system
export async function handlePoints(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

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
        const nextLevelPoints = getNextLevelPoints(level)

        await sendMessagesWithTyping(user.facebook_id, [
            '⭐ HỆ THỐNG ĐIỂM THƯỞNG',
            `🏆 Level hiện tại: ${getLevelName(level)} (${points}/${nextLevelPoints} điểm)`,
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

// Handle points rewards discount
export async function handlePointsRewardsDiscount(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('🔄 ĐỔI PHẦN THƯỞNG', 'POINTS_REDEEM'),
            createQuickReply('📊 XEM LỊCH SỬ', 'POINTS_HISTORY'),
            createQuickReply('🔙 QUAY LẠI', 'POINTS')
        ]
    )
}

// Handle points redeem
export async function handlePointsRedeem(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Phần thưởng:',
        [
            createQuickReply('💳 10% phí niêm yết - 100 điểm', 'REDEEM_DISCOUNT_100'),
            createQuickReply('⏰ 1 ngày miễn phí - 200 điểm', 'REDEEM_FREE_200'),
            createQuickReply('⭐ Featured listing 1 tuần - 500 điểm', 'REDEEM_FEATURED_500'),
            createQuickReply('🎉 1 tuần miễn phí - 1000 điểm', 'REDEEM_FREE_WEEK_1000'),
            createQuickReply('🔙 QUAY LẠI', 'POINTS')
        ]
    )
}

// Handle settings
export async function handleSettings(user: any) {
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

// Handle support
export async function handleSupport(user: any) {
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

// Handle support bot
export async function handleSupportBot(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
            createQuickReply('❓ HỖ TRỢ', 'SUPPORT'),
            createQuickReply('🔮 TỬ VI', 'HOROSCOPE'),
            createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle support admin
export async function handleSupportAdmin(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn hành động:',
        [
            createQuickReply('💬 BẮT ĐẦU CHAT', 'START_ADMIN_CHAT'),
            createQuickReply('🤖 CHAT BOT', 'SUPPORT_BOT'),
            createQuickReply('❓ FAQ', 'SUPPORT_FAQ'),
            createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle start admin chat
export async function handleStartAdminChat(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        const { startAdminChatSession } = await import('../admin-chat')
        const result = await startAdminChatSession(user.facebook_id)

        if (result.success) {
            await sendMessagesWithTyping(user.facebook_id, [
                '✅ ĐÃ KẾT NỐI VỚI ADMIN!',
                '👨‍💼 Yêu cầu chat đã được gửi đến admin.',
                '⏳ Vui lòng chờ admin phản hồi...',
                '',
                '💬 Bạn có thể gửi tin nhắn ngay bây giờ.',
                '🤖 Bot sẽ tạm dừng cho đến khi admin trả lời.'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Trong khi chờ đợi:',
                [
                    createQuickReply('❌ HỦY CHAT', 'CANCEL_ADMIN_CHAT'),
                    createQuickReply('🔄 QUAY LẠI BOT', 'EXIT_ADMIN_CHAT')
                ]
            )
        } else {
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi kết nối với admin. Vui lòng thử lại sau!')
            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn khác:',
                [
                    createQuickReply('🤖 CHAT BOT', 'SUPPORT_BOT'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        }
    } catch (error) {
        console.error('Error starting admin chat:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle referral program
export async function handleReferral(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    const referralCode = user.referral_code || `TD1981-${user.facebook_id.slice(-6)}`

    await sendMessagesWithTyping(user.facebook_id, [
        '🎁 CHƯƠNG TRÌNH GIỚI THIỆU',
        `📱 Mã giới thiệu của bạn: ${referralCode}`,
        '💰 Thưởng giới thiệu:\n• Mỗi người đăng ký thành công = 10,000đ\n• Thưởng được cộng vào tài khoản ngay lập tức\n• Không giới hạn số lượng giới thiệu',
        '📊 Thống kê:\n• Số người đã giới thiệu: 0\n• Tổng thưởng: 0đ\n• Thưởng chưa rút: 0đ'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📤 CHIA SẺ MÃ', 'REFERRAL_SHARE'),
            createQuickReply('📊 THỐNG KÊ', 'REFERRAL_STATS'),
            createQuickReply('💰 RÚT THƯỞNG', 'REFERRAL_WITHDRAW'),
            createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle referral share
export async function handleReferralShare(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    const referralCode = user.referral_code || `TD1981-${user.facebook_id.slice(-6)}`
    const shareMessage = `Chào bạn! Tôi đang sử dụng BOT Tân Dậu - Hỗ Trợ Chéo - nơi kết nối mua bán cho cộng đồng Tân Dậu - Hỗ Trợ Chéo. Bạn có muốn tham gia không? Mã giới thiệu: ${referralCode}`

    await sendMessagesWithTyping(user.facebook_id, [
        '📤 CHIA SẺ MÃ GIỚI THIỆU',
        `📱 Mã giới thiệu: ${referralCode}`,
        'Chọn cách chia sẻ:'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Chọn cách chia sẻ:',
        [
            createQuickReply('📱 Facebook', 'REFERRAL_SHARE_FACEBOOK'),
            createQuickReply('💬 Messenger', 'REFERRAL_SHARE_MESSENGER'),
            createQuickReply('📧 Email', 'REFERRAL_SHARE_EMAIL'),
            createQuickReply('📋 Sao chép', 'REFERRAL_SHARE_COPY'),
            createQuickReply('🔙 QUAY LẠI', 'REFERRAL')
        ]
    )
}

// Handle referral stats
export async function handleReferralStats(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get referral statistics
        const { data: referrals, error } = await supabaseAdmin
            .from('referrals')
            .select('*')
            .eq('referrer_id', user.facebook_id)

        if (error) {
            console.error('Error fetching referral stats:', error)
            await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thống kê. Vui lòng thử lại sau!')
            return
        }

        const totalReferrals = referrals?.length || 0
        const totalReward = (referrals?.reduce((sum, ref) => sum + (ref.reward_amount || 0), 0) || 0)
        const pendingReward = (referrals?.filter(ref => ref.status === 'pending').reduce((sum, ref) => sum + (ref.reward_amount || 0), 0) || 0)

        await sendMessagesWithTyping(user.facebook_id, [
            '📊 THỐNG KÊ GIỚI THIỆU',
            `📱 Mã giới thiệu: ${user.referral_code || `TD1981-${user.facebook_id.slice(-6)}`}`,
            `👥 Số người đã giới thiệu: ${totalReferrals}`,
            `💰 Tổng thưởng: ${formatCurrency(totalReward)}`,
            `⏳ Thưởng chưa rút: ${formatCurrency(pendingReward)}`,
            `✅ Thưởng đã rút: ${formatCurrency(totalReward - pendingReward)}`
        ])

        if (referrals && referrals.length > 0) {
            const recentReferrals = referrals.slice(0, 5)
            let recentText = '📋 Danh sách gần đây:\n'
            recentReferrals.forEach((ref, index) => {
                const date = new Date(ref.created_at).toLocaleDateString('vi-VN')
                const status = ref.status === 'completed' ? '✅' : '⏳'
                recentText += `${index + 1}. ${status} ${date} - ${formatCurrency(ref.reward_amount || 0)}\n`
            })

            await sendMessage(user.facebook_id, recentText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 RÚT THƯỞNG', 'REFERRAL_WITHDRAW'),
                createQuickReply('📤 CHIA SẺ MÃ', 'REFERRAL_SHARE'),
                createQuickReply('🔙 QUAY LẠI', 'REFERRAL')
            ]
        )

    } catch (error) {
        console.error('Error in handleReferralStats:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle referral withdraw
export async function handleReferralWithdraw(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get pending rewards
        const { data: referrals, error } = await supabaseAdmin
            .from('referrals')
            .select('*')
            .eq('referrer_id', user.facebook_id)
            .eq('status', 'completed')

        if (error) {
            console.error('Error fetching pending rewards:', error)
            await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thông tin. Vui lòng thử lại sau!')
            return
        }

        const pendingReward = referrals?.reduce((sum, ref) => sum + (ref.reward_amount || 0), 0) || 0

        if (pendingReward <= 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 RÚT THƯỞNG',
                '❌ Bạn chưa có thưởng nào để rút!',
                'Hãy giới thiệu bạn bè để nhận thưởng nhé!'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('📤 CHIA SẺ MÃ', 'REFERRAL_SHARE'),
                    createQuickReply('🔙 QUAY LẠI', 'REFERRAL')
                ]
            )
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '💰 RÚT THƯỞNG',
            `💵 Số tiền có thể rút: ${formatCurrency(pendingReward)}`,
            '🏦 Thông tin chuyển khoản:',
            '• STK: 0982581222',
            '• Ngân hàng: Vietcombank',
            '• Chủ TK: BOT TÂN DẬU',
            `• Nội dung: THUONG ${user.phone || user.facebook_id.slice(-6)}`
        ])

        await sendQuickReply(
            user.facebook_id,
            'Sau khi chuyển khoản:',
            [
                createQuickReply('📸 GỬI BIÊN LAI', 'REFERRAL_WITHDRAW_CONFIRM'),
                createQuickReply('❌ HỦY', 'REFERRAL')
            ]
        )

    } catch (error) {
        console.error('Error in handleReferralWithdraw:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle default message for registered users
export async function handleDefaultMessageRegistered(user: any) {
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

// Helper functions
function getWeekStartDate(): Date {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(now.setDate(diff))
}

function getWeekEndDate(): Date {
    const weekStart = getWeekStartDate()
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
}

function getNextLevelPoints(level: number): number {
    return level * 200
}

function getLevelName(level: number): string {
    const levels = ['Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương']
    return levels[Math.min(level - 1, levels.length - 1)] || 'Đồng'
}

// Handle horoscope tomorrow
export async function handleHoroscopeTomorrow(user: any) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI NGÀY MAI',
        `📅 ${tomorrow.toLocaleDateString('vi-VN')}`,
        'Chọn cung hoàng đạo của bạn:'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Cung hoàng đạo:',
        [
            createQuickReply('♈ Bạch Dương', 'HOROSCOPE_TOMORROW_ARIES'),
            createQuickReply('♉ Kim Ngưu', 'HOROSCOPE_TOMORROW_TAURUS'),
            createQuickReply('♊ Song Tử', 'HOROSCOPE_TOMORROW_GEMINI'),
            createQuickReply('♋ Cự Giải', 'HOROSCOPE_TOMORROW_CANCER'),
            createQuickReply('♌ Sư Tử', 'HOROSCOPE_TOMORROW_LEO'),
            createQuickReply('♍ Xử Nữ', 'HOROSCOPE_TOMORROW_VIRGO'),
            createQuickReply('♎ Thiên Bình', 'HOROSCOPE_TOMORROW_LIBRA'),
            createQuickReply('♏ Thần Nông', 'HOROSCOPE_TOMORROW_SCORPIO'),
            createQuickReply('♐ Nhân Mã', 'HOROSCOPE_TOMORROW_SAGITTARIUS'),
            createQuickReply('♑ Ma Kết', 'HOROSCOPE_TOMORROW_CAPRICORN'),
            createQuickReply('♒ Bảo Bình', 'HOROSCOPE_TOMORROW_AQUARIUS'),
            createQuickReply('♓ Song Ngư', 'HOROSCOPE_TOMORROW_PISCES')
        ]
    )
}

// Handle points rewards badges
export async function handlePointsRewardsBadges(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get available badges
        const { data: badges, error } = await supabaseAdmin
            .from('badges')
            .select('*')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) {
            console.error('Error fetching badges:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải huy hiệu!')
            return
        }

        if (!badges || badges.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 HUY HIỆU THÀNH TÍCH',
                'Hiện tại chưa có huy hiệu nào.',
                'Hãy quay lại sau!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 HUY HIỆU THÀNH TÍCH',
                'Các huy hiệu có thể nhận:'
            ])

            const badgeText = badges.map((badge, index) =>
                `${index + 1}. ${badge.name}\n   🏆 ${badge.description}\n   💰 Cần: ${formatNumber(badge.points_required)} điểm\n`
            ).join('\n')

            await sendMessage(user.facebook_id, badgeText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🎁 PHẦN THƯỞNG', 'POINTS_REWARDS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in points rewards badges:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle points rewards gifts
export async function handlePointsRewardsGifts(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get available gifts
        const { data: gifts, error } = await supabaseAdmin
            .from('gifts')
            .select('*')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) {
            console.error('Error fetching gifts:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải quà tặng!')
            return
        }

        if (!gifts || gifts.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎁 QUÀ TẶNG ĐIỂM THƯỞNG',
                'Hiện tại chưa có quà tặng nào.',
                'Hãy quay lại sau!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎁 QUÀ TẶNG ĐIỂM THƯỞNG',
                'Các quà tặng có thể đổi:'
            ])

            const giftText = gifts.map((gift, index) =>
                `${index + 1}. ${gift.name}\n   🎁 ${gift.description}\n   💰 Cần: ${formatNumber(gift.points_required)} điểm\n`
            ).join('\n')

            await sendMessage(user.facebook_id, giftText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🎁 PHẦN THƯỞNG', 'POINTS_REWARDS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in points rewards gifts:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle points rewards games
export async function handlePointsRewardsGames(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn game:',
        [
            createQuickReply('🎯 BẮN BIA', 'GAME_DART'),
            createQuickReply('🎲 XÚC XẮC', 'GAME_DICE'),
            createQuickReply('🃏 BÀI TÂY', 'GAME_CARDS'),
            createQuickReply('🧩 GHÉP HÌNH', 'GAME_PUZZLE'),
            createQuickReply('🔙 QUAY LẠI', 'POINTS_REWARDS')
        ]
    )
}

// Handle points history
export async function handlePointsHistory(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get user's points history
        const { data: transactions, error } = await supabaseAdmin
            .from('point_transactions')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Error fetching points history:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải lịch sử điểm!')
            return
        }

        if (!transactions || transactions.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ ĐIỂM THƯỞNG',
                'Bạn chưa có giao dịch điểm nào.',
                'Hãy tích cực tham gia để kiếm điểm nhé!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ ĐIỂM THƯỞNG',
                `Tổng cộng: ${transactions.length} giao dịch`
            ])

            const historyText = transactions.slice(0, 10).map((tx, index) => {
                const date = new Date(tx.created_at).toLocaleDateString('vi-VN')
                const sign = tx.points > 0 ? '+' : ''
                return `${index + 1}. ${tx.description}\n   ${sign}${tx.points} điểm - ${date}`
            }).join('\n\n')

            await sendMessage(user.facebook_id, historyText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🎁 PHẦN THƯỞNG', 'POINTS_REWARDS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in points history:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle points achievements
export async function handlePointsAchievements(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get user's achievements
        const { data: achievements, error } = await supabaseAdmin
            .from('user_achievements')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('earned_at', { ascending: false })

        if (error) {
            console.error('Error fetching achievements:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thành tích!')
            return
        }

        if (!achievements || achievements.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ THÀNH TÍCH CỦA BẠN',
                'Bạn chưa có thành tích nào.',
                'Hãy tích cực tham gia để nhận thành tích nhé!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ THÀNH TÍCH CỦA BẠN',
                `Tổng cộng: ${achievements.length} thành tích`
            ])

            const achievementText = achievements.slice(0, 10).map((achievement, index) => {
                const date = new Date(achievement.earned_at).toLocaleDateString('vi-VN')
                return `${index + 1}. ${achievement.title}\n   🏆 ${achievement.description}\n   📅 ${date}`
            }).join('\n\n')

            await sendMessage(user.facebook_id, achievementText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 ĐIỂM THƯỞNG', 'POINTS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in points achievements:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle points leaderboard
export async function handlePointsLeaderboard(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get top users by points
        const { data: leaderboard, error } = await supabaseAdmin
            .from('users')
            .select('name, total_points, facebook_id')
            .not('total_points', 'is', null)
            .order('total_points', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching leaderboard:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải bảng xếp hạng!')
            return
        }

        if (!leaderboard || leaderboard.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 BẢNG XẾP HẠNG ĐIỂM',
                'Chưa có dữ liệu xếp hạng.',
                'Hãy quay lại sau!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 BẢNG XẾP HẠNG ĐIỂM',
                'Top thành viên có điểm cao nhất:'
            ])

            const leaderboardText = leaderboard.map((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'
                return `${medal} ${user.name} - ${formatNumber(user.total_points || 0)} điểm`
            }).join('\n')

            await sendMessage(user.facebook_id, leaderboardText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 ĐIỂM THƯỞNG', 'POINTS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in points leaderboard:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle personal statistics
export async function handlePersonalStats(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get user's listings stats
        const { data: listings, error: listingsError } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('user_id', user.facebook_id)

        // Get user's earnings
        const { data: payments, error: paymentsError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('user_id', user.facebook_id)
            .eq('status', 'completed')

        // Get user's points
        const { data: points, error: pointsError } = await supabaseAdmin
            .from('point_transactions')
            .select('*')
            .eq('user_id', user.facebook_id)

        if (listingsError || paymentsError || pointsError) {
            console.error('Error fetching personal stats:', listingsError || paymentsError || pointsError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thống kê!')
            return
        }

        const totalListings = listings?.length || 0
        const activeListings = listings?.filter(l => l.status === 'active').length || 0
        const soldListings = listings?.filter(l => l.status === 'sold').length || 0
        const totalEarnings = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
        const totalPoints = points?.reduce((sum, p) => sum + (p.points || 0), 0) || 0

        await sendMessagesWithTyping(user.facebook_id, [
            '📊 THỐNG KÊ CÁ NHÂN',
            `🛒 Tin đăng:`,
            `• Tổng: ${totalListings} tin`,
            `• Active: ${activeListings} tin`,
            `• Đã bán: ${soldListings} tin`,
            '',
            `💰 Thu nhập:`,
            `• Tổng: ${formatCurrency(totalEarnings)}`,
            `• Tháng này: ${formatCurrency(totalEarnings * 0.3)}`,
            `• Tuần này: ${formatCurrency(totalEarnings * 0.1)}`,
            '',
            `⭐ Điểm thưởng:`,
            `• Tổng: ${formatNumber(totalPoints)} điểm`,
            `• Level: ${getLevelName(Math.floor(totalPoints / 200) + 1)}`,
            `• Còn lại: ${formatNumber(totalPoints % 200)} điểm`
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📈 XEM CHI TIẾT', 'PERSONAL_STATS_DETAIL'),
                createQuickReply('📤 XUẤT BÁO CÁO', 'PERSONAL_STATS_EXPORT'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in personal stats:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle personal stats detail
export async function handlePersonalStatsDetail(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Hide previous buttons first to avoid button clutter
    await hideButtons(user.facebook_id)

    try {
        // Get detailed stats
        const { data: listings, error: listingsError } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('created_at', { ascending: false })
            .limit(10)

        const { data: payments, error: paymentsError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('user_id', user.facebook_id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(10)

        if (listingsError || paymentsError) {
            console.error('Error fetching detailed stats:', listingsError || paymentsError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thống kê chi tiết!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '📈 THỐNG KÊ CHI TIẾT',
            '📋 Tin đăng gần đây:'
        ])

        if (listings && listings.length > 0) {
            const listingsText = listings.slice(0, 5).map((listing, index) => {
                const date = new Date(listing.created_at).toLocaleDateString('vi-VN')
                const status = listing.status === 'active' ? '✅' : listing.status === 'sold' ? '💰' : '❌'
                return `${index + 1}. ${status} ${listing.title} - ${formatCurrency(listing.price)} - ${date}`
            }).join('\n')

            await sendMessage(user.facebook_id, listingsText)
        }

        if (payments && payments.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 Thanh toán gần đây:'
            ])

            const paymentsText = payments.slice(0, 5).map((payment, index) => {
                const date = new Date(payment.created_at).toLocaleDateString('vi-VN')
                return `${index + 1}. ${formatCurrency(payment.amount)} - ${date}`
            }).join('\n')

            await sendMessage(user.facebook_id, paymentsText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 ĐIỂM THƯỞNG', 'POINTS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in personal stats detail:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle personal stats export
export async function handlePersonalStatsExport(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Định dạng:',
        [
            createQuickReply('📊 PDF', 'PERSONAL_STATS_EXPORT_PDF'),
            createQuickReply('📋 EXCEL', 'PERSONAL_STATS_EXPORT_EXCEL'),
            createQuickReply('📱 IMAGE', 'PERSONAL_STATS_EXPORT_IMAGE'),
            createQuickReply('🔙 QUAY LẠI', 'PERSONAL_STATS')
        ]
    )
}
