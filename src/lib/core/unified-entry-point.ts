import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { CONFIG } from '../config'
import { logger, logUserAction, logBotEvent, logError } from '../logger'
import { errorHandler, createUserError, ErrorType } from '../error-handler'
import { getUserByFacebookId, getBotSession, getBotStatus } from '../database-service'
import { supabaseAdmin } from '../supabase'
import { welcomeService, WelcomeType } from '../welcome-service'
import { messageProcessor } from './message-processor'
import { FlowManager } from './flow-manager'
import { FlowInitializer } from './flow-initializer'

/**
 * Unified Bot System - Main entry point for bot message processing
 * Handles all incoming messages with proper routing and flow management
 */
export class UnifiedBotSystem {
    private static initialized = false

    /**
     * Initialize the bot system (call once at startup)
     */
    static initialize(): void {
        if (this.initialized) {
            console.log('⚠️ Bot system already initialized')
            return
        }

        console.log('🚀 Initializing Unified Bot System...')
        FlowInitializer.initialize()
        this.initialized = true
        console.log('✅ Unified Bot System initialized successfully')
    }

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



            // Step 3: Check user session and prioritize active flows
            const session = await this.getUserSession(user.facebook_id)

            // CHUẨN HÓA: Lấy current_flow từ session (đã được chuẩn hóa trong getBotSession)
            const currentFlow = session?.current_flow || null

            logger.debug('Session check', {
                currentFlow,
                session,
                facebook_id: user.facebook_id,
                hasSession: !!session,
                sessionData: session?.data
            })

