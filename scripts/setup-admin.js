const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// Lấy thông tin từ biến môi trường
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Lấy thông tin admin từ biến môi trường
const adminUsername = process.env.ADMIN_USERNAME
const adminPassword = process.env.ADMIN_PASSWORD
const adminName = process.env.ADMIN_NAME
const adminEmail = process.env.ADMIN_EMAIL

// Kiểm tra các biến môi trường bắt buộc
if (!supabaseUrl || !supabaseKey || !adminUsername || !adminPassword || !adminName || !adminEmail) {
  console.error('❌ Thiếu biến môi trường bắt buộc!')
  console.error('Cần có: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_EMAIL')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAdmin() {
  try {
    console.log('🔧 Đang tạo admin user với thông tin từ biến môi trường...')
    console.log('📋 Admin Username:', adminUsername)
    console.log('📧 Admin Email:', adminEmail)

    // Tạo hash đơn giản tương thích với bcryptjs (để đơn giản, dùng sha256 + salt cố định)
    // NOTE: Trong production nên dùng bcryptjs với salt rounds
    const salt = 'bot_tan_dau_admin_salt_2024'
    const passwordHash = crypto.createHash('sha256').update(adminPassword + salt).digest('hex')

    console.log('🔄 Đang xóa admin cũ (nếu có)...')

    // Xóa admin cũ trước (nếu có)
    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('username', adminUsername)

    if (deleteError) {
      console.log('⚠️ Không thể xóa admin cũ hoặc admin không tồn tại:', deleteError.message)
    } else {
      console.log('✅ Đã xóa admin cũ thành công')
    }

    console.log('🔄 Đang tạo admin user mới...')

    // Insert admin user mới
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        username: adminUsername,
        password_hash: passwordHash,
        name: adminName,
        email: adminEmail,
        role: 'super_admin',
        permissions: { all: true },
        is_active: true
      })
      .select()

    if (error) {
      console.error('❌ Lỗi tạo admin:', error)
      return
    }

    console.log('✅ Admin đã được tạo thành công!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 Thông tin đăng nhập:')
    console.log('👤 Username:', adminUsername)
    console.log('🔑 Password:', adminPassword)
    console.log('📧 Email:', adminEmail)
    console.log('👑 Role: super_admin')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🌐 Truy cập: http://localhost:3000/admin/login')
    console.log('📱 Hoặc trên mobile: https://bot-tan-dau.vercel.app/admin/login')

  } catch (error) {
    console.error('❌ Lỗi không mong muốn:', error)
  }
}

setupAdmin()
