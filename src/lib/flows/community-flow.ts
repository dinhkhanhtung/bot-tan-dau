import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReplyNoTyping,
    sendQuickReply,
    sendGenericTemplate,
    sendCarouselTemplate,
    createQuickReply,
    createGenericElement,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId } from '../utils'
// AI Manager removed - using simple community logic

export class CommunityFlow {
    async handleCommunity(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Tính năng cộng đồng:',
            [
                createQuickReply('🎂 SINH NHẬT', 'COMMUNITY_BIRTHDAY'),
                createQuickReply('🏆 TOP SELLER', 'COMMUNITY_TOP_SELLER'),
                createQuickReply('📖 KỶ NIỆM', 'COMMUNITY_MEMORIES'),
                createQuickReply('🎪 SỰ KIỆN', 'COMMUNITY_EVENTS'),
                createQuickReply('⭐ THÀNH TÍCH', 'COMMUNITY_ACHIEVEMENTS'),
                createQuickReply('🔮 TỬ VI', 'COMMUNITY_HOROSCOPE'),
                createQuickReply('🤝 HỖ TRỢ CHÉO', 'COMMUNITY_SUPPORT'),
                createQuickReply('💬 CHAT NHÓM', 'COMMUNITY_CHAT')
            ]
        )
    }

    async handleEventRegistration(user: any, eventId: string): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        try {
            // Get event details
            const { data: event, error } = await supabaseAdmin
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single()

            if (error || !event) {
                await sendMessage(user.facebook_id, '❌ Không tìm thấy sự kiện!')
                return
            }

            // Check if user already registered
            const { data: existingRegistration, error: regError } = await supabaseAdmin
                .from('event_participants')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.facebook_id)
                .single()

            if (existingRegistration) {
                await sendMessagesWithTyping(user.facebook_id, [
                    '✅ ĐĂNG KÝ THÀNH CÔNG!',
                    `🎉 ${event.title}`,
                    `📅 ${new Date(event.event_date).toLocaleDateString('vi-VN')} - ${event.time}`,
                    `📍 ${event.location}`,
                    'Bạn đã đăng ký sự kiện này rồi!'
                ])
            } else {
                // Register user for event
                const { error: insertError } = await supabaseAdmin
                    .from('event_participants')
                    .insert({
                        id: generateId(),
                        event_id: eventId,
                        user_id: user.facebook_id,
                        registered_at: new Date().toISOString()
                    })

                if (insertError) {
                    console.error('Error registering for event:', insertError)
                    await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau!')
                    return
                }

                // Simple welcome message (AI removed)
                const welcomeMessage = '⏰ Sẽ nhắc nhở trước 1 ngày\n🎯 Chúc bạn có trải nghiệm tuyệt vời!'

                await sendMessagesWithTyping(user.facebook_id, [
                    '✅ ĐĂNG KÝ THÀNH CÔNG!',
                    `🎉 ${event.title}`,
                    `📅 ${new Date(event.event_date).toLocaleDateString('vi-VN')} - ${event.time}`,
                    `📍 ${event.location}`,
                    '📱 Thông tin liên hệ:\n• Hotline: 0123456789\n• Email: event@tandau1981.com',
                    welcomeMessage
                ])
            }

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('📅 XEM SỰ KIỆN KHÁC', 'COMMUNITY_EVENTS'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in event registration:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}
