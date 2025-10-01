import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    sendGenericTemplate,
    sendCarouselTemplate,
    createQuickReply,
    createPostbackButton,
    createGenericElement,
    sendMessagesWithTyping
} from './facebook-api'
import {
    CATEGORIES,
    LOCATIONS,
    DISTRICTS,
    PRICE_RANGES,
    AD_PACKAGES,
    BOT_CONFIG
} from './constants'
import {
    formatCurrency,
    formatNumber,
    generateReferralCode,
    calculateUserLevel,
    daysUntilExpiry,
    isTrialUser,
    isExpiredUser,
    generateHoroscope,
    validatePhoneNumber,
    generateId
} from './utils'

// Main message handler
export async function handleMessage(user: any, text: string) {
    try {
        // Check if user exists
        if (!user) {
            await sendMessage('123456789', 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.')
            return
        }

        // Check if user is expired
        if (isExpiredUser(user.membership_expires_at)) {
            await sendExpiredMessage(user.facebook_id)
            return
        }

        // Check if user is in trial and about to expire
        if (isTrialUser(user.membership_expires_at)) {
            const daysLeft = daysUntilExpiry(user.membership_expires_at!)
            if (daysLeft <= 2) {
                await sendTrialExpiringMessage(user.facebook_id, daysLeft)
            }
        }

        // Handle different message types
        if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
            await handleRegistration(user)
        } else if (text.includes('niêm yết') || text.includes('NIÊM YẾT')) {
            await handleListing(user)
        } else if (text.includes('tìm kiếm') || text.includes('TÌM KIẾM')) {
            await handleSearch(user)
        } else if (text.includes('cộng đồng') || text.includes('CỘNG ĐỒNG')) {
            await handleCommunity(user)
        } else if (text.includes('thanh toán') || text.includes('THANH TOÁN')) {
            await handlePayment(user)
        } else if (text.includes('tử vi') || text.includes('TỬ VI')) {
            await handleHoroscope(user)
        } else if (text.includes('điểm thưởng') || text.includes('ĐIỂM THƯỞNG')) {
            await handlePoints(user)
        } else if (text.includes('cài đặt') || text.includes('CÀI ĐẶT')) {
            await handleSettings(user)
        } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
            await handleSupport(user)
        } else {
            await handleDefaultMessage(user)
        }
    } catch (error) {
        console.error('Error handling message:', error)
        await sendMessage(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle postback (button clicks)
export async function handlePostback(user: any, payload: string) {
    try {
        const [action, ...params] = payload.split('_')

        switch (action) {
            case 'REGISTER':
                await handleRegistration(user)
                break
            case 'LISTING':
                await handleListing(user)
                break
            case 'SEARCH':
                await handleSearch(user)
                break
            case 'COMMUNITY':
                await handleCommunity(user)
                break
            case 'PAYMENT':
                await handlePayment(user)
                break
            case 'HOROSCOPE':
                await handleHoroscope(user)
                break
            case 'POINTS':
                await handlePoints(user)
                break
            case 'SETTINGS':
                await handleSettings(user)
                break
            case 'SUPPORT':
                await handleSupport(user)
                break
            case 'MAIN_MENU':
                await showMainMenu(user)
                break
            default:
                await handleDefaultMessage(user)
        }
    } catch (error) {
        console.error('Error handling postback:', error)
        await sendMessage(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin commands
export async function handleAdminCommand(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '🔧 ADMIN DASHBOARD\n\nChào admin! 👋',
        [
            createPostbackButton('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
            createPostbackButton('👥 USER', 'ADMIN_USERS'),
            createPostbackButton('🛒 TIN ĐĂNG', 'ADMIN_LISTINGS'),
            createPostbackButton('📊 THỐNG KÊ', 'ADMIN_STATS')
        ]
    )
}

// Handle payment receipt
export async function handlePaymentReceipt(user: any, imageUrl: string) {
    try {
        // Save payment with receipt
        const { error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: user.id,
                amount: BOT_CONFIG.DAILY_FEE * BOT_CONFIG.MINIMUM_DAYS,
                receipt_image: imageUrl,
                status: 'pending'
            })

        if (error) {
            throw error
        }

        await sendMessage(
            user.facebook_id,
            '✅ BIÊN LAI ĐÃ NHẬN\n\n📸 Biên lai đã được lưu:\n• Số tiền: 7,000đ\n• Thời gian: ' + new Date().toLocaleString('vi-VN') + '\n• Trạng thái: Đang xử lý...\n\n⏱️ Thời gian xử lý: 2-4 giờ\n📱 Sẽ thông báo khi duyệt'
        )

        // Reset bot session
        await updateBotSession(user.id, {})
    } catch (error) {
        console.error('Error handling payment receipt:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xử lý biên lai. Vui lòng thử lại!')
    }
}

// Handle listing images
export async function handleListingImages(user: any, imageUrl: string) {
    try {
        const session = await getBotSession(user.id)
        if (!session) return

        const sessionData = session.session_data || {}
        const images = sessionData.images || []
        images.push(imageUrl)

        await updateBotSession(user.id, {
            ...sessionData,
            images: images
        })

        await sendMessage(
            user.facebook_id,
            `✅ Đã nhận ${images.length} ảnh\n\n📸 Bạn có thể gửi thêm ảnh hoặc bỏ qua để tiếp tục\n\n[📷 Chụp ảnh] [📁 Chọn từ thư viện] [⏭️ Bỏ qua]`
        )
    } catch (error) {
        console.error('Error handling listing images:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại!')
    }
}

// Show main menu
async function showMainMenu(user: any) {
    const statusText = isTrialUser(user.membership_expires_at)
        ? `Trial ${daysUntilExpiry(user.membership_expires_at!)} ngày`
        : 'Đã thanh toán'

    await sendButtonTemplate(
        user.facebook_id,
        `🏠 TRANG CHỦ TÂN DẬU\n\nChào anh/chị ${user.name}! 👋\n\n📊 Trạng thái: ${statusText}\n⭐ Điểm: 150 sao | Level: ${calculateUserLevel(150)}\n🎂 Sinh nhật: 1981 (42 tuổi)`,
        [
            createPostbackButton('🛒 NIÊM YẾT', 'LISTING'),
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('💬 KẾT NỐI', 'CONNECT'),
            createPostbackButton('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT'),
            createPostbackButton('⭐ ĐIỂM THƯỞNG', 'POINTS'),
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'SETTINGS')
        ]
    )
}

// Handle registration
async function handleRegistration(user: any) {
    if (user.status !== 'trial' && user.status !== 'active') {
        await sendMessagesWithTyping(user.facebook_id, [
            '📝 ĐĂNG KÝ THÀNH VIÊN\n\nChào bạn! Tôi sẽ hướng dẫn bạn đăng ký từng bước.\n\nBước 1/4: Họ tên\n👤 Vui lòng nhập họ tên đầy đủ của bạn:',
            'VD: Nguyễn Văn Minh'
        ])

        await updateBotSession(user.id, {
            current_flow: 'registration',
            current_step: 1,
            data: {}
        })
    } else {
        await sendMessage(user.facebook_id, 'Bạn đã đăng ký rồi! Sử dụng menu bên dưới để tiếp tục.')
        await showMainMenu(user)
    }
}

// Handle listing
async function handleListing(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '🛒 NIÊM YẾT SẢN PHẨM/DỊCH VỤ\n\nChọn loại tin đăng bạn muốn đăng:',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'LISTING_CATEGORY_BẤT ĐỘNG SẢN'),
            createPostbackButton('🚗 Ô TÔ', 'LISTING_CATEGORY_Ô TÔ'),
            createPostbackButton('📱 ĐIỆN TỬ', 'LISTING_CATEGORY_ĐIỆN TỬ'),
            createPostbackButton('👕 THỜI TRANG', 'LISTING_CATEGORY_THỜI TRANG'),
            createPostbackButton('🍽️ ẨM THỰC', 'LISTING_CATEGORY_ẨM THỰC'),
            createPostbackButton('🔧 DỊCH VỤ', 'LISTING_CATEGORY_DỊCH VỤ')
        ]
    )
}

