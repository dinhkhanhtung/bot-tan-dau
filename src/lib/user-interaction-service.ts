/**
 * User Interaction Service
 * Quản lý trạng thái tương tác của user với bot
 */

import { supabaseAdmin } from './supabase'
import { sendMessage, sendQuickReply, createQuickReply } from './facebook-api'
import { logger } from './logger'
import { AdminTakeoverService } from './admin-takeover-service'

export interface UserInteractionState {
    facebook_id: string
    welcome_sent: boolean
    last_interaction: string
    last_welcome_sent?: string
    interaction_count: number
    bot_active: boolean
    created_at: string
    updated_at: string
}

export class UserInteractionService {
    /**
     * Lấy trạng thái tương tác của user
     */
    static async getUserState(facebookId: string): Promise<UserInteractionState | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('*')
                .eq('facebook_id', facebookId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting user interaction state', { facebookId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            logger.error('Exception getting user interaction state', { facebookId, error })
            return null
        }
    }

    /**
     * Tạo hoặc cập nhật trạng thái tương tác
     */
    static async updateUserState(facebookId: string, updates: Partial<UserInteractionState>): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: facebookId,
                    ...updates,
                    updated_at: new Date().toISOString()
                })

            logger.debug('User interaction state updated', { facebookId, updates })
        } catch (error) {
            logger.error('Error updating user interaction state', { facebookId, updates, error })
        }
    }

    /**
     * Xử lý tin nhắn đầu tiên từ user
     */
    static async handleFirstMessage(facebookId: string, userStatus: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)

            // Nếu chưa có state, tạo mới
            if (!userState) {
                await this.updateUserState(facebookId, {
                    welcome_sent: false,
                    last_interaction: new Date().toISOString(),
                    interaction_count: 1,
                    bot_active: true,
                    created_at: new Date().toISOString()
                })
                return true // Cần gửi welcome
            }

            // Nếu đã gửi welcome rồi, kiểm tra cooldown
            if (userState.welcome_sent && userState.last_welcome_sent) {
                // Kiểm tra thời gian từ lần cuối gửi welcome (24h cooldown)
                const lastWelcomeTime = new Date(userState.last_welcome_sent)
                const now = new Date()
                const timeDiff = now.getTime() - lastWelcomeTime.getTime()
                const cooldownPeriod = 24 * 60 * 60 * 1000 // 24 giờ

                if (timeDiff < cooldownPeriod) {
                    logger.info('Welcome cooldown active', { facebookId, timeDiff, cooldownPeriod })
                    return false // Chưa đủ thời gian cooldown
                }
            }

            // Cập nhật interaction count
            await this.updateUserState(facebookId, {
                interaction_count: userState.interaction_count + 1,
                last_interaction: new Date().toISOString()
            })

            return true // Cần gửi welcome
        } catch (error) {
            logger.error('Error handling first message', { facebookId, error })
            return false
        }
    }

    /**
     * Gửi welcome message và đánh dấu đã gửi
     */
    static async sendWelcomeAndMark(facebookId: string, userStatus: string): Promise<void> {
        try {
            // Gửi welcome message
            await this.sendWelcomeMessage(facebookId, userStatus)

            // Đánh dấu đã gửi welcome với thời gian chính xác
            await this.updateUserState(facebookId, {
                welcome_sent: true,
                last_welcome_sent: new Date().toISOString(),
                last_interaction: new Date().toISOString()
            })

            logger.info('Welcome sent and marked', { facebookId, userStatus })
        } catch (error) {
            logger.error('Error sending welcome and marking', { facebookId, userStatus, error })
        }
    }

    /**
     * Gửi welcome message
     */
    private static async sendWelcomeMessage(facebookId: string, userStatus: string): Promise<void> {
        if (userStatus === 'new_user') {
            // User chưa đăng ký
            await sendMessage(facebookId, '🎉 Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo!')
            await sendMessage(facebookId, '🤖 Tôi là trợ lý AI giúp bạn kết nối và mua bán trong cộng đồng Tân Dậu')
            await sendMessage(facebookId, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(facebookId, '💡 Bạn có thể:')
            await sendMessage(facebookId, '• 🚀 Đăng ký thành viên')
            await sendMessage(facebookId, '• 🛒 Tìm kiếm sản phẩm')
            await sendMessage(facebookId, '• 💬 Liên hệ Admin')
            await sendMessage(facebookId, '• ℹ️ Tìm hiểu thêm')
            await sendMessage(facebookId, '━━━━━━━━━━━━━━━━━━━━')
            
            await sendQuickReply(facebookId, 'Chọn chức năng:', [
                createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                createQuickReply('🛒 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💬 HỖ TRỢ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO')
            ])
        } else {
            // User đã đăng ký
            await sendMessage(facebookId, '👋 Chào mừng bạn quay trở lại!')
            await sendMessage(facebookId, '🤖 Tôi đã sẵn sàng hỗ trợ bạn tiếp tục hành trình trong cộng đồng Tân Dậu')
            await sendMessage(facebookId, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(facebookId, '💡 Bạn có thể:')
            await sendMessage(facebookId, '• 🛒 Tìm kiếm sản phẩm')
            await sendMessage(facebookId, '• 📝 Đăng bán sản phẩm')
            await sendMessage(facebookId, '• 💬 Hỗ trợ Admin')
            await sendMessage(facebookId, '• 📊 Xem thống kê')
            await sendMessage(facebookId, '━━━━━━━━━━━━━━━━━━━━')
            
            await sendQuickReply(facebookId, 'Chọn chức năng:', [
                createQuickReply('🛒 TÌM KIẾM', 'SEARCH'),
                createQuickReply('📝 ĐĂNG BÁN', 'LISTING'),
                createQuickReply('💬 HỖ TRỢ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('📊 THỐNG KÊ', 'STATS')
            ])
        }
    }

    /**
     * Xử lý tin nhắn tiếp theo (sau khi đã gửi welcome)
     */
    static async handleSubsequentMessage(facebookId: string, message: string): Promise<void> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState) return

            // Kiểm tra xem admin có đang chat không
            const isAdminActive = await AdminTakeoverService.isAdminActive(facebookId)
            if (isAdminActive) {
                // Admin đang chat, không xử lý
                return
            }

            // Cập nhật interaction count
            await this.updateUserState(facebookId, {
                interaction_count: userState.interaction_count + 1,
                last_interaction: new Date().toISOString()
            })

            // Nếu user không ấn nút mà gửi tin nhắn text
            if (userState.interaction_count >= 2) {
                await this.handleNonButtonInteraction(facebookId)
            }
        } catch (error) {
            logger.error('Error handling subsequent message', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user không ấn nút mà gửi tin nhắn
     */
    private static async handleNonButtonInteraction(facebookId: string): Promise<void> {
        try {
            // Dừng bot cho user này
            await this.updateUserState(facebookId, {
                bot_active: false
            })

            // Gửi thông báo và ẩn nút
            await sendMessage(facebookId,
                '💬 Cảm ơn bạn đã liên hệ!\n' +
                '👨‍💼 Admin đã nhận được tin nhắn của bạn và sẽ sớm phản hồi.\n' +
                '⏰ Vui lòng chờ đợi trong giây lát!\n\n' +
                '💡 Các nút chức năng đã được ẩn để Admin có thể hỗ trợ bạn trực tiếp.'
            )

            logger.info('Bot stopped for user due to non-button interaction', { facebookId })
        } catch (error) {
            logger.error('Error handling non-button interaction', { facebookId, error })
        }
    }

    /**
     * Kiểm tra xem bot có hoạt động cho user không
     */
    static async isBotActive(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState) return true // Mặc định bot hoạt động

            // Kiểm tra admin takeover
            const isAdminActive = await AdminTakeoverService.isAdminActive(facebookId)
            if (isAdminActive) return false

            return userState.bot_active
        } catch (error) {
            logger.error('Error checking bot active status', { facebookId, error })
            return true
        }
    }

    /**
     * Kích hoạt lại bot cho user (khi admin dừng chat)
     */
    static async reactivateBot(facebookId: string): Promise<void> {
        try {
            await this.updateUserState(facebookId, {
                bot_active: true,
                last_interaction: new Date().toISOString()
            })

            logger.info('Bot reactivated for user', { facebookId })
        } catch (error) {
            logger.error('Error reactivating bot', { facebookId, error })
        }
    }

    /**
     * Reset trạng thái user (để test)
     */
    static async resetUserState(facebookId: string): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .delete()
                .eq('facebook_id', facebookId)

            logger.info('User state reset', { facebookId })
        } catch (error) {
            logger.error('Error resetting user state', { facebookId, error })
        }
    }
}
