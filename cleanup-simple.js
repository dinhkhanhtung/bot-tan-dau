/**
 * Script cleanup đơn giản - xóa các file test và chuẩn bị cho production
 */

const fs = require('fs')
const path = require('path')

async function cleanupForProduction() {
    console.log('🚀 CHUẨN BỊ BOT CHO PRODUCTION')
    console.log('='.repeat(50))

    // Danh sách các file test cần xóa
    const testFiles = [
        'test-facebook-api-fix.js',
        'test-new-user.js',
        'test-pending-user.js',
        'cleanup-test-users.js',
        'cleanup-production-ready.js',
        'cleanup-simple.js',
        'check-admins-temp.js',
        'check-database.js',
        'check-facebook.js',
        'check-system.js',
        'cleanup-admins.js',
        'cleanup-old-admins.js',
        'manage-admin.js',
        'reset-bot.js',
        'setup-admin.js',
        'simple-reset.js',
        'add-admin.js',
        'tatus' // File lỗi
    ]

    console.log('\n1️⃣ Xóa các file test scripts...')
    let deletedFiles = 0

    for (const file of testFiles) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file)
                console.log(`✅ Đã xóa: ${file}`)
                deletedFiles++
            } else {
                console.log(`ℹ️  Không tìm thấy: ${file}`)
            }
        } catch (error) {
            console.error(`❌ Lỗi xóa ${file}:`, error.message)
        }
    }

    console.log('\n2️⃣ Kiểm tra các file cần thiết cho production...')
    const requiredFiles = [
        'package.json',
        'next.config.js',
        'src/app/api/webhook/route.ts',
        'src/lib/core/unified-entry-point.ts',
        'src/lib/utils.ts'
    ]

    let missingFiles = 0
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`✅ Có: ${file}`)
        } else {
            console.log(`❌ Thiếu: ${file}`)
            missingFiles++
        }
    }

    console.log('\n3️⃣ Kiểm tra cấu trúc thư mục...')
    const requiredDirs = [
        'src/app/api',
        'src/lib/core',
        'src/lib/flows',
        'src/lib/handlers'
    ]

    for (const dir of requiredDirs) {
        if (fs.existsSync(dir)) {
            console.log(`✅ Có thư mục: ${dir}`)
        } else {
            console.log(`❌ Thiếu thư mục: ${dir}`)
            missingFiles++
        }
    }

    console.log('\n4️⃣ Tạo file .env từ env.example...')
    try {
        if (fs.existsSync('env.example') && !fs.existsSync('.env')) {
            fs.copyFileSync('env.example', '.env')
            console.log('✅ Đã tạo .env từ env.example')
            console.log('⚠️  Hãy cập nhật các giá trị thật trong file .env')
        } else if (fs.existsSync('.env')) {
            console.log('✅ File .env đã tồn tại')
        } else {
            console.log('❌ Không tìm thấy env.example')
        }
    } catch (error) {
        console.error('❌ Lỗi tạo .env:', error.message)
    }

    console.log('\n5️⃣ Kiểm tra package.json...')
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
        console.log(`✅ Package: ${packageJson.name}`)
        console.log(`✅ Version: ${packageJson.version}`)
        console.log(`✅ Scripts: ${Object.keys(packageJson.scripts || {}).join(', ')}`)
    } catch (error) {
        console.error('❌ Lỗi đọc package.json:', error.message)
    }

    console.log('\n🎉 CLEANUP HOÀN THÀNH!')
    console.log('='.repeat(50))
    console.log(`📊 Tổng kết:`)
    console.log(`   - Đã xóa ${deletedFiles} file test`)
    console.log(`   - Thiếu ${missingFiles} file/directory cần thiết`)

    if (missingFiles === 0) {
        console.log('\n✅ BOT ĐÃ SẴN SÀNG CHO PRODUCTION!')
        console.log('\n📝 Các bước tiếp theo:')
        console.log('   1. Cập nhật file .env với các giá trị thật')
        console.log('   2. Chạy: npm install')
        console.log('   3. Chạy: npm run build')
        console.log('   4. Deploy lên Vercel hoặc server')
        console.log('   5. Test với user Facebook thật')
    } else {
        console.log('\n⚠️  Cần khắc phục các file/directory thiếu trước khi deploy')
    }
}

// Chạy script
cleanupForProduction()
