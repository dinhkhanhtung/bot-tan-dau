import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, isTrialUser, isExpiredUser, daysUntilExpiry, generateId, updateBotSession } from '../utils'

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
            'Chọn gói thanh toán phù hợp với bạn:',
            '💡 Với số tiền này bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu!'
        ])

    await sendQuickReply(
        user.facebook_id,
        'Gói dịch vụ:',
        [
            createQuickReply('📅 7 NGÀY - ₫7,000', 'PAYMENT_PACKAGE_7'),
            createQuickReply('📅 15 NGÀY - ₫15,000', 'PAYMENT_PACKAGE_15'),
            createQuickReply('📅 30 NGÀY - ₫30,000', 'PAYMENT_PACKAGE_30'),
            createQuickReply('📅 90 NGÀY - ₫90,000', 'PAYMENT_PACKAGE_90'),
            createQuickReply('📊 LỊCH SỬ THANH TOÁN', 'PAYMENT_HISTORY'),
            createQuickReply('ℹ️ HƯỚNG DẪN', 'PAYMENT_GUIDE')
        ]
    )
}

// Handle expired payment message
async function sendExpiredPaymentMessage(user: any) {
    await sendMessagesWithTyping(user.facebook_id, [
        '⏰ TÀI KHOẢN ĐÃ HẾT HẠN!',
        'Tài khoản của bạn đã hết hạn sử dụng.',
        '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Gia hạn tài khoản:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT_PACKAGE_7'),
            createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createQuickReply('❌ HỦY', 'MAIN_MENU')
        ]
    )
}

// Handle trial payment message
async function sendTrialPaymentMessage(user: any, daysLeft: number) {
    if (daysLeft === 1) {
        await sendMessagesWithTyping(user.facebook_id, [
            '🚨 CẢNH BÁO TRIAL SẮP HẾT!',
            'Trial của bạn còn 24 giờ!',
        '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
        ])
    } else {
        await sendMessagesWithTyping(user.facebook_id, [
            '⏰ THÔNG BÁO QUAN TRỌNG',
            `Trial của bạn còn ${daysLeft} ngày!`,
        '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
        ])
    }

    await sendQuickReply(
        user.facebook_id,
        'Gia hạn tài khoản:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT_PACKAGE_7'),
            createQuickReply('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
            createQuickReply('ℹ️ TÌM HIỂU', 'PAYMENT_GUIDE')
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
        '🏦 THÔNG TIN CHUYỂN KHOẢN:\n• STK: 0982581222\n• Ngân hàng: BIDV\n• Chủ TK: Đinh Khánh Tùng',
        `• Nội dung: TD-HTC ${user.phone || user.facebook_id.slice(-6)}`
    ])

    await sendQuickReply(
        user.facebook_id,
        'Sau khi chuyển khoản:',
        [
            createQuickReply('📸 UPLOAD BIÊN LAI', `PAYMENT_UPLOAD_${packageType}`),
            createQuickReply('❌ HỦY', 'PAYMENT')
        ]
    )
}

