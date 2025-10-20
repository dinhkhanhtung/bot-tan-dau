/**
 * Smart Menu Service - Quản lý menu động theo ngữ cảnh user
 * Đơn giản hóa trải nghiệm người dùng với menu phù hợp
 */

import { sendQuickReply, createQuickReply } from '../facebook-api'
import { logger } from '../logger'

export enum MenuContext {
    CHOOSING_MODE = 'choosing_mode',    // Menu chọn chế độ sử dụng
    BOT_FEATURES = 'bot_features',      // Menu tính năng bot
    ADMIN_CHAT = 'admin_chat',          // Menu khi chat với admin
    BACK_TO_MAIN = 'back_to_main'       // Menu về trang chủ
}

export interface MenuOption {
    title: string
    payload: string
    description?: string
}

export class SmartMenuService {
    /**
     * Lấy menu phù hợp với ngữ cảnh hiện tại
     */
    static getMenuForContext(context: MenuContext): MenuOption[] {
        switch (context) {
            case MenuContext.CHOOSING_MODE:
                return this.getChoosingModeMenu()

            case MenuContext.BOT_FEATURES:
                return this.getBotFeaturesMenu()

            case MenuContext.ADMIN_CHAT:
                return this.getAdminChatMenu()

            case MenuContext.BACK_TO_MAIN:
                return this.getBackToMainMenu()

            default:
                return this.getDefaultMenu()
        }
    }

    /**
     * Gửi menu chọn chế độ sử dụng
     */
    static async sendChoosingModeMenu(facebookId: string): Promise<void> {
        try {
            const menuOptions = this.getChoosingModeMenu()

            await sendQuickReply(facebookId,
                '🎯 CHỌN CHẾ ĐỘ SỬ DỤNG\n━━━━━━━━━━━━━━━━━━━━\nBạn muốn làm gì hôm nay?',
                menuOptions.map(option => createQuickReply(option.title, option.payload))
            )

            logger.info('Sent choosing mode menu', { facebookId })
        } catch (error) {
            logger.error('Error sending choosing mode menu', { facebookId, error })
        }
    }

    /**
     * Gửi menu tính năng bot
     */
    static async sendBotFeaturesMenu(facebookId: string): Promise<void> {
        try {
            const menuOptions = this.getBotFeaturesMenu()

            await sendQuickReply(facebookId,
                '🤖 TÍNH NĂNG BOT TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\nChọn chức năng bạn muốn sử dụng:',
                menuOptions.map(option => createQuickReply(option.title, option.payload))
            )

            logger.info('Sent bot features menu', { facebookId })
        } catch (error) {
            logger.error('Error sending bot features menu', { facebookId, error })
        }
    }

    /**
     * Gửi menu khi chat với admin
     */
    static async sendAdminChatMenu(facebookId: string): Promise<void> {
        try {
            const menuOptions = this.getAdminChatMenu()

            await sendQuickReply(facebookId,
                '💬 HỖ TRỢ TỪ ADMIN\n━━━━━━━━━━━━━━━━━━━━\nAdmin Đinh Khánh Tùng sẽ hỗ trợ bạn:',
                menuOptions.map(option => createQuickReply(option.title, option.payload))
            )

            logger.info('Sent admin chat menu', { facebookId })
        } catch (error) {
            logger.error('Error sending admin chat menu', { facebookId, error })
        }
    }

    /**
     * Menu chọn chế độ sử dụng (lựa chọn chính)
     */
    private static getChoosingModeMenu(): MenuOption[] {
        return [
            {
                title: '🚀 DÙNG BOT',
                payload: 'USE_BOT',
                description: 'Tự động mua bán với cộng đồng'
            },
            {
                title: '💬 CHAT VỚI ADMIN',
                payload: 'CHAT_ADMIN',
                description: 'Đinh Khánh Tùng hỗ trợ trực tiếp'
            }
        ]
    }

    /**
     * Menu tính năng bot
     */
    private static getBotFeaturesMenu(): MenuOption[] {
        return [
            {
                title: '🚀 ĐĂNG KÝ THÀNH VIÊN',
                payload: 'REGISTER',
                description: 'Đăng ký để sử dụng đầy đủ tính năng'
            },
            {
                title: '🛒 ĐĂNG TIN BÁN HÀNG',
                payload: 'LISTING',
                description: 'Đăng sản phẩm để bán'
            },
            {
                title: '🔍 TÌM KIẾM SẢN PHẨM',
                payload: 'SEARCH',
                description: 'Tìm sản phẩm cần mua'
            },
            {
                title: '👥 CỘNG ĐỒNG TÂN DẬU',
                payload: 'COMMUNITY',
                description: 'Kết nối với cộng đồng'
            },
            {
                title: '💬 LIÊN HỆ ADMIN',
                payload: 'CONTACT_ADMIN',
                description: 'Nhận hỗ trợ từ admin'
            },
            {
                title: '🏠 VỀ MENU CHÍNH',
                payload: 'BACK_TO_MAIN',
                description: 'Quay lại lựa chọn chính'
            }
        ]
    }

    /**
     * Menu khi chat với admin
     */
    private static getAdminChatMenu(): MenuOption[] {
        return [
            {
                title: '🏠 VỀ MENU CHÍNH',
                payload: 'BACK_TO_MAIN',
                description: 'Quay lại lựa chọn chế độ sử dụng'
            },
            {
                title: '❓ TRỢ GIÚP',
                payload: 'GET_HELP',
                description: 'Xem hướng dẫn sử dụng'
            }
        ]
    }

    /**
     * Menu dự phòng khi có lỗi
     */
    private static getBackToMainMenu(): MenuOption[] {
        return [
            {
                title: '🏠 VỀ MENU CHÍNH',
                payload: 'BACK_TO_MAIN',
                description: 'Quay lại trang chủ'
            }
        ]
    }

    /**
     * Menu mặc định khi không xác định được ngữ cảnh
     */
    private static getDefaultMenu(): MenuOption[] {
        return this.getChoosingModeMenu()
    }

    /**
     * Lấy thông tin mô tả cho một payload cụ thể
     */
    static getOptionDescription(payload: string): string | null {
        const allOptions = [
            ...this.getChoosingModeMenu(),
            ...this.getBotFeaturesMenu(),
            ...this.getAdminChatMenu()
        ]

        const option = allOptions.find(opt => opt.payload === payload)
        return option?.description || null
    }

    /**
     * Kiểm tra payload có hợp lệ không
     */
    static isValidPayload(payload: string): boolean {
        const allOptions = [
            ...this.getChoosingModeMenu(),
            ...this.getBotFeaturesMenu(),
            ...this.getAdminChatMenu()
        ]

        return allOptions.some(option => option.payload === payload)
    }
}