            // Step 3: Use FlowManager to handle message
            if (isPostback && postback) {
                await FlowManager.handlePostback(user, postback)
            } else if (text) {
                await FlowManager.handleMessage(user, text)
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
     * Xử lý flow message - ĐÃ ĐƠN GIẢN HÓA
     */
    private static async handleFlowMessage(user: any, text: string, session?: any): Promise<void> {
        try {
            const currentFlow = session?.current_flow || null

            // Kiểm tra session hợp lệ
            if (!session || !currentFlow) {
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Xử lý các lệnh thoát flow
            if (text && this.isExitCommand(text)) {
                await this.handleFlowExit(user, currentFlow)
                return
            }

            // Route đến flow handler phù hợp - CHỈ ROUTE, KHÔNG XỬ LÝ LOGIC
            switch (currentFlow) {
                case 'registration':
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
                    await this.sendErrorMessage(user.facebook_id)
            }
        } catch (error) {
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

                    if (existingSession && existingSession.current_flow === 'registration') {
                        // User đã trong flow registration, không gửi lại welcome
                        console.log('User already in registration flow, skipping duplicate welcome')
                        return
                    }

                    // Đặt cờ để tránh gửi welcome message khi bắt đầu đăng ký
                    await supabaseAdmin
                        .from('bot_sessions')
                        .upsert({
                            facebook_id: user.facebook_id,
                            current_flow: 'registration',
                            step: 0,
                            current_step: 0,
                            data: {
                                skip_welcome: true // Cờ này để tránh xung đột với welcome message
                            },
                            updated_at: new Date().toISOString()
                        })

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

                case 'EXIT_BOT':
                    const { handleBotExit } = await import('../anti-spam')
                    await handleBotExit(user.facebook_id)
                    break
                case 'CHAT_BOT':
                    // User ấn nút "Chat Bot" - đưa vào bot mode
                    // Kiểm tra xem có phải admin không
                    if (user.facebook_id === process.env.FACEBOOK_PAGE_ID) {
                        // Admin chỉ nhận thông báo chuyển hướng đến webapp
                        await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
                        await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
                        await this.sendMessage(user.facebook_id, '📧 Liên hệ admin để được cấp tài khoản quản lý.')
                    } else {
                        // User thường - đưa vào bot mode
                        const { setUserBotMode } = await import('../anti-spam')
                        await setUserBotMode(user.facebook_id)

                        // Hiện menu chào mừng hấp dẫn
                        await this.showWelcomeBotMenu(user)
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
                // Only log as error if it's not the expected "no user found" error
                if (error && error.code !== 'PGRST116' && !error.message.includes('Cannot coerce the result to a single JSON object')) {
                    console.error('❌ Database error getting user data for:', user.facebook_id, 'Error:', error.message)
                } else {
                    console.log('ℹ️ No user data found for:', user.facebook_id, '(expected for new users)')
                }
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
            // Admin chỉ nhận thông báo chuyển hướng đến webapp
            await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
            await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
            await this.sendMessage(user.facebook_id, '📧 Liên hệ admin để được cấp tài khoản quản lý.')
        } catch (error) {
            console.error('Error handling admin text:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
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
                await this.handleAdminTextMessage(user, text)
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

            // Nếu đang trong BẤT KỲ flow nào (registration, listing, search), xử lý flow TRƯỚC - ƯU TIÊN CAO NHẤT
            if (currentFlow && ['registration', 'listing', 'search'].includes(currentFlow)) {
                logger.info('User in active flow - BYPASSING ALL COUNTER AND WELCOME LOGIC', {
                    facebook_id: user.facebook_id,
                    currentFlow,
                    step: session?.step,
                    text: text
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
                    // Tin nhắn đầu tiên - chỉ hiển thị thông báo chào mừng
                    const { sendMessage } = await import('../facebook-api')

                    // Tin nhắn 1: Chỉ chào mừng, không kèm nút
                    const welcomeMessage = `🎉 Chào bạn ghé thăm Đinh Khánh Tùng!\n👋 Hôm nay mình có thể giúp gì cho bạn?`
                    await sendMessage(user.facebook_id, welcomeMessage)
                } else if (currentCount === 2 && shouldShowButton) {
                    console.log(`🎯 Executing count=2 logic for ${user.facebook_id}`)
                    // Tin nhắn thứ 2 - hiển thị thông báo mời sử dụng bot
                    const { showBotInvitation } = await import('../anti-spam')
                    await showBotInvitation(user.facebook_id)
                } else if (currentCount === 3 && shouldShowButton) {
                    console.log(`🎯 Executing count=3 logic for ${user.facebook_id}`)
                    // Tin nhắn thứ 3 - chỉ thông báo admin đã nhận tin
                    await sendMessage(user.facebook_id, '💬 Đinh Khánh Tùng đã nhận được tin nhắn của bạn và sẽ sớm phản hồi!')
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
            await sendMessage(user.facebook_id, '💰 Phí sử dụng:\n• Trial 3 ngày miễn phí\n• Phí duy trì: 3,000đ/ngày\n• Gói tối thiểu: 3 ngày = 9.000 ₫')
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
            await sendMessage(user.facebook_id, 'Để được hỗ trợ, vui lòng liên hệ:\n📞 Hotline: 0982581222\n📧 Email: dinhkhanhtung@outlook.com\n🏦 Ngân hàng: BIDV\n👤 Chủ TK: Đinh Khánh Tùng\n⏰ Thời gian: 8:00 - 22:00')
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
            await sendMessage(user.facebook_id, 'Chào mừng bạn đến với cộng đồng Tân Dậu Việt!')
            await sendMessage(user.facebook_id, 'Cùng nhau kết nối - cùng nhau thịnh vượng')
            await sendMessage(user.facebook_id, '🎁 QUYỀN LỢI: Trial 3 ngày miễn phí')
            await sendMessage(user.facebook_id, '💰 Chỉ với 3,000đ mỗi ngày bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu')
            await sendMessage(user.facebook_id, '💳 Phí duy trì: 3,000đ/ngày')
            await sendMessage(user.facebook_id, '📅 Gói tối thiểu: 3 ngày = 9.000 ₫')

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

            if (existingSession && existingSession.current_flow === 'registration') {
                // User đã trong flow registration, chỉ gửi lại hướng dẫn hiện tại
                console.log('User already in registration flow, resuming current step')
                const { AuthFlow } = await import('../flows/auth-flow')
                const authFlow = new AuthFlow()
                await authFlow.handleRegistration(user)
                return
            }

            // Nếu không có session hoặc session không phải registration, bắt đầu flow mới
            console.log('Starting new registration flow for user:', user.facebook_id)
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
            await supabaseAdmin
                .from('bot_sessions')
                .delete()
                .eq('facebook_id', user.facebook_id)
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
     * Xử lý admin postback - ĐÃ ĐƠN GIẢN HÓA
     */
    private static async handleAdminPostback(user: any, postback: string): Promise<void> {
        try {
            console.log('🔧 Admin postback received:', postback)

            // TẤT CẢ ADMIN POSTBACK CHUYỂN HƯỚNG ĐẾN WEB DASHBOARD
            await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
            await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
            await this.sendMessage(user.facebook_id, '📧 Liên hệ admin để được cấp tài khoản quản lý.')
        } catch (error) {
            console.error('Error handling admin postback:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }





    /**
     * Handle default message - CHỈ HIỂN THỊ MENU, KHÔNG TẠO SPAM
     */
    private static async handleDefaultMessage(user: any): Promise<void> {
        try {
            const context = await this.analyzeUserContext(user)

            switch (context.userType) {
                case UserType.ADMIN:
                    // Admin chỉ nhận thông báo chuyển hướng đến webapp
                    await this.sendMessage(user.facebook_id, '🔧 Hệ thống admin đã được chuyển sang trang web.')
                    await this.sendMessage(user.facebook_id, '🌐 Truy cập: https://bot-tan-dau.vercel.app/admin/login')
                    await this.sendMessage(user.facebook_id, '📧 Liên hệ admin để được cấp tài khoản quản lý.')
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
     * Hiển thị menu chào mừng hấp dẫn khi user vào bot mode
     */
    private static async showWelcomeBotMenu(user: any): Promise<void> {
        try {
            const { sendMessage, sendQuickReply, createQuickReply } = await import('../facebook-api')
            const { BOT_INFO } = await import('../constants')

            // Gửi thông báo chào mừng hấp dẫn
            await sendMessage(user.facebook_id, '🌟 CHÀO MỪNG BẠN ĐẾN VỚI BOT TÂN DẬU - HỖ TRỢ CHÉO! 🌟')
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, `💰 ${BOT_INFO.PRICING_MESSAGE}`)
            await sendMessage(user.facebook_id, `🏆 ${BOT_INFO.SLOGAN}`)
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')

            // Hiển thị menu chức năng với icon đẹp
            await sendQuickReply(
                user.facebook_id,
                '🚀 Bạn muốn khám phá gì hôm nay?',
                [
                    createQuickReply('🛒 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('📝 ĐĂNG BÁN/CẬP NHẬT', 'LISTING'),
                    createQuickReply('ℹ️ THÔNG TIN CHI TIẾT', 'INFO'),
                    createQuickReply('💬 HỖ TRỢ TRỰC TIẾP', 'CONTACT_ADMIN'),
                    createQuickReply('🚪 THOÁT BOT', 'EXIT_BOT')
                ]
            )
        } catch (error) {
            console.error('Error showing welcome bot menu:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }


}
