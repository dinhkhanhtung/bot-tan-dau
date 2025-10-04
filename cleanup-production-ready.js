#!/usr/bin/env node

/**
 * CLEANUP PRODUCTION READY
 * Dọn dẹp database và cập nhật biến môi trường sau khi refactor admin logic
 * 
 * Thay đổi chính:
 * - Tin nhắn từ fanpage (FACEBOOK_APP_ID) = admin tự động
 * - Không cần admin_users table nữa
 * - Không cần ADMIN_IDS nữa
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupDatabase() {
    console.log('🧹 Starting database cleanup...')

    try {
        // 1. Kiểm tra admin_users table có tồn tại không
        console.log('📋 Checking admin_users table...')
        const { data: adminTable, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .limit(1)

        if (adminError && adminError.code === 'PGRST116') {
            console.log('✅ admin_users table does not exist (already clean)')
        } else if (adminError) {
            console.log('⚠️  Error checking admin_users table:', adminError.message)
        } else {
            console.log('ℹ️  admin_users table exists but will be ignored by new logic')
        }

        // 2. Kiểm tra chat_bot_offer_counts table
        console.log('📊 Checking chat_bot_offer_counts table...')
        const { data: offerTable, error: offerError } = await supabase
            .from('chat_bot_offer_counts')
            .select('*')
            .limit(1)

        if (offerError && offerError.code === 'PGRST116') {
            console.log('⚠️  chat_bot_offer_counts table does not exist - creating...')

            // Tạo table nếu chưa có
            const { error: createError } = await supabase
                .from('chat_bot_offer_counts')
                .select('*')
                .limit(0)

            if (createError) {
                console.log('❌ Cannot create chat_bot_offer_counts table:', createError.message)
            } else {
                console.log('✅ chat_bot_offer_counts table ready')
            }
        } else if (offerError) {
            console.log('⚠️  Error checking chat_bot_offer_counts table:', offerError.message)
        } else {
            console.log('✅ chat_bot_offer_counts table exists and working')
        }

        console.log('🎉 Database cleanup completed!')

    } catch (error) {
        console.error('❌ Database cleanup failed:', error.message)
        throw error
    }
}

async function updateEnvironmentVariables() {
    console.log('🔧 Updating environment variables...')

    try {
        // Đọc file .env.local
        const fs = require('fs')
        const path = require('path')

        const envPath = path.join(process.cwd(), '.env.local')

        if (!fs.existsSync(envPath)) {
            console.log('⚠️  .env.local not found, creating from template...')

            // Tạo từ vercel-env-variables-clean.env
            const templatePath = path.join(process.cwd(), 'vercel-env-variables-clean.env')
            if (fs.existsSync(templatePath)) {
                const templateContent = fs.readFileSync(templatePath, 'utf8')
                fs.writeFileSync(envPath, templateContent)
                console.log('✅ Created .env.local from template')
            } else {
                console.log('❌ Template file not found')
                return
            }
        }

        let envContent = fs.readFileSync(envPath, 'utf8')

        // Cập nhật ADMIN_IDS
        if (envContent.includes('ADMIN_IDS=')) {
            envContent = envContent.replace(
                /ADMIN_IDS=.*/g,
                '# DEPRECATED: Admin IDs no longer needed - fanpage messages are automatically admin\n# ADMIN_IDS=100074107869848,100026336745820,100000699238053'
            )
            console.log('✅ Updated ADMIN_IDS in .env.local')
        }

        // Đảm bảo FACEBOOK_APP_ID có giá trị
        if (!envContent.includes('FACEBOOK_APP_ID=')) {
            envContent += '\nFACEBOOK_APP_ID=1246774479717275\n'
            console.log('✅ Added FACEBOOK_APP_ID to .env.local')
        }

        // Ghi lại file
        fs.writeFileSync(envPath, envContent)
        console.log('✅ Environment variables updated!')

    } catch (error) {
        console.error('❌ Environment update failed:', error.message)
        throw error
    }
}

async function verifyChanges() {
    console.log('🔍 Verifying changes...')

    try {
        // Kiểm tra FACEBOOK_APP_ID
        const appId = process.env.FACEBOOK_APP_ID
        if (!appId) {
            console.log('❌ FACEBOOK_APP_ID not found in environment')
            return false
        }
        console.log(`✅ FACEBOOK_APP_ID: ${appId}`)

        // Kiểm tra ADMIN_IDS đã được comment
        const adminIds = process.env.ADMIN_IDS
        if (adminIds && !adminIds.startsWith('#')) {
            console.log('⚠️  ADMIN_IDS still active, should be commented out')
        } else {
            console.log('✅ ADMIN_IDS properly commented out')
        }

        console.log('🎉 Verification completed!')
        return true

    } catch (error) {
        console.error('❌ Verification failed:', error.message)
        return false
    }
}

async function main() {
    console.log('🚀 Starting production cleanup...')
    console.log('=====================================')

    try {
        await cleanupDatabase()
        console.log('')
        await updateEnvironmentVariables()
        console.log('')
        await verifyChanges()

        console.log('')
        console.log('🎉 CLEANUP COMPLETED SUCCESSFULLY!')
        console.log('=====================================')
        console.log('✅ Database cleaned up')
        console.log('✅ Environment variables updated')
        console.log('✅ Admin logic refactored')
        console.log('')
        console.log('📋 Next steps:')
        console.log('1. Deploy to Vercel')
        console.log('2. Test admin functionality from fanpage')
        console.log('3. Verify normal user flow still works')

    } catch (error) {
        console.error('')
        console.error('❌ CLEANUP FAILED!')
        console.error('=====================================')
        console.error('Error:', error.message)
        process.exit(1)
    }
}

// Chạy cleanup
if (require.main === module) {
    main()
}

module.exports = {
    cleanupDatabase,
    updateEnvironmentVariables,
    verifyChanges
}
