import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    sendGenericTemplate,
    sendCarouselTemplate,
    createQuickReply,
    createGenericElement,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId } from '../utils'

// Handle community features
export async function handleCommunity(user: any) {
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

// Handle birthday notifications
export async function handleCommunityBirthday(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get today's birthdays
        const today = new Date()
        const todayStr = `${today.getMonth() + 1}-${today.getDate()}`

        const { data: birthdays, error } = await supabaseAdmin
            .from('users')
            .select('name, location, facebook_id')
            .eq('birthday', 1981)
            .not('facebook_id', 'eq', user.facebook_id)
            .limit(10)

        if (error) {
            console.error('Error fetching birthdays:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thông tin sinh nhật.')
            return
        }

        if (!birthdays || birthdays.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎂 SINH NHẬT HÔM NAY',
                'Hôm nay không có ai sinh nhật trong cộng đồng Tân Dậu - Hỗ Trợ Chéo.',
                'Hãy quay lại vào ngày khác!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎂 SINH NHẬT HÔM NAY',
                'Chúc mừng sinh nhật:'
            ])

            const birthdayText = birthdays.map((person, index) =>
                `${index + 1}. ${person.name} (${person.location})`
            ).join('\n')

            await sendMessage(user.facebook_id, birthdayText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🎁 GỬI LỜI CHÚC', 'BIRTHDAY_SEND_WISH'),
                createQuickReply('📸 XEM ẢNH', 'BIRTHDAY_VIEW_PHOTOS'),
                createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
            ]
        )

    } catch (error) {
        console.error('Error in community birthday:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle top sellers
export async function handleCommunityTopSeller(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get top sellers based on ratings and transactions
        const { data: topSellers, error } = await supabaseAdmin
            .from('users')
            .select('name, location, rating, facebook_id')
            .eq('status', 'registered')
            .not('rating', 'is', null)
            .order('rating', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching top sellers:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thông tin top seller.')
            return
        }

        if (!topSellers || topSellers.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 TOP SELLER TUẦN NÀY',
                'Chưa có dữ liệu top seller.',
                'Hãy quay lại sau khi có giao dịch!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 TOP SELLER TUẦN NÀY'
            ])

            const topSellerText = topSellers.map((seller, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'
                return `${medal} ${seller.name} (${seller.location}) - ${seller.rating || 0}⭐`
            }).join('\n')

            await sendMessage(user.facebook_id, topSellerText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('👀 XEM CHI TIẾT', 'TOP_SELLER_DETAILS'),
                createQuickReply('💬 KẾT NỐI', 'TOP_SELLER_CONNECT'),
                createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
            ]
        )

    } catch (error) {
        console.error('Error in community top seller:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle community events
export async function handleCommunityEvents(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get upcoming events
        const { data: events, error } = await supabaseAdmin
            .from('events')
            .select('*')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(10)

        if (error) {
            console.error('Error fetching events:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thông tin sự kiện.')
            return
        }

        if (!events || events.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎪 SỰ KIỆN CỘNG ĐỒNG TÂN DẬU',
                'Hiện tại chưa có sự kiện nào sắp diễn ra.',
                'Hãy quay lại sau!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎪 SỰ KIỆN CỘNG ĐỒNG TÂN DẬU',
                'Sự kiện sắp tới:'
            ])

            // Create carousel elements for events
            const elements = events.map((event, index) =>
                createGenericElement(
                    `${index + 1}️⃣ ${event.title}`,
                    `📅 ${new Date(event.event_date).toLocaleDateString('vi-VN')} - ${event.time}\n📍 ${event.location}\n👥 ${event.participants || 0}/${event.max_participants || 0} người đăng ký`,
                    event.image || '',
                    [
                        createQuickReply('✅ ĐĂNG KÝ', `EVENT_REGISTER_${event.id}`),
                        createQuickReply('👀 XEM CHI TIẾT', `EVENT_DETAILS_${event.id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📅 SỰ KIỆN SẮP TỚI', 'EVENTS_UPCOMING'),
                createQuickReply('🎉 SỰ KIỆN ĐANG DIỄN RA', 'EVENTS_ONGOING'),
                createQuickReply('📸 SỰ KIỆN ĐÃ QUA', 'EVENTS_PAST'),
                createQuickReply('➕ TẠO SỰ KIỆN', 'EVENT_CREATE'),
                createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
            ]
        )

    } catch (error) {
        console.error('Error in community events:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle event registration
export async function handleEventRegistration(user: any, eventId: string) {
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

            await sendMessagesWithTyping(user.facebook_id, [
                '✅ ĐĂNG KÝ THÀNH CÔNG!',
                `🎉 ${event.title}`,
                `📅 ${new Date(event.event_date).toLocaleDateString('vi-VN')} - ${event.time}`,
                `📍 ${event.location}`,
                '📱 Thông tin liên hệ:\n• Hotline: 0982581222\n• Email: dinhkhanhtung@outlook.com',
                '⏰ Sẽ nhắc nhở trước 1 ngày\n🎯 Chúc bạn có trải nghiệm tuyệt vời!'
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

// Handle community support
export async function handleCommunitySupport(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn loại hỗ trợ:',
        [
            createQuickReply('💼 TÌM VIỆC LÀM', 'SUPPORT_JOB'),
            createQuickReply('🏠 TÌM NHÀ TRỌ', 'SUPPORT_HOUSING'),
            createQuickReply('🚗 ĐI CHUNG XE', 'SUPPORT_CARPOOL'),
            createQuickReply('👶 TRÔNG TRẺ', 'SUPPORT_CHILDCARE'),
            createQuickReply('🍳 NẤU ĂN', 'SUPPORT_COOKING'),
            createQuickReply('🧹 DỌN DẸP', 'SUPPORT_CLEANING'),
            createQuickReply('💡 TƯ VẤN', 'SUPPORT_ADVICE'),
            createQuickReply('🎓 HỌC TẬP', 'SUPPORT_EDUCATION'),
            createQuickReply('🏥 SỨC KHỎE', 'SUPPORT_HEALTH')
        ]
    )

    await sendQuickReply(
        user.facebook_id,
        'Thêm tùy chọn:',
        [
            createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
        ]
    )
}

// Handle community memories
export async function handleCommunityMemories(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📸 XEM ẢNH KỶ NIỆM', 'MEMORIES_PHOTOS'),
            createQuickReply('📝 CHIA SẺ KỶ NIỆM', 'MEMORIES_SHARE'),
            createQuickReply('🎂 SINH NHẬT ĐẶC BIỆT', 'MEMORIES_BIRTHDAYS'),
            createQuickReply('🏆 THÀNH TÍCH NỔI BẬT', 'MEMORIES_ACHIEVEMENTS'),
            createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
        ]
    )
}

// Handle community achievements
export async function handleCommunityAchievements(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get user achievements
        const { data: achievements, error } = await supabaseAdmin
            .from('user_achievements')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('earned_at', { ascending: false })

        if (error) {
            console.error('Error fetching achievements:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thành tích.')
            return
        }

        if (!achievements || achievements.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ THÀNH TÍCH CỦA BẠN',
                'Bạn chưa có thành tích nào.',
                'Hãy tích cực tham gia cộng đồng để nhận thành tích nhé!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ THÀNH TÍCH CỦA BẠN',
                `Tổng cộng: ${achievements.length} thành tích`
            ])

            const achievementText = achievements.slice(0, 10).map((achievement, index) =>
                `${index + 1}. ${achievement.title} - ${new Date(achievement.earned_at).toLocaleDateString('vi-VN')}`
            ).join('\n')

            await sendMessage(user.facebook_id, achievementText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🏆 XEM TẤT CẢ', 'ACHIEVEMENTS_ALL'),
                createQuickReply('📊 XEM THỐNG KÊ', 'ACHIEVEMENTS_STATS'),
                createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
            ]
        )

    } catch (error) {
        console.error('Error in community achievements:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle community chat
export async function handleCommunityChat(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn nhóm chat:',
        [
            createQuickReply('🏠 CHAT CHUNG', 'CHAT_GENERAL'),
            createQuickReply('🛒 CHAT MUA BÁN', 'CHAT_TRADING'),
            createQuickReply('🎪 CHAT SỰ KIỆN', 'CHAT_EVENTS'),
            createQuickReply('💡 CHAT HỖ TRỢ', 'CHAT_SUPPORT'),
            createQuickReply('🔙 QUAY LẠI', 'COMMUNITY')
        ]
    )
}

// Handle community ranking
export async function handleCommunityRanking(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get top users by various metrics
        const { data: topSellers, error: sellersError } = await supabaseAdmin
            .from('users')
            .select('name, rating, total_sales, total_earnings')
            .not('rating', 'is', null)
            .order('rating', { ascending: false })
            .limit(10)

        const { data: topEarners, error: earnersError } = await supabaseAdmin
            .from('users')
            .select('name, total_earnings, total_sales')
            .not('total_earnings', 'is', null)
            .order('total_earnings', { ascending: false })
            .limit(10)

        if (sellersError || earnersError) {
            console.error('Error fetching rankings:', sellersError || earnersError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải bảng xếp hạng!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '🏆 BẢNG XẾP HẠNG CỘNG ĐỒNG',
            'Top thành viên xuất sắc nhất:'
        ])

        // Top sellers by rating
        if (topSellers && topSellers.length > 0) {
            let rankingText = '⭐ TOP NGƯỜI BÁN ĐƯỢC ĐÁNH GIÁ CAO:\n\n'
            topSellers.slice(0, 5).forEach((seller, index) => {
                rankingText += `${index + 1}. ${seller.name}\n`
                rankingText += `   ⭐ ${seller.rating}/5 | 💰 ${formatCurrency(seller.total_earnings || 0)}\n\n`
            })

            await sendMessage(user.facebook_id, rankingText)
        }

        // Top earners
        if (topEarners && topEarners.length > 0) {
            let earningText = '💰 TOP THU NHẬP CAO:\n\n'
            topEarners.slice(0, 5).forEach((earner, index) => {
                earningText += `${index + 1}. ${earner.name}\n`
                earningText += `   💰 ${formatCurrency(earner.total_earnings || 0)} | 📦 ${earner.total_sales || 0} đơn\n\n`
            })

            await sendMessage(user.facebook_id, earningText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in community ranking:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle community announcements
export async function handleCommunityAnnouncements(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get recent announcements
        const { data: announcements, error } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(5)

        if (error) {
            console.error('Error fetching announcements:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thông báo!')
            return
        }

        if (!announcements || announcements.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📢 THÔNG BÁO CỘNG ĐỒNG',
                'Hiện tại chưa có thông báo nào.',
                'Hãy quay lại sau!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📢 THÔNG BÁO CỘNG ĐỒNG',
                'Các thông báo mới nhất:'
            ])

            for (const announcement of announcements) {
                const date = new Date(announcement.created_at).toLocaleDateString('vi-VN')
                await sendMessage(user.facebook_id,
                    `📢 ${announcement.title}\n\n${announcement.content}\n\n📅 ${date}`
                )
            }
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in community announcements:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}
