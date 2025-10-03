import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from './facebook-api'
import { formatCurrency, isTrialUser, isExpiredUser, daysUntilExpiry } from './utils'

// Cron job: Send trial expiry reminders
export async function sendTrialReminders() {
    console.log('🔄 Running trial expiry reminders cron job...')

    try {
        // Get users with trial expiring in 48h, 24h, or expired
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('status', 'trial')
            .not('membership_expires_at', 'is', null)

        if (error) {
            console.error('Error fetching trial users:', error)
            return
        }

        if (!users || users.length === 0) {
            console.log('✅ No trial users to remind')
            return
        }

        console.log(`📋 Processing ${users.length} trial users...`)

        for (const user of users) {
            if (!user.membership_expires_at) continue

            const daysLeft = daysUntilExpiry(user.membership_expires_at)

            // Send 48h reminder
            if (daysLeft === 2) {
                await sendTrialExpiringReminder(user.facebook_id, 48)
            }
            // Send 24h reminder
            else if (daysLeft === 1) {
                await sendTrialExpiringReminder(user.facebook_id, 24)
            }
            // Send expired notification
            else if (daysLeft <= 0) {
                await sendTrialExpiredNotification(user.facebook_id)
            }
        }

        console.log('✅ Trial reminders cron job completed')

    } catch (error) {
        console.error('Error in trial reminders cron:', error)
    }
}

// Send trial expiring reminder
async function sendTrialExpiringReminder(facebookId: string, hoursLeft: number) {
    try {
        await sendTypingIndicator(facebookId)

        if (hoursLeft === 48) {
            await sendMessagesWithTyping(facebookId, [
                '⏰ THÔNG BÁO QUAN TRỌNG',
                'Trial của bạn còn 48 giờ!',
                '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
            ])
        } else if (hoursLeft === 24) {
            await sendMessagesWithTyping(facebookId, [
                '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
                'Trial của bạn còn 24 giờ!',
                '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
            ])
        }

        await sendQuickReply(
            facebookId,
            'Gia hạn tài khoản:',
            [
                createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                createQuickReply('❌ HỦY', 'MAIN_MENU')
            ]
        )

        console.log(`✅ Sent ${hoursLeft}h reminder to ${facebookId}`)

    } catch (error) {
        console.error(`Error sending ${hoursLeft}h reminder to ${facebookId}:`, error)
    }
}

// Send trial expired notification
async function sendTrialExpiredNotification(facebookId: string) {
    try {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            facebookId,
            'Gia hạn tài khoản:',
            [
                createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                createQuickReply('❌ HỦY', 'MAIN_MENU')
            ]
        )

        console.log(`✅ Sent expired notification to ${facebookId}`)

    } catch (error) {
        console.error(`Error sending expired notification to ${facebookId}:`, error)
    }
}

