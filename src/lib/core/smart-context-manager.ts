import { supabaseAdmin } from '../supabase'
import { getBotSession } from '../utils'

// User type definitions - Simplified and clear
export enum UserType {
    ADMIN = 'admin',
    REGISTERED_USER = 'registered_user',
    TRIAL_USER = 'trial_user',
    PENDING_USER = 'pending_user', // ← THÊM MỚI: User đang chờ admin duyệt
    NEW_USER = 'new_user',
    EXPIRED_USER = 'expired_user'
}

export enum UserState {
    IDLE = 'idle',
    IN_REGISTRATION = 'in_registration',
    IN_LISTING = 'in_listing',
    IN_SEARCH = 'in_search',
    IN_ADMIN_CHAT = 'in_admin_chat',
    IN_PAYMENT = 'in_payment'
}

export interface UserContext {
    userType: UserType
    userState: UserState
    user: any
    session: any
    isInFlow: boolean
    flowType?: string
}

// Permission Matrix cho từng loại user
export interface UserPermissions {
    canUseBot: boolean
    canSearch: boolean
    canViewListings: boolean
    canCreateListings: boolean
    canContactSellers: boolean
    canMakePayments: boolean
    canUseAdminChat: boolean
    canAccessCommunity: boolean
    canUsePoints: boolean
    canAccessSettings: boolean
    maxListingsPerDay?: number
    maxSearchesPerDay?: number
    maxMessagesPerDay?: number
}

// Permission definitions cho từng user type
export const USER_PERMISSIONS: Record<UserType, UserPermissions> = {
    [UserType.ADMIN]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: true,
        canContactSellers: true,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: true,
        canUsePoints: true,
        canAccessSettings: true,
        maxListingsPerDay: 999,
        maxSearchesPerDay: 999,
        maxMessagesPerDay: 999
    },
    [UserType.REGISTERED_USER]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: true,
        canContactSellers: true,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: true,
        canUsePoints: true,
        canAccessSettings: true,
        maxListingsPerDay: 10,
        maxSearchesPerDay: 50,
        maxMessagesPerDay: 100
    },
    [UserType.TRIAL_USER]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: true,
        canContactSellers: true,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: true,
        canUsePoints: true,
        canAccessSettings: true,
        maxListingsPerDay: 5,
        maxSearchesPerDay: 20,
        maxMessagesPerDay: 50
    },
    [UserType.PENDING_USER]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: false, // ← GIỚI HẠN: Không được niêm yết
        canContactSellers: false, // ← GIỚI HẠN: Không được liên hệ người bán
        canMakePayments: false,
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false,
        maxListingsPerDay: 0,
        maxSearchesPerDay: 10,
        maxMessagesPerDay: 20
    },
    [UserType.NEW_USER]: {
        canUseBot: false,
        canSearch: false,
        canViewListings: false,
        canCreateListings: false,
        canContactSellers: false,
        canMakePayments: false,
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false,
        maxListingsPerDay: 0,
        maxSearchesPerDay: 0,
        maxMessagesPerDay: 5
    },
    [UserType.EXPIRED_USER]: {
        canUseBot: false,
        canSearch: false,
        canViewListings: false,
        canCreateListings: false,
        canContactSellers: false,
        canMakePayments: true, // ← Cho phép thanh toán để gia hạn
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false,
        maxListingsPerDay: 0,
        maxSearchesPerDay: 0,
        maxMessagesPerDay: 5
    }
}

// Simplified Context Manager - ĐƠN GIẢN VÀ RÕ RÀNG
export class SmartContextManager {

