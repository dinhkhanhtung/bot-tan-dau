import { supabaseAdmin } from './supabase'
import { SmartContextManager, UserType } from './core/smart-context-manager'

/**
 * Monitoring và Logging System cho PENDING_USER
 * 
 * Bao gồm:
 * - User activity logging
 * - Performance monitoring
 * - Error tracking
 * - Analytics và reporting
 */

export interface UserActivityLog {
    id?: string
    facebook_id: string
    user_type: UserType
    action: string
    details?: any
    timestamp: string
    success: boolean
    error_message?: string
    response_time_ms?: number
}

export interface SystemMetrics {
    total_pending_users: number
    pending_users_today: number
    total_searches_today: number
    total_messages_today: number
    average_response_time_ms: number
    error_rate_percentage: number
}

export class MonitoringSystem {
    private static readonly LOG_TABLE = 'user_activity_logs'
    private static readonly METRICS_TABLE = 'system_metrics'

    /**
     * Log user activity
     */
    static async logUserActivity(
        facebookId: string,
        userType: UserType,
        action: string,
        details?: any,
        success: boolean = true,
        errorMessage?: string,
        responseTimeMs?: number
    ): Promise<void> {
        try {
            const logEntry: UserActivityLog = {
                facebook_id: facebookId,
                user_type: userType,
                action,
                details: details ? JSON.stringify(details) : null,
                timestamp: new Date().toISOString(),
                success,
                error_message: errorMessage,
                response_time_ms: responseTimeMs
            }

            const { error } = await supabaseAdmin
                .from(this.LOG_TABLE)
                .insert(logEntry)

            if (error) {
                console.error('Error logging user activity:', error)
            }

        } catch (error) {
            console.error('Error in logUserActivity:', error)
        }
    }

    /**
     * Log error
     */
    static async logError(
        facebookId: string,
        userType: UserType,
        action: string,
        error: Error,
        details?: any
    ): Promise<void> {
        await this.logUserActivity(
            facebookId,
            userType,
            action,
            details,
            false,
            error.message
        )
    }

    /**
     * Log performance metrics
     */
    static async logPerformance(
        facebookId: string,
        userType: UserType,
        action: string,
        responseTimeMs: number,
        details?: any
    ): Promise<void> {
        await this.logUserActivity(
            facebookId,
            userType,
            action,
            details,
            true,
            undefined,
            responseTimeMs
        )
    }

    /**
     * Get system metrics
     */
    static async getSystemMetrics(): Promise<SystemMetrics> {
        try {
            const today = new Date().toISOString().split('T')[0]

            // Get total pending users
            const { count: totalPendingUsers } = await supabaseAdmin
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            // Get pending users created today
            const { count: pendingUsersToday } = await supabaseAdmin
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .gte('created_at', `${today}T00:00:00.000Z`)

            // Get total searches today
            const { count: totalSearchesToday } = await supabaseAdmin
                .from('user_activities')
                .select('*', { count: 'exact', head: true })
                .eq('date', today)
                .gt('searches_count', 0)

            // Get total messages today
            const { count: totalMessagesToday } = await supabaseAdmin
                .from('user_activities')
                .select('*', { count: 'exact', head: true })
                .eq('date', today)
                .gt('messages_count', 0)

            // Get average response time
            const { data: responseTimes } = await supabaseAdmin
                .from(this.LOG_TABLE)
                .select('response_time_ms')
                .eq('success', true)
                .not('response_time_ms', 'is', null)
                .gte('timestamp', `${today}T00:00:00.000Z`)

            const averageResponseTime = responseTimes && responseTimes.length > 0
                ? responseTimes.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / responseTimes.length
                : 0

            // Get error rate
            const { count: totalLogs } = await supabaseAdmin
                .from(this.LOG_TABLE)
                .select('*', { count: 'exact', head: true })
                .gte('timestamp', `${today}T00:00:00.000Z`)

            const { count: errorLogs } = await supabaseAdmin
                .from(this.LOG_TABLE)
                .select('*', { count: 'exact', head: true })
                .eq('success', false)
                .gte('timestamp', `${today}T00:00:00.000Z`)

            const errorRate = totalLogs && totalLogs > 0
                ? (errorLogs || 0) / totalLogs * 100
                : 0

            return {
                total_pending_users: totalPendingUsers || 0,
                pending_users_today: pendingUsersToday || 0,
                total_searches_today: totalSearchesToday || 0,
                total_messages_today: totalMessagesToday || 0,
                average_response_time_ms: Math.round(averageResponseTime),
                error_rate_percentage: Math.round(errorRate * 100) / 100
            }

        } catch (error) {
            console.error('Error getting system metrics:', error)
            return {
                total_pending_users: 0,
                pending_users_today: 0,
                total_searches_today: 0,
                total_messages_today: 0,
                average_response_time_ms: 0,
                error_rate_percentage: 0
            }
        }
    }

