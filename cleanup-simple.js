#!/usr/bin/env node

/**
 * CLEANUP SIMPLE
 * Dọn dẹp đơn giản - chỉ cập nhật biến môi trường
 * 
 * Sử dụng khi:
 * - Chỉ cần cập nhật biến môi trường
 * - Không muốn thay đổi database
 * - Test nhanh logic mới
 */

const fs = require('fs')
const path = require('path')

function updateEnvironmentFiles() {
    console.log('🔧 Updating environment files...')

    try {
        // 1. Cập nhật vercel-env-variables-clean.env
        const vercelEnvPath = path.join(process.cwd(), 'vercel-env-variables-clean.env')

        if (fs.existsSync(vercelEnvPath)) {
            let vercelContent = fs.readFileSync(vercelEnvPath, 'utf8')

            // Comment ADMIN_IDS nếu chưa được comment
            if (vercelContent.includes('ADMIN_IDS=') && !vercelContent.includes('# ADMIN_IDS=')) {
                vercelContent = vercelContent.replace(
                    /ADMIN_IDS=.*/g,
                    '# DEPRECATED: Admin IDs no longer needed - fanpage messages are automatically admin\n# ADMIN_IDS=100074107869848,100026336745820,100000699238053'
                )
                console.log('✅ Updated ADMIN_IDS in vercel-env-variables-clean.env')
            }

            // Đảm bảo FACEBOOK_APP_ID có giá trị
            if (!vercelContent.includes('FACEBOOK_APP_ID=')) {
                vercelContent += '\nFACEBOOK_APP_ID=1246774479717275\n'
                console.log('✅ Added FACEBOOK_APP_ID to vercel-env-variables-clean.env')
            }

            fs.writeFileSync(vercelEnvPath, vercelContent)
            console.log('✅ vercel-env-variables-clean.env updated')
        } else {
            console.log('⚠️  vercel-env-variables-clean.env not found')
        }

        // 2. Cập nhật .env.local (nếu có)
        const localEnvPath = path.join(process.cwd(), '.env.local')

        if (fs.existsSync(localEnvPath)) {
            let localContent = fs.readFileSync(localEnvPath, 'utf8')

            // Comment ADMIN_IDS nếu chưa được comment
            if (localContent.includes('ADMIN_IDS=') && !localContent.includes('# ADMIN_IDS=')) {
                localContent = localContent.replace(
                    /ADMIN_IDS=.*/g,
                    '# DEPRECATED: Admin IDs no longer needed - fanpage messages are automatically admin\n# ADMIN_IDS=100074107869848,100026336745820,100000699238053'
                )
                console.log('✅ Updated ADMIN_IDS in .env.local')
            }

            // Đảm bảo FACEBOOK_APP_ID có giá trị
            if (!localContent.includes('FACEBOOK_APP_ID=')) {
                localContent += '\nFACEBOOK_APP_ID=1246774479717275\n'
                console.log('✅ Added FACEBOOK_APP_ID to .env.local')
            }

            fs.writeFileSync(localEnvPath, localContent)
            console.log('✅ .env.local updated')
        } else {
            console.log('ℹ️  .env.local not found, will be created on next build')
        }

        // 3. Tạo .env.example mới
        const exampleEnvPath = path.join(process.cwd(), 'env.example')

        if (fs.existsSync(exampleEnvPath)) {
            let exampleContent = fs.readFileSync(exampleEnvPath, 'utf8')

            // Cập nhật ADMIN_IDS trong example
            if (exampleContent.includes('ADMIN_IDS=')) {
                exampleContent = exampleContent.replace(
                    /ADMIN_IDS=.*/g,
                    '# DEPRECATED: Admin IDs no longer needed - fanpage messages are automatically admin\n# ADMIN_IDS=100074107869848,100026336745820,100000699238053'
                )
                console.log('✅ Updated ADMIN_IDS in env.example')
            }

            // Đảm bảo FACEBOOK_APP_ID có trong example
            if (!exampleContent.includes('FACEBOOK_APP_ID=')) {
                exampleContent += '\nFACEBOOK_APP_ID=your_facebook_app_id_here\n'
                console.log('✅ Added FACEBOOK_APP_ID to env.example')
            }

            fs.writeFileSync(exampleEnvPath, exampleContent)
            console.log('✅ env.example updated')
        }

        console.log('🎉 Environment files updated successfully!')

    } catch (error) {
        console.error('❌ Environment update failed:', error.message)
        throw error
    }
}

function verifyEnvironmentChanges() {
    console.log('🔍 Verifying environment changes...')

    try {
        // Kiểm tra vercel-env-variables-clean.env
        const vercelEnvPath = path.join(process.cwd(), 'vercel-env-variables-clean.env')

        if (fs.existsSync(vercelEnvPath)) {
            const content = fs.readFileSync(vercelEnvPath, 'utf8')

            // Kiểm tra ADMIN_IDS đã được comment
            if (content.includes('# ADMIN_IDS=')) {
                console.log('✅ ADMIN_IDS properly commented in vercel-env-variables-clean.env')
            } else {
                console.log('⚠️  ADMIN_IDS not commented in vercel-env-variables-clean.env')
            }

            // Kiểm tra FACEBOOK_APP_ID có giá trị
            if (content.includes('FACEBOOK_APP_ID=1246774479717275')) {
                console.log('✅ FACEBOOK_APP_ID properly set in vercel-env-variables-clean.env')
            } else {
                console.log('⚠️  FACEBOOK_APP_ID not found or incorrect in vercel-env-variables-clean.env')
            }
        }

        console.log('🎉 Environment verification completed!')

    } catch (error) {
        console.error('❌ Environment verification failed:', error.message)
        throw error
    }
}

function showSummary() {
    console.log('')
    console.log('📋 CLEANUP SUMMARY')
    console.log('=====================================')
    console.log('✅ vercel-env-variables-clean.env updated')
    console.log('✅ .env.local updated (if exists)')
    console.log('✅ env.example updated')
    console.log('')
    console.log('🔧 Changes made:')
    console.log('• ADMIN_IDS commented out (no longer needed)')
    console.log('• FACEBOOK_APP_ID ensured to be present')
    console.log('• All environment files synchronized')
    console.log('')
    console.log('🚀 Next steps:')
    console.log('1. Deploy to Vercel')
    console.log('2. Test admin functionality from fanpage')
    console.log('3. Verify normal user flow still works')
    console.log('')
    console.log('💡 Note: This is a simple cleanup that only updates')
    console.log('   environment variables. For full database cleanup,')
    console.log('   use cleanup-production-ready.js instead.')
}

async function main() {
    console.log('🧹 Starting simple cleanup...')
    console.log('=====================================')

    try {
        updateEnvironmentFiles()
        console.log('')
        verifyEnvironmentChanges()
        console.log('')
        showSummary()

    } catch (error) {
        console.error('')
        console.error('❌ SIMPLE CLEANUP FAILED!')
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
    updateEnvironmentFiles,
    verifyEnvironmentChanges,
    showSummary
}
