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
     * Validate name input with profanity check - SIMPLIFIED VERSION
     */
    private validateName(name: string): { isValid: boolean; message?: string } {
        // Basic validation - more lenient
        if (!name || name.trim().length < 2) {
            return { isValid: false, message: '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ (tối thiểu 2 ký tự).' }
        }

        if (name.length > 100) {
            return { isValid: false, message: '❌ Tên quá dài. Vui lòng nhập tên ngắn gọn hơn.' }
        }

        const trimmedName = name.trim()

        // Check for obvious spam patterns only
        if (/^[0-9!@#$%^&*()+\-=]+$/.test(trimmedName)) {
            return { isValid: false, message: '❌ Vui lòng nhập họ tên thật của bạn.' }
        }

        // Check for extreme repeated characters (more than 10)
        if (/(.)\1{10,}/.test(trimmedName)) {
            return { isValid: false, message: '❌ Tên không hợp lệ. Vui lòng nhập tên thật.' }
        }

        // Must contain at least one letter
        if (!/[a-zA-ZÀ-ỹ]/.test(trimmedName)) {
            return { isValid: false, message: '❌ Tên phải chứa chữ cái.' }
        }

        // Check for severe profanity only (most common ones)
        const severeProfanity = [
            'địt', 'đụ', 'đĩ', 'cặc', 'cứt', 'lồn', 'buồi',
            'fuck', 'shit', 'ass', 'bitch'
        ]

        const lowerName = trimmedName.toLowerCase()
        for (const word of severeProfanity) {
            if (lowerName.includes(word)) {
                return { isValid: false, message: '❌ Tên chứa từ không phù hợp. Vui lòng nhập tên thật của bạn.' }
            }
        }

        return { isValid: true }
    }

    /**
     * Validate keywords input for inappropriate content
     */
    private validateKeywords(keywords: string): { isValid: boolean; message?: string } {
        if (!keywords || keywords.toLowerCase().includes('bỏ qua') || keywords.toLowerCase().includes('không')) {
            return { isValid: true }
        }

        // Check for profanity in keywords
        const profanityWords = [
            'địt', 'đụ', 'đĩ', 'đồ', 'cặc', 'cứt', 'lồn', 'buồi',
            'fuck', 'shit', 'ass', 'bitch', 'bastard', 'damn', 'hell'
        ]

        const lowerKeywords = keywords.toLowerCase().trim()

        for (const word of profanityWords) {
            if (lowerKeywords.includes(word)) {
                return { isValid: false, message: '❌ Từ khóa chứa nội dung không phù hợp. Vui lòng nhập từ khóa khác.' }
            }
        }

        // Check for suspicious patterns
        if (/(.)\1{10,}/.test(keywords)) {
            return { isValid: false, message: '❌ Từ khóa không hợp lệ. Vui lòng nhập từ khóa có ý nghĩa.' }
        }

        return { isValid: true }
    }

    /**
     * Handle registration flow - OPTIMIZED VERSION
     */
    async handleRegistration(user: any): Promise<void> {
        try {
            console.log('🔄 Starting registration flow for user:', user.facebook_id)

            await sendTypingIndicator(user.facebook_id)

            // Admin check moved to dashboard - no longer needed here

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

            // OPTIMIZED: Simplified session check and creation
            await this.startOrResumeRegistration(user)

        } catch (error) {
            console.error('Error in handleRegistration:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi bắt đầu đăng ký. Vui lòng thử lại!')
        }
    }

    /**
     * Start or resume registration - SIMPLIFIED LOGIC
     */
    private async startOrResumeRegistration(user: any): Promise<void> {
        try {
            const existingSession = await getBotSession(user.facebook_id)

            if (existingSession && existingSession.current_flow === 'registration') {
                // Resume existing session
                console.log('Resuming existing registration session')
                await this.resumeRegistration(user, existingSession)
                return
            }

            // Start new registration
            console.log('Starting new registration session')

            // Welcome message with clear instructions
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

            // Start with first step
            await sendMessage(user.facebook_id, '📝 ĐĂNG KÝ (Bước 1/4)\n━━━━━━━━━━━━━━━━━━━━\n👤 HỌ TÊN ĐẦY ĐỦ\nVui lòng nhập họ tên đầy đủ của bạn:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: Đinh Khánh Tùng\n📝 Nhập họ tên để tiếp tục:')

        } catch (error) {
            console.error('Error in startOrResumeRegistration:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại!')
        }
    }

    /**
     * Resume registration flow from current step - FIXED VERSION
     */
    async resumeRegistration(user: any, session: any): Promise<void> {
        try {
            console.log('🔄 Resuming registration for user:', user.facebook_id, 'session:', session)

            // FIXED: Properly parse session data from database format (same logic as handleStep)
            let currentStep = 'name'
            let data = {}

            if (session) {
                if (session.session_data) {
                    // Format: { session_data: { step, data, started_at, current_flow } }
                    currentStep = session.session_data.step || 'name'
                    data = session.session_data.data || {}
                } else if (session.step) {
                    // Direct format: { step, data, started_at, current_flow }
                    currentStep = session.step || 'name'
                    data = session.data || {}
                } else {
                    // Fallback
                    currentStep = 'name'
                    data = {}
                }
            }

            console.log('🔄 Resumed session data:', { currentStep, data })

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
     * Handle registration step - FIXED VERSION with proper session handling
     */
    async handleStep(user: any, text: string, session: any): Promise<void> {
        try {
            console.log('🔍 handleStep called with raw session:', {
                text,
                rawSession: session,
                sessionType: typeof session
            })

            // FIXED: Properly parse session data from database format
            let sessionData = null
            let currentStep = 'name'
            let data = {}
            let startedAt = null

            if (session) {
                // Handle different session formats from database
                if (session.session_data) {
                    // Format: { session_data: { step, data, started_at, current_flow } }
                    sessionData = session.session_data
                    currentStep = sessionData.step || 'name'
                    data = sessionData.data || {}
                    startedAt = sessionData.started_at
                } else if (session.step) {
                    // Direct format: { step, data, started_at, current_flow }
                    sessionData = session
                    currentStep = session.step || 'name'
                    data = session.data || {}
                    startedAt = session.started_at
                } else {
                    // Fallback: assume it's the session data object itself
                    sessionData = session
                    currentStep = 'name'
                    data = {}
                }
            }

            console.log('🔍 Parsed session data:', {
                currentStep,
                data,
                startedAt,
                sessionData,
                hasSession: !!session
            })

            // Enhanced session validation with better error handling
            if (session && (!sessionData || !sessionData.current_flow)) {
                console.log('❌ Invalid session format in handleStep - attempting fallback')
                await this.handleSessionError(user, 'Phiên đăng ký không hợp lệ')
                return
            }

            // Check for exit commands
            if (text.toLowerCase().includes('hủy') || text.toLowerCase().includes('thoát') || text.toLowerCase().includes('cancel')) {
                await this.handleRegistrationCancel(user)
                return
            }

            // Check if session is too old (more than 30 minutes) with fallback
            if (startedAt) {
                const sessionAge = Date.now() - new Date(startedAt).getTime()
                if (sessionAge > 30 * 60 * 1000) { // 30 minutes
                    console.log('Session expired, offering restart')
                    await this.handleRegistrationTimeout(user)
                    return
                }
            }

            console.log('🔄 Processing step:', currentStep, 'with data:', data)

            // Use safe step processing
            await this.processRegistrationStep(user, text, currentStep, data)

        } catch (error) {
            console.error('Error in handleStep:', error)
            await this.handleStepError(user, error)
        }
    }

    /**
     * Process registration step with enhanced error handling
     */
    private async processRegistrationStep(user: any, text: string, step: string, data: any): Promise<void> {
        try {
            switch (step) {
                case 'name':
                    await this.handleRegistrationName(user, text, data)
                    break
                case 'phone':
                    await this.handleRegistrationPhone(user, text, data)
                    break
                case 'location':
                    await this.handleRegistrationLocation(user, text, data)
                    break
                case 'birthday':
                    await this.handleRegistrationBirthday(user, text, data)
                    break
                case 'birthday_confirm':
                    // This step is handled by postback buttons, not text input
                    await sendMessage(user.facebook_id, '❌ Vui lòng chọn nút xác nhận bên dưới để tiếp tục!')
                    break
                case 'email':
                    await this.handleRegistrationEmail(user, text, data)
                    break
                case 'keywords':
                    await this.handleRegistrationKeywords(user, text, data)
                    break
                case 'product_service':
                    await this.handleRegistrationProductService(user, text, data)
                    break
                default:
                    console.log('❌ Unknown step:', step)
                    await this.handleSessionError(user, 'Bước đăng ký không hợp lệ')
            }
        } catch (error) {
            console.error(`Error processing step ${step}:`, error)
            await this.handleStepError(user, error, step)
        }
    }

    /**
     * Handle session errors with fallback options
     */
    private async handleSessionError(user: any, errorMessage: string): Promise<void> {
        await sendMessage(user.facebook_id, `❌ ${errorMessage}`)
        await sendMessage(user.facebook_id, '💡 Bạn có thể:')

        await sendQuickReply(
            user.facebook_id,
            'Chọn hành động:',
            [
                createQuickReply('🔄 BẮT ĐẦU LẠI', 'REGISTER'),
                createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT_ADMIN')
            ]
        )

        // Clear invalid session
        await updateBotSession(user.facebook_id, null)
    }

    /**
     * Handle step errors with recovery options
     */
    private async handleStepError(user: any, error: any, currentStep?: string): Promise<void> {
        console.error('Step error:', error)

        const stepName = currentStep ? ` ở bước ${currentStep}` : ''
        await sendMessage(user.facebook_id, `❌ Có lỗi xảy ra${stepName}. Vui lòng thử lại!`)

        // Offer recovery options
        await sendQuickReply(
            user.facebook_id,
            'Bạn muốn:',
            [
                createQuickReply('🔄 THỬ LẠI', 'RETRY_STEP'),
                createQuickReply('🔄 BẮT ĐẦU LẠI', 'REGISTER'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT_ADMIN')
            ]
        )
    }

    /**
     * Handle name input - ENHANCED VERSION
     */
    private async handleRegistrationName(user: any, text: string, data: any): Promise<void> {
        console.log('🔍 handleRegistrationName called:', { text, textLength: text.length, data })

        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined, creating new object')
            data = {}
        }

        // Validate name using comprehensive validation
        const validation = this.validateName(text)
        if (!validation.isValid) {
            // Enhanced error message with guidance
            const errorMessage = validation.message || '❌ Tên không hợp lệ. Vui lòng nhập lại:'
            await sendMessage(user.facebook_id, errorMessage)

            // Provide helpful guidance
            await sendMessage(user.facebook_id, '💡 Mẹo: Nhập tên thật của bạn, ví dụ:\n• Nguyễn Văn Minh\n• Trần Thị Lan\n• Lê Minh Tuấn')
            return
        }

        data.name = text.trim()
        console.log('✅ Name saved:', data.name)

        // Enhanced success message with progress indicator
        await sendMessage(user.facebook_id, `✅ Họ tên: ${data.name}\n\n📝 Tiến trình: (1/4) ✅ → (2/4) 📱 → (3/4) 📍 → (4/4) 🎂\n\n📱 Bước 2: Số điện thoại\nVui lòng nhập số điện thoại của bạn:`)

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
     * Handle phone input - ENHANCED VERSION
     */
    private async handleRegistrationPhone(user: any, text: string, data: any): Promise<void> {
        console.log('📱 handleRegistrationPhone called:', {
            text,
            textLength: text.length,
            data,
            userId: user.facebook_id
        })

        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in phone handler, creating new object')
            data = {}
        }

        const phone = text.replace(/\D/g, '').trim()

        console.log('📱 Phone processing:', {
            originalText: text,
            cleanedPhone: phone,
            phoneLength: phone.length
        })

        // Enhanced phone validation with better error messages
        if (phone.length < 10) {
            console.log('❌ Phone too short:', phone.length)
            await sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ!')
            await sendMessage(user.facebook_id, '💡 Vui lòng nhập số điện thoại hợp lệ:\n• 10-11 chữ số\n• Ví dụ: 0901234567\n• Không cần nhập khoảng cách hay dấu gạch ngang')
            return
        }

        if (phone.length > 11) {
            console.log('❌ Phone too long:', phone.length)
            await sendMessage(user.facebook_id, '❌ Số điện thoại quá dài. Vui lòng kiểm tra lại!')
            return
        }

        // Check if phone already exists
        console.log('🔍 Checking if phone exists:', phone)
        const { data: existingUser, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id')
            .eq('phone', phone)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error checking phone:', error)
        }

        if (existingUser && existingUser.facebook_id !== user.facebook_id) {
            console.log('❌ Phone already exists for another user')
            await sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng bởi tài khoản khác!')
            await sendMessage(user.facebook_id, '💡 Vui lòng sử dụng số điện thoại khác hoặc liên hệ admin để được hỗ trợ.')
            return
        }

        data.phone = phone
        console.log('✅ Phone saved:', data.phone)

        // Enhanced success message with progress indicator
        await sendMessage(user.facebook_id, `✅ SĐT: ${phone}\n\n📝 Tiến trình: (1/4) ✅ → (2/4) ✅ → (3/4) 📍 → (4/4) 🎂\n\n📍 Bước 3: Vị trí sinh sống\nVui lòng chọn tỉnh/thành phố bạn đang sinh sống:`)

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
     * Handle location selection - ENHANCED VERSION
     */
    async handleRegistrationLocationPostback(user: any, location: string): Promise<void> {
        try {
            console.log('🔄 Handling location postback for user:', user.facebook_id, 'location:', location)

            const session = await getBotSession(user.facebook_id)
            if (!session || session.current_flow !== 'registration') {
                console.log('❌ Invalid session in location postback')
                await this.handleSessionError(user, 'Phiên đăng ký không hợp lệ')
                return
            }

            // FIXED: Properly parse session data from database format
            let data: Record<string, any> = {}
            if (session.session_data) {
                data = (session.session_data.data as Record<string, any>) || {}
            } else if (session.data) {
                data = (session.data as Record<string, any>) || {}
            }

            data.location = location
            console.log('✅ Location saved:', data.location)

            // Enhanced success message with progress indicator
            await sendMessage(user.facebook_id, `✅ Vị trí: ${location}\n\n📝 Tiến trình: (1/4) ✅ → (2/4) ✅ → (3/4) ✅ → (4/4) 🎂\n\n🎂 Bước 4: Xác nhận năm sinh\nĐây là bước quan trọng nhất để đảm bảo bạn thuộc cộng đồng Tân Dậu!\n\n❓ Bạn có sinh năm 1981 (Tân Dậu) không?`)

            await sendQuickReply(
                user.facebook_id,
                'Xác nhận năm sinh:',
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
            await this.handleStepError(user, error, 'location')
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

            // FIXED: Properly parse session data from database format
            let data: Record<string, any> = {}
            if (session.session_data) {
                data = (session.session_data.data as Record<string, any>) || {}
            } else if (session.data) {
                data = (session.data as Record<string, any>) || {}
            }

            // Ensure data properties exist to avoid TypeScript errors
            data.location = data.location || null
            data.name = data.name || null
            data.phone = data.phone || null

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
     * Handle keywords input for better search - ENHANCED VERSION
     */
    private async handleRegistrationKeywords(user: any, text: string, data: any): Promise<void> {
        // FIX: Đảm bảo data không bao giờ là undefined
        if (!data) {
            console.log('⚠️ Data is undefined in keywords handler, creating new object')
            data = {}
        }

        if (text.toLowerCase().includes('bỏ qua') || text.toLowerCase().includes('không')) {
            data.keywords = null
            await sendMessage(user.facebook_id, '✅ Bỏ qua từ khóa tìm kiếm')
        } else {
            // Validate keywords for inappropriate content
            const validation = this.validateKeywords(text)
            if (!validation.isValid) {
                await sendMessage(user.facebook_id, validation.message || '❌ Từ khóa không hợp lệ. Vui lòng nhập lại hoặc "bỏ qua":')
                await sendMessage(user.facebook_id, '💡 Ví dụ từ khóa hợp lệ:\n• nhà đất, căn hộ\n• xe honda, xe máy\n• điện thoại, laptop')
                return
            }
            data.keywords = text.trim()
            await sendMessage(user.facebook_id, `✅ Từ khóa: ${data.keywords}`)
        }

        // Enhanced transition to next step with progress indicator
        await sendMessage(user.facebook_id, `\n📝 Tiến trình: (5/7) ✅ → (6/7) 🛒 → (7/7) 🎉\n\n🛒 Bước 6: Sản phẩm/Dịch vụ\nBạn muốn bán sản phẩm hay dịch vụ gì?\n\n💡 Ví dụ:\n• Nhà đất, căn hộ cho thuê\n• Xe máy, ô tô\n• Dịch vụ sửa chữa, tư vấn`)

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

        // Admin check moved to dashboard - no longer needed here

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


}
