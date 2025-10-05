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
    // Simple registration flow - completely rewritten for reliability

    /**
     * Main registration handler - handles the entire flow
     */
    async handleRegistration(user: any): Promise<void> {
        try {
            console.log('🔄 Starting registration for user:', user.facebook_id)

            // Check if user already registered
            if (user.status === 'registered' || user.status === 'trial') {
                await this.sendAlreadyRegisteredMessage(user)
                return
            }

            // Start fresh registration
            await this.startRegistration(user)

        } catch (error) {
            console.error('❌ Registration error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle step input - simplified logic
     */
    async handleStep(user: any, text: string, session: any): Promise<void> {
        try {
            console.log('🔍 Processing step:', session?.step, 'for user:', user.facebook_id)

            // Get current step from session - handle both old and new session format
            const currentStep = session?.step || (session as any)?.current_step?.toString() || 'name'

            switch (currentStep) {
                case 'name':
                case '0':
                    await this.handleNameStep(user, text, session)
                    break
                case 'phone':
                case '1':
                    await this.handlePhoneStep(user, text, session)
                    break
                case 'location':
                case '2':
                    await this.handleLocationStep(user, text, session)
                    break
                case 'birthday':
                case '3':
                    await this.handleBirthdayStep(user, text, session)
                    break
                default:
                    console.log('❌ Unknown step:', currentStep)
                    await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            console.error('❌ Step processing error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle name input step
     */
    private async handleNameStep(user: any, text: string, session: any): Promise<void> {
        console.log('📝 Processing name step for user:', user.facebook_id)

        // Validate name
        if (!text || text.trim().length < 2) {
            await this.sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ!')
            return
        }

        // Save name and move to phone step
        const sessionData = {
            current_flow: 'registration',
            step: '1',  // Use numeric step for consistency
            data: { name: text.trim() }
        }

        await updateBotSession(user.facebook_id, sessionData)

        // Send phone prompt
        await this.sendMessage(user.facebook_id, `✅ Họ tên: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📱 Bước 2/4: Số điện thoại\n💡 Nhập số điện thoại để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập số điện thoại:`)

        console.log('✅ Name step completed, moved to phone step')
    }

    /**
     * Handle phone input step
     */
    private async handlePhoneStep(user: any, text: string, session: any): Promise<void> {
        console.log('📱 Processing phone step for user:', user.facebook_id)

        // Clean phone number
        const phone = text.replace(/\D/g, '').trim()

        // Validate phone
        if (phone.length < 10 || phone.length > 11) {
            await this.sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.')
            return
        }

        // Check if phone exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('facebook_id')
            .eq('phone', phone)
            .single()

        if (existingUser && existingUser.facebook_id !== user.facebook_id) {
            await this.sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng!')
            return
        }

        // Update session with phone data
        const sessionData = {
            current_flow: 'registration',
            step: '2',  // Use numeric step for consistency
            data: {
                ...session.data,
                phone: phone
            }
        }

        await updateBotSession(user.facebook_id, sessionData)

        // Send location prompt
        await this.sendMessage(user.facebook_id, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/4: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━`)

        // Send location buttons
        await this.sendLocationButtons(user.facebook_id)

        console.log('✅ Phone step completed, moved to location step')
    }

    /**
     * Handle location selection step
     */
    private async handleLocationStep(user: any, text: string, session: any): Promise<void> {
        console.log('📍 Processing location step for user:', user.facebook_id)

        // For location step, we expect postback, not text
        await this.sendMessage(user.facebook_id, '❌ Vui lòng chọn tỉnh/thành phố từ các nút bên dưới!')
    }

    /**
     * Handle birthday verification step
     */
    private async handleBirthdayStep(user: any, text: string, session: any): Promise<void> {
        console.log('🎂 Processing birthday step for user:', user.facebook_id)

        // For birthday step, we expect postback, not text
        await this.sendMessage(user.facebook_id, '❌ Vui lòng chọn từ các nút bên dưới để xác nhận!')
    }

    /**
     * Handle location postback
     */
    async handleLocationPostback(user: any, location: string): Promise<void> {
        try {
            console.log('🏠 Processing location postback:', location, 'for user:', user.facebook_id)

            // Get current session
            const session = await getBotSession(user.facebook_id)
            const currentStepValue = (session as any)?.current_step || session?.step
            if (!session || (session.step !== 'location' && session.step !== '2' && currentStepValue?.toString() !== 'location' && currentStepValue?.toString() !== '2')) {
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Move to final step - birthday verification
            const sessionData = {
                current_flow: 'registration',
                step: '3',  // Use numeric step for consistency
                data: {
                    ...session.data,
                    location: location
                }
            }

            await updateBotSession(user.facebook_id, sessionData)

            // Send birthday verification prompt
            await this.sendMessage(user.facebook_id, `✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n🎂 Bước 4/4: Xác nhận sinh năm\n💡 Chỉ dành cho Tân Dậu (sinh năm 1981)\n━━━━━━━━━━━━━━━━━━━━`)
            await this.sendBirthdayVerificationButtons(user.facebook_id)

        } catch (error) {
            console.error('❌ Location postback error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Complete registration process
     */
    private async completeRegistration(user: any, data: any): Promise<void> {
        try {
            console.log('🎉 Completing registration for user:', user.facebook_id)

            // Validate required data
            if (!data.name || !data.phone || !data.location) {
                console.error('❌ Missing registration data:', data)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Create user record
            const { error } = await supabaseAdmin
                .from('users')
                .insert({
                    id: generateId(),
                    facebook_id: user.facebook_id,
                    name: data.name,
                    phone: data.phone,
                    location: data.location,
                    birthday: 1981,
                    status: 'trial',
                    membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    referral_code: `TD1981-${user.facebook_id.slice(-6)}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (error) {
                console.error('❌ Database error:', error)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Clear session
            await updateBotSession(user.facebook_id, null)

            // Send success message
            await this.sendMessage(user.facebook_id, `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${data.name}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n━━━━━━━━━━━━━━━━━━━━\n🎁 Bạn được dùng thử miễn phí 3 ngày!\n🚀 Chúc bạn sử dụng bot vui vẻ!`)

            console.log('✅ Registration completed successfully!')

        } catch (error) {
            console.error('❌ Registration completion error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Start registration process
     */
    private async startRegistration(user: any): Promise<void> {
        // Create initial session
        await updateBotSession(user.facebook_id, {
            current_flow: 'registration',
            step: 'name',
            data: {}
        })

        // Send welcome message with quick guide
        await this.sendMessage(user.facebook_id, '🚀 ĐĂNG KÝ BOT TÂN DẬU - Hỗ Trợ Chéo')
        await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
        await this.sendMessage(user.facebook_id, '📋 QUY TRÌNH ĐĂNG KÝ:')
        await this.sendMessage(user.facebook_id, '1️⃣ Họ tên đầy đủ')
        await this.sendMessage(user.facebook_id, '2️⃣ Số điện thoại')
        await this.sendMessage(user.facebook_id, '3️⃣ Tỉnh/thành phố')
        await this.sendMessage(user.facebook_id, '4️⃣ Xác nhận sinh năm 1981')
        await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
        await this.sendMessage(user.facebook_id, '💡 LƯU Ý QUAN TRỌNG:')
        await this.sendMessage(user.facebook_id, '• Chỉ dành cho Tân Dậu (1981)')
        await this.sendMessage(user.facebook_id, '• Thông tin được bảo mật tuyệt đối')
        await this.sendMessage(user.facebook_id, '• Trial 3 ngày miễn phí')
        await this.sendMessage(user.facebook_id, '• Phí duy trì: 3,000đ/ngày')
        await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
        await this.sendMessage(user.facebook_id, '📝 Bước 1: Nhập họ tên đầy đủ của bạn:')
    }

    /**
     * Send location selection buttons
     */
    private async sendLocationButtons(facebookId: string): Promise<void> {
        const locations = [
            '🏠 HÀ NỘI', '🏢 TP.HCM', '🏖️ ĐÀ NẴNG',
            '🌊 HẢI PHÒNG', '🏔️ CẦN THƠ', '🏘️ BÌNH DƯƠNG'
        ]

        const buttons = locations.map(location =>
            createQuickReply(location, `LOC_${location.split(' ')[1]}`)
        )

        await sendQuickReply(facebookId, '📍 Bước 3/4: Chọn tỉnh/thành phố nơi bạn sinh sống:', buttons)
    }

    /**
     * Send birthday verification buttons
     */
    private async sendBirthdayVerificationButtons(facebookId: string): Promise<void> {
        const buttons = [
            createQuickReply('✅ Đúng vậy, tôi sinh năm 1981', 'REG_BIRTHDAY_YES'),
            createQuickReply('❌ Không phải, tôi sinh năm khác', 'REG_BIRTHDAY_NO')
        ]

        await sendQuickReply(facebookId, '🎂 Bạn có sinh năm 1981 (Tân Dậu) không?', buttons)
    }

    /**
     * Send already registered message
     */
    private async sendAlreadyRegisteredMessage(user: any): Promise<void> {
        await this.sendMessage(user.facebook_id, '✅ Bạn đã đăng ký rồi!\nSử dụng menu bên dưới để truy cập các tính năng.')

        await sendQuickReply(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createQuickReply('🛒 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
            ]
        )
    }

    /**
     * Send error message
     */
    private async sendErrorMessage(facebookId: string): Promise<void> {
        await this.sendMessage(facebookId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }

    /**
     * Send message helper
     */
    private async sendMessage(facebookId: string, message: string): Promise<void> {
        try {
            await sendMessage(facebookId, message)
        } catch (error) {
            console.error('❌ Send message error:', error)
        }
    }

    // Legacy methods for backward compatibility
    async handleRegistrationLocationPostback(user: any, location: string): Promise<void> {
        await this.handleLocationPostback(user, location)
    }

    async handleBirthdayVerification(user: any, answer: string): Promise<void> {
        try {
            console.log('🎂 Processing birthday verification:', answer, 'for user:', user.facebook_id)

            if (answer === 'YES') {
                // User confirmed they were born in 1981 - complete registration
                const session = await getBotSession(user.facebook_id)
                if (session && session.data) {
                    await this.completeRegistration(user, session.data)
                } else {
                    await this.sendErrorMessage(user.facebook_id)
                }
            } else if (answer === 'NO') {
                // User is not born in 1981 - cannot register
                await updateBotSession(user.facebook_id, null)

                await this.sendMessage(user.facebook_id, '❌ XIN LỖI')
                await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
                await this.sendMessage(user.facebook_id, '😔 Bot Tân Dậu - Hỗ Trợ Chéo chỉ dành riêng cho những người con Tân Dậu sinh năm 1981.')
                await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
                await this.sendMessage(user.facebook_id, '💡 Nếu bạn sinh năm khác, bạn có thể:')
                await this.sendMessage(user.facebook_id, '• Liên hệ Đinh Khánh Tùng để được tư vấn')
                await this.sendMessage(user.facebook_id, '• Tham gia các cộng đồng khác phù hợp hơn')
                await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
                await this.sendMessage(user.facebook_id, '📞 Liên hệ: 0982581222')
                await this.sendMessage(user.facebook_id, '📧 Email: dinhkhanhtung@outlook.com')
            } else {
                await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            console.error('❌ Birthday verification error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

}
