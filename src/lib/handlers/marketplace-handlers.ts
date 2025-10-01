import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    sendGenericTemplate,
    sendCarouselTemplate,
    createPostbackButton,
    createGenericElement,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId, updateBotSession, getBotSession } from '../utils'
import { CATEGORIES, LOCATIONS, DISTRICTS, PRICE_RANGES, SEARCH_HELPERS, HASHTAG_MAPPING, POPULAR_HASHTAGS } from '../constants'

// Handle listing flow
export async function handleListing(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🛒 NIÊM YẾT SẢN PHẨM/DỊCH VỤ',
        'Chọn loại tin đăng bạn muốn đăng:',
        '📋 Thông tin cần cung cấp:\n• Tên sản phẩm/dịch vụ\n• Mô tả chi tiết\n• Giá bán\n• Vị trí cụ thể\n• Hình ảnh minh họa'
    ])

    // Send first set of categories
    await sendButtonTemplate(
        user.facebook_id,
        'Chọn danh mục:',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'LISTING_CATEGORY_REAL_ESTATE'),
            createPostbackButton('🚗 Ô TÔ', 'LISTING_CATEGORY_CAR'),
            createPostbackButton('📱 ĐIỆN TỬ', 'LISTING_CATEGORY_ELECTRONICS')
        ]
    )

    // Send second set of categories
    await sendButtonTemplate(
        user.facebook_id,
        'Tiếp tục chọn:',
        [
            createPostbackButton('👕 THỜI TRANG', 'LISTING_CATEGORY_FASHION'),
            createPostbackButton('🍽️ ẨM THỰC', 'LISTING_CATEGORY_FOOD'),
            createPostbackButton('🔧 DỊCH VỤ', 'LISTING_CATEGORY_SERVICE')
        ]
    )
}

// Handle listing category selection
export async function handleListingCategory(user: any, category: string) {
    await sendTypingIndicator(user.facebook_id)

    const categoryInfo = CATEGORIES[category as keyof typeof CATEGORIES]
    if (!categoryInfo) {
        await sendMessage(user.facebook_id, '❌ Danh mục không hợp lệ!')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        `${categoryInfo.icon} ${categoryInfo.name}`,
        `Chọn loại ${categoryInfo.name.toLowerCase()} bạn muốn đăng:`
    ])

    const buttons = categoryInfo.subcategories.map((sub: any) =>
        createPostbackButton(sub.icon + ' ' + sub.name, `LISTING_SUBCATEGORY_${sub.key}`)
    )

    buttons.push(createPostbackButton('🔄 QUAY LẠI', 'LISTING'))

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn loại:',
        buttons
    )
}

// Handle listing step
export async function handleListingStep(user: any, text: string, session: any) {
    switch (session.step) {
        case 'title':
            await handleListingTitleInput(user, text, session.data)
            break
        case 'price':
            await handleListingPriceInput(user, text, session.data)
            break
        case 'description':
            await handleListingDescriptionInput(user, text, session.data)
            break
        case 'location':
            await handleListingLocation(user, text)
            break
        case 'images':
            await handleListingImages(user, text)
            break
    }
}

// Handle title input
async function handleListingTitleInput(user: any, text: string, data: any) {
    if (text.length < 10) {
        await sendMessage(user.facebook_id, '❌ Tiêu đề quá ngắn. Vui lòng nhập tiêu đề hấp dẫn hơn:')
        return
    }

    data.title = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Tiêu đề: ${data.title}`,
        'Bước 2/5: Giá bán\n💰 Vui lòng nhập giá bán (VNĐ):\n\nVD: 2500000000 (2.5 tỷ)'
    ])

    await updateBotSession(user.facebook_id, {
        step: 'price',
        data: data
    })
}

// Handle price input
async function handleListingPriceInput(user: any, text: string, data: any) {
    const price = parseInt(text.replace(/\D/g, ''))

    if (isNaN(price) || price <= 0) {
        await sendMessage(user.facebook_id, '❌ Giá không hợp lệ. Vui lòng nhập số tiền:')
        return
    }

    data.price = price

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Giá: ${formatCurrency(price)}`,
        'Bước 3/5: Mô tả chi tiết\n📝 Vui lòng mô tả chi tiết về sản phẩm:\n\nVD: Nhà mới xây, nội thất đầy đủ, view sông đẹp...'
    ])

    await updateBotSession(user.facebook_id, {
        step: 'description',
        data: data
    })
}

