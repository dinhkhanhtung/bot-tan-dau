import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendButtonTemplate,
    sendGenericTemplate,
    createPostbackButton,
    sendMessagesWithTyping
} from './facebook-api'
import { formatCurrency, formatNumber, formatDateTime } from './utils'

// Admin command handlers
export async function handleAdminPayments(user: any) {
    try {
        // Check if user exists and has required properties
        if (!user || !user.facebook_id) {
            console.error('Invalid user in handleAdminPayments:', user)
            return
        }
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select(`
        *,
        users:user_id (
          id,
          name,
          phone
        )
      `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching payments:', error)
            await sendMessage(user.facebook_id, 'Có lỗi khi lấy danh sách thanh toán!')
            return
        }

        if (!payments || payments.length === 0) {
            await sendMessage(user.facebook_id, '💰 Không có thanh toán nào chờ duyệt!')
            return
        }

        const elements = payments.map((payment, index) => ({
            title: `${index + 1}. ${payment.users?.name || 'Unknown'} - ${formatCurrency(payment.amount)}`,
            subtitle: `SĐT: ${payment.users?.phone || 'N/A'} | ${formatDateTime(payment.created_at)}`,
            buttons: [
                createPostbackButton('✅ DUYỆT', `ADMIN_APPROVE_PAYMENT_${payment.id}`),
                createPostbackButton('❌ TỪ CHỐI', `ADMIN_REJECT_PAYMENT_${payment.id}`),
                createPostbackButton('👀 XEM', `ADMIN_VIEW_PAYMENT_${payment.id}`)
            ]
        }))

        await sendGenericTemplate(user.facebook_id, elements)
    } catch (error) {
        console.error('Error handling admin payments:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra!')
    }
}

export async function handleAdminUsers(user: any) {
    try {
        // Check if user exists and has required properties
        if (!user || !user.facebook_id) {
            console.error('Invalid user in handleAdminUsers:', user)
            return
        }
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching users:', error)
            await sendMessage(user.facebook_id, 'Có lỗi khi lấy danh sách user!')
            return
        }

        if (!users || users.length === 0) {
            await sendMessage(user.facebook_id, '👥 Không có user nào!')
            return
        }

        const elements = users.map((userData, index) => ({
            title: `${index + 1}. ${userData.name}`,
            subtitle: `SĐT: ${userData.phone} | ${userData.location} | ${userData.status}`,
            buttons: [
                createPostbackButton('👀 XEM CHI TIẾT', `ADMIN_VIEW_USER_${userData.id}`),
                createPostbackButton('🔒 KHÓA', `ADMIN_BAN_USER_${userData.id}`),
                createPostbackButton('✅ KÍCH HOẠT', `ADMIN_ACTIVATE_USER_${userData.id}`)
            ]
        }))

        await sendGenericTemplate(user.facebook_id, elements)
    } catch (error) {
        console.error('Error handling admin users:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra!')
    }
}

