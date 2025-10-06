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
        try {
            await sendTypingIndicator(user.facebook_id)

            // Enhanced welcome message
            await sendMessage(user.facebook_id, '👥 CỘNG ĐỒNG TÂN DẬU - Hỗ Trợ Chéo')

            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n🎯 KẾT NỐI CÙNG TUỔI:\n• Chia sẻ kỷ niệm tuổi trẻ\n• Hỗ trợ mua bán nội bộ\n• Kết nối bạn bè cùng trang lứa\n• Tổ chức sự kiện cộng đồng\n━━━━━━━━━━━━━━━━━━━━')

            // Typing indicator removed for quick reply
            await sendQuickReplyNoTyping(
                user.facebook_id,
                'Chọn hoạt động cộng đồng:',
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

        } catch (error) {
            console.error('Error in handleCommunity:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải cộng đồng. Vui lòng thử lại!')
        }
    }

    // Handle cross-support services
    async handleCrossSupport(user: any): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            await sendMessage(user.facebook_id, '🤝 HỖ TRỢ CHÉO - CÙNG NHAU PHÁT TRIỂN')

            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n💼 DỊCH VỤ HỖ TRỢ:\n• Tìm việc làm phù hợp\n• Tìm nhà trọ giá rẻ\n• Đi chung xe tiết kiệm\n• Trông trẻ uy tín\n• Nấu ăn gia đình\n• Tư vấn chuyên môn\n━━━━━━━━━━━━━━━━━━━━')

            await sendQuickReplyNoTyping(
                user.facebook_id,
                'Bạn cần hỗ trợ gì:',
                [
                    createQuickReply('💼 TÌM VIỆC', 'SUPPORT_JOB_SEARCH'),
                    createQuickReply('🏠 TÌM NHÀ TRỌ', 'SUPPORT_HOUSE_RENTAL'),
                    createQuickReply('🚗 ĐI CHUNG XE', 'SUPPORT_CARPOOL'),
                    createQuickReply('👶 TRÔNG TRẺ', 'SUPPORT_CHILDCARE'),
                    createQuickReply('🍳 NẤU ĂN', 'SUPPORT_COOKING'),
                    createQuickReply('💡 TƯ VẤN', 'SUPPORT_CONSULTING'),
                    createQuickReply('📝 ĐĂNG TIN HỖ TRỢ', 'SUPPORT_POST_REQUEST'),
                    createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
                ]
            )

        } catch (error) {
            console.error('Error in handleCrossSupport:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải hỗ trợ chéo!')
        }
    }

    // Handle job search support
    async handleJobSearchSupport(user: any): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            await sendMessage(user.facebook_id, '💼 TÌM VIỆC LÀM - Tân Dậu Hỗ Trợ Nhau')

            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n👔 CÁC LĨNH VỰC:\n• Kinh doanh - Bán hàng\n• Công nghệ thông tin\n• Kế toán - Tài chính\n• Giáo dục - Đào tạo\n• Y tế - Chăm sóc sức khỏe\n• Xây dựng - Kiến trúc\n━━━━━━━━━━━━━━━━━━━━')

            await sendQuickReplyNoTyping(
                user.facebook_id,
                'Chọn lĩnh vực bạn quan tâm:',
                [
                    createQuickReply('💰 KINH DOANH', 'JOB_BUSINESS'),
                    createQuickReply('💻 CÔNG NGHỆ', 'JOB_TECH'),
                    createQuickReply('📊 KẾ TOÁN', 'JOB_ACCOUNTING'),
                    createQuickReply('📚 GIÁO DỤC', 'JOB_EDUCATION'),
                    createQuickReply('🏥 Y TẾ', 'JOB_MEDICAL'),
                    createQuickReply('🏗️ XÂY DỰNG', 'JOB_CONSTRUCTION'),
                    createQuickReply('📝 ĐĂNG TIN TUYỂN', 'JOB_POST_REQUEST'),
                    createQuickReply('🔙 QUAY LẠI', 'COMMUNITY_SUPPORT')
                ]
            )

        } catch (error) {
            console.error('Error in handleJobSearchSupport:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra!')
        }
    }

    // Handle community events
    async handleCommunityEvents(user: any): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            await sendMessage(user.facebook_id, '🎪 SỰ KIỆN CỘNG ĐỒNG TÂN DẬU')

            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n📅 SỰ KIỆN SẮP TỚI:\n• Họp mặt Tân Dậu cuối tháng\n• Hội chợ mua bán nội bộ\n• Workshop chia sẻ kinh nghiệm\n• Giao lưu văn nghệ\n• Hoạt động thiện nguyện\n━━━━━━━━━━━━━━━━━━━━')

            // Get upcoming events
            const { data: events, error } = await supabaseAdmin
                .from('events')
                .select('*')
                .eq('status', 'upcoming')
                .order('event_date', { ascending: true })
                .limit(5)

            if (!error && events && events.length > 0) {
                await sendMessage(user.facebook_id, '🎯 SỰ KIỆN NỔI BẬT:')

                const eventElements = events.slice(0, 3).map((event: any) =>
                    createGenericElement(
                        `📅 ${event.title}`,
                        `🗓️ ${new Date(event.event_date).toLocaleDateString('vi-VN')}\n📍 ${event.location}\n👥 ${event.current_participants}/${event.max_participants || '∞'} người`,
                        '',
                        [
                            createQuickReply('🎉 ĐĂNG KÝ', `REGISTER_EVENT_${event.id}`),
                            createQuickReply('ℹ️ CHI TIẾT', `VIEW_EVENT_${event.id}`)
                        ]
                    )
                )

                await sendCarouselTemplate(user.facebook_id, eventElements)
            } else {
                await sendMessage(user.facebook_id, '📭 Hiện chưa có sự kiện nào. Hãy quay lại sau!')
            }

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('🎉 TẠO SỰ KIỆN MỚI', 'CREATE_EVENT'),
                    createQuickReply('📅 SỰ KIỆN CỦA TÔI', 'MY_EVENTS'),
                    createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
                ]
            )

        } catch (error) {
            console.error('Error in handleCommunityEvents:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải sự kiện!')
        }
    }

    // Handle create community event
    async handleCreateEvent(user: any): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            await sendMessage(user.facebook_id, '🎉 TẠO SỰ KIỆN CỘNG ĐỒNG')

            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━\n📋 Thông tin cần cung cấp:\n• Tên sự kiện\n• Mô tả chi tiết\n• Thời gian diễn ra\n• Địa điểm tổ chức\n• Số lượng người tham gia\n━━━━━━━━━━━━━━━━━━━━')

            await sendQuickReplyNoTyping(
                user.facebook_id,
                'Bắt đầu tạo sự kiện:',
                [
                    createQuickReply('📝 TIẾP TỤC', 'EVENT_CREATE_CONTINUE'),
                    createQuickReply('📋 XEM HƯỚNG DẪN', 'EVENT_CREATE_GUIDE'),
                    createQuickReply('🔙 QUAY LẠI', 'COMMUNITY_EVENTS')
                ]
            )

        } catch (error) {
            console.error('Error in handleCreateEvent:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra!')
        }
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
                    '📱 Thông tin liên hệ:\n• Hotline: 0982581222\n• Email: dinhkhanhtung@outlook.com',
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
