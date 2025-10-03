// Script để xóa dữ liệu user test (giữ lại admin users)
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Thiếu environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupTestUsers() {
    try {
        console.log('🧹 Bắt đầu cleanup dữ liệu user test...')

        // 1. Lấy danh sách admin users để giữ lại
        const { data: adminUsers, error: adminError } = await supabase
            .from('admin_users')
            .select('facebook_id')

        if (adminError) {
            console.error('❌ Lỗi lấy admin users:', adminError)
            return
        }

        const adminIds = adminUsers.map(admin => admin.facebook_id)
        console.log(`✅ Tìm thấy ${adminIds.length} admin users`)

        // 2. Xóa tất cả users không phải admin
        if (adminIds.length > 0) {
            const { data: deletedUsers, error: deleteError } = await supabase
                .from('users')
                .delete()
                .not('facebook_id', 'in', `(${adminIds.join(',')})`)
                .select()

            if (deleteError) {
                console.error('❌ Lỗi xóa users:', deleteError)
                return
            }

            console.log(`✅ Đã xóa ${deletedUsers.length} user records`)
        } else {
            // Nếu không có admin, xóa tất cả users
            const { data: deletedUsers, error: deleteError } = await supabase
                .from('users')
                .delete()
                .select()

            if (deleteError) {
                console.error('❌ Lỗi xóa users:', deleteError)
                return
            }

            console.log(`✅ Đã xóa ${deletedUsers.length} user records`)
        }

        // 3. Xóa các session liên quan
        const { data: deletedSessions, error: sessionError } = await supabase
            .from('bot_sessions')
            .delete()
            .select()

        if (sessionError) {
            console.error('❌ Lỗi xóa sessions:', sessionError)
        } else {
            console.log(`✅ Đã xóa ${deletedSessions.length} session records`)
        }

        // 4. Xóa spam logs
        const { data: deletedSpamLogs, error: spamError } = await supabase
            .from('spam_logs')
            .delete()
            .select()

        if (spamError) {
            console.error('❌ Lỗi xóa spam logs:', spamError)
        } else {
            console.log(`✅ Đã xóa ${deletedSpamLogs.length} spam log records`)
        }

        console.log('🎉 Cleanup hoàn thành!')
        console.log('📝 Các admin users đã được giữ lại')
        console.log('🔄 Bạn có thể test lại hệ thống với user mới')

    } catch (error) {
        console.error('❌ Lỗi trong quá trình cleanup:', error)
    }
}

// Chạy script
cleanupTestUsers()
