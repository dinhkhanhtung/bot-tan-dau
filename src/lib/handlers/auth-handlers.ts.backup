import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import {
    formatCurrency,
    generateReferralCode,
    isTrialUser,
    isExpiredUser,
    daysUntilExpiry,
    generateId,
    updateBotSession,
    getBotSession,
    getUserStatusInfo,
    shouldSendTrialNotification,
    getTrialNotificationMessage
} from '../utils'
import { LOCATIONS, DISTRICTS, BOT_INFO, BOT_CONFIG } from '../constants'

/**
 * Handle registration flow - Optimized version
 */
export async function handleRegistration(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Admin check is now handled at higher level (FACEBOOK_APP_ID)
    // This function only handles regular user registration

    // Use smart user status checking
    const userStatusInfo = getUserStatusInfo(user)

    // Handle different user categories
    if (userStatusInfo.category === 'guest') {
        // User chưa đăng ký - không có thông tin gì
        // Chuyển thẳng xuống phần đăng ký
    } else if (userStatusInfo.category === 'trial' && userStatusInfo.canUseBot) {
        // User đang trong thời gian trial và có thể sử dụng bot
        await sendMessage(user.facebook_id, `✅ Bạn đã đăng ký rồi!\n📅 Trial còn ${userStatusInfo.daysLeft} ngày\n💡 Hãy thanh toán để tiếp tục sử dụng.`)

        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('🛒 NIÊM YẾT', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT')
            ]
        )
        return
    } else if (userStatusInfo.category === 'active' && userStatusInfo.canUseBot) {
        // User đã thanh toán và có thể sử dụng bot
        await sendMessage(user.facebook_id, '✅ Bạn đã đăng ký rồi!\nSử dụng menu bên dưới để truy cập các tính năng.')

        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('🛒 NIÊM YẾT', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT')
            ]
        )
        return
    } else if (userStatusInfo.category === 'expired' || userStatusInfo.category === 'suspended') {
        // User hết hạn hoặc bị suspend - không thể sử dụng bot
        await sendExpiredMessage(user.facebook_id)
        return
    }

    // OPTIMIZED: Single screen with essential info first
    await sendMessage(user.facebook_id, '🚀 ĐĂNG KÝ NHANH - Tân Dậu Hỗ Trợ Chéo')

    await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n📋 THÔNG TIN BẮT BUỘC:\n• Họ tên đầy đủ\n• Số điện thoại\n• Tỉnh/thành sinh sống\n• Xác nhận sinh năm 1981\n━━━━━━━━━━━━━━━━━━━━\n📝 THÔNG TIN TÙY CHỌN:\n• Từ khóa tìm kiếm\n• Sản phẩm/dịch vụ\n━━━━━━━━━━━━━━━━━━━━')



    // Create session for registration flow
    const sessionData = {
        current_flow: 'registration',
        step: 'name',
        data: {},
        started_at: new Date().toISOString()
    }

    await updateBotSession(user.facebook_id, sessionData)

    // Start with first step - SIMPLIFIED
    await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 1/4)\n━━━━━━━━━━━━━━━━━━━━\n👤 HỌ TÊN ĐẦY ĐỦ\nVui lòng nhập họ tên đầy đủ của bạn:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: Đinh Khánh Tùng\n📝 Nhập họ tên để tiếp tục:')

    // Verify session was created
    const sessionCheck = await getBotSession(user.facebook_id)
    console.log('Session created for registration:', sessionCheck)
}

// Handle registration step
export async function handleRegistrationStep(user: any, text: string, session: any) {
    // Check for exit commands
    if (text.toLowerCase().includes('hủy') || text.toLowerCase().includes('thoát') || text.toLowerCase().includes('cancel')) {
        await handleRegistrationCancel(user)
        return
    }

    // Check if session is too old (more than 30 minutes)
    if (session.started_at) {
        const sessionAge = Date.now() - new Date(session.started_at).getTime()
        if (sessionAge > 30 * 60 * 1000) { // 30 minutes
            await handleRegistrationTimeout(user)
            return
        }
    }

    switch (session.step) {
        case 'name':
            await handleRegistrationName(user, text, session.data)
            break
        case 'phone':
            await handleRegistrationPhone(user, text, session.data)
            break
        case 'location':
            await handleRegistrationLocation(user, text, session.data)
            break
        case 'birthday':
            await handleRegistrationBirthday(user, text, session.data)
            break
        case 'birthday_confirm':
            // This step is handled by postback buttons, not text input
            await sendMessage(user.facebook_id, '❌ Vui lòng chọn nút xác nhận bên dưới để tiếp tục!')
            break
        case 'keywords':
            await handleRegistrationKeywords(user, text, session.data)
            break
        case 'product_service':
            await handleRegistrationProductService(user, text, session.data)
            break
        default:
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng bắt đầu đăng ký lại!')
            await updateBotSession(user.facebook_id, null)
    }
}

