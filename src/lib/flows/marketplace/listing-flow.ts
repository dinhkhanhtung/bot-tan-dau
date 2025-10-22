import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
import {
    sendMessage,
    sendQuickReply,
    createQuickReply,
    sendGenericTemplate,
    createGenericElement
} from '../../facebook-api'
import { formatCurrency, generateId } from '../../utils'
import { CATEGORIES, LOCATIONS, PRICE_RANGES } from '../../constants'

/**
 * Listing Flow - Clean, modular implementation
 * Handles product listing process with consistent session management
 */
export class ListingFlow extends BaseFlow {
    readonly flowName = 'listing'

    /**
     * Check if this flow can handle the user/session
     */
    canHandle(user: any, session: any): boolean {
        // Handle null user case
        if (!user || !user.status) {
            return false
        }

        // Can handle if user is registered and wants to create listing
        return (user.status === 'registered' || user.status === 'trial') &&
            (session?.current_flow === 'listing' || !session)
    }

    /**
     * Handle message input
     */
    async handleMessage(user: any, text: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handleStep', { text, session })

            // If no session, start listing
            if (!session) {
                await this.startListing(user)
                return
            }

            // Get current step
            const currentStep = session.step || 0
            console.log(`🔍 Current step: ${currentStep}`)

            // Route to appropriate step handler
            switch (currentStep) {
                case 0:
                    await this.handleTitleStep(user, text)
                    break
                case 1:
                    await this.handleCategoryStep(user, text)
                    break
                case 2:
                    await this.handlePriceStep(user, text)
                    break
                case 3:
                    await this.handleDescriptionStep(user, text)
                    break
                case 4:
                    await this.handleLocationStep(user, text)
                    break
                default:
                    console.log(`❌ Unknown step: ${currentStep}`)
                    await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            await this.handleError(user, error, 'handleStep')
        }
    }

