import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    createPostbackButton,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, generateReferralCode, isTrialUser, isExpiredUser, daysUntilExpiry, generateId, updateBotSession, getBotSession } from '../utils'


// Handle registration flow
export async function handleRegistration(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Check if user is admin first
    const { isAdmin } = await import('./admin-handlers')
    const userIsAdmin = await isAdmin(user.facebook_id)

    if (userIsAdmin) {
        await sendMessagesWithTyping(user.facebook_id, [
            '🔧 ADMIN DASHBOARD',
            'Chào admin! 👋',
            'Bạn có quyền truy cập đầy đủ mà không cần đăng ký.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🔧 ADMIN PANEL', 'ADMIN'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('🛒 NIÊM YẾT', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH')
            ]
        )
        return
    }

    // Check if user is already registered
    if (user.status === 'registered' || user.status === 'trial') {
        await sendMessagesWithTyping(user.facebook_id, [
            '✅ Bạn đã đăng ký rồi!',
            'Sử dụng menu bên dưới để truy cập các tính năng.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('🛒 NIÊM YẾT', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH')
            ]
        )
        return
    }

    // Start registration flow
    await sendMessagesWithTyping(user.facebook_id, [
        '📝 ĐĂNG KÝ THÀNH VIÊN',
        'Chào bạn! Tôi sẽ hướng dẫn bạn đăng ký từng bước.',
        '📋 Thông tin cần thiết:\n• Họ tên đầy đủ\n• Số điện thoại\n• Tỉnh/thành sinh sống\n• Ngày sinh\n• Xác nhận năm sinh 1981\n• Sản phẩm/dịch vụ bạn muốn chia sẻ',
        'Bước 1/6: Họ tên\n👤 Vui lòng nhập họ tên đầy đủ của bạn:'
    ])

    // Create session for registration flow
    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'name',
        data: {}
    })
}

// Handle registration step
export async function handleRegistrationStep(user: any, text: string, session: any) {
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
            break
        case 'product_service':
            await handleRegistrationProductService(user, text, session.data)
            break
    }
}

// Handle name input
async function handleRegistrationName(user: any, text: string, data: any) {
    if (text.length < 2) {
        await sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ:')
        return
    }

    data.name = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Họ tên: ${data.name}`,
        'Bước 2/6: Số điện thoại\n📱 Vui lòng nhập số điện thoại của bạn:'
    ])

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'phone',
        data: data
    })
}

// Handle phone input
async function handleRegistrationPhone(user: any, text: string, data: any) {
    const phone = text.replace(/\D/g, '')

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

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ SĐT: ${phone}`,
        'Bước 3/6: Vị trí\n📍 Vui lòng chọn tỉnh/thành bạn đang sinh sống:'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Chọn vị trí:',
        [
            createQuickReply('🏠 HÀ NỘI', 'REG_LOCATION_HANOI'),
            createQuickReply('🏢 TP.HCM', 'REG_LOCATION_HCM'),
            createQuickReply('🏖️ ĐÀ NẴNG', 'REG_LOCATION_DANANG'),
            createQuickReply('🌊 HẢI PHÒNG', 'REG_LOCATION_HAIPHONG'),
            createQuickReply('🏔️ CẦN THƠ', 'REG_LOCATION_CANTHO'),
            createQuickReply('🌾 AN GIANG', 'REG_LOCATION_ANGIANG'),
            createQuickReply('🏞️ KHÁC...', 'REG_LOCATION_OTHER')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'location',
        data: data
    })
}

