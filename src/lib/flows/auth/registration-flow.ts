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
import { generateId } from '../../generators'

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
     * Handle message input - UPDATED FOR NEW BUTTON-BASED FLOW
     */
    async handleMessage(user: any, text: string, session: any): Promise<void> {
        try {
            console.log('🔍 Processing step for user:', user.facebook_id)
            console.log('[DEBUG] Session:', JSON.stringify(session, null, 2))
            console.log('[DEBUG] Input:', text)

            // Get current step - UPDATED FOR NEW FLOW
            const currentStep = session?.step || 0
            console.log('🔍 Current step:', currentStep)

            // Handle each step - NEW BUTTON-BASED LOGIC
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
                    await this.handleMonthStep(user, text)
                    break
                case 4:
                    await this.handleDayStep(user, text)
                    break
                case 5:
                    await this.handleYearConfirmationStep(user, text)
                    break
                case 6:
                    await this.handleEmailStep(user, text)
                    break
                case 7:
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
     * Handle postback events - UPDATED FOR NEW BUTTON-BASED FLOW
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
            } else if (payload.startsWith('MONTH_')) {
                await this.handleMonthPostback(user, payload, session)
            } else if (payload.startsWith('DAY_')) {
                await this.handleDayPostback(user, payload, session)
            } else if (payload === 'DAY_PAGE_PREV') {
                await this.handleDayPageNavigation(user, 'prev', session)
            } else if (payload === 'DAY_PAGE_NEXT') {
                await this.handleDayPageNavigation(user, 'next', session)
            } else if (payload === 'BIRTH_YEAR_YES') {
                await this.handleYearConfirmation(user, 'YES')
            } else if (payload === 'BIRTH_YEAR_NO') {
                await this.handleYearConfirmation(user, 'NO')
            } else if (payload === 'SKIP_EMAIL') {
                await this.handleEmailSkip(user)
            } else if (payload === 'SKIP_REFERRAL') {
                await this.handleReferralSkip(user)
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
     * Send pricing and benefits information with smooth flow - FIXED FACEBOOK API
     */
    private async sendRegistrationPricingInfo(user: any): Promise<void> {
        try {
            // Get Facebook name with proper error handling
            let displayName = 'bạn'
            try {
            const { getFacebookDisplayName } = await import('../../facebook-utils')
                const facebookName = await getFacebookDisplayName(user.facebook_id)
                if (facebookName && facebookName.trim() !== '') {
                    displayName = facebookName
                } else {
                    console.log('⚠️ Could not get Facebook name, using default "bạn"')
                }
            } catch (error) {
                console.warn('Facebook API failed for pricing info, using default "bạn":', error instanceof Error ? error.message : String(error))
                // Continue with default name - don't fail the flow
            }

            // Unified message with referral info
            await sendMessage(user.facebook_id, `Chào mừng ${displayName} tham gia Bot Tân Dậu - Hỗ Trợ Chéo\n\n🎁 QUYỀN LỢI: Trial 3 ngày miễn phí\n💰 Chỉ với 3,000đ mỗi ngày bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu\n💳 Phí duy trì: 3,000đ/ngày\n📅 Gói tối thiểu: 3 ngày = 9.000 ₫\n\n🌟 CÓ MÃ GIỚI THIỆU? Nhận thêm 7 ngày miễn phí!\n\nTân Dậu Việt - Cùng nhau kết nối - cùng nhau thịnh vượng\n\n🚀 Bước 1: Xác nhận thông tin Facebook của bạn:`)

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

            await sendQuickReply(user.facebook_id, '📍 Bước 3/7: Chọn tỉnh/thành phố nơi bạn sinh sống (Trang 2/2 - Các tỉnh còn lại):', buttons)
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
     * Handle name input step - Skip since we get name from Facebook
     */
    private async handleNameStep(user: any, text: string): Promise<void> {
        console.log('📝 Processing name step for user:', user.facebook_id)

        // Get Facebook name first
        let displayName = 'bạn'
        try {
            const { getFacebookDisplayName } = await import('../../facebook-utils')
            const facebookName = await getFacebookDisplayName(user.facebook_id)
            if (facebookName) {
                displayName = facebookName
                console.log('✅ Got Facebook name for registration:', displayName)
            } else {
                console.log('⚠️ Could not get Facebook name, using default "bạn"')
            }
        } catch (error) {
            console.warn('⚠️ Could not get Facebook name, using default "bạn"', error instanceof Error ? error.message : String(error))
        }

        // Update session with Facebook name (or fallback)
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 1,
                current_step: 1,
                data: { name: displayName },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send phone prompt with Facebook name
        await sendMessage(user.facebook_id, `✅ Họ tên: ${displayName}\n━━━━━━━━━━━━━━━━━━━━\n📱 Bước 2/7: Số điện thoại\n💡 Nhập số điện thoại để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập số điện thoại:`)

        console.log('✅ Name step completed with Facebook name, moved to phone step')
    }

    /**
     * Handle phone input step - UPDATED FOR 9-DIGIT BUTTON SELECTION
     */
    private async handlePhoneStep(user: any, text: string): Promise<void> {
        console.log('📱 Processing phone step for user:', user.facebook_id)

        // Check if user is selecting digits via buttons
        if (text.length === 1 && /^\d$/.test(text)) {
            await this.handlePhoneDigitSelection(user, text)
            return
        }

        // Handle full phone number input (fallback)
        const phone = text.replace(/\D/g, '').trim()
        console.log('[DEBUG] Cleaned phone number:', phone)

        // Validate phone - UPDATED for 9 digits minimum
        if (phone.length !== 9) {
            console.log('[DEBUG] Phone validation failed:', phone.length)
            await sendMessage(user.facebook_id, '❌ Số điện thoại không hợp lệ! Vui lòng nhập CHÍNH XÁC 9 chữ số.')
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
     * Handle phone digit selection via buttons
     */
    private async handlePhoneDigitSelection(user: any, digit: string): Promise<void> {
        console.log('🔢 Processing phone digit selection:', digit, 'for user:', user.facebook_id)

        // Get current session data
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}
        const currentPhone = currentData.phone_digits || ''

        // Add digit to current phone number
        const newPhone = currentPhone + digit

        // Update session with new phone digits
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                data: {
                    ...currentData,
                    phone_digits: newPhone
                },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // If we have 9 digits, complete phone step
        if (newPhone.length >= 9) {
            const fullPhone = newPhone.length >= 10 ? newPhone : newPhone // Allow 9-11 digits

            // Check if phone exists
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('facebook_id')
                .eq('phone', fullPhone)
                .single()

            if (existingUser && existingUser.facebook_id !== user.facebook_id) {
                await sendMessage(user.facebook_id, '❌ Số điện thoại đã được sử dụng!')
                await this.sendPhoneDigitButtons(user.facebook_id, newPhone)
                return
            }

            // Update session with complete phone
            await supabaseAdmin
                .from('bot_sessions')
                .update({
                    step: 2,
                    current_step: 2,
                    data: {
                        ...currentData,
                        phone: fullPhone,
                        phone_digits: newPhone
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', user.facebook_id)

            // Send location buttons
            await this.sendLocationButtons(user.facebook_id)
            console.log('✅ Phone step completed with', fullPhone.length, 'digits, moved to location step')
        } else {
            // Send next digit selection
            await this.sendPhoneDigitButtons(user.facebook_id, newPhone)
        }
    }

    /**
     * Send phone digit selection buttons
     */
    private async sendPhoneDigitButtons(facebookId: string, currentDigits: string = ''): Promise<void> {
        const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        const buttons = digits.map(digit => createQuickReply(digit, digit))

        const remainingDigits = 9 - currentDigits.length
        const targetDigits = 9
        await sendQuickReply(facebookId,
            `📱 Bước 2/7: Số điện thoại\n💡 Chọn ${remainingDigits} chữ số tiếp theo (cần ${targetDigits} chữ số)\n━━━━━━━━━━━━━━━━━━━━\nSố hiện tại: ${currentDigits}\n━━━━━━━━━━━━━━━━━━━━`,
            buttons
        )
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
     * Handle month selection step - NEW BUTTON-BASED
     */
    private async handleMonthStep(user: any, text: string): Promise<void> {
        console.log('📅 Processing month step for user:', user.facebook_id)

        // Check if user is selecting month via buttons
        if (text.length === 1 && /^[0-9]$/.test(text)) {
            const month = parseInt(text)
            if (month >= 1 && month <= 12) {
                await this.handleMonthSelection(user, month)
                return
            }
        }

        // Show month selection buttons
        await this.sendMonthButtons(user.facebook_id)
    }

    /**
     * Handle month selection
     */
    private async handleMonthSelection(user: any, month: number): Promise<void> {
        console.log('📅 Selected month:', month, 'for user:', user.facebook_id)

        // Get current session data
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}

        // Update session with selected month
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 4,
                current_step: 4,
                data: {
                    ...currentData,
                    birth_month: month,
                    day_page: 1 // Initialize pagination state
                },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send day selection buttons
        await this.sendDayButtons(user.facebook_id, month)
        console.log('✅ Month step completed, moved to day step')
    }

    /**
     * Handle day selection step - NEW BUTTON-BASED
     */
    private async handleDayStep(user: any, text: string): Promise<void> {
        console.log('📅 Processing day step for user:', user.facebook_id)

        // Check if user is selecting day via buttons
        if (text.length <= 2 && /^[0-9]+$/.test(text)) {
            const day = parseInt(text)
            if (day >= 1 && day <= 31) {
                await this.handleDaySelection(user, day)
                return
            }
        }

        // Get current session data to check if we have a month selected
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}
        const birthMonth = currentData.birth_month

        if (!birthMonth) {
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại từ đầu!')
            return
        }

        // Initialize pagination state if not exists
        if (!currentData.day_page) {
            await supabaseAdmin
                .from('bot_sessions')
                .update({
                    data: {
                        ...currentData,
                        day_page: 1
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', user.facebook_id)
        }

        // Show day selection buttons
        await this.sendDayButtons(user.facebook_id, birthMonth)
    }

    /**
     * Handle day selection
     */
    private async handleDaySelection(user: any, day: number): Promise<void> {
        console.log('📅 Selected day:', day, 'for user:', user.facebook_id)

        // Get current session data
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}

        // Update session with selected day and month
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 5,
                current_step: 5,
                data: {
                    ...currentData,
                    birth_day: day,
                    birthday: `${day.toString().padStart(2, '0')}/${currentData.birth_month.toString().padStart(2, '0')}/1981`
                },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send year confirmation buttons
        await this.sendYearConfirmationButtons(user.facebook_id)
        console.log('✅ Day step completed, moved to year confirmation step')
    }

    /**
     * Handle year confirmation step - NEW BUTTON-BASED
     */
    private async handleYearConfirmationStep(user: any, text: string): Promise<void> {
        console.log('🎂 Processing year confirmation step for user:', user.facebook_id)

        // Show year confirmation buttons
        await this.sendYearConfirmationButtons(user.facebook_id)
    }

    /**
     * Handle email step - NEW OPTIONAL WITH SKIP
     */
    private async handleEmailStep(user: any, text: string): Promise<void> {
        console.log('📧 Processing email step for user:', user.facebook_id)

        // Check if user wants to skip
        if (text.toLowerCase().trim() === 'bỏ qua' || text.toLowerCase().trim() === 'bo qua') {
            await this.handleEmailSkip(user)
            return
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(text.trim())) {
            await sendMessage(user.facebook_id, '❌ Email không hợp lệ! Vui lòng nhập đúng định dạng email hoặc gõ "Bỏ qua":')
            return
        }

        // Get current session data
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}

        // Update session with email
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 7,
                current_step: 7,
                data: {
                    ...currentData,
                    email: text.trim()
                },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send referral prompt
        await this.sendReferralPrompt(user.facebook_id)
        console.log('✅ Email step completed, moved to referral step')
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

            // Send month selection prompt
            await sendMessage(user.facebook_id, `✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n📅 Bước 4/7: Chọn tháng sinh\n💡 Chọn tháng bạn được sinh ra\n━━━━━━━━━━━━━━━━━━━━`)
            await this.sendMonthButtons(user.facebook_id)

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

            // Get Facebook display name first
            let displayName = data.name || 'bạn'
            try {
                const { getFacebookDisplayName } = await import('../../facebook-utils')
                const facebookName = await getFacebookDisplayName(user.facebook_id)
                if (facebookName) {
                    displayName = facebookName
                    console.log('✅ Got Facebook name:', displayName)
                } else {
                    console.log('⚠️ Could not get Facebook name, using provided name:', displayName)
                }
            } catch (error) {
                console.warn('❌ Error getting Facebook display name:', error instanceof Error ? error.message : String(error))
                // Continue with provided name
            }

            // Validate required data
            if (!displayName || !data.phone || !data.location) {
                console.error('❌ Missing registration data:', { displayName, phone: data.phone, location: data.location })
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
                name: displayName,
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

            await sendMessage(user.facebook_id, `🎉 ĐĂNG KÝ THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Họ tên: ${displayName}\n✅ SĐT: ${data.phone}\n✅ Địa điểm: ${data.location}\n━━━━━━━━━━━━━━━━━━━━\n${trialMessage}\n🚀 Chúc bạn sử dụng bot vui vẻ!`)

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

            await sendQuickReply(facebookId, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/7: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/7: Chọn tỉnh/thành phố nơi bạn sinh sống (Tất cả tỉnh thành Việt Nam + Nước ngoài):`, buttons)
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

            await sendQuickReply(facebookId, `✅ SĐT: ${phone}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/7: Chọn tỉnh/thành phố\n💡 Chọn nơi bạn sinh sống để kết nối với cộng đồng địa phương\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/7: Chọn tỉnh/thành phố nơi bạn sinh sống (Trang 1/${totalPages}):`, buttons)
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
                            birthday: '01/01' // Set default birthday since they confirmed (DD/MM format)
                        }
                    })

                    // Send referral prompt
                    await sendMessage(user.facebook_id, `✅ Xác nhận sinh năm 1981\n━━━━━━━━━━━━━━━━━━━━\n🌟 Bước 7/7: Mã giới thiệu (Tùy chọn)\n💡 Có mã giới thiệu? Nhận thêm 7 ngày miễn phí!\n━━━━━━━━━━━━━━━━━━━━\n📝 Nhập mã giới thiệu hoặc gõ "Bỏ qua":`)
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

    /**
     * Handle month postback - NEW BUTTON-BASED
     */
    private async handleMonthPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log('📅 Processing month postback:', payload, 'for user:', user.facebook_id)

            const month = parseInt(payload.replace('MONTH_', ''))
            if (month >= 1 && month <= 12) {
                await this.handleMonthSelection(user, month)
            } else {
                await sendMessage(user.facebook_id, '❌ Tháng không hợp lệ!')
            }

        } catch (error) {
            await this.handleError(user, error, 'handleMonthPostback')
        }
    }

    /**
     * Handle day postback - NEW BUTTON-BASED
     */
    private async handleDayPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log('📅 Processing day postback:', payload, 'for user:', user.facebook_id)

            const day = parseInt(payload.replace('DAY_', ''))
            if (day >= 1 && day <= 31) {
                await this.handleDaySelection(user, day)
            } else {
                await sendMessage(user.facebook_id, '❌ Ngày không hợp lệ!')
            }

        } catch (error) {
            await this.handleError(user, error, 'handleDayPostback')
        }
    }

    /**
     * Handle year confirmation - NEW BUTTON-BASED
     */
    private async handleYearConfirmation(user: any, answer: string): Promise<void> {
        try {
            console.log('🎂 Processing year confirmation:', answer, 'for user:', user.facebook_id)

            if (answer === 'YES') {
                // User confirmed 1981 - move to email step
                const { data: sessionData } = await supabaseAdmin
                    .from('bot_sessions')
                    .select('data')
                    .eq('facebook_id', user.facebook_id)
                    .single()

                if (sessionData && sessionData.data) {
                    // Update session and move to email step
                    await SessionManager.updateSession(user.facebook_id, {
                        step: 6,
                        data: {
                            ...sessionData.data,
                            birth_year_confirmed: true
                        }
                    })

                    // Send email prompt
                    await sendMessage(user.facebook_id, `✅ Xác nhận sinh năm 1981\n━━━━━━━━━━━━━━━━━━━━\n📧 Bước 6/7: Email (Tùy chọn)\n💡 Nhập email để nhận thông báo quan trọng\n━━━━━━━━━━━━━━━━━━━━\n📝 Nhập email hoặc gõ "Bỏ qua":`)
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
            console.error('❌ Year confirmation error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    /**
     * Handle email skip - NEW OPTIONAL STEP
     */
    private async handleEmailSkip(user: any): Promise<void> {
        console.log('📧 Email skipped for user:', user.facebook_id)

        // Get current session data
        const { data: sessionData } = await supabaseAdmin
            .from('bot_sessions')
            .select('data')
            .eq('facebook_id', user.facebook_id)
            .single()

        const currentData = sessionData?.data || {}

        // Update session and move to referral step
        const { error } = await supabaseAdmin
            .from('bot_sessions')
            .update({
                step: 7,
                current_step: 7,
                data: {
                    ...currentData,
                    email: null,
                    email_skipped: true
                },
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', user.facebook_id)

        if (error) {
            console.error('❌ Database error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        // Send referral prompt
        await this.sendReferralPrompt(user.facebook_id)
        console.log('✅ Email step skipped, moved to referral step')
    }

    /**
     * Handle referral skip - NEW OPTIONAL STEP
     */
    private async handleReferralSkip(user: any): Promise<void> {
        console.log('🌟 Referral skipped for user:', user.facebook_id)

        // Complete registration without referral
        const currentData = await SessionManager.getSessionData(user.facebook_id)
        await this.completeRegistration(user, {
            ...currentData,
            referral_code: null
        })
    }

    /**
     * Send month selection buttons - NEW BUTTON-BASED
     */
    private async sendMonthButtons(facebookId: string): Promise<void> {
        const months = [
            '1', '2', '3', '4', '5', '6',
            '7', '8', '9', '10', '11', '12'
        ]

        const buttons = months.map(month => createQuickReply(`Tháng ${month}`, `MONTH_${month}`))

        await sendQuickReply(facebookId,
            `📅 Bước 4/7: Chọn tháng sinh\n💡 Chọn tháng bạn được sinh ra\n━━━━━━━━━━━━━━━━━━━━`,
            buttons
        )
    }

    /**
     * Send day selection buttons - NEW BUTTON-BASED (FIXED: Split into batches to avoid Facebook API limits)
     */
    private async sendDayButtons(facebookId: string, month?: number): Promise<void> {
        // Get max days for the selected month (default to 31 if no month selected)
        const maxDays = month ? new Date(1981, month, 0).getDate() : 31
        const days = Array.from({ length: maxDays }, (_, i) => (i + 1).toString())

        const monthText = month ? `Tháng ${month}` : 'tháng'

        // Facebook allows max 13 quick replies per message, so split into batches of 10
        const buttonsPerPage = 10
        const totalPages = Math.ceil(days.length / buttonsPerPage)

        if (totalPages === 1) {
            // Single page - send all buttons
            const buttons = days.map(day => createQuickReply(day, `DAY_${day}`))
            await sendQuickReply(facebookId,
                `📅 Bước 5/7: Chọn ngày sinh\n💡 Chọn ngày bạn được sinh ra trong ${monthText}\n━━━━━━━━━━━━━━━━━━━━`,
                buttons
            )
        } else {
            // Multiple pages - send first page with navigation
            const firstPageDays = days.slice(0, buttonsPerPage - 2) // Reserve 2 slots for navigation
            const buttons = firstPageDays.map(day => createQuickReply(day, `DAY_${day}`))

            // Add navigation buttons
            buttons.push(createQuickReply('⬅️ TRƯỚC', 'DAY_PAGE_PREV'))
            buttons.push(createQuickReply('TIẾP ➡️', 'DAY_PAGE_NEXT'))

            await sendQuickReply(facebookId,
                `📅 Bước 5/7: Chọn ngày sinh\n💡 Chọn ngày bạn được sinh ra trong ${monthText}\n━━━━━━━━━━━━━━━━━━━━\n📄 Trang 1/${totalPages}`,
                buttons
            )
        }
    }

    /**
     * Send year confirmation buttons - NEW BUTTON-BASED
     */
    private async sendYearConfirmationButtons(facebookId: string): Promise<void> {
        const buttons = [
            createQuickReply('✅ Đúng vậy, tôi sinh năm 1981', 'BIRTH_YEAR_YES'),
            createQuickReply('❌ Không phải, tôi sinh năm khác', 'BIRTH_YEAR_NO')
        ]

        await sendQuickReply(facebookId, '🎂 Bạn có sinh năm 1981 (Tân Dậu) không?', buttons)
    }

    /**
     * Send referral prompt - NEW OPTIONAL STEP
     */
    private async sendReferralPrompt(facebookId: string): Promise<void> {
        await sendMessage(facebookId,
            `🌟 Bước 7/7: Mã giới thiệu (Tùy chọn)\n💡 Có mã giới thiệu? Nhận thêm 7 ngày miễn phí!\n━━━━━━━━━━━━━━━━━━━━\n📝 Nhập mã giới thiệu hoặc gõ "Bỏ qua":`
        )
    }

    /**
     * Handle day page navigation - NEW PAGINATION FOR DAY SELECTION
     */
    private async handleDayPageNavigation(user: any, direction: 'prev' | 'next', session: any): Promise<void> {
        try {
            console.log('📄 Processing day page navigation:', direction, 'for user:', user.facebook_id)

            // Get current session data
            const { data: sessionData } = await supabaseAdmin
                .from('bot_sessions')
                .select('data')
                .eq('facebook_id', user.facebook_id)
                .single()

            if (!sessionData || !sessionData.data) {
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                return
            }

            const currentData = sessionData.data
            const currentPage = currentData.day_page || 1
            const birthMonth = currentData.birth_month

            if (!birthMonth) {
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại từ đầu!')
                return
            }

            // Get max days for the selected month
            const maxDays = new Date(1981, birthMonth, 0).getDate()
            const days = Array.from({ length: maxDays }, (_, i) => (i + 1).toString())

            // Calculate pagination
            const buttonsPerPage = 10
            const totalPages = Math.ceil(days.length / buttonsPerPage)
            let newPage = currentPage

            if (direction === 'next') {
                newPage = Math.min(currentPage + 1, totalPages)
            } else if (direction === 'prev') {
                newPage = Math.max(currentPage - 1, 1)
            }

            // Update session with new page
            const { error } = await supabaseAdmin
                .from('bot_sessions')
                .update({
                    data: {
                        ...currentData,
                        day_page: newPage
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', user.facebook_id)

            if (error) {
                console.error('❌ Database error:', error)
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
                return
            }

            // Calculate which days to show for this page
            const startIndex = (newPage - 1) * buttonsPerPage
            const endIndex = Math.min(startIndex + buttonsPerPage, days.length)
            const pageDays = days.slice(startIndex, endIndex)

            // Create buttons for this page
            const buttons = pageDays.map(day => createQuickReply(day, `DAY_${day}`))

            // Add navigation buttons if needed
            if (totalPages > 1) {
                if (newPage > 1) {
                    buttons.push(createQuickReply('⬅️ TRƯỚC', 'DAY_PAGE_PREV'))
                }
                if (newPage < totalPages) {
                    buttons.push(createQuickReply('TIẾP ➡️', 'DAY_PAGE_NEXT'))
                }
            }

            const monthText = `Tháng ${birthMonth}`
            await sendQuickReply(user.facebook_id,
                `📅 Bước 5/7: Chọn ngày sinh\n💡 Chọn ngày bạn được sinh ra trong ${monthText}\n━━━━━━━━━━━━━━━━━━━━\n📄 Trang ${newPage}/${totalPages}`,
                buttons
            )

        } catch (error) {
            console.error('❌ Day page navigation error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}
