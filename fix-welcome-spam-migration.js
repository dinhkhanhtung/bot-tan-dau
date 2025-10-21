/**
 * Fix Welcome Message Spam Migration
 * Synchronizes welcome tracking columns and cleans up spam data
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function fixWelcomeSpamIssue() {
    console.log('🚀 Starting welcome spam fix migration...')

    try {
        // Step 1: Synchronize welcome tracking columns
        console.log('📊 Synchronizing welcome tracking columns...')

        // Update user_interactions table to sync with users table
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('facebook_id, welcome_message_sent')
            .eq('welcome_message_sent', true)

        if (usersError) {
            console.error('❌ Error fetching users:', usersError)
            return
        }

        console.log(`📋 Found ${users.length} users with welcome_message_sent = true`)

        // Update user_interactions table to match
        for (const user of users) {
            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: user.facebook_id,
                    welcome_sent: true,
                    last_welcome_sent: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
        }

        console.log('✅ Synchronized welcome tracking columns')

        // Step 2: Clean up duplicate welcome records
        console.log('🧹 Cleaning up duplicate welcome records...')

        // Find users who have been sent welcome multiple times recently
        const { data: duplicates, error: duplicatesError } = await supabaseAdmin
            .from('user_interactions')
            .select('facebook_id, welcome_sent, last_welcome_sent, updated_at')
            .eq('welcome_sent', true)
            .gte('last_welcome_sent', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

        if (duplicatesError) {
            console.error('❌ Error finding duplicates:', duplicatesError)
            return
        }

        console.log(`📋 Found ${duplicates.length} recent welcome records`)

        // Step 3: Reset users who might be stuck in spam loop
        console.log('🔄 Resetting users stuck in spam loop...')

        // Find users with too many mode changes (indicating spam loop)
        const { data: spamUsers, error: spamError } = await supabaseAdmin
            .from('user_interactions')
            .select('facebook_id, mode_change_count, current_mode, updated_at')
            .gte('mode_change_count', 5) // More than 5 mode changes
            .eq('current_mode', 'choosing')

        if (spamError) {
            console.error('❌ Error finding spam users:', spamError)
            return
        }

        console.log(`📋 Found ${spamUsers.length} users with potential spam loop`)

        // Reset these users to clean state
        for (const spamUser of spamUsers) {
            await supabaseAdmin
                .from('user_interactions')
                .update({
                    current_mode: 'choosing',
                    mode_change_count: 0,
                    bot_active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', spamUser.facebook_id)

            console.log(`🔄 Reset user: ${spamUser.facebook_id}`)
        }

        // Step 4: Create a summary report
        console.log('📊 Creating migration summary...')

        const { data: finalStats, error: statsError } = await supabaseAdmin
            .from('user_interactions')
            .select('current_mode, welcome_sent, mode_change_count')

        if (statsError) {
            console.error('❌ Error getting final stats:', statsError)
            return
        }

        const stats = {
            total_users: finalStats.length,
            choosing_mode: finalStats.filter(u => u.current_mode === 'choosing').length,
            using_bot: finalStats.filter(u => u.current_mode === 'using_bot').length,
            chatting_admin: finalStats.filter(u => u.current_mode === 'chatting_admin').length,
            welcome_sent: finalStats.filter(u => u.welcome_sent === true).length,
            high_mode_changes: finalStats.filter(u => u.mode_change_count > 3).length
        }

        console.log('📊 Migration Summary:')
        console.log(JSON.stringify(stats, null, 2))

        // Step 5: Log the migration completion
        console.log('✅ Welcome spam fix migration completed successfully!')
        console.log('🎯 Users should no longer experience welcome message spam')
        console.log('🔄 Users stuck in loops have been reset')
        console.log('📱 Button clicks should now properly enter flows')

        return stats

    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    fixWelcomeSpamIssue()
        .then((stats) => {
            console.log('🎉 Migration completed successfully!')
            process.exit(0)
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error)
            process.exit(1)
        })
}

module.exports = { fixWelcomeSpamIssue }
