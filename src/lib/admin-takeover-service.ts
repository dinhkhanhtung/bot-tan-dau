/**
 * Admin Takeover Service
 * Quản lý việc admin tiếp quản cuộc trò chuyện với user
 * Bao gồm message counting, state management và notification system
 */

import { supabaseAdmin } from './supabase.js'
import { sendMessage } from './facebook-api.js'
import { logger } from './logger.js'

interface AdminTakeoverState {
  id?: string
  user_id: string
  admin_id?: string
  is_active: boolean
  consecutive_message_count: number
  last_user_message_at?: string
  takeover_started_at?: string
  takeover_ended_at?: string
  user_waiting_for_admin?: boolean
  created_at?: string
  updated_at?: string
}

export class AdminTakeoverService {
    /**
     * Message Counting & Detection Logic
     * Đếm số tin nhắn liên tiếp từ user và phát hiện khi cần admin hỗ trợ
     */

    /**
     * Xử lý tin nhắn liên tiếp từ user
     * Đếm và phát hiện khi user gửi tin nhắn thứ 2 liên tiếp
     */
    static async handleConsecutiveUserMessages(userId: string, message: string): Promise<boolean> {
        try {
            logger.info('Handling consecutive user message', { userId, messageLength: message.length })

            // Lấy trạng thái hiện tại của user
            const currentState = await this.getTakeoverState(userId)

            // Kiểm tra xem có phải tin nhắn liên tiếp không
            const now = new Date()
            const lastMessageTime = currentState?.last_user_message_at ?
                new Date(currentState.last_user_message_at) : null

            // Nếu chưa có tin nhắn trước đó hoặc đã quá 5 phút, reset counter
            const isConsecutive = lastMessageTime &&
                (now.getTime() - lastMessageTime.getTime()) < 5 * 60 * 1000 // 5 minutes

            let newCount = 1
            if (isConsecutive && currentState) {
                newCount = (currentState.consecutive_message_count || 0) + 1
            }

            // Cập nhật trạng thái
            await this.updateTakeoverState(userId, {
                consecutive_message_count: newCount,
                last_user_message_at: now.toISOString(),
                is_active: false // Đảm bảo không active khi user gửi tin
            })

            logger.info('Updated message count', {
                userId,
                newCount,
                isConsecutive,
                threshold: 2
            })

            // Phát hiện khi user gửi tin nhắn thứ 2 liên tiếp
            if (newCount >= 2) {
                logger.info('User needs admin support', { userId, messageCount: newCount })

                // Thông báo cho user - không await để tránh lỗi làm gián đoạn luồng chính
                this.notifyUserWaitingForAdmin(userId).catch(err =>
                    logger.error('Error in notifyUserWaitingForAdmin', { userId, error: err })
                )

                // Thông báo cho tất cả admin - không await để tránh lỗi
                this.notifyAdminsUserNeedsSupport(userId).catch(err =>
                    logger.error('Error in notifyAdminsUserNeedsSupport', { userId, error: err })
                )

                // Đánh dấu user đang chờ admin
                await this.updateTakeoverState(userId, {
                    user_waiting_for_admin: true
                })

                return true // Cần admin hỗ trợ
            }

            return false // Chưa cần admin hỗ trợ
        } catch (error) {
            logger.error('Error handling consecutive user messages', { userId, error })
            // Không throw error để tránh làm gián đoạn luồng chính
            return false
        }
    }

    /**
     * Lấy trạng thái takeover của user
     */
    static async getTakeoverState(userId: string): Promise<AdminTakeoverState | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*')
                .eq('user_facebook_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting takeover state', { userId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            logger.error('Exception getting takeover state', { userId, error })
            return null
        }
    }

    /**
     * Cập nhật trạng thái takeover của user
     */
    static async updateTakeoverState(userId: string, updates: Partial<AdminTakeoverState>): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('admin_takeover_states')
                .upsert({
                    user_id: userId,
                    ...updates,
                    updated_at: new Date().toISOString()
                })