// Handle search
async function handleSearch(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '🔍 TÌM KIẾM SẢN PHẨM/DỊCH VỤ\n\nBạn muốn tìm gì?',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'SEARCH_CATEGORY_BẤT ĐỘNG SẢN'),
            createPostbackButton('🚗 Ô TÔ', 'SEARCH_CATEGORY_Ô TÔ'),
            createPostbackButton('📱 ĐIỆN TỬ', 'SEARCH_CATEGORY_ĐIỆN TỬ'),
            createPostbackButton('👕 THỜI TRANG', 'SEARCH_CATEGORY_THỜI TRANG'),
            createPostbackButton('🍽️ ẨM THỰC', 'SEARCH_CATEGORY_ẨM THỰC'),
            createPostbackButton('🔧 DỊCH VỤ', 'SEARCH_CATEGORY_DỊCH VỤ'),
            createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
            createPostbackButton('🔍 TÌM THEO TỪ KHÓA', 'SEARCH_KEYWORD')
        ]
    )
}

// Handle community
async function handleCommunity(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '👥 CỘNG ĐỒNG TÂN DẬU - HỖ TRỢ CHÉO',
        [
            createPostbackButton('🎂 SINH NHẬT', 'COMMUNITY_BIRTHDAY'),
            createPostbackButton('🏆 TOP SELLER', 'COMMUNITY_TOP_SELLER'),
            createPostbackButton('📖 KỶ NIỆM', 'COMMUNITY_MEMORIES'),
            createPostbackButton('🎪 SỰ KIỆN', 'COMMUNITY_EVENTS'),
            createPostbackButton('⭐ THÀNH TÍCH', 'COMMUNITY_ACHIEVEMENTS'),
            createPostbackButton('🔮 TỬ VI', 'COMMUNITY_HOROSCOPE'),
            createPostbackButton('🤝 HỖ TRỢ CHÉO', 'COMMUNITY_SUPPORT'),
            createPostbackButton('💬 CHAT NHÓM', 'COMMUNITY_CHAT')
        ]
    )
}

