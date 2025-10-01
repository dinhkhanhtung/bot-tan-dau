import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendButtonTemplate,
    createPostbackButton,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, updateBotSession } from '../utils'

// Get admin IDs from environment variables
function getAdminIds(): string[] {
    const adminIds = process.env.ADMIN_IDS || ''
    return adminIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
}

// Check if user is admin
function isAdmin(facebookId: string): boolean {
    const adminIds = getAdminIds()
    return adminIds.includes(facebookId)
}

// Handle admin command
export async function handleAdminCommand(user: any) {
    console.log('Admin command called by:', user.facebook_id)
    console.log('Admin IDs:', getAdminIds())
    console.log('Is admin:', isAdmin(user.facebook_id))

    if (!isAdmin(user.facebook_id)) {
        await sendMessage(user.facebook_id, '❌ Bạn không có quyền truy cập!')
        return
    }

    await sendTypingIndicator(user.facebook_id)
    await sendMessagesWithTyping(user.facebook_id, [
        '🔧 ADMIN DASHBOARD',
        'Chào admin! 👋',
        'Bạn muốn quản lý gì?'
    ])

    // First set of admin functions
    await sendButtonTemplate(
        user.facebook_id,
        'Chức năng admin:',
        [
            createPostbackButton('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
            createPostbackButton('👥 USER', 'ADMIN_USERS'),
            createPostbackButton('🛒 TIN ĐĂNG', 'ADMIN_LISTINGS')
        ]
    )

    // Second set of admin functions
    await sendButtonTemplate(
        user.facebook_id,
        'Tiếp tục:',
        [
            createPostbackButton('📊 THỐNG KÊ', 'ADMIN_STATS'),
            createPostbackButton('🔔 THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
            createPostbackButton('📤 GỬI LINK ĐĂNG KÝ', 'ADMIN_SEND_REGISTRATION')
        ]
    )

    // Third set of admin functions
    await sendButtonTemplate(
        user.facebook_id,
        'Thêm:',
        [
            createPostbackButton('⚙️ CÀI ĐẶT', 'ADMIN_SETTINGS'),
            createPostbackButton('🛑 TẮT BOT', 'ADMIN_STOP_BOT'),
            createPostbackButton('❌ THOÁT', 'MAIN_MENU')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_PAYMENTS'),
                createPostbackButton('🔍 TÌM KIẾM', 'ADMIN_SEARCH_PAYMENT'),
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_PAYMENTS'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Chức năng:',
            [
                createPostbackButton('🔍 TÌM THEO TÊN', 'ADMIN_SEARCH_USER_NAME'),
                createPostbackButton('🔍 TÌM THEO SĐT', 'ADMIN_SEARCH_USER_PHONE'),
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_USERS'),
                createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_USERS'),
                createPostbackButton('⚠️ VI PHẠM', 'ADMIN_VIOLATIONS'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Chức năng:',
            [
                createPostbackButton('📊 XEM TẤT CẢ', 'ADMIN_ALL_LISTINGS'),
                createPostbackButton('⚠️ KIỂM DUYỆT', 'ADMIN_MODERATE_LISTINGS'),
                createPostbackButton('⭐ FEATURED', 'ADMIN_FEATURED_LISTINGS'),
                createPostbackButton('🔍 TÌM KIẾM', 'ADMIN_SEARCH_LISTINGS'),
                createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_LISTINGS'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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

        await sendButtonTemplate(
            user.facebook_id,
            'Tùy chọn:',
            [
                createPostbackButton('📈 XEM CHI TIẾT', 'ADMIN_DETAILED_STATS'),
                createPostbackButton('📊 XUẤT BÁO CÁO', 'ADMIN_EXPORT_COMPREHENSIVE'),
                createPostbackButton('📅 THEO NGÀY', 'ADMIN_EXPORT_BY_DATE'),
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_STATS'),
                createPostbackButton('🔙 QUAY LẠI', 'ADMIN')
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
    const adminIds = getAdminIds()

    await sendMessagesWithTyping(user.facebook_id, [
        '👨‍💼 QUẢN LÝ ADMIN',
        `Danh sách admin hiện tại:\n${adminIds.map((id, index) => `${index + 1}. ${id}`).join('\n')}`,
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
