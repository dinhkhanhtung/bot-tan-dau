import { supabaseAdmin } from './supabase'
import { SmartContextManager, UserType, UserPermissions } from './core/smart-context-manager'

/**
 * Safety Measures - Các biện pháp bảo vệ chống spam và abuse
 * 
 * Bao gồm:
 * - Rate limiting cho từng loại user
 * - Permission validation
 * - Abuse detection
 * - Monitoring và logging
 */

export interface RateLimitConfig {
    maxListingsPerDay: number
    maxSearchesPerDay: number
    maxMessagesPerDay: number
    maxAdminChatPerDay: number
    windowMs: number // 24 hours in milliseconds
}

export interface UserActivity {
    facebook_id: string
    date: string
    listings_count: number
    searches_count: number
    messages_count: number
    admin_chat_count: number
    last_activity: string
}

export class SafetyMeasures {
    private static readonly RATE_LIMIT_CONFIG: Record<UserType, RateLimitConfig> = {
        [UserType.ADMIN]: {
            maxListingsPerDay: 999,
            maxSearchesPerDay: 999,
            maxMessagesPerDay: 999,
            maxAdminChatPerDay: 999,
            windowMs: 24 * 60 * 60 * 1000 // 24 hours
        },
        [UserType.REGISTERED_USER]: {
            maxListingsPerDay: 10,
            maxSearchesPerDay: 50,
            maxMessagesPerDay: 100,
            maxAdminChatPerDay: 20,
            windowMs: 24 * 60 * 60 * 1000
        },
        [UserType.TRIAL_USER]: {
            maxListingsPerDay: 5,
            maxSearchesPerDay: 20,
            maxMessagesPerDay: 50,
            maxAdminChatPerDay: 10,
            windowMs: 24 * 60 * 60 * 1000
        },
        [UserType.PENDING_USER]: {
            maxListingsPerDay: 0, // ← GIỚI HẠN: Không được niêm yết
            maxSearchesPerDay: 10, // ← GIỚI HẠN: Chỉ 10 lần tìm kiếm/ngày
            maxMessagesPerDay: 20, // ← GIỚI HẠN: Chỉ 20 tin nhắn/ngày
            maxAdminChatPerDay: 5, // ← GIỚI HẠN: Chỉ 5 lần liên hệ admin/ngày
            windowMs: 24 * 60 * 60 * 1000
        },
        [UserType.NEW_USER]: {
            maxListingsPerDay: 0,
            maxSearchesPerDay: 0,
            maxMessagesPerDay: 5,
            maxAdminChatPerDay: 3,
            windowMs: 24 * 60 * 60 * 1000
        },
        [UserType.EXPIRED_USER]: {
            maxListingsPerDay: 0,
            maxSearchesPerDay: 0,
            maxMessagesPerDay: 5,
            maxAdminChatPerDay: 3,
            windowMs: 24 * 60 * 60 * 1000
        }
    }

    /**
     * Kiểm tra rate limit cho user
     */
    static async checkRateLimit(
        userType: UserType,
        action: 'listings' | 'searches' | 'messages' | 'admin_chat',
        facebookId: string
    ): Promise<{ allowed: boolean, remaining: number, resetTime: number }> {
        try {
            const config = this.RATE_LIMIT_CONFIG[userType]
            const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

            // Lấy hoặc tạo activity record cho hôm nay
            let activity = await this.getUserActivity(facebookId, today)
            if (!activity) {
                activity = await this.createUserActivity(facebookId, today)
            }

            // Kiểm tra limit
            const currentCount = this.getActionCount(activity, action)
            const maxAllowed = this.getMaxAllowed(config, action)

            if (currentCount >= maxAllowed) {
                const resetTime = new Date().setHours(24, 0, 0, 0) // Reset at midnight
                return {
                    allowed: false,
                    remaining: 0,
                    resetTime
                }
            }

            return {
                allowed: true,
                remaining: maxAllowed - currentCount,
                resetTime: new Date().setHours(24, 0, 0, 0)
            }

        } catch (error) {
            console.error('Error checking rate limit:', error)
            // Fail open - allow action if there's an error
            return {
                allowed: true,
                remaining: 999,
                resetTime: Date.now() + 24 * 60 * 60 * 1000
            }
        }
    }

