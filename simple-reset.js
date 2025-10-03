// Script đơn giản để reset bot - chỉ cần chạy với biến môi trường
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Thiếu environment variables')
    console.log('💡 Chạy: NEXT_PUBLIC_SUPABASE_URL=https://oxornnooldwivlexsnkf.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... node simple-reset.js')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function simpleReset() {
    try {
        console.log('🧹 Đang reset bot về trạng thái sạch...')

        // Xóa tất cả users không phải admin
        const { data: adminUsers } = await supabase.from('admin_users').select('facebook_id')
        const adminIds = adminUsers?.map(admin => admin.facebook_id) || []

        if (adminIds.length > 0) {
            await supabase.from('users').delete().not('facebook_id', 'in', `(${adminIds.join(',')})`)
        }

        // Xóa tất cả sessions
        await supabase.from('bot_sessions').delete().neq('user_id', 'dummy')

        console.log('✅ Đã reset xong!')
        console.log('🎯 Bây giờ user mới sẽ được coi là NEW_USER')

    } catch (error) {
        console.error('❌ Lỗi:', error.message)
    }
}

simpleReset()
