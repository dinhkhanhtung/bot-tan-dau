import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendMessagesWithTyping,
    sendButtonTemplate,
    createPostbackButton
} from './facebook-api'
import { isTrialUser, isExpiredUser, daysUntilExpiry, generateId, updateBotSession, getBotSession } from './utils'
import * as AdminHandlers from './handlers/admin-handlers'

// Import handlers from modules
import * as AuthHandlers from './handlers/auth-handlers'
import * as MarketplaceHandlers from './handlers/marketplace-handlers'
import * as CommunityHandlers from './handlers/community-handlers'
import * as PaymentHandlers from './handlers/payment-handlers'
import * as AdminExtra from './handlers/admin-extra'
import * as UtilityHandlers from './handlers/utility-handlers'

// Main message handler
export async function handleMessage(user: any, text: string) {
    try {
        // Check if user exists
        if (!user) {
            console.error('User is null in handleMessage')
            return
        }

        // Check if user has required properties
        if (!user.facebook_id) {
            console.error('User missing facebook_id:', user)
            return
        }

        // Check if bot is stopped for this user
        const { isBotStoppedForUser, trackNonButtonMessage, sendBotStoppedMessage, sendNonButtonWarning } = await import('./anti-spam')
        if (isBotStoppedForUser(user.facebook_id)) {
            await sendBotStoppedMessage(user.facebook_id, 'Bot temporarily stopped for spam prevention')
            return
        }

        // Track non-button messages for spam prevention
        const nonButtonResult = await trackNonButtonMessage(user.facebook_id, text)
        if (nonButtonResult.shouldStopBot) {
            await sendBotStoppedMessage(user.facebook_id, nonButtonResult.reason || 'Too many non-button messages')
            return
        } else if (nonButtonResult.warningCount > 0) {
            await sendNonButtonWarning(user.facebook_id, nonButtonResult.warningCount)
        }

        // Check if user is expired
        if (isExpiredUser(user.membership_expires_at)) {
            await PaymentHandlers.sendExpiredMessage(user.facebook_id)
            return
        }

        // Check if user is in trial and about to expire
        if (isTrialUser(user.membership_expires_at)) {
            const daysLeft = daysUntilExpiry(user.membership_expires_at!)
            if (daysLeft <= 2) {
                await PaymentHandlers.sendTrialExpiringMessage(user.facebook_id, daysLeft)
            }
        }

        // Check if user is in registration flow
        const sessionData = await getBotSession(user.facebook_id)
        if (sessionData && sessionData.session_data?.current_flow === 'registration') {
            await AuthHandlers.handleRegistrationStep(user, text, sessionData.session_data)
            return
        }

        // Check if user is in listing flow
        if (sessionData && sessionData.session_data?.current_flow === 'listing') {
            await MarketplaceHandlers.handleListingStep(user, text, sessionData.session_data)
            return
        }

        // Check if user is in search flow
        if (sessionData && sessionData.session_data?.current_flow === 'search') {
            await MarketplaceHandlers.handleSearchStep(user, text, sessionData.session_data)
            return
        }

        // Handle different message types
        if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
            await AuthHandlers.handleRegistration(user)
        } else if (text.includes('niêm yết') || text.includes('NIÊM YẾT')) {
            await MarketplaceHandlers.handleListing(user)
        } else if (text.includes('tìm kiếm') || text.includes('TÌM KIẾM')) {
            await MarketplaceHandlers.handleSearch(user)
        } else if (text.includes('cộng đồng') || text.includes('CỘNG ĐỒNG')) {
            await CommunityHandlers.handleCommunity(user)
        } else if (text.includes('thanh toán') || text.includes('THANH TOÁN')) {
            await PaymentHandlers.handlePayment(user)
        } else if (text.includes('tử vi') || text.includes('TỬ VI')) {
            await UtilityHandlers.handleHoroscope(user)
        } else if (text.includes('điểm thưởng') || text.includes('ĐIỂM THƯỞNG')) {
            await UtilityHandlers.handlePoints(user)
        } else if (text.includes('cài đặt') || text.includes('CÀI ĐẶT')) {
            await UtilityHandlers.handleSettings(user)
        } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
            await UtilityHandlers.handleSupport(user)
        } else if (text === '/admin') {
            await AdminHandlers.handleAdminCommand(user)
        } else {
            // Check if user is registered
            if (user.status === 'registered' || user.status === 'trial') {
                await UtilityHandlers.handleDefaultMessageRegistered(user)
            } else {
                await AuthHandlers.handleDefaultMessage(user)
            }
        }
    } catch (error) {
        console.error('Error handling message:', error)
        if (user && user.facebook_id) {
            await sendMessage(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}

// Handle postback (button clicks)
export async function handlePostback(user: any, postback: string) {
    try {
        // Reset non-button tracking when user clicks a button
        const { resetNonButtonTracking } = await import('./anti-spam')
        resetNonButtonTracking(user.facebook_id)

        const [action, ...params] = postback.split('_')

        switch (action) {
            // Auth handlers
            case 'REGISTER':
                await AuthHandlers.handleRegistration(user)
                break
            case 'REG':
                if (params[0] === 'LOCATION') {
                    await AuthHandlers.handleRegistrationLocationPostback(user, params[1])
                } else if (params[0] === 'BIRTHDAY') {
                    if (params[1] === 'YES') {
                        await AuthHandlers.handleBirthdayVerification(user)
                    } else {
                        await AuthHandlers.handleBirthdayRejection(user)
                    }
                }
                break
            case 'INFO':
                await AuthHandlers.handleInfo(user)
                break
            case 'CONTACT':
                if (params[0] === 'ADMIN') {
                    await handleContactAdmin(user)
                }
                break
            // Admin handlers
            case 'ADMIN':
                await AdminHandlers.handleAdminCommand(user)
                break
            case 'ADMIN_PAYMENTS':
                await AdminHandlers.handleAdminPayments(user)
                break
            case 'ADMIN_USERS':
                await AdminHandlers.handleAdminUsers(user)
                break
            case 'ADMIN_LISTINGS':
                await AdminHandlers.handleAdminListings(user)
                break
            case 'ADMIN_STATS':
                await AdminHandlers.handleAdminStats(user)
                break
            case 'ADMIN_NOTIFICATIONS':
                await AdminHandlers.handleAdminNotifications(user)
                break
            case 'ADMIN_SEND_REGISTRATION':
                await AdminHandlers.handleAdminSendRegistration(user)
                break
            case 'ADMIN_MANAGE_ADMINS':
                await AdminHandlers.handleAdminManageAdmins(user)
                break
            case 'ADMIN_SPAM_LOGS':
                await AdminHandlers.handleAdminSpamLogs(user)
                break

            // Marketplace handlers
            case 'LISTING':
                if (params[0] === 'CATEGORY') {
                    await MarketplaceHandlers.handleListingCategory(user, params[1])
                } else if (params[0] === 'CITY') {
                    await MarketplaceHandlers.handleListingCity(user, params[1])
                } else if (params[0] === 'LOCATION') {
                    await MarketplaceHandlers.handleListingLocation(user, params[1])
                } else if (params[0] === 'CONFIRM') {
                    await MarketplaceHandlers.handleListingConfirm(user)
                } else if (params[0] === 'SUBMIT') {
                    await MarketplaceHandlers.handleListingSubmit(user)
                } else {
                    await MarketplaceHandlers.handleListing(user)
                }
                break
            case 'SEARCH':
                if (params[0] === 'CATEGORY') {
                    await MarketplaceHandlers.handleSearchCategory(user, params[1])
                } else if (params[0] === 'ADVANCED') {
                    await MarketplaceHandlers.handleSearchAdvanced(user)
                } else if (params[0] === 'KEYWORD') {
                    if (params[1]) {
                        // Handle search keyword suggestion
                        const suggestion = params.slice(1).join('_')
                        await MarketplaceHandlers.handleSearchKeywordSuggestion(user, suggestion)
                    } else {
                        await MarketplaceHandlers.handleSearchKeyword(user)
                    }
                } else if (params[0] === 'HASHTAG') {
                    // Handle hashtag search
                    const hashtag = params.slice(1).join('_')
                    await MarketplaceHandlers.handleSearchHashtag(user, hashtag)
                } else if (params[0] === 'UPDATE') {
                    await MarketplaceHandlers.handleSearchUpdate(user)
                } else {
                    await MarketplaceHandlers.handleSearch(user)
                }
                break
            case 'VIEW':
                if (params[0] === 'LISTING') {
                    await MarketplaceHandlers.handleViewListing(user, params[1])
                }
                break
            case 'CONTACT':
                if (params[0] === 'SELLER') {
                    await MarketplaceHandlers.handleContactSeller(user, params[1])
                }
                break
            case 'MY':
                if (params[0] === 'LISTINGS') {
                    await MarketplaceHandlers.handleMyListings(user)
                }
                break
            case 'BUY':
                if (params[0] === 'SELL') {
                    await MarketplaceHandlers.handleBuySell(user)
                }
                break

            // Community handlers
            case 'COMMUNITY':
                if (params[0] === 'BIRTHDAY') {
                    await CommunityHandlers.handleCommunityBirthday(user)
                } else if (params[0] === 'TOP' && params[1] === 'SELLER') {
                    await CommunityHandlers.handleCommunityTopSeller(user)
                } else if (params[0] === 'EVENTS') {
                    await CommunityHandlers.handleCommunityEvents(user)
                } else if (params[0] === 'SUPPORT') {
                    await CommunityHandlers.handleCommunitySupport(user)
                } else if (params[0] === 'MEMORIES') {
                    await CommunityHandlers.handleCommunityMemories(user)
                } else if (params[0] === 'ACHIEVEMENTS') {
                    await CommunityHandlers.handleCommunityAchievements(user)
                } else if (params[0] === 'CHAT') {
                    await CommunityHandlers.handleCommunityChat(user)
                } else if (params[0] === 'RANKING') {
                    await CommunityHandlers.handleCommunityRanking(user)
                } else if (params[0] === 'ANNOUNCEMENTS') {
                    await CommunityHandlers.handleCommunityAnnouncements(user)
                } else {
                    await CommunityHandlers.handleCommunity(user)
                }
                break
            case 'EVENT':
                if (params[0] === 'REGISTER') {
                    await CommunityHandlers.handleEventRegistration(user, params[1])
                }
                break

            // Payment handlers
            case 'PAYMENT':
                if (params[0] === 'PACKAGE') {
                    await PaymentHandlers.handlePaymentPackage(user, params[1])
                } else if (params[0] === 'UPLOAD') {
                    await PaymentHandlers.handlePaymentUploadReceipt(user)
                } else if (params[0] === 'HISTORY') {
                    await PaymentHandlers.handlePaymentHistory(user)
                } else if (params[0] === 'GUIDE') {
                    await PaymentHandlers.handlePaymentGuide(user)
                } else if (params[0] === 'EXTEND') {
                    await PaymentHandlers.handlePaymentExtend(user)
                } else {
                    await PaymentHandlers.handlePayment(user)
                }
                break

            // Advertising handlers
            case 'ADVERTISING':
                if (params[0] === 'HOMEPAGE') {
                    await PaymentHandlers.handleAdvertisingPackage(user, 'HOMEPAGE')
                } else if (params[0] === 'SEARCH') {
                    await PaymentHandlers.handleAdvertisingPackage(user, 'SEARCH')
                } else if (params[0] === 'CROSS_SELL') {
                    await PaymentHandlers.handleAdvertisingPackage(user, 'CROSS_SELL')
                } else if (params[0] === 'FEATURED') {
                    await PaymentHandlers.handleAdvertisingPackage(user, 'FEATURED')
                } else if (params[0] === 'UPLOAD' && params[1] === 'RECEIPT') {
                    await PaymentHandlers.handleAdvertisingUploadReceipt(user)
                } else if (params[0] === 'STATS') {
                    await PaymentHandlers.handleAdvertisingStats(user)
                } else {
                    await PaymentHandlers.handlePaidAdvertising(user)
                }
                break

            // Search service handlers
            case 'SEARCH_SERVICE':
                if (params[0] === 'REAL_ESTATE') {
                    await MarketplaceHandlers.handleSearchServicePayment(user, 'BẤT ĐỘNG SẢN')
                } else if (params[0] === 'CAR') {
                    await MarketplaceHandlers.handleSearchServicePayment(user, 'Ô TÔ')
                } else if (params[0] === 'ELECTRONICS') {
                    await MarketplaceHandlers.handleSearchServicePayment(user, 'ĐIỆN TỬ')
                } else if (params[0] === 'FASHION') {
                    await MarketplaceHandlers.handleSearchServicePayment(user, 'THỜI TRANG')
                } else if (params[0] === 'FOOD') {
                    await MarketplaceHandlers.handleSearchServicePayment(user, 'ẨM THỰC')
                } else if (params[0] === 'SERVICE') {
                    await MarketplaceHandlers.handleSearchServicePayment(user, 'DỊCH VỤ')
                } else if (params[0] === 'UPLOAD' && params[1] === 'RECEIPT') {
                    await MarketplaceHandlers.handleSearchServiceUploadReceipt(user)
                } else {
                    await MarketplaceHandlers.handleSearchService(user)
                }
                break

            // Personal stats handlers
            case 'PERSONAL_STATS':
                if (params[0] === 'DETAIL') {
                    await UtilityHandlers.handlePersonalStatsDetail(user)
                } else if (params[0] === 'EXPORT') {
                    await UtilityHandlers.handlePersonalStatsExport(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'PDF') {
                    await UtilityHandlers.handlePersonalStatsExport(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'EXCEL') {
                    await UtilityHandlers.handlePersonalStatsExport(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'IMAGE') {
                    await UtilityHandlers.handlePersonalStatsExport(user)
                } else {
                    await UtilityHandlers.handlePersonalStats(user)
                }
                break

            // Admin handlers
            case 'ADMIN':
                if (params[0] === 'PAYMENTS') {
                    await AdminHandlers.handleAdminPayments(user)
                } else if (params[0] === 'USERS') {
                    await AdminHandlers.handleAdminUsers(user)
                } else if (params[0] === 'LISTINGS') {
                    await AdminHandlers.handleAdminListings(user)
                } else if (params[0] === 'STATS') {
                    await AdminHandlers.handleAdminStats(user)
                } else if (params[0] === 'SPAM' && params[1] === 'LOGS') {
                    await AdminHandlers.handleAdminSpamLogs(user)
                } else if (params[0] === 'EXPORT') {
                    await AdminHandlers.handleAdminExport(user)
                } else if (params[0] === 'NOTIFICATIONS') {
                    await AdminHandlers.handleAdminNotifications(user)
                } else if (params[0] === 'SETTINGS') {
                    await AdminHandlers.handleAdminSettings(user)
                } else if (params[0] === 'MANAGE' && params[1] === 'ADMINS') {
                    await AdminHandlers.handleAdminManageAdmins(user)
                } else if (params[0] === 'APPROVE' && params[1] === 'PAYMENT') {
                    await AdminHandlers.handleAdminApprovePayment(user, params[2])
                } else if (params[0] === 'REJECT' && params[1] === 'PAYMENT') {
                    await AdminHandlers.handleAdminRejectPayment(user, params[2])
                } else if (params[0] === 'SEND') {
                    if (params[1] === 'REGISTRATION') {
                        await AdminHandlers.handleAdminSendRegistration(user)
                    } else if (params[1] === 'TO_USER') {
                        await AdminHandlers.handleAdminSendToUser(user)
                    } else if (params[1] === 'TO_ALL') {
                        await AdminHandlers.handleAdminSendToAll(user)
                    }
                } else if (params[0] === 'CREATE') {
                    if (params[1] === 'SHARE_LINK') {
                        await AdminHandlers.handleAdminCreateShareLink(user)
                    }
                } else if (params[0] === 'CONFIRM') {
                    if (params[1] === 'SEND_ALL') {
                        await AdminExtra.handleAdminConfirmSendAll(user)
                    }
                } else if (params[0] === 'COPY') {
                    if (params[1] === 'LINK') {
                        await AdminExtra.handleAdminCopyLink(user)
                    }
                } else if (params[0] === 'STOP') {
                    if (params[1] === 'BOT') {
                        await AdminHandlers.handleAdminStopBot(user)
                    }
                } else if (params[0] === 'CONFIRM') {
                    if (params[1] === 'STOP') {
                        await AdminHandlers.handleAdminConfirmStopBot(user)
                    }
                } else if (params[0] === 'START') {
                    if (params[1] === 'BOT') {
                        await AdminHandlers.handleAdminStartBot(user)
                    }
                } else {
                    await AdminHandlers.handleAdminCommand(user)
                }
                break

            // Utility handlers
            case 'HOROSCOPE':
                if (params[0] === 'DETAIL') {
                    await UtilityHandlers.handleHoroscopeDetail(user)
                } else if (params[0] === 'WEEK') {
                    await UtilityHandlers.handleHoroscopeWeek(user)
                } else if (params[0] === 'MONTH') {
                    await UtilityHandlers.handleHoroscopeMonth(user)
                } else if (params[0] === 'TOMORROW') {
                    await UtilityHandlers.handleHoroscopeTomorrow(user)
                } else {
                    await UtilityHandlers.handleHoroscope(user)
                }
                break
            case 'POINTS':
                if (params[0] === 'REWARDS' && params[1] === 'DISCOUNT') {
                    await UtilityHandlers.handlePointsRewardsDiscount(user)
                } else if (params[0] === 'REWARDS' && params[1] === 'BADGES') {
                    await UtilityHandlers.handlePointsRewardsBadges(user)
                } else if (params[0] === 'REWARDS' && params[1] === 'GIFTS') {
                    await UtilityHandlers.handlePointsRewardsGifts(user)
                } else if (params[0] === 'REWARDS' && params[1] === 'GAMES') {
                    await UtilityHandlers.handlePointsRewardsGames(user)
                } else if (params[0] === 'HISTORY') {
                    await UtilityHandlers.handlePointsHistory(user)
                } else if (params[0] === 'ACHIEVEMENTS') {
                    await UtilityHandlers.handlePointsAchievements(user)
                } else if (params[0] === 'LEADERBOARD') {
                    await UtilityHandlers.handlePointsLeaderboard(user)
                } else if (params[0] === 'REDEEM') {
                    await UtilityHandlers.handlePointsRedeem(user)
                } else {
                    await UtilityHandlers.handlePoints(user)
                }
                break
            case 'REFERRAL':
                if (params[0] === 'SHARE') {
                    await UtilityHandlers.handleReferralShare(user)
                } else if (params[0] === 'STATS') {
                    await UtilityHandlers.handleReferralStats(user)
                } else if (params[0] === 'WITHDRAW') {
                    await UtilityHandlers.handleReferralWithdraw(user)
                } else {
                    await UtilityHandlers.handleReferral(user)
                }
                break
            case 'SETTINGS':
                await UtilityHandlers.handleSettings(user)
                break
            case 'SUPPORT':
                if (params[0] === 'BOT') {
                    await UtilityHandlers.handleSupportBot(user)
                } else if (params[0] === 'ADMIN') {
                    await UtilityHandlers.handleSupportAdmin(user)
                } else {
                    await UtilityHandlers.handleSupport(user)
                }
                break
            case 'MAIN':
                if (params[0] === 'MENU') {
                    await showMainMenu(user)
                }
                break
            case 'EXIT':
                if (params[0] === 'BOT') {
                    await handleExitBot(user)
                }
                break
            default:
                // Check if user is registered
                if (user.status === 'registered' || user.status === 'trial') {
                    await UtilityHandlers.handleDefaultMessageRegistered(user)
                } else {
                    await AuthHandlers.handleDefaultMessage(user)
                }
        }
    } catch (error) {
        console.error('Error handling postback:', error)
        if (user && user.facebook_id) {
            await sendMessage(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}

// Show main menu
async function showMainMenu(user: any) {
    await sendTypingIndicator(user.facebook_id)
    const statusText = isTrialUser(user.membership_expires_at)
        ? `Trial ${daysUntilExpiry(user.membership_expires_at!)} ngày`
        : 'Đã thanh toán'

    await sendMessagesWithTyping(user.facebook_id, [
        '🏠 TRANG CHỦ TÂN DẬU',
        `Chào anh/chị ${user.name}! 👋`,
        'Chọn chức năng:'
    ])

    // First set of main functions
    await sendButtonTemplate(
        user.facebook_id,
        'Chức năng chính:',
        [
            createPostbackButton('🛒 NIÊM YẾT', 'LISTING'),
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('💬 KẾT NỐI', 'CONNECT')
        ]
    )

    // Second set of main functions
    await sendButtonTemplate(
        user.facebook_id,
        'Tiếp tục:',
        [
            createPostbackButton('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT'),
            createPostbackButton('⭐ ĐIỂM THƯỞNG', 'POINTS')
        ]
    )

    // Third set of main functions
    await sendButtonTemplate(
        user.facebook_id,
        'Thêm:',
        [
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'SETTINGS'),
            createPostbackButton('❌ THOÁT', 'EXIT_BOT')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn khác:',
        [
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE'),
            createPostbackButton('🎁 GIỚI THIỆU', 'REFERRAL'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'SETTINGS')
        ]
    )
}

// Helper functions - getBotSession imported from utils


// Export missing functions for webhook
export async function handleDefaultMessage(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessage(user.facebook_id, '👋 Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo!')

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

export async function handleDefaultMessageRegistered(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessage(user.facebook_id, '👋 Chào mừng bạn trở lại!')

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn:',
        [
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('🛒 TẠO TIN', 'LISTING'),
            createPostbackButton('👥 CỘNG ĐỒNG', 'COMMUNITY'),
            createPostbackButton('📊 THỐNG KÊ', 'STATS')
        ]
    )
}

export async function handleAdminCommand(user: any, command: string) {
    await AdminHandlers.handleAdminCommand(user)
}

export async function handlePaymentReceipt(user: any, imageUrl: string) {
    await PaymentHandlers.handlePaymentUploadReceipt(user)
}

export async function handleListingImages(user: any, imageUrl?: string) {
    await MarketplaceHandlers.handleListingImages(user, imageUrl)
}

// Handle contact admin
export async function handleContactAdmin(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '💬 LIÊN HỆ ADMIN',
        'Bạn cần hỗ trợ gì? Admin sẽ phản hồi sớm nhất có thể!'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn loại hỗ trợ:',
        [
            createPostbackButton('📝 HƯỚNG DẪN ĐĂNG KÝ', 'ADMIN_HELP_REGISTER'),
            createPostbackButton('❓ CÂU HỎI KHÁC', 'ADMIN_HELP_GENERAL'),
            createPostbackButton('🔙 QUAY LẠI', 'MAIN_MENU')
        ]
    )
}

// Handle exit bot
export async function handleExitBot(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '👋 TẠM BIỆT!',
        'Cảm ơn bạn đã sử dụng Bot Tân Dậu 1981!',
        'Hẹn gặp lại bạn sau! 😊'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn có muốn:',
        [
            createPostbackButton('🏠 VÀO LẠI', 'MAIN_MENU'),
            createPostbackButton('📝 ĐĂNG KÝ', 'REGISTER'),
            createPostbackButton('ℹ️ TÌM HIỂU', 'INFO')
        ]
    )
}
