import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId } from '../utils'

export class AdminFlow {
    async handleCommand(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Quản lý:',
            [
                createQuickReply('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
                createQuickReply('👥 NGƯỜI DÙNG', 'ADMIN_USERS'),
                createQuickReply('🛒 TIN ĐĂNG', 'ADMIN_LISTINGS'),
                createQuickReply('📊 THỐNG KÊ', 'ADMIN_STATS'),
                createQuickReply('📢 THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
                createQuickReply('⚙️ CÀI ĐẶT', 'ADMIN_SETTINGS')
            ]
        )

        await sendQuickReply(
            user.facebook_id,
            'Chức năng nâng cao:',
            [
                createQuickReply('📤 XUẤT DỮ LIỆU', 'ADMIN_EXPORT'),
                createQuickReply('🔗 TẠO LINK CHIA SẺ', 'ADMIN_CREATE_SHARE_LINK'),
                createQuickReply('🚫 DỪNG BOT', 'ADMIN_STOP_BOT'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )
    }

    // Additional functions for webhook compatibility
    static async handleCancelAdminChat(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        try {
            const { endAdminChatSession } = await import('../admin-chat')
            const success = await endAdminChatSession(user.facebook_id)

            if (success) {
                await sendMessagesWithTyping(user.facebook_id, [
                    '❌ ĐÃ HỦY CHAT VỚI ADMIN',
                    'Yêu cầu chat đã được hủy.',
                    'Bạn có thể quay lại sử dụng bot bình thường.'
                ])
            } else {
                await sendMessage(user.facebook_id, '⚠️ Không thể hủy chat. Có thể bạn không có session nào đang hoạt động.')
            }

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🤖 CHAT BOT', 'SUPPORT_BOT'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        } catch (error) {
            console.error('Error canceling admin chat:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    static async handleExitAdminChat(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        try {
            const { endAdminChatSession } = await import('../admin-chat')
            const success = await endAdminChatSession(user.facebook_id)

            if (success) {
                await sendMessagesWithTyping(user.facebook_id, [
                    '🔄 ĐÃ QUAY LẠI CHẾ ĐỘ BOT',
                    'Bạn đã thoát khỏi chế độ chat với admin.',
                    'Bot sẽ tiếp tục hỗ trợ bạn như bình thường.'
                ])
            } else {
                await sendMessage(user.facebook_id, '⚠️ Không thể thoát chat. Có thể bạn không có session nào đang hoạt động.')
            }

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                    createQuickReply('🛒 TẠO TIN', 'LISTING'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        } catch (error) {
            console.error('Error exiting admin chat:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}