// Cron job: Send birthday notifications
export async function sendBirthdayNotifications() {
    console.log('🎂 Running birthday notifications cron job...')

    try {
        const today = new Date()
        const month = today.getMonth() + 1 // JavaScript months are 0-indexed
        const day = today.getDate()

        // Get users with birthday today
        const { data: birthdayUsers, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name')
            .eq('status', 'registered') // Only send to active users
            .not('birthday', 'is', null)

        if (error) {
            console.error('Error fetching birthday users:', error)
            return
        }

        if (!birthdayUsers || birthdayUsers.length === 0) {
            console.log('✅ No birthdays today')
            return
        }

        // Filter users whose birthday is today (this is a simplified approach)
        // In production, you'd want to store birthday as a date field
        const todayBirthdays = birthdayUsers.filter(user => {
            // This is a placeholder - you'd need proper birthday date storage
            return true // Implement proper birthday logic here
        })

        if (todayBirthdays.length === 0) {
            console.log('✅ No birthdays today after filtering')
            return
        }

        // Send birthday notification to all users
        const { data: allUsers, error: allUsersError } = await supabaseAdmin
            .from('users')
            .select('facebook_id')
            .eq('status', 'registered')

        if (allUsersError) {
            console.error('Error fetching all users for birthday notification:', allUsersError)
            return
        }

        if (!allUsers || allUsers.length === 0) {
            console.log('✅ No users to send birthday notifications to')
            return
        }

        const birthdayNames = todayBirthdays.map(user => user.name).join(', ')
        const birthdayMessage = `🎂 SINH NHẬT HÔM NAY

Chúc mừng sinh nhật:
${birthdayNames}

[🎁 GỬI LỜI CHÚC] [🎉 XEM TẤT CẢ] [📸 XEM ẢNH]`

        console.log(`🎂 Sending birthday notification to ${allUsers.length} users...`)

        for (const user of allUsers) {
            try {
                await sendTypingIndicator(user.facebook_id)
                await sendMessage(user.facebook_id, birthdayMessage)
                console.log(`✅ Sent birthday notification to ${user.facebook_id}`)
            } catch (error) {
                console.error(`Error sending birthday notification to ${user.facebook_id}:`, error)
            }
        }

        console.log('✅ Birthday notifications cron job completed')

    } catch (error) {
        console.error('Error in birthday notifications cron:', error)
    }
}

// Cron job: Send horoscope updates
export async function sendHoroscopeUpdates() {
    console.log('🔮 Running horoscope updates cron job...')

    try {
        // Get all active users
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name')
            .in('status', ['registered', 'trial'])

        if (error) {
            console.error('Error fetching users for horoscope:', error)
            return
        }

        if (!users || users.length === 0) {
            console.log('✅ No users to send horoscope to')
            return
        }

        console.log(`🔮 Sending horoscope to ${users.length} users...`)

        // Generate daily horoscope for Tân Dậu (1981)
        const horoscope = generateDailyHoroscope()

        for (const user of users) {
            try {
                await sendTypingIndicator(user.facebook_id)

                await sendMessagesWithTyping(user.facebook_id, [
                    '🔮 TỬ VI TÂN DẬU HÔM NAY',
                    `📅 ${horoscope.date}`,
                    `🐓 Tuổi: Tân Dậu (1981)`,
                    `⭐ Tổng quan: ${horoscope.rating}/5 sao`,
                    '',
                    `💰 Tài lộc: ${horoscope.finance}`,
                    `❤️ Tình cảm: ${horoscope.love}`,
                    `🏥 Sức khỏe: ${horoscope.health}`,
                    '',
                    `🎯 Lời khuyên: ${horoscope.advice}`,
                    `🎨 Màu may mắn: ${horoscope.lucky_color}`,
                    `🔢 Số may mắn: ${horoscope.lucky_numbers}`
                ])

                console.log(`✅ Sent horoscope to ${user.facebook_id}`)

            } catch (error) {
                console.error(`Error sending horoscope to ${user.facebook_id}:`, error)
            }
        }

        console.log('✅ Horoscope updates cron job completed')

    } catch (error) {
        console.error('Error in horoscope updates cron:', error)
    }
}

// Generate daily horoscope for Tân Dậu
function generateDailyHoroscope() {
    const horoscopes = [
        {
            date: new Date().toLocaleDateString('vi-VN'),
            rating: '4',
            finance: 'Rất tốt - Nên đầu tư BĐS',
            love: 'Tốt - Gặp gỡ bạn bè',
            health: 'Bình thường - Nghỉ ngơi',
            advice: 'Hôm nay nên ký kết hợp đồng',
            lucky_color: 'Vàng, Trắng',
            lucky_numbers: '1, 6, 8'
        },
        {
            date: new Date().toLocaleDateString('vi-VN'),
            rating: '5',
            finance: 'Xuất sắc - Cơ hội làm ăn lớn',
            love: 'Rất tốt - Tình yêu thăng hoa',
            health: 'Tốt - Năng lượng dồi dào',
            advice: 'Nên mở rộng mối quan hệ kinh doanh',
            lucky_color: 'Đỏ, Vàng',
            lucky_numbers: '3, 7, 9'
        },
        {
            date: new Date().toLocaleDateString('vi-VN'),
            rating: '3',
            finance: 'Ổn định - Tránh đầu tư mạo hiểm',
            love: 'Bình thường - Giữ hòa khí',
            health: 'Cần chú ý - Nghỉ ngơi nhiều hơn',
            advice: 'Tập trung vào công việc hiện tại',
            lucky_color: 'Xanh, Trắng',
            lucky_numbers: '2, 5, 8'
        }
    ]

    // Return a random horoscope for variety
    return horoscopes[Math.floor(Math.random() * horoscopes.length)]
}

// Cron job: Send payment follow-ups
export async function sendPaymentFollowUps() {
    console.log('💰 Running payment follow-ups cron job...')

    try {
        // Get payments pending for more than 24 hours
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const { data: oldPayments, error } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                users!payments_user_id_fkey (
                    name,
                    phone
                )
            `)
            .eq('status', 'pending')
            .lt('created_at', yesterday.toISOString())

        if (error) {
            console.error('Error fetching old payments:', error)
            return
        }

        if (!oldPayments || oldPayments.length === 0) {
            console.log('✅ No old payments to follow up')
            return
        }

        console.log(`💰 Following up ${oldPayments.length} old payments...`)

        for (const payment of oldPayments) {
            try {
                await sendTypingIndicator(payment.user_id)

                await sendMessagesWithTyping(payment.user_id, [
                    '💰 NHẮC NHỞ THANH TOÁN',
                    `📋 Thanh toán #${payment.id.slice(-8)}`,
                    `💵 Số tiền: ${formatCurrency(payment.amount)}`,
                    `📅 Ngày tạo: ${new Date(payment.created_at).toLocaleDateString('vi-VN')}`,
                    '',
                    '⏰ Đã quá 24 giờ kể từ khi tạo thanh toán.',
                    '💳 Vui lòng kiểm tra và hoàn tất thanh toán.',
                    '📞 Liên hệ admin nếu có vấn đề.'
                ])

                await sendQuickReply(
                    payment.user_id,
                    'Tùy chọn:',
                    [
                        createQuickReply('💰 THANH TOÁN LẠI', 'PAYMENT'),
                        createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                        createQuickReply('📊 XEM TRẠNG THÁI', `PAYMENT_STATUS_${payment.id}`)
                    ]
                )

                console.log(`✅ Sent payment follow-up to ${payment.user_id}`)

            } catch (error) {
                console.error(`Error sending payment follow-up to ${payment.user_id}:`, error)
            }
        }

        console.log('✅ Payment follow-ups cron job completed')

    } catch (error) {
        console.error('Error in payment follow-ups cron:', error)
    }
}

