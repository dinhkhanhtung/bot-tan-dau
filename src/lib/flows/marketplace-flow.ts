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
    sendMessagesWithTyping,
    hideButtons
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId, updateBotSession, getBotSession } from '../utils'
import { CATEGORIES, LOCATIONS, DISTRICTS, PRICE_RANGES, SEARCH_HELPERS, HASHTAG_MAPPING, POPULAR_HASHTAGS } from '../constants'
// AI Manager removed - using simple search logic

export class MarketplaceFlow {
    /**
     * Handle listing flow
     */
    async handleListing(user: any): Promise<void> {
        // Kiểm tra permission trước khi cho phép niêm yết
        const { SmartContextManager, UserType } = await import('../core/smart-context-manager')
        const context = await SmartContextManager.analyzeUserContext(user)
        const permissions = SmartContextManager.getUserPermissions(context.userType)

        if (!permissions.canCreateListings) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🚫 CHƯA THỂ NIÊM YẾT',
                'Tài khoản của bạn chưa được kích hoạt đầy đủ.',
                'Vui lòng liên hệ admin để được hỗ trợ.'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
            return
        }

        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Chọn danh mục:',
            [
                createQuickReply('🏠 BẤT ĐỘNG SẢN', 'LISTING_CATEGORY_REAL_ESTATE'),
                createQuickReply('🚗 Ô TÔ', 'LISTING_CATEGORY_CAR'),
                createQuickReply('📱 ĐIỆN TỬ', 'LISTING_CATEGORY_ELECTRONICS'),
                createQuickReply('👕 THỜI TRANG', 'LISTING_CATEGORY_FASHION'),
                createQuickReply('🍽️ ẨM THỰC', 'LISTING_CATEGORY_FOOD'),
                createQuickReply('🔧 DỊCH VỤ', 'LISTING_CATEGORY_SERVICE')
            ]
        )
    }

    /**
     * Handle listing step
     */
    async handleStep(user: any, text: string, session: any): Promise<void> {
        switch (session.step) {
            case 'title':
                await this.handleListingTitleInput(user, text, session.data)
                break
            case 'price':
                await this.handleListingPriceInput(user, text, session.data)
                break
            case 'description':
                await this.handleListingDescriptionInput(user, text, session.data)
                break
            case 'location':
                await this.handleListingLocation(user, text)
                break
            case 'images':
                await this.handleListingImages(user, text)
                break
        }
    }

    /**
     * Handle search flow
     */
    async handleSearch(user: any): Promise<void> {
        // Kiểm tra permission trước khi cho phép tìm kiếm
        const { SmartContextManager, UserType } = await import('../core/smart-context-manager')
        const context = await SmartContextManager.analyzeUserContext(user)
        const permissions = SmartContextManager.getUserPermissions(context.userType)

        if (!permissions.canSearch) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🚫 CHƯA THỂ TÌM KIẾM',
                'Tài khoản của bạn chưa được kích hoạt đầy đủ.',
                'Vui lòng liên hệ admin để được hỗ trợ.'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
            return
        }

        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Chọn danh mục:',
            [
                createQuickReply('🏠 BẤT ĐỘNG SẢN', 'SEARCH_CATEGORY_REAL_ESTATE'),
                createQuickReply('🚗 Ô TÔ', 'SEARCH_CATEGORY_CAR'),
                createQuickReply('📱 ĐIỆN TỬ', 'SEARCH_CATEGORY_ELECTRONICS'),
                createQuickReply('👕 THỜI TRANG', 'SEARCH_CATEGORY_FASHION'),
                createQuickReply('🍽️ ẨM THỰC', 'SEARCH_CATEGORY_FOOD'),
                createQuickReply('🔧 DỊCH VỤ', 'SEARCH_CATEGORY_SERVICE'),
                createQuickReply('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                createQuickReply('🔍 TÌM THEO TỪ KHÓA', 'SEARCH_KEYWORD')
            ]
        )
    }

    /**
     * Handle search step
     */
    async handleSearchStep(user: any, text: string, session: any): Promise<void> {
        const step = session.step
        const data = session.data || {}

        if (data.type === 'keyword') {
            await this.handleSearchKeywordInput(user, text, data)
        } else {
            // Handle location selection
            await this.handleSearchLocationInput(user, text, data)
        }
    }

    // Helper methods for listing
    private async handleListingTitleInput(user: any, text: string, data: any): Promise<void> {
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

    private async handleListingPriceInput(user: any, text: string, data: any): Promise<void> {
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

    private async handleListingDescriptionInput(user: any, text: string, data: any): Promise<void> {
        if (text.length < 20) {
            await sendMessage(user.facebook_id, '❌ Mô tả quá ngắn. Vui lòng mô tả chi tiết hơn:')
            return
        }

        data.description = text.trim()

        await sendMessagesWithTyping(user.facebook_id, [
            `✅ Mô tả: ${data.description}`,
            'Bước 4/5: Vị trí cụ thể\n📍 Vui lòng chọn vị trí cụ thể:'
        ])

        // Show location buttons - all major cities
        const majorCities = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'HẢI PHÒNG', 'CẦN THƠ']

        await sendQuickReply(
            user.facebook_id,
            'Chọn thành phố:',
            majorCities.map(city =>
                createQuickReply(`🏙️ ${city}`, `LISTING_CITY_${city}`)
            )
        )

        await updateBotSession(user.facebook_id, {
            step: 'location',
            data: data
        })
    }

    private async handleListingLocation(user: any, text: string): Promise<void> {
        // Implementation for location handling
        await sendMessage(user.facebook_id, 'Location handling not implemented yet')
    }

    private async handleListingImages(user: any, text: string): Promise<void> {
        // Implementation for image handling
        await sendMessage(user.facebook_id, 'Image handling not implemented yet')
    }

    // Enhanced search with AI Smart Search and fallback
    private async handleSearchKeywordInput(user: any, text: string, data: any): Promise<void> {
        if (text.length < 2) {
            await sendMessage(user.facebook_id, 'Từ khóa quá ngắn! Vui lòng nhập ít nhất 2 ký tự.')
            return
        }

        data.keyword = text.trim()
        const query = data.keyword

        try {
            await sendMessage(user.facebook_id, '🔍 Đang tìm kiếm với AI thông minh...')

            let listings: any[] = []
            let searchMessage = ''
            let aiUsed = false

            // Step 1: Simple search logic (AI removed)
            console.log('[MarketplaceFlow] Using simple search for:', query)

            // Direct traditional search
            if (true) {
                console.log('[MarketplaceFlow] Using traditional search for:', query)

                // Check if query contains hashtags
                const { hashtags, remainingQuery } = SEARCH_HELPERS.parseHashtags(query)

                if (hashtags.length > 0) {
                    // Hashtag search
                    const { data: allListings, error: listingsError } = await supabaseAdmin
                        .from('listings')
                        .select('*')
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(100)

                    if (!listingsError && allListings) {
                        listings = SEARCH_HELPERS.searchWithHashtags(allListings, query)
                        const hashtagText = hashtags.join(' ')
                        searchMessage = `Tìm thấy ${listings.length} kết quả cho ${hashtagText}${remainingQuery ? ` + "${remainingQuery}"` : ''}`
                    }
                } else {
                    // Regular search với parsing thông minh
                    const searchParams = this.parseSearchQuery(query)

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

                        if (!categoryError && categoryListings) {
                            listings = categoryListings
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

                        if (!categoryError && categoryListings) {
                            listings = categoryListings
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

                        if (!locationError && locationListings) {
                            listings = locationListings
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

                        if (!keywordError && keywordListings) {
                            listings = keywordListings
                            searchMessage = `Tìm thấy ${listings.length} kết quả cho "${query}"`
                        }
                    }
                }
            }

            // Step 3: Handle results (có kết quả hoặc không)
            if (!listings || listings.length === 0) {
                await this.handleNoSearchResults(user, query)
            } else {
                await this.displaySearchResults(user, listings, searchMessage, aiUsed)
            }

        } catch (error) {
            console.error('[MarketplaceFlow] Search error:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')

            // Log error for monitoring (AI removed)
            console.error('[MarketplaceFlow] Search error logged:', { error: (error as Error).message, query: text })
        }
    }

    // Convert AI suggestions thành listings thật
    private async convertAISuggestionsToListings(suggestions: string[], originalQuery: string): Promise<any[]> {
        try {
            // Lấy listings liên quan dựa trên suggestions
            const { data: relatedListings, error } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .or(`title.ilike.%${originalQuery}%,description.ilike.%${originalQuery}%`)
                .order('created_at', { ascending: false })
                .limit(10)

            return relatedListings || []
        } catch (error) {
            console.error('[MarketplaceFlow] Error converting AI suggestions:', error)
            return []
        }
    }

    // Handle khi không có kết quả tìm kiếm
    private async handleNoSearchResults(user: any, query: string): Promise<void> {
        try {
            const suggestions = SEARCH_HELPERS.generateSearchSuggestions(query)

            await sendMessagesWithTyping(user.facebook_id, [
                `❌ Không tìm thấy kết quả nào cho "${query}"!`,
                '💡 Gợi ý tìm kiếm:',
                suggestions.slice(0, 5).map(s => `• ${s}`).join('\n')
            ])

            await sendQuickReply(
                user.facebook_id,
                'Thử tìm kiếm khác:',
                suggestions.slice(0, 6).map(suggestion =>
                    createQuickReply(`🔍 ${suggestion}`, `SEARCH_KEYWORD_${suggestion}`)
                )
            )
        } catch (error) {
            console.error('[MarketplaceFlow] Error handling no results:', error)
            await sendMessage(user.facebook_id, '❌ Không tìm thấy kết quả. Vui lòng thử từ khóa khác!')
        }
    }

    // Display search results
    private async displaySearchResults(user: any, listings: any[], searchMessage: string, aiUsed: boolean): Promise<void> {
        try {
            const aiIndicator = aiUsed ? '🤖' : '🔍'

            await sendMessagesWithTyping(user.facebook_id, [
                `${aiIndicator} ${searchMessage}`
            ])

            // Create carousel elements
            const elements = listings.slice(0, 10).map((listing: any, index: number) =>
                createGenericElement(
                    `${index + 1}️⃣ ${listing.title}`,
                    `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                    listing.images?.[0] || '',
                    [
                        createQuickReply('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                        createQuickReply('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                    createQuickReply('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        } catch (error) {
            console.error('[MarketplaceFlow] Error displaying results:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi khi hiển thị kết quả!')
        }
    }

    private async handleSearchLocationInput(user: any, text: string, data: any): Promise<void> {
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
                            createQuickReply('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`),
                            createQuickReply('💬 KẾT NỐI', `CONTACT_SELLER_${listing.user_id}`)
                        ]
                    )
                )

                await sendCarouselTemplate(user.facebook_id, elements)
            }

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                    createQuickReply('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )

            // Clear session
            await updateBotSession(user.facebook_id, null)

        } catch (error) {
            console.error('Error in search location input:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    // Parse search query to extract category, location, and keywords
    private parseSearchQuery(query: string): any {
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

    // Additional marketplace methods (skeleton for now)
    async handleListingCategory(user: any, category: string): Promise<void> {
        // Implementation needed
    }

    async handleViewListing(user: any, listingId: string): Promise<void> {
        // Implementation needed
    }

    async handleContactSeller(user: any, sellerId: string): Promise<void> {
        // Implementation needed
    }

    async handleMyListings(user: any): Promise<void> {
        // Implementation needed
    }

    // Additional functions for webhook compatibility
    static async handleListingImages(user: any, imageUrl?: string): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            if (imageUrl) {
                await sendMessage(user.facebook_id, `✅ Đã nhận hình ảnh: ${imageUrl}`)
                await sendMessage(user.facebook_id, '📸 Bạn có thể gửi thêm hình ảnh khác hoặc tiếp tục.')
            } else {
                await sendMessage(user.facebook_id, '📷 Vui lòng gửi hình ảnh sản phẩm để tiếp tục.')
            }

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('📷 GỬI THÊM ẢNH', 'LISTING_IMAGES'),
                    createQuickReply('✅ TIẾP TỤC', 'LISTING_CONFIRM'),
                    createQuickReply('❌ HỦY', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in handleListingImages:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xử lý hình ảnh.')
        }
    }
}