    /**
     * Ghi nhận activity của user
     */
    static async recordActivity(
        userType: UserType,
        action: 'listings' | 'searches' | 'messages' | 'admin_chat',
        facebookId: string
    ): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0]

            // Kiểm tra rate limit trước
            const rateLimitCheck = await this.checkRateLimit(userType, action, facebookId)
            if (!rateLimitCheck.allowed) {
                console.warn(`Rate limit exceeded for user ${facebookId}, action: ${action}`)
                return
            }

            // Cập nhật activity
            const { error } = await supabaseAdmin
                .from('user_activities')
                .upsert({
                    facebook_id: facebookId,
                    date: today,
                    [this.getActionField(action)]: 1, // Will be incremented by database trigger
                    last_activity: new Date().toISOString()
                }, {
                    onConflict: 'facebook_id,date'
                })

            if (error) {
                console.error('Error recording activity:', error)
            }

        } catch (error) {
            console.error('Error recording activity:', error)
        }
    }

    /**
     * Kiểm tra permission cho action
     */
    static async checkPermission(
        userType: UserType,
        action: keyof UserPermissions,
        facebookId: string
    ): Promise<{ allowed: boolean, reason?: string }> {
        try {
            const permissions = SmartContextManager.getUserPermissions(userType)

            if (!permissions[action]) {
                return {
                    allowed: false,
                    reason: `User type ${userType} does not have permission for ${action}`
                }
            }

            // Kiểm tra rate limit nếu cần
            if (action === 'canCreateListings') {
                const rateLimit = await this.checkRateLimit(userType, 'listings', facebookId)
                if (!rateLimit.allowed) {
                    return {
                        allowed: false,
                        reason: 'Daily listing limit exceeded'
                    }
                }
            }

            if (action === 'canSearch') {
                const rateLimit = await this.checkRateLimit(userType, 'searches', facebookId)
                if (!rateLimit.allowed) {
                    return {
                        allowed: false,
                        reason: 'Daily search limit exceeded'
                    }
                }
            }

            return { allowed: true }

        } catch (error) {
            console.error('Error checking permission:', error)
            return {
                allowed: false,
                reason: 'Permission check failed'
            }
        }
    }

    /**
     * Phát hiện abuse patterns
     */
    static async detectAbuse(facebookId: string): Promise<{ isAbuse: boolean, reason?: string }> {
        try {
            const today = new Date().toISOString().split('T')[0]
            const activity = await this.getUserActivity(facebookId, today)

            if (!activity) {
                return { isAbuse: false }
            }

            // Kiểm tra các pattern abuse
            const totalMessages = activity.messages_count || 0
            const totalSearches = activity.searches_count || 0
            const totalListings = activity.listings_count || 0

            // Pattern 1: Quá nhiều tin nhắn trong ngày
            if (totalMessages > 200) {
                return {
                    isAbuse: true,
                    reason: 'Excessive messaging detected'
                }
            }

            // Pattern 2: Quá nhiều tìm kiếm trong ngày
            if (totalSearches > 100) {
                return {
                    isAbuse: true,
                    reason: 'Excessive searching detected'
                }
            }

            // Pattern 3: Quá nhiều niêm yết trong ngày
            if (totalListings > 20) {
                return {
                    isAbuse: true,
                    reason: 'Excessive listing creation detected'
                }
            }

            return { isAbuse: false }

        } catch (error) {
            console.error('Error detecting abuse:', error)
            return { isAbuse: false }
        }
    }

    /**
     * Lấy thống kê activity của user
     */
    static async getUserActivityStats(facebookId: string, days: number = 7): Promise<UserActivity[]> {
        try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            const startDateStr = startDate.toISOString().split('T')[0]

            const { data, error } = await supabaseAdmin
                .from('user_activities')
                .select('*')
                .eq('facebook_id', facebookId)
                .gte('date', startDateStr)
                .order('date', { ascending: false })

            if (error) {
                console.error('Error getting user activity stats:', error)
                return []
            }

            return data || []

        } catch (error) {
            console.error('Error getting user activity stats:', error)
            return []
        }
    }

    // Helper methods
    private static async getUserActivity(facebookId: string, date: string): Promise<UserActivity | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_activities')
                .select('*')
                .eq('facebook_id', facebookId)
                .eq('date', date)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error getting user activity:', error)
                return null
            }

            return data

        } catch (error) {
            console.error('Error getting user activity:', error)
            return null
        }
    }

    private static async createUserActivity(facebookId: string, date: string): Promise<UserActivity> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_activities')
                .insert({
                    facebook_id: facebookId,
                    date: date,
                    listings_count: 0,
                    searches_count: 0,
                    messages_count: 0,
                    admin_chat_count: 0,
                    last_activity: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('Error creating user activity:', error)
                throw error
            }

            return data

        } catch (error) {
            console.error('Error creating user activity:', error)
            throw error
        }
    }

    private static getActionCount(activity: UserActivity, action: string): number {
        switch (action) {
            case 'listings': return activity.listings_count || 0
            case 'searches': return activity.searches_count || 0
            case 'messages': return activity.messages_count || 0
            case 'admin_chat': return activity.admin_chat_count || 0
            default: return 0
        }
    }

    private static getMaxAllowed(config: RateLimitConfig, action: string): number {
        switch (action) {
            case 'listings': return config.maxListingsPerDay
            case 'searches': return config.maxSearchesPerDay
            case 'messages': return config.maxMessagesPerDay
            case 'admin_chat': return config.maxAdminChatPerDay
            default: return 0
        }
    }

    private static getActionField(action: string): string {
        switch (action) {
            case 'listings': return 'listings_count'
            case 'searches': return 'searches_count'
            case 'messages': return 'messages_count'
            case 'admin_chat': return 'admin_chat_count'
            default: return 'messages_count'
        }
    }
}
