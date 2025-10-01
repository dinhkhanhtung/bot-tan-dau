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
            case 'COMMUNITY':
                await handleCommunity(user)
                break
            case 'PAYMENT':
                await handlePayment(user)
                break
            case 'HOROSCOPE':
                await handleHoroscope(user)
                break
            case 'POINTS':
                await handlePoints(user)
                break
            case 'SETTINGS':
                await handleSettings(user)
                break
            case 'SUPPORT':
                await handleSupport(user)
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
            createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT'),
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
export async function handleListingImages(user: any, imageUrl: string) {
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
            'Bước 1/4: Họ tên\n👤 Vui lòng nhập họ tên đầy đủ của bạn:\n\nVD: Nguyễn Văn Minh'
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
    await sendButtonTemplate(
        user.facebook_id,
        '🛒 NIÊM YẾT SẢN PHẨM/DỊCH VỤ\n\nChọn loại tin đăng bạn muốn đăng:',
        [
            createPostbackButton('🏠 BẤT ĐỘNG SẢN', 'LISTING_CATEGORY_BẤT ĐỘNG SẢN'),
            createPostbackButton('🚗 Ô TÔ', 'LISTING_CATEGORY_Ô TÔ'),
            createPostbackButton('📱 ĐIỆN TỬ', 'LISTING_CATEGORY_ĐIỆN TỬ')
        ]
    )
    
    await sendButtonTemplate(
        user.facebook_id,
        'Thêm danh mục:',
        [
            createPostbackButton('👕 THỜI TRANG', 'LISTING_CATEGORY_THỜI TRANG'),
            createPostbackButton('🍽️ ẨM THỰC', 'LISTING_CATEGORY_ẨM THỰC'),
            createPostbackButton('🔧 DỊCH VỤ', 'LISTING_CATEGORY_DỊCH VỤ')
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
}

// Handle search advanced
async function handleSearchAdvanced(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🎯 TÌM KIẾM NÂNG CAO\n\nTính năng này đang được phát triển!',
        'Hiện tại bạn có thể sử dụng tìm kiếm theo danh mục ở trên.'
    ])
    
    await showMainMenu(user)
}