// Handle description input
async function handleListingDescriptionInput(user: any, text: string, data: any) {
    if (text.length < 20) {
        await sendMessage(user.facebook_id, '❌ Mô tả quá ngắn. Vui lòng mô tả chi tiết hơn:')
        return
    }

    data.description = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Mô tả: ${data.description}`,
        'Bước 4/5: Vị trí cụ thể\n📍 Vui lòng chọn vị trí cụ thể:'
    ])

    // Show location buttons - only major cities first
    const majorCities = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ']

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn thành phố:',
        majorCities.map(city =>
            createPostbackButton(`🏙️ ${city}`, `LISTING_CITY_${city}`)
        )
    )

    await updateBotSession(user.facebook_id, {
        step: 'location',
        data: data
    })
}

// Handle city selection
export async function handleListingCity(user: any, city: string) {
    await sendTypingIndicator(user.facebook_id)

    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') return

    const data = session.data as any
    data.city = city

    // Show districts for selected city
    const districts = DISTRICTS[city as keyof typeof DISTRICTS] || []

    if (districts.length === 0) {
        // No districts, use city as location
        data.location = city
        await handleListingLocation(user, city)
        return
    }

    // Show first 3 districts
    const firstDistricts = districts.slice(0, 3)
    const remainingDistricts = districts.slice(3)

    await sendButtonTemplate(
        user.facebook_id,
        `Chọn quận/huyện tại ${city}:`,
        firstDistricts.map(district =>
            createPostbackButton(`🏠 ${district}`, `LISTING_LOCATION_${district}`)
        )
    )

    if (remainingDistricts.length > 0) {
        // Show more districts if available
        await sendButtonTemplate(
            user.facebook_id,
            'Xem thêm:',
            [
                createPostbackButton('📋 XEM TẤT CẢ', `LISTING_DISTRICTS_${city}`),
                createPostbackButton('🏙️ CHỌN THÀNH PHỐ KHÁC', 'LISTING_LOCATION_SELECT')
            ]
        )
    }
}

// Handle location selection
export async function handleListingLocation(user: any, location: string) {
    await sendTypingIndicator(user.facebook_id)

    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') return

    const data = session.data as any
    data.location = location

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Vị trí: ${location}`,
        'Bước 5/5: Hình ảnh\n📸 Vui lòng gửi hình ảnh sản phẩm (tối đa 5 ảnh):'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn hình ảnh:',
        [
            createPostbackButton('📷 Chụp ảnh', 'LISTING_IMAGE_CAMERA'),
            createPostbackButton('📁 Chọn từ thư viện', 'LISTING_IMAGE_GALLERY'),
            createPostbackButton('⏭️ Bỏ qua', 'LISTING_CONFIRM')
        ]
    )

    await updateBotSession(user.facebook_id, {
        step: 'images',
        data: data
    })
}

