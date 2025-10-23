/**
 * Marketplace Handlers - Handle marketplace-specific messages and edge cases
 * Provides fallback handling for marketplace features outside of main flows
 */

import {
    sendMessage,
    sendQuickReply,
    createQuickReply,
    sendGenericTemplate,
    createGenericElement
} from '../facebook-api'
import { formatCurrency } from '../utils'
import { supabaseAdmin } from '../supabase'
import { logger } from '../logger'

export class MarketplaceHandlers {
    /**
     * Handle marketplace-related keywords
     */
    static async handleMarketplaceKeywords(user: any, text: string): Promise<boolean> {
        const lowerText = text.toLowerCase().trim()

        // Product search keywords
        if (this.isProductSearchKeyword(lowerText)) {
            await this.handleQuickSearch(user, text)
            return true
        }

        // Price inquiry keywords
        if (this.isPriceInquiryKeyword(lowerText)) {
            await this.sendPriceInfo(user.facebook_id)
            return true
        }

        // Category inquiry keywords
        if (this.isCategoryInquiryKeyword(lowerText)) {
            await this.sendCategoryInfo(user.facebook_id)
            return true
        }

        return false
    }

    /**
     * Handle quick product search - Location-based for user's registered area
     */
    static async handleQuickSearch(user: any, keyword: string): Promise<void> {
        try {
            logger.info('Quick search initiated', {
                facebook_id: user.facebook_id,
                keyword: keyword,
                user_location: user.location
            })

            // Log search activity
            await this.logSearchActivity(user, keyword, undefined, user.location)

            // Get user's registered location
            const userLocation = user.location

            if (!userLocation) {
                await sendMessage(user.facebook_id,
                    `❌ Vui lòng cập nhật địa điểm của bạn để sử dụng tìm kiếm nhanh!\n💡 Hãy đăng ký hoặc cập nhật thông tin cá nhân.`
                )
                return
            }

            // Search in listings with location filter
            let query = supabaseAdmin
                .from('listings')
                .select('*')
                .ilike('title', `%${keyword}%`)
                .eq('status', 'active')
                .limit(10) // Increased limit for better results

            // Filter by user's location (province/city level)
            query = query.ilike('location', `%${userLocation}%`)

            const { data: listings, error } = await query

            if (error) {
                logger.error('Quick search error', { error })
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm!')
                return
            }

            if (!listings || listings.length === 0) {
                await sendMessage(user.facebook_id,
                    `❌ Không tìm thấy dịch vụ nào với từ khóa: "${keyword}" tại ${userLocation}\n━━━━━━━━━━━━━━━━━━━━\n💡 Hãy thử từ khóa khác hoặc sử dụng chức năng tìm kiếm chi tiết để mở rộng vùng tìm kiếm.`
                )
                return
            }

            // Filter out listings with invalid data
            const validListings = listings.filter(listing =>
                listing.title &&
                listing.price != null &&
                listing.location &&
                typeof listing.price === 'number' &&
                !isNaN(listing.price)
            )

            if (validListings.length === 0) {
                await sendMessage(user.facebook_id,
                    `❌ Không tìm thấy dịch vụ hợp lệ nào với từ khóa: "${keyword}" tại ${userLocation}\n━━━━━━━━━━━━━━━━━━━━\n💡 Hãy thử từ khóa khác hoặc sử dụng chức năng tìm kiếm chi tiết.`
                )
                return
            }

            // Send search results with location context
            await sendMessage(user.facebook_id,
                `🔍 TÌM THẤY ${validListings.length} DỊCH VỤ TẠI ${userLocation.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━\n💡 Kết quả tìm kiếm được lọc theo khu vực của bạn\n━━━━━━━━━━━━━━━━━━━━`
            )

            // Create generic template for results
            const elements = validListings.map(listing =>
                createGenericElement(
                    listing.title,
                    `${formatCurrency(listing.price)} • ${listing.location}${listing.category ? ` • ${listing.category}` : ''}`,
                    undefined,
                    [
                        {
                            type: 'postback',
                            title: '👁️ Xem chi tiết',
                            payload: `VIEW_LISTING_${listing.id}`
                        },
                        {
                            type: 'postback',
                            title: '💬 Liên hệ ngay',
                            payload: `CONTACT_SELLER_${listing.user_id}`
                        }
                    ]
                )
            )

            await sendGenericTemplate(user.facebook_id, elements)

            // Add suggestion to search in other areas if few results
            if (validListings.length < 3) {
                await sendQuickReply(user.facebook_id,
                    '💡 Muốn tìm ở khu vực khác?',
                    [
                        createQuickReply('🔍 Tìm kiếm chi tiết', 'SEARCH'),
                        createQuickReply('📍 Thay đổi địa điểm', 'UPDATE_LOCATION')
                    ]
                )
            }

        } catch (error) {
            logger.error('Quick search error', { error })
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm!')
        }
    }

