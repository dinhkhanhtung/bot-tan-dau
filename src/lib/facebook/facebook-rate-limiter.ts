/**
 * Facebook Rate Limiter
 * Handles rate limiting for Facebook API calls
 */

// Rate limiting: track last message time per user
const lastMessageTime = new Map<string, number>()
const MIN_MESSAGE_INTERVAL = 500 // 500ms minimum between messages per user

export class FacebookRateLimiter {
    private static instance: FacebookRateLimiter

    private constructor() {}

    public static getInstance(): FacebookRateLimiter {
        if (!FacebookRateLimiter.instance) {
            FacebookRateLimiter.instance = new FacebookRateLimiter()
        }
        return FacebookRateLimiter.instance
    }

    /**
     * Apply rate limiting for a user
     */
    async applyRateLimit(recipientId: string): Promise<void> {
        const lastTime = lastMessageTime.get(recipientId)
        const now = Date.now()

        if (lastTime && (now - lastTime) < MIN_MESSAGE_INTERVAL) {
            const delay = MIN_MESSAGE_INTERVAL - (now - lastTime)
            console.log(`Rate limiting: waiting ${delay}ms before sending message to ${recipientId}`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }

        lastMessageTime.set(recipientId, Date.now())
    }

    /**
     * Check if user can send message immediately
     */
    canSendImmediately(recipientId: string): boolean {
        const lastTime = lastMessageTime.get(recipientId)
        const now = Date.now()

        return !lastTime || (now - lastTime) >= MIN_MESSAGE_INTERVAL
    }

    /**
     * Get remaining wait time for user
     */
    getRemainingWaitTime(recipientId: string): number {
        const lastTime = lastMessageTime.get(recipientId)
        if (!lastTime) return 0

        const now = Date.now()
        const elapsed = now - lastTime

        return Math.max(0, MIN_MESSAGE_INTERVAL - elapsed)
    }

    /**
     * Reset rate limit for user
     */
    resetUserRateLimit(recipientId: string): void {
        lastMessageTime.delete(recipientId)
    }

    /**
     * Get rate limit statistics
     */
    getStats(): { activeUsers: number, averageWaitTime: number } {
        const now = Date.now()
        let totalWaitTime = 0
        let activeUsers = 0

        lastMessageTime.forEach((lastTime) => {
            const waitTime = Math.max(0, MIN_MESSAGE_INTERVAL - (now - lastTime))
            if (waitTime > 0) {
                totalWaitTime += waitTime
                activeUsers++
            }
        })

        return {
            activeUsers,
            averageWaitTime: activeUsers > 0 ? totalWaitTime / activeUsers : 0
        }
    }
}

// Export singleton instance
export const facebookRateLimiter = FacebookRateLimiter.getInstance()
