import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
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
     * Handle step input
     */
    async handleStep(user: any, text: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handleStep', { text, session })

            // If no session, start registration
            if (!session) {
                await this.startRegistration(user)
                return
            }

            // Get current step
            const currentStep = session.step || 0
            console.log(`🔍 Current step: ${currentStep}`)

            // Route to appropriate step handler
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
                    console.log(`❌ Unknown step: ${currentStep}`)
                    await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            await this.handleError(user, error, 'handleStep')
        }
    }

    /**
     * Handle postback events
     */
    async handlePostback(user: any, payload: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handlePostback', { payload, session })

            if (payload.startsWith('LOCATION_')) {
                await this.handleLocationPostback(user, payload, session)
            } else if (payload === 'CANCEL_REGISTRATION') {
                await this.cancelRegistration(user)
            }

        } catch (error) {
            await this.handleError(user, error, 'handlePostback')
        }
    }

    /**
     * Start registration process
     */
    private async startRegistration(user: any): Promise<void> {
        try {
            console.log(`🔄 Starting registration for user: ${user.facebook_id}`)

            // Check if user already registered
            if (user.status === 'registered' || user.status === 'trial') {
                await this.sendAlreadyRegisteredMessage(user)
                return
            }

            // Create new session
            await SessionManager.createSession(user.facebook_id, 'registration', 0, {
                skip_welcome: true
            })

            // Send welcome message
            await this.sendRegistrationWelcome(user)

        } catch (error) {
            await this.handleError(user, error, 'startRegistration')
        }
    }

    /**
     * Handle name input step
     */
    private async handleNameStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📝 Processing name step for user: ${user.facebook_id}`)

            // Validate name
            if (!this.validateInput(text, 2)) {
                await sendMessage(user.facebook_id, '❌ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ!')
                return
            }

            // Update session with name
            await SessionManager.updateSession(user.facebook_id, {
                step: 1,
                data: { name: text.trim() }
            })

            // Send phone prompt
            await sendMessage(user.facebook_id, 
                `✅ Họ tên: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📱 Bước 2/4: Số điện thoại\n💡 Nhập số điện thoại để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập số điện thoại:`)

            console.log('✅ Name step completed, moved to phone step')

        } catch (error) {
            await this.handleError(user, error, 'handleNameStep')
        }
    }

    /**
     * Handle phone input step
     */
    private async handlePhoneStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📱 Processing phone step for user: ${user.facebook_id}`)

            // Clean phone number
            const phone = text.replace(/\D/g, '').trim()
            console.log(`[DEBUG] Cleaned phone number: ${phone}`)

            // Validate phone
            if (phone.length < 10 || phone.length > 11) {
                console.log(`[DEBUG] Phone validation failed: ${phone.length}`)
                await sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.')
                return
            }

            // Check if phone exists
            console.log('[DEBUG] Checking if phone exists in database...')
            const { supabaseAdmin } = await import('../../supabase')
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('facebook_id')
                .eq('phone', phone)
                .single()

            if (existingUser && existingUser.facebook_id !== user.facebook_id) {
                console.log(`[DEBUG] Phone already exists for another user: ${existingUser.facebook_id}`)
                await sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng!')
                return
            }

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with phone
            await SessionManager.updateSession(user.facebook_id, {
                step: 2,
                data: {
                    ...currentData,
                    phone: phone
                }
            })

            // Send location prompt
            await sendMessage(user.facebook_id, 
                `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/4: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━`)

            // Send location buttons
            console.log('[DEBUG] Sending location buttons...')
            await this.sendLocationButtons(user.facebook_id)

            console.log('✅ Phone step completed, moved to location step')

        } catch (error) {
            await this.handleError(user, error, 'handlePhoneStep')
        }
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
            await this.completeRegistration(user)

        } catch (error) {
            await this.handleError(user, error, 'handleBirthdayStep')
        }
    }

    /**
     * Handle location postback
     */
    private async handleLocationPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`📍 Processing location postback for user: ${user.facebook_id}`)

            const location = payload.replace('LOCATION_', '')
            console.log(`[DEBUG] Selected location: ${location}`)

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with location
            await SessionManager.updateSession(user.facebook_id, {
                step: 3,
                data: {
                    ...currentData,
                    location: location
                }
            })

            // Send birthday prompt
            await sendMessage(user.facebook_id, 
                `✅ Tỉnh/TP: ${location}\n━━━━━━━━━━━━━━━━━━━━\n🎂 Bước 4/4: Ngày sinh\n💡 Nhập ngày sinh để xác nhận tuổi Tân Dậu\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập ngày sinh (DD/MM/YYYY):`)

            console.log('✅ Location step completed, moved to birthday step')

        } catch (error) {
            await this.handleError(user, error, 'handleLocationPostback')
        }
    }

    /**
     * Complete registration process
     */
    private async completeRegistration(user: any): Promise<void> {
        try {
            console.log(`🎉 Completing registration for user: ${user.facebook_id}`)

            // Get session data
            const sessionData = await SessionManager.getSessionData(user.facebook_id)
            const { name, phone, location, birthday } = sessionData

            // Create user in database
            const { supabaseAdmin } = await import('../../supabase')
            const { error: userError } = await supabaseAdmin
                .from('users')
                .upsert({
                    facebook_id: user.facebook_id,
                    name: name,
                    phone: phone,
                    location: location,
                    birthday: birthday,
                    status: 'trial',
                    trial_start: new Date().toISOString(),
                    trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (userError) {
                console.error('❌ User creation error:', userError)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

            // Send success message
            await sendMessage(user.facebook_id, 
                `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${name}\n✅ SĐT: ${phone}\n✅ Tỉnh/TP: ${location}\n✅ Ngày sinh: ${birthday}\n━━━━━━━━━━━━━━━━━━━━\n🎁 Bạn được dùng thử 7 ngày miễn phí!\n💡 Sử dụng các tính năng của bot ngay bây giờ!`)

            console.log('✅ Registration completed successfully')

        } catch (error) {
            await this.handleError(user, error, 'completeRegistration')
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
        const locations = [
            'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng',
            'Cần Thơ', 'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang',
            'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre',
            'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận',
            'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
            'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
            'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
            'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa',
            'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
            'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
            'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ',
            'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi',
            'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La',
            'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
            'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
            'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
        ]

        const quickReplies = locations.map(location => 
            createQuickReply(location, `LOCATION_${location}`)
        )

        await sendQuickReply(facebookId, 'Chọn tỉnh/thành phố:', quickReplies)
    }
}
