/**
 * User Mode Service - Quản lý trạng thái user tập trung
 * Đơn giản hóa logic phân biệt người dùng bot vs người chat thường
 */

import { supabaseAdmin } from '../supabase'
import { sendMessage, sendQuickReply, createQuickReply } from '../facebook-api'
import { logger } from '../logger'

export enum UserMode {
    CHOOSING = 'choosing',      // Đang chọn giữa bot/admin
    USING_BOT = 'using_bot',    // Đang sử dụng bot
    CHATTING_ADMIN = 'chatting_admin' // Đang chat với admin
}

export interface UserModeState {
    facebook_id: string
    current_mode: UserMode
    last_mode_change: string
    mode_change_count: number
    bot_active: boolean
    created_at: string
    updated_at: string
}

export class UserModeService {
    /**
     * Lấy trạng thái mode hiện tại của user
     */
    static async getUserMode(facebookId: string): Promise<UserModeState | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('*')
                .eq('facebook_id', facebookId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting user mode', { facebookId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            logger.error('Exception getting user mode', { facebookId, error })
            return null
        }
    }

    /**
     * Cập nhật trạng thái mode của user
     */
    static async updateUserMode(facebookId: string, mode: UserMode): Promise<void> {
        try {
            const currentState = await this.getUserMode(facebookId)

            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: facebookId,
                    current_mode: mode,
                    last_mode_change: new Date().toISOString(),
                    mode_change_count: currentState ? currentState.mode_change_count + 1 : 1,
                    bot_active: mode === UserMode.USING_BOT,
                    updated_at: new Date().toISOString()
                })

            logger.info('User mode updated', { facebookId, mode })
        } catch (error) {
            logger.error('Error updating user mode', { facebookId, mode, error })
        }
    }

    /**
     * Kiểm tra user có đang ở chế độ bot không
     */
    static async isUsingBot(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserMode(facebookId)
            return userState?.current_mode === UserMode.USING_BOT && userState?.bot_active === true
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
            const userState = await this.getUserMode(facebookId)
            return userState?.current_mode === UserMode.CHATTING_ADMIN
        } catch (error) {
            logger.error('Error checking if user is chatting with admin', { facebookId, error })
            return false
        }
    }

    /**
     * Gửi menu phân luồng cho user đang chọn
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

            await this.updateUserMode(facebookId, UserMode.CHOOSING)
        } catch (error) {
            logger.error('Error sending choosing menu', { facebookId, error })
        }
    }

    /**
     * Xử lý khi user chọn dùng bot
     */
    static async handleUseBot(facebookId: string): Promise<void> {
        try {
            await this.updateUserMode(facebookId, UserMode.USING_BOT)

            // Gửi welcome message đơn giản
            await sendMessage(facebookId,
                `🎉 CHÀO MỪNG BẠN ĐẾN VỚI BOT TÂN DẬU!\n━━━━━━━━━━━━━━━━━━━━\n🌟 Bạn có thể:\n🛒 Đăng tin bán hàng (cần đóng phí 3,000đ/ngày)\n🔍 Tìm kiếm sản phẩm miễn phí\n👥 Kết nối cộng đồng Tân Dậu\n━━━━━━━━━━━━━━━━━━━━`
            )

            // Gửi menu chức năng bot
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
            await this.updateUserMode(facebookId, UserMode.CHATTING_ADMIN)

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
     * Reset trạng thái user về choosing mode
     */
    static async resetUserMode(facebookId: string): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .update({
                    current_mode: UserMode.CHOOSING,
                    bot_active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', facebookId)

            logger.info('User mode reset to choosing', { facebookId })
        } catch (error) {
            logger.error('Error resetting user mode', { facebookId, error })
        }
    }
}
