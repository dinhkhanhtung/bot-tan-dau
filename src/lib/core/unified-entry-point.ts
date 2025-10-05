import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { CONFIG } from '../config'
import { logger, logUserAction, logBotEvent, logError } from '../logger'
import { errorHandler, createUserError, ErrorType } from '../error-handler'
import { getUserByFacebookId, getBotSession, updateBotSession, getBotStatus } from '../database-service'
import { welcomeService, WelcomeType } from '../welcome-service'
import { messageProcessor } from './message-processor'

/**
 * Unified Bot System - Main entry point for bot message processing
 * Handles all incoming messages with proper routing and flow management
 */
export class UnifiedBotSystem {

    /**
     * Main entry point for processing all incoming messages
     * This is the single entry point for message handling with proper routing and flow management
     */
    static async handleMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        const startTime = Date.now()

        try {
            logger.info('Processing message', {
                facebook_id: user.facebook_id,
                text: text,
                isPostback: isPostback,
                postback: postback
            })

            // Step 1: Check bot status
            const botStatus = await getBotStatus()
            if (botStatus === 'stopped') {
                logger.info('Bot is stopped, ignoring message', { facebook_id: user.facebook_id })
                return
            }

            // Step 2: Check if user is in admin chat mode
            const isInAdminChat = await this.checkAdminChatMode(user.facebook_id)
            if (isInAdminChat) {
                await sendMessage(user.facebook_id, '💬 Bạn đang trong chế độ chat với admin. Bot sẽ tạm dừng để admin có thể hỗ trợ bạn trực tiếp.')
                return
            }

            // Step 3: Check user session and prioritize active flows
            const session = await this.getUserSession(user.facebook_id)

            // CHUẨN HÓA: Lấy current_flow từ session (đã được chuẩn hóa trong getBotSession)
            const currentFlow = session?.current_flow || null

            logger.debug('Session check', {
                currentFlow,
                session,
                facebook_id: user.facebook_id,
                hasSession: !!session,
                sessionData: session?.session_data
            })

            // If user is in an active flow, handle flow first - ƯU TIÊN CAO NHẤT
            if (currentFlow && ['registration', 'listing', 'search'].includes(currentFlow)) {
                logger.info('User in active flow - PRIORITIZING FLOW', {
                    currentFlow,
                    facebook_id: user.facebook_id,
                    step: session?.session_data?.step || session?.current_step
                })
                await this.handleFlowMessage(user, text, session)
                return
            }

            // Step 4: Handle regular message
            if (isPostback && postback) {
                await this.handlePostbackAction(user, postback)
            } else if (text) {
                await this.handleTextMessage(user, text)
            } else {
                await this.handleDefaultMessage(user)
            }

            const duration = Date.now() - startTime
            logBotEvent('message_processed', {
                facebook_id: user.facebook_id,
                duration,
                isPostback: !!isPostback
            })

        } catch (error) {
            const duration = Date.now() - startTime
            const messageError = createUserError(
                `Message processing failed: ${error instanceof Error ? error.message : String(error)}`,
                ErrorType.USER_ERROR,
                {
                    facebook_id: user.facebook_id,
                    text,
                    isPostback,
                    postback,
                    duration
                },
                user.facebook_id
            )

            logError(messageError, { operation: 'message_processing', user, text, isPostback, postback })
            await this.sendErrorMessage(user.facebook_id)
        }
    }


    /**
     * Kiểm tra admin chat mode
     */
    private static async checkAdminChatMode(facebookId: string): Promise<boolean> {
        try {
            const { isUserInAdminChat } = await import('../admin-chat')
            const result = await isUserInAdminChat(facebookId)
            logger.debug('Admin chat mode check', { facebook_id: facebookId, isInAdminChat: result })
            return result
        } catch (error) {
            logError(error as Error, { operation: 'admin_chat_mode_check', facebook_id: facebookId })
            return false
        }
    }

    /**
     * Lấy session của user
     */
    private static async getUserSession(facebookId: string): Promise<any> {
        try {
            return await getBotSession(facebookId)
        } catch (error) {
            logError(error as Error, { operation: 'get_user_session', facebook_id: facebookId })
            return null
        }
    }


    /**
     * Kiểm tra spam status - SỬ DỤNG LOGIC MỚI
     */
    private static async checkSpamStatus(facebookId: string, text: string, isPostback?: boolean, userStatus?: string, currentFlow?: string | null): Promise<{ shouldStop: boolean, reason?: string }> {
        try {
            // Nếu là postback (tương tác nút bấm) -> không áp dụng chống spam
            if (isPostback) {
                return { shouldStop: false }
            }

            // Nếu có text -> áp dụng logic chống spam thông minh
            if (text) {
                const { handleAntiSpam } = await import('../anti-spam')
                const result = await handleAntiSpam(facebookId, text, userStatus || 'unregistered', currentFlow)

                if (result.block) {
                    return { shouldStop: true, reason: result.message }
                }
            }

            return { shouldStop: false }
        } catch (error) {
            console.error('Error checking spam status:', error)
            return { shouldStop: false }
        }
    }

    /**
     * Xử lý tin nhắn của admin - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ BÂY GIỜ QUA TRANG WEB ADMIN
     */
    private static async handleAdminMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        // ADMIN SYSTEM ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        // TẤT CẢ QUẢN LÝ QUA TRANG WEB: https://bot-tan-dau.vercel.app/admin/login
        await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
        await this.sendMessage(user.facebook_id, '📧 Liên hệ admin để được cấp tài khoản quản lý.')
    }

    /**
     * Xử lý admin chat message - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminChatMessage(user: any, text: string): Promise<void> {
        // ADMIN CHAT ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(user.facebook_id, '🔧 Hệ thống chat admin đã được chuyển sang trang web.')
        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Xử lý flow message
     */
    private static async handleFlowMessage(user: any, text: string, session?: any): Promise<void> {
        try {
            // CHUẨN HÓA: Sử dụng session đã được chuẩn hóa từ getBotSession
            const currentFlow = session?.current_flow || null

            logger.debug('Handling flow message', {
                currentFlow,
                facebook_id: user.facebook_id,
                hasSession: !!session,
                sessionData: session?.session_data,
                text: text?.substring(0, 50) + '...'
            })

            // Kiểm tra session hợp lệ
            if (!session || !currentFlow) {
                logger.error('Invalid session for flow message', {
                    facebook_id: user.facebook_id,
                    session,
                    currentFlow
                })
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Xử lý các lệnh thoát flow
            if (text && this.isExitCommand(text)) {
                await this.handleFlowExit(user, currentFlow)
                return
            }

            // Route đến flow handler phù hợp
            switch (currentFlow) {
                case 'registration':
                    logger.info('Routing to registration flow', {
                        facebook_id: user.facebook_id,
                        step: session?.session_data?.step
                    })
                    const { AuthFlow } = await import('../flows/auth-flow')
                    const authFlow = new AuthFlow()
                    await authFlow.handleStep(user, text || '', session)
                    break
                case 'listing':
                    const { MarketplaceFlow } = await import('../flows/marketplace-flow')
                    const marketplaceFlow = new MarketplaceFlow()
                    await marketplaceFlow.handleStep(user, text || '', session)
                    break
                case 'search':
                    const { MarketplaceFlow: SearchFlow } = await import('../flows/marketplace-flow')
                    const searchFlow = new SearchFlow()
                    await searchFlow.handleSearchStep(user, text || '', session)
                    break
                default:
                    logger.error('Unknown flow type', { currentFlow, facebook_id: user.facebook_id })
                    await this.sendErrorMessage(user.facebook_id)
            }
        } catch (error) {
            logger.error('Error handling flow message', {
                error: error instanceof Error ? error.message : String(error),
                facebook_id: user.facebook_id,
                currentFlow: session?.current_flow
            })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý postback actions
     */
    private static async handlePostbackAction(user: any, postback: string): Promise<void> {
        try {
            const [action, ...params] = postback.split('_')

            // Kiểm tra user type để route đúng handler
            const context = await this.analyzeUserContext(user)

            if (context.userType === UserType.PENDING_USER) {
                const { PendingUserFlow } = await import('../flows/pending-user-flow')
                const pendingUserFlow = new PendingUserFlow()
                await pendingUserFlow.handlePostback(user, postback)
                return
            }

            switch (action) {
                case 'REGISTER':
                    // Kiểm tra xem user đã có session registration chưa
                    const { getBotSession } = await import('../utils')
                    const existingSession = await getBotSession(user.facebook_id)

                    if (existingSession && existingSession.session_data?.current_flow === 'registration') {
                        // User đã trong flow registration, không gửi lại welcome
                        console.log('User already in registration flow, skipping duplicate welcome')
                        return
                    }

                    await this.startRegistration(user)
                    break
                case 'INFO':
                    // Xử lý nút TÌM HIỂU THÊM - CHỈ hiển thị thông tin, KHÔNG đăng ký
                    await this.showBotInfo(user)
                    break
                case 'CONTACT':
                    if (params[0] === 'ADMIN') {
                        await this.showSupportInfo(user)
                    }
                    break
                case 'MAIN':
                    if (params[0] === 'MENU') {
                        await this.showMainMenu(user)
                    }
                    break
                case 'MAIN_MENU':
                    await this.showMainMenu(user)
                    break
                case 'ADMIN':
                    await this.showAdminDashboard(user)
                    break
                case 'EXIT_BOT':
                    const { handleBotExit } = await import('../anti-spam')
                    await handleBotExit(user.facebook_id)
                    break
                case 'CHAT_BOT':
                    // User ấn nút "Chat Bot" - đưa vào bot mode
                    // Kiểm tra xem có phải admin không
                    if (user.facebook_id === process.env.FACEBOOK_PAGE_ID) {
                        // Admin không cần vào bot mode - hiện admin dashboard
                        await this.showAdminDashboard(user)
                    } else {
                        // User thường - đưa vào bot mode
                        const { setUserBotMode } = await import('../anti-spam')
                        await setUserBotMode(user.facebook_id)

                        // Hiện main menu
                        await this.showMainMenu(user)
                    }
                    break
                case 'REG':
                    // Xử lý postback cho registration flow
                    if (params[0] === 'LOCATION') {
                        const location = params[1] // HANOI, HCM, etc.
                        const { AuthFlow } = await import('../flows/auth-flow')
                        const authFlow = new AuthFlow()
                        await authFlow.handleRegistrationLocationPostback(user, location)
                    } else if (params[0] === 'BIRTHDAY') {
                        const answer = params[1] // YES or NO
                        const { AuthFlow } = await import('../flows/auth-flow')
                        const authFlow = new AuthFlow()
                        await authFlow.handleBirthdayVerification(user, answer)
                    }
                    break
                default:
                    await this.routeToHandler(user, postback)
            }
        } catch (error) {
            console.error('Error handling postback action:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý tin nhắn trong bot mode - KHÔNG áp dụng counter logic
     */
    private static async handleBotModeMessage(user: any, text: string): Promise<void> {
        try {
            // Xử lý các lệnh đặc biệt trong bot mode
            if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
                await this.startRegistration(user)
            } else if (text.includes('thông tin') || text.includes('THÔNG TIN')) {
                await this.showBotInfo(user)
            } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
                await this.showSupportInfo(user)
            } else {
                // Xử lý tin nhắn thường - hiện main menu
                await this.showMainMenu(user)
            }
        } catch (error) {
            console.error('Error handling bot mode message:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý text message
     */
    private static async handleTextMessage(user: any, text: string): Promise<void> {
        try {
            // Phân tích ngữ cảnh đơn giản và rõ ràng
            const context = await this.analyzeUserContext(user)

            switch (context.userType) {
                case UserType.ADMIN:
                    await this.handleAdminTextMessage(user, text)
                    break
                case UserType.REGISTERED_USER:
                case UserType.TRIAL_USER:
                    await this.handleRegisteredUserText(user, text, context)
                    break
                case UserType.PENDING_USER:
                    await this.handlePendingUserText(user, text, context)
                    break
                case UserType.EXPIRED_USER:
                    await this.handleExpiredUserText(user, text)
                    break
                case UserType.NEW_USER:
                default:
                    await this.handleNewUserText(user, text)
                    break
            }
        } catch (error) {
            console.error('Error handling text message:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Phân tích ngữ cảnh đơn giản và rõ ràng
     */
    private static async analyzeUserContext(user: any): Promise<{ userType: UserType, user?: any }> {
        try {
            // 1. Kiểm tra Admin trước (ưu tiên cao nhất) - TIN NHẮN TỪ FANPAGE = ADMIN
            if (user.facebook_id === process.env.FACEBOOK_PAGE_ID) {
                return { userType: UserType.ADMIN }
            }

            // 2. Lấy thông tin user từ database
            const { supabaseAdmin } = await import('../supabase')
            const { data: userData, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('facebook_id', user.facebook_id)
                .single()

            // Nếu không tìm thấy user trong database -> NEW USER
            if (error || !userData) {
                console.log('❌ No user data found for:', user.facebook_id, 'Error:', error?.message)
                return { userType: UserType.NEW_USER, user: null }
            }

            // 3. KIỂM TRA TRẠNG THÁI USER - RÕ RÀNG
            console.log('✅ User data found:', {
                facebook_id: userData.facebook_id,
                status: userData.status,
                name: userData.name,
                phone: userData.phone,
                membership_expires_at: userData.membership_expires_at
            })

            // KIỂM TRA USER CÓ THÔNG TIN ĐẦY ĐỦ KHÔNG
            if (!userData.name || !userData.phone) {
                console.log('🚫 User missing required info, treating as NEW USER')
                return { userType: UserType.NEW_USER, user: null }
            }

            // KIỂM TRA USER ĐANG CHỜ DUYỆT
            if (userData.status === 'pending') {
                console.log('⏳ User pending approval, treating as PENDING_USER')
                return { userType: UserType.PENDING_USER, user: userData }
            }

            if (userData.status === 'registered') {
                return { userType: UserType.REGISTERED_USER, user: userData }
            } else if (userData.status === 'trial') {
                // Kiểm tra trial có hết hạn không
                if (userData.membership_expires_at) {
                    const expiryDate = new Date(userData.membership_expires_at)
                    const now = new Date()

                    if (expiryDate <= now) {
                        console.log('Trial user expired, treating as expired user')
                        return { userType: UserType.EXPIRED_USER, user: userData }
                    }
                }
                return { userType: UserType.TRIAL_USER, user: userData }
            } else if (userData.status === 'pending') {
                // User đang chờ admin duyệt
                console.log('User pending approval, treating as pending user')
                return { userType: UserType.NEW_USER, user: userData }
            } else if (userData.status === 'expired') {
                return { userType: UserType.EXPIRED_USER, user: userData }
            }

            // 4. Nếu status không xác định -> coi như NEW USER
            console.log('❓ Unknown user status:', userData.status, 'treating as new user')
            return { userType: UserType.NEW_USER, user: null }
        } catch (error) {
            console.error('❌ Error analyzing user context:', error)
            return { userType: UserType.NEW_USER }
        }
    }

    /**
     * Xử lý admin text message
     */
    private static async handleAdminTextMessage(user: any, text: string): Promise<void> {
        try {
            // Admin text message - hiện admin dashboard
            await this.showAdminDashboard(user)
        } catch (error) {
            console.error('Error handling admin text:', error)
            await this.showAdminDashboard(user)
        }
    }

    /**
     * Xử lý admin trong cuộc trò chuyện với user - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminInChatMode(user: any, text: string): Promise<void> {
        // ADMIN CHAT ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(user.facebook_id, '🔧 Hệ thống chat admin đã được chuyển sang trang web.')
        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Hiện admin menu trong cuộc trò chuyện - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async showAdminChatMenu(user: any, session: any): Promise<void> {
        // ADMIN CHAT MENU ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Xử lý registered user text
     */
    private static async handleRegisteredUserText(user: any, text: string, context: any): Promise<void> {
        try {
            // Xử lý các lệnh text đơn giản
            if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
                await this.sendMessage(user.facebook_id, '✅ Bạn đã đăng ký rồi!')
                await this.showMainMenu(user)
            } else if (text.includes('niêm yết') || text.includes('NIÊM YẾT')) {
                await this.routeToHandler(user, 'LISTING')
            } else if (text.includes('tìm kiếm') || text.includes('TÌM KIẾM')) {
                await this.routeToHandler(user, 'SEARCH')
            } else {
                await this.showMainMenu(user)
            }
        } catch (error) {
            console.error('Error handling registered user text:', error)
            await this.showMainMenu(user)
        }
    }

    /**
     * Xử lý expired user text
     */
    private static async handleExpiredUserText(user: any, text: string): Promise<void> {
        try {
            if (text.includes('thanh toán') || text.includes('THANH TOÁN')) {
                await this.routeToHandler(user, 'PAYMENT')
            } else {
                await this.sendMessage(user.facebook_id, '⏰ Tài khoản đã hết hạn')
                await this.sendMessage(user.facebook_id, '💰 Vui lòng thanh toán để tiếp tục sử dụng')
                await this.routeToHandler(user, 'PAYMENT')
            }
        } catch (error) {
            console.error('Error handling expired user text:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý pending user text
     */
    private static async handlePendingUserText(user: any, text: string, context: any): Promise<void> {
        try {
            const { PendingUserFlow } = await import('../flows/pending-user-flow')
            const pendingUserFlow = new PendingUserFlow()
            await pendingUserFlow.handleMessage(user, text)
        } catch (error) {
            console.error('Error handling pending user text:', error)
            await this.showWelcomeMessage(user)
        }
    }

    /**
     * Xử lý new user text - SỬ DỤNG WELCOME SERVICE
     */
    private static async handleNewUserText(user: any, text: string): Promise<void> {
        try {
            // Kiểm tra user có đang trong bot mode không
            const { checkUserBotMode } = await import('../anti-spam')
            const isInBotMode = await checkUserBotMode(user.facebook_id)

            // KIỂM TRA ADMIN TRƯỚC TIÊN - TIN NHẮN TỪ FANPAGE = ADMIN
            if (user.facebook_id === process.env.FACEBOOK_PAGE_ID) {
                logger.info('Admin message from fanpage detected', { facebook_id: user.facebook_id })
                await this.handleAdminMessage(user, text)
                return
            }

            // QUAN TRỌNG: Kiểm tra flow đăng ký TRƯỚC khi xử lý counter
            // Để đảm bảo flow đăng ký không bị ảnh hưởng bởi logic dừng bot
            const session = await this.getUserSession(user.facebook_id)
            const currentFlow = session?.current_flow || null

            logger.debug('New user text handling', {
                currentFlow,
                session,
                isInBotMode,
                facebook_id: user.facebook_id,
                hasSession: !!session
            })

            // Nếu đang trong flow đăng ký, xử lý tin nhắn bình thường - KHÔNG áp dụng counter
            if (currentFlow === 'registration') {
                logger.info('New user in registration flow - BYPASSING COUNTER LOGIC', {
                    facebook_id: user.facebook_id,
                    currentFlow,
                    step: session?.session_data?.step
                })
                await this.handleFlowMessage(user, text, session)
                return
            }

            // Nếu đang trong bot mode, xử lý bình thường
            if (isInBotMode) {
                logger.info('User in bot mode - processing normally', {
                    facebook_id: user.facebook_id
                })
                // Xử lý tin nhắn trong bot mode - KHÔNG áp dụng counter logic
                // Chuyển đến xử lý tin nhắn bình thường trong bot mode
                // Bỏ qua phần counter logic và chuyển đến xử lý tin nhắn bình thường
                await this.handleBotModeMessage(user, text)
                return
            } else {
                // User không trong bot mode và không trong flow đăng ký
                // Áp dụng logic counter cho tin nhắn chào mừng
                logger.info('New user not in bot mode - processing welcome counter logic', {
                    facebook_id: user.facebook_id
                })

                // Kiểm tra user có đang trong admin chat không - nếu có thì không tăng counter
                const { isUserInAdminChat, incrementNormalMessageCount, getUserChatBotOfferCount } = await import('../anti-spam')
                const isInAdminChat = await isUserInAdminChat(user.facebook_id)

                if (!isInAdminChat) {
                    // Tăng counter cho mỗi tin nhắn thường (chỉ khi không trong admin chat)
                    await incrementNormalMessageCount(user.facebook_id)
                } else {
                    console.log(`⏸️ User ${user.facebook_id} in admin chat - skipping counter increment`)
                }

                // Lấy count hiện tại để phân biệt
                const offerData = await getUserChatBotOfferCount(user.facebook_id)
                const currentCount = offerData?.count || 0

                console.log(`📊 Counter check for ${user.facebook_id}:`, {
                    offerData,
                    currentCount,
                    message: text,
                    isInAdminChat
                })

                // Nếu user đang trong admin chat, không áp dụng logic dừng bot
                if (isInAdminChat) {
                    console.log(`💬 User ${user.facebook_id} in admin chat - allowing normal conversation`)
                    // Chuyển tin nhắn đến admin mà không áp dụng logic dừng bot
                    return
                }

                // LOGIC MỚI: Kiểm tra có nên hiển thị nút Chat Bot không
                const { shouldShowChatBotButton } = await import('../anti-spam')
                const shouldShowButton = await shouldShowChatBotButton(user.facebook_id)

                if (currentCount === 1) {
                    console.log(`🎯 Executing count=1 logic for ${user.facebook_id}`)
                    // Tin nhắn đầu tiên - chào mừng đầy đủ + nút "Chat Bot"
                    const { sendMessage, sendQuickReply, createQuickReply } = await import('../facebook-api')

                    // Tin nhắn 1: Chào mừng + câu hỏi
                    const welcomeMessage = `🎉 Chào bạn ghé thăm Đinh Khánh Tùng!\n👋 Hôm nay mình có thể giúp gì cho bạn?`
                    await sendMessage(user.facebook_id, welcomeMessage)

                    // Hiển thị nút Chat Bot
                    await sendQuickReply(
                        user.facebook_id,
                        'Chọn hành động:',
                        [
                            createQuickReply('🤖 CHAT BOT', 'CHAT_BOT')
                        ]
                    )
                } else if (currentCount === 2 && shouldShowButton) {
                    console.log(`🎯 Executing count=2 logic for ${user.facebook_id}`)
                    // Tin nhắn thứ 2 - CHỈ hiển thị nút Chat Bot mà KHÔNG nói gì
                    const { sendQuickReply, createQuickReply } = await import('../facebook-api')

                    // Chỉ hiển thị nút mà không nói gì
                    await sendQuickReply(
                        user.facebook_id,
                        'Chọn hành động:',
                        [
                            createQuickReply('🤖 CHAT BOT', 'CHAT_BOT')
                        ]
                    )
                } else if (currentCount === 3 && shouldShowButton) {
                    console.log(`🎯 Executing count=3 logic for ${user.facebook_id}`)
                    // Tin nhắn thứ 3 - thông báo admin + nút Chat Bot
                    const { sendMessage, sendQuickReply, createQuickReply } = await import('../facebook-api')

                    await sendMessage(user.facebook_id, '💬 Đinh Khánh Tùng đã nhận được tin nhắn của bạn và sẽ sớm phản hồi!')

                    // Vẫn hiển thị nút Chat Bot để user có thể vào bot mode
                    await sendQuickReply(
                        user.facebook_id,
                        'Chọn hành động:',
                        [
                            createQuickReply('🤖 CHAT BOT', 'CHAT_BOT')
                        ]
                    )
                } else if (currentCount >= 4) {
                    console.log(`🎯 Executing count=${currentCount} logic for ${user.facebook_id} - chỉ hiển thị nút nếu được phép`)
                    // Tin nhắn thứ 4+ - chỉ hiển thị nút nếu shouldShowButton = true
                    if (shouldShowButton) {
                        const { sendQuickReply, createQuickReply } = await import('../facebook-api')
                        await sendQuickReply(
                            user.facebook_id,
                            'Chọn hành động:',
                            [
                                createQuickReply('🤖 CHAT BOT', 'CHAT_BOT')
                            ]
                        )
                    } else {
                        logger.info('🚫 Không hiển thị nút Chat Bot nữa', { facebook_id: user.facebook_id })
                        // Không hiển thị gì cả
                    }
                }
                return
            }

            // Xử lý tin nhắn trong bot mode hoặc tin nhắn thường
            // Kiểm tra spam trước
            const { handleAntiSpam } = await import('../anti-spam')
            const spamResult = await handleAntiSpam(user.facebook_id, text, user.status || 'new', currentFlow)

            if (spamResult.block) {
                logger.warn('User blocked due to spam', {
                    facebook_id: user.facebook_id,
                    reason: spamResult.message
                })
                return
            }

            // Nếu spam check đã xử lý (gửi welcome), không cần xử lý thêm
            if (spamResult.action === 'none' && spamResult.message) {
                logger.info('Anti-spam handled message', { facebook_id: user.facebook_id })
                return
            }

            // Xử lý các lệnh đặc biệt
            if (spamResult.action === 'none' && !spamResult.message && !spamResult.block) {
                if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
                    await this.startRegistration(user)
                } else if (text.includes('thông tin') || text.includes('THÔNG TIN')) {
                    await this.showBotInfo(user)
                } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
                    await this.showSupportInfo(user)
                } else {
                    // Xử lý tin nhắn thường - hiện main menu
                    await this.showMainMenu(user)
                }
            }

        } catch (error) {
            logError(error as Error, {
                operation: 'new_user_text_handling',
                facebook_id: user.facebook_id,
                text
            })
        }
    }

    /**
     * Route to appropriate handler
     */
    private static async routeToHandler(user: any, action: string): Promise<void> {
        try {
            switch (action) {
                case 'LISTING':
                    const { MarketplaceFlow } = await import('../flows/marketplace-flow')
                    const marketplaceFlow = new MarketplaceFlow()
                    await marketplaceFlow.handleListing(user)
                    break
                case 'SEARCH':
                    const { MarketplaceFlow: SearchFlow } = await import('../flows/marketplace-flow')
                    const searchFlow = new SearchFlow()
                    await searchFlow.handleSearch(user)
                    break
                case 'PAYMENT':
                    const { PaymentFlow } = await import('../flows/payment-flow')
                    const paymentFlow = new PaymentFlow()
                    await paymentFlow.handlePayment(user)
                    break
                default:
                    await this.showMainMenu(user)
            }
        } catch (error) {
            console.error('Error routing to handler:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Hiển thị thông tin bot
     */
    private static async showBotInfo(user: any): Promise<void> {
        try {
            const { sendMessage, sendQuickReply, createQuickReply } = await import('../facebook-api')

            await sendMessage(user.facebook_id, 'ℹ️ THÔNG TIN VỀ BOT Tân Dậu - Hỗ Trợ Chéo')
            await sendMessage(user.facebook_id, '🤖 Bot này được thiết kế đặc biệt cho cộng đồng Tân Dậu')
            await sendMessage(user.facebook_id, '🎯 Chức năng chính:\n• Niêm yết sản phẩm/dịch vụ\n• Tìm kiếm & kết nối mua bán\n• Cộng đồng Tân Dậu - hỗ trợ chéo\n• Tử vi hàng ngày\n• Điểm thưởng & quà tặng')
            await sendMessage(user.facebook_id, '💰 Phí sử dụng:\n• Trial 7 ngày miễn phí\n• Phí duy trì: 2,000đ/ngày\n• Gói tối thiểu: 7 ngày = 14,000đ')
            await sendMessage(user.facebook_id, '🔒 Bảo mật:\n• Chỉ dành cho Tân Dậu - Hỗ Trợ Chéo\n• Thông tin được mã hóa bảo mật\n• Lưu trữ để tìm kiếm & kết nối hiệu quả')

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN'),
                    createQuickReply('🔙 TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        } catch (error) {
            console.error('Error showing bot info:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Hiển thị thông tin hỗ trợ
     */
    private static async showSupportInfo(user: any): Promise<void> {
        try {
            const { sendMessage, sendQuickReply, createQuickReply } = await import('../facebook-api')

            await sendMessage(user.facebook_id, '💬 LIÊN HỆ HỖ TRỢ')
            await sendMessage(user.facebook_id, 'Để được hỗ trợ, vui lòng liên hệ:\n📞 Hotline: 0901 234 567\n📧 Email: dinhkhanhtung@outlook.com\n⏰ Thời gian: 8:00 - 22:00')
            await sendMessage(user.facebook_id, 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.')

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                    createQuickReply('🔙 TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        } catch (error) {
            console.error('Error showing support info:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Hiển thị menu chính
     */
    private static async showMainMenu(user: any): Promise<void> {
        try {
            const { sendMessage, sendQuickReply, createQuickReply } = await import('../facebook-api')

            await sendMessage(user.facebook_id, '🏠 TRANG CHỦ - Bot Tân Dậu - Hỗ Trợ Chéo')
            await sendMessage(user.facebook_id, 'Chào mừng bạn đến với cộng đồng Tân Dậu!')

            await sendQuickReply(
                user.facebook_id,
                'Chọn chức năng:',
                [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                    createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
                ]
            )
        } catch (error) {
            console.error('Error showing main menu:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Bắt đầu registration flow
     */
    private static async startRegistration(user: any): Promise<void> {
        try {
            // Kiểm tra xem user đã có session registration chưa
            const { getBotSession } = await import('../utils')
            const existingSession = await getBotSession(user.facebook_id)

            if (existingSession && existingSession.session_data?.current_flow === 'registration') {
                // User đã trong flow registration, chỉ gửi lại hướng dẫn hiện tại
                console.log('User already in registration flow, resuming current step')
                const { AuthFlow } = await import('../flows/auth-flow')
                const authFlow = new AuthFlow()
                await authFlow.handleRegistration(user)
                return
            }

            const { AuthFlow } = await import('../flows/auth-flow')
            const authFlow = new AuthFlow()
            await authFlow.handleRegistration(user)
        } catch (error) {
            console.error('Error starting registration:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý flow exit
     */
    private static async handleFlowExit(user: any, currentFlow?: string): Promise<void> {
        try {
            await updateBotSession(user.facebook_id, null)
            const flowName = currentFlow ? this.getFlowDisplayName(currentFlow) : 'hiện tại'
            await this.sendMessage(user.facebook_id, `❌ Đã hủy quy trình ${flowName}`)
            await this.showMainMenu(user)
        } catch (error) {
            console.error('Error handling flow exit:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Kiểm tra exit command
     */
    private static isExitCommand(text: string): boolean {
        const exitCommands = ['hủy', 'thoát', 'cancel', 'quit', 'exit']
        return exitCommands.some(cmd => text.toLowerCase().includes(cmd))
    }

    /**
     * Lấy tên hiển thị của flow
     */
    private static getFlowDisplayName(flow: string): string {
        const flowNames: { [key: string]: string } = {
            'registration': 'đăng ký',
            'listing': 'niêm yết',
            'search': 'tìm kiếm'
        }
        return flowNames[flow] || flow
    }

    /**
     * Show welcome message cho new user - LOGIC THÔNG MINH
     */
    private static async showWelcomeMessage(user: any): Promise<void> {
        try {
            // Kiểm tra trạng thái welcome
            const { supabaseAdmin } = await import('../supabase')
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('welcome_message_sent, welcome_interaction_count')
                .eq('facebook_id', user.facebook_id)
                .single()

            const interactionCount = existingUser?.welcome_interaction_count || 0

            // Lần đầu tiên - hiển thị welcome đầy đủ + menu
            if (!existingUser?.welcome_message_sent) {
                await sendTypingIndicator(user.facebook_id)

                // Get Facebook name for personalized greeting - with error handling
                let displayName = 'bạn'
                try {
                    const { getFacebookDisplayName } = await import('../utils')
                    const facebookName = await getFacebookDisplayName(user.facebook_id)
                    if (facebookName) {
                        displayName = facebookName
                    }
                } catch (error) {
                    console.warn('Failed to get Facebook display name, using fallback:', error instanceof Error ? error.message : String(error))
                }

                // DISABLED: Welcome message now handled by anti-spam system
                console.log('Welcome message handled by anti-spam system')

                await sendQuickReply(
                    user.facebook_id,
                    'Bạn muốn:',
                    [
                        createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                        createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                        createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
                    ]
                )

                // Đánh dấu đã gửi welcome và tăng interaction count
                await supabaseAdmin
                    .from('users')
                    .upsert({
                        facebook_id: user.facebook_id,
                        welcome_message_sent: true,
                        welcome_interaction_count: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'facebook_id'
                    })
            }
            // Lần thứ 2 trở đi - kiểm tra interaction
            else {
                const newCount = interactionCount + 1

                // Lần 2+: Im lặng, ẩn menu hoàn toàn (user không quan tâm)
                // Không gửi gì cả - im lặng
                // User không quan tâm đến bot

                // Tăng interaction count
                await supabaseAdmin
                    .from('users')
                    .update({
                        welcome_interaction_count: newCount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('facebook_id', user.facebook_id)
            }
        } catch (error) {
            console.error('Error showing welcome message:', error)
        }
    }


    /**
     * Show admin dashboard
     */
    private static async showAdminDashboard(user: any): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)
            await sendMessage(user.facebook_id, '🔧 ADMIN DASHBOARD')
            await sendMessage(user.facebook_id, 'Chào mừng Admin! Bạn có toàn quyền quản lý hệ thống.')

            const adminOptions = [
                createQuickReply('💬 VÀO CUỘC TRÒ CHUYỆN', 'ADMIN_ENTER_CHAT'),
                createQuickReply('💰 QUẢN LÝ THANH TOÁN', 'ADMIN_PAYMENTS'),
                createQuickReply('👥 QUẢN LÝ NGƯỜI DÙNG', 'ADMIN_USERS'),
                createQuickReply('🛒 QUẢN LÝ TIN ĐĂNG', 'ADMIN_LISTINGS'),
                createQuickReply('📊 XEM THỐNG KÊ', 'ADMIN_STATS'),
                createQuickReply('🔔 THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
                createQuickReply('📤 GỬI LINK ĐĂNG KÝ', 'ADMIN_SEND_REGISTRATION'),
                createQuickReply('⚙️ QUẢN LÝ ADMIN', 'ADMIN_MANAGE_ADMINS'),
                createQuickReply('🚫 SPAM LOGS', 'ADMIN_SPAM_LOGS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]

            await sendQuickReply(user.facebook_id, 'Chọn chức năng:', adminOptions)
        } catch (error) {
            console.error('Error showing admin dashboard:', error)
        }
    }


    /**
     * Show pending user welcome
     */
    private static async showPendingUserWelcome(user: any, context: any): Promise<void> {
        try {
            const { PendingUserFlow } = await import('../flows/pending-user-flow')
            const pendingUserFlow = new PendingUserFlow()
            await pendingUserFlow.showPendingUserMenu(user, context)
        } catch (error) {
            console.error('Error showing pending user welcome:', error)
            await this.showWelcomeMessage(user)
        }
    }


    /**
     * Xử lý admin postback - CẢI THIỆN ĐỂ XỬ LÝ DUYỆT THANH TOÁN
     */
    private static async handleAdminPostback(user: any, postback: string): Promise<void> {
        try {
            console.log('🔧 Admin postback received:', postback)

            // Xử lý các nút admin gửi cho user
            if (postback.startsWith('ADMIN_SEND_')) {
                await this.handleAdminSendToUser(user, postback)
            } else if (postback.startsWith('ADMIN_USER_')) {
                await this.handleAdminUserInfo(user, postback)
            } else if (postback.startsWith('ADMIN_END_CHAT_')) {
                const sessionId = postback.replace('ADMIN_END_CHAT_', '')
                const { handleAdminEndChat } = await import('../handlers/admin-handlers')
                await handleAdminEndChat(user, sessionId)
            } else if (postback.startsWith('ADMIN_APPROVE_USER_')) {
                // Xử lý duyệt thanh toán cho user cụ thể
                const userId = postback.replace('ADMIN_APPROVE_USER_', '')
                await this.handleAdminApproveUserPayment(user, userId)
            } else if (postback.startsWith('ADMIN_REJECT_USER_')) {
                // Xử lý từ chối thanh toán cho user cụ thể
                const userId = postback.replace('ADMIN_REJECT_USER_', '')
                await this.handleAdminRejectUserPayment(user, userId)
            } else if (postback.startsWith('ADMIN_VIEW_PAYMENTS_')) {
                // Xử lý xem thanh toán của user cụ thể
                const userId = postback.replace('ADMIN_VIEW_PAYMENTS_', '')
                await this.handleAdminViewUserPayments(user, userId)
            } else if (postback === 'ADMIN_BULK_APPROVE') {
                // Xử lý duyệt hàng loạt
                const { handleAdminBulkApprove } = await import('../handlers/admin-handlers')
                await handleAdminBulkApprove(user)
            } else if (postback === 'ADMIN') {
                await this.showAdminDashboard(user)
            } else {
                // Fallback to admin command handler
                const { handleAdminCommand } = await import('../handlers/admin-handlers')
                await handleAdminCommand(user)
            }
        } catch (error) {
            console.error('Error handling admin postback:', error)
            await this.showAdminDashboard(user)
        }
    }

    /**
     * Xử lý admin gửi nút cho user - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminSendToUser(user: any, postback: string): Promise<void> {
        // ADMIN SEND TO USER ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Xử lý admin xem thông tin user - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminUserInfo(user: any, postback: string): Promise<void> {
        // ADMIN USER INFO ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Handle default message - CHỈ HIỂN THỊ MENU, KHÔNG TẠO SPAM
     */
    private static async handleDefaultMessage(user: any): Promise<void> {
        try {
            const context = await this.analyzeUserContext(user)

            switch (context.userType) {
                case UserType.ADMIN:
                    await this.showAdminDashboard(user)
                    break
                case UserType.REGISTERED_USER:
                case UserType.TRIAL_USER:
                    await this.showMainMenu(user)
                    break
                case UserType.PENDING_USER:
                    await this.showPendingUserWelcome(user, context)
                    break
                case UserType.EXPIRED_USER:
                    await this.sendMessage(user.facebook_id, '⏰ Tài khoản đã hết hạn. Vui lòng thanh toán để tiếp tục.')
                    break
                case UserType.NEW_USER:
                default:
                    // NEW USER: Không gửi welcome message mặc định
                    // Welcome message chỉ được gửi qua spam check system
                    console.log('New user default message - không gửi welcome để tránh spam')
                    break
            }
        } catch (error) {
            console.error('Error handling default message:', error)
            // Không gửi welcome message khi có lỗi để tránh spam
        }
    }

    /**
     * Send message helper
     */
    private static async sendMessage(facebookId: string, message: string): Promise<void> {
        try {
            await sendMessage(facebookId, message)
        } catch (error) {
            console.error('Error sending message:', error)
        }
    }

    /**
     * Send error message
     */
    private static async sendErrorMessage(facebookId: string): Promise<void> {
        try {
            await sendMessage(facebookId, CONFIG.ERRORS.INTERNAL_ERROR)
        } catch (error) {
            logError(error as Error, {
                operation: 'send_error_message',
                facebook_id: facebookId
            })
        }
    }

    /**
     * Send spam blocked message
     */
    private static async sendSpamBlockedMessage(facebookId: string, reason?: string): Promise<void> {
        try {
            await sendMessage(facebookId, '🚫 Bot đã tạm dừng do phát hiện spam')
            await sendMessage(facebookId, 'Nếu cần hỗ trợ, hãy liên hệ admin')

            await sendQuickReply(
                facebookId,
                'Liên hệ:',
                [
                    createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('🔄 THỬ LẠI SAU', 'MAIN_MENU')
                ]
            )
        } catch (error) {
            console.error('Error sending spam blocked message:', error)
        }
    }

    /**
     * Xử lý duyệt thanh toán cho user cụ thể - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminApproveUserPayment(adminUser: any, userId: string): Promise<void> {
        // ADMIN PAYMENT ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(adminUser.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(adminUser.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Xử lý từ chối thanh toán cho user cụ thể - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminRejectUserPayment(adminUser: any, userId: string): Promise<void> {
        // ADMIN PAYMENT REJECT ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(adminUser.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(adminUser.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }

    /**
     * Xử lý xem thanh toán của user cụ thể - ĐÃ LOẠI BỎ
     * TẤT CẢ QUẢN LÝ QUA TRANG WEB ADMIN
     */
    private static async handleAdminViewUserPayments(adminUser: any, userId: string): Promise<void> {
        // ADMIN VIEW PAYMENTS ĐÃ ĐƯỢC LOẠI BỎ HOÀN TOÀN
        await this.sendMessage(adminUser.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
        await this.sendMessage(adminUser.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
    }


}
