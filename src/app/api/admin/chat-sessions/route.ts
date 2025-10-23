import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminTakeoverService } from '@/lib/admin-takeover-service'
import { UnifiedUserStateManager } from '@/lib/core/unified-user-state-manager'
import { logger } from '@/lib/logger'
import { getUsersWaitingForAdmin, getActiveTakeovers, getTakeoverStats } from '@/lib/database-service'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// GET: Lấy danh sách chat sessions và thông tin takeover
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get('admin_id')
        const status = searchParams.get('status') // 'active' | 'all' | 'waiting'
        const type = searchParams.get('type') // 'sessions' | 'waiting_users' | 'stats'

        // Nếu không có admin_id và type là stats hoặc waiting_users, vẫn cho phép
        if (!adminId && !type) {
            return NextResponse.json(
                { success: false, message: 'Admin ID is required' },
                { status: 400 }
            )
        }

        // Lấy danh sách users đang chờ admin hỗ trợ
        if (type === 'waiting_users') {
            const waitingUsers = await getUsersWaitingForAdmin()

            // Lấy thông tin chi tiết của các users
            const usersWithDetails = []
            for (const userId of waitingUsers) {
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('facebook_id, name, phone, status')
                    .eq('facebook_id', userId)
                    .single()

                if (userData) {
                    // Lấy thông tin takeover state
                    const { data: takeoverState } = await supabaseAdmin
                        .from('admin_takeover_states')
                        .select('consecutive_message_count, last_user_message_at')
                        .eq('user_id', userId)
                        .single()

                    usersWithDetails.push({
                        ...userData,
                        consecutive_message_count: takeoverState?.consecutive_message_count || 0,
                        last_user_message_at: takeoverState?.last_user_message_at
                    })
                }
            }

            return NextResponse.json({
                success: true,
                data: usersWithDetails,
                total: usersWithDetails.length
            })
        }

        // Lấy thống kê takeover
        if (type === 'stats') {
            const stats = await getTakeoverStats()

            // Lấy thêm thông tin chi tiết về active takeovers
            const activeTakeovers = await getActiveTakeovers()

            return NextResponse.json({
                success: true,
                data: {
                    ...stats,
                    active_takeovers_details: activeTakeovers
                }
            })
        }

        // Lấy danh sách chat sessions (tương thích ngược)
        if (!adminId) {
            return NextResponse.json(
                { success: false, message: 'Admin ID is required for sessions' },
                { status: 400 }
            )
        }

        let query = supabaseAdmin
            .from('admin_chat_sessions')
            .select(`
                *,
                users:user_facebook_id (
                    facebook_id,
                    name,
                    phone,
                    status
                )
            `)
            .eq('admin_id', adminId)

        if (status === 'active') {
            query = query.eq('is_active', true)
        }

        const { data, error } = await query.order('started_at', { ascending: false })

        if (error) {
            logger.error('Error fetching chat sessions', { adminId, error: error.message })
            return NextResponse.json(
                { success: false, message: 'Failed to fetch chat sessions' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || []
        })

    } catch (error) {
        logger.error('Exception in GET chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST: Bắt đầu chat với user hoặc các chức năng takeover khác
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { admin_id, user_facebook_id, action } = body

        if (!admin_id || !user_facebook_id) {
            return NextResponse.json(
                { success: false, message: 'Admin ID and user Facebook ID are required' },
                { status: 400 }
            )
        }

        // Xử lý các action khác nhau
        if (action === 'initiate_takeover') {
            // Sử dụng phương thức mới từ AdminTakeoverService
            await AdminTakeoverService.initiateAdminTakeover(user_facebook_id, admin_id)

            logger.info('Admin initiated takeover', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Admin takeover initiated successfully'
            })
        } else if (action === 'start_chat') {
            // Sử dụng phương thức cũ để tương thích ngược
            await AdminTakeoverService.startAdminChat(user_facebook_id, admin_id)

            logger.info('Admin started chat', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Admin chat started successfully'
            })
        } else {
            // Default action: sử dụng phương thức cũ
            await AdminTakeoverService.startAdminChat(user_facebook_id, admin_id)

            logger.info('Admin started chat (default)', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Admin chat started successfully'
            })
        }

    } catch (error) {
        logger.error('Exception in POST chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT: Dừng chat với user hoặc các chức năng takeover khác
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { admin_id, user_facebook_id, action } = body

        if (!admin_id || !user_facebook_id) {
            return NextResponse.json(
                { success: false, message: 'Admin ID and user Facebook ID are required' },
                { status: 400 }
            )
        }

        // Xử lý các action khác nhau
        if (action === 'release_takeover') {
            // Sử dụng phương thức mới từ AdminTakeoverService
            await AdminTakeoverService.releaseAdminTakeover(user_facebook_id, admin_id)

            logger.info('Admin released takeover', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Admin takeover released successfully'
            })
        } else if (action === 'reactivate_bot') {
            // Chỉ kích hoạt lại bot mà không thay đổi trạng thái takeover
            await UnifiedUserStateManager.reactivateBot(user_facebook_id)

            // Reset message counter
            await AdminTakeoverService.resetMessageCounter(user_facebook_id)

            logger.info('Bot reactivated for user', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Bot reactivated successfully'
            })
        } else if (action === 'stop_chat') {
            // Sử dụng phương thức cũ để tương thích ngược
            await AdminTakeoverService.stopAdminChat(user_facebook_id, admin_id)

            // Kích hoạt lại bot cho user
            await UnifiedUserStateManager.reactivateBot(user_facebook_id)

            logger.info('Admin stopped chat', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Admin chat stopped successfully'
            })
        } else {
            // Default action: sử dụng phương thức cũ
            await AdminTakeoverService.stopAdminChat(user_facebook_id, admin_id)

            // Kích hoạt lại bot cho user
            await UnifiedUserStateManager.reactivateBot(user_facebook_id)

            logger.info('Admin stopped chat (default)', { admin_id, user_facebook_id })

            return NextResponse.json({
                success: true,
                message: 'Admin chat stopped successfully'
            })
        }

    } catch (error) {
        logger.error('Exception in PUT chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE: Xóa chat session
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('session_id')

        if (!sessionId) {
            return NextResponse.json(
                { success: false, message: 'Session ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('admin_chat_sessions')
            .delete()
            .eq('id', sessionId)

        if (error) {
            logger.error('Error deleting chat session', { sessionId, error: error.message })
            return NextResponse.json(
                { success: false, message: 'Failed to delete chat session' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Chat session deleted successfully'
        })

    } catch (error) {
        logger.error('Exception in DELETE chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