// Handle search keyword
async function handleSearchKeyword(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '🔍 TÌM THEO TỪ KHÓA\n\nTính năng này đang được phát triển!',
        'Hiện tại bạn có thể sử dụng tìm kiếm theo danh mục ở trên.'
    ])
    
    await showMainMenu(user)
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
            createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
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
                    createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                    createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
                    createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                    createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
                createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_USERS')
            ]
        )

        await sendButtonTemplate(
            user.facebook_id,
            'Quản lý:',
            [
                createPostbackButton('⚠️ USER VI PHẠM', 'ADMIN_VIOLATIONS'),
                createPostbackButton('🔔 GỬI THÔNG BÁO', 'ADMIN_SEND_NOTIFICATION'),
                createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
                createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_LISTINGS'),
                createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
                createPostbackButton('📈 XEM CHI TIẾT', 'ADMIN_DETAILED_STATS'),
                createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT'),
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_STATS'),
                createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
            createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
            createPostbackButton('📋 XEM LỊCH SỬ', 'ADMIN_NOTIFICATION_HISTORY'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'ADMIN_NOTIFICATION_SETTINGS'),
            createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU'),
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
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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
                createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
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
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                createPostbackButton('🔙 VỀ ADMIN', 'ADMIN')
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

// Handle community
async function handleCommunity(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '👥 CỘNG ĐỒNG TÂN DẬU - HỖ TRỢ CHÉO',
        [
            createPostbackButton('🎂 SINH NHẬT', 'COMMUNITY_BIRTHDAY'),
            createPostbackButton('🏆 TOP SELLER', 'COMMUNITY_TOP_SELLER'),
            createPostbackButton('📖 KỶ NIỆM', 'COMMUNITY_MEMORIES')
        ]
    )
    
    await sendButtonTemplate(
        user.facebook_id,
        'Thêm hoạt động cộng đồng:',
        [
            createPostbackButton('🎪 SỰ KIỆN', 'COMMUNITY_EVENTS'),
            createPostbackButton('⭐ THÀNH TÍCH', 'COMMUNITY_ACHIEVEMENTS'),
            createPostbackButton('🔮 TỬ VI', 'COMMUNITY_HOROSCOPE')
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
                createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_CONFIRM'),
                createPostbackButton('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
                createPostbackButton('ℹ️ TÌM HIỂU', 'PAYMENT_INFO')
            ]
        )
    } else {
        await sendMessage(user.facebook_id, 'Tài khoản của bạn đã được thanh toán!')
        await showMainMenu(user)
    }
}

// Handle horoscope
async function handleHoroscope(user: any) {
    const horoscope = generateHoroscope()

    await sendMessagesWithTyping(user.facebook_id, [
        '🔮 TỬ VI TÂN DẬU HÔM NAY\n\n📅 ' + new Date().toLocaleDateString('vi-VN') + '\n🐓 Tuổi: Tân Dậu (1981)\n⭐ Tổng quan: 4/5 sao',
        '💰 Tài lộc: ' + horoscope.fortune + ' - Nên đầu tư BĐS\n❤️ Tình cảm: ' + horoscope.love + ' - Gặp gỡ bạn bè\n🏥 Sức khỏe: ' + horoscope.health + ' - Nghỉ ngơi',
        '🎯 Lời khuyên: ' + horoscope.advice + '\n🎨 Màu may mắn: ' + horoscope.luckyColor + '\n🔢 Số may mắn: ' + horoscope.luckyNumber
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Bạn muốn xem chi tiết không?',
        [
            createPostbackButton('🎲 XEM CHI TIẾT', 'HOROSCOPE_DETAIL'),
            createPostbackButton('📅 XEM TUẦN', 'HOROSCOPE_WEEK'),
            createPostbackButton('🔮 XEM THÁNG', 'HOROSCOPE_MONTH')
        ]
    )
    
    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn khác:',
        [
            createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle points
async function handlePoints(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⭐ HỆ THỐNG ĐIỂM THƯỞNG\n\n🏆 Level hiện tại: ' + calculateUserLevel(150) + ' (150/200 điểm)\n⭐ Tổng điểm: 1,250 điểm\n🎯 Streak: 7 ngày liên tiếp',
        '📈 Hoạt động hôm nay:\n• Đăng nhập: +2 điểm ✅\n• Tạo tin đăng: +10 điểm ✅\n• Nhận đánh giá: +5 điểm ✅\n• Chia sẻ kỷ niệm: +3 điểm ✅'
    ])

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
            createPostbackButton('📊 XEM LỊCH SỬ', 'POINTS_HISTORY'),
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
            createPostbackButton('📱 VỀ TRANG CHỦ', 'MAIN_MENU')
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

// Handle default message for new users
async function handleDefaultMessage(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '👋 Chào bạn! Hôm nay bạn muốn...',
        'Tôi có thể giúp bạn:\n• Tìm kiếm sản phẩm/dịch vụ\n• Mua bán an toàn\n• Kết nối cộng đồng Tân Dậu 1981'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn chức năng bạn muốn:',
        [
            createPostbackButton('🛒 MUA BÁN & TÌM KIẾM', 'BUY_SELL'),
            createPostbackButton('📝 ĐĂNG KÝ VÀ CẬP NHẬT', 'REGISTER'),
            createPostbackButton('👨‍💼 CHAT VỚI ADMIN', 'SUPPORT_ADMIN')
        ]
    )
}

// Handle default message for registered users
async function handleDefaultMessageRegistered(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        `👋 Chào anh/chị ${user.name}!`,
        'Hôm nay bạn muốn làm gì?'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn chức năng:',
        [
            createPostbackButton('🔍 TÌM KIẾM & CẬP NHẬT', 'SEARCH_UPDATE'),
            createPostbackButton('👨‍💼 CHAT VỚI ADMIN', 'SUPPORT_ADMIN')
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
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_CONFIRM'),
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
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_CONFIRM'),
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