// Handle payment
async function handlePayment(user: any) {
    if (isTrialUser(user.membership_expires_at)) {
        const daysLeft = daysUntilExpiry(user.membership_expires_at!)
        await sendMessagesWithTyping(user.facebook_id, [
            '⏰ THÔNG BÁO QUAN TRỌNG\n\nTrial của bạn còn ' + daysLeft + ' ngày!',
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Bạn muốn thanh toán ngay không?',
            [
                createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_CONFIRM'),
                createPostbackButton('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
                createPostbackButton('ℹ️ TÌM HIỂU', 'PAYMENT_INFO')
            ]
        )
    } else {
        await sendMessage(user.facebook_id, 'Tài khoản của bạn đã được thanh toán!')
        await showMainMenu(user)
    }
}

// Handle horoscope
async function handleHoroscope(user: any) {
    const horoscope = generateHoroscope()

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI TÂN DẬU HÔM NAY\n\n📅 ' + new Date().toLocaleDateString('vi-VN') + '\n🐓 Tuổi: Tân Dậu (1981)\n⭐ Tổng quan: 4/5 sao',
        '💰 Tài lộc: ' + horoscope.fortune + ' - Nên đầu tư BĐS\n❤️ Tình cảm: ' + horoscope.love + ' - Gặp gỡ bạn bè\n🏥 Sức khỏe: ' + horoscope.health + ' - Nghỉ ngơi',
        '🎯 Lời khuyên: ' + horoscope.advice + '\n🎨 Màu may mắn: ' + horoscope.luckyColor + '\n🔢 Số may mắn: ' + horoscope.luckyNumber
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn xem chi tiết không?',
        [
            createPostbackButton('🎲 XEM CHI TIẾT', 'HOROSCOPE_DETAIL'),
            createPostbackButton('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createPostbackButton('🔮 XEM THÁNG', 'HOROSCOPE_MONTH'),
            createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle points
async function handlePoints(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⭐ HỆ THỐNG ĐIỂM THƯỞNG\n\n🏆 Level hiện tại: ' + calculateUserLevel(150) + ' (150/200 điểm)\n⭐ Tổng điểm: 1,250 điểm\n🎯 Streak: 7 ngày liên tiếp',
        '📈 Hoạt động hôm nay:\n• Đăng nhập: +2 điểm ✅\n• Tạo tin đăng: +10 điểm ✅\n• Nhận đánh giá: +5 điểm ✅\n• Chia sẻ kỷ niệm: +3 điểm ✅'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        '🎁 Phần thưởng có thể đổi:',
        [
            createPostbackButton('💳 Giảm giá', 'POINTS_REWARDS_DISCOUNT'),
            createPostbackButton('🏆 Huy hiệu', 'POINTS_REWARDS_BADGES'),
            createPostbackButton('🎁 Quà tặng', 'POINTS_REWARDS_GIFTS'),
            createPostbackButton('🎮 Game', 'POINTS_REWARDS_GAMES'),
            createPostbackButton('📊 XEM LỊCH SỬ', 'POINTS_HISTORY'),
            createPostbackButton('🎯 THÀNH TÍCH', 'POINTS_ACHIEVEMENTS'),
            createPostbackButton('🏆 LEADERBOARD', 'POINTS_LEADERBOARD')
        ]
    )
}

// Handle settings
async function handleSettings(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '⚙️ CÀI ĐẶT',
        [
            createPostbackButton('👤 THÔNG TIN CÁ NHÂN', 'SETTINGS_PROFILE'),
            createPostbackButton('🔔 THÔNG BÁO', 'SETTINGS_NOTIFICATIONS'),
            createPostbackButton('🔒 BẢO MẬT', 'SETTINGS_SECURITY'),
            createPostbackButton('🌐 NGÔN NGỮ', 'SETTINGS_LANGUAGE'),
            createPostbackButton('🎨 GIAO DIỆN', 'SETTINGS_THEME'),
            createPostbackButton('📊 PRIVACY', 'SETTINGS_PRIVACY'),
            createPostbackButton('❓ HỖ TRỢ', 'SUPPORT'),
            createPostbackButton('📱 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle support
async function handleSupport(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '💬 CHỌN CHẾ ĐỘ CHAT\n\n🤖 [BOT TÂN DẬU] - Hệ thống tự động\n   • Gợi ý sản phẩm thông minh\n   • Cross-selling tự động\n   • Trả lời câu hỏi thường gặp\n\n👨‍💼 [ADMIN HỖ TRỢ] - Hỗ trợ trực tiếp\n   • Tư vấn cá nhân hóa\n   • Giải quyết vấn đề phức tạp\n   • Hỗ trợ kỹ thuật',
        [
            createPostbackButton('🤖 CHAT BOT', 'SUPPORT_BOT'),
            createPostbackButton('👨‍💼 CHAT ADMIN', 'SUPPORT_ADMIN')
        ]
    )
}

// Handle default message
async function handleDefaultMessage(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🤖 Tôi đã sẵn sàng hỗ trợ bạn!',
        'Bạn có thể hỏi tôi về:\n• Tìm kiếm sản phẩm/dịch vụ\n• Hướng dẫn sử dụng\n• Thông tin cộng đồng\n• Tử vi hàng ngày'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn chức năng bạn muốn sử dụng:',
        [
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('❓ HỖ TRỢ', 'SUPPORT'),
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE'),
            createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Send expired message
async function sendExpiredMessage(facebookId: string) {
    await sendMessagesWithTyping(facebookId, [
        '⏰ TRIAL ĐÃ HẾT HẠN!\n\nTrial của bạn đã hết hạn!',
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
    ])

    await sendButtonTemplate(
        facebookId,
        'Bạn muốn thanh toán để tiếp tục sử dụng không?',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_CONFIRM'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('❌ HỦY', 'CANCEL')
        ]
    )
}

// Send trial expiring message
async function sendTrialExpiringMessage(facebookId: string, daysLeft: number) {
    const urgency = daysLeft === 1 ? '🚨 CẢNH BÁO TRIAL SẮP HẾT!' : '⏰ THÔNG BÁO QUAN TRỌNG'

    await sendMessagesWithTyping(facebookId, [
        urgency + '\n\nTrial của bạn còn ' + daysLeft + ' ngày!',
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
    ])

    await sendButtonTemplate(
        facebookId,
        'Bạn muốn thanh toán ngay không?',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_CONFIRM'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('❌ HỦY', 'CANCEL')
        ]
    )
}

// Helper functions
async function getBotSession(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('bot_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) {
        return null
    }

    return data
}

async function updateBotSession(userId: string, sessionData: any) {
    const { error } = await supabaseAdmin
        .from('bot_sessions')
        .upsert({
            user_id: userId,
            session_data: sessionData,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('Error updating bot session:', error)
    }
}
