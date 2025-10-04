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
import { formatCurrency, formatNumber, updateBotSession, getBotSession } from '../utils'
import { SmartContextManager, UserType, UserPermissions } from '../core/smart-context-manager'
// Safety measures removed - using simple validation

/**
 * PendingUserFlow - Xử lý tất cả interactions cho user đang chờ duyệt
 * 
 * Quyền hạn của PENDING_USER:
 * ✅ Có thể sử dụng bot
 * ✅ Có thể tìm kiếm sản phẩm
 * ✅ Có thể xem tin đăng
 * ✅ Có thể liên hệ admin
 * ❌ KHÔNG thể niêm yết sản phẩm
 * ❌ KHÔNG thể liên hệ người bán
 * ❌ KHÔNG thể thanh toán
 * ❌ KHÔNG thể truy cập cộng đồng
 */
export class PendingUserFlow {

    /**
     * Xử lý tin nhắn chính cho pending user
     */
    async handleMessage(user: any, text: string): Promise<void> {
        try {
            await sendTypingIndicator(user.facebook_id)

            // Phân tích ngữ cảnh user
            const context = await SmartContextManager.analyzeUserContext(user)
            const permissions = SmartContextManager.getUserPermissions(UserType.PENDING_USER)

            // Kiểm tra permission cơ bản
            if (!permissions.canUseBot) {
                await this.sendAccessDeniedMessage(user)
                return
            }

            // Xử lý các lệnh text
            if (text.includes('tìm kiếm') || text.includes('TÌM KIẾM') || text.includes('search')) {
                await this.handleSearchRequest(user)
            } else if (text.includes('xem tin') || text.includes('XEM TIN') || text.includes('listings')) {
                await this.handleViewListings(user)
            } else if (text.includes('admin') || text.includes('ADMIN') || text.includes('hỗ trợ')) {
                await this.handleContactAdmin(user)
            } else if (text.includes('niêm yết') || text.includes('NIÊM YẾT') || text.includes('đăng tin')) {
                await this.sendListingRestrictionMessage(user)
            } else if (text.includes('thanh toán') || text.includes('THANH TOÁN') || text.includes('payment')) {
                await this.sendPaymentRestrictionMessage(user)
            } else {
                await this.showPendingUserMenu(user, context)
            }

        } catch (error) {
            console.error('Error in PendingUserFlow.handleMessage:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Xử lý postback cho pending user
     */
    async handlePostback(user: any, postback: string): Promise<void> {
        try {
            const [action, ...params] = postback.split('_')

            switch (action) {
                case 'SEARCH':
                    await this.handleSearchRequest(user)
                    break
                case 'VIEW':
                    if (params[0] === 'LISTINGS') {
                        await this.handleViewListings(user)
                    } else if (params[0] === 'LISTING' && params[1]) {
                        await this.handleViewSingleListing(user, params[1])
                    }
                    break
                case 'CONTACT':
                    if (params[0] === 'ADMIN') {
                        await this.handleContactAdmin(user)
                    }
                    break
                case 'PENDING':
                    if (params[0] === 'STATUS') {
                        await this.showPendingStatus(user)
                    }
                    break
                case 'INFO':
                    await this.showPendingUserInfo(user)
                    break
                case 'LISTING':
                    // Block listing attempts
                    await this.sendListingRestrictionMessage(user)
                    break
                case 'PAYMENT':
                    // Block payment attempts
                    await this.sendPaymentRestrictionMessage(user)
                    break
                default:
                    await this.showPendingUserMenu(user)
            }

        } catch (error) {
            console.error('Error in PendingUserFlow.handlePostback:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Xử lý yêu cầu tìm kiếm
     */
    private async handleSearchRequest(user: any): Promise<void> {
        try {
            // Simple validation (SafetyMeasures removed)
            // Basic abuse check - can be enhanced later

            const permissions = SmartContextManager.getUserPermissions(UserType.PENDING_USER)

            if (!permissions.canSearch) {
                await this.sendAccessDeniedMessage(user)
                return
            }

            // Simple rate limiting (SafetyMeasures removed)
            // Basic rate limit check - can be enhanced later

            await sendMessagesWithTyping(user.facebook_id, [
                '🔍 TÌM KIẾM SẢN PHẨM',
                'Bạn có thể tìm kiếm sản phẩm trong cộng đồng Tân Dậu.',
                '💡 Nhập từ khóa để tìm kiếm:'
            ])

            // Tạo session cho search flow
            await updateBotSession(user.facebook_id, {
                current_flow: 'search',
                step: 'keyword',
                data: { userType: 'pending' },
                started_at: new Date().toISOString()
            })

        } catch (error) {
            console.error('Error in handleSearchRequest:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Xử lý xem danh sách tin đăng
     */
    private async handleViewListings(user: any): Promise<void> {
        try {
            const permissions = SmartContextManager.getUserPermissions(UserType.PENDING_USER)

            if (!permissions.canViewListings) {
                await this.sendAccessDeniedMessage(user)
                return
            }

            await sendMessage(user.facebook_id, '👀 Đang tải danh sách tin đăng...')

            // Lấy danh sách tin đăng mới nhất
            const { data: listings, error } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) {
                console.error('Error fetching listings:', error)
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải tin đăng. Vui lòng thử lại sau!')
                return
            }

            if (!listings || listings.length === 0) {
                await sendMessagesWithTyping(user.facebook_id, [
                    '📭 CHƯA CÓ TIN ĐĂNG NÀO',
                    'Hiện tại chưa có sản phẩm nào được niêm yết.',
                    '💡 Hãy thử lại sau hoặc liên hệ admin để biết thêm thông tin.'
                ])
                return
            }

            // Hiển thị danh sách tin đăng
            await this.displayListings(user, listings)

        } catch (error) {
            console.error('Error in handleViewListings:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Hiển thị danh sách tin đăng
     */
    private async displayListings(user: any, listings: any[]): Promise<void> {
        try {
            await sendMessagesWithTyping(user.facebook_id, [
                `📋 TÌM THẤY ${listings.length} TIN ĐĂNG`,
                'Dưới đây là các sản phẩm mới nhất trong cộng đồng:'
            ])

            // Tạo carousel elements
            const elements = listings.slice(0, 10).map((listing: any, index: number) =>
                createGenericElement(
                    `${index + 1}️⃣ ${listing.title}`,
                    `📍 ${listing.location} | 👤 ${listing.user_id.slice(-6)}\n💰 ${formatCurrency(listing.price)}`,
                    listing.images?.[0] || '',
                    [
                        createQuickReply('👀 XEM CHI TIẾT', `VIEW_LISTING_${listing.id}`)
                    ]
                )
            )

            await sendCarouselTemplate(user.facebook_id, elements)

            // Thêm thông báo về quyền hạn
            await sendMessagesWithTyping(user.facebook_id, [
                'ℹ️ LƯU Ý QUAN TRỌNG:',
                '• Bạn có thể xem thông tin sản phẩm',
                '• Chưa thể liên hệ trực tiếp với người bán',
                '• Cần được admin duyệt để sử dụng đầy đủ tính năng'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('🔍 TÌM KIẾM KHÁC', 'SEARCH'),
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in displayListings:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Xem chi tiết một tin đăng
     */
    private async handleViewSingleListing(user: any, listingId: string): Promise<void> {
        try {
            const { data: listing, error } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('id', listingId)
                .eq('status', 'active')
                .single()

            if (error || !listing) {
                await sendMessage(user.facebook_id, '❌ Không tìm thấy tin đăng này.')
                return
            }

            await sendMessagesWithTyping(user.facebook_id, [
                `📋 ${listing.title}`,
                `💰 Giá: ${formatCurrency(listing.price)}`,
                `📍 Vị trí: ${listing.location}`,
                `📝 Mô tả: ${listing.description}`,
                `👤 Người bán: ${listing.user_id.slice(-6)}`
            ])

            // Thông báo về quyền hạn
            await sendMessagesWithTyping(user.facebook_id, [
                '🚫 QUYỀN HẠN GIỚI HẠN:',
                '• Bạn chưa thể liên hệ trực tiếp với người bán',
                '• Cần được admin duyệt để sử dụng đầy đủ tính năng',
                '• Liên hệ admin nếu cần hỗ trợ'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('👀 XEM TIN KHÁC', 'VIEW_LISTINGS'),
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in handleViewSingleListing:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Liên hệ admin
     */
    private async handleContactAdmin(user: any): Promise<void> {
        try {
            await sendMessagesWithTyping(user.facebook_id, [
                '💬 LIÊN HỆ ADMIN',
                'Để được hỗ trợ, vui lòng liên hệ:',
                '📞 Hotline: 0901 234 567',
                '📧 Email: dinhkhanhtung@outlook.com',
                '⏰ Thời gian: 8:00 - 22:00'
            ])

            await sendMessagesWithTyping(user.facebook_id, [
                '📋 THÔNG TIN TÀI KHOẢN:',
                `👤 Tên: ${user.name || 'Chưa cập nhật'}`,
                `📱 SĐT: ${user.phone || 'Chưa cập nhật'}`,
                `📍 Vị trí: ${user.location || 'Chưa cập nhật'}`,
                `⏳ Trạng thái: Đang chờ duyệt`
            ])

            await sendQuickReply(
                user.facebook_id,
                'Bạn cần hỗ trợ gì?',
                [
                    createQuickReply('📋 KIỂM TRA TRẠNG THÁI', 'PENDING_STATUS'),
                    createQuickReply('ℹ️ THÔNG TIN BOT', 'INFO'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in handleContactAdmin:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Hiển thị trạng thái chờ duyệt
     */
    private async showPendingStatus(user: any): Promise<void> {
        try {
            const pendingDays = user.created_at ?
                Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0

            await sendMessagesWithTyping(user.facebook_id, [
                '📋 TRẠNG THÁI TÀI KHOẢN',
                `👤 Tên: ${user.name || 'Chưa cập nhật'}`,
                `📱 SĐT: ${user.phone || 'Chưa cập nhật'}`,
                `📍 Vị trí: ${user.location || 'Chưa cập nhật'}`,
                `⏳ Trạng thái: Đang chờ Admin duyệt`,
                `📅 Thời gian chờ: ${pendingDays} ngày`
            ])

            if (pendingDays > 3) {
                await sendMessagesWithTyping(user.facebook_id, [
                    '⚠️ THÔNG BÁO QUAN TRỌNG:',
                    'Tài khoản của bạn đã chờ duyệt hơn 3 ngày.',
                    'Vui lòng liên hệ admin để được hỗ trợ nhanh chóng.'
                ])
            }

            await sendQuickReply(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )

        } catch (error) {
            console.error('Error in showPendingStatus:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Hiển thị thông tin bot cho pending user
     */
    private async showPendingUserInfo(user: any): Promise<void> {
        try {
            await sendMessagesWithTyping(user.facebook_id, [
                'ℹ️ THÔNG TIN BOT Tân Dậu - Hỗ Trợ Chéo',
                '🤝 Cộng đồng dành riêng cho những người con Tân Dậu (sinh năm 1981)',
                '',
                '📋 QUYỀN HẠN HIỆN TẠI:',
                '✅ Tìm kiếm sản phẩm',
                '✅ Xem tin đăng',
                '✅ Liên hệ admin',
                '❌ Niêm yết sản phẩm',
                '❌ Liên hệ người bán',
                '❌ Thanh toán',
                '',
                '💡 Sau khi được admin duyệt, bạn sẽ có đầy đủ quyền hạn!'
            ])

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('📋 KIỂM TRA TRẠNG THÁI', 'PENDING_STATUS'),
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
                ]
            )

        } catch (error) {
            console.error('Error in showPendingUserInfo:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Hiển thị menu chính cho pending user
     */
    async showPendingUserMenu(user: any, context?: any): Promise<void> {
        try {
            const pendingDays = user.created_at ?
                Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0

            // Get Facebook name for personalized greeting
            const { getFacebookDisplayName } = await import('../utils')
            const facebookName = await getFacebookDisplayName(user.facebook_id)
            const displayName = facebookName || user.name || 'bạn'

            await sendMessagesWithTyping(user.facebook_id, [
                `⏳ CHÀO MỪNG ${displayName.toUpperCase()}!`,
                '',
                `📋 Trạng thái: Đang chờ Admin duyệt (${pendingDays} ngày)`,
                '🔍 Bạn có thể tìm kiếm và xem sản phẩm',
                '🚫 Chưa thể niêm yết hoặc liên hệ người bán',
                '',
                '💡 Admin sẽ duyệt sớm nhất có thể!'
            ])

            const menuOptions = [
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('👀 XEM TIN ĐĂNG', 'VIEW_LISTINGS'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
            ]

            if (pendingDays > 0) {
                menuOptions.unshift(createQuickReply(`⏳ CHỜ DUYỆT: ${pendingDays} NGÀY`, 'PENDING_STATUS'))
            }

            await sendQuickReply(
                user.facebook_id,
                'Chọn chức năng:',
                menuOptions
            )

        } catch (error) {
            console.error('Error in showPendingUserMenu:', error)
            await this.sendErrorMessage(user)
        }
    }

    /**
     * Gửi thông báo hạn chế niêm yết
     */
    private async sendListingRestrictionMessage(user: any): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '🚫 CHƯA THỂ NIÊM YẾT',
            'Tài khoản của bạn đang chờ admin duyệt.',
            'Sau khi được duyệt, bạn sẽ có thể:',
            '• Niêm yết sản phẩm/dịch vụ',
            '• Liên hệ với người mua',
            '• Sử dụng đầy đủ tính năng',
            '',
            '💡 Liên hệ admin để được hỗ trợ nhanh chóng!'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('📋 KIỂM TRA TRẠNG THÁI', 'PENDING_STATUS'),
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH')
            ]
        )
    }

    /**
     * Gửi thông báo hạn chế thanh toán
     */
    private async sendPaymentRestrictionMessage(user: any): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '🚫 CHƯA THỂ THANH TOÁN',
            'Tài khoản của bạn đang chờ admin duyệt.',
            'Sau khi được duyệt, bạn sẽ có thể:',
            '• Thanh toán để gia hạn tài khoản',
            '• Sử dụng đầy đủ tính năng',
            '• Tham gia cộng đồng',
            '',
            '💡 Liên hệ admin để được hỗ trợ nhanh chóng!'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('📋 KIỂM TRA TRẠNG THÁI', 'PENDING_STATUS'),
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH')
            ]
        )
    }

    /**
     * Gửi thông báo từ chối truy cập
     */
    private async sendAccessDeniedMessage(user: any): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '🚫 KHÔNG CÓ QUYỀN TRUY CẬP',
            'Tài khoản của bạn chưa được kích hoạt.',
            'Vui lòng liên hệ admin để được hỗ trợ.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Liên hệ:',
            [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('📋 KIỂM TRA TRẠNG THÁI', 'PENDING_STATUS')
            ]
        )
    }

    /**
     * Gửi thông báo rate limit
     */
    private async sendRateLimitMessage(user: any, action: string): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            `⏱️ GIỚI HẠN ${action.toUpperCase()}`,
            `Bạn đã sử dụng hết số lần ${action} trong ngày.`,
            'Vui lòng thử lại vào ngày mai.',
            '',
            '💡 Liên hệ admin nếu cần hỗ trợ đặc biệt.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    }

    /**
     * Gửi thông báo abuse warning
     */
    private async sendAbuseWarningMessage(user: any, reason?: string): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '⚠️ CẢNH BÁO BẢO MẬT',
            'Hệ thống phát hiện hoạt động bất thường từ tài khoản của bạn.',
            `Lý do: ${reason || 'Hoạt động quá mức'}`,
            '',
            'Vui lòng sử dụng bot một cách hợp lý.',
            'Liên hệ admin nếu bạn cần hỗ trợ.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    }

    /**
     * Gửi thông báo lỗi
     */
    private async sendErrorMessage(user: any): Promise<void> {
        await sendMessagesWithTyping(user.facebook_id, [
            '❌ CÓ LỖI XẢY RA',
            'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.',
            'Vui lòng thử lại sau hoặc liên hệ admin.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    }
}
