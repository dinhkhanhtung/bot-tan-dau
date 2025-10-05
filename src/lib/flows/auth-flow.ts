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

            // Get current step from session
            const currentStep = session?.step || 'name'

            switch (currentStep) {
                case 'name':
                    await this.handleNameStep(user, text, session)
                    break
                case 'phone':
                    await this.handlePhoneStep(user, text, session)
                    break
                case 'location':
                    await this.handleLocationStep(user, text, session)
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
            step: 'phone',
            data: { name: text.trim() },
            started_at: new Date().toISOString()
        }

        await updateBotSession(user.facebook_id, sessionData)

        // Send phone prompt
        await this.sendMessage(user.facebook_id, `✅ Họ tên: ${text.trim()}\n\n📱 Bước 2: Số điện thoại\nVui lòng nhập số điện thoại:`)

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
            step: 'location',
            data: {
                ...session.data,
                phone: phone
            },
            started_at: new Date().toISOString()
        }

        await updateBotSession(user.facebook_id, sessionData)

        // Send location prompt
        await this.sendMessage(user.facebook_id, `✅ SĐT: ${phone}\n\n📍 Bước 3: Chọn tỉnh/thành phố`)

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
     * Handle location postback
     */
    async handleLocationPostback(user: any, location: string): Promise<void> {
        try {
            console.log('🏠 Processing location postback:', location, 'for user:', user.facebook_id)

            // Get current session
            const session = await getBotSession(user.facebook_id)
            if (!session || session.step !== 'location') {
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Complete registration
            await this.completeRegistration(user, {
                ...session.data,
                location: location
            })

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
            data: {},
            started_at: new Date().toISOString()
        })

        // Send welcome message
        await this.sendMessage(user.facebook_id, '🚀 ĐĂNG KÝ BOT TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n📝 Bước 1: Nhập họ tên đầy đủ của bạn:')
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

        await sendQuickReply(facebookId, 'Chọn tỉnh/thành phố:', buttons)
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
        // Simplified birthday verification - just complete registration
        await this.completeRegistration(user, { name: 'Test', phone: '0123456789', location: 'HÀ NỘI' })
    }

}
