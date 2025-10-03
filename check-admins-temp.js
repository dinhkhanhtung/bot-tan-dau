// Temporary script to check admin users
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration!')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAdmins() {
    try {
        console.log('🔍 Checking current admin users in database...')

        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error fetching admins:', error)
            return
        }

        if (!data || data.length === 0) {
            console.log('✅ No active admins found in database')
            console.log('📝 System is using ADMIN_IDS from environment variables only')
            return
        }

        console.log(`⚠️  Found ${data.length} active admin(s) in database:`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        data.forEach((admin, index) => {
            console.log(`${index + 1}. 👤 ${admin.name}`)
            console.log(`   🆔 Facebook ID: ${admin.facebook_id}`)
            console.log(`   👑 Role: ${admin.role}`)
            console.log(`   ✅ Active: ${admin.is_active ? 'Yes' : 'No'}`)
            console.log(`   📅 Created: ${new Date(admin.created_at).toLocaleString('vi-VN')}`)
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        })

        console.log('⚠️  WARNING: These users can access admin features!')
        console.log('💡 RECOMMENDATION: Remove unauthorized users from admin_users table')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

checkAdmins()
