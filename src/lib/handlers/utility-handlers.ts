/**
 * Utility Handlers - Handle special messages and edge cases
 * Prevents conflicts with main flows and provides fallback handling
 * Updated to use SmartMenuService for consistent UX
 */

import {
    sendMessage,
    sendQuickReply,
    createQuickReply
} from '../facebook-api'
import { logger } from '../logger'
import { SmartMenuService } from '../core/smart-menu-service'

export class UtilityHandlers {
    /**
     * Handle special keywords that don't belong to any flow
     */
    static async handleSpecialKeywords(user: any, text: string): Promise<boolean> {
        const lowerText = text.toLowerCase().trim()

        // Help keywords
        if (this.isHelpKeyword(lowerText)) {
            await this.sendHelpMessage(user.facebook_id)
            return true
        }

        // Greeting keywords - DISABLED to avoid conflict with WelcomeService
        // if (this.isGreetingKeyword(lowerText)) {
        //     await this.sendGreetingMessage(user.facebook_id)
        //     return true
        // }

        // Info keywords
        if (this.isInfoKeyword(lowerText)) {
            await this.sendInfoMessage(user.facebook_id)
            return true
        }

        return false
    }

    /**
     * Handle unknown or invalid messages
     */
    static async handleUnknownMessage(user: any, text: string): Promise<void> {
        logger.warn('Unknown message received', {
            facebook_id: user.facebook_id,
            text: text
        })

        await sendMessage(user.facebook_id,
            `❓ Không hiểu yêu cầu của bạn\n━━━━━━━━━━━━━━━━━━━━\n💡 Bạn có thể:\n• Nhập "help" để xem trợ giúp\n• Nhập "info" để xem thông tin\n• Chọn các nút bên dưới để sử dụng\n━━━━━━━━━━━━━━━━━━━━`
        )

        await this.sendMainMenu(user.facebook_id)
    }

    /**
     * Send main menu when user is confused - UPDATED to use SmartMenuService
     */
    static async sendMainMenu(facebookId: string): Promise<void> {
        // Sử dụng SmartMenuService để có menu nhất quán
        await SmartMenuService.sendChoosingModeMenu(facebookId)
    }

    /**
     * Send help message
     */
    private static async sendHelpMessage(facebookId: string): Promise<void> {
        await sendMessage(facebookId,
            `💡 TRỢ GIÚP BOT TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n🚀 Đăng ký: Nhập "đăng ký" hoặc "dkt"\n🛒 Tìm kiếm: Nhập "tìm kiếm" hoặc "search"\n📝 Đăng tin: Nhập "đăng tin" hoặc "bán hàng"\n👥 Cộng đồng: Nhập "cộng đồng"\n💳 Thanh toán: Nhập "thanh toán"\n━━━━━━━━━━━━━━━━━━━━\n📞 Liên hệ admin: 0982581222`
        )
    }

    /**
     * Send greeting message - DISABLED to avoid conflict with WelcomeService
     */
    private static async sendGreetingMessage(facebookId: string): Promise<void> {
        // Disabled to avoid conflict with WelcomeService
        // Welcome message is now handled by WelcomeService
        console.log('Greeting message disabled - handled by WelcomeService')
    }

    /**
     * Send info message
     */
    private static async sendInfoMessage(facebookId: string): Promise<void> {
        await sendMessage(facebookId,
            `📋 THÔNG TIN BOT TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n🎯 Cộng đồng dành riêng cho người sinh năm 1981\n\n💰 Phí dịch vụ:\n• 3,000đ/ngày\n• Gói tối thiểu: 3 ngày\n• Dùng thử miễn phí 3 ngày\n\n🌟 Quyền lợi:\n• Kết nối với 2 triệu Tân Dậu\n• Hỗ trợ mua bán nội bộ\n• Sự kiện cộng đồng độc quyền\n━━━━━━━━━━━━━━━━━━━━`
        )
    }

    /**
     * Check if text contains help keywords
     */
    private static isHelpKeyword(text: string): boolean {
        const helpKeywords = [
            'help', 'trợ giúp', 'hỗ trợ', 'huong dan', 'hướng dẫn',
            'cai dat', 'cài đặt', 'how to', 'lam sao', 'làm sao'
        ]
        return helpKeywords.some(keyword => text.includes(keyword))
    }

    /**
     * Check if text contains greeting keywords
     */
    private static isGreetingKeyword(text: string): boolean {
        const greetingKeywords = [
            'hello', 'hi', 'xin chào', 'chào', 'chao',
            'alo', 'hey', 'good morning', 'good afternoon', 'good evening'
        ]
        return greetingKeywords.some(keyword => text.includes(keyword))
    }

    /**
     * Check if text contains info keywords
     */
    private static isInfoKeyword(text: string): boolean {
        const infoKeywords = [
            'info', 'thông tin', 'thong tin', 'about', 'giới thiệu',
            'gioi thieu', 'lien he', 'liên hệ', 'contact'
        ]
        return infoKeywords.some(keyword => text.includes(keyword))
    }
}
