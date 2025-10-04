import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping,
    sendImage
} from '../facebook-api'
import { formatCurrency, formatNumber, updateBotSession, daysUntilExpiry } from '../utils'

// Admin check now handled by FACEBOOK_PAGE_ID check
// This function is kept for backward compatibility but not used

// Handle admin command - Now handled by FACEBOOK_PAGE_ID check
export async function handleAdminCommand(user: any) {
    console.log('Admin command called by:', user.facebook_id)

    // Admin check is now handled at higher level (FACEBOOK_PAGE_ID)
    await sendTypingIndicator(user.facebook_id)
    await sendMessage(user.facebook_id, '🔧 ADMIN DASHBOARD')
    await sendMessage(user.facebook_id, 'Chào mừng Admin! Bạn có toàn quyền quản lý hệ thống.')

    // Priority actions first
    await sendQuickReply(
        user.facebook_id,
        '🚨 PRIORITY ACTIONS:',
        [
            createQuickReply('💰 DUYỆT THANH TOÁN', 'ADMIN_PAYMENTS'),
            createQuickReply('👥 QUẢN LÝ USER', 'ADMIN_USERS'),
            createQuickReply('📊 CHI TIẾT THỐNG KÊ', 'ADMIN_STATS'),
            createQuickReply('🚫 SPAM MANAGEMENT', 'ADMIN_SPAM_LOGS')
        ]
    )

    // Other functions
    await sendQuickReply(
        user.facebook_id,
        '📋 OTHER FUNCTIONS:',
        [
            createQuickReply('💬 VÀO CUỘC TRÒ CHUYỆN', 'ADMIN_ENTER_CHAT'),
            createQuickReply('🛒 QUẢN LÝ TIN ĐĂNG', 'ADMIN_LISTINGS'),
            createQuickReply('🔔 QUẢN LÝ THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
            createQuickReply('📤 GỬI LINK ĐĂNG KÝ', 'ADMIN_SEND_REGISTRATION'),
            createQuickReply('⚙️ CẤU HÌNH HỆ THỐNG', 'ADMIN_SETTINGS'),
            createQuickReply('👨‍💼 QUẢN LÝ ADMIN', 'ADMIN_MANAGE_ADMINS'),
            createQuickReply('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT'),
            createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )
}

// Handle admin payments - ENHANCED VERSION WITH PRIORITY
export async function handleAdminPayments(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get pending payments with enhanced user info
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                users!payments_user_id_fkey (
                    name,
                    phone,
                    location,
                    rating,
                    total_transactions,
                    status,
                    membership_expires_at
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching payments:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải danh sách thanh toán.')
            return
        }

        if (!payments || payments.length === 0) {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 THANH TOÁN CHỜ DUYỆT',
                '━━━━━━━━━━━━━━━━━━━━',
                '✅ Không có thanh toán nào chờ duyệt.',
                '🎉 Tất cả thanh toán đã được xử lý!',
                '━━━━━━━━━━━━━━━━━━━━',
                '💡 Bạn có thể:',
                '• Kiểm tra các thanh toán đã duyệt',
                '• Xem thống kê doanh thu',
                '• Quản lý người dùng'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 THANH TOÁN CHỜ DUYỆT',
                '━━━━━━━━━━━━━━━━━━━━',
                `📋 Có ${payments.length} thanh toán cần xử lý:`,
                '━━━━━━━━━━━━━━━━━━━━'
            ])

            // Sort payments by priority (higher amount first, then by user rating)
            const sortedPayments = payments.sort((a, b) => {
                const aUser = a.users
                const bUser = b.users

                // Priority 1: Higher amount first
                if (a.amount !== b.amount) {
                    return b.amount - a.amount
                }

                // Priority 2: Users with higher rating first
                const aRating = aUser?.rating || 0
                const bRating = bUser?.rating || 0
                return bRating - aRating
            })

            // Send each payment as enhanced card
            for (const payment of sortedPayments) {
                const paymentUser = payment.users
                const date = new Date(payment.created_at).toLocaleDateString('vi-VN')
                const time = new Date(payment.created_at).toLocaleTimeString('vi-VN')
                const days = Math.floor(payment.amount / 1000)
                const hoursAgo = Math.floor((Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60))

                // Priority indicator
                let priorityIcon = '🟢'
                if (payment.amount >= 50000) priorityIcon = '🔴' // High value payment
                else if (paymentUser?.rating >= 4.5) priorityIcon = '🟡' // Trusted user
                else if (hoursAgo > 24) priorityIcon = '🟠' // Old payment

                // Create enhanced payment card
                const paymentCard = `${priorityIcon} THANH TOÁN #${payment.id.slice(-8)}

👤 ${paymentUser?.name || 'Unknown'}
📱 ${paymentUser?.phone || 'N/A'}
📍 ${paymentUser?.location || 'N/A'}

💰 Số tiền: ${formatCurrency(payment.amount)} (${days} ngày)
📅 Thời gian: ${date} ${time} (${hoursAgo}h trước)

⭐ Đáng tin cậy: ${paymentUser?.rating ? `${paymentUser.rating}⭐ (${paymentUser.total_transactions} giao dịch)` : 'Chưa có đánh giá'}

${payment.receipt_image ? '📸 Đã có biên lai' : '⚠️ Chưa có biên lai'}`

                await sendMessage(user.facebook_id, paymentCard)

                // Enhanced action buttons - converted to quick reply
                await sendQuickReply(
                    user.facebook_id,
                    `⚡ Xử lý nhanh #${payment.id.slice(-8)}:`,
                    [
                        createQuickReply('✅ DUYỆT NHANH', `ADMIN_APPROVE_PAYMENT_${payment.id}`),
                        createQuickReply('❌ TỪ CHỐI', `ADMIN_REJECT_PAYMENT_${payment.id}`),
                        createQuickReply('👀 XEM BIÊN LAI', `ADMIN_VIEW_RECEIPT_${payment.id}`),
                        createQuickReply('👤 XEM USER', `ADMIN_VIEW_USER_${payment.user_id}`)
                    ]
                )
            }

            // Enhanced summary with insights
            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
            const highValuePayments = payments.filter(p => p.amount >= 50000).length
            const trustedUserPayments = payments.filter(p => p.users?.rating >= 4.5).length

            await sendMessagesWithTyping(user.facebook_id, [
                '━━━━━━━━━━━━━━━━━━━━',
                '📊 PHÂN TÍCH THANH TOÁN:',
                `💰 Tổng tiền: ${formatCurrency(totalAmount)}`,
                `🔴 Thanh toán giá trị cao: ${highValuePayments}/${payments.length}`,
                `⭐ Từ user uy tín: ${trustedUserPayments}/${payments.length}`,
                `📈 Trung bình: ${formatCurrency(Math.round(totalAmount / payments.length))}/thanh toán`,
                '━━━━━━━━━━━━━━━━━━━━',
                '💡 KHUYẾN NGHỊ:',
                `${highValuePayments > 0 ? '🔴 Ưu tiên duyệt thanh toán giá trị cao' : '✅ Tất cả thanh toán đều ở mức bình thường'}`,
                `${trustedUserPayments > payments.length * 0.7 ? '⭐ Hầu hết từ user uy tín, có thể duyệt nhanh' : '⚠️ Cần kiểm tra kỹ user mới'}`,
                '━━━━━━━━━━━━━━━━━━━━'
            ])

            await sendQuickReply(
                user.facebook_id,
                '⚡ QUICK ACTIONS:',
                [
                    createQuickReply('⚡ DUYỆT TẤT CẢ', 'ADMIN_BULK_APPROVE'),
                    createQuickReply('✅ DUYỆT UY TÍN', 'ADMIN_APPROVE_TRUSTED'),
                    createQuickReply('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                    createQuickReply('🔍 TÌM KIẾM', 'ADMIN_SEARCH_PAYMENT'),
                    createQuickReply('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                    createQuickReply('🔙 QUAY LẠI', 'ADMIN')
                ]
            )
        }

    } catch (error) {
        console.error('Error in admin payments:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin users
export async function handleAdminUsers(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get user statistics
        const { data: stats, error: statsError } = await supabaseAdmin
            .from('users')
            .select('status')

        if (statsError) {
            console.error('Error fetching user stats:', statsError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thống kê user.')
            return
        }

        const totalUsers = stats?.length || 0
        const trialUsers = stats?.filter(u => u.status === 'trial').length || 0
        const registeredUsers = stats?.filter(u => u.status === 'registered').length || 0

        await sendMessagesWithTyping(user.facebook_id, [
            '👥 QUẢN LÝ USER',
            `📊 Thống kê:\n• Tổng user: ${totalUsers}\n• Trial: ${trialUsers}\n• Đã đăng ký: ${registeredUsers}`,
            'Chọn chức năng:'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Chức năng:',
            [
                createQuickReply('🔍 TÌM THEO TÊN', 'ADMIN_SEARCH_USER_NAME'),
                createQuickReply('🔍 TÌM THEO SĐT', 'ADMIN_SEARCH_USER_PHONE'),
                createQuickReply('📊 XEM TẤT CẢ', 'ADMIN_ALL_USERS'),
                createQuickReply('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_USERS'),
                createQuickReply('⚠️ VI PHẠM', 'ADMIN_VIOLATIONS'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

    } catch (error) {
        console.error('Error in admin users:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin listings
export async function handleAdminListings(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get listing statistics
        const { data: stats, error: statsError } = await supabaseAdmin
            .from('listings')
            .select('status')

        if (statsError) {
            console.error('Error fetching listing stats:', statsError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thống kê tin đăng.')
            return
        }

        const totalListings = stats?.length || 0
        const activeListings = stats?.filter(l => l.status === 'active').length || 0
        const featuredListings = stats?.filter(l => l.status === 'featured').length || 0
        const pendingListings = stats?.filter(l => l.status === 'pending').length || 0

        await sendMessagesWithTyping(user.facebook_id, [
            '🛒 QUẢN LÝ TIN ĐĂNG',
            `📊 Thống kê:\n• Tổng tin: ${totalListings}\n• Active: ${activeListings}\n• Featured: ${featuredListings}\n• Pending: ${pendingListings}`,
            'Chọn chức năng:'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Chức năng:',
            [
                createQuickReply('📊 XEM TẤT CẢ', 'ADMIN_ALL_LISTINGS'),
                createQuickReply('⚠️ KIỂM DUYỆT', 'ADMIN_MODERATE_LISTINGS'),
                createQuickReply('⭐ FEATURED', 'ADMIN_FEATURED_LISTINGS'),
                createQuickReply('🔍 TÌM KIẾM', 'ADMIN_SEARCH_LISTINGS'),
                createQuickReply('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_LISTINGS'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

    } catch (error) {
        console.error('Error in admin listings:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin statistics
export async function handleAdminStats(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get comprehensive statistics
        const [usersResult, listingsResult, paymentsResult] = await Promise.all([
            supabaseAdmin.from('users').select('status, created_at'),
            supabaseAdmin.from('listings').select('status, created_at'),
            supabaseAdmin.from('payments').select('status, amount, created_at')
        ])

        if (usersResult.error || listingsResult.error || paymentsResult.error) {
            console.error('Error fetching statistics:', usersResult.error || listingsResult.error || paymentsResult.error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải thống kê.')
            return
        }

        const users = usersResult.data || []
        const listings = listingsResult.data || []
        const payments = paymentsResult.data || []

        // Calculate statistics
        const totalUsers = users.length
        const activeUsers = users.filter(u => u.status === 'registered').length
        const trialUsers = users.filter(u => u.status === 'trial').length

        const totalListings = listings.length
        const activeListings = listings.filter(l => l.status === 'active').length
        const featuredListings = listings.filter(l => l.status === 'featured').length

        const totalPayments = payments.length
        const approvedPayments = payments.filter(p => p.status === 'approved')
        const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

        // Today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayUsers = users.filter(u => u.created_at?.startsWith(today)).length
        const todayListings = listings.filter(l => l.created_at?.startsWith(today)).length
        const todayPayments = payments.filter(p => p.created_at?.startsWith(today)).length

        await sendMessagesWithTyping(user.facebook_id, [
            '📊 THỐNG KÊ TỔNG QUAN',
            `👥 Users:\n• Tổng: ${totalUsers} (+${todayUsers} hôm nay)\n• Active: ${activeUsers}\n• Trial: ${trialUsers}`,
            `💰 Doanh thu:\n• Hôm nay: ${formatCurrency(todayPayments * 7000)}\n• Tổng: ${formatCurrency(totalRevenue)}\n• Giao dịch: ${totalPayments}`,
            `🛒 Tin đăng:\n• Tổng: ${totalListings} (+${todayListings} hôm nay)\n• Active: ${activeListings}\n• Featured: ${featuredListings}`
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📈 XEM CHI TIẾT', 'ADMIN_DETAILED_STATS'),
                createQuickReply('📊 XUẤT BÁO CÁO', 'ADMIN_EXPORT_COMPREHENSIVE'),
                createQuickReply('📅 THEO NGÀY', 'ADMIN_EXPORT_BY_DATE'),
                createQuickReply('🔄 LÀM MỚI', 'ADMIN_STATS'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

    } catch (error) {
        console.error('Error in admin stats:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin notifications
export async function handleAdminNotifications(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Loại thông báo:',
        [
            createQuickReply('📢 THÔNG BÁO CHUNG', 'ADMIN_SEND_GENERAL'),
            createQuickReply('👤 GỬI USER CỤ THỂ', 'ADMIN_SEND_USER'),
            createQuickReply('🛒 GỬI THEO TIN ĐĂNG', 'ADMIN_SEND_LISTING'),
            createQuickReply('📊 LỊCH SỬ THÔNG BÁO', 'ADMIN_NOTIFICATION_HISTORY'),
            createQuickReply('⚙️ CÀI ĐẶT THÔNG BÁO', 'ADMIN_NOTIFICATION_SETTINGS'),
            createQuickReply('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin settings
export async function handleAdminSettings(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Cài đặt:',
        [
            createQuickReply('💰 CÀI ĐẶT PHÍ', 'ADMIN_SETTINGS_FEE'),
            createQuickReply('⏰ CÀI ĐẶT THỜI GIAN', 'ADMIN_SETTINGS_TIME'),
            createQuickReply('🎁 CÀI ĐẶT THƯỞNG', 'ADMIN_SETTINGS_REWARD'),
            createQuickReply('🔔 CÀI ĐẶT THÔNG BÁO', 'ADMIN_SETTINGS_NOTIFICATION'),
            createQuickReply('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin manage admins
export async function handleAdminManageAdmins(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { data: admins, error } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id, name, role, is_active')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching admins:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải danh sách admin!')
            return
        }

        const adminList = admins && admins.length > 0
            ? admins.map((admin, index) => `${index + 1}. ${admin.name} (${admin.role})\n   ID: ${admin.facebook_id}`).join('\n')
            : '📭 Chưa có admin nào!'

        await sendMessagesWithTyping(user.facebook_id, [
            '👨‍💼 QUẢN LÝ ADMIN',
            `Danh sách admin hiện tại:\n${adminList}`,
            'Chức năng:'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('➕ THÊM ADMIN', 'ADMIN_ADD_ADMIN'),
                createQuickReply('➖ XÓA ADMIN', 'ADMIN_REMOVE_ADMIN'),
                createQuickReply('📊 QUYỀN HẠN', 'ADMIN_PERMISSIONS'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

    } catch (error) {
        console.error('Error in handleAdminManageAdmins:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi quản lý admin!')
    }
}

// Handle admin approve payment
export async function handleAdminApprovePayment(user: any, paymentId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get payment details
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single()

        if (paymentError || !payment) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy thanh toán!')
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
            console.error('Error approving payment:', updateError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi duyệt thanh toán!')
            return
        }

        // Update user membership
        const newExpiryDate = new Date(Date.now() + payment.package_days * 24 * 60 * 60 * 1000)
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({
                membership_expires_at: newExpiryDate.toISOString(),
                status: 'registered'
            })
            .eq('facebook_id', payment.user_id)

        if (userError) {
            console.error('Error updating user membership:', userError)
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '✅ ĐÃ DUYỆT THANH TOÁN',
            `💰 ${payment.user_id.slice(-6)} - ${formatCurrency(payment.amount)}`,
            `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`,
            '🎉 Tài khoản đã được gia hạn'
        ])

        // Notify user
        await sendMessagesWithTyping(payment.user_id, [
            '✅ THANH TOÁN ĐÃ ĐƯỢC DUYỆT!',
            `💰 Thông tin thanh toán:\n• Số tiền: ${formatCurrency(payment.amount)}\n• Thời gian duyệt: ${new Date().toLocaleString('vi-VN')}\n• Gói dịch vụ: ${payment.package_days} ngày`,
            `🎉 Tài khoản của bạn đã được gia hạn đến ${newExpiryDate.toLocaleDateString('vi-VN')}`,
            '🎯 Cảm ơn bạn đã tin tưởng BOT Tân Dậu - Hỗ Trợ Chéo!'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createQuickReply('🔄 LÀM MỚI', 'ADMIN_PAYMENTS')
            ]
        )

    } catch (error) {
        console.error('Error in admin approve payment:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin reject payment
export async function handleAdminRejectPayment(user: any, paymentId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
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
            console.error('Error rejecting payment:', updateError)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi từ chối thanh toán!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '❌ ĐÃ TỪ CHỐI THANH TOÁN',
            `💰 Payment ID: ${paymentId}`,
            `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`
        ])

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createQuickReply('🔄 LÀM MỚI', 'ADMIN_PAYMENTS')
            ]
        )

    } catch (error) {
        console.error('Error in admin reject payment:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin export
export async function handleAdminExport(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Loại báo cáo:',
        [
            createQuickReply('📊 BÁO CÁO TỔNG QUAN', 'ADMIN_EXPORT_COMPREHENSIVE'),
            createQuickReply('👥 BÁO CÁO USER', 'ADMIN_EXPORT_USERS'),
            createQuickReply('🛒 BÁO CÁO TIN ĐĂNG', 'ADMIN_EXPORT_LISTINGS'),
            createQuickReply('💰 BÁO CÁO THANH TOÁN', 'ADMIN_EXPORT_PAYMENTS'),
            createQuickReply('📅 THEO NGÀY', 'ADMIN_EXPORT_BY_DATE'),
            createQuickReply('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin send registration link
export async function handleAdminSendRegistration(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Chọn cách gửi:',
        [
            createQuickReply('📱 GỬI CHO USER CỤ THỂ', 'ADMIN_SEND_TO_USER'),
            createQuickReply('📢 GỬI CHO TẤT CẢ', 'ADMIN_SEND_TO_ALL'),
            createQuickReply('🔗 TẠO LINK CHIA SẺ', 'ADMIN_CREATE_SHARE_LINK')
        ]
    )
}

// Handle admin send to specific user
export async function handleAdminSendToUser(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📱 GỬI CHO USER CỤ THỂ',
        'Nhập Facebook ID của user muốn gửi link đăng ký:',
        'VD: 1234567890123456'
    ])

    // Set session to wait for user input
    await updateBotSession(user.facebook_id, {
        current_flow: 'admin',
        step: 'send_registration_user',
        data: {}
    })
}

// Handle admin send to all users
export async function handleAdminSendToAll(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Xác nhận:',
        [
            createQuickReply('✅ CÓ, GỬI NGAY', 'ADMIN_CONFIRM_SEND_ALL'),
            createQuickReply('❌ HỦY', 'ADMIN_SEND_REGISTRATION')
        ]
    )
}

// Handle admin create share link
export async function handleAdminCreateShareLink(user: any) {
    await sendTypingIndicator(user.facebook_id)

    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/register`

    await sendMessagesWithTyping(user.facebook_id, [
        '🔗 LINK CHIA SẺ ĐĂNG KÝ',
        `Link: ${shareLink}`,
        'Bạn có thể copy link này để chia sẻ!'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tùy chọn:',
        [
            createQuickReply('📋 COPY LINK', 'ADMIN_COPY_LINK'),
            createQuickReply('📤 GỬI LẠI', 'ADMIN_SEND_REGISTRATION'),
            createQuickReply('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin stop bot
export async function handleAdminStopBot(user: any) {
    // Typing indicator removed for quick reply
    await sendQuickReplyNoTyping(
        user.facebook_id,
        'Xác nhận tắt bot:',
        [
            createQuickReply('✅ XÁC NHẬN TẮT', 'ADMIN_CONFIRM_STOP'),
            createQuickReply('❌ HỦY', 'ADMIN')
        ]
    )
}

// Handle admin confirm stop bot
export async function handleAdminConfirmStopBot(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Set bot status to stopped in database
        const { error } = await supabaseAdmin
            .from('bot_settings')
            .upsert({
                key: 'bot_status',
                value: 'stopped',
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error stopping bot:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tắt bot!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '🛑 BOT ĐÃ TẮT!',
            'Bot hiện tại đã ngừng phản hồi.',
            'Để bật lại, restart server hoặc chạy lệnh bật bot.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Bot đã tắt:',
            [
                createQuickReply('🔄 BẬT LẠI BOT', 'ADMIN_START_BOT'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

    } catch (error) {
        console.error('Error in admin confirm stop bot:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tắt bot!')
    }
}

// Handle admin start bot
export async function handleAdminStartBot(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Set bot status to active in database
        const { error } = await supabaseAdmin
            .from('bot_settings')
            .upsert({
                key: 'bot_status',
                value: 'active',
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error starting bot:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi bật bot!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '🟢 BOT ĐÃ BẬT!',
            'Bot hiện tại đã hoạt động bình thường.',
            'Có thể phản hồi tin nhắn từ user.'
        ])

        await sendQuickReply(
            user.facebook_id,
            'Bot đã bật:',
            [
                createQuickReply('🛑 TẮT BOT', 'ADMIN_STOP_BOT'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

    } catch (error) {
        console.error('Error in admin start bot:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi bật bot!')
    }
}

// Handle admin take chat
export async function handleAdminTakeChat(user: any, sessionId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { adminTakeOverChat, getActiveAdminChatSession } = await import('../admin-chat')
        const success = await adminTakeOverChat(sessionId, user.facebook_id)

        if (success) {
            // Get session details
            const { data: session } = await supabaseAdmin
                .from('admin_chat_sessions')
                .select('*')
                .eq('id', sessionId)
                .single()

            if (session) {
                // Get user info
                const { data: chatUser } = await supabaseAdmin
                    .from('users')
                    .select('name, phone')
                    .eq('facebook_id', session.user_id)
                    .single()

                await sendMessagesWithTyping(user.facebook_id, [
                    '✅ ĐÃ NHẬN CHAT!',
                    `👤 User: ${chatUser?.name || 'Unknown'}`,
                    `📱 Phone: ${chatUser?.phone || 'Unknown'}`,
                    `🆔 Session: ${sessionId.slice(-8)}`,
                    '',
                    '💬 Bạn có thể trả lời user ngay bây giờ.',
                    '📝 Gửi tin nhắn để trả lời user.'
                ])

                // Notify user that admin has joined
                await sendMessage(session.user_id, '✅ Admin đã vào chat! Bạn có thể bắt đầu trò chuyện.')

                await sendQuickReply(
                    user.facebook_id,
                    'Quản lý chat:',
                    [
                        createQuickReply('❌ KẾT THÚC CHAT', `ADMIN_END_CHAT_${sessionId}`),
                        createQuickReply('👀 XEM LỊCH SỬ', `ADMIN_CHAT_HISTORY_${sessionId}`),
                        createQuickReply('🔙 QUAY LẠI', 'ADMIN')
                    ]
                )
            }
        } else {
            await sendMessage(user.facebook_id, '❌ Không thể nhận chat. Session có thể đã được admin khác nhận.')
        }
    } catch (error) {
        console.error('Error taking chat:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi nhận chat!')
    }
}

// Handle admin end chat
export async function handleAdminEndChat(user: any, sessionId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { data: session } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('admin_id', user.facebook_id)
            .single()

        if (!session) {
            await sendMessage(user.facebook_id, '❌ Session không tồn tại hoặc bạn không có quyền!')
            return
        }

        // End the session
        const { error } = await supabaseAdmin
            .from('admin_chat_sessions')
            .update({
                status: 'closed',
                ended_at: new Date().toISOString()
            })
            .eq('id', sessionId)

        if (!error) {
            await sendMessage(user.facebook_id, '✅ Đã kết thúc chat với user!')

            // Notify user
            await sendMessagesWithTyping(session.user_id, [
                '👨‍💼 Admin đã kết thúc chat.',
                'Cảm ơn bạn đã sử dụng dịch vụ hỗ trợ!',
                'Bot sẽ tiếp tục hỗ trợ bạn như bình thường.'
            ])

            await sendQuickReply(
                session.user_id,
                'Bạn muốn:',
                [
                    createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                    createQuickReply('🛒 TẠO TIN', 'LISTING'),
                    createQuickReply('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
                ]
            )
        } else {
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi kết thúc chat!')
        }
    } catch (error) {
        console.error('Error ending chat:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra!')
    }
}

// Handle admin spam logs
export async function handleAdminSpamLogs(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { getSpamStats } = await import('@/lib/anti-spam')
        const spamStats = await getSpamStats()

        await sendMessagesWithTyping(user.facebook_id, [
            '🛡️ SPAM LOGS & BẢO MẬT',
            `🚫 Tổng lần chặn spam: ${formatNumber(spamStats.totalBlocks)}`,
            `⏸️ Đang bị chặn: ${formatNumber(spamStats.activeBlocks)}`,
            '',
            '📋 LỊCH SỬ SPAM GẦN ĐÂY:'
        ])

        if (spamStats.recentSpam.length === 0) {
            await sendMessage(user.facebook_id, '✅ Không có spam nào trong thời gian gần đây!')
        } else {
            const spamText = spamStats.recentSpam.slice(0, 5).map((log, index) => {
                const date = new Date(log.blocked_at).toLocaleString('vi-VN')
                return `${index + 1}. User: ${log.user_id}\n   Lý do: ${log.reason}\n   Thời gian: ${date}`
            }).join('\n\n')

            await sendMessage(user.facebook_id, spamText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('🔄 LÀM MỚI', 'ADMIN_SPAM_LOGS'),
                createQuickReply('📊 THỐNG KÊ', 'ADMIN_STATS'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN_MENU')
            ]
        )

    } catch (error) {
        console.error('Error in admin spam logs:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải spam logs!')
    }
}

// Handle bulk approve payments - ENHANCED WITH SMART FILTERING
export async function handleAdminBulkApprove(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get all pending payments with enhanced filtering
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                users!payments_user_id_fkey (
                    name,
                    phone,
                    location,
                    rating,
                    total_transactions,
                    status,
                    membership_expires_at
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error || !payments || payments.length === 0) {
            await sendMessage(user.facebook_id, '❌ Không có thanh toán nào để duyệt hàng loạt!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '⚡ DUYỆT HÀNG LOẠT THÔNG MINH',
            `📋 Tổng cộng: ${payments.length} thanh toán chờ duyệt`,
            '━━━━━━━━━━━━━━━━━━━━',
            '🎯 TÙY CHỌN DUYỆT THÔNG MINH:'
        ])

        // Smart filtering options
        const highValuePayments = payments.filter(p => p.amount >= 50000)
        const trustedUserPayments = payments.filter(p => p.users?.rating >= 4.5)
        const oldPayments = payments.filter(p => {
            const hoursAgo = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
            return hoursAgo > 24
        })

        await sendQuickReply(
            user.facebook_id,
            '🏆 DUYỆT THEO ƯU TIÊN:',
            [
                createQuickReply(`💰 DUYỆT CAO GIÁ (${highValuePayments.length})`, 'ADMIN_BULK_HIGH_VALUE'),
                createQuickReply(`⭐ DUYỆT UY TÍN (${trustedUserPayments.length})`, 'ADMIN_BULK_TRUSTED'),
                createQuickReply(`⚡ DUYỆT TẤT CẢ (${payments.length})`, 'ADMIN_BULK_ALL'),
                createQuickReply(`🕐 DUYỆT CŨ (${oldPayments.length})`, 'ADMIN_BULK_OLD')
            ]
        )

        await sendQuickReply(
            user.facebook_id,
            '📊 THÔNG TIN CHI TIẾT:',
            [
                createQuickReply('📋 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createQuickReply('🔍 TÌM KIẾM', 'ADMIN_SEARCH_PAYMENT'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN_PAYMENTS')
            ]
        )

    } catch (error) {
        console.error('Error in bulk approve:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi duyệt hàng loạt!')
    }
}

// Handle bulk approve trusted users
export async function handleAdminBulkApproveTrusted(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get only trusted user payments
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                users!payments_user_id_fkey (
                    name,
                    phone,
                    location,
                    rating,
                    total_transactions
                )
            `)
            .eq('status', 'pending')
            .gte('users.rating', 4.5)
            .order('created_at', { ascending: false })

        if (error || !payments || payments.length === 0) {
            await sendMessage(user.facebook_id, '❌ Không có thanh toán từ user uy tín để duyệt!')
            return
        }

        await executeBulkApproval(user, payments, 'UY TÍN')

    } catch (error) {
        console.error('Error in bulk approve trusted:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra!')
    }
}

// Handle bulk approve high value payments
export async function handleAdminBulkApproveHighValue(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get only high value payments
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                users!payments_user_id_fkey (
                    name,
                    phone,
                    location,
                    rating,
                    total_transactions
                )
            `)
            .eq('status', 'pending')
            .gte('amount', 50000)
            .order('amount', { ascending: false })

        if (error || !payments || payments.length === 0) {
            await sendMessage(user.facebook_id, '❌ Không có thanh toán giá trị cao để duyệt!')
            return
        }

        await executeBulkApproval(user, payments, 'GIÁ TRỊ CAO')

    } catch (error) {
        console.error('Error in bulk approve high value:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra!')
    }
}

// Execute bulk approval with enhanced reporting
async function executeBulkApproval(user: any, payments: any[], filterType: string) {
    await sendMessagesWithTyping(user.facebook_id, [
        `⚡ DUYỆT HÀNG LOẠT (${filterType})`,
        `📋 Sẽ duyệt ${payments.length} thanh toán:`,
        '━━━━━━━━━━━━━━━━━━━━'
    ])

    let approvedCount = 0
    let failedCount = 0
    let totalAmount = 0

    for (const payment of payments) {
        try {
            // Update payment status
            const { error: updateError } = await supabaseAdmin
                .from('payments')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: user.facebook_id
                })
                .eq('id', payment.id)

            if (updateError) {
                console.error(`Error approving payment ${payment.id}:`, updateError)
                failedCount++
                continue
            }

            // Update user membership
            const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            const { error: userError } = await supabaseAdmin
                .from('users')
                .update({
                    membership_expires_at: newExpiryDate.toISOString(),
                    status: 'registered'
                })
                .eq('facebook_id', payment.user_id)

            if (userError) {
                console.error(`Error updating user ${payment.user_id}:`, userError)
                failedCount++
                continue
            }

            approvedCount++
            totalAmount += payment.amount

            // Notify user
            await sendMessagesWithTyping(payment.user_id, [
                '✅ THANH TOÁN ĐÃ ĐƯỢC DUYỆT!',
                `💰 Thông tin thanh toán:\n• Số tiền: ${formatCurrency(payment.amount)}\n• Thời gian duyệt: ${new Date().toLocaleString('vi-VN')}\n• Gói dịch vụ: 7 ngày`,
                `🎉 Tài khoản của bạn đã được gia hạn đến ${newExpiryDate.toLocaleDateString('vi-VN')}`,
                '🎯 Cảm ơn bạn đã tin tưởng BOT Tân Dậu - Hỗ Trợ Chéo!'
            ])

        } catch (error) {
            console.error(`Error processing payment ${payment.id}:`, error)
            failedCount++
        }
    }

    await sendMessagesWithTyping(user.facebook_id, [
        '━━━━━━━━━━━━━━━━━━━━',
        '📊 KẾT QUẢ DUYỆT HÀNG LOẠT:',
        `✅ Duyệt thành công: ${approvedCount}`,
        `❌ Duyệt thất bại: ${failedCount}`,
        `💰 Tổng tiền: ${formatCurrency(totalAmount)}`,
        `🎯 Loại: ${filterType}`,
        '━━━━━━━━━━━━━━━━━━━━',
        '💡 THÀNH CÔNG: Đã xử lý nhanh các thanh toán ưu tiên!'
    ])

    await sendQuickReply(
        user.facebook_id,
        'Tiếp theo:',
        [
            createQuickReply('📊 XEM THANH TOÁN', 'ADMIN_PAYMENTS'),
            createQuickReply('🏠 VỀ DASHBOARD', 'ADMIN')
        ]
    )
}

// Handle view receipt
export async function handleAdminViewReceipt(user: any, paymentId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .select('receipt_image, amount, created_at, users!payments_user_id_fkey(name, phone)')
            .eq('id', paymentId)
            .single()

        if (error || !payment) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy thông tin biên lai!')
            return
        }

        if (!payment.receipt_image) {
            await sendMessage(user.facebook_id, '⚠️ Thanh toán này chưa có biên lai được upload!')
            return
        }

        await sendMessagesWithTyping(user.facebook_id, [
            '📸 XEM BIÊN LAI',
            `💰 Số tiền: ${formatCurrency(payment.amount)}`,
            `👤 User: ${(payment.users as any)?.name || 'Unknown'}`,
            `📱 Phone: ${(payment.users as any)?.phone || 'N/A'}`,
            `📅 Ngày: ${new Date(payment.created_at).toLocaleDateString('vi-VN')}`
        ])

        // Send image
        await sendImage(user.facebook_id, payment.receipt_image)

        await sendQuickReply(
            user.facebook_id,
            'Xử lý biên lai:',
            [
                createQuickReply('✅ DUYỆT', `ADMIN_APPROVE_PAYMENT_${paymentId}`),
                createQuickReply('❌ TỪ CHỐI', `ADMIN_REJECT_PAYMENT_${paymentId}`),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN_PAYMENTS')
            ]
        )

    } catch (error) {
        console.error('Error viewing receipt:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xem biên lai!')
    }
}

// Handle view user details
export async function handleAdminViewUser(user: any, facebookId: string) {
    await sendTypingIndicator(user.facebook_id)

    try {
        const { data: userData, error } = await supabaseAdmin
            .from('users')
            .select(`
                *,
                payments!payments_user_id_fkey (
                    id,
                    amount,
                    status,
                    created_at
                ),
                listings!listings_user_id_fkey (
                    id,
                    title,
                    status,
                    created_at
                ),
                ratings!ratings_reviewee_id_fkey (
                    rating,
                    comment,
                    created_at
                )
            `)
            .eq('facebook_id', facebookId)
            .single()

        if (error || !userData) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy thông tin user!')
            return
        }

        const payments = userData.payments || []
        const listings = userData.listings || []
        const ratings = userData.ratings || []

        const approvedPayments = payments.filter((p: any) => p.status === 'approved')
        const totalSpent = approvedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

        await sendMessagesWithTyping(user.facebook_id, [
            '👤 THÔNG TIN USER CHI TIẾT',
            '━━━━━━━━━━━━━━━━━━━━',
            `👤 Tên: ${userData.name}`,
            `📱 SĐT: ${userData.phone}`,
            `📍 Địa chỉ: ${userData.location}`,
            `🎂 Năm sinh: ${userData.birthday}`,
            `⭐ Rating: ${userData.rating || 'Chưa có'}`,
            `💰 Tổng chi tiêu: ${formatCurrency(totalSpent)}`,
            `📊 Trạng thái: ${userData.status}`,
            `⏰ Hạn sử dụng: ${userData.membership_expires_at ? new Date(userData.membership_expires_at).toLocaleDateString('vi-VN') : 'N/A'}`,
            `🛒 Số tin đăng: ${listings.length}`,
            `💳 Số thanh toán: ${payments.length}`,
            `⭐ Số đánh giá: ${ratings.length}`,
            `📅 Ngày tham gia: ${new Date(userData.created_at).toLocaleDateString('vi-VN')}`
        ])

        // Recent activity
        if (payments.length > 0) {
            await sendMessage(user.facebook_id, '💳 LỊCH SỬ THANH TOÁN GẦN ĐÂY:')
            const recentPayments = payments.slice(0, 3)
            for (const payment of recentPayments) {
                const status = payment.status === 'approved' ? '✅' : payment.status === 'rejected' ? '❌' : '⏳'
                await sendMessage(user.facebook_id, `${status} ${formatCurrency(payment.amount)} - ${new Date(payment.created_at).toLocaleDateString('vi-VN')}`)
            }
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('💰 XEM THANH TOÁN', `ADMIN_USER_PAYMENTS_${facebookId}`),
                createQuickReply('🛒 XEM TIN ĐĂNG', `ADMIN_USER_LISTINGS_${facebookId}`),
                createQuickReply('⭐ XEM ĐÁNH GIÁ', `ADMIN_USER_RATINGS_${facebookId}`),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN_PAYMENTS')
            ]
        )

    } catch (error) {
        console.error('Error viewing user:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi xem thông tin user!')
    }
}

// Handle admin dashboard overview - ENHANCED VERSION
export async function handleAdminDashboard(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get comprehensive overview stats with optimized queries
        const [usersResult, paymentsResult, listingsResult, spamResult, notificationsResult] = await Promise.all([
            supabaseAdmin.from('users').select('status, created_at, membership_expires_at'),
            supabaseAdmin.from('payments').select('status, amount, created_at, approved_at'),
            supabaseAdmin.from('listings').select('status, created_at, views, category'),
            supabaseAdmin.from('spam_logs').select('id, created_at, reason'),
            supabaseAdmin.from('notifications').select('id, created_at, is_read')
        ])

        if (usersResult.error || paymentsResult.error || listingsResult.error || spamResult.error || notificationsResult.error) {
            console.error('Error fetching dashboard stats')
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải dashboard!')
            return
        }

        const users = usersResult.data || []
        const payments = paymentsResult.data || []
        const listings = listingsResult.data || []
        const spamLogs = spamResult.data || []
        const notifications = notificationsResult.data || []

        // Calculate comprehensive stats
        const today = new Date().toISOString().split('T')[0]
        const todayUsers = users.filter(u => u.created_at?.startsWith(today)).length
        const todayPayments = payments.filter(p => p.created_at?.startsWith(today)).length
        const todayListings = listings.filter(l => l.created_at?.startsWith(today)).length

        // User status breakdown
        const activeUsers = users.filter(u => u.status === 'registered').length
        const trialUsers = users.filter(u => u.status === 'trial').length
        const expiredUsers = users.filter(u => u.status === 'expired').length

        // Payment stats
        const pendingPayments = payments.filter(p => p.status === 'pending').length
        const approvedPayments = payments.filter(p => p.status === 'approved')
        const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const todayRevenue = payments.filter(p => p.created_at?.startsWith(today) && p.status === 'approved')
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        // Listing stats
        const activeListings = listings.filter(l => l.status === 'active').length
        const featuredListings = listings.filter(l => l.status === 'featured').length
        const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0)

        // Spam stats
        const todaySpam = spamLogs.filter(log => log.created_at?.startsWith(today)).length
        const weekSpam = spamLogs.filter(log => {
            const logDate = new Date(log.created_at)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return logDate > weekAgo
        }).length

        // Trial expiry warnings
        const expiringToday = users.filter(u =>
            u.status === 'trial' &&
            u.membership_expires_at &&
            daysUntilExpiry(u.membership_expires_at) === 0
        ).length

        const expiringSoon = users.filter(u =>
            u.status === 'trial' &&
            u.membership_expires_at &&
            daysUntilExpiry(u.membership_expires_at) <= 2 &&
            daysUntilExpiry(u.membership_expires_at) > 0
        ).length

        // Enhanced dashboard display
        await sendMessagesWithTyping(user.facebook_id, [
            '🔧 ADMIN DASHBOARD - ENHANCED',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '📊 TODAY STATS (HÔM NAY):',
            `👥 New Users: ${todayUsers} users`,
            `💰 Revenue: ${formatCurrency(todayRevenue)}`,
            `🛒 New Listings: ${todayListings} posts`,
            `🚫 Spam Blocks: ${todaySpam} cases`,
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '⚠️ URGENT ATTENTION:',
            `• ${pendingPayments} payments pending approval`,
            `• ${expiringToday} trials expiring today`,
            `• ${expiringSoon} trials expiring soon`,
            `• ${weekSpam} spam cases this week`,
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '📈 OVERALL STATS:',
            `👥 Total Users: ${users.length} (${activeUsers} active, ${trialUsers} trial)`,
            `💰 Total Revenue: ${formatCurrency(totalRevenue)}`,
            `🛒 Total Listings: ${listings.length} (${activeListings} active, ${featuredListings} featured)`,
            `👁️ Total Views: ${formatNumber(totalViews)}`,
            `📱 Unread Notifications: ${notifications.filter(n => !n.is_read).length}`,
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        ])

        // Quick action buttons with priority
        await sendQuickReply(
            user.facebook_id,
            '🚨 PRIORITY ACTIONS:',
            [
                createQuickReply('💰 DUYỆT THANH TOÁN', 'ADMIN_PAYMENTS'),
                createQuickReply('👥 QUẢN LÝ USER', 'ADMIN_USERS'),
                createQuickReply('📊 CHI TIẾT THỐNG KÊ', 'ADMIN_STATS'),
                createQuickReply('🚫 SPAM MANAGEMENT', 'ADMIN_SPAM_LOGS')
            ]
        )

        await sendQuickReply(
            user.facebook_id,
            '📋 OTHER FUNCTIONS:',
            [
                createQuickReply('🔔 QUẢN LÝ THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
                createQuickReply('⚙️ CẤU HÌNH HỆ THỐNG', 'ADMIN_SETTINGS'),
                createQuickReply('👨‍💼 QUẢN LÝ ADMIN', 'ADMIN_MANAGE_ADMINS'),
                createQuickReply('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT')
            ]
        )

        // System health indicators
        const systemHealth = await checkSystemHealth()
        if (systemHealth.issues.length > 0) {
            await sendMessage(user.facebook_id, `⚠️ SYSTEM ISSUES: ${systemHealth.issues.join(', ')}`)
        }

    } catch (error) {
        console.error('Error in admin dashboard:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra khi tải dashboard!')
    }
}

// System health check function
async function checkSystemHealth() {
    const issues: string[] = []
    const checks = []

    try {
        // Check database connectivity
        const { error: dbError } = await supabaseAdmin.from('users').select('id').limit(1)
        if (dbError) issues.push('Database connection issue')

        // Check Facebook API
        // Add more health checks as needed

        return { healthy: issues.length === 0, issues }
    } catch (error) {
        return { healthy: false, issues: ['Health check failed'] }
    }
}

// Add admin user
export async function addAdminUser(facebookId: string, name: string, role: string = 'admin') {
    try {
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .insert({
                facebook_id: facebookId,
                name: name,
                role: role,
                permissions: role === 'super_admin' ? { all: true } : {},
                is_active: true
            })
            .select()

        if (error) {
            console.error('Error adding admin user:', error)
            return false
        }

        console.log('Admin user added:', data)
        return true
    } catch (error) {
        console.error('Error in addAdminUser:', error)
        return false
    }
}
