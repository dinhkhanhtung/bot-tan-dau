import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, isTrialUser, isExpiredUser, daysUntilExpiry, generateId, updateBotSession } from '../utils'

export class PaymentFlow {
    async handlePayment(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        // Check user status
        if (isExpiredUser(user.membership_expires_at)) {
            await this.sendExpiredPaymentMessage(user)
            return
        }

        if (isTrialUser(user.membership_expires_at)) {
            const daysLeft = daysUntilExpiry(user.membership_expires_at!)
            await this.sendTrialPaymentMessage(user, daysLeft)
            return
        }

        // Regular payment flow
        await sendMessagesWithTyping(user.facebook_id, [
            '💰 THANH TOÁN',
            'Chọn gói thanh toán phù hợp với bạn:',
            '💡 Với số tiền này bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu!'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Gói dịch vụ:',
            [
                createQuickReply('📅 7 NGÀY - ₫7,000', 'PAYMENT_PACKAGE_7'),
                createQuickReply('📅 15 NGÀY - ₫15,000', 'PAYMENT_PACKAGE_15'),
                createQuickReply('📅 30 NGÀY - ₫30,000', 'PAYMENT_PACKAGE_30'),
                createQuickReply('📅 90 NGÀY - ₫90,000', 'PAYMENT_PACKAGE_90'),
                createQuickReply('📊 LỊCH SỬ THANH TOÁN', 'PAYMENT_HISTORY'),
                createQuickReply('ℹ️ HƯỚNG DẪN', 'PAYMENT_GUIDE')
            ]
        )
    }

    private async sendExpiredPaymentMessage(user: any): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '⏰ TÀI KHOẢN ĐÃ HẾT HẠN!',
            'Tài khoản của bạn đã hết hạn sử dụng.',
            '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Gia hạn tài khoản:',
            [
                createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT_PACKAGE_7'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                createQuickReply('❌ HỦY', 'MAIN_MENU')
            ]
        )
    }

    private async sendTrialPaymentMessage(user: any, daysLeft: number): Promise<void> {
        if (daysLeft === 1) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
                'Trial của bạn còn 24 giờ!',
                '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '⏰ THÔNG BÁO QUAN TRỌNG',
                `Trial của bạn còn ${daysLeft} ngày!`,
                '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
            ])
        }

        await sendQuickReply(
            user.facebook_id,
            'Gia hạn tài khoản:',
            [
                createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT_PACKAGE_7'),
                createQuickReply('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
                createQuickReply('ℹ️ TÌM HIỂU', 'PAYMENT_GUIDE')
            ]
        )
    }

    // Additional functions for webhook compatibility
    static async handlePaymentReceipt(user: any, imageUrl: string): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📷 Chụp ảnh', 'PAYMENT_CAMERA'),
                createQuickReply('📁 Chọn từ thư viện', 'PAYMENT_GALLERY'),
                createQuickReply('❌ HỦY', 'PAYMENT')
            ]
        )
    }
}
