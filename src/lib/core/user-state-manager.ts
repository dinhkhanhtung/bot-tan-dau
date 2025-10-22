/**
 * User State Manager - Quản lý trạng thái user THỐNG NHẤT
 * Quản lý state và mode của user trong một service duy nhất
 */

import { supabaseAdmin } from '../supabase'
import { sendMessage, sendQuickReply, createQuickReply } from '../facebook-api'
import { logger } from '../logger'
import { welcomeService, WelcomeType } from '../welcome-service'
import { getUserByFacebookId } from '../user-service'

export enum UserState {
    NEW_USER = 'new_user',              // User mới, chưa gửi welcome
    CHOOSING = 'choosing',              // Đang chọn chế độ sử dụng
    USING_BOT = 'using_bot',            // Đang sử dụng bot
    CHATTING_ADMIN = 'chatting_admin'   // Đang chat với admin
}

export interface UserStateData {
    facebook_id: string
    current_mode: UserState
    last_mode_change: string
    mode_change_count: number
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
                    current_mode: state,
                    last_mode_change: new Date().toISOString(),
                    mode_change_count: currentState ? currentState.mode_change_count + 1 : 1,
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
            // Gửi welcome message (đã bao gồm buttons)
            await welcomeService.sendWelcome(facebookId, WelcomeType.NEW_USER)

            // Cập nhật state thành choosing
            await this.updateUserState(facebookId, UserState.CHOOSING)

            logger.info('New user processed', { facebookId })
        } catch (error) {
            logger.error('Error handling new user', { facebookId, error })
        }
    }

    /**
     * Gửi menu chọn chế độ sử dụng - DISABLED to avoid duplicate welcome
     */
    static async sendChoosingMenu(facebookId: string): Promise<void> {
        // DISABLED - Welcome is already sent by WelcomeService
        // This prevents duplicate welcome messages
        logger.info('Choosing menu disabled - welcome already sent by WelcomeService', { facebookId })
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
     * Gửi menu chức năng bot - điều chỉnh theo trạng thái đăng ký
     */
    static async sendBotMenu(facebookId: string): Promise<void> {
        try {
            // Lấy thông tin user để kiểm tra trạng thái đăng ký
            const userData = await getUserByFacebookId(facebookId)

            // Tạo danh sách buttons dựa trên trạng thái user
            const buttons = []

            // Nếu user chưa đăng ký (new_user, pending) thì hiển thị nút đăng ký
            if (!userData || userData.status === 'new_user' || userData.status === 'pending') {
                buttons.push(createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'))
            }

            // Các nút khác luôn hiển thị
            buttons.push(
                createQuickReply('🛒 ĐĂNG TIN BÁN HÀNG', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('🏠 VỀ MENU CHÍNH', 'BACK_TO_MAIN')
            )

            await sendQuickReply(facebookId, 'Chọn chức năng:', buttons)
        } catch (error) {
            logger.error('Error sending bot menu', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user muốn về menu chính
     */
    static async handleBackToMain(facebookId: string): Promise<void> {
        try {
            // Send welcome message again (which will check registration status and show appropriate buttons)
            const { welcomeService } = await import('../welcome-service')
            await welcomeService.sendWelcome(facebookId, undefined)
        } catch (error) {
            logger.error('Error handling back to main', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user chọn dừng bot
     */
    static async handleStopBot(facebookId: string): Promise<void> {
        try {
            await this.updateUserState(facebookId, UserState.CHOOSING)

            await sendMessage(facebookId,
                `🛑 ĐÃ DỪNG BOT!\n━━━━━━━━━━━━━━━━━━━━\n✅ Bot đã được tạm dừng\n💬 Bạn có thể chat trực tiếp với admin\n━━━━━━━━━━━━━━━━━━━━`
            )

            logger.info('User stopped bot', { facebookId })
        } catch (error) {
            logger.error('Error handling stop bot', { facebookId, error })
        }
    }

    /**
     * Kiểm tra user có đang dùng bot không
     */
    static async isUsingBot(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            return userState?.current_mode === UserState.USING_BOT && userState?.bot_active === true
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
            return userState?.current_mode === UserState.CHATTING_ADMIN
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
                    current_mode: UserState.CHOOSING,
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

            // Nếu chưa có state, kiểm tra user data và session
            if (!currentState) {
                const userData = await getUserByFacebookId(facebookId)
                const welcomeAlreadySent = userData?.welcome_sent || userData?.welcome_message_sent

                // Kiểm tra xem user có đang trong session nào không
                const { SessionManager } = await import('./session-manager')
                const activeSession = await SessionManager.getSession(facebookId)

                if (activeSession) {
                    // User đang trong session (ví dụ: registration flow)
                    // Không reset state, giữ nguyên để flow tiếp tục
                    logger.info('User in active session, preserving state', {
                        facebookId,
                        flow: activeSession.current_flow
                    })
                    return UserState.USING_BOT // Trả về state mặc định nhưng không reset
                }

                if (!welcomeAlreadySent) {
                    // User mới - gửi welcome và chuyển sang choosing
                    await this.handleNewUser(facebookId)
                    return UserState.CHOOSING
                } else {
                    // Đã gửi welcome rồi - chỉ gửi menu choosing
                    await this.sendChoosingMenu(facebookId)
                    return UserState.CHOOSING
                }
            }

            // Trả về trạng thái hiện tại
            return currentState.current_mode

        } catch (error) {
            logger.error('Error in handleIncomingMessage', { facebookId, error })
            // Fallback: gửi menu choosing
            await this.sendChoosingMenu(facebookId)
            return UserState.CHOOSING
        }
    }

    /**
     * Check if user should be handled by state manager or flows - DISABLED
     * This logic is now handled in UnifiedBotSystem for better clarity
     */
    static async shouldHandleByStateManager(facebookId: string): Promise<boolean> {
        // DISABLED - Logic moved to UnifiedBotSystem for better clarity
        // This prevents duplicate routing logic
        return true
    }

    /**
     * Helper method to add delay between messages
     */
    private static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
