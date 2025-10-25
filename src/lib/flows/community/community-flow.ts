import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
import {
    sendMessage,
    sendQuickReply,
    createQuickReply,
    sendGenericTemplate,
    createGenericElement
} from '../../facebook-api'

/**
 * Community Flow - Clean, modular implementation
 * Handles community features with consistent session management
 */
export class CommunityFlow extends BaseFlow {
    readonly flowName = 'community'

    /**
     * Check if this flow can handle the user/session
     */
    canHandle(user: any, session: any): boolean {
        // Handle null user case
        if (!user || !user.status) {
            return false
        }

        // Can handle if user is registered and wants community features
        return (user.status === 'registered' || user.status === 'trial') &&
            (session?.current_flow === 'community' || !session)
    }

    /**
     * Handle step input
     */
    async handleStep(user: any, text: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handleStep', { text, session })

            // If no session, start community
            if (!session) {
                await this.startCommunity(user)
                return
            }

            // Get current step
            const currentStep = session.step || 0
            console.log(`🔍 Current step: ${currentStep}`)

            // Route to appropriate step handler
            switch (currentStep) {
                case 0:
                    await this.handleCommunityAction(user, text)
                    break
                default:
                    console.log(`❌ Unknown step: ${currentStep}`)
                    await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            await this.handleError(user, error, 'handleStep')
        }
    }

