/**
 * Script để làm sạch database Supabase
 * Chạy script này để reset toàn bộ dữ liệu về trạng thái ban đầu
 */

const { createClient } = require('@supabase/supabase-js')

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Thiếu cấu hình Supabase!')
    console.error('Cần có NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupDatabase() {
    console.log('🧹 Bắt đầu làm sạch database...')

    try {
        // 1. Xóa tất cả dữ liệu trong các bảng chính
        console.log('📝 Xóa dữ liệu trong các bảng...')

        const tables = [
            'messages',
            'conversations',
            'listings',
            'payments',
            'ratings',
            'events',
            'event_participants',
            'notifications',
            'ads',
            'search_requests',
            'referrals',
            'user_points',
            'point_transactions',
            'bot_sessions',
            'user_messages',
            'spam_logs',
            'spam_tracking',
            'chat_bot_offer_counts',
            'user_bot_modes',
            'admin_chat_sessions',
            'user_activities',
            'user_activity_logs',
            'system_metrics',
            'admin_users',
            'bot_settings',
            'ai_analytics',
            'ai_templates'
        ]

        for (const table of tables) {
            try {
                let deleteQuery = supabase.from(table).delete()

                // Xử lý đặc biệt cho từng bảng dựa trên kiểu dữ liệu của cột id
                switch (table) {
                    case 'user_messages':
                    case 'spam_logs':
                    case 'admin_users':
                    case 'bot_settings':
                        // Các bảng có id là SERIAL (INTEGER)
                        deleteQuery = deleteQuery.neq('id', 0)
                        break
                    case 'chat_bot_offer_counts':
                    case 'user_bot_modes':
                        // Các bảng có id là BIGSERIAL (BIGINT)
                        deleteQuery = deleteQuery.neq('id', 0)
                        break
                    default:
                        // Các bảng có id là UUID hoặc không có điều kiện
                        deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000')
                        break
                }

                const { error } = await deleteQuery

                if (error) {
                    console.log(`⚠️ Không thể xóa bảng ${table}:`, error.message)
                } else {
                    console.log(`✅ Đã xóa dữ liệu trong bảng ${table}`)
                }
            } catch (err) {
                console.log(`⚠️ Bảng ${table} có thể không tồn tại:`, err.message)
            }
        }

        // 2. Xóa tất cả users (trừ admin)
        console.log('👥 Xóa tất cả users (trừ admin)...')
        const { error: usersError } = await supabase
            .from('users')
            .delete()
            .neq('facebook_id', process.env.FACEBOOK_PAGE_ID) // Giữ lại admin

        if (usersError) {
            console.log('⚠️ Lỗi khi xóa users:', usersError.message)
        } else {
            console.log('✅ Đã xóa tất cả users (trừ admin)')
        }

        // 3. Reset bot settings
        console.log('🤖 Reset bot settings...')
        const { error: settingsError } = await supabase
            .from('bot_settings')
            .upsert({
                id: 'main',
                bot_status: 'active',
                maintenance_mode: false,
                welcome_message: 'Chào mừng bạn đến với Bot Tân Dậu!',
                max_daily_messages: 50,
                spam_threshold: 10,
                updated_at: new Date().toISOString()
            })

        if (settingsError) {
            console.log('⚠️ Lỗi khi reset bot settings:', settingsError.message)
        } else {
            console.log('✅ Đã reset bot settings')
        }

        // 4. Tạo admin user mặc định (nếu chưa có)
        console.log('👑 Tạo admin user mặc định...')
        const { data: existingAdmin } = await supabase
            .from('users')
            .select('*')
            .eq('facebook_id', process.env.FACEBOOK_PAGE_ID)
            .single()

        if (!existingAdmin) {
            const { error: adminError } = await supabase
                .from('users')
                .insert({
                    facebook_id: process.env.FACEBOOK_PAGE_ID,
                    name: 'Admin Tân Dậu',
                    phone: '0000000000',
                    location: 'Hà Nội',
                    birthday: 1981,
                    status: 'active',
                    membership_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 năm
                    referral_code: 'ADMIN-1981',
                    welcome_message_sent: true,
                    created_at: new Date().toISOString()
                })

            if (adminError) {
                console.log('⚠️ Lỗi khi tạo admin user:', adminError.message)
            } else {
                console.log('✅ Đã tạo admin user mặc định')
            }
        } else {
            console.log('✅ Admin user đã tồn tại')
        }

        console.log('🎉 Hoàn thành làm sạch database!')
        console.log('📊 Database đã được reset về trạng thái ban đầu')
        console.log('🔧 Bot sẽ hoạt động bình thường với dữ liệu sạch')

    } catch (error) {
        console.error('❌ Lỗi khi làm sạch database:', error)
    }
}

// Chạy cleanup
cleanupDatabase()