// Cron job: Clean up old data
export async function cleanupOldData() {
    console.log('🧹 Running data cleanup cron job...')

    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        // Clean up old bot sessions
        const { error: sessionError } = await supabaseAdmin
            .from('bot_sessions')
            .delete()
            .lt('updated_at', thirtyDaysAgo.toISOString())

        if (sessionError) {
            console.error('Error cleaning up bot sessions:', sessionError)
        } else {
            console.log('✅ Cleaned up old bot sessions')
        }

        // Clean up old notifications
        const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString())
            .eq('is_read', true)

        if (notificationError) {
            console.error('Error cleaning up notifications:', notificationError)
        } else {
            console.log('✅ Cleaned up old notifications')
        }

        console.log('✅ Data cleanup cron job completed')

    } catch (error) {
        console.error('Error in data cleanup cron:', error)
    }
}

// Main cron job runner - call this every hour
export async function runAllCronJobs() {
    console.log('🚀 Starting all cron jobs...')

    try {
        // Run all cron jobs
        await sendTrialReminders()
        await sendBirthdayNotifications()
        await sendHoroscopeUpdates()
        await sendPaymentFollowUps()
        await cleanupOldData()

        console.log('🎉 All cron jobs completed successfully!')

    } catch (error) {
        console.error('Error running cron jobs:', error)
    }
}