    /**
     * Send price information
     */
    private static async sendPriceInfo(facebookId: string): Promise<void> {
        await sendMessage(facebookId,
            `💰 THÔNG TIN GIÁ CẢ\n━━━━━━━━━━━━━━━━━━━━\n📊 Giá trung bình các sản phẩm:\n• Điện thoại: 1,000,000 - 5,000,000 VNĐ\n• Laptop: 5,000,000 - 20,000,000 VNĐ\n• Thời trang: 100,000 - 1,000,000 VNĐ\n• Đồ gia dụng: 200,000 - 2,000,000 VNĐ\n━━━━━━━━━━━━━━━━━━━━\n💡 Giá có thể thay đổi tùy sản phẩm và tình trạng`
        )
    }

    /**
     * Send category information
     */
    private static async sendCategoryInfo(facebookId: string): Promise<void> {
        await sendMessage(facebookId,
            `📂 DANH MỤC SẢN PHẨM\n━━━━━━━━━━━━━━━━━━━━\n🛒 Các danh mục phổ biến:\n• Điện thoại & Phụ kiện\n• Máy tính & Laptop\n• Thời trang nam/nữ\n• Đồ gia dụng\n• Xe cộ & Phụ tùng\n• Nhà cửa & Đời sống\n• Sách & Văn phòng phẩm\n• Đồ chơi & Mẹ bé\n━━━━━━━━━━━━━━━━━━━━\n💡 Chọn danh mục phù hợp khi đăng tin để dễ tìm kiếm`
        )
    }

    /**
     * Check if text contains product search keywords
     */
    private static isProductSearchKeyword(text: string): boolean {
        const searchKeywords = [
            'mua', 'tìm mua', 'cần mua', 'muốn mua',
            'bán', 'rao bán', 'cần bán', 'muốn bán',
            'giá', 'bao nhiêu', 'price', 'cost'
        ]
        return searchKeywords.some(keyword => text.includes(keyword))
    }

    /**
     * Check if text contains price inquiry keywords
     */
    private static isPriceInquiryKeyword(text: string): boolean {
        const priceKeywords = [
            'giá cả', 'giá bao nhiêu', 'giá thế nào',
            'đắt không', 'rẻ không', 'có đắt không'
        ]
        return priceKeywords.some(keyword => text.includes(keyword))
    }

    /**
     * Check if text contains category inquiry keywords
     */
    private static isCategoryInquiryKeyword(text: string): boolean {
        const categoryKeywords = [
            'danh mục', 'loại gì', 'có những gì',
            'sản phẩm gì', 'bán cái gì'
        ]
        return categoryKeywords.some(keyword => text.includes(keyword))
    }

    /**
     * Log search activity for history tracking
     */
    private static async logSearchActivity(user: any, keyword?: string, category?: string, location?: string): Promise<void> {
        try {
            // Log to user_activity_logs
            await supabaseAdmin
                .from('user_activity_logs')
                .insert({
                    facebook_id: user.facebook_id,
                    user_type: 'user',
                    action: 'quick_search',
                    details: {
                        keyword: keyword || null,
                        category: category || null,
                        location: location || user.location || null,
                        timestamp: new Date().toISOString()
                    },
                    success: true,
                    response_time_ms: Date.now() - (user.last_activity || Date.now()),
                    created_at: new Date().toISOString()
                })

            // Update user activities summary
            const today = new Date().toISOString().split('T')[0]
            await supabaseAdmin
                .from('user_activities')
                .upsert({
                    facebook_id: user.facebook_id,
                    date: today,
                    searches_count: 1,
                    last_activity: new Date().toISOString()
                }, {
                    onConflict: 'facebook_id,date'
                })

            logger.debug('Quick search activity logged:', {
                facebook_id: user.facebook_id,
                keyword,
                category,
                location
            })

        } catch (error) {
            logger.error('Error logging quick search activity:', { facebook_id: user.facebook_id, error })
        }
    }
}
