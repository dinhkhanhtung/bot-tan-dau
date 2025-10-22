/**
 * User State Manager - Quản lý trạng thái user THỐNG NHẤT
 * Gộp logic từ UserModeService và UnifiedBotSystem để tránh xung đột
 */

import { supabaseAdmin } from '../supabase'
import { sendMessage, sendQuickReply, createQuickReply } from '../facebook-api'
import { logger } from '../logger'
import { welcomeService, WelcomeType } from '../welcome-service'
import { getUserByFacebookId } from '../database-service'

export enum UserState {
    NEW_USER = 'new_user',              // User mới, chưa gửi welcome
    CHOOSING_MODE = 'choosing_mode',    // Đang chọn chế độ sử dụng
    USING_BOT = 'using_bot',            // Đang sử dụng bot
    CHATTING_ADMIN = 'chatting_admin'   // Đang chat với admin
}

export interface UserStateData {
    facebook_id: string
    current_state: UserState
    last_state_change: string
    state_change_count: number
    bot_active: boolean
    welcome_sent: boolean
    created_at: string
    updated_at: string
}

export class UserStateManager {
    /**
     * Lấy trạng thái hiện tại của user
     */
    static async getUserState(facebookId: string): Promise<UserStateData | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('*')
                .eq('facebook_id', facebookId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting user state', { facebookId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            logger.error('Exception getting user state', { facebookId, error })
            return null
        }
    }

    /**
     * Cập nhật trạng thái user
     */
    static async updateUserState(facebookId: string, state: UserState): Promise<void> {
        try {
            const currentState = await this.getUserState(facebookId)

            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: facebookId,
                    current_state: state,
                    last_state_change: new Date().toISOString(),
                    state_change_count: currentState ? currentState.state_change_count + 1 : 1,
                    bot_active: state === UserState.USING_BOT,
                    updated_at: new Date().toISOString()
                })

            logger.info('User state updated', { facebookId, state })
        } catch (error) {
            logger.error('Error updating user state', { facebookId, state, error })
        }
    }

    /**
     * Xử lý user mới - chỉ gửi welcome 1 lần
     */
    static async handleNewUser(facebookId: string): Promise<void> {
        try {
            // Gửi welcome message
            await welcomeService.sendWelcome(facebookId, WelcomeType.NEW_USER)

            // Đợi 2 giây để user đọc welcome
            await this.delay(2000)

            // Chuyển sang trạng thái choosing mode và gửi menu
            await this.sendChoosingMenu(facebookId)

            logger.info('New user processed', { facebookId })
        } catch (error) {
            logger.error('Error handling new user', { facebookId, error })
        }
    }

    /**
     * Gửi menu chọn chế độ sử dụng
     */
    static async sendChoosingMenu(facebookId: string): Promise<void> {
        try {
            await sendMessage(facebookId,
                `🎯 CHỌN CHẾ ĐỘ SỬ DỤNG\n━━━━━━━━━━━━━━━━━━━━\n🚀 Dùng bot: Tự động mua bán với cộng đồng\n💬 Chat với admin: Đinh Khánh Tùng hỗ trợ trực tiếp\n━━━━━━━━━━━━━━━━━━━━`
            )

            await sendQuickReply(facebookId, 'Bạn muốn làm gì?', [
                createQuickReply('🚀 DÙNG BOT', 'USE_BOT'),
                createQuickReply('💬 CHAT VỚI ADMIN', 'CHAT_ADMIN')
            ])

            await this.updateUserState(facebookId, UserState.CHOOSING_MODE)
        } catch (error) {
            logger.error('Error sending choosing menu', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user chọn dùng bot
     */
    static async handleUseBot(facebookId: string): Promise<void> {
        try {
            // Cập nhật trạng thái
            await this.updateUserState(facebookId, UserState.USING_BOT)

            // Gửi thông báo chuyển mode
            await sendMessage(facebookId,
                `✅ ĐÃ CHUYỂN SANG CHẾ ĐỘ BOT!\n━━━━━━━━━━━━━━━━━━━━\n🎯 Bạn có thể sử dụng tất cả tính năng bot ngay bây giờ\n━━━━━━━━━━━━━━━━━━━━`
            )

            // Đợi 1 giây rồi gửi menu chức năng bot
            await this.delay(1000)
            await this.sendBotMenu(facebookId)

            logger.info('User started using bot', { facebookId })
        } catch (error) {
            logger.error('Error handling use bot', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user chọn chat với admin
     */
    static async handleChatWithAdmin(facebookId: string): Promise<void> {
        try {
            await this.updateUserState(facebookId, UserState.CHATTING_ADMIN)

            await sendMessage(facebookId,
                `💬 ĐINH KHÁNH TÙNG ĐÃ NHẬN ĐƯỢC TIN NHẮN CỦA BẠN!\n━━━━━━━━━━━━━━━━━━━━\n⏰ Admin sẽ phản hồi trong thời gian sớm nhất\n📞 SĐT: 0982581222 (nếu cần gấp)\n━━━━━━━━━━━━━━━━━━━━`
            )

            logger.info('User requested admin chat', { facebookId })
        } catch (error) {
            logger.error('Error handling chat with admin', { facebookId, error })
        }
    }

    /**
     * Gửi menu chức năng bot
     */
    static async sendBotMenu(facebookId: string): Promise<void> {
        try {
            await sendQuickReply(facebookId, 'Chọn chức năng bạn muốn sử dụng:', [
                createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                createQuickReply('🛒 ĐĂNG TIN BÁN HÀNG', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('🏠 VỀ MENU CHÍNH', 'BACK_TO_MAIN')
            ])
        } catch (error) {
            logger.error('Error sending bot menu', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user muốn về menu chính
     */
    static async handleBackToMain(facebookId: string): Promise<void> {
        try {
            await this.sendChoosingMenu(facebookId)
        } catch (error) {
            logger.error('Error handling back to main', { facebookId, error })
        }
    }

    /**
     * Kiểm tra user có đang dùng bot không
     */
    static async isUsingBot(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            return userState?.current_state === UserState.USING_BOT && userState?.bot_active === true
        } catch (error) {
            logger.error('Error checking if user is using bot', { facebookId, error })
            return false
        }
    }

    /**
     * Kiểm tra user có đang chat với admin không
     */
    static async isChattingWithAdmin(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            return userState?.current_state === UserState.CHATTING_ADMIN
        } catch (error) {
            logger.error('Error checking if user is chatting with admin', { facebookId, error })
            return false
        }
    }

    /**
     * Reset user về trạng thái choosing mode
     */
    static async resetUserState(facebookId: string): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .update({
                    current_state: UserState.CHOOSING_MODE,
                    bot_active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', facebookId)

            logger.info('User state reset to choosing', { facebookId })
        } catch (error) {
            logger.error('Error resetting user state', { facebookId, error })
        }
    }

    /**
     * Main entry point - xử lý message thống nhất
     */
    static async handleIncomingMessage(facebookId: string): Promise<UserState> {
        try {
            // Lấy trạng thái hiện tại
            const currentState = await this.getUserState(facebookId)

            // Nếu chưa có state, kiểm tra user data
            if (!currentState) {
                const userData = await getUserByFacebookId(facebookId)
                const welcomeAlreadySent = userData?.welcome_sent || userData?.welcome_message_sent

                if (!welcomeAlreadySent) {
                    // User mới - gửi welcome và chuyển sang choosing
                    await this.handleNewUser(facebookId)
                    return UserState.CHOOSING_MODE
                } else {
                    // Đã gửi welcome rồi - chỉ gửi menu choosing
                    await this.sendChoosingMenu(facebookId)
                    return UserState.CHOOSING_MODE
                }
            }

            // Trả về trạng thái hiện tại
            return currentState.current_state

        } catch (error) {
            logger.error('Error in handleIncomingMessage', { facebookId, error })
            // Fallback: gửi menu choosing
            await this.sendChoosingMenu(facebookId)
            return UserState.CHOOSING_MODE
        }
    }

    /**
     * Helper method to add delay between messages
     */
    private static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
