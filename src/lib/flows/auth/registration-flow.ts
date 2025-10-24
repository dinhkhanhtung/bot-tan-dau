import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
import { UnifiedUserStateManager } from '../../core/unified-user-state-manager'
import { UserState, UserType } from '../../../types'
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
        // Handle null user case
        if (!user || !user.status) {
            return false
        }

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
                case 4:
                    await this.handleReferralStep(user, text)
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
            } else if (payload === 'LOC_SHOW_MORE') {
                await this.showMoreLocations(user)
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
     * Start registration process - OPTIMIZED WITH PRICING INFO
     */
    private async startRegistration(user: any): Promise<void> {
        try {
            console.log(`🔄 Starting registration for user: ${user.facebook_id}`)

            // Check if user already registered (including trial users)
            if (user.status === 'registered' || user.status === 'trial' || user.status === 'active') {
                await this.sendAlreadyRegisteredMessage(user)
                return
            }

            // Clear any existing session first
            await SessionManager.deleteSession(user.facebook_id)

            // Create new session
            await SessionManager.createSession(user.facebook_id, 'registration', 0, {
                inactivity_timeout: Date.now() + (5 * 60 * 1000) // 5 minutes timeout
            })

            // Update user state to prevent welcome service interference
            await UnifiedUserStateManager.updateUserState(user.facebook_id, UserState.USING_BOT)

            // Send pricing and benefits info first
            await this.sendRegistrationPricingInfo(user)

        } catch (error) {
            await this.handleError(user, error, 'startRegistration')
        }
    }

    /**
     * Send pricing and benefits information with smooth flow
     */
    private async sendRegistrationPricingInfo(user: any): Promise<void> {
        try {
            // Unified message with referral info
            await sendMessage(user.facebook_id, 'Chào mừng bạn tham gia Bot Tân Dậu - Hỗ Trợ Chéo\n\n🎁 QUYỀN LỢI: Trial 3 ngày miễn phí\n💰 Chỉ với 3,000đ mỗi ngày bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu\n💳 Phí duy trì: 3,000đ/ngày\n📅 Gói tối thiểu: 3 ngày = 9.000 ₫\n\n🌟 CÓ MÃ GIỚI THIỆU? Nhận thêm 7 ngày miễn phí!\n\nTân Dậu Việt - Cùng nhau kết nối - cùng nhau thịnh vượng\n\n🚀 Bước 1: Xác nhận thông tin Facebook của bạn:')

        } catch (error) {
            console.error('Error sending registration pricing info:', error)
            // Fallback to simple message
            await sendMessage(user.facebook_id, '🚀 Bước 1: Xác nhận thông tin Facebook của bạn:')
        }
    }

    /**
     * Show more locations (second page)
     */
    private async showMoreLocations(user: any): Promise<void> {
        try {
            console.log('[DEBUG] Showing more locations for user:', user.facebook_id)

            // Complete list of Vietnamese provinces + overseas option
            const locations = [
                // Central Vietnam (Miền Trung) - continued
                '🏭 QUẢNG BÌNH', '🏔️ QUẢNG TRỊ', '🏘️ THỪA THIÊN HUẾ',

                // Southern Vietnam (Miền Nam) - continued
                '🏢 TP.HCM', '🏘️ ĐỒNG NAI', '🏭 BÌNH DƯƠNG', '🏔️ BÌNH PHƯỚC', '🏘️ TÂY NINH',
                '🏭 BÀ RỊA - VŨNG TÀU', '🏖️ CẦN THƠ', '🏘️ AN GIANG', '🏔️ KIÊN GIANG', '🏭 HẬU GIANG',
                '🏘️ SÓC TRĂNG', '🏔️ BẠC LIÊU', '🏭 CÀ MAU', '🏘️ ĐỒNG THÁP', '🏔️ TIỀN GIANG',
                '🏘️ BẾN TRE', '🏭 TRÀ VINH', '🏔️ VĨNH LONG', '🏘️ LONG AN', '🏭 TIỀN GIANG',

                // Special Administrative Regions
                '🌊 QUẦN ĐẢO TRƯỜNG SA', '🏝️ QUẦN ĐẢO HOÀNG SA',

                // Overseas option
                '🌍 NƯỚC NGOÀI'
            ]

            const buttons = locations.map(location => {
                // Extract location name without emoji (everything after the first space)
                const locationName = location.substring(location.indexOf(' ') + 1)
                const locationCode = locationName.replace(/\s+/g, '_')
                const payload = `LOC_${locationCode}`
                return createQuickReply(location, payload)
            })

            await sendQuickReply(user.facebook_id, '📍 Bước 3/5: Chọn tỉnh/thành phố nơi bạn sinh sống (Trang 2/2 - Các tỉnh còn lại):', buttons)
            console.log('[DEBUG] More location buttons sent successfully')

        } catch (error) {
            await this.handleError(user, error, 'showMoreLocations')
        }
    }

    /**
     * Delay helper for smooth message flow
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
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
        await sendMessage(user.facebook_id, `✅ Họ tên: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📱 Bước 2/5: Số điện thoại\n💡 Nhập số điện thoại để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập số điện thoại:`)

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

        // Send location buttons (includes the prompt message)
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

            const locationCode = payload.replace('LOC_', '')
            // Convert location code back to proper location name
            const location = locationCode.replace(/_/g, ' ')
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
            await sendMessage(user.facebook_id, `✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n🎂 Bước 4/5: Xác nhận sinh năm\n💡 Chỉ dành cho Tân Dậu (sinh năm 1981)\n━━━━━━━━━━━━━━━━━━━━`)
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

            // Calculate trial days based on referral
            const hasReferral = data.referral_code && data.referral_code !== null
            const trialDays = hasReferral ? 10 : 3 // 3 days base + 7 days bonus if referred
            const trialHours = trialDays * 24 * 60 * 60 * 1000

            console.log(`📅 Trial calculation: ${trialDays} days (${hasReferral ? 'with referral bonus' : 'standard'})`)

            // Check if user already exists
            const { data: existingUser, error: checkError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('facebook_id', user.facebook_id)
                .single()

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ Error checking existing user:', checkError)
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                return
            }

            // Prepare user data
            const userData = {
                name: data.name,
                phone: data.phone,
                location: data.location,
                birthday: data.birthday || '01/01', // Default to Jan 1st if not provided
                status: 'trial',
                membership_expires_at: new Date(Date.now() + trialHours).toISOString(),
                referral_code: `TD1981-${user.facebook_id.slice(-6)}`,
                updated_at: new Date().toISOString()
            }

            if (existingUser) {
                // User already exists, update their information
                console.log('📝 User already exists, updating information:', existingUser.id)

                const { error: updateError } = await supabaseAdmin
                    .from('users')
                    .update(userData)
                    .eq('facebook_id', user.facebook_id)

                if (updateError) {
                    console.error('❌ Database update error:', updateError)
                    await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                    return
                }
            } else {
                // User doesn't exist, create new record
                console.log('🆕 Creating new user record')

                const { error: insertError } = await supabaseAdmin
                    .from('users')
                    .insert({
                        ...userData,
                        id: generateId(),
                        facebook_id: user.facebook_id,
                        created_at: new Date().toISOString()
                    })

                if (insertError) {
                    console.error('❌ Database insert error:', insertError)
                    await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                    return
                }
            }

            // Save referral information if exists
            if (hasReferral) {
                try {
                    // Get referrer info
                    const { data: referrer } = await supabaseAdmin
                        .from('users')
                        .select('id')
                        .eq('referral_code', data.referral_code)
                        .single()

                    if (referrer) {
                        // Create referral record
                        await supabaseAdmin
                            .from('referrals')
                            .insert({
                                id: generateId(),
                                referrer_id: referrer.id,
                                referred_id: existingUser?.id || generateId(), // Will be updated after user creation
                                status: 'completed',
                                reward_amount: 0, // No monetary reward, just trial extension
                                created_at: new Date().toISOString(),
                                completed_at: new Date().toISOString()
                            })
                    }
                } catch (referralError) {
                    console.error('❌ Error saving referral:', referralError)
                    // Don't fail registration if referral save fails
                }
            }

            // Clear session
            await supabaseAdmin
                .from('bot_sessions')
                .delete()
                .eq('facebook_id', user.facebook_id)

            // Send success message with correct trial days
            const trialMessage = hasReferral
                ? `🌟 Bạn được dùng thử miễn phí ${trialDays} ngày (có mã giới thiệu)!`
                : `🎁 Bạn được dùng thử miễn phí ${trialDays} ngày!`

            await sendMessage(user.facebook_id, `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${data.name}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n━━━━━━━━━━━━━━━━━━━━\n${trialMessage}\n🚀 Chúc bạn sử dụng bot vui vẻ!`)

            // Add delay for better UX
            await this.delay(1500)

            // Send navigation buttons for new registered user
            await sendQuickReply(user.facebook_id, '🎯 Bây giờ bạn có thể sử dụng tất cả tính năng của bot:', [
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('📝 ĐĂNG BÁN HÀNG', 'LISTING'),
                createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
                createQuickReply('ℹ️ THÔNG TIN', 'INFO')
            ])

            // Update user state to USING_BOT since they're now registered
            await UnifiedUserStateManager.updateUserState(user.facebook_id, UserState.USING_BOT)

            // Also update user type to reflect registered status
            await UnifiedUserStateManager.setUserType(user.facebook_id, UserType.REGISTERED_USER)

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
     * Send already registered message
     */
    private async sendAlreadyRegisteredMessage(user: any): Promise<void> {
        await sendMessage(user.facebook_id,
            `✅ Bạn đã đăng ký rồi!\n━━━━━━━━━━━━━━━━━━━━\n🎯 Sử dụng các tính năng:\n• Đăng tin bán hàng\n• Tìm kiếm sản phẩm\n• Cộng đồng Tân Dậu\n• Thanh toán online\n━━━━━━━━━━━━━━━━━━━━\nChọn tính năng bạn muốn sử dụng:`)
    }

    /**
     * Send location buttons - COMPLETE VIETNAMESE PROVINCES LIST
     */
    private async sendLocationButtons(facebookId: string): Promise<void> {
        console.log('[DEBUG] sendLocationButtons: Creating location buttons for user:', facebookId)

        // Get current session data to include phone number in the message
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', facebookId)
            .single()

        const currentData = sessionData?.data || {}
        const phone = currentData.phone || 'Chưa cập nhật'

        // Complete list of Vietnamese provinces + overseas option
        const locations = [
            // Northern Vietnam (Miền Bắc)
            '🏠 HÀ NỘI', '🏭 HẢI PHÒNG', '🏔️ QUẢNG NINH', '🌊 NAM ĐỊNH', '🏘️ THÁI BÌNH',
            '🌾 NINH BÌNH', '🏛️ HẢI DƯƠNG', '🏭 HƯNG YÊN', '🌳 BẮC NINH', '🏔️ BẮC GIANG',
            '🏘️ BẮC KẠN', '🌲 CAO BẰNG', '🏔️ LẠNG SƠN', '🌲 THÁI NGUYÊN', '🏭 PHÚ THỌ',
            '🏘️ TUYÊN QUANG', '🌲 HÀ GIANG', '🏔️ LAO CAI', '🌊 YÊN BÁI', '🏘️ ĐIỆN BIÊN',
            '🏭 HÒA BÌNH', '🌲 SƠN LA', '🏔️ LAI CHÂU', '🏘️ VĨNH PHÚC',

            // Central Vietnam (Miền Trung)
            '🏛️ THỪA THIÊN HUẾ', '🏖️ ĐÀ NẴNG', '🏔️ QUẢNG NAM', '🏘️ QUẢNG NGÃI', '🏭 BÌNH ĐỊNH',
            '🏔️ PHÚ YÊN', '🏘️ KHÁNH HÒA', '🏖️ NINH THUẬN', '🏜️ BÌNH THUẬN', '🏔️ KON TUM',
            '🏘️ GIA LAI', '🏭 ĐẮK LẮK', '🏔️ ĐẮK NÔNG', '🏘️ LÂM ĐỒNG', '🏭 QUẢNG BÌNH',
            '🏔️ QUẢNG TRỊ', '🏘️ THỪA THIÊN HUẾ', '🏔️ QUẢNG NAM',

            // Southern Vietnam (Miền Nam)
            '🏢 TP.HCM', '🏘️ ĐỒNG NAI', '🏭 BÌNH DƯƠNG', '🏔️ BÌNH PHƯỚC', '🏘️ TÂY NINH',
            '🏭 BÀ RỊA - VŨNG TÀU', '🏖️ CẦN THƠ', '🏘️ AN GIANG', '🏔️ KIÊN GIANG', '🏭 HẬU GIANG',
            '🏘️ SÓC TRĂNG', '🏔️ BẠC LIÊU', '🏭 CÀ MAU', '🏘️ ĐỒNG THÁP', '🏔️ TIỀN GIANG',
            '🏘️ BẾN TRE', '🏭 TRÀ VINH', '🏔️ VĨNH LONG', '🏘️ LONG AN', '🏭 TIỀN GIANG',

            // Special Administrative Regions
            '🌊 QUẦN ĐẢO TRƯỜNG SA', '🏝️ QUẦN ĐẢO HOÀNG SA',

            // Overseas option
            '🌍 NƯỚC NGOÀI'
        ]

        console.log('[DEBUG] Location options count:', locations.length)

        // Split into multiple pages if needed (Facebook allows max 11 buttons per message)
        const buttonsPerPage = 10
        const totalPages = Math.ceil(locations.length / buttonsPerPage)

        if (totalPages === 1) {
            // Single page - send all buttons
            const buttons = locations.map(location => {
                // Extract location name without emoji (everything after the first space)
                const locationName = location.substring(location.indexOf(' ') + 1)
                const locationCode = locationName.replace(/\s+/g, '_')
                const payload = `LOC_${locationCode}`
                return createQuickReply(location, payload)
            })

            await sendQuickReply(facebookId, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/5: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/5: Chọn tỉnh/thành phố nơi bạn sinh sống (Tất cả tỉnh thành Việt Nam + Nước ngoài):`, buttons)
        } else {
            // Multiple pages - send first page with "Xem thêm" option
            const firstPageLocations = locations.slice(0, buttonsPerPage - 1) // Reserve 1 slot for "Xem thêm"
            const buttons = firstPageLocations.map(location => {
                // Extract location name without emoji (everything after the first space)
                const locationName = location.substring(location.indexOf(' ') + 1)
                const locationCode = locationName.replace(/\s+/g, '_')
                const payload = `LOC_${locationCode}`
                return createQuickReply(location, payload)
            })

            // Add "Xem thêm" button
            buttons.push(createQuickReply('📋 XEM THÊM TỈNH THÀNH', 'LOC_SHOW_MORE'))

            await sendQuickReply(facebookId, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/5: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/5: Chọn tỉnh/thành phố nơi bạn sinh sống (Trang 1/${totalPages}):`, buttons)
        }

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
                // User confirmed they were born in 1981 - go to referral step
                const { data: sessionData } = await supabaseAdmin
                    .from('bot_sessions')
                    .select('data')
                    .eq('facebook_id', user.facebook_id)
                    .single()

                if (sessionData && sessionData.data) {
                    // Update session with birthday and move to referral step
                    await SessionManager.updateSession(user.facebook_id, {
                        step: 4,
                        data: {
                            ...sessionData.data,
                            birthday: '1981' // Set default birthday since they confirmed
                        }
                    })

                    // Send referral prompt
                    await sendMessage(user.facebook_id, `✅ Xác nhận sinh năm 1981\n━━━━━━━━━━━━━━━━━━━━\n🌟 Bước 5/5: Mã giới thiệu (Tùy chọn)\n💡 Có mã giới thiệu? Nhận thêm 7 ngày miễn phí!\n━━━━━━━━━━━━━━━━━━━━\n📝 Nhập mã giới thiệu hoặc gõ "Bỏ qua":`)
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

    /**
     * Handle referral code step
     */
    private async handleReferralStep(user: any, text: string): Promise<void> {
        try {
            console.log(`🌟 Processing referral step for user: ${user.facebook_id}`)

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Check if user wants to skip
            if (text.toLowerCase().trim() === 'bỏ qua' || text.toLowerCase().trim() === 'bo qua') {
                // Complete registration without referral
                await this.completeRegistration(user, {
                    ...currentData,
                    referral_code: null
                })
                return
            }

            // Validate referral code format (TD1981-XXXXXX)
            const referralRegex = /^TD1981-\d{6}$/
            if (!referralRegex.test(text.trim())) {
                await sendMessage(user.facebook_id, '❌ Mã giới thiệu không hợp lệ! Mã phải có định dạng TD1981-XXXXXX\n📝 Hoặc gõ "Bỏ qua" để tiếp tục:')
                return
            }

            // Check if referral code exists
            const { data: referrer } = await supabaseAdmin
                .from('users')
                .select('facebook_id')
                .eq('referral_code', text.trim())
                .single()

            if (!referrer) {
                await sendMessage(user.facebook_id, '❌ Mã giới thiệu không tồn tại!\n📝 Vui lòng kiểm tra lại hoặc gõ "Bỏ qua" để tiếp tục:')
                return
            }

            // Check if user is trying to use their own code
            if (referrer.facebook_id === user.facebook_id) {
                await sendMessage(user.facebook_id, '❌ Không thể sử dụng mã giới thiệu của chính mình!\n📝 Vui lòng nhập mã khác hoặc gõ "Bỏ qua" để tiếp tục:')
                return
            }

            // Update session with referral code
            await SessionManager.updateSession(user.facebook_id, {
                step: 5,
                data: {
                    ...currentData,
                    referral_code: text.trim()
                }
            })

            // Complete registration with referral bonus
            await this.completeRegistration(user, {
                ...currentData,
                referral_code: text.trim()
            })

        } catch (error) {
            await this.handleError(user, error, 'handleReferralStep')
        }
    }
}