// Handle listing confirmation
export async function handleListingConfirm(user: any) {
    await sendTypingIndicator(user.facebook_id)

    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') return

    const data = session.data

    await sendMessagesWithTyping(user.facebook_id, [
        '📋 XÁC NHẬN THÔNG TIN',
        `🏠 Tiêu đề: ${data.title}`,
        `💰 Giá: ${formatCurrency(data.price)}`,
        `📍 Vị trí: ${data.location}`,
        `📝 Mô tả: ${data.description}`,
        `📸 Hình ảnh: ${data.images?.length || 0} ảnh`
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Xác nhận đăng tin:',
        [
            createPostbackButton('✅ ĐĂNG TIN', 'LISTING_SUBMIT'),
            createPostbackButton('✏️ CHỈNH SỬA', 'LISTING_EDIT'),
            createPostbackButton('❌ HỦY', 'MAIN_MENU')
        ]
    )
}

// Handle listing submission
export async function handleListingSubmit(user: any) {
    await sendTypingIndicator(user.facebook_id)

    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') return

    const data = session.data

    try {
        // Create listing in database
        const { data: listing, error } = await supabaseAdmin
            .from('listings')
            .insert({
                id: generateId(),
                user_id: user.facebook_id,
                title: data.title,
                description: data.description,
                price: data.price,
                category: data.category,
                subcategory: data.subcategory,
                location: data.location,
                images: data.images || [],
                status: 'active',
                views: 0,
                likes: 0,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating listing:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi đăng tin. Vui lòng thử lại sau!')
            return
        }

        // Clear session
        await updateBotSession(user.facebook_id, null)

        // Send success message
        await sendMessagesWithTyping(user.facebook_id, [
            '✅ ĐĂNG TIN THÀNH CÔNG!',
            '🎉 Tin đăng của bạn đã được hiển thị cho cộng đồng Tân Dậu - Hỗ Trợ Chéo',
            `📋 Thông tin tin đăng:\n• ID: #${listing.id}\n• Trạng thái: Đang hiển thị\n• Lượt xem: 0\n• Lượt quan tâm: 0`,
            '💬 Sẽ thông báo khi có người quan tâm\n🎯 Chúc bạn bán được giá tốt!'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📱 XEM TIN ĐĂNG', `VIEW_LISTING_${listing.id}`),
                createPostbackButton('✏️ CHỈNH SỬA', `EDIT_LISTING_${listing.id}`),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in listing submission:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle search flow
export async function handleSearch(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM KIẾM SẢN PHẨM/DỊCH VỤ',
        'Tìm kiếm trong cộng đồng Tân Dậu 1981:',
        '💡 Bạn có thể tìm theo:\n• Danh mục sản phẩm\n• Từ khóa\n• Vị trí\n• Giá cả\n• Hashtag'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn danh mục:',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'SEARCH_CATEGORY_REAL_ESTATE'),
            createPostbackButton('🚗 Ô TÔ', 'SEARCH_CATEGORY_CAR'),
            createPostbackButton('📱 ĐIỆN TỬ', 'SEARCH_CATEGORY_ELECTRONICS'),
            createPostbackButton('👕 THỜI TRANG', 'SEARCH_CATEGORY_FASHION'),
            createPostbackButton('🍽️ ẨM THỰC', 'SEARCH_CATEGORY_FOOD'),
            createPostbackButton('🔧 DỊCH VỤ', 'SEARCH_CATEGORY_SERVICE'),
            createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
            createPostbackButton('🔍 TÌM THEO TỪ KHÓA', 'SEARCH_KEYWORD')
        ]
    )
}

// Handle search category
export async function handleSearchCategory(user: any, category: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get listings by category
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('category', category)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching listings:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
            return
        }

        if (!listings || listings.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                '❌ Không tìm thấy sản phẩm nào phù hợp!',
                'Hãy thử tìm kiếm với từ khóa khác hoặc danh mục khác.'
            ])

            await sendButtonTemplate(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createPostbackButton('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                    createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                    createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '🔍 Đang tìm kiếm...',
            `Tìm thấy ${listings.length} tin phù hợp:`
        ])

        // Create carousel elements
        const elements = listings.slice(0, 10).map((listing: any, index: number) =>
            createGenericElement(
                `${index + 1}️⃣ ${listing.title}`,
                `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                listing.images?.[0] || '',
                [
                    createPostbackButton('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                    createPostbackButton('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                ]
            )
        )

        await sendCarouselTemplate(user.facebook_id, elements)

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 TÌM KIẾM KHÁC', 'SEARCH'),
                createPostbackButton('🎯 BỘ LỌC NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('📱 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in search category:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle view listing
export async function handleViewListing(user: any, listingId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get listing details
        const { data: listing, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('id', listingId)
            .single()

        if (error || !listing) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy tin đăng!')
            return
        }

        // Get seller info
        const { data: seller, error: sellerError } = await supabaseAdmin
            .from('users')
            .select('name, phone, location, rating')
            .eq('facebook_id', listing.user_id)
            .single()

        await sendMessagesWithTyping(user.facebook_id, [
            '🏠 CHI TIẾT SẢN PHẨM',
            `📋 Thông tin cơ bản:\n• Tiêu đề: ${listing.title}\n• Giá: ${formatCurrency(listing.price)}\n• Vị trí: ${listing.location}\n• Ngày đăng: ${new Date(listing.created_at).toLocaleDateString('vi-VN')}`,
            `📝 Mô tả:\n${listing.description}`,
            `👤 Người bán: ${seller?.name || 'N/A'}\n⭐ Đánh giá: ${seller?.rating || 0}/5\n📞 Số giao dịch: 0`
        ])

        // Show image buttons if available
        if (listing.images && listing.images.length > 0) {
            const imageButtons = listing.images.slice(0, 3).map((_: any, index: number) =>
                createPostbackButton(`🖼️ XEM ẢNH ${index + 1}`, `VIEW_IMAGE_${listingId}_${index}`)
            )

            await sendButtonTemplate(
                user.facebook_id,
                'Hình ảnh:',
                imageButtons
            )
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💬 KẾT NỐI NGAY', `CONTACT_SELLER_${listing.user_id}`),
                createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_SELLER_${listing.user_id}`),
                createPostbackButton('🔍 TÌM TƯƠNG TỰ', `SIMILAR_LISTINGS_${listing.category}`)
            ]
        )

    } catch (error) {
        console.error('Error in view listing:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle contact seller
export async function handleContactSeller(user: any, sellerId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get seller info
        const { data: seller, error } = await supabaseAdmin
            .from('users')
            .select('name, phone, location')
            .eq('facebook_id', sellerId)
            .single()

        if (error || !seller) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy thông tin người bán!')
            return
        }

        // Create conversation
        const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .insert({
                id: generateId(),
                buyer_id: user.facebook_id,
                seller_id: sellerId,
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (convError) {
            console.error('Error creating conversation:', convError)
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '✅ ĐÃ KẾT NỐI THÀNH CÔNG!',
            `👥 Bạn đã được kết nối với:\n• ${seller.name} (Người bán)\n• SĐT: ${seller.phone}\n• Vị trí: ${seller.location}`,
            '💬 Các bạn có thể chat trực tiếp để thương lượng\n🎯 Chúc mua bán thành công!'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💬 VÀO CHAT', `CHAT_${sellerId}`),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in contact seller:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle search advanced
export async function handleSearchAdvanced(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🎯 TÌM KIẾM NÂNG CAO',
        'Chọn tiêu chí tìm kiếm:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tiêu chí tìm kiếm:',
        [
            createPostbackButton('🔍 TÌM THEO TỪ KHÓA', 'SEARCH_KEYWORD'),
            createPostbackButton('📍 TÌM THEO VỊ TRÍ', 'SEARCH_LOCATION'),
            createPostbackButton('💰 TÌM THEO GIÁ', 'SEARCH_PRICE'),
            createPostbackButton('⭐ TÌM THEO ĐÁNH GIÁ', 'SEARCH_RATING'),
            createPostbackButton('📅 TÌM THEO NGÀY', 'SEARCH_DATE'),
            createPostbackButton('👤 TÌM THEO NGƯỜI BÁN', 'SEARCH_SELLER')
        ]
    )
}

// Handle search keyword
export async function handleSearchKeyword(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM THEO TỪ KHÓA & HASHTAG',
        'Nhập từ khóa hoặc hashtag bạn muốn tìm:\n\nVD: "nhà 3 tầng", "xe honda", "điện thoại samsung"',
        '💡 Bạn có thể tìm kiếm:\n• "nhà ở hà nội" - Tìm nhà tại Hà Nội\n• "xe honda" - Tìm xe Honda\n• "gia sư toán" - Tìm gia sư dạy toán',
        '🏷️ Hoặc dùng hashtag:\n• #quanao - Tìm quần áo\n• #dienthoai - Tìm điện thoại\n• #hanoi - Tìm tại Hà Nội\n• #re - Tìm giá rẻ'
    ])

    // Show popular hashtags
    const popularHashtags = SEARCH_HELPERS.getPopularHashtags().slice(0, 6)
    await sendButtonTemplate(
        user.facebook_id,
        'Hashtag phổ biến:',
        popularHashtags.map(hashtag =>
            createPostbackButton(hashtag, `SEARCH_HASHTAG_${hashtag}`)
        )
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔙 QUAY LẠI', 'SEARCH_ADVANCED'),
            createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )

    // Set search session
    await updateBotSession(user.facebook_id, {
        current_flow: 'search',
        step: 'keyword',
        data: { type: 'keyword' }
    })
}

// Handle search keyword from suggestion
export async function handleSearchKeywordSuggestion(user: any, suggestion: string) {
    await sendTypingIndicator(user.facebook_id)

    // Set search session and process the suggestion
    await updateBotSession(user.facebook_id, {
        current_flow: 'search',
        step: 'keyword',
        data: { type: 'keyword', keyword: suggestion }
    })

    // Process the suggestion as if user typed it
    await handleSearchKeywordInput(user, suggestion, { keyword: suggestion })
}

// Handle hashtag search
export async function handleSearchHashtag(user: any, hashtag: string) {
    await sendTypingIndicator(user.facebook_id)

    // Set search session and process the hashtag
    await updateBotSession(user.facebook_id, {
        current_flow: 'search',
        step: 'keyword',
        data: { type: 'hashtag', keyword: hashtag }
    })

    // Process the hashtag as if user typed it
    await handleSearchKeywordInput(user, hashtag, { keyword: hashtag })
}

// Handle search step
export async function handleSearchStep(user: any, text: string, session: any) {
    const step = session.step
    const data = session.data || {}

    if (data.type === 'keyword') {
        await handleSearchKeywordInput(user, text, data)
    } else {
        // Handle location selection
        await handleSearchLocationInput(user, text, data)
    }
}

// Handle search keyword input with smart search
async function handleSearchKeywordInput(user: any, text: string, data: any) {
    if (text.length < 2) {
        await sendMessage(user.facebook_id, 'Từ khóa quá ngắn! Vui lòng nhập ít nhất 2 ký tự.')
        return
    }

    data.keyword = text.trim()
    const query = data.keyword

    try {
        // Check if query contains hashtags
        const { hashtags, remainingQuery } = SEARCH_HELPERS.parseHashtags(query)

        let listings: any[] = []
        let searchMessage = ''

        if (hashtags.length > 0) {
            // Hashtag search
            const { data: allListings, error: listingsError } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(100)

            if (!listingsError) {
                listings = SEARCH_HELPERS.searchWithHashtags(allListings || [], query)
                const hashtagText = hashtags.join(' ')
                searchMessage = `Tìm thấy ${listings.length} kết quả cho ${hashtagText}${remainingQuery ? ` + "${remainingQuery}"` : ''}`
            }
        } else {
            // Regular smart search: Parse query for category, location, and keywords
            const searchParams = parseSearchQuery(query)

            if (searchParams.category && searchParams.location) {
                // Search by both category and location
                const { data: categoryListings, error: categoryError } = await supabaseAdmin
                    .from('listings')
                    .select('*')
                    .eq('category', searchParams.category)
                    .ilike('location', `%${searchParams.location}%`)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (!categoryError) {
                    listings = categoryListings || []
                    searchMessage = `Tìm thấy ${listings.length} kết quả cho "${searchParams.categoryName}" tại "${searchParams.location}"`
                }
            } else if (searchParams.category) {
                // Search by category only
                const { data: categoryListings, error: categoryError } = await supabaseAdmin
                    .from('listings')
                    .select('*')
                    .eq('category', searchParams.category)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (!categoryError) {
                    listings = categoryListings || []
                    searchMessage = `Tìm thấy ${listings.length} kết quả cho "${searchParams.categoryName}"`
                }
            } else if (searchParams.location) {
                // Search by location only
                const { data: locationListings, error: locationError } = await supabaseAdmin
                    .from('listings')
                    .select('*')
                    .ilike('location', `%${searchParams.location}%`)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (!locationError) {
                    listings = locationListings || []
                    searchMessage = `Tìm thấy ${listings.length} kết quả tại "${searchParams.location}"`
                }
            } else {
                // Fallback to keyword search
                const { data: keywordListings, error: keywordError } = await supabaseAdmin
                    .from('listings')
                    .select('*')
                    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (!keywordError) {
                    listings = keywordListings || []
                    searchMessage = `Tìm thấy ${listings.length} kết quả cho "${query}"`
                }
            }
        }

        // If no results, try suggestions
        if (!listings || listings.length === 0) {
            const suggestions = SEARCH_HELPERS.generateSearchSuggestions(query)

            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                `❌ Không tìm thấy kết quả nào cho "${query}"!`,
                '💡 Gợi ý tìm kiếm:',
                suggestions.slice(0, 5).map(s => `• ${s}`).join('\n')
            ])

            await sendButtonTemplate(
                user.facebook_id,
                'Thử tìm kiếm:',
                suggestions.slice(0, 6).map(suggestion =>
                    createPostbackButton(`🔍 ${suggestion}`, `SEARCH_KEYWORD_${suggestion}`)
                )
            )
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                searchMessage
            ])

            // Create carousel elements
            const elements = listings.slice(0, 10).map((listing: any, index: number) =>
                createGenericElement(
                    `${index + 1}️⃣ ${listing.title}`,
                    `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                    listing.images?.[0] || '',
                    [
                        createPostbackButton('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear session
        await updateBotSession(user.facebook_id, null)

    } catch (error) {
        console.error('Error in search keyword input:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Parse search query to extract category, location, and keywords
function parseSearchQuery(query: string) {
    const normalizedQuery = query.toLowerCase().trim()

    // Find category
    const category = SEARCH_HELPERS.findCategoryByKeyword(normalizedQuery)
    const categoryName = category ? CATEGORIES[category as keyof typeof CATEGORIES]?.name : null

    // Find location
    const location = SEARCH_HELPERS.findLocationByKeyword(normalizedQuery)

    // Extract keywords (remove category and location words)
    let keywords = normalizedQuery
    if (categoryName) {
        keywords = keywords.replace(categoryName.toLowerCase(), '').trim()
    }
    if (location) {
        keywords = keywords.replace(location.toLowerCase(), '').trim()
    }

    return {
        category,
        categoryName,
        location,
        keywords: keywords.split(' ').filter(k => k.length > 1)
    }
}

// Handle search location input
async function handleSearchLocationInput(user: any, text: string, data: any) {
    data.location = text.trim()

    try {
        // Search listings by location
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .ilike('location', `%${data.location}%`)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error searching listings by location:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
            return
        }

        if (!listings || listings.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                `❌ Không tìm thấy kết quả nào cho vị trí "${data.location}"!`,
                'Hãy thử vị trí khác hoặc tìm kiếm theo danh mục.'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                `Tìm thấy ${listings.length} kết quả cho "${data.location}":`
            ])

            // Create carousel elements
            const elements = listings.slice(0, 10).map((listing: any, index: number) =>
                createGenericElement(
                    `${index + 1}️⃣ ${listing.title}`,
                    `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                    listing.images?.[0] || '',
                    [
                        createPostbackButton('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear session
        await updateBotSession(user.facebook_id, null)

    } catch (error) {
        console.error('Error in search location input:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle my listings
export async function handleMyListings(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching user listings:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải tin đăng của bạn.')
            return
        }

        if (!listings || listings.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📱 TIN ĐĂNG CỦA TÔI',
                'Bạn chưa có tin đăng nào.',
                'Hãy tạo tin đăng đầu tiên!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📱 TIN ĐĂNG CỦA TÔI',
                `Tổng cộng: ${listings.length} tin đăng`
            ])

            const listingText = listings.map((listing: any, index: number) => {
                const status = listing.status === 'active' ? '✅' : listing.status === 'featured' ? '⭐' : '⏳'
                const date = new Date(listing.created_at).toLocaleDateString('vi-VN')
                return `${index + 1}. ${status} ${listing.title} - ${formatCurrency(listing.price)} (${date})`
            }).join('\n')

            await sendMessage(user.facebook_id, listingText)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🛒 TẠO TIN MỚI', 'LISTING'),
                createPostbackButton('✏️ CHỈNH SỬA', 'EDIT_LISTING'),
                createPostbackButton('📊 THỐNG KÊ', 'LISTING_STATS'),
                createPostbackButton('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in my listings:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle buy & sell for new users
export async function handleBuySell(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🛒 MUA BÁN & TÌM KIẾM',
        'Chào mừng bạn đến với cộng đồng Tân Dậu 1981!',
        'Để sử dụng đầy đủ tính năng mua bán, bạn cần đăng ký thành viên trước.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn:',
        [
            createPostbackButton('📝 ĐĂNG KÝ', 'REGISTER'),
            createPostbackButton('ℹ️ TÌM HIỂU', 'INFO'),
            createPostbackButton('💬 HỖ TRỢ', 'SUPPORT')
        ]
    )
}

// Handle search & update for registered users
export async function handleSearchUpdate(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM KIẾM & CẬP NHẬT',
        'Chọn chức năng bạn muốn:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chức năng:',
        [
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('📱 TIN ĐĂNG CỦA TÔI', 'MY_LISTINGS'),
            createPostbackButton('🛒 TẠO TIN MỚI', 'LISTING'),
            createPostbackButton('📊 THỐNG KÊ', 'STATS'),
            createPostbackButton('🔙 QUAY LẠI', 'MAIN_MENU')
        ]
    )
}

// Handle listing images
export async function handleListingImages(user: any, imageUrl?: string) {
    try {
        const session = await getBotSession(user.facebook_id)
        if (!session) return

        const sessionData = session.session_data || {}

        if (imageUrl) {
            // Add image to session data
            if (!sessionData.images) {
                sessionData.images = []
            }
            sessionData.images.push(imageUrl)

            await updateBotSession(user.facebook_id, {
                ...session,
                session_data: sessionData
            })

            await sendMessage(user.facebook_id, `✅ Đã thêm ảnh ${sessionData.images.length}/5`)
        }

        if (sessionData.images && sessionData.images.length >= 5) {
            await sendMessagesWithTyping(user.facebook_id, [
                '✅ Đã đủ 5 ảnh',
                'Bạn có thể tiếp tục hoặc xác nhận tin đăng.'
            ])

            await sendButtonTemplate(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createPostbackButton('✅ XÁC NHẬN', 'LISTING_CONFIRM'),
                    createPostbackButton('➕ THÊM ẢNH', 'LISTING_IMAGES'),
                    createPostbackButton('⏭️ BỎ QUA', 'LISTING_CONFIRM')
                ]
            )
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📸 HÌNH ẢNH SẢN PHẨM',
                `Đã có ${sessionData.images?.length || 0}/5 ảnh`,
                'Gửi thêm ảnh hoặc bỏ qua:'
            ])

            await sendButtonTemplate(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createPostbackButton('📷 Chụp ảnh', 'LISTING_IMAGE_CAMERA'),
                    createPostbackButton('📁 Chọn từ thư viện', 'LISTING_IMAGE_GALLERY'),
                    createPostbackButton('⏭️ Bỏ qua', 'LISTING_CONFIRM')
                ]
            )
        }

    } catch (error) {
        console.error('Error in listing images:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xử lý hình ảnh.')
    }
}

// Helper functions
async function getBotSession(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('bot_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error getting bot session:', error)
    }

    return data
}


