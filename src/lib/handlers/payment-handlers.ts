import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    createPostbackButton,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, isTrialUser, isExpiredUser, daysUntilExpiry, generateId } from '../utils'

// Helper function to update bot session
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

// Handle payment flow
export async function handlePayment(user: any) {
    await sendTypingIndicator(user.facebook_id)

    // Check user status
    if (isExpiredUser(user.membership_expires_at)) {
        await sendExpiredPaymentMessage(user)
        return
    }

    if (isTrialUser(user.membership_expires_at)) {
        const daysLeft = daysUntilExpiry(user.membership_expires_at!)
        await sendTrialPaymentMessage(user, daysLeft)
        return
    }

    // Regular payment flow
    await sendMessagesWithTyping(user.facebook_id, [
        '💰 THANH TOÁN',
        'Chọn gói dịch vụ bạn muốn:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Gói dịch vụ:',
        [
            createPostbackButton('📅 7 NGÀY - 7,000đ', 'PAYMENT_PACKAGE_7'),
            createPostbackButton('📅 15 NGÀY - 15,000đ', 'PAYMENT_PACKAGE_15'),
            createPostbackButton('📅 30 NGÀY - 30,000đ', 'PAYMENT_PACKAGE_30'),
            createPostbackButton('📅 90 NGÀY - 90,000đ', 'PAYMENT_PACKAGE_90'),
            createPostbackButton('📊 LỊCH SỬ THANH TOÁN', 'PAYMENT_HISTORY'),
            createPostbackButton('ℹ️ HƯỚNG DẪN', 'PAYMENT_GUIDE')
        ]
    )
}

// Handle expired payment message
async function sendExpiredPaymentMessage(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⏰ TÀI KHOẢN ĐÃ HẾT HẠN!',
        'Tài khoản của bạn đã hết hạn sử dụng.',
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Gia hạn tài khoản:',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_PACKAGE_7'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('❌ HỦY', 'MAIN_MENU')
        ]
    )
}

// Handle trial payment message
async function sendTrialPaymentMessage(user: any, daysLeft: number) {
    if (daysLeft === 1) {
        await sendMessagesWithTyping(user.facebook_id, [
            '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
            'Trial của bạn còn 24 giờ!',
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])
    } else {
        await sendMessagesWithTyping(user.facebook_id, [
            '⏰ THÔNG BÁO QUAN TRỌNG',
            `Trial của bạn còn ${daysLeft} ngày!`,
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])
    }

    await sendButtonTemplate(
        user.facebook_id,
        'Gia hạn tài khoản:',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT_PACKAGE_7'),
            createPostbackButton('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
            createPostbackButton('ℹ️ TÌM HIỂU', 'PAYMENT_GUIDE')
        ]
    )
}

// Handle payment package selection
export async function handlePaymentPackage(user: any, packageType: string) {
    await sendTypingIndicator(user.facebook_id)

    const packages = {
        '7': { days: 7, price: 7000, name: '7 ngày' },
        '15': { days: 15, price: 15000, name: '15 ngày' },
        '30': { days: 30, price: 30000, name: '30 ngày' },
        '90': { days: 90, price: 90000, name: '90 ngày' }
    }

    const pkg = packages[packageType as keyof typeof packages]
    if (!pkg) {
        await sendMessage(user.facebook_id, '❌ Gói dịch vụ không hợp lệ!')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 THANH TOÁN',
        `📋 Thông tin gói:\n• Loại: ${pkg.name}\n• Giá: ${formatCurrency(pkg.price)}\n• Thời gian: ${pkg.days} ngày`,
        '🏦 THÔNG TIN CHUYỂN KHOẢN:\n• STK: 0123456789\n• Ngân hàng: Vietcombank\n• Chủ TK: BOT TÂN DẬU',
        `• Nội dung: TANDẬU ${user.phone || user.facebook_id.slice(-6)}`
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Sau khi chuyển khoản:',
        [
            createPostbackButton('📸 UPLOAD BIÊN LAI', `PAYMENT_UPLOAD_${packageType}`),
            createPostbackButton('❌ HỦY', 'PAYMENT')
        ]
    )
}

