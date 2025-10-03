import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReplyNoTyping,
    sendQuickReply,
    createQuickReply,
    sendMessagesWithTyping
} from './facebook-api'
import { CATEGORIES, LOCATIONS, DISTRICTS, PRICE_RANGES } from './constants'
import { formatCurrency, formatNumber, updateBotSession, getBotSession } from './utils'

// Registration flow handlers
export async function handleRegistrationStep(user: any, step: number, input: string) {
    const session = await getBotSession(user.facebook_id)
    const sessionData = session?.session_data || {}

    switch (step) {
        case 1: // Name input
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_flow: 'registration',
                current_step: 2,
                data: { ...sessionData.data, name: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Họ tên: ${input}`,
                'Bước 2/4: Số điện thoại\n📱 Vui lòng nhập số điện thoại của bạn:'
            ])
            break

        case 2: // Phone input
            if (!validatePhoneNumber(input)) {
                await sendMessage(user.facebook_id, 'Số điện thoại không hợp lệ. Vui lòng nhập lại:')
                return
            }

            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 3,
                data: { ...sessionData.data, phone: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ SĐT: ${input}`,
                'Bước 3/4: Vị trí\n📍 Vui lòng chọn tỉnh/thành bạn đang sinh sống:'
            ])

            await sendLocationButtons(user.facebook_id)
            break

        case 3: // Location selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 4,
                data: { ...sessionData.data, location: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Vị trí: ${input}`,
                'Bước 4/4: Xác nhận tuổi\n🎂 Đây là bước quan trọng nhất!',
                'Bot Tân Dậu - Hỗ Trợ Chéo được tạo ra dành riêng cho cộng đồng Tân Dậu - Hỗ Trợ Chéo.',
                '❓ Bạn có phải sinh năm 1981 không?'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Xác nhận tuổi của bạn:',
                [
                    createQuickReply('✅ CÓ - TÔI SINH NĂM 1981', 'REGISTER_CONFIRM_1981'),
                    createQuickReply('❌ KHÔNG - TÔI SINH NĂM KHÁC', 'REGISTER_NOT_1981')
                ]
            )
            break
    }
}

// Listing flow handlers
export async function handleListingStep(user: any, step: number, input: string) {
    const session = await getBotSession(user.id)
    const sessionData = session?.session_data || {}

    switch (step) {
        case 1: // Category selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_flow: 'listing',
                current_step: 2,
                data: { ...sessionData.data, category: input }
            })

            await sendSubcategoryButtons(user.facebook_id, input)
            break

        case 2: // Subcategory selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 3,
                data: { ...sessionData.data, subcategory: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Loại: ${input}`,
                'Bước 1/5: Tiêu đề sản phẩm\n📝 Vui lòng nhập tiêu đề hấp dẫn cho sản phẩm:',
                'VD: Nhà 3PN, Q7, 100m², view sông'
            ])
            break

        case 3: // Title input
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 4,
                data: { ...sessionData.data, title: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Tiêu đề: ${input}`,
                'Bước 2/5: Giá bán\n💰 Vui lòng nhập giá bán (VNĐ):',
                'VD: 2500000000 (2.5 tỷ)'
            ])
            break

        case 4: // Price input
            const price = parseInt(input.replace(/\D/g, ''))
            if (isNaN(price) || price <= 0) {
                await sendMessage(user.facebook_id, 'Giá không hợp lệ. Vui lòng nhập số tiền:')
                return
            }

            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 5,
                data: { ...sessionData.data, price: price }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Giá: ${formatCurrency(price)}`,
                'Bước 3/5: Mô tả chi tiết\n📝 Vui lòng mô tả chi tiết về sản phẩm:',
                'VD: Nhà mới xây, nội thất đầy đủ, view sông đẹp...'
            ])
            break

        case 5: // Description input
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 6,
                data: { ...sessionData.data, description: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Mô tả: ${input}`,
                'Bước 4/5: Vị trí cụ thể\n📍 Vui lòng chọn vị trí cụ thể:'
            ])

            await sendLocationButtons(user.facebook_id)
            break

        case 6: // Location selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 7,
                data: { ...sessionData.data, location: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Vị trí: ${input}`,
                'Bước 5/5: Hình ảnh\n📸 Vui lòng gửi hình ảnh sản phẩm (tối đa 5 ảnh):'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Chọn cách gửi ảnh:',
                [
                    createQuickReply('📷 Chụp ảnh', 'LISTING_TAKE_PHOTO'),
                    createQuickReply('📁 Chọn từ thư viện', 'LISTING_CHOOSE_PHOTO'),
                    createQuickReply('⏭️ Bỏ qua', 'LISTING_SKIP_PHOTO')
                ]
            )
            break
    }
}

// Search flow handlers
export async function handleSearchStep(user: any, step: number, input: string) {
    const session = await getBotSession(user.id)
    const sessionData = session?.session_data || {}

    switch (step) {
        case 1: // Category selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_flow: 'search',
                current_step: 2,
                data: { ...sessionData.data, category: input }
            })

            await sendSubcategoryButtons(user.facebook_id, input)
            break

        case 2: // Subcategory selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 3,
                data: { ...sessionData.data, subcategory: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Loại: ${input}`,
                'Bước 1/3: Vị trí\n📍 Vui lòng chọn vị trí tìm kiếm:'
            ])

            await sendLocationButtons(user.facebook_id)
            break

        case 3: // Location selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 4,
                data: { ...sessionData.data, location: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Vị trí: ${input}`,
                'Bước 2/3: Khoảng giá\n💰 Vui lòng chọn khoảng giá:'
            ])

            await sendPriceRangeButtons(user.facebook_id)
            break

        case 4: // Price range selection
            await updateBotSession(user.facebook_id, {
                ...sessionData,
                current_step: 5,
                data: { ...sessionData.data, priceRange: input }
            })

            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Khoảng giá: ${input}`,
                'Bước 3/3: Từ khóa (tùy chọn)\n🔍 Nhập từ khóa tìm kiếm hoặc bỏ qua:'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Bạn có muốn thêm từ khóa không?',
                [
                    createQuickReply('🔍 THÊM TỪ KHÓA', 'SEARCH_ADD_KEYWORD'),
                    createQuickReply('⏭️ BỎ QUA', 'SEARCH_SKIP_KEYWORD')
                ]
            )
            break
    }
}

// Helper functions
async function sendLocationButtons(facebookId: string) {
    const locationButtons = LOCATIONS.slice(0, 6).map(location =>
        createQuickReply(location, `LOCATION_${location}`)
    )

    await sendQuickReply(
        facebookId,
        'Chọn tỉnh/thành:',
        locationButtons
    )
}

async function sendSubcategoryButtons(facebookId: string, category: string) {
    const subcategories = CATEGORIES[category as keyof typeof CATEGORIES]
    if (!subcategories) return

    const subcategoryButtons = Object.keys(subcategories).slice(0, 4).map(sub =>
        createQuickReply(sub, `SUBCATEGORY_${sub}`)
    )

    await sendQuickReply(
        facebookId,
        `Chọn loại ${category}:`,
        subcategoryButtons
    )
}

async function sendPriceRangeButtons(facebookId: string) {
    const priceButtons = PRICE_RANGES.slice(0, 6).map(range =>
        createQuickReply(range.label, `PRICE_${range.label}`)
    )

    await sendQuickReply(
        facebookId,
        'Chọn khoảng giá:',
        priceButtons
    )
}

function validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[0-9]{10,11}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

// getBotSession imported from utils