// Handle search location
export async function handleSearchLocation(user: any, location: string) {
    await sendTypingIndicator(user.facebook_id)

    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'search') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tìm kiếm lại.')
        return
    }

    const data = session.data || {}
    data.location = location

    try {
        // Search listings by location
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .ilike('location', `%${location}%`)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error searching listings by location:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
            return
        }

        if (!listings || listings.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                `❌ Không tìm thấy kết quả nào cho vị trí "${location}"!`,
                'Hãy thử vị trí khác hoặc tìm kiếm theo danh mục.'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 Đang tìm kiếm...',
                `Tìm thấy ${listings.length} kết quả cho "${location}":`
            ])

            // Create carousel elements
            const elements = listings.slice(0, 10).map((listing: any, index: number) =>
                createGenericElement(
                    `${index + 1}️⃣ ${listing.title}`,
                    `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                    listing.images?.[0] || '',
                    [
                        createPostbackButton('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear session
        await updateBotSession(user.facebook_id, null)

    } catch (error) {
        console.error('Error in search location:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle search all locations
export async function handleSearchAllLocations(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get all listings
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Error fetching all listings:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải danh sách. Vui lòng thử lại sau!')
            return
        }

        if (!listings || listings.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 TẤT CẢ VỊ TRÍ',
                'Hiện tại chưa có tin đăng nào.',
                'Hãy quay lại sau!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 TẤT CẢ VỊ TRÍ',
                `Tìm thấy ${listings.length} tin đăng:`
            ])

            // Create carousel elements
            const elements = listings.slice(0, 20).map((listing: any, index: number) =>
                createGenericElement(
                    `${index + 1}️⃣ ${listing.title}`,
                    `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                    listing.images?.[0] || '',
                    [
                        createPostbackButton('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in search all locations:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle search by price
export async function handleSearchByPrice(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 TÌM KIẾM THEO GIÁ',
        'Chọn khoảng giá:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khoảng giá:',
        [
            createPostbackButton('💰 Dưới 100 triệu', 'SEARCH_PRICE_UNDER_100M'),
            createPostbackButton('💰 100-500 triệu', 'SEARCH_PRICE_100M_500M'),
            createPostbackButton('💰 500 triệu - 1 tỷ', 'SEARCH_PRICE_500M_1B'),
            createPostbackButton('💰 1-3 tỷ', 'SEARCH_PRICE_1B_3B'),
            createPostbackButton('💰 3-5 tỷ', 'SEARCH_PRICE_3B_5B'),
            createPostbackButton('💰 Trên 5 tỷ', 'SEARCH_PRICE_OVER_5B'),
            createPostbackButton('💰 TÙY CHỈNH', 'SEARCH_PRICE_CUSTOM')
        ]
    )
}

// Handle search by rating
export async function handleSearchByRating(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '⭐ TÌM KIẾM THEO ĐÁNH GIÁ',
        'Chọn mức đánh giá tối thiểu:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Mức đánh giá:',
        [
            createPostbackButton('⭐ Từ 1 sao', 'SEARCH_RATING_1'),
            createPostbackButton('⭐⭐ Từ 2 sao', 'SEARCH_RATING_2'),
            createPostbackButton('⭐⭐⭐ Từ 3 sao', 'SEARCH_RATING_3'),
            createPostbackButton('⭐⭐⭐⭐ Từ 4 sao', 'SEARCH_RATING_4'),
            createPostbackButton('⭐⭐⭐⭐⭐ Chỉ 5 sao', 'SEARCH_RATING_5')
        ]
    )
}

// Handle search by date
export async function handleSearchByDate(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📅 TÌM KIẾM THEO NGÀY',
        'Chọn khoảng thời gian:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khoảng thời gian:',
        [
            createPostbackButton('📅 Hôm nay', 'SEARCH_DATE_TODAY'),
            createPostbackButton('📅 3 ngày qua', 'SEARCH_DATE_3_DAYS'),
            createPostbackButton('📅 1 tuần qua', 'SEARCH_DATE_1_WEEK'),
            createPostbackButton('📅 1 tháng qua', 'SEARCH_DATE_1_MONTH'),
            createPostbackButton('📅 3 tháng qua', 'SEARCH_DATE_3_MONTHS'),
            createPostbackButton('📅 TÙY CHỈNH', 'SEARCH_DATE_CUSTOM')
        ]
    )
}

// Handle rate seller
export async function handleRateSeller(user: any, sellerId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get seller info
        const { data: seller, error } = await supabaseAdmin
            .from('users')
            .select('name, rating')
            .eq('facebook_id', sellerId)
            .single()

        if (error || !seller) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy thông tin người bán!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '⭐ ĐÁNH GIÁ NGƯỜI BÁN',
            `👤 Người bán: ${seller.name}`,
            `⭐ Đánh giá hiện tại: ${seller.rating || 0}/5`,
            'Chọn số sao đánh giá:'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Chọn đánh giá:',
            [
                createPostbackButton('⭐ 1 sao', `RATE_SELLER_1_${sellerId}`),
                createPostbackButton('⭐⭐ 2 sao', `RATE_SELLER_2_${sellerId}`),
                createPostbackButton('⭐⭐⭐ 3 sao', `RATE_SELLER_3_${sellerId}`),
                createPostbackButton('⭐⭐⭐⭐ 4 sao', `RATE_SELLER_4_${sellerId}`),
                createPostbackButton('⭐⭐⭐⭐⭐ 5 sao', `RATE_SELLER_5_${sellerId}`)
            ]
        )

    } catch (error) {
        console.error('Error in rate seller:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle rate submission
export async function handleRateSubmission(user: any, sellerId: string, rating: number) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Create rating record
        const { error: ratingError } = await supabaseAdmin
            .from('ratings')
            .insert({
                id: generateId(),
                rater_id: user.facebook_id,
                seller_id: sellerId,
                rating: rating,
                created_at: new Date().toISOString()
            })

        if (ratingError) {
            console.error('Error creating rating:', ratingError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi lưu đánh giá!')
            return
        }

        // Update seller's average rating
        const { data: ratings, error: ratingsError } = await supabaseAdmin
            .from('ratings')
            .select('rating')
            .eq('seller_id', sellerId)

        if (!ratingsError && ratings) {
            const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length

            await supabaseAdmin
                .from('users')
                .update({ rating: Math.round(averageRating * 10) / 10 })
                .eq('facebook_id', sellerId)
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '✅ CẢM ƠN BẠN ĐÃ ĐÁNH GIÁ!',
            `⭐ Đánh giá ${rating} sao đã được ghi nhận`,
            '🎯 Giúp cộng đồng Tân Dậu 1981 tin tưởng hơn'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU'),
                createPostbackButton('👥 XEM CỘNG ĐỒNG', 'COMMUNITY')
            ]
        )

    } catch (error) {
        console.error('Error in rate submission:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle search service (dịch vụ tìm kiếm hộ)
export async function handleSearchService(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 DỊCH VỤ TÌM KIẾM HỘ - 5,000đ/lần',
        'Tôi sẽ tìm kiếm chuyên nghiệp cho bạn:',
        '• Tìm kiếm thông minh',
        '• Phân tích thị trường',
        '• Gợi ý phù hợp nhất',
        '• Báo cáo chi tiết'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn loại tìm kiếm:',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'SEARCH_SERVICE_REAL_ESTATE'),
            createPostbackButton('🚗 Ô TÔ', 'SEARCH_SERVICE_CAR'),
            createPostbackButton('📱 ĐIỆN TỬ', 'SEARCH_SERVICE_ELECTRONICS'),
            createPostbackButton('👕 THỜI TRANG', 'SEARCH_SERVICE_FASHION'),
            createPostbackButton('🍽️ ẨM THỰC', 'SEARCH_SERVICE_FOOD'),
            createPostbackButton('🔧 DỊCH VỤ', 'SEARCH_SERVICE_SERVICE')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm tùy chọn:',
        [
            createPostbackButton('🔙 QUAY LẠI', 'SEARCH')
        ]
    )
}

// Handle search service payment
export async function handleSearchServicePayment(user: any, category: string) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 THANH TOÁN DỊCH VỤ TÌM KIẾM HỘ',
        `📋 Thông tin dịch vụ:`,
        `• Loại: ${category}`,
        `• Phí: 5,000đ/lần`,
        `• Thời gian: 24h`,
        '',
        '🏦 THÔNG TIN CHUYỂN KHOẢN:',
        '• STK: 0123456789',
        '• Ngân hàng: Vietcombank',
        '• Chủ TK: BOT TÂN DẬU',
        '• Nội dung: TIMKIEM [SĐT_CỦA_BẠN]'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Sau khi chuyển khoản:',
        [
            createPostbackButton('📸 UPLOAD BIÊN LAI', 'SEARCH_SERVICE_UPLOAD_RECEIPT'),
            createPostbackButton('❌ HỦY', 'SEARCH_SERVICE')
        ]
    )
}

