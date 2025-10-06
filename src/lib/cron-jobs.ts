/**
 * Cron Jobs Service - Automated background tasks
 */

import { logger } from './logger'
import { databaseService } from './database-service'
import { supabaseAdmin } from './supabase'

// Run all cron jobs
export async function runAllCronJobs(): Promise<void> {
    try {
        logger.info('Starting all cron jobs')

        // Add your cron job functions here
        await sendTrialReminders()
        await sendBirthdayNotifications()
        await sendTrialExpirationReminders()
        await sendDailyHoroscopeUpdates()
        await cleanupOldData()
        await updateFeaturedListings()
        await sendWeeklyTopSellersNotification()

        logger.info('All cron jobs completed successfully')
    } catch (error) {
        logger.error('Error running cron jobs', { error })
        throw error
    }
}

// Send trial reminders
export async function sendTrialReminders(): Promise<void> {
    try {
        logger.info('Sending trial reminders')
        // Implementation here
    } catch (error) {
        logger.error('Error sending trial reminders', { error })
    }
}

// Send birthday notifications
export async function sendBirthdayNotifications(): Promise<void> {
    try {
        logger.info('Sending birthday notifications')

        // Get today's date
        const today = new Date()
        const currentMonth = today.getMonth() + 1 // JavaScript months are 0-indexed
        const currentDay = today.getDate()

        // Find users with birthday today (birth year 1981)
        const { data: birthdayUsers, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name, location')
            .eq('birthday', 1981)

        if (error) {
            logger.error('Error fetching birthday users:', { error })
            return
        }

        if (!birthdayUsers || birthdayUsers.length === 0) {
            logger.info('No birthdays today')
            return
        }

        // Send birthday notifications to all users
        const notifications = birthdayUsers.map(user => ({
            user_id: user.facebook_id,
            type: 'birthday',
            title: '🎂 Sinh nhật Tân Dậu',
            message: `Chúc mừng sinh nhật ${user.name} tại ${user.location}! Chúc bạn một năm mới nhiều sức khỏe và thành công!`,
            is_read: false,
            created_at: new Date().toISOString()
        }))

        const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)

        if (notificationError) {
            logger.error('Error creating birthday notifications:', { error: notificationError })
            return
        }

        logger.info(`Sent birthday notifications to ${birthdayUsers.length} users`)

    } catch (error) {
        logger.error('Error sending birthday notifications', { error })
    }
}

// Send trial expiration reminders
export async function sendTrialExpirationReminders(): Promise<void> {
    try {
        logger.info('Sending trial expiration reminders')

        const now = new Date()
        const reminderTimes = [
            { hours: 48, label: '48 giờ' },
            { hours: 24, label: '24 giờ' },
            { hours: 0, label: 'hết hạn' }
        ]

        for (const reminder of reminderTimes) {
            const targetTime = new Date(now.getTime() + (reminder.hours * 60 * 60 * 1000))

            // Find users whose trial expires at target time (±1 hour)
            const { data: expiringUsers, error } = await supabaseAdmin
                .from('users')
                .select('facebook_id, name, membership_expires_at')
                .eq('status', 'trial')
                .gte('membership_expires_at', new Date(targetTime.getTime() - 60 * 60 * 1000).toISOString())
                .lte('membership_expires_at', new Date(targetTime.getTime() + 60 * 60 * 1000).toISOString())

            if (error) {
                logger.error('Error fetching expiring users:', { error })
                continue
            }

            if (expiringUsers && expiringUsers.length > 0) {
                logger.info(`Found ${expiringUsers.length} users expiring in ${reminder.hours} hours`)

                // Send notifications to users
                const notifications = expiringUsers.map(user => ({
                    user_id: user.facebook_id,
                    type: 'payment',
                    title: '⏰ Nhắc nhở thanh toán',
                    message: `Trial của bạn ${reminder.hours === 0 ? 'đã hết hạn' : `sẽ hết hạn trong ${reminder.label}`}. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ!`,
                    is_read: false,
                    created_at: new Date().toISOString()
                }))

                const { error: notificationError } = await supabaseAdmin
                    .from('notifications')
                    .insert(notifications)

                if (notificationError) {
                    logger.error('Error creating trial notifications:', { error: notificationError })
                }
            }
        }

    } catch (error) {
        logger.error('Error sending trial expiration reminders', { error })
    }
}