// Handle payment upload receipt
export async function handlePaymentUploadReceipt(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📸 UPLOAD BIÊN LAI',
        'Vui lòng gửi ảnh biên lai chuyển khoản rõ nét:',
        '📋 Lưu ý:\n• Ảnh phải rõ nét, đọc được thông tin\n• Bao gồm số tiền, thời gian, nội dung chuyển khoản\n• Thời gian xử lý: 2-4 giờ'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📷 Chụp ảnh', 'PAYMENT_CAMERA'),
            createPostbackButton('📁 Chọn từ thư viện', 'PAYMENT_GALLERY'),
            createPostbackButton('❌ HỦY', 'PAYMENT')
        ]
    )
}

// Handle payment confirmation
export async function handlePaymentConfirm(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '✅ BIÊN LAI ĐÃ NHẬN',
        '📸 Biên lai đã được lưu:\n• Số tiền: 7,000đ\n• Thời gian: ' + new Date().toLocaleString('vi-VN') + '\n• Trạng thái: Đang xử lý...',
        '⏱️ Thời gian xử lý: 2-4 giờ\n📱 Sẽ thông báo khi duyệt'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📊 LỊCH SỬ THANH TOÁN', 'PAYMENT_HISTORY'),
            createPostbackButton('❓ HỖ TRỢ', 'SUPPORT'),
            createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment history
export async function handlePaymentHistory(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get payment history
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching payment history:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải lịch sử thanh toán.')
            return
        }

        if (!payments || payments.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ THANH TOÁN',
                'Bạn chưa có giao dịch nào.',
                'Hãy thanh toán để sử dụng dịch vụ!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ THANH TOÁN',
                `Tổng cộng: ${payments.length} giao dịch`
            ])

            const paymentText = payments.map((payment, index) => {
                const status = payment.status === 'approved' ? '✅' : payment.status === 'pending' ? '⏳' : '❌'
                const date = new Date(payment.created_at).toLocaleDateString('vi-VN')
                return `${index + 1}. ${status} ${date} - ${formatCurrency(payment.amount)} - ${payment.package_type}`
            }).join('\n')

            await sendMessage(user.facebook_id, paymentText)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💰 THANH TOÁN MỚI', 'PAYMENT'),
                createPostbackButton('📤 XUẤT BÁO CÁO', 'PAYMENT_EXPORT'),
                createPostbackButton('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in payment history:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle paid advertising
export async function handlePaidAdvertising(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 GÓI QUẢNG CÁO',
        'Tăng khả năng hiển thị tin đăng của bạn:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn gói quảng cáo:',
        [
            createPostbackButton('🏠 HOMEPAGE BANNER - 50,000đ/ngày', 'ADVERTISING_HOMEPAGE'),
            createPostbackButton('🔍 SEARCH BOOST - 30,000đ/ngày', 'ADVERTISING_SEARCH'),
            createPostbackButton('🎯 CROSS-SELL SPOT - 20,000đ/ngày', 'ADVERTISING_CROSS_SELL'),
            createPostbackButton('⭐ FEATURED LISTING - 15,000đ/ngày', 'ADVERTISING_FEATURED'),
            createPostbackButton('📊 XEM THỐNG KÊ QUẢNG CÁO', 'ADVERTISING_STATS'),
            createPostbackButton('🔙 QUAY LẠI', 'MAIN_MENU')
        ]
    )
}

