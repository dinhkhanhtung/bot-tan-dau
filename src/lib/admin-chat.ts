import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendButtonTemplate,
    createPostbackButton,
    sendMessagesWithTyping
} from './facebook-api'

// Start admin chat session
export async function startAdminChatSession(userId: string): Promise<{ success: boolean, sessionId?: string, error?: string }> {
    try {
        // Check if user already has an active session
        const { data: existingSession } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['waiting', 'active'])
            .single()

        if (existingSession) {
            return {
                success: true,
                sessionId: existingSession.id
            }
        }

        // Create new session
        const { data: newSession, error } = await supabaseAdmin
            .from('admin_chat_sessions')
            .insert({
                user_id: userId,
                status: 'waiting'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating admin chat session:', error)
            return {
                success: false,
                error: error.message
            }
        }

        // Notify all admins about new chat request
        await notifyAdminsNewChatRequest(userId, newSession.id)

        return {
            success: true,
            sessionId: newSession.id
        }
    } catch (error) {
        console.error('Error in startAdminChatSession:', error)
        return {
            success: false,
            error: 'Internal error'
        }
    }
}

// Check if user is in admin chat mode
export async function isUserInAdminChat(userId: string): Promise<boolean> {
    try {
        const { data: session } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['waiting', 'active'])
            .single()

        return !!session
    } catch (error) {
        return false
    }
}

// Get active admin chat session
export async function getActiveAdminChatSession(userId: string) {
    try {
        const { data: session } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['waiting', 'active'])
            .single()

        return session
    } catch (error) {
        return null
    }
}

// End admin chat session
export async function endAdminChatSession(userId: string): Promise<boolean> {
    try {
        const { error } = await supabaseAdmin
            .from('admin_chat_sessions')
            .update({
                status: 'closed',
                ended_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .in('status', ['waiting', 'active'])

        return !error
    } catch (error) {
        console.error('Error ending admin chat session:', error)
        return false
    }
}

// Admin takes over chat session
export async function adminTakeOverChat(sessionId: string, adminId: string): Promise<boolean> {
    try {
        const { error } = await supabaseAdmin
            .from('admin_chat_sessions')
            .update({
                status: 'active',
                admin_id: adminId,
                last_message_at: new Date().toISOString()
            })
            .eq('id', sessionId)

        return !error
    } catch (error) {
        console.error('Error in admin takeover:', error)
        return false
    }
}

// Update last message time
export async function updateLastMessageTime(sessionId: string): Promise<void> {
    try {
        await supabaseAdmin
            .from('admin_chat_sessions')
            .update({
                last_message_at: new Date().toISOString()
            })
            .eq('id', sessionId)
    } catch (error) {
        console.error('Error updating last message time:', error)
    }
}

// Notify admins about new chat request
async function notifyAdminsNewChatRequest(userId: string, sessionId: string): Promise<void> {
    try {
        // Get user info
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('name, phone')
            .eq('facebook_id', userId)
            .single()

        // Get all admin IDs
        const adminIds = process.env.ADMIN_IDS || ''
        const envAdmins = adminIds.split(',').map(id => id.trim()).filter(id => id.length > 0)

        // Also get admins from database
        const { data: dbAdmins } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id')
            .eq('status', 'active')

        const allAdmins = [...envAdmins, ...(dbAdmins?.map(a => a.facebook_id) || [])]
        const uniqueAdmins = [...new Set(allAdmins)]

        // Send notification to all admins
        for (const adminId of uniqueAdmins) {
            try {
                await sendTypingIndicator(adminId)
                await sendMessagesWithTyping(adminId, [
                    '🔔 YÊU CẦU CHAT MỚI',
                    `👤 User: ${user?.name || 'Unknown'}`,
                    `📱 Phone: ${user?.phone || 'Unknown'}`,
                    `🆔 Session: ${sessionId.slice(-8)}`
                ])

                await sendButtonTemplate(
                    adminId,
                    'Bạn muốn nhận chat này?',
                    [
                        createPostbackButton('✅ NHẬN CHAT', `ADMIN_TAKE_CHAT_${sessionId}`),
                        createPostbackButton('👀 XEM CHI TIẾT', `ADMIN_VIEW_CHAT_${sessionId}`),
                        createPostbackButton('❌ BỎ QUA', 'ADMIN_IGNORE_CHAT')
                    ]
                )
            } catch (error) {
                console.error(`Error notifying admin ${adminId}:`, error)
            }
        }
    } catch (error) {
        console.error('Error notifying admins:', error)
    }
}

// Handle user message in admin chat mode
export async function handleUserMessageInAdminChat(userId: string, message: string): Promise<void> {
    try {
        const session = await getActiveAdminChatSession(userId)
        if (!session) {
            return
        }

        // Update last message time
        await updateLastMessageTime(session.id)

        if (session.status === 'waiting') {
            // User is waiting for admin, send waiting message
            await sendTypingIndicator(userId)
            await sendMessage(userId, '⏳ Bạn đang chờ admin phản hồi...')
            await sendMessage(userId, 'Admin sẽ trả lời sớm nhất có thể!')

            await sendButtonTemplate(
                userId,
                'Trong khi chờ đợi:',
                [
                    createPostbackButton('❌ HỦY CHAT', 'CANCEL_ADMIN_CHAT'),
                    createPostbackButton('🔄 QUAY LẠI BOT', 'EXIT_ADMIN_CHAT')
                ]
            )
        } else if (session.status === 'active' && session.admin_id) {
            // Forward message to admin
            await sendTypingIndicator(session.admin_id)
            await sendMessage(session.admin_id, `💬 User: ${message}`)

            // Send confirmation to user
            await sendMessage(userId, '✅ Tin nhắn đã gửi đến admin')
        }
    } catch (error) {
        console.error('Error handling user message in admin chat:', error)
    }
}

// Handle admin message to user
export async function handleAdminMessageToUser(adminId: string, sessionId: string, message: string): Promise<void> {
    try {
        const { data: session } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('admin_id', adminId)
            .single()

        if (!session) {
            await sendMessage(adminId, '❌ Session không tồn tại hoặc bạn không có quyền!')
            return
        }

        // Send message to user
        await sendTypingIndicator(session.user_id)
        await sendMessage(session.user_id, `👨‍💼 Admin: ${message}`)

        // Update last message time
        await updateLastMessageTime(sessionId)

        // Send confirmation to admin
        await sendMessage(adminId, '✅ Tin nhắn đã gửi đến user')
    } catch (error) {
        console.error('Error handling admin message to user:', error)
    }
}
