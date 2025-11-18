import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

// Lấy thông tin từ biến môi trường
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

async function setupAdmin() {
  try {
    console.log('🚀 Setting up admin user via API...')
    console.log('🌐 API URL:', `${baseUrl}/api/admin/setup`)

    const response = await fetch(`${baseUrl}/api/admin/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Admin user setup successfully!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📋 Admin Details:')
      console.log(`👤 Username: ${result.admin.username}`)
      console.log(`📧 Name: ${result.admin.name}`)
      console.log(`👑 Role: ${result.admin.role}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔑 Login Credentials:')
      console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`)
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'pem05vrGNV8aIe'}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🌐 Access URLs:')
      console.log(`   Local: http://localhost:3000/admin/login`)
      console.log(`   Production: https://bot-tan-dau.vercel.app/admin/login`)
    } else {
      console.log('⚠️ Setup response:', result.message)
      if (result.message.includes('already exists')) {
        console.log('✅ Admin user already exists - no action needed')
        console.log('🔑 You can login with:')
        console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`)
        console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'pem05vrGNV8aIe'}`)
      }
    }

  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message)
    console.log('\n🔧 Manual setup options:')
    console.log('   1. Run: npm run setup:admin (after starting the server)')
    console.log('   2. Or login directly at: https://bot-tan-dau.vercel.app/admin/login')
    console.log('   3. The system will auto-create admin user on first login')
    console.log('\n📋 Default credentials:')
    console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`)
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'pem05vrGNV8aIe'}`)
  }
}

setupAdmin()
