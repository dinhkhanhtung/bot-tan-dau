import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
import { supabaseAdmin } from '../../supabase'
import {
    sendMessage,
    sendQuickReply,
    createQuickReply
} from '../../facebook-api'
import { generateId } from '../../utils'

/**
 * Registration Flow - Clean, modular implementation
 * Handles user registration process with consistent session management
 */
export class RegistrationFlow extends BaseFlow {
    readonly flowName = 'registration'

    /**
     * Check if this flow can handle the user/session
     */
    canHandle(user: any, session: any): boolean {
        // Can handle if user is not registered and wants to register
        return user.status === 'new_user' || 
               (session && session.current_flow === 'registration')
    }

    /**
     * Handle message input
     */
    async handleMessage(user: any, text: string, session: any): Promise<void> {
        try {
            console.log('🔍 Processing step for user:', user.facebook_id)
            console.log('[DEBUG] Session:', JSON.stringify(session, null, 2))
            console.log('[DEBUG] Input:', text)

            // Get current step - SIMPLIFIED
            const currentStep = session?.step || 0
            console.log('🔍 Current step:', currentStep)

            // Handle each step
            switch (currentStep) {
                case 0:
                    await this.handleNameStep(user, text)
                    break
                case 1:
                    await this.handlePhoneStep(user, text)
                    break
                case 2:
                    await this.handleLocationStep(user, text)
                    break
                case 3:
                    await this.handleBirthdayStep(user, text)
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
     * Handle postback events
     */
    async handlePostback(user: any, payload: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handlePostback', { payload, session })

            if (payload === 'REGISTER') {
                await this.startRegistration(user)
            } else if (payload.startsWith('LOC_')) {
                await this.handleLocationPostback(user, payload, session)
            } else if (payload === 'REG_BIRTHDAY_YES') {
                await this.handleBirthdayVerification(user, 'YES')
            } else if (payload === 'REG_BIRTHDAY_NO') {
                await this.handleBirthdayVerification(user, 'NO')
            } else if (payload === 'CANCEL_REGISTRATION') {
                await this.cancelRegistration(user)
            }

        } catch (error) {
            await this.handleError(user, error, 'handlePostback')
        }
    }

    /**
     * Start registration process - EXACT COPY FROM OLD LOGIC
     */
    private async startRegistration(user: any): Promise<void> {
        try {
            console.log(`🔄 Starting registration for user: ${user.facebook_id}`)

            // Check if user already registered
            if (user.status === 'registered' || user.status === 'trial') {
                await this.sendAlreadyRegisteredMessage(user)
                return
            }

            // Clear any existing session first
            await SessionManager.deleteSession(user.facebook_id)

            // Create new session
            await SessionManager.createSession(user.facebook_id, 'registration', 0, {})

            // Send welcome message with quick guide - EXACT COPY FROM OLD LOGIC
            await sendMessage(user.facebook_id, '🚀 ĐĂNG KÝ BOT TÂN DẬU - Hỗ Trợ Chéo')
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, '📋 QUY TRÌNH ĐĂNG KÝ:')
            await sendMessage(user.facebook_id, '1️⃣ Họ tên đầy đủ')
            await sendMessage(user.facebook_id, '2️⃣ Số điện thoại')
            await sendMessage(user.facebook_id, '3️⃣ Tỉnh/thành phố')
            await sendMessage(user.facebook_id, '4️⃣ Xác nhận sinh năm 1981')
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, '💡 LƯU Ý QUAN TRỌNG:')
            await sendMessage(user.facebook_id, '• Chỉ dành cho Tân Dậu (1981)')
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, '📝 Bước 1: Nhập họ tên đầy đủ của bạn:')

        } catch (error) {
            await this.handleError(user, error, 'startRegistration')
        }
    }

    /**
     * Handle name input step
     */
    private async handleNameStep(user: any, text: string): Promise<void> {
        console.log('📝 Processing name step for user:', user.facebook_id)

        // Validate name
        if (!text || text.trim().length < 2) {
            await sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ!')
            return
        }

        // Update existing session with name
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 1,
                current_step: 1,
                data: { name: text.trim() },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send phone prompt
        await sendMessage(user.facebook_id, `✅ Họ tên: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📱 Bước 2/4: Số điện thoại\n💡 Nhập số điện thoại để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập số điện thoại:`)

        console.log('✅ Name step completed, moved to phone step')
    }

    /**
     * Handle phone input step
     */
    private async handlePhoneStep(user: any, text: string): Promise<void> {
        console.log('📱 Processing phone step for user:', user.facebook_id)

        // Clean phone number
        const phone = text.replace(/\D/g, '').trim()
        console.log('[DEBUG] Cleaned phone number:', phone)

        // Validate phone
        if (phone.length < 10 || phone.length > 11) {
            console.log('[DEBUG] Phone validation failed:', phone.length)
            await sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.')
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
            await sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng!')
            return
        }

        // Get current session data
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}

        // Update session with phone data
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 2,
                current_step: 2,
                data: {
                    ...currentData,
                    phone: phone
                },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send location prompt
        await sendMessage(user.facebook_id, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/4: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━`)

        // Send location buttons
        console.log('[DEBUG] Sending location buttons...')
        await this.sendLocationButtons(user.facebook_id)

        console.log('✅ Phone step completed, moved to location step')
    }

    /**
     * Handle location step (text input)
     */
    private async handleLocationStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📍 Processing location step for user: ${user.facebook_id}`)
            
            // For now, just show location buttons
            await this.sendLocationButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleLocationStep')
        }
    }

    /**
     * Handle birthday step
     */
    private async handleBirthdayStep(user: any, text: string): Promise<void> {
        try {
            console.log(`🎂 Processing birthday step for user: ${user.facebook_id}`)
            
            // Validate birthday format (DD/MM/YYYY)
            const birthdayRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            const match = text.match(birthdayRegex)
            
            if (!match) {
                await sendMessage(user.facebook_id, '❌ Định dạng ngày sinh không đúng! Vui lòng nhập theo định dạng DD/MM/YYYY')
                return
            }

            const [, day, month, year] = match
            const birthYear = parseInt(year)
            
            // Check if born in 1981 (Tân Dậu)
            if (birthYear !== 1981) {
                await sendMessage(user.facebook_id, '❌ Chỉ dành cho người sinh năm 1981 (Tân Dậu)!')
                return
            }

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with birthday
            await SessionManager.updateSession(user.facebook_id, {
                step: 4,
                data: {
                    ...currentData,
                    birthday: text.trim()
                }
            })

            // Complete registration
            await this.completeRegistration(user, {
                ...currentData,
                birthday: text.trim()
            })

        } catch (error) {
            await this.handleError(user, error, 'handleBirthdayStep')
        }
    }

    /**
     * Handle location postback
     */
    private async handleLocationPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log('🏠 Processing location postback:', payload, 'for user:', user.facebook_id)

            const location = payload.replace('LOC_', '')
            console.log('[DEBUG] Selected location:', location)

            // Get current session data
            const { data: sessionData } = await supabaseAdmin
                .from('bot_sessions')
                .select('data')
                .eq('facebook_id', user.facebook_id)
                .single()

            const currentData = sessionData?.data || {}

            // Update session with location
            const { error } = await supabaseAdmin
                .from('bot_sessions')
                .update({
                    step: 3,
                    current_step: 3,
                    data: {
                        ...currentData,
                        location: location
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', user.facebook_id)

            if (error) {
                console.error('❌ Database error:', error)
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                return
            }

            // Send birthday verification prompt
            await sendMessage(user.facebook_id, `✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n🎂 Bước 4/4: Xác nhận sinh năm\n💡 Chỉ dành cho Tân Dậu (sinh năm 1981)\n━━━━━━━━━━━━━━━━━━━━`)
            await this.sendBirthdayVerificationButtons(user.facebook_id)

        } catch (error) {
            console.error('❌ Location postback error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
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
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
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
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                return
            }

            // Clear session
            await supabaseAdmin
                .from('bot_sessions')
                .delete()
                .eq('facebook_id', user.facebook_id)

            // Send success message
            await sendMessage(user.facebook_id, `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${data.name}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n━━━━━━━━━━━━━━━━━━━━\n🎁 Bạn được dùng thử miễn phí 3 ngày!\n🚀 Chúc bạn sử dụng bot vui vẻ!`)

            console.log('✅ Registration completed successfully!')

        } catch (error) {
            console.error('❌ Registration completion error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    /**
     * Cancel registration
     */
    private async cancelRegistration(user: any): Promise<void> {
        try {
            await SessionManager.deleteSession(user.facebook_id)
            await sendMessage(user.facebook_id, '❌ Đã hủy đăng ký. Chào tạm biệt!')
        } catch (error) {
            await this.handleError(user, error, 'cancelRegistration')
        }
    }

    /**
     * Send registration welcome message
     */
    private async sendRegistrationWelcome(user: any): Promise<void> {
        await sendMessage(user.facebook_id, 
            `🎉 CHÀO MỪNG ĐẾN VỚI BOT TÂN DẬU!\n━━━━━━━━━━━━━━━━━━━━\n📝 Bước 1/4: Họ tên\n💡 Nhập họ tên đầy đủ của bạn\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập họ tên:`)
    }

    /**
     * Send already registered message
     */
    private async sendAlreadyRegisteredMessage(user: any): Promise<void> {
        await sendMessage(user.facebook_id, 
            `✅ Bạn đã đăng ký rồi!\n━━━━━━━━━━━━━━━━━━━━\n🎯 Sử dụng các tính năng:\n• Đăng tin bán hàng\n• Tìm kiếm sản phẩm\n• Cộng đồng Tân Dậu\n• Thanh toán online\n━━━━━━━━━━━━━━━━━━━━\nChọn tính năng bạn muốn sử dụng:`)
    }

    /**
     * Send location buttons
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
     * Handle birthday verification - EXACT COPY FROM OLD LOGIC
     */
    private async handleBirthdayVerification(user: any, answer: string): Promise<void> {
        try {
            console.log('🎂 Processing birthday verification:', answer, 'for user:', user.facebook_id)

            if (answer === 'YES') {
                // User confirmed they were born in 1981 - complete registration
                const { data: sessionData } = await supabaseAdmin
                    .from('bot_sessions')
                    .select('data')
                    .eq('facebook_id', user.facebook_id)
                    .single()

                if (sessionData && sessionData.data) {
                    await this.completeRegistration(user, sessionData.data)
                } else {
                    await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                }
            } else if (answer === 'NO') {
                // User is not born in 1981 - cannot register
                await supabaseAdmin
                    .from('bot_sessions')
                    .delete()
                    .eq('facebook_id', user.facebook_id)

                await sendMessage(user.facebook_id, '❌ XIN LỖI')
                await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
                await sendMessage(user.facebook_id, '😔 Bot Tân Dậu - Hỗ Trợ Chéo chỉ dành riêng cho những người con Tân Dậu sinh năm 1981.')
                await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
                await sendMessage(user.facebook_id, '💡 Nếu bạn sinh năm khác, bạn có thể:')
                await sendMessage(user.facebook_id, '• Liên hệ Đinh Khánh Tùng để được tư vấn')
                await sendMessage(user.facebook_id, '• Tham gia các cộng đồng khác phù hợp hơn')
                await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
                await sendMessage(user.facebook_id, '📞 Liên hệ: 0982581222')
                await sendMessage(user.facebook_id, '📧 Email: dinhkhanhtung@outlook.com')
            } else {
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            }

        } catch (error) {
            console.error('❌ Birthday verification error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}