// Handle location selection
export async function handleRegistrationLocationPostback(user: any, location: string) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') return

    const data = session.data
    data.location = location

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Vị trí: ${location}`,
        'Bước 4/5: Sản phẩm/Dịch vụ\n🛒 Bạn có sản phẩm hoặc dịch vụ gì muốn chia sẻ với cộng đồng Tân Dậu 1981?',
        'VD: Nhà đất, xe cộ, điện tử, thời trang, ẩm thực, dịch vụ tư vấn...',
        '📝 Vui lòng mô tả ngắn gọn (có thể để trống nếu chưa có):'
    ])

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'product_service',
        data: data
    })
}

// Handle birthday verification
export async function handleBirthdayVerification(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') return

    const data = session.data

    await sendMessagesWithTyping(user.facebook_id, [
        '✅ Xác nhận tuổi thành công!',
        'Bước 6/6: Sản phẩm/Dịch vụ\n🛒 Bạn có sản phẩm hoặc dịch vụ gì muốn chia sẻ với cộng đồng Tân Dậu 1981?',
        'VD: Nhà đất, xe cộ, điện tử, thời trang, ẩm thực, dịch vụ tư vấn...',
        '📝 Vui lòng mô tả ngắn gọn (có thể để trống nếu chưa có):'
    ])

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        step: 'product_service',
        data: data
    })
}

// Handle birthday rejection
export async function handleBirthdayRejection(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⚠️ THÔNG BÁO QUAN TRỌNG',
        'Bot Tân Dậu 1981 được tạo ra dành riêng cho cộng đồng Tân Dậu 1981.',
        '🎯 Mục đích:\n• Kết nối mua bán trong cộng đồng cùng tuổi\n• Chia sẻ kinh nghiệm và kỷ niệm\n• Hỗ trợ lẫn nhau trong cuộc sống',
        '💡 Nếu bạn không phải Tân Dậu 1981:\n• Có thể sử dụng các platform khác\n• Hoặc giới thiệu cho bạn bè Tân Dậu 1981',
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

// Handle default message for new users
export async function handleDefaultMessage(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Check if user is admin first
    const { isAdmin } = await import('./admin-handlers')
    const userIsAdmin = await isAdmin(user.facebook_id)

    if (userIsAdmin) {
        await sendMessagesWithTyping(user.facebook_id, [
            '🔧 ADMIN DASHBOARD',
            'Chào admin! 👋',
            'Bạn có quyền truy cập đầy đủ.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🔧 ADMIN PANEL', 'ADMIN'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('🛒 NIÊM YẾT', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH')
            ]
        )
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        '🎉 CHÀO MỪNG ĐẾN VỚI BOT TÂN DẬU 1981! 🎉',
        '👋 Xin chào! Tôi là bot hỗ trợ cộng đồng Tân Dậu 1981.',
        'Để sử dụng đầy đủ tính năng, bạn cần đăng ký thành viên trước.'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Bạn muốn:',
        [
            createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
            createQuickReply('ℹ️ THÔNG TIN', 'INFO'),
            createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
        ]
    )
}

// Handle info for new users
export async function handleInfo(user: any) {
    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        'ℹ️ THÔNG TIN VỀ BOT TÂN DẬU 1981',
        '🤖 Bot này được thiết kế đặc biệt cho cộng đồng Tân Dậu 1981',
        '🎯 Chức năng chính:\n• Niêm yết sản phẩm/dịch vụ\n• Tìm kiếm & kết nối mua bán\n• Cộng đồng Tân Dậu - hỗ trợ chéo\n• Tử vi hàng ngày\n• Điểm thưởng & quà tặng',
        '💰 Phí sử dụng:\n• Trial 3 ngày miễn phí\n• Phí duy trì: 1,000đ/ngày\n• Gói tối thiểu: 7 ngày = 7,000đ',
        '🔒 Bảo mật:\n• Chỉ dành cho Tân Dậu 1981\n• Thông tin được mã hóa bảo mật\n• Lưu trữ để tìm kiếm & kết nối hiệu quả'
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
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
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

// Handle trial expiring message
export async function sendTrialExpiringMessage(facebookId: string, daysLeft: number) {
    await sendTypingIndicator(facebookId)

    if (daysLeft === 1) {
        await sendMessagesWithTyping(facebookId, [
            '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
            'Trial của bạn còn 24 giờ!',
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])
    } else {
        await sendMessagesWithTyping(facebookId, [
            '⏰ THÔNG BÁO QUAN TRỌNG',
            `Trial của bạn còn ${daysLeft} ngày!`,
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
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
        data: data
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
        'Bot Tân Dậu 1981 được tạo ra dành riêng cho cộng đồng Tân Dậu 1981.',
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
        data: data
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
                    membership_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
                    membership_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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

        // Send success message
        await sendMessagesWithTyping(user.facebook_id, [
            '🎉 ĐĂNG KÝ THÀNH CÔNG!',
            `✅ Họ tên: ${data.name}`,
            `✅ SĐT: ${data.phone}`,
            `✅ Địa điểm: ${data.location}`,
            `✅ Ngày sinh: ${new Date(data.birthday).toLocaleDateString('vi-VN')}`,
            data.product_service ? `✅ Sản phẩm/Dịch vụ: ${data.product_service}` : '✅ Chưa có sản phẩm/dịch vụ',
            '',
            '🎁 Bạn được dùng thử miễn phí 7 ngày!',
            'Sau đó cần nâng cấp để tiếp tục sử dụng.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Chào mừng bạn đến với cộng đồng Tân Dậu 1981!',
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