export async function handleAdminListings(user: any) {
    try {
        // Check if user exists and has required properties
        if (!user || !user.facebook_id) {
            console.error('Invalid user in handleAdminListings:', user)
            return
        }
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select(`
        *,
        users:user_id (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching listings:', error)
            await sendMessage(user.facebook_id, 'Có lỗi khi lấy danh sách tin đăng!')
            return
        }

        if (!listings || listings.length === 0) {
            await sendMessage(user.facebook_id, '🛒 Không có tin đăng nào!')
            return
        }

        const elements = listings.map((listing, index) => ({
            title: `${index + 1}. ${listing.title}`,
            subtitle: `${listing.users?.name || 'Unknown'} | ${formatCurrency(listing.price)} | ${listing.status}`,
            buttons: [
                createPostbackButton('👀 XEM CHI TIẾT', `ADMIN_VIEW_LISTING_${listing.id}`),
                createPostbackButton('✅ DUYỆT', `ADMIN_APPROVE_LISTING_${listing.id}`),
                createPostbackButton('❌ XÓA', `ADMIN_DELETE_LISTING_${listing.id}`)
            ]
        }))

        await sendGenericTemplate(user.facebook_id, elements)
    } catch (error) {
        console.error('Error handling admin listings:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra!')
    }
}

export async function handleAdminStats(user: any) {
    try {
        // Check if user exists and has required properties
        if (!user || !user.facebook_id) {
            console.error('Invalid user in handleAdminStats:', user)
            return
        }
        // Get user stats
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })

        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        const { count: trialUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'trial')

        // Get listing stats
        const { count: totalListings } = await supabaseAdmin
            .from('listings')
            .select('*', { count: 'exact', head: true })

        const { count: activeListings } = await supabaseAdmin
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        // Get payment stats
        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount, created_at')
            .eq('status', 'approved')

        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

        // Get today's stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { count: todayUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString())

        const { count: todayListings } = await supabaseAdmin
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString())

        await sendMessagesWithTyping(user.facebook_id, [
            '📊 THỐNG KÊ TỔNG QUAN',
            '',
            '👥 Users:',
            `• Tổng: ${totalUsers || 0} (+${todayUsers || 0} hôm nay)`,
            `• Active: ${activeUsers || 0}`,
            `• Trial: ${trialUsers || 0}`,
            '',
            '🛒 Tin đăng:',
            `• Tổng: ${totalListings || 0} (+${todayListings || 0} hôm nay)`,
            `• Active: ${activeListings || 0}`,
            '',
            '💰 Doanh thu:',
            `• Tổng: ${formatCurrency(totalRevenue)}`,
            `• Hôm nay: ${formatCurrency(0)}`, // TODO: Calculate today's revenue
            '',
            '📈 Tăng trưởng:',
            `• User: +${todayUsers || 0} hôm nay`,
            `• Tin đăng: +${todayListings || 0} hôm nay`
        ])

        await sendButtonTemplate(
            user.facebook_id,
            'Chọn thống kê chi tiết:',
            [
                createPostbackButton('📈 XEM CHI TIẾT', 'ADMIN_DETAILED_STATS'),
                createPostbackButton('📤 XUẤT BÁO CÁO', 'ADMIN_EXPORT_REPORT'),
                createPostbackButton('🔄 LÀM MỚI', 'ADMIN_STATS'),
                createPostbackButton('🏠 VỀ MENU', 'ADMIN_MENU')
            ]
        )
    } catch (error) {
        console.error('Error handling admin stats:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra!')
    }
}

export async function handleAdminApprovePayment(user: any, paymentId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', paymentId)

        if (error) {
            console.error('Error approving payment:', error)
            await sendMessage(user.facebook_id, 'Có lỗi khi duyệt thanh toán!')
            return
        }

        await sendMessage(user.facebook_id, '✅ Đã duyệt thanh toán thành công!')

        // Get payment details and extend user membership
        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('user_id, amount')
            .eq('id', paymentId)
            .single()

        if (payment) {
            // Extend user membership
            const daysToExtend = Math.floor(payment.amount / 1000) // 1000 VND per day
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('membership_expires_at')
                .eq('id', payment.user_id)
                .single()

            if (user) {
                let newExpiryDate: Date
                if (user.membership_expires_at) {
                    newExpiryDate = new Date(user.membership_expires_at)
                } else {
                    newExpiryDate = new Date()
                }
                newExpiryDate.setDate(newExpiryDate.getDate() + daysToExtend)

                await supabaseAdmin
                    .from('users')
                    .update({
                        status: 'active',
                        membership_expires_at: newExpiryDate.toISOString()
                    })
                    .eq('id', payment.user_id)

                // Send notification to user
                await supabaseAdmin
                    .from('notifications')
                    .insert({
                        user_id: payment.user_id,
                        type: 'payment',
                        title: 'Thanh toán đã được duyệt',
                        message: `Tài khoản của bạn đã được gia hạn thêm ${daysToExtend} ngày!`
                    })
            }
        }
    } catch (error) {
        console.error('Error approving payment:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra!')
    }
}

export async function handleAdminRejectPayment(user: any, paymentId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'rejected'
            })
            .eq('id', paymentId)

        if (error) {
            console.error('Error rejecting payment:', error)
            await sendMessage(user.facebook_id, 'Có lỗi khi từ chối thanh toán!')
            return
        }

        await sendMessage(user.facebook_id, '❌ Đã từ chối thanh toán!')
    } catch (error) {
        console.error('Error rejecting payment:', error)
        await sendMessage(user.facebook_id, 'Có lỗi xảy ra!')
    }
}

export async function handleAdminMenu(user: any) {
    await sendButtonTemplate(
        user.facebook_id,
        '🔧 ADMIN DASHBOARD\n\nChào admin! 👋',
        [
            createPostbackButton('💰 THANH TOÁN', 'ADMIN_PAYMENTS'),
            createPostbackButton('👥 USER', 'ADMIN_USERS'),
            createPostbackButton('🛒 TIN ĐĂNG', 'ADMIN_LISTINGS'),
            createPostbackButton('📊 THỐNG KÊ', 'ADMIN_STATS'),
            createPostbackButton('🔔 THÔNG BÁO', 'ADMIN_NOTIFICATIONS'),
            createPostbackButton('⚙️ CÀI ĐẶT', 'ADMIN_SETTINGS')
        ]
    )
}
