import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Create new conversation
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user1_id, user2_id, listing_id } = body

        // Validate required fields
        if (!user1_id || !user2_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Check if conversation already exists
        const { data: existingConversation } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('user1_id', user1_id)
            .eq('user2_id', user2_id)
            .eq('listing_id', listing_id || null)
            .single()

        if (existingConversation) {
            return NextResponse.json({
                conversation: existingConversation,
                isNewConversation: false
            })
        }

        // Create conversation
        const { data: conversation, error } = await supabaseAdmin
            .from('conversations')
            .insert({
                user1_id,
                user2_id,
                listing_id: listing_id || null
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating conversation:', error)
            return NextResponse.json(
                { error: 'Failed to create conversation' },
                { status: 500 }
            )
        }

        // Send notifications to both users
        await supabaseAdmin
            .from('notifications')
            .insert([
                {
                    user_id: user1_id,
                    type: 'message',
                    title: 'Kết nối mới',
                    message: 'Bạn đã được kết nối với một người dùng mới!'
                },
                {
                    user_id: user2_id,
                    type: 'message',
                    title: 'Kết nối mới',
                    message: 'Bạn đã được kết nối với một người dùng mới!'
                }
            ])

        return NextResponse.json({
            conversation,
            isNewConversation: true
        })
    } catch (error) {
        console.error('Error in POST /api/conversations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get conversations for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const { data: conversations, error } = await supabaseAdmin
            .from('conversations')
            .select(`
        *,
        user1:user1_id (
          id,
          name,
          rating
        ),
        user2:user2_id (
          id,
          name,
          rating
        ),
        listing:listing_id (
          id,
          title,
          price,
          images
        )
      `)
            .or(`user1_id.eq.${user_id},user2_id.eq.${user_id}`)
            .order('last_message_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Error fetching conversations:', error)
            return NextResponse.json(
                { error: 'Failed to fetch conversations' },
                { status: 500 }
            )
        }

        return NextResponse.json({ conversations })
    } catch (error) {
        console.error('Error in GET /api/conversations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update conversation
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Conversation ID is required' },
                { status: 400 }
            )
        }

        const { data: conversation, error } = await supabaseAdmin
            .from('conversations')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating conversation:', error)
            return NextResponse.json(
                { error: 'Failed to update conversation' },
                { status: 500 }
            )
        }

        return NextResponse.json({ conversation })
    } catch (error) {
        console.error('Error in PUT /api/conversations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete conversation
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Conversation ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('conversations')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting conversation:', error)
            return NextResponse.json(
                { error: 'Failed to delete conversation' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Conversation deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/conversations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
