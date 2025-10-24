/**
 * Simplified Anti-Spam Service
 * CHỈ GIỮ LẠI LOGIC ADMIN TAKEOVER
 * Loại bỏ logic spam phức tạp - chỉ kiểm tra admin takeover
 */

import { logger } from './logger'
import { AdminTakeoverService } from './admin-takeover-service'

export interface SpamCheckResult {
    blocked: boolean
    reason?: string
    action?: string
    message?: string
    warningLevel?: number
}

/**
 * ĐƠN GIẢN HÓA: Anti-spam service CHỈ KIỂM TRA ADMIN TAKEOVER
 */
export class AntiSpamService {
    /**
     * LOGIC ĐƠN GIẢN: Chỉ kiểm tra admin takeover
     */
    static async checkMessage(user: any, text: string): Promise<SpamCheckResult> {
        try {
            const facebookId = user.facebook_id

            // CHỈ KIỂM TRA ADMIN TAKEOVER - không có logic spam phức tạp
            const isAdminActive = await AdminTakeoverService.isAdminActive(facebookId)

            if (isAdminActive) {
                // Admin đang chat - block bot message
                return {
                    blocked: true,
                    reason: 'admin_active',
                    message: '👨‍💼 Admin đang chat với bạn. Bot sẽ tạm dừng.'
                }
            }

            // Không có spam - cho phép tất cả tin nhắn
            return { blocked: false }

        } catch (error) {
            logger.error('Error in AntiSpamService.checkMessage', {
                facebookId: user.facebook_id,
                error: error instanceof Error ? error.message : String(error)
            })

            // Lỗi thì cho phép xử lý tin nhắn để không block user
            return { blocked: false }
        }
    }

    /**
     * Kiểm tra spam cho postback actions (như CONTACT_ADMIN)
     */
    static async checkPostbackAction(user: any, action: string): Promise<SpamCheckResult> {
        try {
            // Postback actions không bị giới hạn spam
            return { blocked: false }

        } catch (error) {
            logger.error('Error in AntiSpamService.checkPostbackAction', {
                facebookId: user.facebook_id,
                action,
                error: error instanceof Error ? error.message : String(error)
            })

            return { blocked: false }
        }
    }

    /**
     * Reset user state khi admin chat xong
     */
    static resetUserCache(facebookId: string): void {
        logger.info('Anti-spam cache reset for user', { facebookId })
    }

    /**
     * Get cache statistics
     */
    static getCacheStats(): { size: number, hitRate: number } {
        return {
            size: 0,
            hitRate: 0
        }
    }
}
