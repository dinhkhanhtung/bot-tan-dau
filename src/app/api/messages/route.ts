import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Create new message
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { conversation_id, sender_id, content, message_type = 'text' } = body

        // Validate required fields
        if (!conversation_id || !sender_id || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate message type
        if (!['text', 'image', 'file'].includes(message_type)) {
            return NextResponse.json(
                { error: 'Invalid message type' },
                { status: 400 }
            )
        }

        // Create message
        const { data: message, error } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id,
                sender_id,
                content,
                message_type
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating message:', error)
            return NextResponse.json(
                { error: 'Failed to create message' },
                { status: 500 }
            )
        }

        // Update conversation last_message_at
        await supabaseAdmin
            .from('conversations')
            .update({
                last_message_at: new Date().toISOString()
            })
            .eq('id', conversation_id)

        return NextResponse.json({ message }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/messages:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get messages for a conversation
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const conversation_id = searchParams.get('conversation_id')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!conversation_id) {
            return NextResponse.json(
                { error: 'Conversation ID is required' },
                { status: 400 }
            )
        }

        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select(`
        *,
        sender:sender_id (
          id,
          name
        )
      `)
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Error fetching messages:', error)
            return NextResponse.json(
                { error: 'Failed to fetch messages' },
                { status: 500 }
            )
        }

        return NextResponse.json({ messages })
    } catch (error) {
        console.error('Error in GET /api/messages:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update message
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, content } = body

        if (!id || !content) {
            return NextResponse.json(
                { error: 'Message ID and content are required' },
                { status: 400 }
            )
        }

        const { data: message, error } = await supabaseAdmin
            .from('messages')
            .update({ content })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating message:', error)
            return NextResponse.json(
                { error: 'Failed to update message' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message })
    } catch (error) {
        console.error('Error in PUT /api/messages:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete message
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Message ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('messages')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting message:', error)
            return NextResponse.json(
                { error: 'Failed to delete message' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Message deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/messages:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