    /**
     * Handle postback events
     */
    async handlePostback(user: any, payload: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handlePostback', { payload, session })

            if (payload === 'LISTING') {
                await this.startListing(user)
            } else if (payload.startsWith('CATEGORY_')) {
                await this.handleCategoryPostback(user, payload, session)
            } else if (payload.startsWith('LOCATION_')) {
                await this.handleLocationPostback(user, payload, session)
            } else if (payload === 'CANCEL_LISTING') {
                await this.cancelListing(user)
            }

        } catch (error) {
            await this.handleError(user, error, 'handlePostback')
        }
    }

    /**
     * Start listing process
     */
    private async startListing(user: any): Promise<void> {
        try {
            console.log(`🔄 Starting listing for user: ${user.facebook_id}`)

            // Check user permissions
            if (user.status !== 'registered' && user.status !== 'trial') {
                await sendMessage(user.facebook_id,
                    `🚫 CHỨC NĂNG CHỈ DÀNH CHO THÀNH VIÊN\n━━━━━━━━━━━━━━━━━━━━\n📝 Đăng tin bán hàng là tính năng đặc biệt\n🎁 Chỉ dành cho thành viên Tân Dậu\n💰 Cơ hội kết nối với hơn 2 triệu Tân Dậu\n━━━━━━━━━━━━━━━━━━━━\n🚀 Đăng ký ngay để sử dụng tính năng này!`)

                await sendQuickReply(user.facebook_id, 'Bạn muốn:', [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO')
                ])
                return
            }

            // Create new session
            await SessionManager.createSession(user.facebook_id, 'listing', 0, {})

            // No intro message - user already has buttons from welcome

        } catch (error) {
            await this.handleError(user, error, 'startListing')
        }
    }

    /**
     * Handle title input step
     */
    private async handleTitleStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📝 Processing title step for user: ${user.facebook_id}`)

            // Validate title
            if (!this.validateInput(text, 5)) {
                await sendMessage(user.facebook_id, '❌ Tiêu đề quá ngắn. Vui lòng nhập ít nhất 5 ký tự!')
                return
            }

            // Update session with title
            await SessionManager.updateSession(user.facebook_id, {
                step: 1,
                data: { title: text.trim() }
            })

            // Send category prompt
            await sendMessage(user.facebook_id,
                `✅ Tiêu đề: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📂 Bước 2/5: Danh mục\n💡 Chọn danh mục phù hợp với sản phẩm\n━━━━━━━━━━━━━━━━━━━━`)

            // Send category buttons
            await this.sendCategoryButtons(user.facebook_id)

            console.log('✅ Title step completed, moved to category step')

        } catch (error) {
            await this.handleError(user, error, 'handleTitleStep')
        }
    }

    /**
     * Handle category step
     */
    private async handleCategoryStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📂 Processing category step for user: ${user.facebook_id}`)

            // For now, just show category buttons
            await this.sendCategoryButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleCategoryStep')
        }
    }

    /**
     * Handle price step
     */
    private async handlePriceStep(user: any, text: string): Promise<void> {
        try {
            console.log(`💰 Processing price step for user: ${user.facebook_id}`)

            // Clean price input
            const priceText = text.replace(/[^\d]/g, '')
            const price = parseInt(priceText)

            if (!price || price < 1000) {
                await sendMessage(user.facebook_id, '❌ Giá không hợp lệ! Vui lòng nhập giá từ 1,000 VNĐ trở lên.')
                return
            }

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with price
            await SessionManager.updateSession(user.facebook_id, {
                step: 3,
                data: {
                    ...currentData,
                    price: price
                }
            })

            // Send description prompt
            await sendMessage(user.facebook_id,
                `✅ Giá: ${formatCurrency(price)}\n━━━━━━━━━━━━━━━━━━━━\n📝 Bước 4/5: Mô tả sản phẩm\n💡 Mô tả chi tiết về sản phẩm của bạn\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập mô tả sản phẩm:`)

            console.log('✅ Price step completed, moved to description step')

        } catch (error) {
            await this.handleError(user, error, 'handlePriceStep')
        }
    }

    /**
     * Handle description step
     */
    private async handleDescriptionStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📝 Processing description step for user: ${user.facebook_id}`)

            // Validate description
            if (!this.validateInput(text, 10)) {
                await sendMessage(user.facebook_id, '❌ Mô tả quá ngắn. Vui lòng nhập ít nhất 10 ký tự!')
                return
            }

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with description
            await SessionManager.updateSession(user.facebook_id, {
                step: 4,
                data: {
                    ...currentData,
                    description: text.trim()
                }
            })

            // Send location prompt
            await sendMessage(user.facebook_id,
                `✅ Mô tả: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 5/5: Địa điểm\n💡 Chọn nơi bạn đang ở để người mua dễ tìm\n━━━━━━━━━━━━━━━━━━━━`)

            // Send location buttons
            await this.sendLocationButtons(user.facebook_id)

            console.log('✅ Description step completed, moved to location step')

        } catch (error) {
            await this.handleError(user, error, 'handleDescriptionStep')
        }
    }

    /**
     * Handle location step
     */
    private async handleLocationStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📍 Processing location step for user: ${user.facebook_id}`)

            // For now, just show location buttons
            await this.sendLocationButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleLocationStep')
        }
    }

    /**
     * Handle category postback
     */
    private async handleCategoryPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`📂 Processing category postback for user: ${user.facebook_id}`)

            const category = payload.replace('CATEGORY_', '')
            console.log(`[DEBUG] Selected category: ${category}`)

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with category
            await SessionManager.updateSession(user.facebook_id, {
                step: 2,
                data: {
                    ...currentData,
                    category: category
                }
            })

            // Send price prompt
            await sendMessage(user.facebook_id,
                `✅ Danh mục: ${category}\n━━━━━━━━━━━━━━━━━━━━\n💰 Bước 3/5: Giá bán\n💡 Nhập giá bán của sản phẩm\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập giá (VNĐ):`)

            console.log('✅ Category step completed, moved to price step')

        } catch (error) {
            await this.handleError(user, error, 'handleCategoryPostback')
        }
    }

    /**
     * Handle location postback
     */
    private async handleLocationPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`📍 Processing location postback for user: ${user.facebook_id}`)

            const location = payload.replace('LOCATION_', '')
            console.log(`[DEBUG] Selected location: ${location}`)

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with location
            await SessionManager.updateSession(user.facebook_id, {
                step: 5,
                data: {
                    ...currentData,
                    location: location
                }
            })

            // Complete listing
            await this.completeListing(user)

        } catch (error) {
            await this.handleError(user, error, 'handleLocationPostback')
        }
    }

    /**
     * Complete listing process
     */
    private async completeListing(user: any): Promise<void> {
        try {
            console.log(`🎉 Completing listing for user: ${user.facebook_id}`)

            // Get session data
            const sessionData = await SessionManager.getSessionData(user.facebook_id)
            const { title, category, price, description, location } = sessionData

            // Create listing in database
            const { supabaseAdmin } = await import('../../supabase')
            const { error: listingError } = await supabaseAdmin
                .from('listings')
                .insert({
                    id: generateId(),
                    user_id: user.facebook_id,
                    title: title,
                    category: category,
                    price: price,
                    description: description,
                    location: location,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (listingError) {
                console.error('❌ Listing creation error:', listingError)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

            // Send success message
            await sendMessage(user.facebook_id,
                `🎉 ĐĂNG TIN THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Tiêu đề: ${title}\n✅ Danh mục: ${category}\n✅ Giá: ${formatCurrency(price)}\n✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n📢 Tin đăng của bạn đã được duyệt và hiển thị!\n💡 Người mua có thể liên hệ với bạn qua tin nhắn.`)

            console.log('✅ Listing completed successfully')

        } catch (error) {
            await this.handleError(user, error, 'completeListing')
        }
    }

    /**
     * Cancel listing
     */
    private async cancelListing(user: any): Promise<void> {
        try {
            await SessionManager.deleteSession(user.facebook_id)
            await sendMessage(user.facebook_id, '❌ Đã hủy đăng tin. Chào tạm biệt!')
        } catch (error) {
            await this.handleError(user, error, 'cancelListing')
        }
    }

    /**
     * Send category buttons
     */
    private async sendCategoryButtons(facebookId: string): Promise<void> {
        const quickReplies = Object.keys(CATEGORIES).map(category =>
            createQuickReply(category, `CATEGORY_${category}`)
        )

        await sendQuickReply(facebookId, 'Chọn danh mục sản phẩm:', quickReplies)
    }

    /**
     * Send location buttons
     */
    private async sendLocationButtons(facebookId: string): Promise<void> {
        const quickReplies = Object.keys(LOCATIONS).map(location =>
            createQuickReply(location, `LOCATION_${location}`)
        )

        await sendQuickReply(facebookId, 'Chọn địa điểm:', quickReplies)
    }
}
