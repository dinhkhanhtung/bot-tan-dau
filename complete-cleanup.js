/**
 * Script cleanup toàn diện để test lại từ đầu
 * Xóa sạch tất cả dữ liệu và reset về trạng thái ban đầu
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Thiếu cấu hình Supabase!')
    console.error('Cần có NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function completeCleanup() {
    console.log('🧹 Starting complete database cleanup...')
    console.log('⚠️ This will delete ALL data and reset to initial state!')
    console.log('')

    try {
        // 1. Clear tất cả bot sessions
        console.log('1️⃣ Clearing bot sessions...')
        const { error: sessionError } = await supabase
            .from('bot_sessions')
            .delete()
            .not('id', 'is', null)

        if (sessionError) {
            console.error('❌ Error clearing bot sessions:', sessionError.message)
        } else {
            console.log('✅ Bot sessions cleared successfully')
        }

        // 2. Reset user interaction states về trạng thái ban đầu
        console.log('2️⃣ Resetting user interaction states...')
        const { error: userStateError } = await supabase
            .from('user_interaction_states')
            .update({
                bot_active: false,
                welcome_sent: false,
                current_flow: null,
                current_step: 0,
                flow_data: null,
                last_activity: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .not('id', 'is', null)

        if (userStateError) {
            console.error('❌ Error resetting user interaction states:', userStateError.message)
        } else {
            console.log('✅ User interaction states reset to initial state')
        }

        // 3. Clear tất cả conversations và messages
        console.log('3️⃣ Clearing conversations and messages...')

        // Xóa messages trước (foreign key constraint)
        const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .not('id', 'is', null)

        if (messagesError) {
            console.error('❌ Error clearing messages:', messagesError.message)
        } else {
            console.log('✅ Messages cleared successfully')
        }

        // Xóa conversations
        const { error: conversationsError } = await supabase
            .from('conversations')
            .delete()
            .not('id', 'is', null)

        if (conversationsError) {
            console.error('❌ Error clearing conversations:', conversationsError.message)
        } else {
            console.log('✅ Conversations cleared successfully')
        }

        // 4. Clear các bảng khác liên quan đến hoạt động
        console.log('4️⃣ Clearing activity-related data...')

        // Xóa user activities
        const { error: activitiesError } = await supabase
            .from('user_activities')
            .delete()
            .not('id', 'is', null)

        if (activitiesError) {
            console.error('❌ Error clearing user activities:', activitiesError.message)
        } else {
            console.log('✅ User activities cleared successfully')
        }

        // Xóa user activity logs
        const { error: activityLogsError } = await supabase
            .from('user_activity_logs')
            .delete()
            .not('id', 'is', null)

        if (activityLogsError) {
            console.error('❌ Error clearing user activity logs:', activityLogsError.message)
        } else {
            console.log('✅ User activity logs cleared successfully')
        }

        // 5. Clear cache và temporary data
        console.log('5️⃣ Clearing cache and temporary data...')

        // Xóa AI analytics
        const { error: aiAnalyticsError } = await supabase
            .from('ai_analytics')
            .delete()
            .not('id', 'is', null)

        if (aiAnalyticsError) {
            console.error('❌ Error clearing AI analytics:', aiAnalyticsError.message)
        } else {
            console.log('✅ AI analytics cleared successfully')
        }

        // Xóa system metrics
        const { error: metricsError } = await supabase
            .from('system_metrics')
            .delete()
            .not('id', 'is', null)

        if (metricsError) {
            console.error('❌ Error clearing system metrics:', metricsError.message)
        } else {
            console.log('✅ System metrics cleared successfully')
        }

        // Xóa spam logs
        const { error: spamLogsError } = await supabase
            .from('spam_logs')
            .delete()
            .not('id', 'is', null)

        if (spamLogsError) {
            console.error('❌ Error clearing spam logs:', spamLogsError.message)
        } else {
            console.log('✅ Spam logs cleared successfully')
        }

        // Xóa spam tracking
        const { error: spamTrackingError } = await supabase
            .from('spam_tracking')
            .delete()
            .not('id', 'is', null)

        if (spamTrackingError) {
            console.error('❌ Error clearing spam tracking:', spamTrackingError.message)
        } else {
            console.log('✅ Spam tracking cleared successfully')
        }

        // 6. Reset các bảng chính về trạng thái ban đầu
        console.log('6️⃣ Resetting main tables to initial state...')

        // Reset user points về 0
        const { error: pointsError } = await supabase
            .from('user_points')
            .update({
                points: 0,
                level: 'Đồng',
                streak_days: 0,
                last_activity_date: null,
                updated_at: new Date().toISOString()
            })
            .not('id', 'is', null)

        if (pointsError) {
            console.error('❌ Error resetting user points:', pointsError.message)
        } else {
            console.log('✅ User points reset to initial state')
        }

        // Xóa point transactions
        const { error: pointTransactionsError } = await supabase
            .from('point_transactions')
            .delete()
            .not('id', 'is', null)

        if (pointTransactionsError) {
            console.error('❌ Error clearing point transactions:', pointTransactionsError.message)
        } else {
            console.log('✅ Point transactions cleared successfully')
        }

        // Reset notifications về unread = false (để không spam user)
        const { error: notificationsError } = await supabase
            .from('notifications')
            .update({
                is_read: false,
                created_at: new Date().toISOString()
            })
            .not('id', 'is', null)

        if (notificationsError) {
            console.error('❌ Error resetting notifications:', notificationsError.message)
        } else {
            console.log('✅ Notifications reset successfully')
        }

        // 7. Clear business data (optional - có thể giữ lại nếu muốn test với data mẫu)
        console.log('7️⃣ Clearing business data...')

        // Xóa ads
        const { error: adsError } = await supabase
            .from('ads')
            .delete()
            .not('id', 'is', null)

        if (adsError) {
            console.error('❌ Error clearing ads:', adsError.message)
        } else {
            console.log('✅ Ads cleared successfully')
        }

        // Xóa events và participants
        const { error: eventParticipantsError } = await supabase
            .from('event_participants')
            .delete()
            .not('id', 'is', null)

        if (eventParticipantsError) {
            console.error('❌ Error clearing event participants:', eventParticipantsError.message)
        } else {
            console.log('✅ Event participants cleared successfully')
        }

        const { error: eventsError } = await supabase
            .from('events')
            .delete()
            .not('id', 'is', null)

        if (eventsError) {
            console.error('❌ Error clearing events:', eventsError.message)
        } else {
            console.log('✅ Events cleared successfully')
        }

        // Xóa listings
        const { error: listingsError } = await supabase
            .from('listings')
            .delete()
            .not('id', 'is', null)

        if (listingsError) {
            console.error('❌ Error clearing listings:', listingsError.message)
        } else {
            console.log('✅ Listings cleared successfully')
        }

        // Xóa payments
        const { error: paymentsError } = await supabase
            .from('payments')
            .delete()
            .not('id', 'is', null)

        if (paymentsError) {
            console.error('❌ Error clearing payments:', paymentsError.message)
        } else {
            console.log('✅ Payments cleared successfully')
        }

        // Xóa ratings
        const { error: ratingsError } = await supabase
            .from('ratings')
            .delete()
            .not('id', 'is', null)

        if (ratingsError) {
            console.error('❌ Error clearing ratings:', ratingsError.message)
        } else {
            console.log('✅ Ratings cleared successfully')
        }

        // Xóa referrals
        const { error: referralsError } = await supabase
            .from('referrals')
            .delete()
            .not('id', 'is', null)

        if (referralsError) {
            console.error('❌ Error clearing referrals:', referralsError.message)
        } else {
            console.log('✅ Referrals cleared successfully')
        }

        // Xóa search requests
        const { error: searchRequestsError } = await supabase
            .from('search_requests')
            .delete()
            .not('id', 'is', null)

        if (searchRequestsError) {
            console.error('❌ Error clearing search requests:', searchRequestsError.message)
        } else {
            console.log('✅ Search requests cleared successfully')
        }

        // 8. Reset admin states nếu cần thiết
        console.log('8️⃣ Checking admin states...')

        // Đặt lại admin chat sessions về trạng thái inactive
        const { error: adminChatError } = await supabase
            .from('admin_chat_sessions')
            .update({
                status: 'inactive',
                updated_at: new Date().toISOString()
            })
            .not('id', 'is', null)

        if (adminChatError) {
            console.error('❌ Error resetting admin chat sessions:', adminChatError.message)
        } else {
            console.log('✅ Admin chat sessions reset successfully')
        }

        // 9. Đặt lại bot settings về mặc định
        console.log('9️⃣ Resetting bot settings to defaults...')

        const defaultSettings = {
            id: 'main',
            bot_status: 'active',
            maintenance_mode: false,
            welcome_message: 'Chào mừng bạn đến với Bot Tân Dậu! 🎉\n\nTôi có thể giúp bạn:\n• Đăng ký tài khoản\n• Đăng tin mua bán\n• Tìm kiếm sản phẩm\n• Thanh toán và giao dịch\n• Xem tử vi hàng ngày\n• Tham gia cộng đồng\n\nBạn muốn làm gì nào? 💬',
            max_daily_messages: 50,
            spam_threshold: 10,
            updated_at: new Date().toISOString()
        }

        const { error: settingsError } = await supabase
            .from('bot_settings')
            .upsert(defaultSettings)

        if (settingsError) {
            console.error('❌ Error resetting bot settings:', settingsError.message)
        } else {
            console.log('✅ Bot settings reset to defaults')
        }

        console.log('')
        console.log('🎉 Complete cleanup finished!')
        console.log('📊 Database has been reset to initial state')
        console.log('🔄 Ready for fresh testing!')
        console.log('')
        console.log('Summary of what was cleaned:')
        console.log('✅ Bot sessions cleared')
        console.log('✅ User interaction states reset')
        console.log('✅ Conversations and messages cleared')
        console.log('✅ User activities cleared')
        console.log('✅ Cache and temporary data cleared')
        console.log('✅ Business data cleared')
        console.log('✅ Admin states reset')
        console.log('✅ Bot settings reset to defaults')
        console.log('')
        console.log('🚀 You can now start fresh testing!')

    } catch (error) {
        console.error('❌ Cleanup error:', error)
        process.exit(1)
    }
}

// Chạy cleanup nếu script được gọi trực tiếp
if (require.main === module) {
    completeCleanup()
}

module.exports = { completeCleanup }