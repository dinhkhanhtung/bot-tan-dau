// Script để reset toàn bộ bot về trạng thái sạch sẽ
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Thiếu environment variables')
    console.log('💡 Chạy: NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node reset-bot.js')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetBot() {
    try {
        console.log('🧹 BẮT ĐẦU RESET TOÀN BỘ BOT...')

        // 1. Xóa tất cả users (bao gồm cả test users) - chỉ xóa non-admin users
        console.log('📝 Đang xóa users...')

        // Lấy danh sách admin users để giữ lại
        const { data: adminUsers } = await supabase
            .from('admin_users')
            .select('facebook_id')

        const adminIds = adminUsers?.map(admin => admin.facebook_id) || []

        let deletedUsers = []
        if (adminIds.length > 0) {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .delete()
                .not('facebook_id', 'in', `(${adminIds.join(',')})`)
                .select()

            if (usersError) {
                console.error('❌ Lỗi xóa users:', usersError)
            } else {
                deletedUsers = users || []
                console.log(`✅ Đã xóa ${deletedUsers.length} users`)
            }
        } else {
            // Nếu không có admin, xóa tất cả
            const { data: users, error: usersError } = await supabase
                .from('users')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000') // Điều kiện để xóa tất cả
                .select()

            if (usersError) {
                console.error('❌ Lỗi xóa users:', usersError)
            } else {
                deletedUsers = users || []
                console.log(`✅ Đã xóa ${deletedUsers.length} users`)
            }
        }

        // 2. Xóa tất cả sessions
        console.log('📝 Đang xóa sessions...')
        const { data: deletedSessions, error: sessionsError } = await supabase
            .from('bot_sessions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Điều kiện để xóa tất cả
            .select()

        if (sessionsError) {
            console.error('❌ Lỗi xóa sessions:', sessionsError)
        } else {
            console.log(`✅ Đã xóa ${deletedSessions?.length || 0} sessions`)
        }

        // 3. Xóa tất cả spam logs
        console.log('📝 Đang xóa spam logs...')
        const { data: deletedSpamLogs, error: spamError } = await supabase
            .from('spam_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Điều kiện để xóa tất cả
            .select()

        if (spamError) {
            console.error('❌ Lỗi xóa spam logs:', spamError)
        } else {
            console.log(`✅ Đã xóa ${deletedSpamLogs?.length || 0} spam logs`)
        }

        // 4. Xóa tất cả user messages
        console.log('📝 Đang xóa user messages...')
        const { data: deletedMessages, error: messagesError } = await supabase
            .from('user_messages')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Điều kiện để xóa tất cả
            .select()

        if (messagesError) {
            console.error('❌ Lỗi xóa user messages:', messagesError)
        } else {
            console.log(`✅ Đã xóa ${deletedMessages?.length || 0} user messages`)
        }

        // 5. Xóa tất cả admin chat sessions
        console.log('📝 Đang xóa admin chat sessions...')
        const { data: deletedChatSessions, error: chatError } = await supabase
            .from('admin_chat_sessions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Điều kiện để xóa tất cả
            .select()

        if (chatError) {
            console.error('❌ Lỗi xóa admin chat sessions:', chatError)
        } else {
            console.log(`✅ Đã xóa ${deletedChatSessions?.length || 0} admin chat sessions`)
        }

        console.log('🎉 RESET HOÀN THÀNH!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ Đã xóa toàn bộ dữ liệu test')
        console.log('✅ Giữ lại cấu trúc database')
        console.log('✅ Admin users đã được giữ lại')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🔄 Bây giờ bạn có thể test lại bot với user mới')
        console.log('📝 User mới sẽ được coi là NEW_USER và thấy welcome message đúng')

    } catch (error) {
        console.error('❌ Lỗi trong quá trình reset:', error)
    }
}

// Chạy script
resetBot()
