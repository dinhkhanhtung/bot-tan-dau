/**
 * Script để chuẩn bị bot cho production
 * Xóa tất cả dữ liệu test và giữ lại chỉ admin users
 */

const { createClient } = require('@supabase/supabase-js')

// Sử dụng environment variables từ .env hoặc system
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oxornnooldwivlexsnkf.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
    console.error('❌ Thiếu SUPABASE_SERVICE_ROLE_KEY')
    console.log('💡 Hãy set environment variable:')
    console.log('   export SUPABASE_SERVICE_ROLE_KEY="your_service_key"')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupForProduction() {
    try {
        console.log('🚀 CHUẨN BỊ BOT CHO PRODUCTION')
        console.log('='.repeat(50))

        // 1. Lấy danh sách admin users
        console.log('\n1️⃣ Lấy danh sách admin users...')
        const { data: adminUsers, error: adminError } = await supabase
            .from('admin_users')
            .select('facebook_id, name')

        if (adminError) {
            console.error('❌ Lỗi lấy admin users:', adminError)
            return
        }

        const adminIds = adminUsers?.map(admin => admin.facebook_id) || []
        console.log(`✅ Tìm thấy ${adminIds.length} admin users:`)
        adminUsers?.forEach(admin => {
            console.log(`   - ${admin.name} (${admin.facebook_id})`)
        })

        // 2. Xóa tất cả users không phải admin
        console.log('\n2️⃣ Xóa users không phải admin...')
        let deletedUsers = 0

        if (adminIds.length > 0) {
            // Xóa users không phải admin
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('facebook_id, name, status')
                .not('facebook_id', 'in', `(${adminIds.join(',')})`)

            if (usersError) {
                console.error('❌ Lỗi lấy users:', usersError)
            } else {
                console.log(`📋 Tìm thấy ${users?.length || 0} users cần xóa:`)
                users?.forEach(user => {
                    console.log(`   - ${user.name} (${user.facebook_id}) - ${user.status}`)
                })

                // Xóa từng user một để tránh lỗi
                for (const user of users || []) {
                    const { error: deleteError } = await supabase
                        .from('users')
                        .delete()
                        .eq('facebook_id', user.facebook_id)

                    if (deleteError) {
                        console.error(`❌ Lỗi xóa user ${user.facebook_id}:`, deleteError)
                    } else {
                        deletedUsers++
                        console.log(`✅ Đã xóa user: ${user.name}`)
                    }
                }
            }
        } else {
            // Xóa tất cả users nếu không có admin
            const { data: allUsers, error: allUsersError } = await supabase
                .from('users')
                .select('facebook_id, name, status')

            if (allUsersError) {
                console.error('❌ Lỗi lấy tất cả users:', allUsersError)
            } else {
                console.log(`📋 Tìm thấy ${allUsers?.length || 0} users cần xóa:`)
                allUsers?.forEach(user => {
                    console.log(`   - ${user.name} (${user.facebook_id}) - ${user.status}`)
                })

                // Xóa tất cả users
                const { error: deleteAllError } = await supabase
                    .from('users')
                    .delete()
                    .neq('id', 0) // Xóa tất cả

                if (deleteAllError) {
                    console.error('❌ Lỗi xóa tất cả users:', deleteAllError)
                } else {
                    deletedUsers = allUsers?.length || 0
                    console.log(`✅ Đã xóa ${deletedUsers} users`)
                }
            }
        }

        // 3. Xóa bot sessions
        console.log('\n3️⃣ Xóa bot sessions...')
        const { data: deletedSessions, error: sessionError } = await supabase
            .from('bot_sessions')
            .delete()
            .neq('id', 0) // Xóa tất cả
            .select()

        if (sessionError) {
            console.error('❌ Lỗi xóa sessions:', sessionError)
        } else {
            console.log(`✅ Đã xóa ${deletedSessions?.length || 0} session records`)
        }

        // 4. Xóa spam logs
        console.log('\n4️⃣ Xóa spam logs...')
        const { data: deletedSpamLogs, error: spamError } = await supabase
            .from('spam_logs')
            .delete()
            .neq('id', 0) // Xóa tất cả
            .select()

        if (spamError) {
            console.error('❌ Lỗi xóa spam logs:', spamError)
        } else {
            console.log(`✅ Đã xóa ${deletedSpamLogs?.length || 0} spam log records`)
        }

        // 5. Xóa user activities
        console.log('\n5️⃣ Xóa user activities...')
        const { data: deletedActivities, error: activityError } = await supabase
            .from('user_activities')
            .delete()
            .neq('id', 0) // Xóa tất cả
            .select()

        if (activityError) {
            console.error('❌ Lỗi xóa user activities:', activityError)
        } else {
            console.log(`✅ Đã xóa ${deletedActivities?.length || 0} activity records`)
        }

        // 6. Xóa listings test
        console.log('\n6️⃣ Xóa listings test...')
        const { data: deletedListings, error: listingError } = await supabase
            .from('listings')
            .delete()
            .neq('id', 0) // Xóa tất cả
            .select()

        if (listingError) {
            console.error('❌ Lỗi xóa listings:', listingError)
        } else {
            console.log(`✅ Đã xóa ${deletedListings?.length || 0} listing records`)
        }

        // 7. Xóa search requests
        console.log('\n7️⃣ Xóa search requests...')
        const { data: deletedSearches, error: searchError } = await supabase
            .from('search_requests')
            .delete()
            .neq('id', 0) // Xóa tất cả
            .select()

        if (searchError) {
            console.error('❌ Lỗi xóa search requests:', searchError)
        } else {
            console.log(`✅ Đã xóa ${deletedSearches?.length || 0} search request records`)
        }

        // 8. Xóa payments test
        console.log('\n8️⃣ Xóa payments test...')
        const { data: deletedPayments, error: paymentError } = await supabase
            .from('payments')
            .delete()
            .neq('id', 0) // Xóa tất cả
            .select()

        if (paymentError) {
            console.error('❌ Lỗi xóa payments:', paymentError)
        } else {
            console.log(`✅ Đã xóa ${deletedPayments?.length || 0} payment records`)
        }

        console.log('\n🎉 CLEANUP HOÀN THÀNH!')
        console.log('='.repeat(50))
        console.log(`📊 Tổng kết:`)
        console.log(`   - Đã xóa ${deletedUsers} users`)
        console.log(`   - Đã xóa ${deletedSessions?.length || 0} sessions`)
        console.log(`   - Đã xóa ${deletedSpamLogs?.length || 0} spam logs`)
        console.log(`   - Đã xóa ${deletedActivities?.length || 0} activities`)
        console.log(`   - Đã xóa ${deletedListings?.length || 0} listings`)
        console.log(`   - Đã xóa ${deletedSearches?.length || 0} search requests`)
        console.log(`   - Đã xóa ${deletedPayments?.length || 0} payments`)
        console.log(`   - Giữ lại ${adminIds.length} admin users`)

        console.log('\n✅ BOT ĐÃ SẴN SÀNG CHO PRODUCTION!')
        console.log('🔄 Bây giờ bạn có thể test với user Facebook thật')

    } catch (error) {
        console.error('❌ Lỗi trong quá trình cleanup:', error)
    }
}

// Chạy script
cleanupForProduction()
