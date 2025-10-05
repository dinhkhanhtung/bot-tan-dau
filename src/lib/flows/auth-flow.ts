import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReplyNoTyping,
    sendQuickReply,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, generateReferralCode, isTrialUser, isExpiredUser, daysUntilExpiry, generateId, updateBotSession, getBotSession } from '../utils'
import { LOCATIONS, DISTRICTS, BOT_INFO, BOT_CONFIG } from '../constants'

export class AuthFlow {
    /**
     * Handle registration flow - FIXED VERSION
     */
    async handleRegistration(user: any): Promise<void> {
        try {
            console.log('🔄 Starting registration flow for user:', user.facebook_id)

            await sendTypingIndicator(user.facebook_id)

            // Check if user is admin first
            const { isAdmin } = await import('../utils')
            const userIsAdmin = await isAdmin(user.facebook_id)

            if (userIsAdmin) {
                await sendMessage(user.facebook_id, '🔧 ADMIN DASHBOARD\nChào admin! 👋\nBạn có quyền truy cập đầy đủ mà không cần đăng ký.')

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

            // Check if user is already registered (exclude users without complete info)
            if ((user.status === 'registered' || user.status === 'trial') &&
                user.name && user.phone && user.status !== 'pending') {

                // Check if trial is about to expire (within 2 days)
                if (user.status === 'trial' && user.membership_expires_at) {
                    const daysLeft = daysUntilExpiry(user.membership_expires_at)
                    if (daysLeft <= 2) {
                        await sendMessage(user.facebook_id, `✅ Bạn đã đăng ký rồi!\n📅 Trial còn ${daysLeft} ngày\n💡 Hãy thanh toán để tiếp tục sử dụng.`)
                    } else {
                        await sendMessage(user.facebook_id, `✅ Bạn đã đăng ký rồi!\n📅 Trial còn ${daysLeft} ngày\nSử dụng menu bên dưới để truy cập các tính năng.`)
                    }
                } else {
                    await sendMessage(user.facebook_id, '✅ Bạn đã đăng ký rồi!\nSử dụng menu bên dưới để truy cập các tính năng.')
                }

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
            }

            // Kiểm tra xem user đã có session registration chưa - FIXED SESSION STRUCTURE
            const existingSession = await getBotSession(user.facebook_id)

            if (existingSession && existingSession.current_flow === 'registration') {
                // User đã trong flow registration, chỉ gửi lại hướng dẫn hiện tại
                console.log('User already in registration flow, resuming current step')
                await this.resumeRegistration(user, existingSession)
                return
            }

            // OPTIMIZED: Single screen with essential info first
            await sendMessage(user.facebook_id, '🚀 ĐĂNG KÝ NHANH - Tân Dậu Hỗ Trợ Chéo')

            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n📋 THÔNG TIN BẮT BUỘC:\n• Họ tên đầy đủ\n• Số điện thoại\n• Tỉnh/thành sinh sống\n• Xác nhận sinh năm 1981\n━━━━━━━━━━━━━━━━━━━━\n📝 THÔNG TIN TÙY CHỌN:\n• Từ khóa tìm kiếm\n• Sản phẩm/dịch vụ\n━━━━━━━━━━━━━━━━━━━━')

            await sendMessage(user.facebook_id, `🎁 QUYỀN LỢI: Trial ${BOT_CONFIG.TRIAL_DAYS} ngày miễn phí\n💰 ${BOT_INFO.PRICING_MESSAGE}\n💳 Phí duy trì: ${BOT_INFO.DAILY_FEE_FORMATTED}\n📅 Gói tối thiểu: ${BOT_CONFIG.MINIMUM_DAYS} ngày = ${formatCurrency(BOT_CONFIG.MINIMUM_DAYS * BOT_CONFIG.DAILY_FEE)}\n━━━━━━━━━━━━━━━━━━━━\n${BOT_INFO.WELCOME_MESSAGE}\n${BOT_INFO.SLOGAN}`)

            // Create session for registration flow - CHUẨN HÓA CẤU TRÚC
            const sessionData = {
                current_flow: 'registration',
                step: 'name',
                data: {},
                started_at: new Date().toISOString()
            }

            console.log('🔄 Creating registration session:', sessionData)
            await updateBotSession(user.facebook_id, sessionData)

            // Start with first step - SIMPLIFIED
            await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 1/4)\n━━━━━━━━━━━━━━━━━━━━\n👤 HỌ TÊN ĐẦY ĐỦ\nVui lòng nhập họ tên đầy đủ của bạn:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: Đinh Khánh Tùng\n📝 Nhập họ tên để tiếp tục:')

            // Verify session was created
            const sessionCheck = await getBotSession(user.facebook_id)
            console.log('Session created for registration:', sessionCheck)

        } catch (error) {
            console.error('Error in handleRegistration:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi bắt đầu đăng ký. Vui lòng thử lại!')
        }
    }