    /**
     * Get user activity summary
     */
    static async getUserActivitySummary(facebookId: string, days: number = 7): Promise<any> {
        try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            const startDateStr = startDate.toISOString()

            const { data, error } = await supabaseAdmin
                .from(this.LOG_TABLE)
                .select('*')
                .eq('facebook_id', facebookId)
                .gte('timestamp', startDateStr)
                .order('timestamp', { ascending: false })

            if (error) {
                console.error('Error getting user activity summary:', error)
                return null
            }

            // Group by action
            const actionCounts = data?.reduce((acc, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1
                return acc
            }, {} as Record<string, number>) || {}

            // Calculate success rate
            const totalLogs = data?.length || 0
            const successfulLogs = data?.filter(log => log.success).length || 0
            const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0

            // Calculate average response time
            const responseTimes = data?.filter(log => log.response_time_ms).map(log => log.response_time_ms) || []
            const avgResponseTime = responseTimes.length > 0
                ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                : 0

            return {
                total_activities: totalLogs,
                success_rate: Math.round(successRate * 100) / 100,
                average_response_time_ms: Math.round(avgResponseTime),
                action_counts: actionCounts,
                recent_activities: data?.slice(0, 10) || []
            }

        } catch (error) {
            console.error('Error getting user activity summary:', error)
            return null
        }
    }

    /**
     * Get pending users analytics
     */
    static async getPendingUsersAnalytics(): Promise<any> {
        try {
            const today = new Date().toISOString().split('T')[0]
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            const weekAgoStr = weekAgo.toISOString().split('T')[0]

            // Get pending users by day
            const { data: pendingUsersByDay } = await supabaseAdmin
                .from('users')
                .select('created_at')
                .eq('status', 'pending')
                .gte('created_at', `${weekAgoStr}T00:00:00.000Z`)

            // Group by day
            const dailyCounts = pendingUsersByDay?.reduce((acc, user) => {
                const day = user.created_at.split('T')[0]
                acc[day] = (acc[day] || 0) + 1
                return acc
            }, {} as Record<string, number>) || {}

            // Get average pending time
            const { data: allPendingUsers } = await supabaseAdmin
                .from('users')
                .select('created_at')
                .eq('status', 'pending')

            const avgPendingTime = allPendingUsers && allPendingUsers.length > 0 ? 
                allPendingUsers.reduce((sum, user) => {
                    const pendingDays = Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    return sum + pendingDays
                }, 0) / allPendingUsers.length : 0

            return {
                daily_pending_users: dailyCounts,
                average_pending_time_days: Math.round(avgPendingTime * 100) / 100,
                total_pending_users: allPendingUsers?.length || 0
            }

        } catch (error) {
            console.error('Error getting pending users analytics:', error)
            return null
        }
    }

    /**
     * Clean up old logs
     */
    static async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
        try {
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
            const cutoffDateStr = cutoffDate.toISOString()

            const { error } = await supabaseAdmin
                .from(this.LOG_TABLE)
                .delete()
                .lt('timestamp', cutoffDateStr)

            if (error) {
                console.error('Error cleaning up old logs:', error)
            } else {
                console.log(`Cleaned up logs older than ${daysToKeep} days`)
            }

        } catch (error) {
            console.error('Error in cleanupOldLogs:', error)
        }
    }
}