// Handle name input
async function handleRegistrationName(user: any, text: string, data: any) {
    if (text.length < 2) {
        await sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ:')
        return
    }

    data.name = text.trim()

    await sendMessage(user.facebook_id, `✅ Họ tên: ${data.name}\n📝 Bước 2/4: Số điện thoại\n📱 Vui lòng nhập số điện thoại của bạn:`)

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'phone',
        data: data,
        started_at: new Date().toISOString()
    })
}

// Handle phone input
async function handleRegistrationPhone(user: any, text: string, data: any) {
    const phone = text.replace(/\D/g, '').trim()

    if (phone.length < 10) {
        await sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ. Vui lòng nhập lại:')
        return
    }

    // Check if phone already exists
    const { data: existingUser, error } = await supabaseAdmin
        .from('users')
        .select('facebook_id')
        .eq('phone', phone)
        .single()

    if (existingUser && existingUser.facebook_id !== user.facebook_id) {
        await sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng. Vui lòng nhập số khác:')
        return
    }

    data.phone = phone

    await sendMessage(user.facebook_id, `✅ SĐT: ${phone}\n📝 Bước 3/4: Vị trí\n📍 Vui lòng chọn tỉnh/thành bạn đang sinh sống:`)

    // Tạo danh sách vị trí thông minh - hiển thị các thành phố lớn trước
    const majorCities = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ']
    const locationButtons = []

    // Thêm các thành phố lớn với icon đặc biệt
    majorCities.forEach((city, index) => {
        const icons = ['🏠', '🏢', '🏖️', '🌊', '🏔️']
        locationButtons.push(createQuickReply(`${icons[index]} ${city}`, `REG_LOCATION_${city.replace(/[^A-Z0-9]/g, '_')}`))
    })

    // Thêm một số tỉnh lớn khác
    const majorProvinces = ['BÌNH DƯƠNG', 'ĐỒNG NAI', 'KHÁNH HÒA', 'LÂM ĐỒNG', 'BẮC NINH', 'THỪA THIÊN HUẾ']
    majorProvinces.forEach(province => {
        if (!majorCities.includes(province)) {
            locationButtons.push(createQuickReply(`🏘️ ${province}`, `REG_LOCATION_${province.replace(/[^A-Z0-9]/g, '_')}`))
        }
    })

    // Thêm nút "Khác" để hiển thị thêm tùy chọn
    locationButtons.push(createQuickReply('🏞️ XEM THÊM TỈNH KHÁC', 'REG_LOCATION_MORE'))

    await sendQuickReply(
        user.facebook_id,
        'Chọn tỉnh/thành phố bạn đang sinh sống:',
        locationButtons
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'location',
        data: data,
        started_at: new Date().toISOString()
    })
}

// Handle location selection
export async function handleRegistrationLocationPostback(user: any, location: string) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') return

    const data = session.data
    data.location = location

    await sendMessage(user.facebook_id, `✅ Vị trí: ${location}\n📝 Bước 4/4: Xác nhận tuổi\n🎂 Đây là bước quan trọng nhất!\n❓ Bạn có phải sinh năm 1981 (Tân Dậu) không?`)

    await sendQuickReply(
        user.facebook_id,
        'Xác nhận tuổi:',
        [
            createQuickReply('✅ CÓ - TÔI SINH NĂM 1981', 'REG_BIRTHDAY_YES'),
            createQuickReply('❌ KHÔNG - TÔI SINH NĂM KHÁC', 'REG_BIRTHDAY_NO')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'birthday_confirm',
        data: data,
        started_at: new Date().toISOString()
    })
}

// Handle birthday verification
export async function handleBirthdayVerification(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') return

    const data = session.data

    await sendMessage(user.facebook_id, '✅ Xác nhận tuổi thành công!\n📝 Thông tin tùy chọn (có thể bỏ qua)\n━━━━━━━━━━━━━━━━━━━━\n🔍 Từ khóa tìm kiếm:\nVD: nhà đất, xe honda, điện thoại...\n━━━━━━━━━━━━━━━━━━━━\n🛒 Sản phẩm/Dịch vụ:\nVD: Nhà đất, xe cộ, điện tử...\n━━━━━━━━━━━━━━━━━━━━\n💡 Nhập: "Từ khóa, sản phẩm" hoặc "bỏ qua"')

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'keywords',
        data: data,
        started_at: new Date().toISOString()
    })
}

