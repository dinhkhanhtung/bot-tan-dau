import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReplyNoTyping,
    sendQuickReply,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, generateReferralCode, isTrialUser, isExpiredUser, daysUntilExpiry, generateId } from '../utils'
import { updateBotSession, getBotSession } from '../database-service'
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
            console.log('🔍 Processing step for user:', user.facebook_id)
            console.log('[DEBUG] handleStep: session=${JSON.stringify(session)}, input=${text}')

            // Get current step from session - ensure consistent numeric comparison
            let currentStep: number

            if (session?.step !== undefined && session?.step !== null) {
                currentStep = typeof session.step === 'string' ? parseInt(session.step) || 0 : session.step
            } else if (session?.current_step !== undefined && session?.current_step !== null) {
                currentStep = typeof session.current_step === 'string' ? parseInt(session.current_step) || 0 : session.current_step
            } else {
                currentStep = 0
            }

            console.log('🔍 Current step value:', currentStep, 'Type:', typeof currentStep)
            console.log('[DEBUG] Session step details:', {
                sessionStep: session?.step,
                sessionCurrentStep: session?.current_step,
                resolvedStep: currentStep
            })

            // Handle name step (step 0)
            if (currentStep === 0) {
                console.log('📝 Processing name step')
                await this.handleNameStep(user, text, session)
            }
            // Handle phone step (step 1)
            else if (currentStep === 1) {
                console.log('📱 Processing phone step')
                await this.handlePhoneStep(user, text, session)
            }
            // Handle location step (step 2) - expects postback, not text
            else if (currentStep === 2) {
                console.log('📍 Processing location step')
                await this.handleLocationStep(user, text, session)
            }
            // Handle birthday step (step 3) - expects postback, not text
            else if (currentStep === 3) {
                console.log('🎂 Processing birthday step')
                await this.handleBirthdayStep(user, text, session)
            }
            else {
                console.log('❌ Unknown step:', currentStep, 'Type:', typeof currentStep)
                console.log('[DEBUG] Session data:', JSON.stringify(session, null, 2))
                await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            console.error('❌ Step processing error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle name input step - FIXED VERSION
     */
    private async handleNameStep(user: any, text: string, session: any): Promise<void> {
        console.log('📝 Processing name step for user:', user.facebook_id)

        // Validate name
        if (!text || text.trim().length < 2) {
            await this.sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ!')
            return
        }

        // Save name and move to phone step - FIX STEP HANDLING
        const nextStep = 1 // Always use number
        const sessionData = {
            current_flow: 'registration',
            step: nextStep,  // Use number consistently
            data: { name: text.trim() }
        }

        console.log('[DEBUG] Saving name step session:', JSON.stringify(sessionData))

        // Update session - new implementation handles errors gracefully
        try {
            await updateBotSession(user.facebook_id, sessionData)
        } catch (error) {
            console.error('❌ Session update error:', error)
            console.error('❌ Session data that failed:', JSON.stringify(sessionData, null, 2))
            await this.sendErrorMessage(user.facebook_id)
            return
        }

        // Send phone prompt
        await this.sendMessage(user.facebook_id, `✅ Họ tên: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📱 Bước 2/4: Số điện thoại\n💡 Nhập số điện thoại để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập số điện thoại:`)

        console.log('✅ Name step completed, moved to phone step')
    }

    /**
     * Handle phone input step - FIXED VERSION
     */
    private async handlePhoneStep(user: any, text: string, session: any): Promise<void> {
        console.log('📱 Processing phone step for user:', user.facebook_id)
        console.log('[DEBUG] handlePhoneStep: user=${user.facebook_id}, input=${text}, session.data=${JSON.stringify(session.data)}')

        // Clean phone number
        const phone = text.replace(/\D/g, '').trim()
        console.log('[DEBUG] Cleaned phone number:', phone)

        // Validate phone
        if (phone.length < 10 || phone.length > 11) {
            console.log('[DEBUG] Phone validation failed:', phone.length)
            await this.sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.')
            return
        }

        // Check if phone exists
        console.log('[DEBUG] Checking if phone exists in database...')
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('facebook_id')
            .eq('phone', phone)
            .single()

        if (existingUser && existingUser.facebook_id !== user.facebook_id) {
            console.log('[DEBUG] Phone already exists for another user:', existingUser.facebook_id)
            await this.sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng!')
            return
        }

        console.log('[DEBUG] Phone validation passed, updating session...')

        // Update session with phone data - FIX STEP HANDLING
        const nextStep = 2 // Always use number
        const sessionData = {
            current_flow: 'registration',
            step: nextStep,  // Use numeric step for consistency
            data: {
                ...session.data,
                phone: phone
            }
        }

        console.log('[DEBUG] New session data:', JSON.stringify(sessionData))

        // Update session - new implementation handles errors gracefully
        try {
            await updateBotSession(user.facebook_id, sessionData)
        } catch (error) {
            console.error('❌ Session update error:', error)
            console.error('❌ Session data that failed:', JSON.stringify(sessionData, null, 2))
            await this.sendErrorMessage(user.facebook_id)
            return
        }

        // Send location prompt
        await this.sendMessage(user.facebook_id, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/4: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━`)

        // Send location buttons
        console.log('[DEBUG] Sending location buttons...')
        await this.sendLocationButtons(user.facebook_id)

        console.log('✅ Phone step completed, moved to location step')
    }

    /**
     * Handle location selection step
     */
    private async handleLocationStep(user: any, text: string, session: any): Promise<void> {
        console.log('📍 Processing location step for user:', user.facebook_id)
        console.log('[DEBUG] handleLocationStep: user=${user.facebook_id}, input=${text}, session.step=${session?.step}')

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
     * Handle location postback - FIXED VERSION
     */
    async handleLocationPostback(user: any, location: string): Promise<void> {
        try {
            console.log('🏠 Processing location postback:', location, 'for user:', user.facebook_id)

            // Get current session
            const session = await getBotSession(user.facebook_id)
            if (!session) {
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Move to final step - birthday verification - FIX STEP HANDLING
            const nextStep = 3 // Always use number
            const sessionData = {
                current_flow: 'registration',
                step: nextStep,  // Use numeric step for consistency
                data: {
                    ...session.data,
                    location: location
                }
            }

            // Update session - new implementation handles errors gracefully
            try {
                await updateBotSession(user.facebook_id, sessionData)
            } catch (error) {
                console.error('❌ Session update error:', error)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Send birthday verification prompt
            await this.sendMessage(user.facebook_id, `✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n🎂 Bước 4/4: Xác nhận sinh năm\n💡 Chỉ dành cho Tân Dậu (sinh năm 1981)\n━━━━━━━━━━━━━━━━━━━━`)
            await this.sendBirthdayVerificationButtons(user.facebook_id)

        } catch (error) {
            console.error('❌ Location postback error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Complete registration process - FIXED VERSION
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

            // Clear session - ADD ERROR HANDLING
            try {
                await updateBotSession(user.facebook_id, null)
                console.log('✅ Session cleared successfully')
            } catch (error) {
                console.error('❌ Error clearing session:', error)
                // Don't return here - registration was successful, just log the error
            }

            // Send success message
            await this.sendMessage(user.facebook_id, `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${data.name}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n━━━━━━━━━━━━━━━━━━━━\n🎁 Bạn được dùng thử miễn phí 3 ngày!\n🚀 Chúc bạn sử dụng bot vui vẻ!`)

            console.log('✅ Registration completed successfully!')

        } catch (error) {
            console.error('❌ Registration completion error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Start registration process - FIXED VERSION
     */
    private async startRegistration(user: any): Promise<void> {
        try {
            // Create initial session with numeric step 0 - FIX STEP HANDLING
            const initialStep = 0 // Always use number
            const sessionData = {
                current_flow: 'registration',
                step: initialStep,  // Use numeric step for consistency
                data: {}
            }

            // Update session - new implementation handles errors gracefully
            try {
                await updateBotSession(user.facebook_id, sessionData)
            } catch (error) {
                console.error('❌ Session update error:', error)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

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
            await this.sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await this.sendMessage(user.facebook_id, '📝 Bước 1: Nhập họ tên đầy đủ của bạn:')

        } catch (error) {
            console.error('❌ Registration start error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Send location selection buttons
     */
    private async sendLocationButtons(facebookId: string): Promise<void> {
        console.log('[DEBUG] sendLocationButtons: Creating location buttons for user:', facebookId)

        const locations = [
            '🏠 HÀ NỘI', '🏢 TP.HCM', '🏖️ ĐÀ NẴNG',
            '🌊 HẢI PHÒNG', '🏔️ CẦN THƠ', '🏘️ BÌNH DƯƠNG'
        ]

        console.log('[DEBUG] Location options:', locations)

        const buttons = locations.map(location => {
            const locationCode = location.split(' ')[1]
            const payload = `LOC_${locationCode}`
            console.log('[DEBUG] Creating button:', location, '->', payload)
            return createQuickReply(location, payload)
        })

        console.log('[DEBUG] Total buttons created:', buttons.length)

        await sendQuickReply(facebookId, '📍 Bước 3/4: Chọn tỉnh/thành phố nơi bạn sinh sống:', buttons)
        console.log('[DEBUG] Location buttons sent successfully')
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
                // User is not born in 1981 - cannot register - ADD ERROR HANDLING
                try {
                    await updateBotSession(user.facebook_id, null)
                    console.log('✅ Session cleared for non-1981 user')
                } catch (error) {
                    console.error('❌ Error clearing session for non-1981 user:', error)
                    // Don't return here - still show the rejection message
                }

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
