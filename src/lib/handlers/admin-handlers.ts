import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    createPostbackButton,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, updateBotSession } from '../utils'

// Check if user is admin
export async function isAdmin(facebookId: string): Promise<boolean> {
    // First check environment variables (priority)
    const adminIds = process.env.ADMIN_IDS || ''
    const envAdmins = adminIds.split(',').map(id => id.trim()).filter(id => id.length > 0)

    if (envAdmins.includes(facebookId)) {
        console.log(`✅ Admin found in environment: ${facebookId}`)
        return true
    }

    // Then check database as fallback
    try {
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .select('is_active')
            .eq('facebook_id', facebookId)
            .eq('is_active', true)
            .maybeSingle()

        if (error) {
            console.error('Error checking admin status in database:', error)
            return false
        }

        // If data exists and is_active is true
        if (data && data.is_active) {
            console.log(`✅ Admin found in database: ${facebookId}`)
            return true
        }

        return false
    } catch (error) {
        console.error('Error in isAdmin function:', error)
        return false
    }
}

// Handle admin command
export async function handleAdminCommand(user: any) {
    console.log('Admin command called by:', user.facebook_id)
    console.log('User object:', user)

    const userIsAdmin = await isAdmin(user.facebook_id)
    console.log('Is admin:', userIsAdmin)

    if (!userIsAdmin) {
        console.log('User is not admin, sending access denied message')
        await sendMessage(user.facebook_id, '❌ Bạn không có quyền truy cập!')
        return
    }

    console.log('User is admin, proceeding with dashboard')

    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        '🔧 ADMIN DASHBOARD',
        'Chào admin! 👋',
        'Bạn muốn quản lý gì?'
    ])

    // Admin functions with Quick Reply
    await sendQuickReply(
        user.facebook_id,
        'Chức năng admin:',
        [
            createQuickReply('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
            createQuickReply('👥 NGƯỜI DÙNG', 'ADMIN_USERS'),
            createQuickReply('🛒 NIÊM YẾT', 'ADMIN_LISTINGS'),
            createQuickReply('📊 THỐNG KÊ', 'ADMIN_STATS'),
            createQuickReply('🔔 THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
            createQuickReply('📤 GỬI LINK ĐĂNG KÝ', 'ADMIN_SEND_REGISTRATION'),
            createQuickReply('⚙️ QUẢN LÝ ADMIN', 'ADMIN_MANAGE_ADMINS'),
            createQuickReply('🚫 SPAM LOGS', 'ADMIN_SPAM_LOGS'),
            createQuickReply('🏠 TRANG CHỦ', 'MAIN_MENU')
        ]
    )

}

// Handle admin payments
export async function handleAdminPayments(user: any) {
    await sendTypingIndicator(user.facebook_id)

    try {
        // Get pending payments
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('*')
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
                'Không có thanh toán nào chờ duyệt.'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '💰 THANH TOÁN CHỜ DUYỆT',
                `Có ${payments.length} thanh toán chờ duyệt:`
            ])

            const paymentText = payments.map((payment, index) => {
                const date = new Date(payment.created_at).toLocaleDateString('vi-VN')
                const time = new Date(payment.created_at).toLocaleTimeString('vi-VN')
                return `${index + 1}️⃣ ${payment.user_id.slice(-6)} - ${formatCurrency(payment.amount)} - ${date} ${time}`
            }).join('\n')

            await sendMessage(user.facebook_id, paymentText)
        }

        await sendQuickReply(
            user.facebook_id,
            'Tùy chọn:',
            [
                createQuickReply('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createQuickReply('🔍 TÌM KIẾM', 'ADMIN_SEARCH_PAYMENT'),
                createQuickReply('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                createQuickReply('🔙 QUAY LẠI', 'ADMIN')
            ]
        )

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
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🔔 QUẢN LÝ THÔNG BÁO',
        'Gửi thông báo đến người dùng:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại thông báo:',
        [
            createPostbackButton('📢 THÔNG BÁO CHUNG', 'ADMIN_SEND_GENERAL'),
            createPostbackButton('👤 GỬI USER CỤ THỂ', 'ADMIN_SEND_USER'),
            createPostbackButton('🛒 GỬI THEO TIN ĐĂNG', 'ADMIN_SEND_LISTING'),
            createPostbackButton('📊 LỊCH SỬ THÔNG BÁO', 'ADMIN_NOTIFICATION_HISTORY'),
            createPostbackButton('⚙️ CÀI ĐẶT THÔNG BÁO', 'ADMIN_NOTIFICATION_SETTINGS'),
            createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin settings
export async function handleAdminSettings(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '⚙️ CÀI ĐẶT HỆ THỐNG',
        'Cấu hình bot:',
        `• Phí hàng ngày: ${process.env.BOT_DAILY_FEE || '1000'}đ`,
        `• Số ngày tối thiểu: ${process.env.BOT_MINIMUM_DAYS || '7'} ngày`,
        `• Trial miễn phí: ${process.env.BOT_TRIAL_DAYS || '3'} ngày`,
        `• Thưởng giới thiệu: ${process.env.BOT_REFERRAL_REWARD || '10000'}đ`,
        `• Phí dịch vụ tìm kiếm: ${process.env.BOT_SEARCH_SERVICE_FEE || '5000'}đ`
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Cài đặt:',
        [
            createPostbackButton('💰 CÀI ĐẶT PHÍ', 'ADMIN_SETTINGS_FEE'),
            createPostbackButton('⏰ CÀI ĐẶT THỜI GIAN', 'ADMIN_SETTINGS_TIME'),
            createPostbackButton('🎁 CÀI ĐẶT THƯỞNG', 'ADMIN_SETTINGS_REWARD'),
            createPostbackButton('🔔 CÀI ĐẶT THÔNG BÁO', 'ADMIN_SETTINGS_NOTIFICATION'),
            createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('➕ THÊM ADMIN', 'ADMIN_ADD_ADMIN'),
                createPostbackButton('➖ XÓA ADMIN', 'ADMIN_REMOVE_ADMIN'),
                createPostbackButton('📊 QUYỀN HẠN', 'ADMIN_PERMISSIONS'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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
            '🎯 Cảm ơn bạn đã tin tưởng BOT TÂN DẬU 1981!'
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS')
            ]
        )

    } catch (error) {
        console.error('Error in admin reject payment:', error)
        await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Handle admin export
export async function handleAdminExport(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📤 XUẤT BÁO CÁO',
        'Chọn loại báo cáo bạn muốn xuất:'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Loại báo cáo:',
        [
            createPostbackButton('📊 BÁO CÁO TỔNG QUAN', 'ADMIN_EXPORT_COMPREHENSIVE'),
            createPostbackButton('👥 BÁO CÁO USER', 'ADMIN_EXPORT_USERS'),
            createPostbackButton('🛒 BÁO CÁO TIN ĐĂNG', 'ADMIN_EXPORT_LISTINGS'),
            createPostbackButton('💰 BÁO CÁO THANH TOÁN', 'ADMIN_EXPORT_PAYMENTS'),
            createPostbackButton('📅 THEO NGÀY', 'ADMIN_EXPORT_BY_DATE'),
            createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin send registration link
export async function handleAdminSendRegistration(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📤 GỬI LINK ĐĂNG KÝ',
        'Gửi link đăng ký cho người dùng mới'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Chọn cách gửi:',
        [
            createPostbackButton('📱 GỬI CHO USER CỤ THỂ', 'ADMIN_SEND_TO_USER'),
            createPostbackButton('📢 GỬI CHO TẤT CẢ', 'ADMIN_SEND_TO_ALL'),
            createPostbackButton('🔗 TẠO LINK CHIA SẺ', 'ADMIN_CREATE_SHARE_LINK')
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
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '📢 GỬI CHO TẤT CẢ',
        'Bạn có chắc chắn muốn gửi link đăng ký cho tất cả user?'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Xác nhận:',
        [
            createPostbackButton('✅ CÓ, GỬI NGAY', 'ADMIN_CONFIRM_SEND_ALL'),
            createPostbackButton('❌ HỦY', 'ADMIN_SEND_REGISTRATION')
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

    await sendButtonTemplate(
        user.facebook_id,
        'Tùy chọn:',
        [
            createPostbackButton('📋 COPY LINK', 'ADMIN_COPY_LINK'),
            createPostbackButton('📤 GỬI LẠI', 'ADMIN_SEND_REGISTRATION'),
            createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
        ]
    )
}

// Handle admin stop bot
export async function handleAdminStopBot(user: any) {
    await sendTypingIndicator(user.facebook_id)

    await sendMessagesWithTyping(user.facebook_id, [
        '🛑 TẮT BOT',
        '⚠️ CẢNH BÁO: Bạn đang tắt bot!',
        'Bot sẽ ngừng phản hồi tất cả tin nhắn.',
        'Để bật lại, bạn cần restart server.'
    ])

    await sendButtonTemplate(
        user.facebook_id,
        'Xác nhận tắt bot:',
        [
            createPostbackButton('✅ XÁC NHẬN TẮT', 'ADMIN_CONFIRM_STOP'),
            createPostbackButton('❌ HỦY', 'ADMIN')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Bot đã tắt:',
            [
                createPostbackButton('🔄 BẬT LẠI BOT', 'ADMIN_START_BOT'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Bot đã bật:',
            [
                createPostbackButton('🛑 TẮT BOT', 'ADMIN_STOP_BOT'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

                await sendButtonTemplate(
                    user.facebook_id,
                    'Quản lý chat:',
                    [
                        createPostbackButton('❌ KẾT THÚC CHAT', `ADMIN_END_CHAT_${sessionId}`),
                        createPostbackButton('👀 XEM LỊCH SỬ', `ADMIN_CHAT_HISTORY_${sessionId}`),
                        createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

            await sendButtonTemplate(
                session.user_id,
                'Bạn muốn:',
                [
                    createPostbackButton('🔍 TÌM KIẾM', 'SEARCH'),
                    createPostbackButton('🛒 TẠO TIN', 'LISTING'),
                    createPostbackButton('🏠 VỀ TRANG CHỦ', 'MAIN_MENU')
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
