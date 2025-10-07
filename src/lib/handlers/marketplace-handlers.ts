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
     * Handle quick product search
     */
    static async handleQuickSearch(user: any, keyword: string): Promise<void> {
        try {
            logger.info('Quick search initiated', {
                facebook_id: user.facebook_id,
                keyword: keyword
            })

            // Simple search in listings
            const { data: listings, error } = await supabaseAdmin
                .from('listings')
                .select('*')
                .ilike('title', `%${keyword}%`)
                .eq('status', 'active')
                .limit(5)

            if (error) {
                logger.error('Quick search error', { error })
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tìm kiếm!')
                return
            }

            if (!listings || listings.length === 0) {
                await sendMessage(user.facebook_id,
                    `❌ Không tìm thấy sản phẩm nào với từ khóa: "${keyword}"\n💡 Hãy thử từ khóa khác hoặc sử dụng chức năng tìm kiếm chi tiết.`
                )
                return
            }

            // Send search results
            await sendMessage(user.facebook_id,
                `🔍 TÌM THẤY ${listings.length} KẾT QUẢ\n━━━━━━━━━━━━━━━━━━━━`
            )

            // Create generic template for results
            const elements = listings.map(listing =>
                createGenericElement(
                    listing.title,
                    `${formatCurrency(listing.price)} • ${listing.location}`,
                    undefined,
                    [
                        {
                            type: 'postback',
                            title: '👁️ Xem chi tiết',
                            payload: `VIEW_LISTING_${listing.id}`
                        },
                        {
                            type: 'postback',
                            title: '💬 Liên hệ',
                            payload: `CONTACT_SELLER_${listing.user_id}`
                        }
                    ]
                )
            )

            await sendGenericTemplate(user.facebook_id, elements)

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
}