            if (error) {
                logger.error('Error updating takeover state', { userId, updates, error: error.message })
            }
        } catch (error) {
            logger.error('Exception updating takeover state', { userId, error })
        }
    }

    /**
     * Kiểm tra xem admin có đang chat với user không
     */
    static async isAdminActive(facebookId: string): Promise<boolean> {
        try {
            // Kiểm tra trong bảng cũ (admin_chat_sessions) để tương thích ngược
            const { data: oldSession, error: oldError } = await supabaseAdmin
                .from('admin_chat_sessions')
                .select('is_active')
                .eq('user_facebook_id', facebookId)
                .eq('is_active', true)
                .single()

            if (oldError && oldError.code !== 'PGRST116') {
                logger.error('Error checking old admin status', { facebookId, error: oldError.message })
            }

            if (oldSession) {
                return true // Sử dụng hệ thống cũ nếu có
            }

            // Kiểm tra trong bảng mới (admin_takeover_states)
            const state = await this.getTakeoverState(facebookId)
            return state?.is_active || false

        } catch (error) {
            logger.error('Exception checking admin status', { facebookId, error })
            return false
        }
    }

    /**
     * Admin Takeover Logic
     * Xử lý khi user cần admin hỗ trợ
     */

    /**
     * Admin bắt đầu takeover user
     */
    static async initiateAdminTakeover(userId: string, adminId: string): Promise<void> {
        try {
            logger.info('Initiating admin takeover', { userId, adminId })

            // Cập nhật trạng thái takeover
            await this.updateTakeoverState(userId, {
                admin_id: adminId,
                is_active: true,
                takeover_started_at: new Date().toISOString(),
                user_waiting_for_admin: false
            })

            // Tạo session trong bảng cũ để tương thích
            await supabaseAdmin
                .from('admin_chat_sessions')
                .upsert({
                    user_facebook_id: userId,
                    admin_id: adminId,
                    is_active: true,
                    started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            // Dừng bot cho user này
            const { UserInteractionService } = await import('./user-interaction-service')
            await UserInteractionService.updateUserState(userId, {
                bot_active: false
            })

            // Thông báo cho user
            await this.notifyUserAdminJoined(userId, adminId)

            logger.info('Admin takeover initiated successfully', { userId, adminId })
        } catch (error) {
            logger.error('Error initiating admin takeover', { userId, adminId, error })
        }
    }

    /**
     * Admin kết thúc takeover
     */
    static async releaseAdminTakeover(userId: string, adminId: string): Promise<void> {
        try {
            logger.info('Releasing admin takeover', { userId, adminId })

            // Cập nhật trạng thái takeover
            await this.updateTakeoverState(userId, {
                admin_id: adminId,
                is_active: false,
                takeover_ended_at: new Date().toISOString(),
                consecutive_message_count: 0, // Reset counter
                user_waiting_for_admin: false
            })

            // Cập nhật session cũ
            await supabaseAdmin
                .from('admin_chat_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_facebook_id', userId)
                .eq('admin_id', adminId)

            // Kích hoạt lại bot cho user này
            const { UserInteractionService } = await import('./user-interaction-service')
            await UserInteractionService.reactivateBot(userId)

            // Reset spam data để user có thể sử dụng bot lại
            await supabaseAdmin
                .from('spam_tracking')
                .delete()
                .eq('user_id', userId)

            // Thông báo cho user
            await this.notifyUserAdminLeft(userId)

            logger.info('Admin takeover released successfully', { userId, adminId })
        } catch (error) {
            logger.error('Error releasing admin takeover', { userId, adminId, error })
        }
    }

    /**
     * Kiểm tra và kích hoạt lại bot cho user nếu cần
     */
    static async checkAndReactivateBotForUser(userId: string): Promise<void> {
        try {
            const state = await this.getTakeoverState(userId)

            // Nếu user không còn chờ admin và không có admin active, kích hoạt lại bot
            if (!state?.user_waiting_for_admin && !state?.is_active) {
                const { UserInteractionService } = await import('./user-interaction-service.js')
                await UserInteractionService.reactivateBot(userId)

                logger.info('Bot reactivated for user', { userId })
            }
        } catch (error) {
            logger.error('Error checking and reactivating bot', { userId, error })
        }
    }

    /**
     * Notification System
     * Thông báo cho user và admin
     */

    /**
     * Thông báo cho user đang chờ admin
     */
    static async notifyUserWaitingForAdmin(userId: string): Promise<void> {
        try {
            logger.info('Sending admin notification to user', { userId })

            // Đảm bảo không có lỗi nào làm gián đoạn luồng chính
            await sendMessage(userId,
                '👨‍💼 Admin đã nhận được tin nhắn của bạn và sẽ sớm phản hồi!\n' +
                '⏰ Vui lòng đợi trong giây lát...\n' +
                '💬 Bạn có thể tiếp tục gửi tin nhắn nếu cần hỗ trợ thêm.'
            )

            logger.info('Admin notification sent successfully', { userId })
        } catch (error) {
            logger.error('Error sending admin notification to user', { userId, error })

            // Không throw error để tránh làm gián đoạn luồng chính
            // Chỉ log lỗi và tiếp tục
            console.error('Failed to send admin notification:', error)
        }
    }

    /**
     * Thông báo cho user admin đã tham gia
     */
    static async notifyUserAdminJoined(userId: string, adminId: string): Promise<void> {
        try {
            await sendMessage(userId,
                '👨‍💼 Admin đã tham gia cuộc trò chuyện!\n' +
                '🤖 Bot sẽ tạm dừng để Admin có thể hỗ trợ bạn trực tiếp.\n' +
                '💬 Bạn có thể chat trực tiếp với Admin ngay bây giờ!\n\n' +
                '💡 Các nút chức năng đã được ẩn để Admin hỗ trợ bạn tốt hơn.'
            )
        } catch (error) {
            logger.error('Error notifying user admin joined', { userId, adminId, error })
        }
    }

    /**
     * Thông báo cho user admin đã rời đi
     */
    static async notifyUserAdminLeft(userId: string): Promise<void> {
        try {
            logger.info('Sending admin left notification', { userId })

            await sendMessage(userId,
                '👨‍💼 Admin đã kết thúc cuộc trò chuyện.\n' +
                '🤖 Bot sẽ tiếp tục hoạt động để hỗ trợ bạn!\n' +
                '💡 Bạn có thể sử dụng các tính năng của bot hoặc nhấn nút để bắt đầu.'
            )

            logger.info('Admin left notification sent successfully', { userId })
        } catch (error) {
            logger.error('Error sending admin left notification', { userId, error })
            // Không throw error để tránh làm gián đoạn luồng chính
            console.error('Failed to send admin left notification:', error)
        }
    }

    /**
     * Thông báo cho tất cả admin về user cần hỗ trợ
     */
    static async notifyAdminsUserNeedsSupport(userId: string): Promise<void> {
        try {
            // Lấy thông tin user để gửi thông báo chi tiết hơn
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('name, facebook_id')
                .eq('facebook_id', userId)
                .single()

            const userName = userData?.name || 'User'

            // Thông báo qua admin panel hoặc hệ thống khác
            // Ở đây chúng ta có thể tích hợp với notification service sau này

            logger.info('Admin notification sent', {
                userId,
                userName,
                message: `${userName} cần hỗ trợ từ admin`
            })
        } catch (error) {
            logger.error('Error notifying admins', { userId, error })
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

            // Reset spam data để user có thể sử dụng bot lại
            await supabaseAdmin
                .from('spam_tracking')
                .delete()
                .eq('user_id', facebookId)

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
     * Lấy danh sách user đang chờ admin hỗ trợ
     */
    static async getUsersWaitingForAdmin(): Promise<string[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('user_id')
                .eq('user_waiting_for_admin', true)
                .eq('is_active', false)

            if (error) {
                logger.error('Error getting users waiting for admin', { error: error.message })
                return []
            }

            return data?.map(item => item.user_id) || []
        } catch (error) {
            logger.error('Exception getting users waiting for admin', { error })
            return []
        }
    }

    /**
     * Lấy danh sách user đang chat với admin (hệ thống cũ)
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

    /**
     * Lấy thống kê takeover cho admin panel
     */
    static async getTakeoverStats(): Promise<{
        totalWaitingUsers: number
        totalActiveTakeovers: number
        totalTodayTakeovers: number
    }> {
        try {
            // Đếm user đang chờ admin
            const { count: waitingCount } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*', { count: 'exact', head: true })
                .eq('user_waiting_for_admin', true)
                .eq('is_active', false)

            // Đếm takeover đang active
            const { count: activeCount } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            // Đếm takeover trong ngày hôm nay
            const today = new Date().toISOString().split('T')[0]
            const { count: todayCount } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*', { count: 'exact', head: true })
                .gte('takeover_started_at', today)
                .eq('is_active', true)

            return {
                totalWaitingUsers: waitingCount || 0,
                totalActiveTakeovers: activeCount || 0,
                totalTodayTakeovers: todayCount || 0
            }
        } catch (error) {
            logger.error('Exception getting takeover stats', { error })
            return {
                totalWaitingUsers: 0,
                totalActiveTakeovers: 0,
                totalTodayTakeovers: 0
            }
        }
    }

    /**
     * Reset message counter cho user
     */
    static async resetMessageCounter(userId: string): Promise<void> {
        try {
            await this.updateTakeoverState(userId, {
                consecutive_message_count: 0,
                last_user_message_at: undefined,
                user_waiting_for_admin: false
            })

            logger.info('Message counter reset for user', { userId })
        } catch (error) {
            logger.error('Error resetting message counter', { userId, error })
        }
    }

    /**
      * Lấy danh sách takeover đang active
      */
    static async getActiveTakeovers(): Promise<any[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_takeover_states')
                .select(`
                    *,
                    users:user_id (
                        facebook_id,
                        name,
                        phone,
                        status
                    )
                `)
                .eq('is_active', true)

            if (error) {
                logger.error('Error getting active takeovers', { error: error.message })
                return []
            }

            return data || []
        } catch (error) {
            logger.error('Exception getting active takeovers', { error })
            return []
        }
    }
}