    /**
     * Resume registration flow from current step - FIXED VERSION
     */
    async resumeRegistration(user: any, session: any): Promise<void> {
        try {
            console.log('🔄 Resuming registration for user:', user.facebook_id, 'session:', session)

            // CHUẨN HÓA: Sử dụng cấu trúc session chuẩn
            const currentStep = session.step || 'name'
            const data = session.data || {}

            switch (currentStep) {
                case 'name':
                    await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 1/4)\n━━━━━━━━━━━━━━━━━━━━\n👤 HỌ TÊN ĐẦY ĐỦ\nVui lòng nhập họ tên đầy đủ của bạn:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: Đinh Khánh Tùng\n📝 Nhập họ tên để tiếp tục:')
                    break
                case 'phone':
                    await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 2/4)\n━━━━━━━━━━━━━━━━━━━━\n📱 SỐ ĐIỆN THOẠI\nVui lòng nhập số điện thoại của bạn:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: 0901234567\n📝 Nhập số điện thoại để tiếp tục:')
                    break
                case 'location':
                    await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 3/4)\n━━━━━━━━━━━━━━━━━━━━\n📍 TỈNH/THÀNH SINH SỐNG\nVui lòng chọn tỉnh/thành bạn đang sinh sống:\n━━━━━━━━━━━━━━━━━━━━\n📝 Chọn tỉnh/thành để tiếp tục:')
                    break
                case 'birthday_confirm':
                    await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 4/4)\n━━━━━━━━━━━━━━━━━━━━\n🎂 XÁC NHẬN NĂM SINH\nBạn có sinh năm 1981 (Tân Dậu) không?\n━━━━━━━━━━━━━━━━━━━━\n📝 Chọn câu trả lời để tiếp tục:')
                    break
                default:
                    console.log('❌ Unknown step in resumeRegistration:', currentStep)
                    await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng bắt đầu đăng ký lại!')
                    await updateBotSession(user.facebook_id, null)
            }
        } catch (error) {
            console.error('Error in resumeRegistration:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tiếp tục đăng ký. Vui lòng thử lại!')
        }
    }

    /**
     * Handle registration step - FIXED VERSION
     */
    async handleStep(user: any, text: string, session: any): Promise<void> {
        try {
            console.log('🔍 handleStep called:', {
                text,
                sessionStep: session?.step,
                sessionData: session?.data,
                sessionStartedAt: session?.started_at
            })

            // Validate session
            if (!session || !session.current_flow) {
                console.log('❌ Invalid session in handleStep')
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng bắt đầu đăng ký lại!')
                await updateBotSession(user.facebook_id, null)
                return
            }

            // Check for exit commands
            if (text.toLowerCase().includes('hủy') || text.toLowerCase().includes('thoát') || text.toLowerCase().includes('cancel')) {
                await this.handleRegistrationCancel(user)
                return
            }

            // Check if session is too old (more than 30 minutes)
            if (session.started_at) {
                const sessionAge = Date.now() - new Date(session.started_at).getTime()
                if (sessionAge > 30 * 60 * 1000) { // 30 minutes
                    await this.handleRegistrationTimeout(user)
                    return
                }
            }

            // CHUẨN HÓA: Sử dụng cấu trúc session chuẩn
            const currentStep = session.step || 'name'
            const sessionData = session.data || {}

            console.log('🔄 Processing step:', currentStep, 'with data:', sessionData)

            switch (currentStep) {
                case 'name':
                    await this.handleRegistrationName(user, text, sessionData)
                    break
                case 'phone':
                    await this.handleRegistrationPhone(user, text, sessionData)
                    break
                case 'location':
                    await this.handleRegistrationLocation(user, text, sessionData)
                    break
                case 'birthday':
                    await this.handleRegistrationBirthday(user, text, sessionData)
                    break
                case 'birthday_confirm':
                    // This step is handled by postback buttons, not text input
                    await sendMessage(user.facebook_id, '❌ Vui lòng chọn nút xác nhận bên dưới để tiếp tục!')
                    break
                case 'email':
                    await this.handleRegistrationEmail(user, text, sessionData)
                    break
                case 'keywords':
                    await this.handleRegistrationKeywords(user, text, sessionData)
                    break
                case 'product_service':
                    await this.handleRegistrationProductService(user, text, sessionData)
                    break
                default:
                    console.log('❌ Unknown step in handleStep:', currentStep)
                    await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng bắt đầu đăng ký lại!')
                    await updateBotSession(user.facebook_id, null)
            }
        } catch (error) {
            console.error('Error in handleStep:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xử lý đăng ký. Vui lòng thử lại!')
        }
    }

    /**
     * Handle name input
     */
    private async handleRegistrationName(user: any, text: string, data: any): Promise<void> {
        console.log('🔍 handleRegistrationName called:', { text, textLength: text.length, data })

        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined, creating new object')
            data = {}
        }

        if (text.length < 2) {
            await sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ:')
            return
        }

        data.name = text.trim()
        console.log('✅ Name saved:', data.name)

        await sendMessage(user.facebook_id, `✅ Họ tên: ${data.name}\n📝 Bước 2/4: Số điện thoại\n📱 Vui lòng nhập số điện thoại của bạn:`)

        const sessionUpdate = {
            current_flow: 'registration',
            step: 'phone',
            data: data,
            started_at: new Date().toISOString()
        }

        console.log('🔄 Updating session:', sessionUpdate)
        await updateBotSession(user.facebook_id, sessionUpdate)

        // Verify session was updated
        const sessionCheck = await getBotSession(user.facebook_id)
        console.log('✅ Session after name update:', sessionCheck)
    }

    /**
     * Handle phone input
     */
    private async handleRegistrationPhone(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in phone handler, creating new object')
            data = {}
        }

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
        console.log('✅ Phone saved:', data.phone)

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

        const sessionUpdate = {
            current_flow: 'registration',
            step: 'location',
            data: data,
            started_at: new Date().toISOString()
        }

        console.log('🔄 Updating session after phone:', sessionUpdate)
        await updateBotSession(user.facebook_id, sessionUpdate)

        // Verify session was updated
        const sessionCheck = await getBotSession(user.facebook_id)
        console.log('✅ Session after phone update:', sessionCheck)
    }

    /**
     * Handle location selection - FIXED VERSION
     */
    async handleRegistrationLocationPostback(user: any, location: string): Promise<void> {
        try {
            console.log('🔄 Handling location postback for user:', user.facebook_id, 'location:', location)

            const session = await getBotSession(user.facebook_id)
            if (!session || session.current_flow !== 'registration') {
                console.log('❌ Invalid session in location postback')
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng bắt đầu đăng ký lại!')
                await updateBotSession(user.facebook_id, null)
                return
            }

            // CHUẨN HÓA: Sử dụng cấu trúc session chuẩn
            const data = session.data || {}

            data.location = location
            console.log('✅ Location saved:', data.location)

            await sendMessage(user.facebook_id, `✅ Vị trí: ${location}\n📝 Bước 4/4: Xác nhận tuổi\n🎂 Đây là bước quan trọng nhất!\n❓ Bạn có phải sinh năm 1981 (Tân Dậu) không?`)

            await sendQuickReply(
                user.facebook_id,
                'Xác nhận tuổi:',
                [
                    createQuickReply('✅ CÓ - TÔI SINH NĂM 1981', 'REG_BIRTHDAY_YES'),
                    createQuickReply('❌ KHÔNG - TÔI SINH NĂM KHÁC', 'REG_BIRTHDAY_NO')
                ]
            )

            const sessionUpdate = {
                current_flow: 'registration',
                step: 'birthday_confirm',
                data: data,
                started_at: new Date().toISOString()
            }

            console.log('🔄 Updating session after location:', sessionUpdate)
            await updateBotSession(user.facebook_id, sessionUpdate)

            // Verify session was updated
            const sessionCheck = await getBotSession(user.facebook_id)
            console.log('✅ Session after location update:', sessionCheck)

        } catch (error) {
            console.error('Error in handleRegistrationLocationPostback:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xử lý vị trí. Vui lòng thử lại!')
        }
    }

    /**
     * Handle email input
     */
    private async handleRegistrationEmail(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in email handler, creating new object')
            data = {}
        }

        if (text.toLowerCase().includes('bỏ qua') || text.toLowerCase().includes('không')) {
            data.email = null
        } else {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(text.trim())) {
                await sendMessage(user.facebook_id, '❌ Email không hợp lệ. Vui lòng nhập lại hoặc "bỏ qua":')
                return
            }
            data.email = text.trim().toLowerCase()
        }

        await sendMessage(user.facebook_id, data.email ? `✅ Email: ${data.email}` : '✅ Bỏ qua email')

        await sendMessage(user.facebook_id, '📝 Bước 6/7: Từ khóa tìm kiếm\n━━━━━━━━━━━━━━━━━━━━\n🔍 Từ khóa tìm kiếm:\nVD: nhà đất, xe honda, điện thoại...\n━━━━━━━━━━━━━━━━━━━━\n💡 Nhập từ khóa hoặc "bỏ qua":')

        await updateBotSession(user.facebook_id, {
            current_flow: 'registration',
            step: 'keywords',
            data: data
        })
    }

    /**
     * Handle birthday verification - FIXED VERSION
     */
    async handleBirthdayVerification(user: any, answer: string): Promise<void> {
        try {
            console.log('🔄 Handling birthday verification for user:', user.facebook_id, 'answer:', answer)

            const session = await getBotSession(user.facebook_id)
            if (!session || session.current_flow !== 'registration') {
                console.log('❌ Invalid session in birthday verification')
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng bắt đầu đăng ký lại!')
                await updateBotSession(user.facebook_id, null)
                return
            }

            // CHUẨN HÓA: Sử dụng cấu trúc session chuẩn
            const data = session.data || {}

            await sendMessage(user.facebook_id, '✅ Xác nhận tuổi thành công!\n📝 Thông tin tùy chọn (có thể bỏ qua)\n━━━━━━━━━━━━━━━━━━━━\n📧 Email (để nhận thông báo quan trọng):\nVD: nguyenvanminh@gmail.com\n━━━━━━━━━━━━━━━━━━━━\n🔍 Từ khóa tìm kiếm:\nVD: nhà đất, xe honda, điện thoại...\n━━━━━━━━━━━━━━━━━━━━\n🛒 Sản phẩm/Dịch vụ:\nVD: Nhà đất, xe cộ, điện tử...\n━━━━━━━━━━━━━━━━━━━━\n💡 Nhập: "email,từ khóa,sản phẩm" hoặc "bỏ qua"')

            await sendMessage(user.facebook_id, '📧 Bước 5/7: Email (tùy chọn)\n━━━━━━━━━━━━━━━━━━━━\n📧 Vui lòng nhập email để nhận thông báo quan trọng:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: nguyenvanminh@gmail.com\n📝 Nhập email hoặc "bỏ qua":')

            const sessionUpdate = {
                current_flow: 'registration',
                step: 'email',
                data: data,
                started_at: new Date().toISOString()
            }

            console.log('🔄 Updating session after birthday verification:', sessionUpdate)
            await updateBotSession(user.facebook_id, sessionUpdate)

            // Verify session was updated
            const sessionCheck = await getBotSession(user.facebook_id)
            console.log('✅ Session after birthday verification:', sessionCheck)

        } catch (error) {
            console.error('Error in handleBirthdayVerification:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xác nhận tuổi. Vui lòng thử lại!')
        }
    }

    /**
     * Handle birthday rejection
     */
    async handleBirthdayRejection(user: any): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '⚠️ THÔNG BÁO QUAN TRỌNG',
            'Bot Tân Dậu - Hỗ Trợ Chéo được tạo ra dành riêng cho cộng đồng Tân Dậu Việt.',
            '🎯 Mục đích:\n• Kết nối mua bán trong cộng đồng cùng tuổi\n• Chia sẻ kinh nghiệm và kỷ niệm\n• Hỗ trợ lẫn nhau trong cuộc sống',
            '💡 Nếu bạn không phải Tân Dậu - Hỗ Trợ Chéo:\n• Có thể sử dụng các platform khác\n• Hoặc giới thiệu cho bạn bè Tân Dậu của mình',
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

    /**
     * Handle registration cancellation
     */
    private async handleRegistrationCancel(user: any): Promise<void> {
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

    /**
     * Handle registration timeout
     */
    private async handleRegistrationTimeout(user: any): Promise<void> {
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

    /**
     * Handle keywords input for better search
     */
    private async handleRegistrationKeywords(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in keywords handler, creating new object')
            data = {}
        }

        if (text.toLowerCase().includes('bỏ qua') || text.toLowerCase().includes('không')) {
            data.keywords = null
        } else {
            data.keywords = text.trim()
        }

        await sendMessage(user.facebook_id, data.keywords ? `✅ Từ khóa: ${data.keywords}` : '✅ Bỏ qua từ khóa')

        // Chuyển sang bước tiếp theo - Sản phẩm/Dịch vụ
        await sendMessage(user.facebook_id, '📝 Bước 6/7: Sản phẩm/Dịch vụ\n━━━━━━━━━━━━━━━━━━━━\n🛒 Bạn muốn bán sản phẩm hay dịch vụ gì?\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: nhà đất, xe cộ, dịch vụ tư vấn\n📝 Nhập sản phẩm/dịch vụ để tiếp tục:')

        const sessionUpdate = {
            current_flow: 'registration',
            step: 'product_service',
            data: data,
            started_at: new Date().toISOString()
        }

        console.log('🔄 Updating session after keywords:', sessionUpdate)
        await updateBotSession(user.facebook_id, sessionUpdate)

        // Verify session was updated
        const sessionCheck = await getBotSession(user.facebook_id)
        console.log('✅ Session after keywords update:', sessionCheck)
    }

    /**
     * Handle default message for new users
     */
    async handleDefaultMessage(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        // Check if user is admin first
        const { isAdmin } = await import('../utils')
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

        // DISABLED: Welcome message now handled by anti-spam system
        console.log('Welcome message handled by anti-spam system')
    }

    /**
     * Handle info for new users
     */
    async handleInfo(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Bạn muốn:',
            [
                createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT_ADMIN'),
                createQuickReply('🔙 TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    }

    // Helper methods for registration steps
    private async handleRegistrationLocation(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in location handler, creating new object')
            data = {}
        }

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

    private async handleRegistrationProductService(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in product service handler, creating new object')
            data = {}
        }

        data.product_service = text.trim()

        await sendMessagesWithTyping(user.facebook_id, [
            data.product_service ? `✅ Sản phẩm/Dịch vụ: ${data.product_service}` : '✅ Bạn chưa có sản phẩm/dịch vụ nào',
            '🎉 Hoàn thành đăng ký!'
        ])

        // Complete registration
        await this.completeRegistration(user, data)
    }

    private async handleRegistrationBirthday(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in birthday handler, creating new object')
            data = {}
        }

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
            data: data
        })
    }

    /**
     * Complete registration process
     */
    private async completeRegistration(user: any, data: any): Promise<void> {
        try {
            // Check if user already exists (from welcome message tracking)
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('facebook_id', user.facebook_id)
                .single()

            let userError = null

            // Kiểm tra bot settings để xác định có auto trial không
            const { data: botSettings } = await supabaseAdmin
                .from('bot_settings')
                .select('value')
                .eq('key', 'trial_days')
                .single()

            const trialDays = botSettings?.value ? parseInt(botSettings.value) : 3
            const shouldAutoTrial = trialDays > 0

            if (existingUser) {
                // Update existing user record
                const updateData: any = {
                    name: data.name,
                    phone: data.phone,
                    location: data.location,
                    birthday: data.birth_year || 1981,
                    email: data.email || null,
                    product_service: data.product_service || null,
                    welcome_message_sent: true,
                    updated_at: new Date().toISOString()
                }

                if (shouldAutoTrial) {
                    // Auto trial: Set status trial và membership_expires_at
                    updateData.status = 'trial'
                    updateData.membership_expires_at = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
                } else {
                    // Không auto trial: Set status pending để chờ admin duyệt
                    updateData.status = 'pending'
                    updateData.membership_expires_at = null
                }

                const { error } = await supabaseAdmin
                    .from('users')
                    .update(updateData)
                    .eq('facebook_id', user.facebook_id)
                userError = error
            } else {
                // Create new user record
                const insertData: any = {
                    id: generateId(),
                    facebook_id: user.facebook_id,
                    name: data.name,
                    phone: data.phone,
                    location: data.location,
                    birthday: data.birth_year || 1981,
                    email: data.email || null,
                    product_service: data.product_service || null,
                    referral_code: `TD1981-${user.facebook_id.slice(-6)}`,
                    welcome_message_sent: true,
                    created_at: new Date().toISOString()
                }

                if (shouldAutoTrial) {
                    // Auto trial: Set status trial và membership_expires_at
                    insertData.status = 'trial'
                    insertData.membership_expires_at = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
                } else {
                    // Không auto trial: Set status pending để chờ admin duyệt
                    insertData.status = 'pending'
                    insertData.membership_expires_at = null
                }

                const { error } = await supabaseAdmin
                    .from('users')
                    .insert(insertData)
                userError = error
            }

            if (userError) {
                console.error('Error creating user:', userError)
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau!')
                return
            }

            // Clear session
            await updateBotSession(user.facebook_id, null)

            // Send success message - CHỜ ADMIN DUYỆT
            await sendMessage(user.facebook_id, `📝 ĐĂNG KÝ HOÀN TẤT!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${data.name}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n✅ Năm sinh: 1981 (Tân Dậu)\n${data.email ? `✅ Email: ${data.email}` : '✅ Chưa có email'}\n${data.product_service ? `✅ Sản phẩm/Dịch vụ: ${data.product_service}` : '✅ Chưa có sản phẩm/dịch vụ'}\n━━━━━━━━━━━━━━━━━━━━\n🎁 Bạn được dùng thử miễn phí ${BOT_CONFIG.TRIAL_DAYS} ngày!\n💰 ${BOT_INFO.PRICING_MESSAGE}\n💳 Phí duy trì: ${BOT_INFO.DAILY_FEE_FORMATTED}\n📅 Gói tối thiểu: ${BOT_CONFIG.MINIMUM_DAYS} ngày = ${formatCurrency(BOT_CONFIG.MINIMUM_DAYS * BOT_CONFIG.DAILY_FEE)}\n━━━━━━━━━━━━━━━━━━━━\n⏳ Đang chờ Admin duyệt...\n📢 Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt!\n━━━━━━━━━━━━━━━━━━━━`)

            await sendQuickReply(
                user.facebook_id,
                `${BOT_INFO.WELCOME_MESSAGE}\n${BOT_INFO.SLOGAN}`,
                [
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU'),
                    createQuickReply('ℹ️ THÔNG TIN', 'INFO'),
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
                ]
            )

        } catch (error) {
            console.error('Error in complete registration:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    // Additional functions for webhook compatibility
    static async handleAdminCommand(user: any, command?: string): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Quản lý:',
            [
                createQuickReply('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
                createQuickReply('👥 NGƯỜI DÙNG', 'ADMIN_USERS'),
                createQuickReply('🛒 TIN ĐĂNG', 'ADMIN_LISTINGS'),
                createQuickReply('📊 THỐNG KÊ', 'ADMIN_STATS'),
                createQuickReply('📢 THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
                createQuickReply('⚙️ CÀI ĐẶT', 'ADMIN_SETTINGS')
            ]
        )
    }
}
