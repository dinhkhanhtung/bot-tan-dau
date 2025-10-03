// Script để test user mới với trạng thái sạch
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Thiếu environment variables')
    console.log('💡 Chạy: NEXT_PUBLIC_SUPABASE_URL=https://oxornnooldwivlexsnkf.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... node test-new-user.js')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNewUser() {
    try {
        console.log('🧪 KIỂM TRA TRẠNG THÁI USER MỚI...')

        // 1. Kiểm tra số lượng users hiện tại
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')

        if (usersError) {
            console.error('❌ Lỗi lấy users:', usersError)
        } else {
            console.log(`📊 Tổng số users: ${users.length}`)
            users.forEach(user => {
                console.log(`  - ${user.name} (${user.facebook_id.slice(-6)}): ${user.status}`)
            })
        }

        // 2. Kiểm tra sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from('bot_sessions')
            .select('*')

        if (sessionsError) {
            console.error('❌ Lỗi lấy sessions:', sessionsError)
        } else {
            console.log(`📊 Tổng số sessions: ${sessions.length}`)
        }

        console.log('✅ KIỂM TRA HOÀN THÀNH!')
        console.log('🎯 Bây giờ bạn có thể test với user Facebook mới')
        console.log('📝 User mới sẽ thấy welcome message và được coi là NEW_USER')

    } catch (error) {
        console.error('❌ Lỗi trong quá trình test:', error)
    }
}

testNewUser()