// Handle birthday rejection
export async function handleBirthdayRejection(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⚠️ THÔNG BÁO QUAN TRỌNG',
        'Bot Tân Dậu - Hỗ Trợ Chéo được tạo ra dành riêng cho cộng đồng Tân Dậu - Hỗ Trợ Chéo.',
        '🎯 Mục đích:\n• Kết nối mua bán trong cộng đồng cùng tuổi\n• Chia sẻ kinh nghiệm và kỷ niệm\n• Hỗ trợ lẫn nhau trong cuộc sống',
        '💡 Nếu bạn không phải Tân Dậu - Hỗ Trợ Chéo:\n• Có thể sử dụng các platform khác\n• Hoặc giới thiệu cho bạn bè Tân Dậu - Hỗ Trợ Chéo',
        '❌ Đăng ký đã bị hủy do không đúng đối tượng mục tiêu.'
    ])

    // Clear session
    await updateBotSession(user.facebook_id, null)

    await sendQuickReply(
        user.facebook_id,
        'Lựa chọn:',
        [
            createQuickReply('🔄 ĐĂNG KÝ LẠI', 'REGISTER'),
            createQuickReply('ℹ️ THÔNG TIN', 'INFO')
        ]
    )
}

// Handle registration cancellation
export async function handleRegistrationCancel(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '❌ ĐÃ HỦY ĐĂNG KÝ',
        'Quy trình đăng ký đã được hủy bỏ.',
        'Bạn có thể đăng ký lại bất cứ lúc nào!'
    ])

    // Clear session
    await updateBotSession(user.facebook_id, null)

    await sendQuickReply(
        user.facebook_id,
        'Bạn muốn:',
        [
            createQuickReply('🔄 ĐĂNG KÝ LẠI', 'REGISTER'),
            createQuickReply('ℹ️ THÔNG TIN', 'INFO'),
            createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle registration timeout
export async function handleRegistrationTimeout(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⏰ PHIÊN ĐĂNG KÝ ĐÃ HẾT HẠN',
        'Quy trình đăng ký đã quá 30 phút và được tự động hủy.',
        'Điều này giúp tránh thông tin cũ không chính xác.',
        '💡 Bạn có thể bắt đầu đăng ký lại!'
    ])

    // Clear session
    await updateBotSession(user.facebook_id, null)

    await sendQuickReply(
        user.facebook_id,
        'Bạn muốn:',
        [
            createQuickReply('🔄 ĐĂNG KÝ LẠI', 'REGISTER'),
            createQuickReply('ℹ️ THÔNG TIN', 'INFO'),
            createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle keywords input for better search
async function handleRegistrationKeywords(user: any, text: string, data: any) {
    if (text.toLowerCase().includes('bỏ qua') || text.toLowerCase().includes('không')) {
        data.keywords = null
        data.product_service = null
    } else {
        // Try to parse combined input: "keywords, product_service"
        const parts = text.split(',').map(part => part.trim())
        if (parts.length >= 1) {
            data.keywords = parts[0] || null
            data.product_service = parts[1] || null
        } else {
            data.keywords = text
            data.product_service = null
        }
    }

    await sendMessage(user.facebook_id, data.keywords ? `✅ Từ khóa: ${data.keywords}` : '✅ Bỏ qua thông tin tùy chọn')

    // Complete registration
    await completeRegistration(user, data)
}

// Handle default message for new users - GIẢM SPAM
export async function handleDefaultMessage(user: any) {
    // Admin check is now handled at higher level (FACEBOOK_APP_ID)
    // This function only handles regular user messages

    // Kiểm tra xem đã gửi thông báo chào mừng chưa
    const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('welcome_message_sent')
        .eq('facebook_id', user.facebook_id)
        .single()

    // Nếu đã gửi thông báo chào mừng rồi, CHỈ hiển thị menu, KHÔNG gửi thông báo lặp lại
    if (existingUser?.welcome_message_sent) {
        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
            ]
        )
        return
    }

    // Lần đầu tiên - gửi thông báo chào mừng đầy đủ
    await sendTypingIndicator(user.facebook_id)

    // DISABLED: Welcome message now handled by anti-spam system
    console.log('Welcome message handled by anti-spam system')

    await sendQuickReply(
        user.facebook_id,
        'Bạn muốn:',
        [
            createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
            createQuickReply('ℹ️ THÔNG TIN', 'INFO'),
            createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
        ]
    )

    // Đánh dấu đã gửi thông báo chào mừng
    try {
        await supabaseAdmin
            .from('users')
            .upsert({
                facebook_id: user.facebook_id,
                welcome_message_sent: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'facebook_id'
            })
    } catch (error) {
        console.error('Error marking welcome message sent:', error)
    }
}

// Handle info for new users
export async function handleInfo(user: any) {
    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        'ℹ️ THÔNG TIN VỀ BOT Tân Dậu - Hỗ Trợ Chéo',
        '🤖 Bot này được thiết kế đặc biệt cho cộng đồng Tân Dậu - Hỗ Trợ Chéo',
        '🎯 Chức năng chính:\n• Niêm yết sản phẩm/dịch vụ\n• Tìm kiếm & kết nối mua bán\n• Cộng đồng Tân Dậu - hỗ trợ chéo\n• Tử vi hàng ngày\n• Điểm thưởng & quà tặng',
        `💰 Phí sử dụng:\n• Trial 3 ngày miễn phí\n• ${BOT_INFO.PRICING_MESSAGE}\n• Gói tối thiểu: 3 ngày = 9,000đ`,
        '🔒 Bảo mật:\n• Chỉ dành cho Tân Dậu - Hỗ Trợ Chéo\n• Thông tin được mã hóa bảo mật\n• Lưu trữ để tìm kiếm & kết nối hiệu quả'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Bạn muốn:',
        [
            createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
            createQuickReply('💬 HỖ TRỢ', 'SUPPORT_ADMIN'),
            createQuickReply('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle expired user message
export async function sendExpiredMessage(facebookId: string) {
    await sendTypingIndicator(facebookId)
    await sendMessagesWithTyping(facebookId, [
        '⏰ TÀI KHOẢN ĐÃ HẾT HẠN!',
        'Tài khoản của bạn đã hết hạn sử dụng.',
        `💳 ${BOT_INFO.PRICING_MESSAGE}\n📅 Gói tối thiểu: 3 ngày = 9.000 ₫`
    ])

    await sendQuickReply(
        facebookId,
        'Gia hạn tài khoản:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createQuickReply('❌ HỦY', 'MAIN_MENU')
        ]
    )
}

// Handle trial expiring message - DEPRECATED: Use smartTrialNotification instead
export async function sendTrialExpiringMessage(facebookId: string, daysLeft: number) {
    await sendTypingIndicator(facebookId)

    if (daysLeft === 1) {
        await sendMessagesWithTyping(facebookId, [
            '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
            'Trial của bạn còn 24 giờ!',
            '💳 Phí duy trì: 3,000đ/ngày\n📅 Gói tối thiểu: 3 ngày = 9.000 ₫'
        ])
    } else {
        await sendMessagesWithTyping(facebookId, [
            '⏰ THÔNG BÁO QUAN TRỌNG',
            `Trial của bạn còn ${daysLeft} ngày!`,
            '💳 Phí duy trì: 3,000đ/ngày\n📅 Gói tối thiểu: 3 ngày = 9.000 ₫'
        ])
    }

    await sendQuickReply(
        facebookId,
        'Gia hạn tài khoản:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createQuickReply('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
            createQuickReply('ℹ️ TÌM HIỂU', 'INFO')
        ]
    )
}

// Smart trial notification system
export async function handleSmartTrialNotification(user: any) {
    if (!user || !user.facebook_id) return

    const userStatusInfo = getUserStatusInfo(user)

    // Only send notification if user needs it and is eligible
    if (userStatusInfo.needsTrialNotification) {
        const shouldSend = await shouldSendTrialNotification(user.facebook_id, userStatusInfo)

        if (shouldSend) {
            const message = getTrialNotificationMessage(userStatusInfo.daysLeft, userStatusInfo.notificationPriority)

            await sendTypingIndicator(user.facebook_id)
            await sendMessage(user.facebook_id, message)

            // Log notification for tracking
            try {
                const { supabaseAdmin } = await import('../supabase')
                await supabaseAdmin
                    .from('notifications')
                    .insert({
                        user_id: user.facebook_id,
                        type: 'trial_reminder',
                        title: 'Trial Reminder',
                        message: message,
                        created_at: new Date().toISOString()
                    })
            } catch (error) {
                console.error('Error logging trial notification:', error)
            }
        }
    }
}

// Helper functions - getBotSession imported from utils


// Handle registration location input
export async function handleRegistrationLocation(user: any, text: string, data: any) {
    data.location = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Địa điểm: ${data.location}`,
        'Bước 4/6: Ngày sinh\n📅 Vui lòng nhập ngày sinh của bạn (DD/MM/YYYY):',
        'VD: 15/01/1981'
    ])

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'birthday',
        data: data,
        started_at: new Date().toISOString()
    })
}

// Handle registration product/service input
export async function handleRegistrationProductService(user: any, text: string, data: any) {
    data.product_service = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        data.product_service ? `✅ Sản phẩm/Dịch vụ: ${data.product_service}` : '✅ Bạn chưa có sản phẩm/dịch vụ nào',
        '🎉 Hoàn thành đăng ký!'
    ])

    // Complete registration
    await completeRegistration(user, data)
}

// Handle registration birthday input
export async function handleRegistrationBirthday(user: any, text: string, data: any) {
    const birthdayMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)

    if (!birthdayMatch) {
        await sendMessage(user.facebook_id, '❌ Định dạng ngày sinh không đúng! Vui lòng nhập theo định dạng DD/MM/YYYY')
        return
    }

    const [, day, month, year] = birthdayMatch
    const birthday = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

    if (isNaN(birthday.getTime())) {
        await sendMessage(user.facebook_id, '❌ Ngày sinh không hợp lệ! Vui lòng kiểm tra lại')
        return
    }

    data.birthday = birthday.toISOString()
    data.birth_year = parseInt(year)

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Ngày sinh: ${birthday.toLocaleDateString('vi-VN')}`,
        'Bước 5/6: Xác nhận tuổi\n🎂 Đây là bước quan trọng nhất!',
        'Bot Tân Dậu - Hỗ Trợ Chéo được tạo ra dành riêng cho cộng đồng Tân Dậu - Hỗ Trợ Chéo.',
        `❓ Bạn có phải sinh năm ${data.birth_year} không?`
    ])

    await sendQuickReply(
        user.facebook_id,
        'Xác nhận tuổi:',
        [
            createQuickReply(`✅ CÓ - TÔI SINH NĂM ${data.birth_year}`, 'REG_BIRTHDAY_YES'),
            createQuickReply('❌ KHÔNG - TÔI SINH NĂM KHÁC', 'REG_BIRTHDAY_NO')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'birthday_confirm',
        data: data,
        started_at: new Date().toISOString()
    })
}

