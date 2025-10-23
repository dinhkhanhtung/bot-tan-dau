/**
 * Centralized Anti-Spam Service
 * Xử lý tất cả logic chống spam trong một service duy nhất
 * Tránh duplicate logic và xung đột giữa các service
 */

import { logger } from './logger'
import { handleAntiSpam, trackNonButtonMessage } from './anti-spam'
import { AdminTakeoverService } from './admin-takeover-service'
import { getUserByFacebookId } from './user-service'

export interface SpamCheckResult {
    blocked: boolean
    reason?: string
    action?: string
    message?: string
}

/**
 * Centralized service để kiểm tra spam cho tất cả tin nhắn
 * Đảm bảo chỉ gọi một lần cho mỗi tin nhắn và không có duplicate logic
 */
export class AntiSpamService {
    private static messageCache = new Map<string, { result: SpamCheckResult, timestamp: number }>()
    private static readonly CACHE_DURATION = 10000 // 10 seconds cache (tăng từ 5s lên 10s)

    /**
     * Kiểm tra spam cho tin nhắn - ĐIỂM VÀO DUY NHẤT
     */
    static async checkMessage(user: any, text: string): Promise<SpamCheckResult> {
        try {
            const cacheKey = `${user.facebook_id}_${text}_${Date.now()}`

            // Check cache để tránh duplicate processing
            const cached = this.messageCache.get(cacheKey)
            if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
                return cached.result
            }

            // Lấy thông tin user
            const userData = await getUserByFacebookId(user.facebook_id)
            const userStatus = userData?.status || 'pending' // Changed from 'new_user' to 'pending' for consistency

            // QUAN TRỌNG: KIỂM TRA TIN NHẮN LIÊN TIẾP - CHỈ KÍCH HOẠT KHI GỬI 2 LẦN
            // User có thể gửi text bình thường, nhưng nếu gửi 2 lần liên tiếp → chuyển mode đợi admin
            const isConsecutiveSpam = await AdminTakeoverService.handleConsecutiveUserMessages(user.facebook_id, text)
            if (isConsecutiveSpam) {
                const blockResult: SpamCheckResult = {
                    blocked: true,
                    reason: 'consecutive_messages',
                    action: 'admin_notified_and_show_buttons',
                    message: '👨‍💼 Admin đã nhận được tin nhắn của bạn và sẽ sớm phản hồi!\n⏰ Vui lòng đợi trong giây lát...\n💡 Bạn có thể tiếp tục gửi tin nhắn nếu cần hỗ trợ thêm.'
                }

                this.messageCache.set(cacheKey, { result: blockResult, timestamp: Date.now() })
                return blockResult
            }

            // Nếu chưa phải 2 lần liên tiếp - cho phép xử lý bình thường
            const allowResult: SpamCheckResult = { blocked: false }
            this.messageCache.set(cacheKey, { result: allowResult, timestamp: Date.now() })
            return allowResult

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
            const cacheKey = `${user.facebook_id}_${action}_${Date.now()}`

            // Check cache
            const cached = this.messageCache.get(cacheKey)
            if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
                return cached.result
            }

            // Lấy thông tin user
            const userData = await getUserByFacebookId(user.facebook_id)
            const userStatus = userData?.status || 'pending' // Changed from 'new_user' to 'pending' for consistency

            // 1. KIỂM TRA TIN NHẮN LIÊN TIẾP
            const isConsecutiveSpam = await AdminTakeoverService.handleConsecutiveUserMessages(user.facebook_id, action)
            if (isConsecutiveSpam) {
                const result: SpamCheckResult = {
                    blocked: true,
                    reason: 'consecutive_actions',
                    action: 'admin_notified',
                    message: '💬 Đinh Khánh Tùng đã nhận được tin nhắn của bạn và sẽ sớm phản hồi!'
                }

                this.messageCache.set(cacheKey, { result, timestamp: Date.now() })
                return result
            }

            // 2. KIỂM TRA ANTI-SPAM CHÍNH
            const spamResult = await handleAntiSpam(user.facebook_id, action, userStatus, null)
            if (spamResult.block) {
                const result: SpamCheckResult = {
                    blocked: true,
                    reason: 'anti_spam',
                    action: spamResult.action,
                    message: spamResult.message || '🚫 Hành động đã bị chặn do vi phạm quy định spam'
                }

                this.messageCache.set(cacheKey, { result, timestamp: Date.now() })
                return result
            }

            // 3. KIỂM TRA NON-BUTTON MESSAGES
            const nonButtonResult = await trackNonButtonMessage(user.facebook_id, action)
            if (nonButtonResult.shouldStopBot) {
                const result: SpamCheckResult = {
                    blocked: true,
                    reason: 'non_button_messages',
                    action: 'bot_stopped',
                    message: '🚫 Bot đã tạm dừng do bạn thực hiện quá nhiều hành động!'
                }

                this.messageCache.set(cacheKey, { result, timestamp: Date.now() })
                return result
            }

            // Không có spam
            const result: SpamCheckResult = { blocked: false }
            this.messageCache.set(cacheKey, { result, timestamp: Date.now() })
            return result

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
     * Reset cache cho user (khi admin chat xong)
     */
    static resetUserCache(facebookId: string): void {
        // Clear all cache entries for this user
        Array.from(this.messageCache.entries()).forEach(([key, value]) => {
            if (key.startsWith(facebookId)) {
                this.messageCache.delete(key)
            }
        })

        logger.info('Anti-spam cache reset for user', { facebookId })
    }

    /**
     * Cleanup old cache entries
     */
    static cleanupCache(): void {
        const now = Date.now()
        const expiredKeys: string[] = []

        Array.from(this.messageCache.entries()).forEach(([key, value]) => {
            if (now - value.timestamp > this.CACHE_DURATION) {
                expiredKeys.push(key)
            }
        })

        expiredKeys.forEach(key => this.messageCache.delete(key))

        if (expiredKeys.length > 0) {
            logger.debug('Cleaned up anti-spam cache', { entriesRemoved: expiredKeys.length })
        }
    }

    /**
     * Get cache statistics
     */
    static getCacheStats(): { size: number, hitRate: number } {
        return {
            size: this.messageCache.size,
            hitRate: 0 // TODO: Implement hit rate tracking if needed
        }
    }
}

// Auto cleanup cache every 5 minutes
setInterval(() => {
    AntiSpamService.cleanupCache()
}, 5 * 60 * 1000)