// Handle advertising package selection
export async function handleAdvertisingPackage(user: any, packageType: string) {
    await sendTypingIndicator(user.facebook_id)

    const packages = {
        'HOMEPAGE': {
            name: 'Homepage Banner',
            price: 50000,
            description: 'Hiển thị trên trang chủ, vị trí top, dễ nhìn'
        },
        'SEARCH': {
            name: 'Search Boost',
            price: 30000,
            description: 'Tăng 3x khả năng hiển thị, ưu tiên trong kết quả tìm kiếm'
        },
        'CROSS_SELL': {
            name: 'Cross-sell Spot',
            price: 20000,
            description: 'Hiển thị trong tin đăng khác, tăng tương tác'
        },
        'FEATURED': {
            name: 'Featured Listing',
            price: 15000,
            description: 'Tin đăng nổi bật với icon đặc biệt'
        }
    }

    const pkg = packages[packageType as keyof typeof packages]
    if (!pkg) {
        await sendMessage(user.facebook_id, '❌ Gói quảng cáo không hợp lệ!')
        return
    }

    await sendMessagesWithTyping(user.facebook_id, [
        '💰 THANH TOÁN QUẢNG CÁO',
        `📋 Thông tin gói:`,
        `• Loại: ${pkg.name}`,
        `• Giá: ${formatCurrency(pkg.price)}/ngày`,
        `• Mô tả: ${pkg.description}`,
        `• Thời gian: 7 ngày`,
        `• Tổng: ${formatCurrency(pkg.price * 7)}`,
        '',
        '🏦 THÔNG TIN CHUYỂN KHOẢN:',
        '• STK: 0123456789',
        '• Ngân hàng: Vietcombank',
        '• Chủ TK: BOT TÂN DẬU',
        '• Nội dung: QUANGCAO [SĐT_CỦA_BẠN]'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Sau khi chuyển khoản:',
        [
            createPostbackButton('📸 UPLOAD BIÊN LAI', 'ADVERTISING_UPLOAD_RECEIPT'),
            createPostbackButton('❌ HỦY', 'ADVERTISING')
        ]
    )
}

// Handle advertising upload receipt
export async function handleAdvertisingUploadReceipt(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📸 UPLOAD BIÊN LAI QUẢNG CÁO',
        'Vui lòng gửi hình ảnh biên lai chuyển khoản',
        'Tôi sẽ xác nhận và kích hoạt quảng cáo cho bạn!'
    ])

    // Set session for receipt upload
    await updateBotSession(user.facebook_id, {
        current_flow: 'advertising_receipt',
        step: 'upload_receipt',
        data: {}
    })
}

