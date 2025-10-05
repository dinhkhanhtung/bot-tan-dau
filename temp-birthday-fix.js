// Temporary fix for birthday verification function
async handleBirthdayVerification(user, answer) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') return

    // FIX: Đảm bảo data không bao giờ là undefined
    const data = session.data || session.session_data?.data || {}
    if (!data) {
        console.log('⚠️ Data is undefined in birthday verification handler, creating new object')
        data = {}
    }

    console.log('🎂 Birthday verification answer:', answer)

    if (answer === 'YES') {
        data.birth_year = 1981
        console.log('✅ Birth year confirmed:', data.birth_year)

        await sendMessage(user.facebook_id, '✅ Xác nhận tuổi thành công!\n📝 Thông tin tùy chọn (có thể bỏ qua)\n━━━━━━━━━━━━━━━━━━━━\n📧 Email (để nhận thông báo quan trọng):\nVD: nguyenvanminh@gmail.com\n━━━━━━━━━━━━━━━━━━━━\n🔍 Từ khóa tìm kiếm:\nVD: nhà đất, xe honda, điện thoại...\n━━━━━━━━━━━━━━━━━━━━\n🛒 Sản phẩm/Dịch vụ:\nVD: Nhà đất, xe cộ, điện tử...\n━━━━━━━━━━━━━━━━━━━━\n💡 Nhập: "email,từ khóa,sản phẩm" hoặc "bỏ qua"')

        await sendMessage(user.facebook_id, '📧 Bước 5/7: Email (tùy chọn)\n━━━━━━━━━━━━━━━━━━━━\n📧 Vui lòng nhập email để nhận thông báo quan trọng:\n━━━━━━━━━━━━━━━━━━━━\n💡 Ví dụ: nguyenvanminh@gmail.com\n📝 Nhập email hoặc "bỏ qua":')

        const sessionUpdate = {
            current_flow: 'registration',
            step: 'email',
            data: data,
            started_at: new Date().toISOString()
        }

        console.log('🔄 Updating session after birthday verification:', sessionUpdate)
        await updateBotSession(user.facebook_id, sessionUpdate)

        // Verify session was updated
        const sessionCheck = await getBotSession(user.facebook_id)
        console.log('✅ Session after birthday verification:', sessionCheck)
    } else {
        await sendMessage(user.facebook_id, '❌ Xin lỗi, bot chỉ dành cho người sinh năm 1981 (Tân Dậu).\n💡 Bạn có thể liên hệ admin để được hỗ trợ.')
        await updateBotSession(user.facebook_id, null)
    }
}