    /**
     * Handle postback events
     */
    async handlePostback(user: any, payload: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handlePostback', { payload, session })

            if (payload.startsWith('COMMUNITY_')) {
                await this.handleCommunityPostback(user, payload, session)
            } else if (payload === 'CANCEL_COMMUNITY') {
                await this.cancelCommunity(user)
            }

        } catch (error) {
            await this.handleError(user, error, 'handlePostback')
        }
    }

    /**
     * Start community process
     */
    private async startCommunity(user: any): Promise<void> {
        try {
            console.log(`👥 Starting community for user: ${user.facebook_id}`)

            // Check user permissions
            if (user.status !== 'registered' && user.status !== 'trial') {
                await sendMessage(user.facebook_id,
                    `🚫 CỘNG ĐỒNG CHỈ DÀNH CHO THÀNH VIÊN\n━━━━━━━━━━━━━━━━━━━━\n👥 Kết nối với hơn 2 triệu Tân Dậu\n🎂 Chia sẻ kỷ niệm tuổi trẻ\n🤝 Hỗ trợ mua bán nội bộ\n🎪 Tham gia sự kiện cộng đồng\n━━━━━━━━━━━━━━━━━━━━\n🚀 Đăng ký ngay để tham gia cộng đồng!`)

                await sendQuickReply(user.facebook_id, 'Bạn muốn:', [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO')
                ])
                return
            }

            // Create new session
            await SessionManager.createSession(user.facebook_id, 'community', 0, {})

            // No intro message - user already has buttons from welcome

            // Send community options
            await sendQuickReply(user.facebook_id, 'Chọn hoạt động cộng đồng:', [
                createQuickReply('🎂 SINH NHẬT', 'COMMUNITY_BIRTHDAY'),
                createQuickReply('🏆 TOP SELLER', 'COMMUNITY_TOP_SELLER'),
                createQuickReply('📖 KỶ NIỆM', 'COMMUNITY_MEMORIES'),
                createQuickReply('🎪 SỰ KIỆN', 'COMMUNITY_EVENTS'),
                createQuickReply('⭐ THÀNH TÍCH', 'COMMUNITY_ACHIEVEMENTS'),
                createQuickReply('🔮 TỬ VI', 'COMMUNITY_HOROSCOPE'),
                createQuickReply('🤝 HỖ TRỢ CHÉO', 'COMMUNITY_SUPPORT'),
                createQuickReply('💬 CHAT NHÓM', 'COMMUNITY_CHAT')
            ])

        } catch (error) {
            await this.handleError(user, error, 'startCommunity')
        }
    }

    /**
     * Handle community action - WITH CANCEL OPTION
     */
    private async handleCommunityAction(user: any, text: string): Promise<void> {
        try {
            console.log(`👥 Processing community action for user: ${user.facebook_id}`)

            // Check if user wants to cancel
            if (text.toLowerCase().trim() === 'hủy' || text.toLowerCase().trim() === 'huy' ||
                text.toLowerCase().trim() === 'cancel' || text.toLowerCase().trim() === 'thoát') {
                await this.cancelCommunity(user)
                return
            }

            // For now, just show community options
            await this.startCommunity(user)

        } catch (error) {
            await this.handleError(user, error, 'handleCommunityAction')
        }
    }

    /**
     * Handle community postback
     */
    private async handleCommunityPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`👥 Processing community postback for user: ${user.facebook_id}`)

            const action = payload.replace('COMMUNITY_', '')
            console.log(`[DEBUG] Selected action: ${action}`)

            // Handle different community actions
            switch (action) {
                case 'BIRTHDAY':
                    await this.handleBirthday(user)
                    break
                case 'TOP_SELLER':
                    await this.handleTopSeller(user)
                    break
                case 'MEMORIES':
                    await this.handleMemories(user)
                    break
                case 'EVENTS':
                    await this.handleEvents(user)
                    break
                case 'ACHIEVEMENTS':
                    await this.handleAchievements(user)
                    break
                case 'HOROSCOPE':
                    await this.handleHoroscope(user)
                    break
                case 'SUPPORT':
                    await this.handleSupport(user)
                    break
                case 'CHAT':
                    await this.handleChat(user)
                    break
                default:
                    await sendMessage(user.facebook_id, '❌ Tính năng chưa được hỗ trợ!')
            }

        } catch (error) {
            await this.handleError(user, error, 'handleCommunityPostback')
        }
    }

    /**
     * Handle birthday feature
     */
    private async handleBirthday(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `🎂 SINH NHẬT TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n🎉 Chúc mừng sinh nhật!\n🎁 Bạn được tặng 100 điểm thưởng\n🎊 Chia sẻ niềm vui với cộng đồng\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleBirthday')
        }
    }

    /**
     * Handle top seller feature
     */
    private async handleTopSeller(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `🏆 TOP SELLER TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n🥇 Người bán hàng top 1\n🥈 Người bán hàng top 2\n🥉 Người bán hàng top 3\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleTopSeller')
        }
    }

    /**
     * Handle memories feature
     */
    private async handleMemories(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `📖 KỶ NIỆM TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n📸 Chia sẻ kỷ niệm tuổi trẻ\n🎭 Những câu chuyện vui\n🎪 Hoạt động cộng đồng\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleMemories')
        }
    }

    /**
     * Handle events feature
     */
    private async handleEvents(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `🎪 SỰ KIỆN CỘNG ĐỒNG\n━━━━━━━━━━━━━━━━━━━━\n🎉 Sự kiện sắp tới\n🎊 Hoạt động nhóm\n🎭 Gặp gỡ offline\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleEvents')
        }
    }

    /**
     * Handle achievements feature
     */
    private async handleAchievements(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `⭐ THÀNH TÍCH CÁ NHÂN\n━━━━━━━━━━━━━━━━━━━━\n🏆 Huy hiệu đã đạt được\n🎯 Mục tiêu sắp tới\n📊 Thống kê hoạt động\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleAchievements')
        }
    }

    /**
     * Handle horoscope feature
     */
    private async handleHoroscope(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `🔮 TỬ VI TÂN DẬU\n━━━━━━━━━━━━━━━━━━━━\n🌟 Tử vi hàng ngày\n🌙 Tử vi hàng tháng\n⭐ Tử vi hàng năm\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleHoroscope')
        }
    }

    /**
     * Handle support feature
     */
    private async handleSupport(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `🤝 HỖ TRỢ CHÉO\n━━━━━━━━━━━━━━━━━━━━\n💬 Hỏi đáp cộng đồng\n🆘 Yêu cầu hỗ trợ\n🤝 Giúp đỡ lẫn nhau\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleSupport')
        }
    }

    /**
     * Handle chat feature
     */
    private async handleChat(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `💬 CHAT NHÓM\n━━━━━━━━━━━━━━━━━━━━\n👥 Tham gia nhóm chat\n💬 Trò chuyện với cộng đồng\n🎉 Chia sẻ tin tức\n━━━━━━━━━━━━━━━━━━━━\n💡 Tính năng đang phát triển...`)

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleChat')
        }
    }

    /**
     * Cancel community
     */
    private async cancelCommunity(user: any): Promise<void> {
        try {
            await SessionManager.deleteSession(user.facebook_id)
            await sendMessage(user.facebook_id, '❌ Đã hủy cộng đồng. Chào tạm biệt!')
        } catch (error) {
            await this.handleError(user, error, 'cancelCommunity')
        }
    }
}
