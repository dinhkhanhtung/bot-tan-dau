import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    sendGenericTemplate,
    sendCarouselTemplate,
    createQuickReply,
    createPostbackButton,
    createGenericElement,
    sendMessagesWithTyping
} from './facebook-api'

// Utility function to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount)
}
import {
    CATEGORIES,
    LOCATIONS,
    DISTRICTS,
    PRICE_RANGES,
    AD_PACKAGES,
    BOT_CONFIG
} from './constants'
import {
    formatNumber,
    generateReferralCode,
    calculateUserLevel,
    daysUntilExpiry,
    isTrialUser,
    isExpiredUser,
    generateHoroscope,
    validatePhoneNumber,
    generateId
} from './utils'

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

        // Check if user is expired
        if (isExpiredUser(user.membership_expires_at)) {
            await sendExpiredMessage(user.facebook_id)
            return
        }

        // Check if user is in trial and about to expire
        if (isTrialUser(user.membership_expires_at)) {
            const daysLeft = daysUntilExpiry(user.membership_expires_at!)
            if (daysLeft <= 2) {
                await sendTrialExpiringMessage(user.facebook_id, daysLeft)
            }
        }

        // Check if user is in registration flow
        const session = await getBotSession(user.facebook_id)
        if (session && session.current_flow === 'registration') {
            await handleRegistrationStep(user, text, session)
            return
        }

        // Check if user is in listing flow
        if (session && session.current_flow === 'listing') {
            await handleListingStep(user, text, session)
            return
        }

        // Check if user is in search flow
        if (session && session.current_flow === 'search') {
            await handleSearchStep(user, text, session)
            return
        }

        // Handle different message types
        if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
            await handleRegistration(user)
        } else if (text.includes('niêm yết') || text.includes('NIÊM YẾT')) {
            await handleListing(user)
        } else if (text.includes('tìm kiếm') || text.includes('TÌM KIẾM')) {
            await handleSearch(user)
        } else if (text.includes('cộng đồng') || text.includes('CỘNG ĐỒNG')) {
            await handleCommunity(user)
        } else if (text.includes('thanh toán') || text.includes('THANH TOÁN')) {
            await handlePayment(user)
        } else if (text.includes('tử vi') || text.includes('TỬ VI')) {
            await handleHoroscope(user)
        } else if (text.includes('điểm thưởng') || text.includes('ĐIỂM THƯỞNG')) {
            await handlePoints(user)
        } else if (text.includes('cài đặt') || text.includes('CÀI ĐẶT')) {
            await handleSettings(user)
        } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
            await handleSupport(user)
        } else if (text.includes('admin') || text.includes('ADMIN')) {
            await handleAdminCommand(user)
        } else {
            await handleDefaultMessage(user)
        }
    } catch (error) {
        console.error('Error handling message:', error)
        if (user && user.facebook_id) {
            await sendMessage(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}

// Handle postback (button clicks)
export async function handlePostback(user: any, payload: string) {
    try {
        // Check if user exists
        if (!user) {
            console.error('User is null in handlePostback')
            return
        }

        // Check if user has required properties
        if (!user.facebook_id) {
            console.error('User missing facebook_id in handlePostback:', user)
            return
        }

        const [action, ...params] = payload.split('_')

        switch (action) {
            case 'REGISTER':
                await handleRegistration(user)
                break
            case 'LISTING':
                await handleListing(user)
                break
            case 'SEARCH':
                if (params[0] === 'CATEGORY') {
                    const category = params.slice(1).join('_')
                    await handleSearchCategory(user, category)
                } else if (params[0] === 'ADVANCED') {
                    await handleSearchAdvanced(user)
                } else if (params[0] === 'KEYWORD') {
                    await handleSearchKeyword(user)
                } else {
                    await handleSearch(user)
                }
                break
            case 'LISTING':
                if (params[0] === 'CATEGORY') {
                    const category = params.slice(1).join('_')
                    await handleListingCategory(user, category)
                } else if (params[0] === 'TITLE') {
                    await handleListingTitle(user)
                } else if (params[0] === 'PRICE') {
                    await handleListingPrice(user)
                } else if (params[0] === 'DESCRIPTION') {
                    await handleListingDescription(user)
                } else if (params[0] === 'LOCATION') {
                    await handleListingLocation(user)
                } else if (params[0] === 'IMAGES') {
                    await handleListingImages(user)
                } else if (params[0] === 'CONFIRM') {
                    await handleListingConfirm(user)
                } else if (params[0] === 'SUBMIT') {
                    await handleListingSubmit(user)
                }
                break
            case 'MY':
                if (params[0] === 'LISTINGS') {
                    await handleMyListings(user)
                }
                break
            case 'VIEW':
                if (params[0] === 'LISTING') {
                    await handleViewListing(user, params[1])
                }
                break
            case 'CONTACT':
                if (params[0] === 'SELLER') {
                    await handleContactSeller(user, params[1])
                }
                break
            case 'RATE':
                if (params[0] === 'SELLER') {
                    await handleRateSeller(user, params[1])
                } else if (params[0] && params[0].startsWith('RATE_')) {
                    const rating = parseInt(params[0].split('_')[1])
                    const sellerId = params[1]
                    await handleRateSubmission(user, sellerId, rating)
                }
                break
            case 'SEARCH':
                if (params[0] === 'LOCATION') {
                    const location = params.slice(1).join('_')
                    await handleSearchLocation(user, location)
                } else if (params[0] === 'ALL' && params[1] === 'LOCATIONS') {
                    await handleSearchAllLocations(user)
                } else if (params[0] === 'BY' && params[1] === 'PRICE') {
                    await handleSearchByPrice(user)
                } else if (params[0] === 'BY' && params[1] === 'RATING') {
                    await handleSearchByRating(user)
                } else if (params[0] === 'BY' && params[1] === 'DATE') {
                    await handleSearchByDate(user)
                }
                break
            case 'COMMUNITY':
                if (params[0] === 'BIRTHDAY') {
                    await handleCommunityBirthday(user)
                } else if (params[0] === 'TOP' && params[1] === 'SELLER') {
                    await handleCommunityTopSeller(user)
                } else if (params[0] === 'RANKING') {
                    await handleCommunityRanking(user)
                } else if (params[0] === 'SUPPORT') {
                    await handleCommunitySupport(user)
                } else if (params[0] === 'ANNOUNCEMENTS') {
                    await handleCommunityAnnouncements(user)
                } else if (params[0] === 'EVENTS') {
                    await handleCommunityEvents(user)
                } else {
                    await handleCommunity(user)
                }
                break
            case 'PAYMENT':
                if (params[0] === 'CONFIRM') {
                    await handlePaymentConfirm(user)
                } else if (params[0] === 'INFO') {
                    await handlePaymentInfo(user)
                } else if (params[0] === 'EXTEND') {
                    await handlePaymentExtend(user)
                } else if (params[0] === 'HISTORY') {
                    await handlePaymentHistory(user)
                } else if (params[0] === 'GUIDE') {
                    await handlePaymentGuide(user)
                } else if (params[0] === 'SUBMIT') {
                    await handlePaymentSubmit(user)
                } else if (params[0] === 'PACKAGE') {
                    const packageType = params.slice(1).join('_')
                    await handlePaymentPackage(user, packageType)
                } else if (params[0] === 'UPLOAD' && params[1] === 'RECEIPT') {
                    await handlePaymentUploadReceipt(user)
                } else {
                    await handlePayment(user)
                }
                break
            case 'HOROSCOPE':
                if (params[0] === 'DETAIL') {
                    await handleHoroscopeDetail(user)
                } else if (params[0] === 'WEEK') {
                    await handleHoroscopeWeek(user)
                } else if (params[0] === 'MONTH') {
                    await handleHoroscopeMonth(user)
                } else if (params[0] === 'TOMORROW') {
                    await handleHoroscopeTomorrow(user)
                } else {
                    await handleHoroscope(user)
                }
                break
            case 'POINTS':
                if (params[0] === 'REWARDS') {
                    if (params[1] === 'DISCOUNT') {
                        await handlePointsRewardsDiscount(user)
                    } else if (params[1] === 'BADGES') {
                        await handlePointsRewardsBadges(user)
                    } else if (params[1] === 'GIFTS') {
                        await handlePointsRewardsGifts(user)
                    } else if (params[1] === 'GAMES') {
                        await handlePointsRewardsGames(user)
                    }
                } else if (params[0] === 'HISTORY') {
                    await handlePointsHistory(user)
                } else if (params[0] === 'ACHIEVEMENTS') {
                    await handlePointsAchievements(user)
                } else if (params[0] === 'LEADERBOARD') {
                    await handlePointsLeaderboard(user)
                } else if (params[0] === 'REDEEM') {
                    await handlePointsRedeem(user)
                } else {
                    await handlePoints(user)
                }
                break
            case 'SETTINGS':
                await handleSettings(user)
                break
            case 'SUPPORT':
                await handleSupport(user)
                break
            case 'INFO':
                await handleInfo(user)
                break
            case 'MAIN_MENU':
                await showMainMenu(user)
                break
            case 'VERIFY':
                if (params[0] === 'BIRTHDAY') {
                    await handleBirthdayVerification(user)
                }
                break
            case 'CANCEL':
                if (params[0] === 'REGISTRATION') {
                    await sendMessage(user.facebook_id, 'Đăng ký đã bị hủy. Bạn có thể đăng ký lại bất cứ lúc nào!')
                    await showMainMenu(user)
                }
                break
            case 'REG':
                if (params[0] === 'LOCATION') {
                    const location = params.slice(1).join('_')
                    await handleRegistrationLocationPostback(user, location)
                }
                break
            case 'VERIFY':
                if (params[0] === 'BIRTHDAY') {
                    await handleBirthdayVerification(user)
                }
                break
            case 'REJECT':
                if (params[0] === 'BIRTHDAY') {
                    await handleBirthdayRejection(user)
                }
                break
            case 'BUY':
                if (params[0] === 'SELL') {
                    await handleBuySell(user)
                }
                break
            case 'SEARCH':
                if (params[0] === 'UPDATE') {
                    await handleSearchUpdate(user)
                }
                break
            case 'SUPPORT':
                if (params[0] === 'ADMIN') {
                    await handleSupportAdmin(user)
                } else if (params[0] === 'BOT') {
                    await handleSupportBot(user)
                }
                break
            case 'ADMIN':
                if (params[0] === 'PAYMENTS') {
                    await handleAdminPayments(user)
                } else if (params[0] === 'USERS') {
                    await handleAdminUsers(user)
                } else if (params[0] === 'LISTINGS') {
                    await handleAdminListings(user)
                } else if (params[0] === 'STATS') {
                    await handleAdminStats(user)
                } else if (params[0] === 'EXPORT') {
                    await handleAdminExport(user)
                } else if (params[0] === 'NOTIFICATIONS') {
                    await handleAdminNotifications(user)
                } else if (params[0] === 'APPROVE' && params[1] === 'PAYMENT') {
                    await handleAdminApprovePayment(user, params[2])
                } else if (params[0] === 'REJECT' && params[1] === 'PAYMENT') {
                    await handleAdminRejectPayment(user, params[2])
                } else if (params[0] === 'VIEW' && params[1] === 'PAYMENT') {
                    await handleAdminViewPayment(user, params[2])
                } else if (params[0] === 'ALL' && params[1] === 'PAYMENTS') {
                    await handleAdminAllPayments(user)
                } else if (params[0] === 'SEARCH' && params[1] === 'USER') {
                    await handleAdminSearchUser(user)
                } else if (params[0] === 'ALL' && params[1] === 'USERS') {
                    await handleAdminAllUsers(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'USERS') {
                    await handleAdminExportUsers(user)
                } else if (params[0] === 'VIOLATIONS') {
                    await handleAdminViolations(user)
                } else if (params[0] === 'SEND' && params[1] === 'NOTIFICATION') {
                    await handleAdminSendNotification(user)
                } else if (params[0] === 'MODERATE' && params[1] === 'LISTINGS') {
                    await handleAdminModerateListings(user)
                } else if (params[0] === 'ALL' && params[1] === 'LISTINGS') {
                    await handleAdminAllListings(user)
                } else if (params[0] === 'FEATURED' && params[1] === 'LISTINGS') {
                    await handleAdminFeaturedListings(user)
                } else if (params[0] === 'SEARCH' && params[1] === 'LISTINGS') {
                    await handleAdminSearchListings(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'LISTINGS') {
                    await handleAdminExportListings(user)
                } else if (params[0] === 'DETAILED' && params[1] === 'STATS') {
                    await handleAdminDetailedStats(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'COMPREHENSIVE') {
                    await handleAdminExportComprehensive(user)
                } else if (params[0] === 'EXPORT' && params[1] === 'BY' && params[2] === 'DATE') {
                    await handleAdminExportByDate(user)
                } else if (params[0] === 'SEND' && params[1] === 'GENERAL') {
                    await handleAdminSendGeneral(user)
                } else if (params[0] === 'SEND' && params[1] === 'USER') {
                    await handleAdminSendUser(user)
                } else if (params[0] === 'SEND' && params[1] === 'LISTING') {
                    await handleAdminSendListing(user)
                } else if (params[0] === 'NOTIFICATION' && params[1] === 'HISTORY') {
                    await handleAdminNotificationHistory(user)
                } else if (params[0] === 'NOTIFICATION' && params[1] === 'SETTINGS') {
                    await handleAdminNotificationSettings(user)
                }
                break
            default:
                await handleDefaultMessage(user)
        }
    } catch (error) {
        console.error('Error handling postback:', error)
        if (user && user.facebook_id) {
            await sendMessage(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }
}

// Handle admin commands
export async function handleAdminCommand(user: any) {
    // Check if user is admin (you can add admin check here)
    // For now, we'll allow any user to access admin for testing
    if (!user) {
        await sendMessage(user.facebook_id, 'Bạn cần đăng ký để sử dụng chức năng admin!')
        return
    }

    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        '🔧 ADMIN DASHBOARD\n\nChào admin! 👋',
        'Bạn muốn quản lý gì?'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Quản lý hệ thống:',
        [
            createPostbackButton('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
            createPostbackButton('👥 USER', 'ADMIN_USERS'),
            createPostbackButton('🛒 TIN ĐĂNG', 'ADMIN_LISTINGS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thống kê và báo cáo:',
        [
            createPostbackButton('📊 THỐNG KÊ', 'ADMIN_STATS'),
            createPostbackButton('📤 XUẤT', 'ADMIN_EXPORT'),
            createPostbackButton('🔔 THÔNG BÁO', 'ADMIN_NOTIFICATIONS')
        ]
    )
}

// Handle payment receipt
export async function handlePaymentReceipt(user: any, imageUrl: string) {
    try {
        // Save payment with receipt
        const { error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: user.id,
                amount: BOT_CONFIG.DAILY_FEE * BOT_CONFIG.MINIMUM_DAYS,
                receipt_image: imageUrl,
                status: 'pending'
            })

        if (error) {
            throw error
        }

        await sendMessage(
            user.facebook_id,
            '✅ BIÊN LAI ĐÃ NHẬN\n\n📸 Biên lai đã được lưu:\n• Số tiền: 7,000đ\n• Thời gian: ' + new Date().toLocaleString('vi-VN') + '\n• Trạng thái: Đang xử lý...\n\n⏱️ Thời gian xử lý: 2-4 giờ\n📱 Sẽ thông báo khi duyệt'
        )

        // Reset bot session
        await updateBotSession(user.id, {})
    } catch (error) {
        console.error('Error handling payment receipt:', error)
        if (user && user.facebook_id) {
            await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xử lý biên lai. Vui lòng thử lại!')
        }
    }
}

// Handle final verification
export async function handleFinalVerification(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🎉 HOÀN THÀNH ĐĂNG KÝ!\n\n✅ Thông tin của bạn đã được lưu:\n• Họ tên: ' + user.name + '\n• SĐT: ' + user.phone + '\n• Địa điểm: ' + user.location,
        '🔐 XÁC MINH CUỐI CÙNG\n\nĐể hoàn tất đăng ký, vui lòng xác nhận bạn là thành viên cộng đồng Tân Dậu 1981.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn có xác nhận mình là thành viên Tân Dậu 1981 không?',
        [
            createPostbackButton('✅ XÁC MINH', 'VERIFY_BIRTHDAY'),
            createPostbackButton('❌ HỦY', 'CANCEL_REGISTRATION')
        ]
    )
}


// Handle listing images
export async function handleListingImages(user: any, imageUrl?: string) {
    try {
        const session = await getBotSession(user.id)
        if (!session) return

        const sessionData = session.session_data || {}
        const images = sessionData.images || []
        images.push(imageUrl)

        await updateBotSession(user.id, {
            ...sessionData,
            images: images
        })

        await sendMessage(
            user.facebook_id,
            `✅ Đã nhận ${images.length} ảnh\n\n📸 Bạn có thể gửi thêm ảnh hoặc bỏ qua để tiếp tục\n\n[📷 Chụp ảnh] [📁 Chọn từ thư viện] [⏭️ Bỏ qua]`
        )
    } catch (error) {
        console.error('Error handling listing images:', error)
        if (user && user.facebook_id) {
            await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại!')
        }
    }
}

// Show main menu
async function showMainMenu(user: any) {
    await sendTypingIndicator(user.facebook_id)
    const statusText = isTrialUser(user.membership_expires_at)
        ? `Trial ${daysUntilExpiry(user.membership_expires_at!)} ngày`
        : 'Đã thanh toán'

    await sendButtonTemplate(
        user.facebook_id,
        `🏠 TRANG CHỦ TÂN DẬU\n\nChào anh/chị ${user.name}! 👋\n\n📊 Trạng thái: ${statusText}\n⭐ Điểm: 150 sao | Level: ${calculateUserLevel(150)}\n🎂 Sinh nhật: 1981 (42 tuổi)`,
        [
            createPostbackButton('🛒 NIÊM YẾT', 'LISTING'),
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('💬 KẾT NỐI', 'CONNECT')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm chức năng:',
        [
            createPostbackButton('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT'),
            createPostbackButton('⭐ ĐIỂM THƯỞNG', 'POINTS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn khác:',
        [
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'SETTINGS')
        ]
    )
}

// Handle registration step by step
async function handleRegistrationStep(user: any, text: string, session: any) {
    const step = session.current_step || 1
    const data = session.data || {}

    switch (step) {
        case 1: // Name
            await handleRegistrationName(user, text, data)
            break
        case 2: // Phone
            await handleRegistrationPhone(user, text, data)
            break
        case 3: // Location
            await handleRegistrationLocation(user, text, data)
            break
        case 4: // Birthday verification
            await handleRegistrationBirthday(user, text, data)
            break
        default:
            await handleRegistration(user)
    }
}

// Handle registration name step
async function handleRegistrationName(user: any, text: string, data: any) {
    if (text.length < 2) {
        await sendMessage(user.facebook_id, 'Tên quá ngắn! Vui lòng nhập họ tên đầy đủ.')
        return
    }

    data.name = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Họ tên: ${data.name}`,
        'Bước 2/4: Số điện thoại\n📱 Vui lòng nhập số điện thoại của bạn:\n\nVD: 0123456789'
    ])

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        current_step: 2,
        data: data
    })
}

// Handle registration phone step
async function handleRegistrationPhone(user: any, text: string, data: any) {
    const phone = text.replace(/\D/g, '') // Remove non-digits

    if (phone.length < 10 || phone.length > 11) {
        await sendMessage(user.facebook_id, 'Số điện thoại không hợp lệ! Vui lòng nhập lại.')
        return
    }

    data.phone = phone

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ SĐT: ${data.phone}`,
        'Bước 3/4: Vị trí\n📍 Vui lòng chọn tỉnh/thành bạn đang sinh sống:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn vị trí:',
        [
            createPostbackButton('🏠 HÀ NỘI', 'REG_LOCATION_HÀ NỘI'),
            createPostbackButton('🏢 TP.HCM', 'REG_LOCATION_TP.HCM'),
            createPostbackButton('🏖️ ĐÀ NẴNG', 'REG_LOCATION_ĐÀ NẴNG')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm tùy chọn:',
        [
            createPostbackButton('🌊 HẢI PHÒNG', 'REG_LOCATION_HẢI PHÒNG'),
            createPostbackButton('🏔️ CẦN THƠ', 'REG_LOCATION_CẦN THƠ'),
            createPostbackButton('🌾 AN GIANG', 'REG_LOCATION_AN GIANG')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn khác:',
        [
            createPostbackButton('🏞️ KHÁC...', 'REG_LOCATION_OTHER')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        current_step: 3,
        data: data
    })
}

// Handle registration location step
async function handleRegistrationLocation(user: any, text: string, data: any) {
    // This will be handled by postback, but we can also handle text input
    if (text.length < 2) {
        await sendMessage(user.facebook_id, 'Vui lòng chọn vị trí từ danh sách bên dưới.')
        return
    }

    data.location = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Vị trí: ${data.location}`,
        'Bước 4/4: Xác nhận tuổi\n🎂 Đây là bước quan trọng nhất!',
        'Bot Tân Dậu 1981 được tạo ra dành riêng cho cộng đồng Tân Dậu 1981.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        '❓ Bạn có phải sinh năm 1981 không?',
        [
            createPostbackButton('✅ CÓ - TÔI SINH NĂM 1981', 'VERIFY_BIRTHDAY'),
            createPostbackButton('❌ KHÔNG - TÔI SINH NĂM KHÁC', 'REJECT_BIRTHDAY')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        current_step: 4,
        data: data
    })
}

// Handle registration birthday step
async function handleRegistrationBirthday(user: any, text: string, data: any) {
    // This will be handled by postback buttons
    await sendMessage(user.facebook_id, 'Vui lòng chọn từ các nút bên dưới.')
}

// Handle registration location postback
async function handleRegistrationLocationPostback(user: any, location: string) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu đăng ký lại.')
        return
    }

    const data = session.data || {}
    data.location = location

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Vị trí: ${location}`,
        'Bước 4/4: Xác nhận tuổi\n🎂 Đây là bước quan trọng nhất!',
        'Bot Tân Dậu 1981 được tạo ra dành riêng cho cộng đồng Tân Dậu 1981.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        '❓ Bạn có phải sinh năm 1981 không?',
        [
            createPostbackButton('✅ CÓ - TÔI SINH NĂM 1981', 'VERIFY_BIRTHDAY'),
            createPostbackButton('❌ KHÔNG - TÔI SINH NĂM KHÁC', 'REJECT_BIRTHDAY')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'registration',
        current_step: 4,
        data: data
    })
}

// Handle birthday verification
async function handleBirthdayVerification(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'registration') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu đăng ký lại.')
        return
    }

    const data = session.data || {}

    try {
        // Create user in database
        const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
                facebook_id: user.facebook_id,
                name: data.name,
                phone: data.phone,
                location: data.location,
                birthday: 1981,
                status: 'trial',
                membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days trial
                referral_code: `TD1981-${user.facebook_id.slice(-6)}`
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        // Clear registration session
        await updateBotSession(user.facebook_id, {
            current_flow: null,
            current_step: null,
            data: {}
        })

        // Send success message
        await sendMessagesWithTyping(user.facebook_id, [
            '🎉 XÁC NHẬN THÀNH CÔNG!',
            '✅ Chào mừng anh/chị Tân Dậu 1981!\n👥 Bạn đã gia nhập cộng đồng Tân Dậu - hỗ trợ chéo',
            `📱 Thông tin tài khoản:\n• Họ tên: ${data.name}\n• SĐT: ${data.phone}\n• Vị trí: ${data.location}\n• Sinh nhật: 1981 (42 tuổi)\n• Mã giới thiệu: TD1981-${user.facebook_id.slice(-6)}`,
            '🎯 Trial 3 ngày miễn phí đã được kích hoạt\n⏰ Hết hạn: ' + new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🏠 VÀO TRANG CHỦ', 'MAIN_MENU'),
                createPostbackButton('💬 HỖ TRỢ', 'SUPPORT_ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error creating user:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại sau!')
    }
}

// Handle birthday rejection
async function handleBirthdayRejection(user: any) {
    // Clear registration session
    await updateBotSession(user.facebook_id, {
        current_flow: null,
        current_step: null,
        data: {}
    })

    await sendMessagesWithTyping(user.facebook_id, [
        '⚠️ THÔNG BÁO QUAN TRỌNG',
        'Bot Tân Dậu 1981 được tạo ra dành riêng cho cộng đồng Tân Dậu 1981.',
        '🎯 Mục đích:\n• Kết nối mua bán trong cộng đồng cùng tuổi\n• Chia sẻ kinh nghiệm và kỷ niệm\n• Hỗ trợ lẫn nhau trong cuộc sống',
        '💡 Nếu bạn không phải Tân Dậu 1981:\n• Có thể sử dụng các platform khác\n• Hoặc giới thiệu cho bạn bè Tân Dậu 1981'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔄 CHỌN LẠI 1981', 'VERIFY_BIRTHDAY'),
            createPostbackButton('❌ THOÁT', 'MAIN_MENU')
        ]
    )
}

// Handle registration
async function handleRegistration(user: any) {
    if (user.status !== 'trial' && user.status !== 'active') {
        await sendMessagesWithTyping(user.facebook_id, [
            '📝 ĐĂNG KÝ THÀNH VIÊN\n\nChào bạn! Tôi sẽ hướng dẫn bạn đăng ký từng bước.',
            'Bước 1/4: Họ tên\n👤 Vui lòng nhập họ tên đầy đủ của bạn:\n\nVD: Đinh Khánh Tùng'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Hoặc chọn:',
            [
                createPostbackButton('❌ HỦY ĐĂNG KÝ', 'CANCEL_REGISTRATION')
            ]
        )

        await updateBotSession(user.facebook_id, {
            current_flow: 'registration',
            current_step: 1,
            data: {}
        })
    } else {
        await sendMessage(user.facebook_id, 'Bạn đã đăng ký rồi! Sử dụng menu bên dưới để tiếp tục.')
        await showMainMenu(user)
    }
}

// Handle listing
async function handleListing(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🛒 NIÊM YẾT SẢN PHẨM/DỊCH VỤ\n\nChọn loại tin đăng bạn muốn đăng:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Danh mục chính:',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'LISTING_CATEGORY_BẤT ĐỘNG SẢN'),
            createPostbackButton('🚗 Ô TÔ', 'LISTING_CATEGORY_Ô TÔ'),
            createPostbackButton('📱 ĐIỆN TỬ', 'LISTING_CATEGORY_ĐIỆN TỬ')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Danh mục khác:',
        [
            createPostbackButton('👕 THỜI TRANG', 'LISTING_CATEGORY_THỜI TRANG'),
            createPostbackButton('🍽️ ẨM THỰC', 'LISTING_CATEGORY_ẨM THỰC'),
            createPostbackButton('🔧 DỊCH VỤ', 'LISTING_CATEGORY_DỊCH VỤ')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📋 XEM TIN ĐÃ ĐĂNG', 'MY_LISTINGS'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle search
async function handleSearch(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '🔍 TÌM KIẾM SẢN PHẨM/DỊCH VỤ\n\nBạn muốn tìm gì?',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'SEARCH_CATEGORY_BẤT ĐỘNG SẢN'),
            createPostbackButton('🚗 Ô TÔ', 'SEARCH_CATEGORY_Ô TÔ'),
            createPostbackButton('📱 ĐIỆN TỬ', 'SEARCH_CATEGORY_ĐIỆN TỬ')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm danh mục tìm kiếm:',
        [
            createPostbackButton('👕 THỜI TRANG', 'SEARCH_CATEGORY_THỜI TRANG'),
            createPostbackButton('🍽️ ẨM THỰC', 'SEARCH_CATEGORY_ẨM THỰC'),
            createPostbackButton('🔧 DỊCH VỤ', 'SEARCH_CATEGORY_DỊCH VỤ')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tìm kiếm nâng cao:',
        [
            createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
            createPostbackButton('🔍 TÌM THEO TỪ KHÓA', 'SEARCH_KEYWORD')
        ]
    )
}

// Handle search category selection
async function handleSearchCategory(user: any, category: string) {
    await sendMessagesWithTyping(user.facebook_id, [
        `🔍 TÌM KIẾM: ${category}\n\n✅ Đã chọn danh mục: ${category}`,
        '📍 Bước tiếp theo: Chọn vị trí tìm kiếm'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn vị trí tìm kiếm:',
        [
            createPostbackButton('🏙️ HÀ NỘI', 'SEARCH_LOCATION_HÀ NỘI'),
            createPostbackButton('🌆 TP.HCM', 'SEARCH_LOCATION_TP.HCM'),
            createPostbackButton('🏘️ ĐÀ NẴNG', 'SEARCH_LOCATION_ĐÀ NẴNG')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🌍 TẤT CẢ VỊ TRÍ', 'SEARCH_ALL_LOCATIONS'),
            createPostbackButton('🔙 CHỌN LẠI DANH MỤC', 'SEARCH')
        ]
    )

    // Store search session
    await updateBotSession(user.facebook_id, {
        current_flow: 'search',
        current_step: 1,
        data: { category: category }
    })
}

// Handle search advanced
async function handleSearchAdvanced(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🎯 TÌM KIẾM NÂNG CAO\n\nChọn tiêu chí tìm kiếm:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tìm theo:',
        [
            createPostbackButton('💰 GIÁ', 'SEARCH_BY_PRICE'),
            createPostbackButton('⭐ ĐÁNH GIÁ', 'SEARCH_BY_RATING'),
            createPostbackButton('📅 NGÀY ĐĂNG', 'SEARCH_BY_DATE')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔍 TÌM THEO TỪ KHÓA', 'SEARCH_KEYWORD'),
            createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
        ]
    )
}

// Handle search keyword
async function handleSearchKeyword(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM THEO TỪ KHÓA\n\nNhập từ khóa bạn muốn tìm:\n\nVD: "nhà 3 tầng", "xe honda", "điện thoại samsung"'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('🎯 TÌM KIẾM NÂNG CAO', 'SEARCH_ADVANCED'),
            createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
        ]
    )

    // Store search session for keyword input
    await updateBotSession(user.facebook_id, {
        current_flow: 'search',
        current_step: 0,
        data: { type: 'keyword' }
    })
}

// Handle buy & sell for new users
async function handleBuySell(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🛒 MUA BÁN & TÌM KIẾM\n\nChào mừng bạn đến với cộng đồng Tân Dậu 1981!',
        'Để sử dụng đầy đủ tính năng mua bán, bạn cần đăng ký thành viên trước.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn:',
        [
            createPostbackButton('📝 ĐĂNG KÝ NGAY', 'REGISTER'),
            createPostbackButton('🔍 XEM TRƯỚC', 'SEARCH'),
            createPostbackButton('❓ HỎI THÊM', 'SUPPORT_ADMIN')
        ]
    )
}

// Handle search & update for registered users
async function handleSearchUpdate(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM KIẾM & CẬP NHẬT\n\nChọn chức năng bạn muốn:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tìm kiếm:',
        [
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('🛒 NIÊM YẾT', 'LISTING'),
            createPostbackButton('👥 CỘNG ĐỒNG', 'COMMUNITY')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Cập nhật:',
        [
            createPostbackButton('⚙️ CÀI ĐẶT', 'SETTINGS'),
            createPostbackButton('⭐ ĐIỂM THƯỞNG', 'POINTS'),
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE')
        ]
    )
}

// Handle support admin
async function handleSupportAdmin(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '👨‍💼 CHAT VỚI ADMIN\n\nAdmin sẽ hỗ trợ bạn trong thời gian sớm nhất!',
        'Trong khi chờ đợi, bạn có thể:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📝 ĐĂNG KÝ', 'REGISTER'),
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Admin: Handle payments
async function handleAdminPayments(user: any) {
    try {
        // Get pending payments
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('*, users(name, phone)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            throw error
        }

        if (payments && payments.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 THANH TOÁN CHỜ DUYỆT\n\nDanh sách thanh toán cần xử lý:'
            ])

            for (let i = 0; i < payments.length; i++) {
                const payment = payments[i]
                const userInfo = payment.users

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${userInfo?.name || 'N/A'} - ${formatCurrency(payment.amount)}\n📅 ${new Date(payment.created_at).toLocaleDateString('vi-VN')} ${new Date(payment.created_at).toLocaleTimeString('vi-VN')}\n📱 ${userInfo?.phone || 'N/A'}`,
                    [
                        createPostbackButton('✅ DUYỆT', `ADMIN_APPROVE_PAYMENT_${payment.id}`),
                        createPostbackButton('❌ TỪ CHỐI', `ADMIN_REJECT_PAYMENT_${payment.id}`),
                        createPostbackButton('👀 XEM', `ADMIN_VIEW_PAYMENT_${payment.id}`)
                    ]
                )
            }

            await sendButtonTemplate(
                user.facebook_id,
                'Tùy chọn khác:',
                [
                    createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                    createPostbackButton('🔄 MỚI', 'ADMIN_PAYMENTS'),
                    createPostbackButton('🔙 ADMIN', 'ADMIN')
                ]
            )
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 THANH TOÁN CHỜ DUYỆT\n\n✅ Không có thanh toán nào chờ duyệt!'
            ])

            await sendButtonTemplate(
                user.facebook_id,
                'Tùy chọn:',
                [
                    createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                    createPostbackButton('🔄 MỚI', 'ADMIN_PAYMENTS'),
                    createPostbackButton('🔙 ADMIN', 'ADMIN')
                ]
            )
        }
    } catch (error) {
        console.error('Error handling admin payments:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách thanh toán!')
    }
}

// Admin: Handle users
async function handleAdminUsers(user: any) {
    try {
        // Get user statistics
        const { data: stats, error: statsError } = await supabaseAdmin
            .from('users')
            .select('status')

        if (statsError) throw statsError

        const totalUsers = stats?.length || 0
        const activeUsers = stats?.filter(u => u.status === 'active').length || 0
        const trialUsers = stats?.filter(u => u.status === 'trial').length || 0
        const expiredUsers = stats?.filter(u => u.status === 'expired').length || 0

        await sendMessagesWithTyping(user.facebook_id, [
            '👥 QUẢN LÝ USER\n\n📊 Thống kê tổng quan:',
            `• Tổng user: ${totalUsers}\n• Active: ${activeUsers}\n• Trial: ${trialUsers}\n• Expired: ${expiredUsers}`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createPostbackButton('🔍 TÌM USER', 'ADMIN_SEARCH_USER'),
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_USERS'),
                createPostbackButton('📤 XUẤT', 'ADMIN_EXPORT_USERS')
            ]
        )

        await sendButtonTemplate(
            user.facebook_id,
            'Quản lý:',
            [
                createPostbackButton('⚠️ USER VI PHẠM', 'ADMIN_VIOLATIONS'),
                createPostbackButton('🔔 GỬI THÔNG BÁO', 'ADMIN_SEND_NOTIFICATION'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin users:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thông tin user!')
    }
}

// Admin: Handle listings
async function handleAdminListings(user: any) {
    try {
        // Get listing statistics
        const { data: stats, error: statsError } = await supabaseAdmin
            .from('listings')
            .select('status')

        if (statsError) throw statsError

        const totalListings = stats?.length || 0
        const activeListings = stats?.filter(l => l.status === 'active').length || 0
        const pendingListings = stats?.filter(l => l.status === 'pending').length || 0
        const featuredListings = 0 // TODO: Add is_featured field to listings table

        await sendMessagesWithTyping(user.facebook_id, [
            '🛒 QUẢN LÝ TIN ĐĂNG\n\n📊 Thống kê:',
            `• Tổng tin: ${totalListings}\n• Active: ${activeListings}\n• Pending: ${pendingListings}\n• Featured: ${featuredListings}`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Chọn chức năng:',
            [
                createPostbackButton('⚠️ KIỂM DUYỆT', 'ADMIN_MODERATE_LISTINGS'),
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_LISTINGS'),
                createPostbackButton('⭐ FEATURED', 'ADMIN_FEATURED_LISTINGS')
            ]
        )

        await sendButtonTemplate(
            user.facebook_id,
            'Quản lý:',
            [
                createPostbackButton('🔍 TÌM KIẾM', 'ADMIN_SEARCH_LISTINGS'),
                createPostbackButton('📤 XUẤT', 'ADMIN_EXPORT_LISTINGS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thông tin tin đăng!')
    }
}

// Admin: Handle statistics
async function handleAdminStats(user: any) {
    try {
        // Get comprehensive statistics
        const [usersResult, listingsResult, paymentsResult] = await Promise.all([
            supabaseAdmin.from('users').select('status, created_at'),
            supabaseAdmin.from('listings').select('status, created_at'),
            supabaseAdmin.from('payments').select('amount, status, created_at')
        ])

        const users = usersResult.data || []
        const listings = listingsResult.data || []
        const payments = paymentsResult.data || []

        // Calculate stats
        const totalUsers = users.length
        const activeUsers = users.filter(u => u.status === 'active').length
        const trialUsers = users.filter(u => u.status === 'trial').length
        const paidUsers = users.filter(u => u.status === 'active').length

        const totalListings = listings.length
        const activeListings = listings.filter(l => l.status === 'active').length
        const featuredListings = 0 // TODO: Add is_featured field to listings table

        const totalRevenue = payments
            .filter(p => p.status === 'approved')
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        const todayRevenue = payments
            .filter(p => p.status === 'approved' && new Date(p.created_at).toDateString() === new Date().toDateString())
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const thisWeekRevenue = payments
            .filter(p => p.status === 'approved' && new Date(p.created_at) >= weekAgo)
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        await sendMessagesWithTyping(user.facebook_id, [
            '📊 THỐNG KÊ TỔNG QUAN\n\n📈 Dữ liệu real-time:'
        ])

        await sendMessagesWithTyping(user.facebook_id, [
            '👥 USERS:\n• Tổng: ' + totalUsers + '\n• Active: ' + activeUsers + '\n• Trial: ' + trialUsers + '\n• Paid: ' + paidUsers
        ])

        await sendMessagesWithTyping(user.facebook_id, [
            '🛒 TIN ĐĂNG:\n• Tổng: ' + totalListings + '\n• Active: ' + activeListings + '\n• Featured: ' + featuredListings
        ])

        await sendMessagesWithTyping(user.facebook_id, [
            '💰 DOANH THU:\n• Hôm nay: ' + formatCurrency(todayRevenue) + '\n• Tuần này: ' + formatCurrency(thisWeekRevenue) + '\n• Tổng: ' + formatCurrency(totalRevenue)
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📈 XEM', 'ADMIN_DETAILED_STATS'),
                createPostbackButton('📤 XUẤT', 'ADMIN_EXPORT'),
                createPostbackButton('🔄 MỚI', 'ADMIN_STATS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin stats:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thống kê!')
    }
}

// Admin: Handle export
async function handleAdminExport(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📤 XUẤT BÁO CÁO\n\nChọn loại báo cáo muốn xuất:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Báo cáo:',
        [
            createPostbackButton('👥 BÁO CÁO USER', 'ADMIN_EXPORT_USERS'),
            createPostbackButton('🛒 BÁO CÁO TIN ĐĂNG', 'ADMIN_EXPORT_LISTINGS'),
            createPostbackButton('💰 BÁO CÁO THANH TOÁN', 'ADMIN_EXPORT_PAYMENTS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 BÁO CÁO TỔNG HỢP', 'ADMIN_EXPORT_COMPREHENSIVE'),
            createPostbackButton('📅 BÁO CÁO THEO NGÀY', 'ADMIN_EXPORT_BY_DATE'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Handle notifications
async function handleAdminNotifications(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔔 QUẢN LÝ THÔNG BÁO\n\nChọn loại thông báo:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Gửi thông báo:',
        [
            createPostbackButton('📢 THÔNG BÁO CHUNG', 'ADMIN_SEND_GENERAL'),
            createPostbackButton('👥 THÔNG BÁO USER', 'ADMIN_SEND_USER'),
            createPostbackButton('🛒 THÔNG BÁO TIN ĐĂNG', 'ADMIN_SEND_LISTING')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📋 LỊCH SỬ', 'ADMIN_NOTIFICATION_HISTORY'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'ADMIN_NOTIFICATION_SETTINGS'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Approve payment
async function handleAdminApprovePayment(user: any, paymentId: string) {
    try {
        // Get payment details
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*, users(name, phone, facebook_id)')
            .eq('id', paymentId)
            .single()

        if (fetchError || !payment) {
            await sendMessage(user.facebook_id, 'Không tìm thấy thanh toán!')
            return
        }

        // Update payment status
        const { error: updateError } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user.facebook_id
            })
            .eq('id', paymentId)

        if (updateError) {
            throw updateError
        }

        // Extend user membership
        const membershipExpiresAt = new Date()
        membershipExpiresAt.setDate(membershipExpiresAt.getDate() + 7) // 7 days

        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({
                status: 'active',
                membership_expires_at: membershipExpiresAt.toISOString()
            })
            .eq('id', payment.user_id)

        if (userError) {
            console.error('Error updating user membership:', userError)
        }

        // Notify user
        await sendMessagesWithTyping(payment.users.facebook_id, [
            '✅ THANH TOÁN ĐÃ ĐƯỢC DUYỆT!',
            `💰 Thông tin thanh toán:\n• Số tiền: ${formatCurrency(payment.amount)}\n• Thời gian duyệt: ${new Date().toLocaleString('vi-VN')}\n• Gói dịch vụ: 7 ngày`,
            '🎉 Tài khoản của bạn đã được gia hạn đến ' + membershipExpiresAt.toLocaleDateString('vi-VN'),
            '🎯 Cảm ơn bạn đã tin tưởng BOT TÂN DẬU 1981!'
        ])

        await sendButtonTemplate(
            payment.users.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU'),
                createPostbackButton('💬 HỖ TRỢ', 'SUPPORT_ADMIN')
            ]
        )

        // Confirm to admin
        await sendMessagesWithTyping(user.facebook_id, [
            '✅ ĐÃ DUYỆT THANH TOÁN',
            `💰 ${payment.users.name} - ${formatCurrency(payment.amount)}\n⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n🎉 Tài khoản đã được gia hạn`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createPostbackButton('🔄 MỚI', 'ADMIN_PAYMENTS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error approving payment:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi duyệt thanh toán!')
    }
}

// Admin: Reject payment
async function handleAdminRejectPayment(user: any, paymentId: string) {
    try {
        // Get payment details
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*, users(name, phone, facebook_id)')
            .eq('id', paymentId)
            .single()

        if (fetchError || !payment) {
            await sendMessage(user.facebook_id, 'Không tìm thấy thanh toán!')
            return
        }

        // Update payment status
        const { error: updateError } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: user.facebook_id
            })
            .eq('id', paymentId)

        if (updateError) {
            throw updateError
        }

        // Notify user
        await sendMessagesWithTyping(payment.users.facebook_id, [
            '❌ THANH TOÁN BỊ TỪ CHỐI',
            `💰 Thông tin thanh toán:\n• Số tiền: ${formatCurrency(payment.amount)}\n• Thời gian từ chối: ${new Date().toLocaleString('vi-VN')}`,
            '💬 Vui lòng liên hệ admin để được hỗ trợ'
        ])

        await sendButtonTemplate(
            payment.users.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                createPostbackButton('💰 THANH TOÁN LẠI', 'PAYMENT'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Confirm to admin
        await sendMessagesWithTyping(user.facebook_id, [
            '❌ ĐÃ TỪ CHỐI THANH TOÁN',
            `💰 ${payment.users.name} - ${formatCurrency(payment.amount)}\n⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createPostbackButton('🔄 MỚI', 'ADMIN_PAYMENTS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error rejecting payment:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi từ chối thanh toán!')
    }
}

// Admin: View payment details
async function handleAdminViewPayment(user: any, paymentId: string) {
    try {
        // Get payment details
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*, users(name, phone, facebook_id)')
            .eq('id', paymentId)
            .single()

        if (fetchError || !payment) {
            await sendMessage(user.facebook_id, 'Không tìm thấy thanh toán!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '👀 CHI TIẾT THANH TOÁN',
            `💰 Số tiền: ${formatCurrency(payment.amount)}\n👤 User: ${payment.users.name}\n📱 SĐT: ${payment.users.phone}\n📅 Ngày tạo: ${new Date(payment.created_at).toLocaleString('vi-VN')}\n📊 Trạng thái: ${payment.status}`
        ])

        if (payment.receipt_image) {
            await sendMessage(user.facebook_id, '📸 Biên lai: ' + payment.receipt_image)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Hành động:',
            [
                createPostbackButton('✅ DUYỆT', `ADMIN_APPROVE_PAYMENT_${paymentId}`),
                createPostbackButton('❌ TỪ CHỐI', `ADMIN_REJECT_PAYMENT_${paymentId}`),
                createPostbackButton('🔙 VỀ DANH SÁCH', 'ADMIN_PAYMENTS')
            ]
        )
    } catch (error) {
        console.error('Error viewing payment:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xem chi tiết thanh toán!')
    }
}

// Admin: All payments
async function handleAdminAllPayments(user: any) {
    try {
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('*, users(name, phone)')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error

        await sendMessagesWithTyping(user.facebook_id, [
            '💰 TẤT CẢ THANH TOÁN\n\nDanh sách 20 thanh toán gần nhất:'
        ])

        for (let i = 0; i < payments.length; i++) {
            const payment = payments[i]
            const status = payment.status === 'approved' ? '✅' : payment.status === 'rejected' ? '❌' : '⏳'

            await sendButtonTemplate(
                user.facebook_id,
                `${i + 1}️⃣ ${status} ${payment.users?.name || 'N/A'} - ${formatCurrency(payment.amount)}\n📅 ${new Date(payment.created_at).toLocaleDateString('vi-VN')} ${new Date(payment.created_at).toLocaleTimeString('vi-VN')}\n📱 ${payment.users?.phone || 'N/A'}`,
                [
                    createPostbackButton('👀 XEM', `ADMIN_VIEW_PAYMENT_${payment.id}`),
                    createPostbackButton('📊 CHI TIẾT', `ADMIN_PAYMENT_DETAILS_${payment.id}`)
                ]
            )
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'ADMIN_ALL_PAYMENTS'),
                createPostbackButton('📤 XUẤT EXCEL', 'ADMIN_EXPORT_PAYMENTS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin all payments:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách thanh toán!')
    }
}

// Admin: Search user
async function handleAdminSearchUser(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM KIẾM USER\n\nChọn cách tìm kiếm:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tìm theo:',
        [
            createPostbackButton('👤 TÊN', 'ADMIN_SEARCH_USER_NAME'),
            createPostbackButton('📱 SỐ ĐIỆN THOẠI', 'ADMIN_SEARCH_USER_PHONE'),
            createPostbackButton('🆔 FACEBOOK ID', 'ADMIN_SEARCH_USER_FBID')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_USERS'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: All users
async function handleAdminAllUsers(user: any) {
    try {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error

        await sendMessagesWithTyping(user.facebook_id, [
            '👥 TẤT CẢ USER\n\nDanh sách 20 user gần nhất:'
        ])

        for (let i = 0; i < users.length; i++) {
            const u = users[i]
            const status = u.status === 'active' ? '✅' : u.status === 'trial' ? '⏳' : '❌'

            await sendButtonTemplate(
                user.facebook_id,
                `${i + 1}️⃣ ${status} ${u.name}\n📱 ${u.phone} | 📍 ${u.location}\n📅 ${new Date(u.created_at).toLocaleDateString('vi-VN')}`,
                [
                    createPostbackButton('👀 XEM', `ADMIN_VIEW_USER_${u.id}`),
                    createPostbackButton('✏️ SỬA', `ADMIN_EDIT_USER_${u.id}`),
                    createPostbackButton('⚠️ KHÓA', `ADMIN_BAN_USER_${u.id}`)
                ]
            )
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'ADMIN_ALL_USERS'),
                createPostbackButton('📤 XUẤT EXCEL', 'ADMIN_EXPORT_USERS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin all users:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách user!')
    }
}

// Admin: Export users
async function handleAdminExportUsers(user: any) {
    try {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        await sendMessagesWithTyping(user.facebook_id, [
            '📤 XUẤT BÁO CÁO USER\n\n✅ Đã tạo file CSV với ' + users.length + ' user',
            '📊 Dữ liệu bao gồm:\n• Thông tin cá nhân\n• Trạng thái tài khoản\n• Ngày tạo\n• Ngày hết hạn'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📧 GỬI EMAIL', 'ADMIN_SEND_EMAIL_USERS'),
                createPostbackButton('📱 GỬI QUA CHAT', 'ADMIN_SEND_CHAT_USERS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin export users:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xuất báo cáo user!')
    }
}

// Admin: Violations
async function handleAdminViolations(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⚠️ USER VI PHẠM\n\nDanh sách user có vấn đề:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại vi phạm:',
        [
            createPostbackButton('🚫 SPAM', 'ADMIN_VIOLATIONS_SPAM'),
            createPostbackButton('💰 LỪA ĐẢO', 'ADMIN_VIOLATIONS_FRAUD'),
            createPostbackButton('📝 NỘI DUNG XẤU', 'ADMIN_VIOLATIONS_CONTENT')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 BÁO CÁO', 'ADMIN_VIOLATIONS_REPORT'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Send notification
async function handleAdminSendNotification(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔔 GỬI THÔNG BÁO\n\nChọn loại thông báo:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại thông báo:',
        [
            createPostbackButton('📢 THÔNG BÁO CHUNG', 'ADMIN_SEND_GENERAL'),
            createPostbackButton('👥 THÔNG BÁO USER', 'ADMIN_SEND_USER'),
            createPostbackButton('🛒 THÔNG BÁO TIN ĐĂNG', 'ADMIN_SEND_LISTING')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📋 LỊCH SỬ', 'ADMIN_NOTIFICATION_HISTORY'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Moderate listings
async function handleAdminModerateListings(user: any) {
    try {
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (listings && listings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '⚠️ KIỂM DUYỆT TIN ĐĂNG\n\nDanh sách tin đăng chờ duyệt:'
            ])

            for (let i = 0; i < listings.length; i++) {
                const listing = listings[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${listing.title}\n👤 ${listing.users?.name || 'N/A'}\n💰 ${formatCurrency(listing.price)}\n📅 ${new Date(listing.created_at).toLocaleDateString('vi-VN')}`,
                    [
                        createPostbackButton('✅ DUYỆT', `ADMIN_APPROVE_LISTING_${listing.id}`),
                        createPostbackButton('❌ TỪ CHỐI', `ADMIN_REJECT_LISTING_${listing.id}`),
                        createPostbackButton('👀 XEM', `ADMIN_VIEW_LISTING_${listing.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '⚠️ KIỂM DUYỆT TIN ĐĂNG\n\n✅ Không có tin đăng nào chờ duyệt!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'ADMIN_MODERATE_LISTINGS'),
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_LISTINGS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin moderate listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách tin đăng!')
    }
}

// Admin: All listings
async function handleAdminAllListings(user: any) {
    try {
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name)')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error

        await sendMessagesWithTyping(user.facebook_id, [
            '🛒 TẤT CẢ TIN ĐĂNG\n\nDanh sách 20 tin đăng gần nhất:'
        ])

        for (let i = 0; i < listings.length; i++) {
            const listing = listings[i]
            const status = listing.status === 'active' ? '✅' : listing.status === 'pending' ? '⏳' : '❌'

            await sendButtonTemplate(
                user.facebook_id,
                `${i + 1}️⃣ ${status} ${listing.title}\n👤 ${listing.users?.name || 'N/A'}\n💰 ${formatCurrency(listing.price)}\n📅 ${new Date(listing.created_at).toLocaleDateString('vi-VN')}`,
                [
                    createPostbackButton('👀 XEM', `ADMIN_VIEW_LISTING_${listing.id}`),
                    createPostbackButton('✏️ SỬA', `ADMIN_EDIT_LISTING_${listing.id}`),
                    createPostbackButton('🗑️ XÓA', `ADMIN_DELETE_LISTING_${listing.id}`)
                ]
            )
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'ADMIN_ALL_LISTINGS'),
                createPostbackButton('📤 XUẤT EXCEL', 'ADMIN_EXPORT_LISTINGS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin all listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách tin đăng!')
    }
}

// Admin: Featured listings
async function handleAdminFeaturedListings(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⭐ FEATURED LISTINGS\n\nTin đăng nổi bật:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('➕ THÊM FEATURED', 'ADMIN_ADD_FEATURED'),
            createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_FEATURED'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'ADMIN_FEATURED_SETTINGS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Quản lý:',
        [
            createPostbackButton('🔄 MỚI', 'ADMIN_FEATURED_LISTINGS'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Search listings
async function handleAdminSearchListings(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM KIẾM TIN ĐĂNG\n\nChọn cách tìm kiếm:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tìm theo:',
        [
            createPostbackButton('📝 TIÊU ĐỀ', 'ADMIN_SEARCH_LISTING_TITLE'),
            createPostbackButton('👤 NGƯỜI ĐĂNG', 'ADMIN_SEARCH_LISTING_USER'),
            createPostbackButton('💰 GIÁ', 'ADMIN_SEARCH_LISTING_PRICE')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_LISTINGS'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Export listings
async function handleAdminExportListings(user: any) {
    try {
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name, phone)')
            .order('created_at', { ascending: false })

        if (error) throw error

        await sendMessagesWithTyping(user.facebook_id, [
            '📤 XUẤT BÁO CÁO TIN ĐĂNG\n\n✅ Đã tạo file CSV với ' + listings.length + ' tin đăng',
            '📊 Dữ liệu bao gồm:\n• Thông tin tin đăng\n• Người đăng\n• Trạng thái\n• Ngày tạo'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📧 GỬI EMAIL', 'ADMIN_SEND_EMAIL_LISTINGS'),
                createPostbackButton('📱 GỬI QUA CHAT', 'ADMIN_SEND_CHAT_LISTINGS'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin export listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xuất báo cáo tin đăng!')
    }
}

// Admin: Detailed stats
async function handleAdminDetailedStats(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📈 THỐNG KÊ CHI TIẾT\n\nChọn loại thống kê:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Thống kê:',
        [
            createPostbackButton('👥 USER', 'ADMIN_STATS_USERS'),
            createPostbackButton('🛒 TIN ĐĂNG', 'ADMIN_STATS_LISTINGS'),
            createPostbackButton('💰 DOANH THU', 'ADMIN_STATS_REVENUE')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_STATS'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Export comprehensive
async function handleAdminExportComprehensive(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📊 BÁO CÁO TỔNG HỢP\n\nĐang tạo báo cáo...'
    ])

    try {
        // Get all data
        const [usersResult, listingsResult, paymentsResult] = await Promise.all([
            supabaseAdmin.from('users').select('*'),
            supabaseAdmin.from('listings').select('*'),
            supabaseAdmin.from('payments').select('*')
        ])

        const users = usersResult.data || []
        const listings = listingsResult.data || []
        const payments = paymentsResult.data || []

        await sendMessagesWithTyping(user.facebook_id, [
            '✅ BÁO CÁO TỔNG HỢP HOÀN THÀNH',
            `📊 Tổng quan:\n• Users: ${users.length}\n• Tin đăng: ${listings.length}\n• Thanh toán: ${payments.length}`,
            '📈 Dữ liệu chi tiết đã được chuẩn bị'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📧 GỬI EMAIL', 'ADMIN_SEND_EMAIL_COMPREHENSIVE'),
                createPostbackButton('📱 GỬI QUA CHAT', 'ADMIN_SEND_CHAT_COMPREHENSIVE'),
                createPostbackButton('🔙 ADMIN', 'ADMIN')
            ]
        )
    } catch (error) {
        console.error('Error handling admin export comprehensive:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tạo báo cáo tổng hợp!')
    }
}

// Admin: Export by date
async function handleAdminExportByDate(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📅 BÁO CÁO THEO NGÀY\n\nChọn khoảng thời gian:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khoảng thời gian:',
        [
            createPostbackButton('📅 HÔM NAY', 'ADMIN_EXPORT_TODAY'),
            createPostbackButton('📅 TUẦN NÀY', 'ADMIN_EXPORT_THIS_WEEK'),
            createPostbackButton('📅 THÁNG NÀY', 'ADMIN_EXPORT_THIS_MONTH')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📅 TÙY CHỈNH', 'ADMIN_EXPORT_CUSTOM_DATE'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Send general notification
async function handleAdminSendGeneral(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📢 THÔNG BÁO CHUNG\n\nGửi thông báo đến tất cả user:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại thông báo:',
        [
            createPostbackButton('📢 THÔNG BÁO HỆ THỐNG', 'ADMIN_SEND_SYSTEM_NOTIFICATION'),
            createPostbackButton('🎉 THÔNG BÁO SỰ KIỆN', 'ADMIN_SEND_EVENT_NOTIFICATION'),
            createPostbackButton('⚠️ THÔNG BÁO CẢNH BÁO', 'ADMIN_SEND_WARNING_NOTIFICATION')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📋 LỊCH SỬ', 'ADMIN_NOTIFICATION_HISTORY'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Send user notification
async function handleAdminSendUser(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '👥 THÔNG BÁO USER\n\nGửi thông báo đến user cụ thể:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn user:',
        [
            createPostbackButton('🔍 TÌM USER', 'ADMIN_SEARCH_USER'),
            createPostbackButton('📊 XEM DANH SÁCH', 'ADMIN_ALL_USERS'),
            createPostbackButton('📱 NHẬP SỐ ĐIỆN THOẠI', 'ADMIN_SEND_BY_PHONE')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Send listing notification
async function handleAdminSendListing(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🛒 THÔNG BÁO TIN ĐĂNG\n\nGửi thông báo về tin đăng:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại thông báo:',
        [
            createPostbackButton('🆕 TIN ĐĂNG MỚI', 'ADMIN_SEND_NEW_LISTING'),
            createPostbackButton('⭐ TIN ĐĂNG NỔI BẬT', 'ADMIN_SEND_FEATURED_LISTING'),
            createPostbackButton('⚠️ TIN ĐĂNG VI PHẠM', 'ADMIN_SEND_VIOLATION_LISTING')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Notification history
async function handleAdminNotificationHistory(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📋 LỊCH SỬ THÔNG BÁO\n\nDanh sách thông báo đã gửi:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_NOTIFICATIONS'),
            createPostbackButton('🔍 TÌM KIẾM', 'ADMIN_SEARCH_NOTIFICATIONS'),
            createPostbackButton('📤 XUẤT', 'ADMIN_EXPORT_NOTIFICATIONS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Quản lý:',
        [
            createPostbackButton('🔄 MỚI', 'ADMIN_NOTIFICATION_HISTORY'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Admin: Notification settings
async function handleAdminNotificationSettings(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⚙️ CÀI ĐẶT THÔNG BÁO\n\nCấu hình hệ thống thông báo:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Cài đặt:',
        [
            createPostbackButton('🔔 BẬT/TẮT THÔNG BÁO', 'ADMIN_TOGGLE_NOTIFICATIONS'),
            createPostbackButton('⏰ THỜI GIAN GỬI', 'ADMIN_SET_NOTIFICATION_TIME'),
            createPostbackButton('📧 CẤU HÌNH EMAIL', 'ADMIN_EMAIL_SETTINGS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🧪 TEST THÔNG BÁO', 'ADMIN_TEST_NOTIFICATION'),
            createPostbackButton('🔙 ADMIN', 'ADMIN')
        ]
    )
}

// Handle listing step
async function handleListingStep(user: any, text: string, session: any) {
    const step = session.current_step
    const data = session.data || {}

    switch (step) {
        case 1: // Title
            await handleListingTitleInput(user, text, data)
            break
        case 2: // Price
            await handleListingPriceInput(user, text, data)
            break
        case 3: // Description
            await handleListingDescriptionInput(user, text, data)
            break
        case 4: // Location
            await handleListingLocationInput(user, text, data)
            break
        case 5: // Images
            await handleListingImagesInput(user, text, data)
            break
        default:
            await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tạo tin đăng lại.')
    }
}

// Handle listing title input
async function handleListingTitleInput(user: any, text: string, data: any) {
    if (text.length < 5) {
        await sendMessage(user.facebook_id, 'Tiêu đề quá ngắn! Vui lòng nhập ít nhất 5 ký tự.')
        return
    }

    data.title = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Tiêu đề: ${data.title}`,
        'Bước 2/6: Giá bán\n💰 Nhập giá bán (VND):\n\nVD: 500000000 (500 triệu)'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('💬 THƯƠNG LƯỢNG', 'LISTING_PRICE_NEGOTIABLE'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 2,
        data: data
    })
}

// Handle listing price input
async function handleListingPriceInput(user: any, text: string, data: any) {
    let price = text.trim()

    // Handle negotiable price
    if (price.includes('thương lượng') || price.includes('THƯƠNG LƯỢNG')) {
        price = 'Thương lượng'
    } else {
        // Extract numbers from text
        const numbers = price.replace(/[^\d]/g, '')
        if (numbers.length > 0) {
            price = parseInt(numbers).toLocaleString('vi-VN') + ' VND'
        } else {
            await sendMessage(user.facebook_id, 'Vui lòng nhập giá hợp lệ hoặc chọn "Thương lượng".')
            return
        }
    }

    data.price = price

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Giá: ${data.price}`,
        'Bước 3/6: Mô tả chi tiết\n📝 Nhập mô tả sản phẩm/dịch vụ:\n\n• Tình trạng\n• Đặc điểm nổi bật\n• Thông tin liên hệ'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('📝 MẪU CÓ SẴN', 'LISTING_DESCRIPTION_TEMPLATE'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 3,
        data: data
    })
}

// Handle listing description input
async function handleListingDescriptionInput(user: any, text: string, data: any) {
    if (text.length < 10) {
        await sendMessage(user.facebook_id, 'Mô tả quá ngắn! Vui lòng nhập ít nhất 10 ký tự.')
        return
    }

    data.description = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Mô tả: ${data.description.substring(0, 50)}...`,
        'Bước 4/6: Vị trí\n📍 Chọn vị trí của sản phẩm/dịch vụ:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khu vực:',
        [
            createPostbackButton('🏙️ TP.HCM', 'LISTING_LOCATION_TPHCM'),
            createPostbackButton('🏛️ HÀ NỘI', 'LISTING_LOCATION_HANOI'),
            createPostbackButton('🌊 ĐÀ NẴNG', 'LISTING_LOCATION_DANANG')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📍 KHÁC', 'LISTING_LOCATION_OTHER'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 4,
        data: data
    })
}

// Handle listing location input
async function handleListingLocationInput(user: any, text: string, data: any) {
    data.location = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `✅ Vị trí: ${data.location}`,
        'Bước 5/6: Hình ảnh\n📸 Gửi hình ảnh sản phẩm/dịch vụ:\n\n• Tối đa 5 hình\n• Chất lượng rõ nét\n• Góc chụp đẹp'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('⏭️ BỎ QUA HÌNH ẢNH', 'LISTING_IMAGES_SKIP'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 5,
        data: data
    })
}

// Handle listing images input
async function handleListingImagesInput(user: any, text: string, data: any) {
    // For now, just proceed to confirmation
    await sendMessagesWithTyping(user.facebook_id, [
        'Bước 6/6: Xác nhận\n✅ Kiểm tra lại thông tin tin đăng:'
    ])

    // Display listing preview
    await sendMessagesWithTyping(user.facebook_id, [
        `📋 THÔNG TIN TIN ĐĂNG\n\n📝 Tiêu đề: ${data.title}\n💰 Giá: ${data.price}\n📍 Vị trí: ${data.location}\n📂 Danh mục: ${data.category}`,
        `📝 Mô tả:\n${data.description}`
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Xác nhận:',
        [
            createPostbackButton('✅ ĐĂNG TIN', 'LISTING_SUBMIT'),
            createPostbackButton('✏️ SỬA LẠI', 'LISTING_EDIT'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 6,
        data: data
    })
}

// Handle listing category selection
async function handleListingCategory(user: any, category: string) {
    await sendMessagesWithTyping(user.facebook_id, [
        `📝 TẠO TIN ĐĂNG - ${category}\n\nBước 1/6: Tiêu đề`,
        '📝 Nhập tiêu đề tin đăng:\n\nVD: Bán nhà 3 tầng mặt tiền đường Lê Văn Việt'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING'),
            createPostbackButton('🔙 CHỌN LẠI DANH MỤC', 'LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 1,
        data: { category: category }
    })
}

// Handle listing title input
async function handleListingTitle(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tạo tin đăng lại.')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        'Bước 2/6: Giá bán\n💰 Nhập giá bán (VND):\n\nVD: 500000000 (500 triệu)'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('💬 THƯƠNG LƯỢNG', 'LISTING_PRICE_NEGOTIABLE'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 2,
        data: { ...session.data, title: 'TITLE_PLACEHOLDER' }
    })
}

// Handle listing price input
async function handleListingPrice(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tạo tin đăng lại.')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        'Bước 3/6: Mô tả chi tiết\n📝 Nhập mô tả sản phẩm/dịch vụ:\n\n• Tình trạng\n• Đặc điểm nổi bật\n• Thông tin liên hệ'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('📝 MẪU CÓ SẴN', 'LISTING_DESCRIPTION_TEMPLATE'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 3,
        data: { ...session.data, price: 'PRICE_PLACEHOLDER' }
    })
}

// Handle listing description input
async function handleListingDescription(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tạo tin đăng lại.')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        'Bước 4/6: Vị trí\n📍 Chọn vị trí của sản phẩm/dịch vụ:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khu vực:',
        [
            createPostbackButton('🏙️ TP.HCM', 'LISTING_LOCATION_TPHCM'),
            createPostbackButton('🏛️ HÀ NỘI', 'LISTING_LOCATION_HANOI'),
            createPostbackButton('🌊 ĐÀ NẴNG', 'LISTING_LOCATION_DANANG')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📍 KHÁC', 'LISTING_LOCATION_OTHER'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 4,
        data: { ...session.data, description: 'DESCRIPTION_PLACEHOLDER' }
    })
}

// Handle listing location selection
async function handleListingLocation(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tạo tin đăng lại.')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        'Bước 5/6: Hình ảnh\n📸 Gửi hình ảnh sản phẩm/dịch vụ:\n\n• Tối đa 5 hình\n• Chất lượng rõ nét\n• Góc chụp đẹp'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Hoặc chọn:',
        [
            createPostbackButton('⏭️ BỎ QUA HÌNH ẢNH', 'LISTING_IMAGES_SKIP'),
            createPostbackButton('❌ HỦY TẠO TIN', 'CANCEL_LISTING')
        ]
    )

    await updateBotSession(user.facebook_id, {
        current_flow: 'listing',
        current_step: 5,
        data: { ...session.data, location: 'LOCATION_PLACEHOLDER' }
    })
}


// Handle listing confirmation
async function handleListingConfirm(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '✅ XÁC NHẬN ĐĂNG TIN\n\nTin đăng của bạn đã được gửi để kiểm duyệt!'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📋 XEM TIN ĐÃ ĐĂNG', 'MY_LISTINGS'),
            createPostbackButton('🛒 ĐĂNG TIN MỚI', 'LISTING'),
            createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )

    // Clear listing session
    await updateBotSession(user.facebook_id, {
        current_flow: null,
        current_step: null,
        data: {}
    })
}

// Handle listing submission
async function handleListingSubmit(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'listing') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tạo tin đăng lại.')
        return
    }

    try {
        const data = session.data || {}

        // Create listing in database
        const { data: newListing, error } = await supabaseAdmin
            .from('listings')
            .insert({
                user_id: user.id,
                category: data.category,
                title: data.title,
                price: data.price,
                description: data.description,
                location: data.location,
                images: data.images ? [data.images] : [],
                status: 'pending'
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '🎉 ĐĂNG TIN THÀNH CÔNG!',
            '✅ Tin đăng của bạn đã được gửi để kiểm duyệt\n⏰ Thời gian duyệt: 24-48 giờ',
            '📋 Mã tin đăng: #' + newListing.id.slice(-8).toUpperCase()
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📋 XEM TIN ĐÃ ĐĂNG', 'MY_LISTINGS'),
                createPostbackButton('🛒 ĐĂNG TIN MỚI', 'LISTING'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear listing session
        await updateBotSession(user.facebook_id, {
            current_flow: null,
            current_step: null,
            data: {}
        })
    } catch (error) {
        console.error('Error creating listing:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi đăng tin. Vui lòng thử lại sau!')
    }
}

// Handle my listings
async function handleMyListings(user: any) {
    try {
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (listings && listings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📋 TIN ĐĂNG CỦA BẠN\n\nDanh sách tin đăng gần nhất:'
            ])

            for (let i = 0; i < listings.length; i++) {
                const listing = listings[i]
                const status = listing.status === 'active' ? '✅' : listing.status === 'pending' ? '⏳' : '❌'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${status} ${listing.title}\n💰 ${formatCurrency(listing.price)}\n📅 ${new Date(listing.created_at).toLocaleDateString('vi-VN')}`,
                    [
                        createPostbackButton('👀 XEM', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('✏️ SỬA', `EDIT_LISTING_${listing.id}`),
                        createPostbackButton('🗑️ XÓA', `DELETE_LISTING_${listing.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📋 TIN ĐĂNG CỦA BẠN\n\n❌ Bạn chưa có tin đăng nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🛒 ĐĂNG TIN MỚI', 'LISTING'),
                createPostbackButton('🔄 MỚI', 'MY_LISTINGS'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    } catch (error) {
        console.error('Error handling my listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách tin đăng!')
    }
}

// Handle search step
async function handleSearchStep(user: any, text: string, session: any) {
    const step = session.current_step
    const data = session.data || {}

    if (data.type === 'keyword') {
        await handleSearchKeywordInput(user, text, data)
    } else {
        // Handle location selection
        await handleSearchLocationInput(user, text, data)
    }
}

// Handle search keyword input
async function handleSearchKeywordInput(user: any, text: string, data: any) {
    if (text.length < 2) {
        await sendMessage(user.facebook_id, 'Từ khóa quá ngắn! Vui lòng nhập ít nhất 2 ký tự.')
        return
    }

    data.keyword = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `🔍 Tìm kiếm: "${data.keyword}"\n\nĐang tìm kiếm...`
    ])

    try {
        // Search listings by keyword
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name, phone, location)')
            .or(`title.ilike.%${data.keyword}%,description.ilike.%${data.keyword}%`)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (listings && listings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Tìm thấy ${listings.length} kết quả cho "${data.keyword}":`
            ])

            for (let i = 0; i < listings.length; i++) {
                const listing = listings[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${listing.title}\n💰 ${formatCurrency(listing.price)}\n👤 ${listing.users?.name || 'N/A'}\n📍 ${listing.users?.location || 'N/A'}`,
                    [
                        createPostbackButton('👀 XEM', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_SELLER_${listing.user_id}`),
                        createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_SELLER_${listing.user_id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                `❌ Không tìm thấy kết quả nào cho "${data.keyword}"`,
                '💡 Thử với từ khóa khác hoặc tìm kiếm theo danh mục'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM LẠI', 'SEARCH_KEYWORD'),
                createPostbackButton('🎯 TÌM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
            ]
        )

        // Clear search session
        await updateBotSession(user.facebook_id, {
            current_flow: null,
            current_step: null,
            data: {}
        })
    } catch (error) {
        console.error('Error searching listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
    }
}

// Handle search location input
async function handleSearchLocationInput(user: any, text: string, data: any) {
    data.location = text.trim()

    await sendMessagesWithTyping(user.facebook_id, [
        `🔍 Tìm kiếm: ${data.category} tại ${data.location}\n\nĐang tìm kiếm...`
    ])

    try {
        // Search listings by category and location
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name, phone, location)')
            .eq('category', data.category)
            .eq('status', 'active')
            .ilike('location', `%${data.location}%`)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (listings && listings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Tìm thấy ${listings.length} kết quả cho ${data.category} tại ${data.location}:`
            ])

            for (let i = 0; i < listings.length; i++) {
                const listing = listings[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${listing.title}\n💰 ${formatCurrency(listing.price)}\n👤 ${listing.users?.name || 'N/A'}\n📍 ${listing.users?.location || 'N/A'}`,
                    [
                        createPostbackButton('👀 XEM', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_SELLER_${listing.user_id}`),
                        createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_SELLER_${listing.user_id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                `❌ Không tìm thấy kết quả nào cho ${data.category} tại ${data.location}`,
                '💡 Thử tìm kiếm ở vị trí khác hoặc danh mục khác'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM LẠI', 'SEARCH'),
                createPostbackButton('🎯 TÌM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear search session
        await updateBotSession(user.facebook_id, {
            current_flow: null,
            current_step: null,
            data: {}
        })
    } catch (error) {
        console.error('Error searching listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
    }
}

// Handle view listing details
async function handleViewListing(user: any, listingId: string) {
    try {
        const { data: listing, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name, phone, location, rating)')
            .eq('id', listingId)
            .single()

        if (error || !listing) {
            await sendMessage(user.facebook_id, 'Không tìm thấy tin đăng này!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            `📋 CHI TIẾT TIN ĐĂNG\n\n📝 ${listing.title}\n💰 ${formatCurrency(listing.price)}\n📍 ${listing.location}\n📂 ${listing.category}`,
            `👤 Người đăng: ${listing.users?.name || 'N/A'}\n📱 SĐT: ${listing.users?.phone || 'N/A'}\n⭐ Đánh giá: ${listing.users?.rating || 0}/5`,
            `📝 Mô tả:\n${listing.description}`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💬 LIÊN HỆ NGƯỜI BÁN', `CONTACT_SELLER_${listing.user_id}`),
                createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_SELLER_${listing.user_id}`),
                createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
            ]
        )
    } catch (error) {
        console.error('Error viewing listing:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi xem chi tiết tin đăng!')
    }
}

// Handle contact seller
async function handleContactSeller(user: any, sellerId: string) {
    try {
        const { data: seller, error } = await supabaseAdmin
            .from('users')
            .select('name, phone, facebook_id')
            .eq('id', sellerId)
            .single()

        if (error || !seller) {
            await sendMessage(user.facebook_id, 'Không tìm thấy thông tin người bán!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '💬 LIÊN HỆ NGƯỜI BÁN\n\nThông tin liên hệ:',
            `👤 Tên: ${seller.name}\n📱 SĐT: ${seller.phone}\n🆔 Facebook ID: ${seller.facebook_id}`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📞 GỌI ĐIỆN', `CALL_${seller.phone}`),
                createPostbackButton('💬 NHẮN TIN FACEBOOK', `MESSAGE_${seller.facebook_id}`),
                createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
            ]
        )
    } catch (error) {
        console.error('Error contacting seller:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi lấy thông tin liên hệ!')
    }
}

// Handle rate seller
async function handleRateSeller(user: any, sellerId: string) {
    try {
        const { data: seller, error } = await supabaseAdmin
            .from('users')
            .select('name, rating')
            .eq('id', sellerId)
            .single()

        if (error || !seller) {
            await sendMessage(user.facebook_id, 'Không tìm thấy thông tin người bán!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            `⭐ ĐÁNH GIÁ NGƯỜI BÁN\n\n👤 ${seller.name}\n⭐ Đánh giá hiện tại: ${seller.rating || 0}/5`,
            'Chọn mức độ hài lòng:'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Đánh giá:',
            [
                createPostbackButton('⭐ 1 SAO', `RATE_1_${sellerId}`),
                createPostbackButton('⭐⭐ 2 SAO', `RATE_2_${sellerId}`),
                createPostbackButton('⭐⭐⭐ 3 SAO', `RATE_3_${sellerId}`)
            ]
        )

        await sendButtonTemplate(
            user.facebook_id,
            'Tiếp tục:',
            [
                createPostbackButton('⭐⭐⭐⭐ 4 SAO', `RATE_4_${sellerId}`),
                createPostbackButton('⭐⭐⭐⭐⭐ 5 SAO', `RATE_5_${sellerId}`),
                createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
            ]
        )
    } catch (error) {
        console.error('Error rating seller:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi đánh giá!')
    }
}

// Handle search location selection
async function handleSearchLocation(user: any, location: string) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'search') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tìm kiếm lại.')
        return
    }

    const data = session.data || {}
    data.location = location

    await sendMessagesWithTyping(user.facebook_id, [
        `🔍 Tìm kiếm: ${data.category} tại ${location}\n\nĐang tìm kiếm...`
    ])

    try {
        // Search listings by category and location
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name, phone, location)')
            .eq('category', data.category)
            .eq('status', 'active')
            .ilike('location', `%${location}%`)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (listings && listings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Tìm thấy ${listings.length} kết quả cho ${data.category} tại ${location}:`
            ])

            for (let i = 0; i < listings.length; i++) {
                const listing = listings[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${listing.title}\n💰 ${formatCurrency(listing.price)}\n👤 ${listing.users?.name || 'N/A'}\n📍 ${listing.users?.location || 'N/A'}`,
                    [
                        createPostbackButton('👀 XEM', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_SELLER_${listing.user_id}`),
                        createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_SELLER_${listing.user_id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                `❌ Không tìm thấy kết quả nào cho ${data.category} tại ${location}`,
                '💡 Thử tìm kiếm ở vị trí khác hoặc danh mục khác'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM LẠI', 'SEARCH'),
                createPostbackButton('🎯 TÌM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear search session
        await updateBotSession(user.facebook_id, {
            current_flow: null,
            current_step: null,
            data: {}
        })
    } catch (error) {
        console.error('Error searching listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
    }
}

// Handle search all locations
async function handleSearchAllLocations(user: any) {
    const session = await getBotSession(user.facebook_id)
    if (!session || session.current_flow !== 'search') {
        await sendMessage(user.facebook_id, 'Vui lòng bắt đầu tìm kiếm lại.')
        return
    }

    const data = session.data || {}

    await sendMessagesWithTyping(user.facebook_id, [
        `🔍 Tìm kiếm: ${data.category} (Tất cả vị trí)\n\nĐang tìm kiếm...`
    ])

    try {
        // Search listings by category only
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('*, users(name, phone, location)')
            .eq('category', data.category)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (listings && listings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                `✅ Tìm thấy ${listings.length} kết quả cho ${data.category}:`
            ])

            for (let i = 0; i < listings.length; i++) {
                const listing = listings[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${listing.title}\n💰 ${formatCurrency(listing.price)}\n👤 ${listing.users?.name || 'N/A'}\n📍 ${listing.users?.location || 'N/A'}`,
                    [
                        createPostbackButton('👀 XEM', `VIEW_LISTING_${listing.id}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_SELLER_${listing.user_id}`),
                        createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_SELLER_${listing.user_id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                `❌ Không tìm thấy kết quả nào cho ${data.category}`,
                '💡 Thử tìm kiếm danh mục khác'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TÌM LẠI', 'SEARCH'),
                createPostbackButton('🎯 TÌM NÂNG CAO', 'SEARCH_ADVANCED'),
                createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear search session
        await updateBotSession(user.facebook_id, {
            current_flow: null,
            current_step: null,
            data: {}
        })
    } catch (error) {
        console.error('Error searching listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!')
    }
}

// Handle search by price
async function handleSearchByPrice(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '💰 TÌM KIẾM THEO GIÁ\n\nChọn khoảng giá:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khoảng giá:',
        [
            createPostbackButton('💵 DƯỚI 100 TRIỆU', 'SEARCH_PRICE_UNDER_100M'),
            createPostbackButton('💵 100-500 TRIỆU', 'SEARCH_PRICE_100_500M'),
            createPostbackButton('💵 500 TRIỆU - 1 TỶ', 'SEARCH_PRICE_500M_1B')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tiếp tục:',
        [
            createPostbackButton('💵 1-5 TỶ', 'SEARCH_PRICE_1_5B'),
            createPostbackButton('💵 TRÊN 5 TỶ', 'SEARCH_PRICE_OVER_5B'),
            createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
        ]
    )
}

// Handle search by rating
async function handleSearchByRating(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⭐ TÌM KIẾM THEO ĐÁNH GIÁ\n\nChọn mức đánh giá:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Mức đánh giá:',
        [
            createPostbackButton('⭐⭐⭐⭐⭐ 5 SAO', 'SEARCH_RATING_5'),
            createPostbackButton('⭐⭐⭐⭐ 4 SAO TRỞ LÊN', 'SEARCH_RATING_4_PLUS'),
            createPostbackButton('⭐⭐⭐ 3 SAO TRỞ LÊN', 'SEARCH_RATING_3_PLUS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
        ]
    )
}

// Handle search by date
async function handleSearchByDate(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📅 TÌM KIẾM THEO NGÀY\n\nChọn khoảng thời gian:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Khoảng thời gian:',
        [
            createPostbackButton('📅 HÔM NAY', 'SEARCH_DATE_TODAY'),
            createPostbackButton('📅 TUẦN NÀY', 'SEARCH_DATE_THIS_WEEK'),
            createPostbackButton('📅 THÁNG NÀY', 'SEARCH_DATE_THIS_MONTH')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📅 3 NGÀY QUA', 'SEARCH_DATE_LAST_3_DAYS'),
            createPostbackButton('📅 7 NGÀY QUA', 'SEARCH_DATE_LAST_7_DAYS'),
            createPostbackButton('🔙 TÌM KIẾM', 'SEARCH')
        ]
    )
}

// Handle rate submission
async function handleRateSubmission(user: any, sellerId: string, rating: number) {
    try {
        // Create rating record
        const { error } = await supabaseAdmin
            .from('ratings')
            .insert({
                rater_id: user.id,
                rated_id: sellerId,
                rating: rating,
                type: 'seller'
            })

        if (error) throw error

        // Update seller's average rating
        const { data: ratings, error: ratingsError } = await supabaseAdmin
            .from('ratings')
            .select('rating')
            .eq('rated_id', sellerId)
            .eq('type', 'seller')

        if (!ratingsError && ratings) {
            const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length

            await supabaseAdmin
                .from('users')
                .update({ rating: Math.round(averageRating * 100) / 100 })
                .eq('id', sellerId)
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '✅ ĐÁNH GIÁ THÀNH CÔNG!',
            `⭐ Bạn đã đánh giá ${rating}/5 sao\nCảm ơn bạn đã đóng góp cho cộng đồng!`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔍 TIẾP TỤC TÌM KIẾM', 'SEARCH'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    } catch (error) {
        console.error('Error submitting rating:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi đánh giá. Vui lòng thử lại sau!')
    }
}

// Handle payment confirmation
async function handlePaymentConfirm(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '💰 XÁC NHẬN THANH TOÁN\n\nChọn gói dịch vụ:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Gói dịch vụ:',
        [
            createPostbackButton('💰 GÓI 1 TUẦN - 50K', 'PAYMENT_PACKAGE_1_WEEK'),
            createPostbackButton('💎 GÓI 1 THÁNG - 200K', 'PAYMENT_PACKAGE_1_MONTH'),
            createPostbackButton('👑 GÓI 3 THÁNG - 500K', 'PAYMENT_PACKAGE_3_MONTHS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('❓ HƯỚNG DẪN', 'PAYMENT_GUIDE'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment info
async function handlePaymentInfo(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        'ℹ️ THÔNG TIN THANH TOÁN\n\n💳 Phí duy trì: 1,000đ/ngày',
        '📅 Gói dịch vụ:\n• 1 tuần: 50,000đ\n• 1 tháng: 200,000đ\n• 3 tháng: 500,000đ (tiết kiệm 100,000đ)'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Phương thức thanh toán:',
        [
            createPostbackButton('🏦 CHUYỂN KHOẢN', 'PAYMENT_METHOD_BANK'),
            createPostbackButton('💳 VÍ ĐIỆN TỬ', 'PAYMENT_METHOD_WALLET'),
            createPostbackButton('📱 THANH TOÁN QUA APP', 'PAYMENT_METHOD_APP')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT_CONFIRM'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment extend
async function handlePaymentExtend(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '💰 GIA HẠN THÊM\n\nChọn gói gia hạn:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Gói gia hạn:',
        [
            createPostbackButton('💰 GÓI 1 TUẦN - 50K', 'PAYMENT_PACKAGE_1_WEEK'),
            createPostbackButton('💎 GÓI 1 THÁNG - 200K', 'PAYMENT_PACKAGE_1_MONTH'),
            createPostbackButton('👑 GÓI 3 THÁNG - 500K', 'PAYMENT_PACKAGE_3_MONTHS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment history
async function handlePaymentHistory(user: any) {
    try {
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (payments && payments.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📋 LỊCH SỬ THANH TOÁN\n\nDanh sách thanh toán gần nhất:'
            ])

            for (let i = 0; i < payments.length; i++) {
                const payment = payments[i]
                const status = payment.status === 'approved' ? '✅' : payment.status === 'rejected' ? '❌' : '⏳'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${status} ${formatCurrency(payment.amount)}\n📅 ${new Date(payment.created_at).toLocaleDateString('vi-VN')}\n⏰ ${new Date(payment.created_at).toLocaleTimeString('vi-VN')}`,
                    [
                        createPostbackButton('👀 XEM', `PAYMENT_DETAILS_${payment.id}`),
                        createPostbackButton('📸 XEM BIÊN LAI', `PAYMENT_RECEIPT_${payment.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📋 LỊCH SỬ THANH TOÁN\n\n❌ Bạn chưa có thanh toán nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💰 THANH TOÁN', 'PAYMENT_CONFIRM'),
                createPostbackButton('🔄 MỚI', 'PAYMENT_HISTORY'),
                createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    } catch (error) {
        console.error('Error handling payment history:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải lịch sử thanh toán!')
    }
}

// Handle payment guide
async function handlePaymentGuide(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📖 HƯỚNG DẪN THANH TOÁN\n\nCách thức thanh toán:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Phương thức:',
        [
            createPostbackButton('🏦 CHUYỂN KHOẢN', 'PAYMENT_GUIDE_BANK'),
            createPostbackButton('💳 VÍ ĐIỆN TỬ', 'PAYMENT_GUIDE_WALLET'),
            createPostbackButton('📱 THANH TOÁN QUA APP', 'PAYMENT_GUIDE_APP')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT_CONFIRM'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment package selection
async function handlePaymentPackage(user: any, packageType: string) {
    let packageInfo: { name: string; price: number; days: number } = { name: '', price: 0, days: 0 }

    switch (packageType) {
        case '1_WEEK':
            packageInfo = { name: 'Gói 1 tuần', price: 50000, days: 7 }
            break
        case '1_MONTH':
            packageInfo = { name: 'Gói 1 tháng', price: 200000, days: 30 }
            break
        case '3_MONTHS':
            packageInfo = { name: 'Gói 3 tháng', price: 500000, days: 90 }
            break
        default:
            await sendMessage(user.facebook_id, 'Gói dịch vụ không hợp lệ!')
            return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        `💰 ${packageInfo.name}\n\n💵 Giá: ${formatCurrency(packageInfo.price)}\n📅 Thời gian: ${packageInfo.days} ngày\n💳 Phí: ${formatCurrency(packageInfo.price / packageInfo.days)}/ngày`
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Xác nhận thanh toán:',
        [
            createPostbackButton('✅ XÁC NHẬN', `PAYMENT_SUBMIT_${packageType}`),
            createPostbackButton('❌ HỦY', 'PAYMENT_CONFIRM')
        ]
    )
}

// Handle payment submission
async function handlePaymentSubmit(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '💰 THANH TOÁN\n\nThông tin chuyển khoản:'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🏦 THÔNG TIN CHUYỂN KHOẢN\n\n📧 STK: 1234567890\n🏦 Ngân hàng: Vietcombank\n👤 Chủ TK: NGUYEN VAN A\n💬 Nội dung: TD1981-[SỐ ĐIỆN THOẠI]'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Sau khi chuyển khoản:',
        [
            createPostbackButton('📸 GỬI BIÊN LAI', 'PAYMENT_UPLOAD_RECEIPT'),
            createPostbackButton('📞 LIÊN HỆ HỖ TRỢ', 'SUPPORT_ADMIN'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment upload receipt
async function handlePaymentUploadReceipt(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📸 GỬI BIÊN LAI\n\nVui lòng gửi hình ảnh biên lai chuyển khoản:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Lưu ý:',
        [
            createPostbackButton('📋 HƯỚNG DẪN CHỤP ẢNH', 'PAYMENT_PHOTO_GUIDE'),
            createPostbackButton('❌ HỦY', 'PAYMENT_CONFIRM')
        ]
    )

    // Store payment session
    await updateBotSession(user.facebook_id, {
        current_flow: 'payment',
        current_step: 1,
        data: { waiting_for_receipt: true }
    })
}

// Handle community birthday
async function handleCommunityBirthday(user: any) {
    try {
        // Get users with birthday today
        const today = new Date()
        const month = today.getMonth() + 1
        const day = today.getDate()

        const { data: birthdayUsers, error } = await supabaseAdmin
            .from('users')
            .select('name, phone, location')
            .eq('status', 'active')
            .limit(10)

        if (error) throw error

        if (birthdayUsers && birthdayUsers.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎂 SINH NHẬT HÔM NAY\n\nChúc mừng sinh nhật các thành viên Tân Dậu 1981:'
            ])

            for (let i = 0; i < birthdayUsers.length; i++) {
                const birthdayUser = birthdayUsers[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `🎉 ${birthdayUser.name}\n📱 ${birthdayUser.phone}\n📍 ${birthdayUser.location}`,
                    [
                        createPostbackButton('🎂 CHÚC MỪNG', `BIRTHDAY_WISH_${birthdayUser.phone}`),
                        createPostbackButton('💬 NHẮN TIN', `MESSAGE_${birthdayUser.phone}`),
                        createPostbackButton('🎁 TẶNG QUÀ', `GIFT_${birthdayUser.phone}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎂 SINH NHẬT HÔM NAY\n\n❌ Không có ai sinh nhật hôm nay!',
                '💡 Hãy quay lại vào ngày khác nhé!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'COMMUNITY_BIRTHDAY'),
                createPostbackButton('🔙 CỘNG ĐỒNG', 'COMMUNITY')
            ]
        )
    } catch (error) {
        console.error('Error handling community birthday:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách sinh nhật!')
    }
}

// Handle community top seller
async function handleCommunityTopSeller(user: any) {
    try {
        const { data: topSellers, error } = await supabaseAdmin
            .from('users')
            .select('name, phone, location, rating, created_at')
            .eq('status', 'active')
            .order('rating', { ascending: false })
            .limit(10)

        if (error) throw error

        if (topSellers && topSellers.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ TOP SELLER TÂN DẬU 1981\n\nDanh sách người bán uy tín nhất:'
            ])

            for (let i = 0; i < topSellers.length; i++) {
                const seller = topSellers[i]
                const rank = i + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '⭐'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${medal} ${rank}. ${seller.name}\n⭐ ${seller.rating || 0}/5 sao\n📍 ${seller.location}\n📱 ${seller.phone}`,
                    [
                        createPostbackButton('👀 XEM PROFILE', `PROFILE_${seller.phone}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_${seller.phone}`),
                        createPostbackButton('⭐ ĐÁNH GIÁ', `RATE_${seller.phone}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '⭐ TOP SELLER TÂN DẬU 1981\n\n❌ Chưa có dữ liệu người bán!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'COMMUNITY_TOP_SELLER'),
                createPostbackButton('🔙 CỘNG ĐỒNG', 'COMMUNITY')
            ]
        )
    } catch (error) {
        console.error('Error handling community top seller:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải danh sách top seller!')
    }
}

// Handle community ranking
async function handleCommunityRanking(user: any) {
    try {
        const { data: rankings, error } = await supabaseAdmin
            .from('users')
            .select('name, phone, location, rating, created_at')
            .eq('status', 'active')
            .order('rating', { ascending: false })
            .limit(20)

        if (error) throw error

        if (rankings && rankings.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 BẢNG XẾP HẠNG CỘNG ĐỒNG\n\nTop 20 thành viên tích cực nhất:'
            ])

            for (let i = 0; i < rankings.length; i++) {
                const member = rankings[i]
                const rank = i + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${medal} ${rank}. ${member.name}\n⭐ ${member.rating || 0}/5 sao\n📍 ${member.location}`,
                    [
                        createPostbackButton('👀 XEM PROFILE', `PROFILE_${member.phone}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_${member.phone}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 BẢNG XẾP HẠNG CỘNG ĐỒNG\n\n❌ Chưa có dữ liệu xếp hạng!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'COMMUNITY_RANKING'),
                createPostbackButton('🔙 CỘNG ĐỒNG', 'COMMUNITY')
            ]
        )
    } catch (error) {
        console.error('Error handling community ranking:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải bảng xếp hạng!')
    }
}

// Handle community support
async function handleCommunitySupport(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🤝 HỖ TRỢ LẪN NHAU\n\nCộng đồng Tân Dậu 1981 luôn sẵn sàng hỗ trợ nhau!'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại hỗ trợ:',
        [
            createPostbackButton('💼 CÔNG VIỆC', 'SUPPORT_JOB'),
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'SUPPORT_REAL_ESTATE'),
            createPostbackButton('🚗 Ô TÔ', 'SUPPORT_CAR')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📝 ĐĂNG YÊU CẦU', 'SUPPORT_POST_REQUEST'),
            createPostbackButton('🔍 TÌM HỖ TRỢ', 'SUPPORT_SEARCH'),
            createPostbackButton('🔙 CỘNG ĐỒNG', 'COMMUNITY')
        ]
    )
}

// Handle community announcements
async function handleCommunityAnnouncements(user: any) {
    try {
        const { data: announcements, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('type', 'community')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (announcements && announcements.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📢 THÔNG BÁO CỘNG ĐỒNG\n\nTin tức mới nhất:'
            ])

            for (let i = 0; i < announcements.length; i++) {
                const announcement = announcements[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${announcement.title}\n📅 ${new Date(announcement.created_at).toLocaleDateString('vi-VN')}\n⏰ ${new Date(announcement.created_at).toLocaleTimeString('vi-VN')}`,
                    [
                        createPostbackButton('👀 XEM', `ANNOUNCEMENT_${announcement.id}`),
                        createPostbackButton('📤 CHIA SẺ', `SHARE_${announcement.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📢 THÔNG BÁO CỘNG ĐỒNG\n\n❌ Chưa có thông báo nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'COMMUNITY_ANNOUNCEMENTS'),
                createPostbackButton('🔙 CỘNG ĐỒNG', 'COMMUNITY')
            ]
        )
    } catch (error) {
        console.error('Error handling community announcements:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thông báo!')
    }
}

// Handle community events
async function handleCommunityEvents(user: any) {
    try {
        const { data: events, error } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (events && events.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎉 SỰ KIỆN CỘNG ĐỒNG\n\nCác sự kiện sắp tới:'
            ])

            for (let i = 0; i < events.length; i++) {
                const event = events[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${event.title}\n📅 ${new Date(event.event_date).toLocaleDateString('vi-VN')}\n📍 ${event.location}\n👥 ${event.participants || 0} người tham gia`,
                    [
                        createPostbackButton('👀 XEM', `EVENT_${event.id}`),
                        createPostbackButton('📝 ĐĂNG KÝ', `EVENT_REGISTER_${event.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎉 SỰ KIỆN CỘNG ĐỒNG\n\n❌ Chưa có sự kiện nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('➕ TẠO SỰ KIỆN', 'EVENT_CREATE'),
                createPostbackButton('🔄 MỚI', 'COMMUNITY_EVENTS'),
                createPostbackButton('🔙 CỘNG ĐỒNG', 'COMMUNITY')
            ]
        )
    } catch (error) {
        console.error('Error handling community events:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải sự kiện!')
    }
}

// Handle community
async function handleCommunity(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '👥 CỘNG ĐỒNG TÂN DẬU - HỖ TRỢ CHÉO\n\nChào mừng bạn đến với cộng đồng Tân Dậu 1981!'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tính năng cộng đồng:',
        [
            createPostbackButton('🎂 SINH NHẬT', 'COMMUNITY_BIRTHDAY'),
            createPostbackButton('⭐ TOP SELLER', 'COMMUNITY_TOP_SELLER'),
            createPostbackButton('🏆 XẾP HẠNG', 'COMMUNITY_RANKING')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Hỗ trợ chéo:',
        [
            createPostbackButton('🤝 HỖ TRỢ LẪN NHAU', 'COMMUNITY_SUPPORT'),
            createPostbackButton('📢 THÔNG BÁO CỘNG ĐỒNG', 'COMMUNITY_ANNOUNCEMENTS'),
            createPostbackButton('🎉 SỰ KIỆN', 'COMMUNITY_EVENTS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Hỗ trợ và kết nối:',
        [
            createPostbackButton('🤝 HỖ TRỢ CHÉO', 'COMMUNITY_SUPPORT'),
            createPostbackButton('💬 CHAT NHÓM', 'COMMUNITY_CHAT')
        ]
    )
}

// Handle payment
async function handlePayment(user: any) {
    // Check if user is in trial and about to expire
    if (isTrialUser(user.membership_expires_at)) {
        const daysLeft = daysUntilExpiry(user.membership_expires_at!)
        await sendMessagesWithTyping(user.facebook_id, [
            '⏰ THÔNG BÁO QUAN TRỌNG\n\nTrial của bạn còn ' + daysLeft + ' ngày!',
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Bạn muốn thanh toán ngay không?',
            [
                createPostbackButton('💰 THANH TOÁN', 'PAYMENT_CONFIRM'),
                createPostbackButton('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
                createPostbackButton('ℹ️ TÌM HIỂU', 'PAYMENT_INFO')
            ]
        )
    } else if (isExpiredUser(user.membership_expires_at)) {
        await sendExpiredMessage(user.facebook_id)
    } else {
        // User has active membership
        await sendMessagesWithTyping(user.facebook_id, [
            '💳 THANH TOÁN & GIA HẠN\n\nTài khoản của bạn đang hoạt động!',
            '📅 Hết hạn: ' + new Date(user.membership_expires_at!).toLocaleDateString('vi-VN')
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💰 GIA HẠN', 'PAYMENT_EXTEND'),
                createPostbackButton('📋 LỊCH SỬ', 'PAYMENT_HISTORY'),
                createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
            ]
        )
    }
}

// Handle horoscope detail
async function handleHoroscopeDetail(user: any) {
    const horoscope = generateHoroscope()

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI CHI TIẾT TÂN DẬU 1981\n\n📅 ' + new Date().toLocaleDateString('vi-VN') + '\n🐓 Tuổi: Tân Dậu (1981)'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 TÀI LỘC:\n' + horoscope.fortune + '\n\n💡 Lời khuyên: Nên đầu tư vào bất động sản, tránh đầu tư rủi ro cao'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '❤️ TÌNH CẢM:\n' + horoscope.love + '\n\n💡 Lời khuyên: Gặp gỡ bạn bè cũ, có thể gặp người đặc biệt'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🏥 SỨC KHỎE:\n' + horoscope.health + '\n\n💡 Lời khuyên: Nghỉ ngơi nhiều, tránh căng thẳng'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🎯 LỜI KHUYÊN TỔNG QUAN:\n' + horoscope.advice + '\n\n🎨 Màu may mắn: ' + horoscope.luckyColor + '\n🔢 Số may mắn: ' + horoscope.luckyNumber
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createPostbackButton('🔮 XEM THÁNG', 'HOROSCOPE_MONTH'),
            createPostbackButton('🔙 TỬ VI', 'HOROSCOPE')
        ]
    )
}

// Handle horoscope week
async function handleHoroscopeWeek(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '📅 TỬ VI TUẦN TÂN DẬU 1981\n\n📅 Tuần từ ' + getWeekStartDate() + ' đến ' + getWeekEndDate()
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 TÀI LỘC TUẦN:\n• Thứ 2-3: Tốt cho giao dịch\n• Thứ 4-5: Nên thận trọng\n• Thứ 6-7: Cơ hội đầu tư\n• Chủ nhật: Nghỉ ngơi'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '❤️ TÌNH CẢM TUẦN:\n• Thứ 2-3: Gặp gỡ bạn bè\n• Thứ 4-5: Tình cảm ổn định\n• Thứ 6-7: Có thể gặp người mới\n• Chủ nhật: Thời gian cho gia đình'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🏥 SỨC KHỎE TUẦN:\n• Thứ 2-3: Năng lượng cao\n• Thứ 4-5: Cần nghỉ ngơi\n• Thứ 6-7: Tập thể dục nhẹ\n• Chủ nhật: Thư giãn hoàn toàn'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔮 XEM THÁNG', 'HOROSCOPE_MONTH'),
            createPostbackButton('🔙 TỬ VI', 'HOROSCOPE')
        ]
    )
}

// Handle horoscope month
async function handleHoroscopeMonth(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI THÁNG TÂN DẬU 1981\n\n📅 Tháng ' + new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 TÀI LỘC THÁNG:\n• Tuần 1: Cơ hội đầu tư tốt\n• Tuần 2: Thận trọng với chi tiêu\n• Tuần 3: Giao dịch thuận lợi\n• Tuần 4: Có thể có lợi nhuận'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '❤️ TÌNH CẢM THÁNG:\n• Tuần 1: Gặp gỡ bạn bè cũ\n• Tuần 2: Tình cảm ổn định\n• Tuần 3: Có thể gặp người đặc biệt\n• Tuần 4: Thời gian cho gia đình'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🏥 SỨC KHỎE THÁNG:\n• Tuần 1: Năng lượng cao\n• Tuần 2: Cần nghỉ ngơi\n• Tuần 3: Tập thể dục đều đặn\n• Tuần 4: Thư giãn và phục hồi'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔙 TỬ VI', 'HOROSCOPE')
        ]
    )
}

// Handle horoscope tomorrow
async function handleHoroscopeTomorrow(user: any) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const horoscope = generateHoroscope()

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI NGÀY MAI TÂN DẬU 1981\n\n📅 ' + tomorrow.toLocaleDateString('vi-VN') + '\n🐓 Tuổi: Tân Dậu (1981)'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 Tài lộc: ' + horoscope.fortune + '\n❤️ Tình cảm: ' + horoscope.love + '\n🏥 Sức khỏe: ' + horoscope.health
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🎯 Lời khuyên: ' + horoscope.advice + '\n🎨 Màu may mắn: ' + horoscope.luckyColor + '\n🔢 Số may mắn: ' + horoscope.luckyNumber
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('🔮 TỬ VI HÔM NAY', 'HOROSCOPE'),
            createPostbackButton('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Helper functions for horoscope
function getWeekStartDate() {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toLocaleDateString('vi-VN')
}

function getWeekEndDate() {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const sunday = new Date(today.setDate(diff + 6))
    return sunday.toLocaleDateString('vi-VN')
}

// Handle horoscope
async function handleHoroscope(user: any) {
    const horoscope = generateHoroscope()

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI TÂN DẬU HÔM NAY\n\n📅 ' + new Date().toLocaleDateString('vi-VN') + '\n🐓 Tuổi: Tân Dậu (1981)\n⭐ Tổng quan: 4/5 sao'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 Tài lộc: ' + horoscope.fortune + ' - Nên đầu tư BĐS\n❤️ Tình cảm: ' + horoscope.love + ' - Gặp gỡ bạn bè\n🏥 Sức khỏe: ' + horoscope.health + ' - Nghỉ ngơi'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🎯 Lời khuyên: ' + horoscope.advice + '\n🎨 Màu may mắn: ' + horoscope.luckyColor + '\n🔢 Số may mắn: ' + horoscope.luckyNumber
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn xem chi tiết không?',
        [
            createPostbackButton('🎲 XEM', 'HOROSCOPE_DETAIL'),
            createPostbackButton('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createPostbackButton('🔮 XEM THÁNG', 'HOROSCOPE_MONTH')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn khác:',
        [
            createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle points rewards discount
async function handlePointsRewardsDiscount(user: any) {
    try {
        const { data: discounts, error } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('type', 'discount')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) throw error

        if (discounts && discounts.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '💳 PHẦN THƯỞNG GIẢM GIÁ\n\nDanh sách giảm giá có thể đổi:'
            ])

            for (let i = 0; i < discounts.length; i++) {
                const discount = discounts[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${discount.name}\n💰 Giá: ${discount.points_required} điểm\n📝 Mô tả: ${discount.description}`,
                    [
                        createPostbackButton('🛒 ĐỔI NGAY', `REDEEM_${discount.id}`),
                        createPostbackButton('ℹ️ CHI TIẾT', `REWARD_DETAIL_${discount.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '💳 PHẦN THƯỞNG GIẢM GIÁ\n\n❌ Chưa có phần thưởng giảm giá nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points rewards discount:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải phần thưởng giảm giá!')
    }
}

// Handle points rewards badges
async function handlePointsRewardsBadges(user: any) {
    try {
        const { data: badges, error } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('type', 'badge')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) throw error

        if (badges && badges.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 PHẦN THƯỞNG HUY HIỆU\n\nDanh sách huy hiệu có thể đổi:'
            ])

            for (let i = 0; i < badges.length; i++) {
                const badge = badges[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${badge.name}\n💰 Giá: ${badge.points_required} điểm\n📝 Mô tả: ${badge.description}`,
                    [
                        createPostbackButton('🛒 ĐỔI NGAY', `REDEEM_${badge.id}`),
                        createPostbackButton('ℹ️ CHI TIẾT', `REWARD_DETAIL_${badge.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 PHẦN THƯỞNG HUY HIỆU\n\n❌ Chưa có huy hiệu nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points rewards badges:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải huy hiệu!')
    }
}

// Handle points rewards gifts
async function handlePointsRewardsGifts(user: any) {
    try {
        const { data: gifts, error } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('type', 'gift')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) throw error

        if (gifts && gifts.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎁 PHẦN THƯỞNG QUÀ TẶNG\n\nDanh sách quà tặng có thể đổi:'
            ])

            for (let i = 0; i < gifts.length; i++) {
                const gift = gifts[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${gift.name}\n💰 Giá: ${gift.points_required} điểm\n📝 Mô tả: ${gift.description}`,
                    [
                        createPostbackButton('🛒 ĐỔI NGAY', `REDEEM_${gift.id}`),
                        createPostbackButton('ℹ️ CHI TIẾT', `REWARD_DETAIL_${gift.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎁 PHẦN THƯỞNG QUÀ TẶNG\n\n❌ Chưa có quà tặng nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points rewards gifts:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải quà tặng!')
    }
}

// Handle points rewards games
async function handlePointsRewardsGames(user: any) {
    try {
        const { data: games, error } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('type', 'game')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) throw error

        if (games && games.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎮 PHẦN THƯỞNG GAME\n\nDanh sách game có thể đổi:'
            ])

            for (let i = 0; i < games.length; i++) {
                const game = games[i]

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${game.name}\n💰 Giá: ${game.points_required} điểm\n📝 Mô tả: ${game.description}`,
                    [
                        createPostbackButton('🛒 ĐỔI NGAY', `REDEEM_${game.id}`),
                        createPostbackButton('ℹ️ CHI TIẾT', `REWARD_DETAIL_${game.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎮 PHẦN THƯỞNG GAME\n\n❌ Chưa có game nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points rewards games:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải game!')
    }
}

// Handle points history
async function handlePointsHistory(user: any) {
    try {
        const { data: transactions, error } = await supabaseAdmin
            .from('points_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error

        if (transactions && transactions.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ ĐIỂM THƯỞNG\n\nDanh sách giao dịch gần nhất:'
            ])

            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i]
                const sign = transaction.points > 0 ? '+' : ''

                await sendButtonTemplate(
                    user.facebook_id,
                    `${i + 1}️⃣ ${transaction.type}\n${sign}${transaction.points} điểm\n📅 ${new Date(transaction.created_at).toLocaleDateString('vi-VN')}\n⏰ ${new Date(transaction.created_at).toLocaleTimeString('vi-VN')}`,
                    [
                        createPostbackButton('ℹ️ CHI TIẾT', `TRANSACTION_DETAIL_${transaction.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ ĐIỂM THƯỞNG\n\n❌ Bạn chưa có giao dịch nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'POINTS_HISTORY'),
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points history:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải lịch sử điểm thưởng!')
    }
}

// Handle points achievements
async function handlePointsAchievements(user: any) {
    try {
        const { data: achievements, error } = await supabaseAdmin
            .from('achievements')
            .select('*')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) throw error

        if (achievements && achievements.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎯 THÀNH TÍCH\n\nDanh sách thành tích có thể đạt được:'
            ])

            for (let i = 0; i < achievements.length; i++) {
                const achievement = achievements[i]
                const isUnlocked = user.points >= achievement.points_required
                const status = isUnlocked ? '✅' : '🔒'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${status} ${achievement.name}\n💰 Yêu cầu: ${achievement.points_required} điểm\n📝 Mô tả: ${achievement.description}`,
                    [
                        createPostbackButton('ℹ️ CHI TIẾT', `ACHIEVEMENT_DETAIL_${achievement.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🎯 THÀNH TÍCH\n\n❌ Chưa có thành tích nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points achievements:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thành tích!')
    }
}

// Handle points leaderboard
async function handlePointsLeaderboard(user: any) {
    try {
        const { data: leaderboard, error } = await supabaseAdmin
            .from('users')
            .select('name, phone, points')
            .eq('status', 'active')
            .order('points', { ascending: false })
            .limit(20)

        if (error) throw error

        if (leaderboard && leaderboard.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 BẢNG XẾP HẠNG ĐIỂM THƯỞNG\n\nTop 20 thành viên có điểm cao nhất:'
            ])

            for (let i = 0; i < leaderboard.length; i++) {
                const member = leaderboard[i]
                const rank = i + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${medal} ${rank}. ${member.name}\n⭐ ${member.points || 0} điểm\n📱 ${member.phone}`,
                    [
                        createPostbackButton('👀 XEM PROFILE', `PROFILE_${member.phone}`),
                        createPostbackButton('💬 LIÊN HỆ', `CONTACT_${member.phone}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🏆 BẢNG XẾP HẠNG ĐIỂM THƯỞNG\n\n❌ Chưa có dữ liệu xếp hạng!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔄 MỚI', 'POINTS_LEADERBOARD'),
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points leaderboard:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải bảng xếp hạng!')
    }
}

// Handle points redeem
async function handlePointsRedeem(user: any) {
    try {
        const { data: rewards, error } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('status', 'active')
            .order('points_required', { ascending: true })

        if (error) throw error

        if (rewards && rewards.length > 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🛒 ĐỔI PHẦN THƯỞNG\n\nDanh sách phần thưởng có thể đổi:'
            ])

            for (let i = 0; i < rewards.length; i++) {
                const reward = rewards[i]
                const canAfford = user.points >= reward.points_required
                const status = canAfford ? '✅' : '❌'

                await sendButtonTemplate(
                    user.facebook_id,
                    `${status} ${reward.name}\n💰 Giá: ${reward.points_required} điểm\n📝 Mô tả: ${reward.description}`,
                    [
                        createPostbackButton('🛒 ĐỔI NGAY', `REDEEM_${reward.id}`),
                        createPostbackButton('ℹ️ CHI TIẾT', `REWARD_DETAIL_${reward.id}`)
                    ]
                )
            }
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '🛒 ĐỔI PHẦN THƯỞNG\n\n❌ Chưa có phần thưởng nào!'
            ])
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('🔙 ĐIỂM', 'POINTS')
            ]
        )
    } catch (error) {
        console.error('Error handling points redeem:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải phần thưởng!')
    }
}

// Helper functions for points
function getNextLevelPoints(level: number): number {
    return (level + 1) * 100
}

// Handle points
async function handlePoints(user: any) {
    try {
        // Get user's current points and level
        const userPoints = parseInt(user.points) || 0
        const userLevel = calculateUserLevel(userPoints)
        const nextLevelPoints = getNextLevelPoints(parseInt(userLevel.toString()))
        const pointsToNext = nextLevelPoints - userPoints

        await sendMessagesWithTyping(user.facebook_id, [
            '⭐ HỆ THỐNG ĐIỂM THƯỞNG\n\n🏆 Level hiện tại: ' + userLevel + ' (' + userPoints + '/' + nextLevelPoints + ' điểm)\n⭐ Tổng điểm: ' + userPoints + ' điểm\n🎯 Streak: 7 ngày liên tiếp'
        ])

        // Get today's activities
        const today = new Date().toISOString().split('T')[0]
        const { data: todayActivities, error } = await supabaseAdmin
            .from('points_transactions')
            .select('type, points')
            .eq('user_id', user.id)
            .gte('created_at', today)

        if (!error && todayActivities) {
            const activities: { [key: string]: number } = todayActivities.reduce((acc: { [key: string]: number }, transaction) => {
                acc[transaction.type] = (acc[transaction.type] || 0) + transaction.points
                return acc
            }, {})

            await sendMessagesWithTyping(user.facebook_id, [
                '📈 Hoạt động hôm nay:\n• Đăng nhập: +' + (activities.login || 0) + ' điểm ✅\n• Tạo tin đăng: +' + (activities.listing || 0) + ' điểm ✅\n• Nhận đánh giá: +' + (activities.rating || 0) + ' điểm ✅\n• Chia sẻ kỷ niệm: +' + (activities.share || 0) + ' điểm ✅'
            ])
        }
    } catch (error) {
        console.error('Error handling points:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra khi tải thông tin điểm thưởng!')
    }

    await sendButtonTemplate(
        user.facebook_id,
        '🎁 Phần thưởng có thể đổi:',
        [
            createPostbackButton('💳 Giảm giá', 'POINTS_REWARDS_DISCOUNT'),
            createPostbackButton('🏆 Huy hiệu', 'POINTS_REWARDS_BADGES'),
            createPostbackButton('🎁 Quà tặng', 'POINTS_REWARDS_GIFTS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm phần thưởng:',
        [
            createPostbackButton('🎮 Game', 'POINTS_REWARDS_GAMES'),
            createPostbackButton('📊 LỊCH SỬ', 'POINTS_HISTORY'),
            createPostbackButton('🎯 THÀNH TÍCH', 'POINTS_ACHIEVEMENTS')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Xếp hạng:',
        [
            createPostbackButton('🏆 LEADERBOARD', 'POINTS_LEADERBOARD')
        ]
    )
}

// Handle settings
async function handleSettings(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '⚙️ CÀI ĐẶT',
        [
            createPostbackButton('👤 THÔNG TIN CÁ NHÂN', 'SETTINGS_PROFILE'),
            createPostbackButton('🔔 THÔNG BÁO', 'SETTINGS_NOTIFICATIONS'),
            createPostbackButton('🔒 BẢO MẬT', 'SETTINGS_SECURITY')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm cài đặt:',
        [
            createPostbackButton('🌐 NGÔN NGỮ', 'SETTINGS_LANGUAGE'),
            createPostbackButton('🎨 GIAO DIỆN', 'SETTINGS_THEME'),
            createPostbackButton('📊 PRIVACY', 'SETTINGS_PRIVACY')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Hỗ trợ và điều hướng:',
        [
            createPostbackButton('❓ HỖ TRỢ', 'SUPPORT'),
            createPostbackButton('📱 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle support
async function handleSupport(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '💬 CHỌN CHẾ ĐỘ CHAT\n\n🤖 [BOT TÂN DẬU] - Hệ thống tự động\n   • Gợi ý sản phẩm thông minh\n   • Cross-selling tự động\n   • Trả lời câu hỏi thường gặp\n\n👨‍💼 [ADMIN HỖ TRỢ] - Hỗ trợ trực tiếp\n   • Tư vấn cá nhân hóa\n   • Giải quyết vấn đề phức tạp\n   • Hỗ trợ kỹ thuật',
        [
            createPostbackButton('🤖 CHAT BOT', 'SUPPORT_BOT'),
            createPostbackButton('👨‍💼 CHAT ADMIN', 'SUPPORT_ADMIN')
        ]
    )
}

// Handle support bot
async function handleSupportBot(user: any) {
    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        '🤖 Tôi đã sẵn sàng hỗ trợ bạn!',
        'Bạn có thể hỏi tôi về:\n• Tìm kiếm sản phẩm/dịch vụ\n• Hướng dẫn sử dụng\n• Thông tin cộng đồng\n• Tử vi hàng ngày'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn chức năng bạn muốn sử dụng:',
        [
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
            createPostbackButton('💬 HỖ TRỢ', 'SUPPORT_ADMIN'),
            createPostbackButton('🔮 TỬ VI', 'HOROSCOPE')
        ]
    )

    await sendButtonTemplate(
        user.facebook_id,
        'Thêm tùy chọn:',
        [
            createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle default message for new users
async function handleDefaultMessage(user: any) {
    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        '🎉 CHÀO MỪNG ĐẾN VỚI BOT TÂN DẬU 1981! 🎉',
        '👋 Xin chào! Tôi là bot hỗ trợ cộng đồng Tân Dậu 1981.',
        'Để sử dụng đầy đủ tính năng, bạn cần đăng ký thành viên trước.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn:',
        [
            createPostbackButton('📝 ĐĂNG KÝ', 'REGISTER'),
            createPostbackButton('ℹ️ THÔNG TIN', 'INFO'),
            createPostbackButton('💬 HỖ TRỢ', 'SUPPORT_ADMIN')
        ]
    )
}

// Handle info for new users
async function handleInfo(user: any) {
    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        'ℹ️ THÔNG TIN VỀ BOT TÂN DẬU 1981',
        '🤖 Bot này được thiết kế đặc biệt cho cộng đồng Tân Dậu 1981',
        '📋 Các tính năng chính:'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '🛒 MUA BÁN & TÌM KIẾM\n• Đăng tin sản phẩm/dịch vụ\n• Tìm kiếm theo danh mục\n• Kết nối trực tiếp với người bán',
        '👥 CỘNG ĐỒNG\n• Top seller uy tín\n• Thông báo sinh nhật\n• Hỗ trợ lẫn nhau',
        '🔮 TỬ VI HÀNG NGÀY\n• Dành riêng cho Tân Dậu 1981\n• Lời khuyên tài lộc, tình cảm, sức khỏe'
    ])

    await sendMessagesWithTyping(user.facebook_id, [
        '⭐ HỆ THỐNG ĐIỂM THƯỞNG\n• Tích điểm khi sử dụng\n• Đổi quà tặng hấp dẫn\n• Bảng xếp hạng cộng đồng',
        '💳 THANH TOÁN\n• Gói 1 tuần: 50K\n• Gói 1 tháng: 200K\n• Gói 3 tháng: 500K (tiết kiệm 100K)'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn:',
        [
            createPostbackButton('📝 ĐĂNG KÝ', 'REGISTER'),
            createPostbackButton('💬 HỖ TRỢ', 'SUPPORT_ADMIN'),
            createPostbackButton('🔙 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle default message for registered users
async function handleDefaultMessageRegistered(user: any) {
    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        `👋 Chào anh/chị ${user.name}!`,
        'Hôm nay bạn muốn làm gì?'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn chức năng:',
        [
            createPostbackButton('🔍 TÌM KIẾM', 'SEARCH_UPDATE'),
            createPostbackButton('💬 HỖ TRỢ', 'SUPPORT_ADMIN')
        ]
    )
}


// Send expired message
async function sendExpiredMessage(facebookId: string) {
    await sendMessagesWithTyping(facebookId, [
        '⏰ TRIAL ĐÃ HẾT HẠN!\n\nTrial của bạn đã hết hạn!',
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
    ])

    await sendButtonTemplate(
        facebookId,
        'Bạn muốn thanh toán để tiếp tục sử dụng không?',
        [
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT_CONFIRM'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('❌ HỦY', 'CANCEL')
        ]
    )
}

// Send trial expiring message
async function sendTrialExpiringMessage(facebookId: string, daysLeft: number) {
    const urgency = daysLeft === 1 ? '🚨 CẢNH BÁO TRIAL SẮP HẾT!' : '⏰ THÔNG BÁO QUAN TRỌNG'

    await sendMessagesWithTyping(facebookId, [
        urgency + '\n\nTrial của bạn còn ' + daysLeft + ' ngày!',
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
    ])

    await sendButtonTemplate(
        facebookId,
        'Bạn muốn thanh toán ngay không?',
        [
            createPostbackButton('💰 THANH TOÁN', 'PAYMENT_CONFIRM'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('❌ HỦY', 'CANCEL')
        ]
    )
}

// Helper functions
async function getBotSession(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('bot_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) {
        return null
    }

    return data
}

async function updateBotSession(userId: string, sessionData: any) {
    const { error } = await supabaseAdmin
        .from('bot_sessions')
        .upsert({
            user_id: userId,
            session_data: sessionData,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('Error updating bot session:', error)
    }
}