    /**
     * Phân tích ngữ cảnh ĐƠN GIẢN và CHÍNH XÁC của user
     */
    static async analyzeUserContext(user: any): Promise<UserContext> {
        try {
            // BƯỚC 1: KIỂM TRA ADMIN TRƯỚC (ưu tiên cao nhất)
            const isAdminUser = await this.detectAdmin(user.facebook_id)

            if (isAdminUser) {
                return {
                    userType: UserType.ADMIN,
                    userState: UserState.IDLE,
                    user,
                    session: null,
                    isInFlow: false
                }
            }

            // BƯỚC 2: LẤY THÔNG TIN USER TỪ DATABASE
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('facebook_id', user.facebook_id)
                .single()

            // BƯỚC 3: KIỂM TRA SESSION HIỆN TẠI
            const session = await getBotSession(user.facebook_id)

            // BƯỚC 4: XÁC ĐỊNH LOẠI USER - RÕ RÀNG
            let userType = UserType.NEW_USER
            let userState = UserState.IDLE

            if (userData) {
                // User đã tồn tại trong database
                if (userData.status === 'registered') {
                    userType = UserType.REGISTERED_USER
                } else if (userData.status === 'trial') {
                    userType = UserType.TRIAL_USER
                } else if (userData.status === 'pending') {
                    userType = UserType.PENDING_USER // ← THÊM MỚI: Xử lý pending user
                } else if (userData.status === 'expired') {
                    userType = UserType.EXPIRED_USER
                }

                // KIỂM TRA TRẠNG THÁI FLOW - ĐƠN GIẢN
                if (session?.current_flow) {
                    switch (session.current_flow) {
                        case 'registration':
                            userState = UserState.IN_REGISTRATION
                            break
                        case 'listing':
                            userState = UserState.IN_LISTING
                            break
                        case 'search':
                            userState = UserState.IN_SEARCH
                            break
                        case 'payment':
                            userState = UserState.IN_PAYMENT
                            break
                        default:
                            userState = UserState.IDLE
                    }
                }
            } else {
                // User mới hoàn toàn - CHẮC CHẮN
                userType = UserType.NEW_USER
                userState = UserState.IDLE
            }

            return {
                userType,
                userState,
                user: userData || user,
                session,
                isInFlow: userState !== UserState.IDLE,
                flowType: session?.current_flow
            }

        } catch (error) {
            console.error('Error analyzing user context:', error)
            // Fallback ĐƠN GIẢN: coi như new user
            return {
                userType: UserType.NEW_USER,
                userState: UserState.IDLE,
                user,
                session: null,
                isInFlow: false
            }
        }
    }

    /**
     * Phát hiện admin user - DEPRECATED: Now handled by FACEBOOK_PAGE_ID check
     */
    private static async detectAdmin(facebookId: string): Promise<boolean> {
        // New logic: Only fanpage messages are admin
        return facebookId === process.env.FACEBOOK_PAGE_ID
    }

    /**
     * Lấy menu phù hợp dựa trên ngữ cảnh
     */
    static getContextualMenu(context: UserContext): any[] {
        const { userType, userState, isInFlow } = context

        // Nếu đang trong flow, trả về menu phù hợp với flow hiện tại
        if (isInFlow) {
            return this.getFlowSpecificMenu(userState, context)
        }

        // Menu dựa trên loại user
        switch (userType) {
            case UserType.ADMIN:
                return this.getAdminMenu()
            case UserType.REGISTERED_USER:
            case UserType.TRIAL_USER:
                return this.getRegisteredUserMenu(context)
            case UserType.PENDING_USER:
                return this.getPendingUserMenu(context) // ← THÊM MỚI: Menu cho pending user
            case UserType.EXPIRED_USER:
                return this.getExpiredUserMenu()
            case UserType.NEW_USER:
            default:
                return this.getNewUserMenu()
        }
    }

    /**
     * Menu cho Admin
     */
    private static getAdminMenu(): any[] {
        return [
            { title: '💰 QUẢN LÝ THANH TOÁN', action: 'ADMIN_PAYMENTS', priority: 1 },
            { title: '👥 QUẢN LÝ NGƯỜI DÙNG', action: 'ADMIN_USERS', priority: 2 },
            { title: '🛒 QUẢN LÝ TIN ĐĂNG', action: 'ADMIN_LISTINGS', priority: 3 },
            { title: '📊 XEM THỐNG KÊ', action: 'ADMIN_STATS', priority: 4 },
            { title: '🔔 QUẢN LÝ THÔNG BÁO', action: 'ADMIN_NOTIFICATIONS', priority: 5 },
            { title: '⚙️ CẤU HÌNH HỆ THỐNG', action: 'ADMIN_SETTINGS', priority: 6 }
        ]
    }