// Send daily horoscope updates
export async function sendDailyHoroscopeUpdates(): Promise<void> {
    try {
        logger.info('Sending daily horoscope updates')

        // Get all active users
        const { data: activeUsers, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name')
            .in('status', ['active', 'trial'])

        if (error) {
            logger.error('Error fetching active users:', { error })
            return
        }

        if (!activeUsers || activeUsers.length === 0) {
            logger.info('No active users for horoscope')
            return
        }

        // Generate horoscope for today
        const horoscope = {
            fortune: 'Tài lộc tốt, có cơ hội đầu tư',
            love: 'Tình cảm gia đình hòa thuận',
            health: 'Sức khỏe ổn định, chú ý nghỉ ngơi'
        }

        // Send horoscope notifications
        const notifications = activeUsers.map(user => ({
            user_id: user.facebook_id,
            type: 'horoscope',
            title: '🔮 Tử vi Tân Dậu hôm nay',
            message: `Chào ${user.name}! Tử vi hôm nay: ${horoscope.fortune} | ${horoscope.love} | ${horoscope.health}. Xem chi tiết trong app!`,
            is_read: false,
            created_at: new Date().toISOString()
        }))

        const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)

        if (notificationError) {
            logger.error('Error creating horoscope notifications:', { error: notificationError })
            return
        }

        logger.info(`Sent daily horoscope to ${activeUsers.length} users`)

    } catch (error) {
        logger.error('Error sending daily horoscope updates', { error })
    }
}

// Cleanup old data
export async function cleanupOldData(): Promise<void> {
    try {
        logger.info('Starting data cleanup')

        const now = new Date()
        const cleanupThresholds = {
            oldNotifications: 90, // days
            oldBotSessions: 30, // days
            oldActivityLogs: 30, // days
            oldChatBotOffers: 1 // days
        }

        // Cleanup old notifications
        const notificationCutoff = new Date(now.getTime() - (cleanupThresholds.oldNotifications * 24 * 60 * 60 * 1000))
        const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .lt('created_at', notificationCutoff.toISOString())

        if (notificationError) {
            logger.error('Error cleaning old notifications:', { error: notificationError })
        } else {
            logger.info(`Cleaned old notifications before ${notificationCutoff.toISOString()}`)
        }

        // Cleanup old bot sessions
        const sessionCutoff = new Date(now.getTime() - (cleanupThresholds.oldBotSessions * 24 * 60 * 60 * 1000))
        const { error: sessionError } = await supabaseAdmin
            .from('bot_sessions')
            .delete()
            .lt('updated_at', sessionCutoff.toISOString())

        if (sessionError) {
            logger.error('Error cleaning old bot sessions:', { error: sessionError })
        } else {
            logger.info(`Cleaned old bot sessions before ${sessionCutoff.toISOString()}`)
        }

        // Cleanup old activity logs
        const activityCutoff = new Date(now.getTime() - (cleanupThresholds.oldActivityLogs * 24 * 60 * 60 * 1000))
        const { error: activityError } = await supabaseAdmin
            .from('user_activity_logs')
            .delete()
            .lt('created_at', activityCutoff.toISOString())

        if (activityError) {
            logger.error('Error cleaning old activity logs:', { error: activityError })
        } else {
            logger.info(`Cleaned old activity logs before ${activityCutoff.toISOString()}`)
        }

        // Cleanup old chat bot offer counts
        const offerCutoff = new Date(now.getTime() - (cleanupThresholds.oldChatBotOffers * 24 * 60 * 60 * 1000))
        const { error: offerError } = await supabaseAdmin
            .from('chat_bot_offer_counts')
            .delete()
            .lt('last_offer', offerCutoff.toISOString())

        if (offerError) {
            logger.error('Error cleaning old chat bot offers:', { error: offerError })
        } else {
            logger.info(`Cleaned old chat bot offers before ${offerCutoff.toISOString()}`)
        }

        logger.info('Data cleanup completed')

    } catch (error) {
        logger.error('Error in data cleanup:', { error })
    }
}

