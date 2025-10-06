/**
 * Admin Takeover Service
 * Quản lý việc admin tiếp quản cuộc trò chuyện với user
 */

import { supabaseAdmin } from './supabase'
import { sendMessage } from './facebook-api'
import { logger } from './logger'

export class AdminTakeoverService {
    /**
     * Kiểm tra xem admin có đang chat với user không
     */
    static async isAdminActive(facebookId: string): Promise<boolean> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_chat_sessions')
                .select('is_active')
                .eq('user_facebook_id', facebookId)
                .eq('is_active', true)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error checking admin status', { facebookId, error: error.message })
                return false
            }

            return !!data
        } catch (error) {
            logger.error('Exception checking admin status', { facebookId, error })
            return false
        }
    }

    /**
     * Admin bắt đầu chat với user
     */
    static async startAdminChat(facebookId: string, adminId: string): Promise<void> {
        try {
            // Tạo hoặc cập nhật session
            await supabaseAdmin
                .from('admin_chat_sessions')
                .upsert({
                    user_facebook_id: facebookId,
                    admin_id: adminId,
                    is_active: true,
                    started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            // Dừng bot cho user này
            const { UserInteractionService } = await import('./user-interaction-service')
            await UserInteractionService.updateUserState(facebookId, {
                bot_active: false
            })

            // Gửi thông báo cho user
            await sendMessage(facebookId,
                '👨‍💼 Admin đã tham gia cuộc trò chuyện!\n' +
                '🤖 Bot sẽ tạm dừng để Admin có thể hỗ trợ bạn trực tiếp.\n' +
                '💬 Bạn có thể chat trực tiếp với Admin ngay bây giờ!\n\n' +
                '💡 Các nút chức năng đã được ẩn để Admin hỗ trợ bạn tốt hơn.'
            )

            logger.info('Admin started chat', { facebookId, adminId })
        } catch (error) {
            logger.error('Error starting admin chat', { facebookId, adminId, error })
        }
    }

    /**
     * Admin dừng chat với user
     */
    static async stopAdminChat(facebookId: string, adminId: string): Promise<void> {
        try {
            // Cập nhật session
            await supabaseAdmin
                .from('admin_chat_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_facebook_id', facebookId)
                .eq('admin_id', adminId)

            // Kích hoạt lại bot cho user này
            const { UserInteractionService } = await import('./user-interaction-service')
            await UserInteractionService.reactivateBot(facebookId)

            // Gửi thông báo cho user
            await sendMessage(facebookId,
                '👨‍💼 Admin đã kết thúc cuộc trò chuyện.\n' +
                '🤖 Bot sẽ tiếp tục hoạt động để hỗ trợ bạn!\n' +
                '💡 Bạn có thể sử dụng các tính năng của bot hoặc nhấn nút để bắt đầu.'
            )

            logger.info('Admin stopped chat', { facebookId, adminId })
        } catch (error) {
            logger.error('Error stopping admin chat', { facebookId, adminId, error })
        }
    }

    /**
     * Kiểm tra và xử lý message từ admin
     */
    static async handleAdminMessage(facebookId: string, adminId: string, message: string): Promise<boolean> {
        try {
            // Kiểm tra xem có phải admin đang chat với user này không
            const { data } = await supabaseAdmin
                .from('admin_chat_sessions')
                .select('is_active')
                .eq('user_facebook_id', facebookId)
                .eq('admin_id', adminId)
                .eq('is_active', true)
                .single()

            if (data) {
                // Admin đang chat, cập nhật timestamp
                await supabaseAdmin
                    .from('admin_chat_sessions')
                    .update({
                        last_message_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_facebook_id', facebookId)
                    .eq('admin_id', adminId)

                return true // Admin đang chat
            }

            return false // Admin không chat
        } catch (error) {
            logger.error('Error handling admin message', { facebookId, adminId, error })
            return false
        }
    }

    /**
     * Lấy danh sách user đang chat với admin
     */
    static async getActiveAdminChats(adminId: string): Promise<string[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_chat_sessions')
                .select('user_facebook_id')
                .eq('admin_id', adminId)
                .eq('is_active', true)

            if (error) {
                logger.error('Error getting active admin chats', { adminId, error: error.message })
                return []
            }

            return data?.map(item => item.user_facebook_id) || []
        } catch (error) {
            logger.error('Exception getting active admin chats', { adminId, error })
            return []
        }
    }
}