    /**
     * Menu cho User đã đăng ký
     */
    private static getRegisteredUserMenu(context: UserContext): any[] {
        const menu = [
            { title: '🏠 TRANG CHỦ', action: 'MAIN_MENU', priority: 1 },
            { title: '🛒 NIÊM YẾT SẢN PHẨM', action: 'LISTING', priority: 2 },
            { title: '🔍 TÌM KIẾM', action: 'SEARCH', priority: 3 },
            { title: '👥 CỘNG ĐỒNG', action: 'COMMUNITY', priority: 4 },
            { title: '💰 THANH TOÁN', action: 'PAYMENT', priority: 5 },
            { title: '⭐ ĐIỂM THƯỞNG', action: 'POINTS', priority: 6 },
            { title: '⚙️ CÀI ĐẶT', action: 'SETTINGS', priority: 7 }
        ]

        // Thêm thông tin trạng thái nếu là trial user
        if (context.userType === UserType.TRIAL_USER && context.user?.membership_expires_at) {
            const daysLeft = Math.ceil((new Date(context.user.membership_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            if (daysLeft <= 3) {
                menu.unshift({ title: `⚠️ TRIAL HẾT HẠN: ${daysLeft} NGÀY`, action: 'PAYMENT_URGENT', priority: 0 })
            }
        }

        return menu
    }

    /**
     * Menu cho User đang chờ duyệt
     */
    private static getPendingUserMenu(context: UserContext): any[] {
        const menu = [
            { title: '🔍 TÌM KIẾM SẢN PHẨM', action: 'SEARCH', priority: 1 },
            { title: '👀 XEM TIN ĐĂNG', action: 'VIEW_LISTINGS', priority: 2 },
            { title: '💬 LIÊN HỆ ADMIN', action: 'CONTACT_ADMIN', priority: 3 },
            { title: 'ℹ️ THÔNG TIN', action: 'INFO', priority: 4 }
        ]

        // Thêm thông báo trạng thái chờ duyệt
        const pendingDays = context.user?.created_at ?
            Math.ceil((Date.now() - new Date(context.user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0

        if (pendingDays > 0) {
            menu.unshift({
                title: `⏳ CHỜ DUYỆT: ${pendingDays} NGÀY`,
                action: 'PENDING_STATUS',
                priority: 0
            })
        }

        return menu
    }

    /**
     * Menu cho User hết hạn
     */
    private static getExpiredUserMenu(): any[] {
        return [
            { title: '💰 THANH TOÁN ĐỂ TIẾP TỤC', action: 'PAYMENT', priority: 1 },
            { title: '📝 ĐĂNG KÝ LẠI', action: 'REGISTER', priority: 2 },
            { title: 'ℹ️ THÔNG TIN', action: 'INFO', priority: 3 }
        ]
    }

    /**
     * Menu cho User mới
     */
    private static getNewUserMenu(): any[] {
        return [
            { title: '🚀 ĐĂNG KÝ NGAY', action: 'REGISTER', priority: 1 },
            { title: 'ℹ️ TÌM HIỂU THÊM', action: 'INFO', priority: 2 },
            { title: '💬 HỖ TRỢ', action: 'SUPPORT', priority: 3 }
        ]
    }

    /**
     * Menu dành riêng cho từng flow
     */
    private static getFlowSpecificMenu(userState: UserState, context: UserContext): any[] {
        switch (userState) {
            case UserState.IN_REGISTRATION:
                return [
                    { title: '📝 TIẾP TỤC ĐĂNG KÝ', action: 'CONTINUE_REGISTRATION', priority: 1 },
                    { title: '❌ HỦY ĐĂNG KÝ', action: 'CANCEL_REGISTRATION', priority: 2 },
                    { title: '🏠 VỀ TRANG CHỦ', action: 'MAIN_MENU', priority: 3 }
                ]
            case UserState.IN_LISTING:
                return [
                    { title: '🛒 TIẾP TỤC NIÊM YẾT', action: 'CONTINUE_LISTING', priority: 1 },
                    { title: '❌ HỦY NIÊM YẾT', action: 'CANCEL_LISTING', priority: 2 },
                    { title: '🏠 VỀ TRANG CHỦ', action: 'MAIN_MENU', priority: 3 }
                ]
            case UserState.IN_SEARCH:
                return [
                    { title: '🔍 TIẾP TỤC TÌM KIẾM', action: 'CONTINUE_SEARCH', priority: 1 },
                    { title: '❌ HỦY TÌM KIẾM', action: 'CANCEL_SEARCH', priority: 2 },
                    { title: '🏠 VỀ TRANG CHỦ', action: 'MAIN_MENU', priority: 3 }
                ]
            default:
                return this.getNewUserMenu()
        }
    }

    /**
     * Lấy welcome message phù hợp với ngữ cảnh
     */
    static getContextualWelcomeMessage(context: UserContext): string {
        const { userType, userState, user, isInFlow } = context

        if (isInFlow) {
            return this.getFlowWelcomeMessage(userState, context)
        }

        switch (userType) {
            case UserType.ADMIN:
                return '🔧 ADMIN DASHBOARD\nChào mừng Admin! Bạn có toàn quyền quản lý hệ thống.'

            case UserType.REGISTERED_USER:
                const displayName = user?.name || 'bạn'
                return `✅ CHÀO MỪNG ${displayName.toUpperCase()}!\nBạn đã đăng ký thành công và có thể sử dụng đầy đủ tính năng.`

            case UserType.TRIAL_USER:
                const daysLeft = user?.membership_expires_at ?
                    Math.ceil((new Date(user.membership_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 7
                return `🎁 CHÀO MỪNG BẠN ĐẾN VỚI GÓI DÙNG THỬ!\nBạn còn ${daysLeft} ngày sử dụng miễn phí.\n💡 Hãy khám phá các tính năng của bot!`

            case UserType.PENDING_USER:
                const pendingDays = user?.created_at ?
                    Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
                return `⏳ CHÀO MỪNG ${(user?.name || 'bạn').toUpperCase()}!\n\n📋 Trạng thái: Đang chờ Admin duyệt (${pendingDays} ngày)\n🔍 Bạn có thể tìm kiếm và xem sản phẩm\n🚫 Chưa thể niêm yết hoặc liên hệ người bán\n\n💡 Admin sẽ duyệt sớm nhất có thể!`

            case UserType.EXPIRED_USER:
                return '⏰ TÀI KHOẢN ĐÃ HẾT HẠN\nĐể tiếp tục sử dụng, vui lòng thanh toán để gia hạn.'

            case UserType.NEW_USER:
            default:
                return '🎉 CHÀO MỪNG ĐẾN VỚI BOT Tân Dậu - Hỗ Trợ Chéo!\n🤝 Cộng đồng dành riêng cho những người con Tân Dậu.\n\n💡 Để bắt đầu, bạn cần đăng ký thành viên.'
        }
    }

    /**
     * Lấy permissions cho user type
     */
    static getUserPermissions(userType: UserType): UserPermissions {
        return USER_PERMISSIONS[userType] || USER_PERMISSIONS[UserType.NEW_USER]
    }

    /**
     * Kiểm tra permission cho user
     */
    static hasPermission(userType: UserType, permission: keyof UserPermissions): boolean {
        const permissions = this.getUserPermissions(userType)
        return permissions[permission] === true
    }

    /**
     * Kiểm tra rate limit cho user
     */
    static async checkRateLimit(userType: UserType, action: 'listings' | 'searches' | 'messages', facebookId: string): Promise<boolean> {
        const permissions = this.getUserPermissions(userType)
        const limit = permissions[`max${action.charAt(0).toUpperCase() + action.slice(1)}PerDay` as keyof UserPermissions] as number

        if (!limit || limit >= 999) return true // No limit for admin/unlimited users

        // TODO: Implement rate limiting logic with database tracking
        // For now, return true (no rate limiting implemented yet)
        return true
    }

    /**
     * Welcome message cho từng flow
     */
    private static getFlowWelcomeMessage(userState: UserState, context: UserContext): string {
        switch (userState) {
            case UserState.IN_REGISTRATION:
                return '📝 ĐANG ĐĂNG KÝ\nBạn đang trong quá trình đăng ký.\nHãy tiếp tục hoặc hủy nếu muốn dừng lại.'

            case UserState.IN_LISTING:
                return '🛒 ĐANG NIÊM YẾT\nBạn đang tạo tin đăng mới.\nHãy tiếp tục hoặc hủy nếu muốn dừng lại.'

            case UserState.IN_SEARCH:
                return '🔍 ĐANG TÌM KIẾM\nBạn đang trong chế độ tìm kiếm nâng cao.\nHãy tiếp tục hoặc hủy nếu muốn dừng lại.'

            default:
                return '👋 Chào mừng bạn quay trở lại!'
        }
    }
}
