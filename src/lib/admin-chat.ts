import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
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

            await sendQuickReply(
                userId,
                'Trong khi chờ đợi:',
                [
                    createQuickReply('❌ HỦY CHAT', 'CANCEL_ADMIN_CHAT'),
                    createQuickReply('🔄 QUAY LẠI BOT', 'EXIT_ADMIN_CHAT')
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
