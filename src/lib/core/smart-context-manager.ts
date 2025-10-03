import { supabaseAdmin } from '../supabase'
import { getBotSession } from '../utils'

// Định nghĩa các loại user và trạng thái - ĐƠN GIẢN HÓA
export enum UserType {
    ADMIN = 'admin',
    REGISTERED_USER = 'registered_user',
    TRIAL_USER = 'trial_user',
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
     * Phát hiện admin user
     */
    private static async detectAdmin(facebookId: string): Promise<boolean> {
        // Kiểm tra environment variables trước
        const adminIds = process.env.ADMIN_IDS || ''
        const envAdmins = adminIds.split(',').map(id => id.trim()).filter(id => id.length > 0)

        if (envAdmins.includes(facebookId)) {
            return true
        }

        // Kiểm tra database
        try {
            const { data } = await supabaseAdmin
                .from('admin_users')
                .select('is_active')
                .eq('facebook_id', facebookId)
                .eq('is_active', true)
                .maybeSingle()

            return !!data?.is_active
        } catch (error) {
            console.error('Error checking admin status:', error)
            return false
        }
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

            case UserType.EXPIRED_USER:
                return '⏰ TÀI KHOẢN ĐÃ HẾT HẠN\nĐể tiếp tục sử dụng, vui lòng thanh toán để gia hạn.'

            case UserType.NEW_USER:
            default:
                return '🎉 CHÀO MỪNG ĐẾN VỚI BOT Tân Dậu - Hỗ Trợ Chéo!\n🤝 Cộng đồng dành riêng cho những người con Tân Dậu.\n\n💡 Để bắt đầu, bạn cần đăng ký thành viên.'
        }
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
