import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendMessagesWithTyping,
    sendButtonTemplate,
    sendQuickReply,
    createPostbackButton,
    createQuickReply
} from './facebook-api'
import { isTrialUser, isExpiredUser, daysUntilExpiry, generateId, updateBotSession, getBotSession, getFacebookDisplayName } from './utils'
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

        // Check if user is admin first - skip all restrictions for admin
        const { isAdmin } = await import('./handlers/admin-handlers')
        const userIsAdmin = await isAdmin(user.facebook_id)

        // If admin is in an active chat session, handle message to user
        if (userIsAdmin) {
            const { data: adminSession } = await supabaseAdmin
                .from('admin_chat_sessions')
                .select('*')
                .eq('admin_id', user.facebook_id)
                .eq('status', 'active')
                .single()

            if (adminSession) {
                // Admin is in active chat, forward message to user
                const { handleAdminMessageToUser } = await import('./admin-chat')
                await handleAdminMessageToUser(user.facebook_id, adminSession.id, text)
                return
            }
        }

        if (!userIsAdmin) {
            // Check if bot is stopped for this user (only for non-admin)
            const { isBotStoppedForUser, trackNonButtonMessage, sendBotStoppedMessage, sendNonButtonWarning } = await import('./anti-spam')
            if (await isBotStoppedForUser(user.facebook_id)) {
                await sendBotStoppedMessage(user.facebook_id, 'Bot temporarily stopped for spam prevention')
                return
            }

            // Track non-button messages for spam prevention (only for non-admin)
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
        }

        // Check if user is in admin chat mode - PRIORITY: Admin chat takes precedence over everything
        const { isUserInAdminChat, handleUserMessageInAdminChat } = await import('./admin-chat')
        if (await isUserInAdminChat(user.facebook_id)) {
            console.log('User is in admin chat mode, forwarding message to admin')
            await handleUserMessageInAdminChat(user.facebook_id, text)
            return
        }

        // Check if user is in any active flow - OPTIMIZED for faster response
        const sessionData = await getBotSession(user.facebook_id)
        const currentFlow = sessionData?.session_data?.current_flow

        if (currentFlow) {
            // User is in an active flow - check if they want to quit current flow
            if (text.toLowerCase().includes('hủy') || text.toLowerCase().includes('thoát') ||
                text.toLowerCase().includes('cancel') || text.toLowerCase().includes('quit')) {
                await sendMessage(user.facebook_id, `❌ Đã hủy quy trình ${currentFlow === 'registration' ? 'đăng ký' : currentFlow === 'listing' ? 'niêm yết' : 'tìm kiếm'} hiện tại.`)
                await updateBotSession(user.facebook_id, null)
                await sendMessage(user.facebook_id, 'Bạn có thể bắt đầu quy trình mới.')
                return
            }

            // Process current flow - optimized processing
            if (currentFlow === 'registration') {
                await AuthHandlers.handleRegistrationStep(user, text, sessionData.session_data)
                return
            } else if (currentFlow === 'listing') {
                await MarketplaceHandlers.handleListingStep(user, text, sessionData.session_data)
                return
            } else if (currentFlow === 'search') {
                await MarketplaceHandlers.handleSearchStep(user, text, sessionData.session_data)
                return
            }
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
            // Check if user is admin first
            if (userIsAdmin) {
                await AdminHandlers.handleAdminCommand(user)
            } else if ((user.status === 'registered' || user.status === 'trial') &&
                      user.name !== 'User' && !user.phone?.startsWith('temp_')) {
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
        // Check if user is admin first
        const { isAdmin } = await import('./handlers/admin-handlers')
        const userIsAdmin = await isAdmin(user.facebook_id)

        // Reset non-button tracking when user clicks a button (only for non-admin)
        if (!userIsAdmin) {
            const { resetNonButtonTracking } = await import('./anti-spam')
            resetNonButtonTracking(user.facebook_id)
        }

        // Check if user is in any active flow (only for non-admin)
        if (!userIsAdmin) {
            const sessionData = await getBotSession(user.facebook_id)
            const currentFlow = sessionData?.session_data?.current_flow

            if (currentFlow) {
                // Allow only flow-related actions or quit commands
                const [action, ...params] = postback.split('_')

                // Allow quit commands
                if (action === 'MAIN' && params[0] === 'MENU') {
                    await sendMessage(user.facebook_id, `❌ Bạn đang ở giữa quy trình ${currentFlow === 'registration' ? 'đăng ký' : currentFlow === 'listing' ? 'niêm yết' : 'tìm kiếm'}.`)
                    await sendMessage(user.facebook_id, 'Vui lòng hoàn thành hoặc hủy quy trình hiện tại trước khi về trang chủ.')
                    await sendMessage(user.facebook_id, '💡 Gửi "hủy" để thoát khỏi quy trình hiện tại.')
                    return
                }

                // Allow flow-specific actions
                if (currentFlow === 'registration' && (action === 'REG' || action === 'REGISTER')) {
                    // Continue with registration flow
                } else if (currentFlow === 'listing' && (action === 'LISTING' || action.startsWith('LISTING_'))) {
                    // Continue with listing flow
                } else if (currentFlow === 'search' && (action === 'SEARCH' || action.startsWith('SEARCH_'))) {
                    // Continue with search flow
                } else {
                    // Block other actions
                    await sendMessage(user.facebook_id, `❌ Bạn đang ở giữa quy trình ${currentFlow === 'registration' ? 'đăng ký' : currentFlow === 'listing' ? 'niêm yết' : 'tìm kiếm'}.`)
                    await sendMessage(user.facebook_id, 'Vui lòng hoàn thành hoặc hủy quy trình hiện tại trước khi thực hiện hành động khác.')
                    await sendMessage(user.facebook_id, '💡 Gửi "hủy" để thoát khỏi quy trình hiện tại.')
                    return
                }
            }
        }

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
                console.log('Processing ADMIN postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminCommand(user)
                break
            case 'ADMIN_PAYMENTS':
                console.log('Processing ADMIN_PAYMENTS postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminPayments(user)
                break
            case 'ADMIN_USERS':
                console.log('Processing ADMIN_USERS postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminUsers(user)
                break
            case 'ADMIN_LISTINGS':
                console.log('Processing ADMIN_LISTINGS postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminListings(user)
                break
            case 'ADMIN_STATS':
                console.log('Processing ADMIN_STATS postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminStats(user)
                break
            case 'ADMIN_NOTIFICATIONS':
                console.log('Processing ADMIN_NOTIFICATIONS postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminNotifications(user)
                break
            case 'ADMIN_SEND_REGISTRATION':
                console.log('Processing ADMIN_SEND_REGISTRATION postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminSendRegistration(user)
                break
            case 'ADMIN_MANAGE_ADMINS':
                console.log('Processing ADMIN_MANAGE_ADMINS postback for user:', user.facebook_id)
                await AdminHandlers.handleAdminManageAdmins(user)
                break
            case 'ADMIN_SPAM_LOGS':
                console.log('Processing ADMIN_SPAM_LOGS postback for user:', user.facebook_id)
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
                } else if (params[0] === 'STATUS') {
                    await PaymentHandlers.handlePaymentStatus(user, params[1])
                } else if (params[0] === 'NOTIF' && params[1] === 'ON') {
                    await PaymentHandlers.handlePaymentNotifications(user)
                } else if (params[0] === 'NOTIF' && params[1] === 'OFF') {
                    await PaymentHandlers.handlePaymentNotifications(user)
                } else if (params[0] === 'REMIND' && params[1] === '3') {
                    await PaymentHandlers.handlePaymentNotifications(user)
                } else if (params[0] === 'REMIND' && params[1] === '1') {
                    await PaymentHandlers.handlePaymentNotifications(user)
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
            // Admin handlers - ENHANCED WITH NEW FEATURES
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
                } else if (params[0] === 'BULK' && params[1] === 'APPROVE') {
                    await AdminHandlers.handleAdminBulkApprove(user)
                } else if (params[0] === 'BULK' && params[1] === 'HIGH_VALUE') {
                    await AdminHandlers.handleAdminBulkApproveHighValue(user)
                } else if (params[0] === 'BULK' && params[1] === 'TRUSTED') {
                    await AdminHandlers.handleAdminBulkApproveTrusted(user)
                } else if (params[0] === 'VIEW' && params[1] === 'RECEIPT') {
                    await AdminHandlers.handleAdminViewReceipt(user, params[2])
                } else if (params[0] === 'VIEW' && params[1] === 'USER') {
                    await AdminHandlers.handleAdminViewUser(user, params[2])
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
                } else if (params[0] === 'TAKE') {
                    if (params[1] === 'CHAT') {
                        await AdminHandlers.handleAdminTakeChat(user, params[2])
                    }
                } else if (params[0] === 'END') {
                    if (params[1] === 'CHAT') {
                        await AdminHandlers.handleAdminEndChat(user, params[2])
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
            case 'START':
                if (params[0] === 'ADMIN' && params[1] === 'CHAT') {
                    await UtilityHandlers.handleStartAdminChat(user)
                }
                break
            case 'CANCEL':
                if (params[0] === 'ADMIN' && params[1] === 'CHAT') {
                    await handleCancelAdminChat(user)
                }
                break
            case 'EXIT':
                if (params[0] === 'ADMIN' && params[1] === 'CHAT') {
                    await handleExitAdminChat(user)
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
                // Check if user is registered (exclude temp users)
                if ((user.status === 'registered' || user.status === 'trial') &&
                    user.name !== 'User' && !user.phone?.startsWith('temp_')) {
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

// Show main menu - ENHANCED WITH QUICK REPLY FOR BETTER UX
async function showMainMenu(user: any) {
    // Send typing indicator immediately for faster response
    sendTypingIndicator(user.facebook_id).catch(err => console.error('Typing indicator error:', err))

    const statusText = isTrialUser(user.membership_expires_at)
        ? `📅 Trial còn ${daysUntilExpiry(user.membership_expires_at!)} ngày`
        : '✅ Đã thanh toán'

    // Get Facebook name if available, fallback to user.name or default
    const displayName = await getFacebookDisplayName(user.facebook_id) || user.name || 'bạn'

    await sendMessage(user.facebook_id, '🏠 TRANG CHỦ Tân Dậu - Hỗ Trợ Chéo')
    await sendMessage(user.facebook_id, `👋 Chào mừng ${displayName}!`)
    await sendMessage(user.facebook_id, `📊 Trạng thái: ${statusText}`)
    await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
    await sendMessage(user.facebook_id, '🎯 Chọn chức năng bạn muốn sử dụng:')

    // Use Quick Reply instead of Button Template for better UX
    await sendQuickReply(
        user.facebook_id,
        '🛒 MUA BÁN & KINH DOANH:',
        [
            createQuickReply('🛒 NIÊM YẾT SẢN PHẨM', 'LISTING'),
            createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
            createQuickReply('💬 KẾT NỐI BÁN HÀNG', 'CONTACT_SELLER'),
            createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
            createQuickReply('🎁 GIỚI THIỆU BẠN BÈ', 'REFERRAL'),
            createQuickReply('⭐ ĐIỂM THƯỞNG', 'POINTS'),
            createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
            createQuickReply('📊 THỐNG KÊ CÁ NHÂN', 'PERSONAL_STATS'),
            createQuickReply('⚙️ CÀI ĐẶT', 'SETTINGS'),
            createQuickReply('🔮 TỬ VI HÀNG NGÀY', 'HOROSCOPE'),
            createQuickReply('❓ HỖ TRỢ', 'SUPPORT'),
            createQuickReply('📱 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
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
    try {
        // Start admin chat session
        const { startAdminChatSession } = await import('./admin-chat')
        const result = await startAdminChatSession(user.facebook_id)

        if (result.success) {
            await sendTypingIndicator(user.facebook_id)

            await sendMessagesWithTyping(user.facebook_id, [
                '💬 LIÊN HỆ ADMIN',
                'Yêu cầu chat của bạn đã được gửi đến admin.',
                '⏳ Bạn sẽ nhận được phản hồi sớm nhất có thể!',
                '📱 Trong thời gian chờ, bạn có thể gửi tin nhắn và admin sẽ trả lời.'
            ])

            await sendButtonTemplate(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createPostbackButton('❌ HỦY CHAT', 'CANCEL_ADMIN_CHAT'),
                    createPostbackButton('🔄 QUAY LẠI BOT', 'EXIT_ADMIN_CHAT'),
                    createPostbackButton('📝 HƯỚNG DẪN', 'ADMIN_HELP_GENERAL')
                ]
            )
        } else {
            await sendMessage(user.facebook_id, '❌ Không thể tạo yêu cầu chat. Vui lòng thử lại sau!')
        }
    } catch (error) {
        console.error('Error in handleContactAdmin:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle cancel admin chat
export async function handleCancelAdminChat(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { endAdminChatSession } = await import('./admin-chat')
        const success = await endAdminChatSession(user.facebook_id)

        if (success) {
            await sendMessagesWithTyping(user.facebook_id, [
                '❌ ĐÃ HỦY CHAT VỚI ADMIN',
                'Yêu cầu chat đã được hủy.',
                'Bạn có thể quay lại sử dụng bot bình thường.'
            ])
        } else {
            await sendMessage(user.facebook_id, '⚠️ Không thể hủy chat. Có thể bạn không có session nào đang hoạt động.')
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Bạn muốn:',
            [
                createPostbackButton('🤖 CHAT BOT', 'SUPPORT_BOT'),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    } catch (error) {
        console.error('Error canceling admin chat:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle exit admin chat
export async function handleExitAdminChat(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { endAdminChatSession } = await import('./admin-chat')
        const success = await endAdminChatSession(user.facebook_id)

        if (success) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🔄 ĐÃ QUAY LẠI CHẾ ĐỘ BOT',
                'Bạn đã thoát khỏi chế độ chat với admin.',
                'Bot sẽ tiếp tục hỗ trợ bạn như bình thường.'
            ])
        } else {
            await sendMessage(user.facebook_id, '⚠️ Không thể thoát chat. Có thể bạn không có session nào đang hoạt động.')
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Bạn muốn:',
            [
                createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
                createPostbackButton('🛒 TẠO TIN', 'LISTING'),
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    } catch (error) {
        console.error('Error exiting admin chat:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle exit bot
export async function handleExitBot(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '👋 TẠM BIỆT!',
        'Cảm ơn bạn đã sử dụng Bot Tân Dậu - Hỗ Trợ Chéo!',
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