// Handle advertising receipt processing
export async function handleAdvertisingReceiptProcess(user: any, imageUrl: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Process receipt and activate advertising
        await sendMessagesWithTyping(user.facebook_id, [
            '✅ BIÊN LAI ĐÃ NHẬN!',
            '🎯 Đang kích hoạt quảng cáo...',
            '⏰ Thời gian xử lý: 2 giờ',
            '📱 Quảng cáo sẽ hoạt động trong 24h'
        ])

        // Create advertising record
        const { error } = await supabaseAdmin
            .from('advertisements')
            .insert({
                id: generateId(),
                user_id: user.facebook_id,
                package_type: 'homepage',
                status: 'processing',
                fee: 50000,
                receipt_url: imageUrl,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error creating advertisement:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
            return
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📊 XEM THỐNG KÊ', 'ADVERTISING_STATS'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

        // Clear session
        await updateBotSession(user.facebook_id, null)

    } catch (error) {
        console.error('Error in advertising receipt process:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle advertising stats
export async function handleAdvertisingStats(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get user's advertising stats
        const { data: ads, error } = await supabaseAdmin
            .from('advertisements')
            .select('*')
            .eq('user_id', user.facebook_id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching advertising stats:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thống kê!')
            return
        }

        if (!ads || ads.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 THỐNG KÊ QUẢNG CÁO',
                'Bạn chưa có quảng cáo nào.',
                'Hãy chọn gói quảng cáo để tăng khả năng hiển thị!'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 THỐNG KÊ QUẢNG CÁO',
                `Tổng cộng: ${ads.length} quảng cáo`
            ])

            const statsText = ads.slice(0, 5).map((ad, index) => {
                const date = new Date(ad.created_at).toLocaleDateString('vi-VN')
                const status = ad.status === 'active' ? '✅' : ad.status === 'processing' ? '⏳' : '❌'
                return `${index + 1}. ${status} ${ad.package_type} - ${formatCurrency(ad.fee)} - ${date}`
            }).join('\n')

            await sendMessage(user.facebook_id, statsText)
        }

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('💰 QUẢNG CÁO MỚI', 'ADVERTISING'),
                createPostbackButton('🏠 TRANG CHỦ', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in advertising stats:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle payment guide
export async function handlePaymentGuide(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        'ℹ️ HƯỚNG DẪN THANH TOÁN',
        '📋 Các bước thanh toán:\n1. Chọn gói dịch vụ phù hợp\n2. Chuyển khoản theo thông tin\n3. Upload biên lai chuyển khoản\n4. Chờ admin duyệt (2-4 giờ)',
        '🏦 THÔNG TIN CHUYỂN KHOẢN:\n• STK: 0123456789\n• Ngân hàng: Vietcombank\n• Chủ TK: BOT TÂN DẬU',
        '💡 LƯU Ý:\n• Nội dung chuyển khoản phải chính xác\n• Biên lai phải rõ nét, đọc được\n• Liên hệ admin nếu có vấn đề',
        '❓ CÂU HỎI THƯỜNG GẶP:\n• Q: Khi nào tài khoản được gia hạn?\nA: Ngay sau khi admin duyệt\n• Q: Có thể hủy giao dịch không?\nA: Có, liên hệ admin trong 24h'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('🔙 QUAY LẠI', 'MAIN_MENU')
        ]
    )
}

// Handle payment extend
export async function handlePaymentExtend(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔄 GIA HẠN TÀI KHOẢN',
        'Gia hạn tài khoản để tiếp tục sử dụng dịch vụ:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn gói gia hạn:',
        [
            createPostbackButton('📅 7 NGÀY - 7,000đ', 'PAYMENT_PACKAGE_7'),
            createPostbackButton('📅 15 NGÀY - 15,000đ', 'PAYMENT_PACKAGE_15'),
            createPostbackButton('📅 30 NGÀY - 30,000đ', 'PAYMENT_PACKAGE_30'),
            createPostbackButton('📅 90 NGÀY - 90,000đ', 'PAYMENT_PACKAGE_90'),
            createPostbackButton('🔙 QUAY LẠI', 'PAYMENT')
        ]
    )
}

// Handle expired user message
export async function sendExpiredMessage(facebookId: string) {
    await sendTypingIndicator(facebookId)
    await sendMessagesWithTyping(facebookId, [
        '⏰ TÀI KHOẢN ĐÃ HẾT HẠN!',
        'Tài khoản của bạn đã hết hạn sử dụng.',
        '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
    ])

    await sendButtonTemplate(
        facebookId,
        'Gia hạn tài khoản:',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createPostbackButton('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createPostbackButton('❌ HỦY', 'MAIN_MENU')
        ]
    )
}

// Handle trial expiring message
export async function sendTrialExpiringMessage(facebookId: string, daysLeft: number) {
    await sendTypingIndicator(facebookId)

    if (daysLeft === 1) {
        await sendMessagesWithTyping(facebookId, [
            '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
            'Trial của bạn còn 24 giờ!',
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])
    } else {
        await sendMessagesWithTyping(facebookId, [
            '⏰ THÔNG BÁO QUAN TRỌNG',
            `Trial của bạn còn ${daysLeft} ngày!`,
            '💳 Phí duy trì: 1,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 7,000đ'
        ])
    }

    await sendButtonTemplate(
        facebookId,
        'Gia hạn tài khoản:',
        [
            createPostbackButton('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createPostbackButton('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
            createPostbackButton('ℹ️ TÌM HIỂU', 'INFO')
        ]
    )
}
