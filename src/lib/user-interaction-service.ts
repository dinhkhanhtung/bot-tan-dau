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
     * Xử lý tin nhắn đầu tiên từ user - CẢI THIỆN LOGIC ĐỂ TRÁNH SPAM
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

            // KIỂM TRA KỸ HƠN ĐỂ TRÁNH SPAM WELCOME
            const now = new Date()
            const lastInteractionTime = new Date(userState.last_interaction)
            const timeSinceLastInteraction = now.getTime() - lastInteractionTime.getTime()

            // Nếu đã gửi welcome rồi, kiểm tra cooldown nghiêm ngặt hơn
            if (userState.welcome_sent && userState.last_welcome_sent) {
                const lastWelcomeTime = new Date(userState.last_welcome_sent)
                const timeDiff = now.getTime() - lastWelcomeTime.getTime()
                const cooldownPeriod = 24 * 60 * 60 * 1000 // 24 giờ

                // Chỉ gửi lại welcome nếu:
                // 1. Đã quá 24h từ lần cuối gửi welcome
                // 2. Và user có interaction gần đây (trong vòng 5 phút)
                if (timeDiff < cooldownPeriod) {
                    logger.info('Welcome cooldown active - skipping welcome', {
                        facebookId,
                        timeDiff,
                        cooldownPeriod,
                        timeSinceLastInteraction
                    })
                    return false // Chưa đủ thời gian cooldown
                }

                // Nếu quá 24h nhưng user không có interaction gần đây, có thể là user cũ quay lại
                // Vẫn cần kiểm tra kỹ để tránh spam
                if (timeSinceLastInteraction > 5 * 60 * 1000) { // > 5 phút
                    logger.info('User returned after long time but no recent interaction', {
                        facebookId,
                        timeSinceLastInteraction,
                        timeDiff
                    })
                    // Có thể cần đánh giá lại logic ở đây
                }
            }

            // KIỂM TRA NẾU USER ĐÃ TƯƠNG TÁC QUÁ NHIỀU LẦN SAU KHI GỬI WELCOME
            if (userState.welcome_sent && userState.interaction_count > 5) {
                logger.info('User has interacted many times after welcome - might need re-welcome', {
                    facebookId,
                    interactionCount: userState.interaction_count
                })
                // Có thể cần gửi welcome lại nếu user đã tương tác nhiều lần
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

            // Đánh dấu đã gửi welcome với thời gian chính xác - SỬA LỖI DATABASE
            const currentTime = new Date().toISOString()

            // Cập nhật cả hai bảng để đảm bảo consistency
            await Promise.all([
                // Cập nhật user_interactions table
                this.updateUserState(facebookId, {
                    welcome_sent: true,
                    last_welcome_sent: currentTime,
                    last_interaction: currentTime
                }),
                // Cập nhật users table nếu có
                this.updateUserWelcomeStatus(facebookId, true, currentTime)
            ])

            logger.info('Welcome sent and marked successfully', { facebookId, userStatus })
        } catch (error) {
            logger.error('Error sending welcome and marking', { facebookId, userStatus, error })

            // Retry mechanism cho database update
            try {
                await this.retryWelcomeMark(facebookId)
            } catch (retryError) {
                logger.error('Retry welcome mark also failed', { facebookId, retryError })
            }
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
     * Kiểm tra xem có nên gửi welcome message không - METHOD CHÍNH ĐỂ TRÁNH SPAM
     */
    static async shouldSendWelcome(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState) return true // Chưa có state, cần gửi welcome

            const now = new Date()

            // Nếu chưa gửi welcome bao giờ, cần gửi
            if (!userState.welcome_sent) return true

            // Nếu đã gửi rồi, kiểm tra cooldown nghiêm ngặt
            if (userState.last_welcome_sent) {
                const lastWelcomeTime = new Date(userState.last_welcome_sent)
                const timeDiff = now.getTime() - lastWelcomeTime.getTime()
                const cooldownPeriod = 24 * 60 * 60 * 1000 // 24 giờ

                if (timeDiff < cooldownPeriod) {
                    logger.debug('Welcome still in cooldown period', {
                        facebookId,
                        timeDiff,
                        cooldownPeriod,
                        lastWelcome: userState.last_welcome_sent
                    })
                    return false
                }
            }

            // Nếu quá thời gian cooldown, kiểm tra interaction gần đây
            const lastInteractionTime = new Date(userState.last_interaction)
            const timeSinceLastInteraction = now.getTime() - lastInteractionTime.getTime()

            // Chỉ gửi lại welcome nếu user có interaction gần đây (trong vòng 10 phút)
            if (timeSinceLastInteraction > 10 * 60 * 1000) {
                logger.debug('User has no recent interaction, skipping welcome', {
                    facebookId,
                    timeSinceLastInteraction
                })
                return false
            }

            // Nếu user đã tương tác quá nhiều lần, có thể cần đánh giá lại
            if (userState.interaction_count > 10) {
                logger.debug('User has many interactions, might need re-welcome', {
                    facebookId,
                    interactionCount: userState.interaction_count
                })
                // Có thể cần logic đặc biệt ở đây
            }

            return true
        } catch (error) {
            logger.error('Error checking if should send welcome', { facebookId, error })
            return false // Lỗi thì không gửi để tránh spam
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
     * Cập nhật trạng thái welcome trong bảng users
     */
    private static async updateUserWelcomeStatus(facebookId: string, welcomeSent: boolean, timestamp: string): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('users')
                .update({
                    welcome_message_sent: welcomeSent,
                    welcome_interaction_count: 1,
                    updated_at: timestamp
                })
                .eq('facebook_id', facebookId)

            if (error) {
                logger.warn('Failed to update user welcome status in users table', { facebookId, error: error.message })
            } else {
                logger.debug('User welcome status updated in users table', { facebookId, welcomeSent })
            }
        } catch (error) {
            logger.error('Exception updating user welcome status', { facebookId, error })
        }
    }

    /**
     * Retry mechanism để đánh dấu welcome đã gửi
     */
    private static async retryWelcomeMark(facebookId: string): Promise<void> {
        const maxRetries = 3
        const retryDelay = 1000 // 1 second

        for (let i = 0; i < maxRetries; i++) {
            try {
                const currentTime = new Date().toISOString()

                // Thử cập nhật lại
                await Promise.all([
                    this.updateUserState(facebookId, {
                        welcome_sent: true,
                        last_welcome_sent: currentTime,
                        last_interaction: currentTime
                    }),
                    this.updateUserWelcomeStatus(facebookId, true, currentTime)
                ])

                logger.info('Welcome mark retry successful', { facebookId, attempt: i + 1 })
                return

            } catch (error) {
                logger.warn(`Welcome mark retry attempt ${i + 1} failed`, { facebookId, error })

                if (i < maxRetries - 1) {
                    // Đợi trước khi thử lại
                    await new Promise(resolve => setTimeout(resolve, retryDelay))
                }
            }
        }

        logger.error('All welcome mark retry attempts failed', { facebookId, maxRetries })
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
