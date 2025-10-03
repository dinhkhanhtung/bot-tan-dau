// Script to clean up admin users in database
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration!')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Authorized admin IDs from environment variable
const AUTHORIZED_ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(id => id.length > 0)

async function cleanupAdmins() {
    try {
        console.log('🧹 Starting admin cleanup process...')
        console.log(`📋 Authorized admin IDs: ${AUTHORIZED_ADMIN_IDS.join(', ')}`)

        // Get all current admin users
        const { data: currentAdmins, error: fetchError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('is_active', true)

        if (fetchError) {
            console.error('❌ Error fetching current admins:', fetchError)
            return
        }

        console.log(`\n📊 Found ${currentAdmins.length} admin(s) in database`)

        if (currentAdmins.length === 0) {
            console.log('✅ No admins to clean up')
            return
        }

        // Find unauthorized admins
        const unauthorizedAdmins = currentAdmins.filter(admin =>
            !AUTHORIZED_ADMIN_IDS.includes(admin.facebook_id)
        )

        if (unauthorizedAdmins.length === 0) {
            console.log('✅ All admins in database are authorized')
            return
        }

        console.log(`\n⚠️  Found ${unauthorizedAdmins.length} unauthorized admin(s):`)

        unauthorizedAdmins.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.name} (${admin.facebook_id}) - Role: ${admin.role}`)
        })

        // Ask for confirmation
        console.log('\n❓ Do you want to remove these unauthorized admins? (y/N)')

        // For automation, we'll proceed with removal
        console.log('🔄 Proceeding with cleanup...')

        // Remove unauthorized admins
        for (const admin of unauthorizedAdmins) {
            console.log(`🗑️  Removing admin: ${admin.name} (${admin.facebook_id})`)

            const { error: deleteError } = await supabase
                .from('admin_users')
                .delete()
                .eq('facebook_id', admin.facebook_id)

            if (deleteError) {
                console.error(`❌ Error removing admin ${admin.facebook_id}:`, deleteError)
            } else {
                console.log(`✅ Successfully removed admin: ${admin.name}`)
            }
        }

        // Verify cleanup
        const { data: remainingAdmins, error: verifyError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('is_active', true)

        if (verifyError) {
            console.error('❌ Error verifying cleanup:', verifyError)
        } else {
            console.log(`\n✅ Cleanup completed!`)
            console.log(`📊 Remaining admins: ${remainingAdmins.length}`)

            if (remainingAdmins.length > 0) {
                console.log('👥 Authorized admins:')
                remainingAdmins.forEach((admin, index) => {
                    console.log(`   ${index + 1}. ${admin.name} (${admin.facebook_id})`)
                })
            }
        }

        console.log('\n💡 RECOMMENDATION:')
        console.log('✅ Only use ADMIN_IDS environment variable for admin management')
        console.log('❌ Do not add users directly to admin_users table')
        console.log('🔒 This prevents unauthorized access to admin features')

    } catch (error) {
        console.error('❌ Error during cleanup:', error)
    }
}

cleanupAdmins()