// Complete registration process
async function completeRegistration(user: any, data: any) {
    try {
        // Check if user already exists (from welcome message tracking)
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('facebook_id', user.facebook_id)
            .single()

        let userError = null

        if (existingUser) {
            // Update existing user record
            const { error } = await supabaseAdmin
                .from('users')
                .update({
                    name: data.name,
                    phone: data.phone,
                    location: data.location,
                    birthday: data.birth_year || 1981,
                    product_service: data.product_service || null,
                    status: 'trial',
                    membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    referral_code: `TD1981-${user.facebook_id.slice(-6)}`,
                    welcome_message_sent: true,
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', user.facebook_id)
            userError = error
        } else {
            // Create new user record
            const { error } = await supabaseAdmin
                .from('users')
                .insert({
                    id: generateId(),
                    facebook_id: user.facebook_id,
                    name: data.name,
                    phone: data.phone,
                    location: data.location,
                    birthday: data.birth_year || 1981,
                    product_service: data.product_service || null,
                    status: 'trial',
                    membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    referral_code: `TD1981-${user.facebook_id.slice(-6)}`,
                    welcome_message_sent: true,
                    created_at: new Date().toISOString()
                })
            userError = error
        }

        if (userError) {
            console.error('Error creating user:', userError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau!')
            return
        }

        // Clear session
        await updateBotSession(user.facebook_id, null)

        // Send success message - UPDATED WITH NEW PRICING
        await sendMessage(user.facebook_id, `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${data.name}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n✅ Năm sinh: 1981 (Tân Dậu)\n${data.product_service ? `✅ Sản phẩm/Dịch vụ: ${data.product_service}` : '✅ Chưa có sản phẩm/dịch vụ'}\n━━━━━━━━━━━━━━━━━━━━\n🎁 Bạn được dùng thử miễn phí 3 ngày!\n${BOT_INFO.PRICING_MESSAGE}\n━━━━━━━━━━━━━━━━━━━━`)

        await sendQuickReply(
            user.facebook_id,
            `${BOT_INFO.WELCOME_MESSAGE}\n${BOT_INFO.SLOGAN}`,
            [
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('🛒 TẠO TIN', 'LISTING'),
                createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                createQuickReply('💳 NÂNG CẤP', 'PAYMENT')
            ]
        )

    } catch (error) {
        console.error('Error in complete registration:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}
