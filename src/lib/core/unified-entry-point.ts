import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { updateBotSession } from '../utils'

// Unified Bot System - Hệ thống bot thống nhất, thay thế cả Unified Entry Point và Message Router
export class UnifiedBotSystem {

    /**
     * Xử lý TẤT CẢ tin nhắn - đây là điểm vào DUY NHẤT
     */
    static async handleMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        try {
            console.log('🔍 Received message from user:', {
                facebook_id: user.facebook_id,
                text: text,
                isPostback: isPostback,
                postback: postback
            })

            // Bước 1: KIỂM TRA ADMIN TRƯỚC (ưu tiên cao nhất)
            const isAdminUser = await this.checkAdminStatus(user.facebook_id)

            if (isAdminUser) {
                console.log('✅ User is admin, handling admin message')
                await this.handleAdminMessage(user, text, isPostback, postback)
                return
            }

            // Kiểm tra lệnh admin đặc biệt
            if (text && (text.toLowerCase().includes('/admin') || text.toLowerCase().includes('admin'))) {
                console.log('🔍 Admin command detected, checking admin status again')
                const isAdminUser2 = await this.checkAdminStatus(user.facebook_id)
                if (isAdminUser2) {
                    console.log('✅ User is admin via command, showing admin dashboard')
                    await this.showAdminDashboard(user)
                    return
                }
            }

            // Bước 2: KIỂM TRA ADMIN CHAT MODE
            const isInAdminChat = await this.checkAdminChatMode(user.facebook_id)
            if (isInAdminChat) {
                await this.handleAdminChatMessage(user, text)
                return
            }

            // Bước 3: KIỂM TRA ANTI-SPAM (chỉ cho non-admin, non-flow users)
            const session = await this.getUserSession(user.facebook_id)
            const currentFlow = session?.current_flow || null

            // Chỉ kiểm tra spam nếu không trong flow hợp lệ
            if (!currentFlow) {
                // Lấy thông tin user để xác định trạng thái
                const context = await this.analyzeUserContext(user)
                const userStatus = context.userType === UserType.REGISTERED_USER ? 'registered' :
                                 context.userType === UserType.TRIAL_USER ? 'trial' : 'unregistered'

                const spamCheck = await this.checkSpamStatus(user.facebook_id, text, isPostback, userStatus, currentFlow)
                if (spamCheck.shouldStop) {
                    await this.sendSpamBlockedMessage(user.facebook_id, spamCheck.reason)
                    return
                }
            }

            // Bước 4: XỬ LÝ FLOW NẾU USER ĐANG TRONG FLOW
            if (session?.current_flow) {
                await this.handleFlowMessage(user, text, session)
                return
            }

            // Bước 5: XỬ LÝ TIN NHẮN THƯỜNG
            if (isPostback && postback) {
                await this.handlePostbackAction(user, postback)
            } else if (text) {
                await this.handleTextMessage(user, text)
            } else {
                await this.handleDefaultMessage(user)
            }

        } catch (error) {
            console.error('Error in unified bot system:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Kiểm tra trạng thái admin
     */
    private static async checkAdminStatus(facebookId: string): Promise<boolean> {
        try {
            console.log('🔍 Checking admin status for:', facebookId)
            const { isAdmin } = await import('../handlers/admin-handlers')
            const result = await isAdmin(facebookId)
            console.log('🔍 Admin check result:', result)
            return result
        } catch (error) {
            console.error('Error checking admin status:', error)
            return false
        }
    }

    /**
     * Kiểm tra admin chat mode
     */
    private static async checkAdminChatMode(facebookId: string): Promise<boolean> {
        try {
            const { isUserInAdminChat } = await import('../admin-chat')
            return await isUserInAdminChat(facebookId)
        } catch (error) {
            console.error('Error checking admin chat mode:', error)
            return false
        }
    }

    /**
     * Lấy user session
     */
    private static async getUserSession(facebookId: string): Promise<any> {
        try {
            const { getBotSession } = await import('../utils')
            return await getBotSession(facebookId)
        } catch (error) {
            console.error('Error getting user session:', error)
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
     * Xử lý tin nhắn của admin
     */
    private static async handleAdminMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        try {
            // Admin có toàn quyền, không bị giới hạn gì
            if (isPostback && postback) {
                await this.handleAdminPostback(user, postback)
            } else if (text) {
                await this.handleAdminTextMessage(user, text)
            } else {
                await this.showAdminDashboard(user)
            }
        } catch (error) {
            console.error('Error handling admin message:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý admin chat message
     */
    private static async handleAdminChatMessage(user: any, text: string): Promise<void> {
        try {
            const { handleUserMessageInAdminChat } = await import('../admin-chat')
            if (text) {
                await handleUserMessageInAdminChat(user.facebook_id, text)
            }
        } catch (error) {
            console.error('Error handling admin chat message:', error)
        }
    }

    /**
     * Xử lý flow message
     */
    private static async handleFlowMessage(user: any, text: string, session?: any): Promise<void> {
        try {
            // Kiểm tra session hợp lệ
            if (!session || !session.current_flow) {
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Xử lý các lệnh thoát flow
            if (text && this.isExitCommand(text)) {
                await this.handleFlowExit(user, session.current_flow)
                return
            }

            // Route đến flow handler phù hợp
            switch (session.current_flow) {
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
            console.error('Error handling flow message:', error)
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
                    await this.startRegistration(user)
                    break
                case 'MAIN':
                    if (params[0] === 'MENU') {
                        await this.showMainMenu(user)
                    }
                    break
                case 'ADMIN':
                    await this.showAdminDashboard(user)
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
            // 1. Kiểm tra Admin trước (ưu tiên cao nhất)
            const isAdminUser = await this.checkAdminStatus(user.facebook_id)
            if (isAdminUser) {
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

            // KIỂM TRA USER CÓ PHẢI LÀ DỮ LIỆU TEST KHÔNG
            if (userData.name === 'User' && userData.phone?.startsWith('temp_')) {
                console.log('🚫 Found test user data, treating as NEW USER')
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
            const { handleAdminCommand } = await import('../handlers/admin-handlers')
            await handleAdminCommand(user)
        } catch (error) {
            console.error('Error handling admin text:', error)
            await this.showAdminDashboard(user)
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
     * Xử lý new user text - GIẢM SPAM
     */
    private static async handleNewUserText(user: any, text: string): Promise<void> {
        try {
            if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
                await this.startRegistration(user)
            } else if (text.includes('thông tin') || text.includes('THÔNG TIN')) {
                await this.showBotInfo(user)
            } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
                await this.showSupportInfo(user)
            } else {
                // Thay vì hiển thị welcome message đầy đủ, chỉ gửi thông báo ngắn gọn
                await this.sendMessage(user.facebook_id, '👋 Chào bạn! Để sử dụng bot, bạn cần đăng ký thành viên trước.')
                await this.sendMessage(user.facebook_id, '💡 Nhập "đăng ký" để bắt đầu hoặc chờ admin hỗ trợ.')
            }
        } catch (error) {
            console.error('Error handling new user text:', error)
            await this.sendMessage(user.facebook_id, '👋 Chào bạn! Để sử dụng bot, bạn cần đăng ký thành viên trước.')
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
     * Bắt đầu registration flow
     */
    private static async startRegistration(user: any): Promise<void> {
        try {
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
     * Show welcome message cho new user - CHỈ HIỂN THỊ 1 LẦN
     */
    private static async showWelcomeMessage(user: any): Promise<void> {
        try {
            // Kiểm tra xem đã gửi thông báo chào mừng chưa
            const { supabaseAdmin } = await import('../supabase')
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('welcome_message_sent')
                .eq('facebook_id', user.facebook_id)
                .single()

            // Nếu đã gửi thông báo chào mừng rồi, chỉ hiển thị thông báo đơn giản
            if (existingUser?.welcome_message_sent) {
                await sendMessage(user.facebook_id, '👋 Chào bạn! Để sử dụng bot, bạn cần đăng ký thành viên trước.')
                await sendMessage(user.facebook_id, '💡 Nhập "đăng ký" để bắt đầu hoặc chờ admin hỗ trợ.')
                return
            }

            // Lần đầu tiên - gửi thông báo chào mừng đầy đủ
            await sendTypingIndicator(user.facebook_id)

            // Get Facebook name for personalized greeting
            const { getFacebookDisplayName } = await import('../utils')
            const facebookName = await getFacebookDisplayName(user.facebook_id)
            const displayName = facebookName || 'bạn'

            await sendMessage(user.facebook_id, `🎉 Chào mừng ${displayName} đến với Đinh Khánh Tùng!`)
            await sendMessage(user.facebook_id, '👋 Hôm nay mình có thể giúp gì cho bạn?')
            await sendMessage(user.facebook_id, '🌟 Có thể bạn cũng muốn tham gia Tân Dậu - Hỗ Trợ Chéo')
            await sendMessage(user.facebook_id, '🤝 Nơi đây chúng ta có thể cùng nhau kết nối - Cùng nhau thịnh vượng!')

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                    createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
                ]
            )

            // Đánh dấu đã gửi thông báo chào mừng
            try {
                await supabaseAdmin
                    .from('users')
                    .upsert({
                        facebook_id: user.facebook_id,
                        welcome_message_sent: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'facebook_id'
                    })
            } catch (error) {
                console.error('Error marking welcome message sent:', error)
            }
        } catch (error) {
            console.error('Error showing welcome message:', error)
        }
    }

    /**
     * Show main menu cho registered/trial users
     */
    private static async showMainMenu(user: any): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            const context = await this.analyzeUserContext(user)
            const displayName = context.user?.name || 'bạn'

            let statusText = '✅ Đã đăng ký'
            if (context.userType === UserType.TRIAL_USER && context.user?.membership_expires_at) {
                const daysLeft = Math.ceil((new Date(context.user.membership_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                // Chỉ hiển thị thông tin trial nếu còn thời gian hợp lệ
                if (daysLeft > 0) {
                    statusText = `📅 Trial còn ${daysLeft} ngày`
                } else {
                    statusText = '⏰ Trial đã hết hạn - Vui lòng thanh toán'
                }
            }

            await sendMessage(user.facebook_id, '🏠 TRANG CHỦ Tân Dậu - Hỗ Trợ Chéo')
            await sendMessage(user.facebook_id, `👋 Chào mừng ${displayName}!`)
            await sendMessage(user.facebook_id, `📊 Trạng thái: ${statusText}`)

            const menuOptions = [
                createQuickReply('🛒 NIÊM YẾT SẢN PHẨM', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT')
            ]

            await sendQuickReply(user.facebook_id, 'Chọn chức năng:', menuOptions)
        } catch (error) {
            console.error('Error showing main menu:', error)
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
                createQuickReply('💰 QUẢN LÝ THANH TOÁN', 'ADMIN_PAYMENTS'),
                createQuickReply('👥 QUẢN LÝ NGƯỜI DÙNG', 'ADMIN_USERS'),
                createQuickReply('🛒 QUẢN LÝ TIN ĐĂNG', 'ADMIN_LISTINGS'),
                createQuickReply('📊 XEM THỐNG KÊ', 'ADMIN_STATS')
            ]

            await sendQuickReply(user.facebook_id, 'Chọn chức năng:', adminOptions)
        } catch (error) {
            console.error('Error showing admin dashboard:', error)
        }
    }

    /**
     * Show bot info
     */
    private static async showBotInfo(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, 'ℹ️ Bot Tân Dậu - Hỗ Trợ Chéo dành riêng cho cộng đồng những người con Tân Dậu (sinh năm 1981)')
            await sendMessage(user.facebook_id, '💡 Để sử dụng đầy đủ tính năng, bạn cần đăng ký thành viên')

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🚀 ĐĂNG KÝ', 'REGISTER'),
                    createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
                ]
            )
        } catch (error) {
            console.error('Error showing bot info:', error)
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
     * Show support info
     */
    private static async showSupportInfo(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, '💬 Để được hỗ trợ, vui lòng liên hệ admin')

            await sendQuickReply(
                user.facebook_id,
                'Liên hệ:',
                [
                    createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('📧 EMAIL', 'EMAIL_ADMIN')
                ]
            )
        } catch (error) {
            console.error('Error showing support info:', error)
        }
    }

    /**
     * Xử lý admin postback
     */
    private static async handleAdminPostback(user: any, postback: string): Promise<void> {
        try {
            const { handleAdminCommand } = await import('../handlers/admin-handlers')
            await handleAdminCommand(user)
        } catch (error) {
            console.error('Error handling admin postback:', error)
            await this.showAdminDashboard(user)
        }
    }

    /**
     * Handle default message - GIẢM SPAM CHO NEW USER
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
                    // Thay vì hiển thị welcome message đầy đủ, chỉ gửi thông báo ngắn gọn
                    await this.sendMessage(user.facebook_id, '👋 Chào bạn! Để sử dụng bot, bạn cần đăng ký thành viên trước.')
                    await this.sendMessage(user.facebook_id, '💡 Nhập "đăng ký" để bắt đầu hoặc chờ admin hỗ trợ.')
                    break
            }
        } catch (error) {
            console.error('Error handling default message:', error)
            await this.sendMessage(user.facebook_id, '👋 Chào bạn! Để sử dụng bot, bạn cần đăng ký thành viên trước.')
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
            await sendMessage(facebookId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        } catch (error) {
            console.error('Error sending error message:', error)
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


}
