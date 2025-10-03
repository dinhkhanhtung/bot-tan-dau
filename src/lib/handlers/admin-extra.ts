import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'

// Handle admin confirm send to all
export async function handleAdminConfirmSendAll(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get all users
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name')
            .eq('status', 'registered')

        if (error) {
            console.error('Error fetching users:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi lấy danh sách user!')
            return
        }

        if (!users || users.length === 0) {
            await sendMessage(user.facebook_id, '❌ Không có user nào để gửi!')
            return
        }

        const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/register`
        let successCount = 0
        let errorCount = 0

        // Send to each user
        for (const targetUser of users) {
            try {
                await sendMessage(targetUser.facebook_id, 
                    `🔗 LINK ĐĂNG KÝ MỚI\n\nAdmin đã gửi link đăng ký mới:\n${shareLink}\n\nChia sẻ với bạn bè nhé!`
                )
                successCount++
            } catch (error) {
                console.error(`Error sending to user ${targetUser.facebook_id}:`, error)
                errorCount++
            }
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '✅ GỬI HOÀN TẤT!',
            `📊 Kết quả:\n• Thành công: ${successCount} user\n• Lỗi: ${errorCount} user`,
            'Tất cả user đã nhận được link đăng ký!'
        ])

    } catch (error) {
        console.error('Error in admin confirm send all:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi gửi!')
    }

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📤 GỬI LẠI', 'ADMIN_SEND_REGISTRATION'),
            createQuickReply('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin copy link
export async function handleAdminCopyLink(user: any) {
    await sendTypingIndicator(user.facebook_id)

    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/register`
    
    await sendMessagesWithTyping(user.facebook_id, [
        '📋 COPY LINK THÀNH CÔNG!',
        `Link đã được copy: ${shareLink}`,
        'Bạn có thể paste vào bất kỳ đâu để chia sẻ!'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📤 GỬI LẠI', 'ADMIN_SEND_REGISTRATION'),
            createQuickReply('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}