// Handle search service upload receipt
export async function handleSearchServiceUploadReceipt(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📸 UPLOAD BIÊN LAI THANH TOÁN',
        'Vui lòng gửi hình ảnh biên lai chuyển khoản',
        'Tôi sẽ xác nhận và bắt đầu tìm kiếm cho bạn!'
    ])

    // Set session for receipt upload
    await updateBotSession(user.facebook_id, {
        current_flow: 'search_service_receipt',
        step: 'upload_receipt',
        data: {}
    })
}

// Handle search service receipt processing
export async function handleSearchServiceReceiptProcess(user: any, imageUrl: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Process receipt and start search service
        await sendMessagesWithTyping(user.facebook_id, [
            '✅ BIÊN LAI ĐÃ NHẬN!',
            '🔍 Đang bắt đầu dịch vụ tìm kiếm hộ...',
            '⏰ Thời gian xử lý: 24 giờ',
            '📱 Tôi sẽ gửi kết quả qua Messenger'
        ])

        // Create search service record
        const { error } = await supabaseAdmin
            .from('search_services')
            .insert({
                id: generateId(),
                user_id: user.facebook_id,
                category: 'general',
                status: 'processing',
                fee: 5000,
                receipt_url: imageUrl,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error creating search service:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM KIẾM THƯỜNG', 'SEARCH'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear session
        await updateBotSession(user.facebook_id, null)

    } catch (error) {
        console.error('Error in search service receipt process:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}