// Handle payment upload receipt
export async function handlePaymentUploadReceipt(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📷 Chụp ảnh', 'PAYMENT_CAMERA'),
            createQuickReply('📁 Chọn từ thư viện', 'PAYMENT_GALLERY'),
            createQuickReply('❌ HỦY', 'PAYMENT')
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

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📊 LỊCH SỬ THANH TOÁN', 'PAYMENT_HISTORY'),
            createQuickReply('❓ HỖ TRỢ', 'SUPPORT'),
            createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle payment history - IMPROVED VERSION
export async function handlePaymentHistory(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get payment history with more details
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
                '📭 Bạn chưa có giao dịch nào.',
                '💡 Hãy thanh toán để sử dụng dịch vụ!',
                '🎯 Gói tối thiểu: 7 ngày = 7,000đ'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '📊 LỊCH SỬ THANH TOÁN',
                `📋 Tổng cộng: ${payments.length} giao dịch`,
                '━━━━━━━━━━━━━━━━━━━━'
            ])

            // Group payments by status for better organization
            const pendingPayments = payments.filter(p => p.status === 'pending')
            const approvedPayments = payments.filter(p => p.status === 'approved')
            const rejectedPayments = payments.filter(p => p.status === 'rejected')

            // Show pending payments first (most important)
            if (pendingPayments.length > 0) {
                await sendMessage(user.facebook_id, '⏳ THANH TOÁN ĐANG CHỜ DUYỆT:')
                for (const payment of pendingPayments) {
                    const date = new Date(payment.created_at).toLocaleDateString('vi-VN')
                    const time = new Date(payment.created_at).toLocaleTimeString('vi-VN')
                    const days = Math.floor(payment.amount / 1000)

                    await sendMessage(user.facebook_id, `📋 #${payment.id.slice(-8)}\n💰 ${formatCurrency(payment.amount)} (${days} ngày)\n📅 ${date} ${time}\n⏱️ Đang xử lý...`)

                    // Show receipt if available
                    if (payment.receipt_image) {
                        await sendMessage(user.facebook_id, '📸 Đã upload biên lai')
                    }
                }
                await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            }

            // Show recent approved payments
            if (approvedPayments.length > 0) {
                await sendMessage(user.facebook_id, '✅ THANH TOÁN ĐÃ DUYỆT:')
                const recentApproved = approvedPayments.slice(0, 3)
                for (const payment of recentApproved) {
                    const date = new Date(payment.created_at).toLocaleDateString('vi-VN')
                    const approvedDate = payment.approved_at ? new Date(payment.approved_at).toLocaleDateString('vi-VN') : 'N/A'
                    const days = Math.floor(payment.amount / 1000)

                    await sendMessage(user.facebook_id, `📋 #${payment.id.slice(-8)}\n💰 ${formatCurrency(payment.amount)} (${days} ngày)\n📅 Tạo: ${date}\n✅ Duyệt: ${approvedDate}`)
                }
                await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            }

            // Summary stats
            const totalSpent = approvedPayments.reduce((sum, p) => sum + p.amount, 0)
            const totalDays = approvedPayments.reduce((sum, p) => sum + Math.floor(p.amount / 1000), 0)

            await sendMessagesWithTyping(user.facebook_id, [
                '📈 THỐNG KÊ THANH TOÁN:',
                `💰 Tổng chi tiêu: ${formatCurrency(totalSpent)}`,
                `📅 Tổng thời gian: ${totalDays} ngày`,
                `✅ Đã duyệt: ${approvedPayments.length}`,
                `⏳ Chờ duyệt: ${pendingPayments.length}`,
                `❌ Từ chối: ${rejectedPayments.length}`
            ])
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 THANH TOÁN MỚI', 'PAYMENT'),
                createQuickReply('📤 XUẤT BÁO CÁO', 'PAYMENT_EXPORT'),
                createQuickReply('🔄 LÀM MỚI', 'PAYMENT_HISTORY'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in payment history:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle payment status tracking - NEW FEATURE
export async function handlePaymentStatus(user: any, paymentId?: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        let payments

        if (paymentId) {
            // Get specific payment
            const { data: payment, error } = await supabaseAdmin
                .from('payments')
                .select('*')
                .eq('id', paymentId)
                .eq('user_id', user.facebook_id)
                .single()

            if (error || !payment) {
                await sendMessage(user.facebook_id, '❌ Không tìm thấy thanh toán này!')
                return
            }
            payments = [payment]
        } else {
            // Get recent payments
            const { data: recentPayments, error } = await supabaseAdmin
                .from('payments')
                .select('*')
                .eq('user_id', user.facebook_id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) {
                await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải trạng thái thanh toán.')
                return
            }
            payments = recentPayments || []
        }

        if (payments.length === 0) {
            await sendMessage(user.facebook_id, '📭 Bạn chưa có thanh toán nào để theo dõi!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '💰 TRẠNG THÁI THANH TOÁN',
            `📋 Theo dõi ${payments.length} thanh toán gần nhất:`,
            '━━━━━━━━━━━━━━━━━━━━'
        ])

        for (const payment of payments) {
            const createdDate = new Date(payment.created_at).toLocaleDateString('vi-VN')
            const createdTime = new Date(payment.created_at).toLocaleTimeString('vi-VN')
            const days = Math.floor(payment.amount / 1000)

            let statusInfo = ''
            let statusIcon = ''

            switch (payment.status) {
                case 'pending':
                    statusIcon = '⏳'
                    statusInfo = 'Đang chờ admin duyệt\n⏱️ Thời gian xử lý: 2-4 giờ'
                    break
                case 'approved':
                    statusIcon = '✅'
                    statusInfo = `Đã duyệt\n⏰ ${payment.approved_at ? new Date(payment.approved_at).toLocaleDateString('vi-VN') : 'N/A'}`
                    break
                case 'rejected':
                    statusIcon = '❌'
                    statusInfo = `Đã từ chối\n⏰ ${payment.rejected_at ? new Date(payment.rejected_at).toLocaleDateString('vi-VN') : 'N/A'}`
                    break
                default:
                    statusIcon = '❓'
                    statusInfo = 'Trạng thái không xác định'
            }

            const paymentCard = `💳 THANH TOÁN #${payment.id.slice(-8)}
━━━━━━━━━━━━━━━━━━━━
💰 Số tiền: ${formatCurrency(payment.amount)} (${days} ngày)
📅 Tạo: ${createdDate} ${createdTime}
📊 Trạng thái: ${statusIcon} ${payment.status.toUpperCase()}
📝 Chi tiết: ${statusInfo}

${payment.receipt_image ? '📸 Đã upload biên lai' : '⚠️ Chưa có biên lai'}`

            await sendMessage(user.facebook_id, paymentCard)

            // Add action buttons based on status - converted to quick reply
            if (payment.status === 'pending') {
                await sendQuickReply(
                    user.facebook_id,
                    `Thanh toán #${payment.id.slice(-8)}:`,
                    [
                        createQuickReply('🔄 KIỂM TRA LẠI', `PAYMENT_STATUS_${payment.id}`),
                        createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                        createQuickReply('📋 XEM TẤT CẢ', 'PAYMENT_HISTORY')
                    ]
                )
            }
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '━━━━━━━━━━━━━━━━━━━━',
            '💡 MẸO:',
            '• Thanh toán pending sẽ được xử lý trong 2-4 giờ',
            '• Nếu quá 24h vẫn chưa duyệt, hãy liên hệ admin',
            '• Giữ lại biên lai để đối chiếu khi cần thiết'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 THANH TOÁN MỚI', 'PAYMENT'),
                createQuickReply('📊 XEM TẤT CẢ', 'PAYMENT_HISTORY'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in payment status:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle payment notifications - NEW FEATURE
export async function handlePaymentNotifications(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get user's current status
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('membership_expires_at, status')
            .eq('facebook_id', user.facebook_id)
            .single()

        if (userError) {
            console.error('Error fetching user data:', userError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thông tin tài khoản.')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '💰 THANH TOÁN',
            'Chọn gói thanh toán phù hợp với bạn:',
            '💡 Với số tiền này bạn có cơ hội được tìm kiếm bởi hơn 2 triệu Tân Dậu!'
        ])

        // Current status
        if (userData?.status === 'trial') {
            const daysLeft = daysUntilExpiry(userData.membership_expires_at)
            await sendMessage(user.facebook_id, `📊 Trạng thái hiện tại: Trial (còn ${daysLeft} ngày)`)
        } else if (userData?.status === 'registered') {
            const expiryDate = new Date(userData.membership_expires_at).toLocaleDateString('vi-VN')
            await sendMessage(user.facebook_id, `📊 Trạng thái hiện tại: Đã thanh toán (hết hạn: ${expiryDate})`)
        } else {
            await sendMessage(user.facebook_id, '📊 Trạng thái hiện tại: Chưa thanh toán')
        }

        await sendQuickReply(
            user.facebook_id,
            'Cài đặt thông báo:',
            [
                createQuickReply('🔔 BẬT NHẮC THANH TOÁN', 'PAYMENT_NOTIF_ON'),
                createQuickReply('🔕 TẮT NHẮC THANH TOÁN', 'PAYMENT_NOTIF_OFF'),
                createQuickReply('📅 NHẮC TRƯỚC 3 NGÀY', 'PAYMENT_REMIND_3'),
                createQuickReply('📅 NHẮC TRƯỚC 1 NGÀY', 'PAYMENT_REMIND_1'),
                createQuickReply('📊 XEM LỊCH SỬ', 'PAYMENT_HISTORY'),
                createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in payment notifications:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle paid advertising
export async function handlePaidAdvertising(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn gói quảng cáo:',
        [
            createQuickReply('🏠 HOMEPAGE BANNER - 50,000đ/ngày', 'ADVERTISING_HOMEPAGE'),
            createQuickReply('🔍 SEARCH BOOST - 30,000đ/ngày', 'ADVERTISING_SEARCH'),
            createQuickReply('🎯 CROSS-SELL SPOT - 20,000đ/ngày', 'ADVERTISING_CROSS_SELL'),
            createQuickReply('⭐ FEATURED LISTING - 15,000đ/ngày', 'ADVERTISING_FEATURED'),
            createQuickReply('📊 XEM THỐNG KÊ QUẢNG CÁO', 'ADVERTISING_STATS'),
            createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
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
        '• STK: 0982581222',
        '• Ngân hàng: BIDV',
        '• Chủ TK: Đinh Khánh Tùng',
        '• Nội dung: QUANGCAO [SĐT_CỦA_BẠN]'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Sau khi chuyển khoản:',
        [
            createQuickReply('📸 UPLOAD BIÊN LAI', 'ADVERTISING_UPLOAD_RECEIPT'),
            createQuickReply('❌ HỦY', 'ADVERTISING')
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

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📊 XEM THỐNG KÊ', 'ADVERTISING_STATS'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
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

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 QUẢNG CÁO MỚI', 'ADVERTISING'),
                createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
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
        '🏦 THÔNG TIN CHUYỂN KHOẢN:\n• STK: 0982581222\n• Ngân hàng: BIDV\n• Chủ TK: Đinh Khánh Tùng',
        '💡 LƯU Ý:\n• Nội dung chuyển khoản phải chính xác\n• Biên lai phải rõ nét, đọc được\n• Liên hệ admin nếu có vấn đề',
        '❓ CÂU HỎI THƯỜNG GẶP:\n• Q: Khi nào tài khoản được gia hạn?\nA: Ngay sau khi admin duyệt\n• Q: Có thể hủy giao dịch không?\nA: Có, liên hệ admin trong 24h'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createQuickReply('🔙 QUAY LẠI', 'MAIN_MENU')
        ]
    )
}

// Handle payment extend
export async function handlePaymentExtend(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn gói gia hạn:',
        [
            createQuickReply('📅 7 NGÀY - 7,000đ', 'PAYMENT_PACKAGE_7'),
            createQuickReply('📅 15 NGÀY - 15,000đ', 'PAYMENT_PACKAGE_15'),
            createQuickReply('📅 30 NGÀY - 30,000đ', 'PAYMENT_PACKAGE_30'),
            createQuickReply('📅 90 NGÀY - 90,000đ', 'PAYMENT_PACKAGE_90'),
            createQuickReply('🔙 QUAY LẠI', 'PAYMENT')
        ]
    )
}

// Handle expired user message
export async function sendExpiredMessage(facebookId: string) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        facebookId,
        'Gia hạn tài khoản:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
            createQuickReply('❌ HỦY', 'MAIN_MENU')
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
        '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
        ])
    } else {
        await sendMessagesWithTyping(facebookId, [
            '⏰ THÔNG BÁO QUAN TRỌNG',
            `Trial của bạn còn ${daysLeft} ngày!`,
        '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
        ])
    }

    await sendQuickReply(
        facebookId,
        'Gia hạn tài khoản:',
        [
            createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
            createQuickReply('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
            createQuickReply('ℹ️ TÌM HIỂU', 'INFO')
        ]
    )
}