// Update featured listings
export async function updateFeaturedListings(): Promise<void> {
    try {
        logger.info('Updating featured listings')

        // Get top listings by views and rating for featuring
        const { data: topListings, error } = await supabaseAdmin
            .from('listings')
            .select(`
                id,
                views,
                created_at,
                users!listings_user_id_fkey (
                    rating,
                    total_transactions
                )
            `)
            .eq('status', 'active')
            .order('views', { ascending: false })
            .limit(50)

        if (error) {
            logger.error('Error fetching top listings:', { error })
            return
        }

        if (topListings && topListings.length > 0) {
            // Calculate feature score for each listing
            const scoredListings = topListings.map((listing: any) => {
                const daysSincePosted = (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
                const user = Array.isArray(listing.users) ? listing.users[0] : listing.users
                const userScore = (user?.rating || 0) * 10 + (user?.total_transactions || 0) * 5
                const recencyScore = Math.max(0, 30 - daysSincePosted) // Newer listings get higher score
                const viewScore = Math.min(listing.views || 0, 100) // Cap at 100 views for scoring

                return {
                    id: listing.id,
                    score: viewScore + userScore + recencyScore
                }
            })

            // Sort by score and select top 10
            scoredListings.sort((a, b) => b.score - a.score)
            const top10Ids = scoredListings.slice(0, 10).map(listing => listing.id)

            // Reset all featured flags first
            await supabaseAdmin
                .from('listings')
                .update({ is_featured: false })
                .eq('status', 'active')

            // Set top 10 as featured
            if (top10Ids.length > 0) {
                const { error: updateError } = await supabaseAdmin
                    .from('listings')
                    .update({ is_featured: true })
                    .in('id', top10Ids)

                if (updateError) {
                    logger.error('Error updating featured listings:', { error: updateError })
                } else {
                    logger.info(`Updated ${top10Ids.length} featured listings`)
                }
            }
        }

    } catch (error) {
        logger.error('Error updating featured listings:', { error })
    }
}

// Send weekly top sellers notification
export async function sendWeeklyTopSellersNotification(): Promise<void> {
    try {
        logger.info('Sending weekly top sellers notification')

        // Get top sellers of the week
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const { data: topSellers, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name, rating, total_transactions')
            .gte('created_at', weekAgo.toISOString())
            .order('total_transactions', { ascending: false })
            .limit(10)

        if (error) {
            logger.error('Error fetching top sellers:', { error })
            return
        }

        if (topSellers && topSellers.length > 0) {
            // Create leaderboard message
            const leaderboardText = topSellers.map((seller, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'
                return `${medal} ${seller.name} - ${seller.total_transactions} giao dịch`
            }).join('\n')

            // Send notification to all users
            const { data: allUsers, error: usersError } = await supabaseAdmin
                .from('users')
                .select('facebook_id')
                .in('status', ['active', 'trial'])

            if (!usersError && allUsers) {
                const notifications = allUsers.map(user => ({
                    user_id: user.facebook_id,
                    type: 'message',
                    title: '🏆 Top Sellers Tuần Này',
                    message: `Chúc mừng các seller xuất sắc tuần này:\n\n${leaderboardText}\n\nHãy học hỏi kinh nghiệm từ họ để thành công hơn!`,
                    is_read: false,
                    created_at: new Date().toISOString()
                }))

                const { error: notificationError } = await supabaseAdmin
                    .from('notifications')
                    .insert(notifications)

                if (notificationError) {
                    logger.error('Error creating top sellers notifications:', { error: notificationError })
                } else {
                    logger.info(`Sent weekly top sellers notification to ${allUsers.length} users`)
                }
            }
        }

    } catch (error) {
        logger.error('Error sending weekly top sellers notification:', { error })
    }
}
