import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// Join event
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { event_id, user_id } = body

        // Validate required fields
        if (!event_id || !user_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Check if event exists and is upcoming
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single()

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        if (event.status !== 'upcoming') {
            return NextResponse.json(
                { error: 'Event is not available for registration' },
                { status: 400 }
            )
        }

        // Check if user is already registered
        const { data: existingParticipant } = await supabaseAdmin
            .from('event_participants')
            .select('id')
            .eq('event_id', event_id)
            .eq('user_id', user_id)
            .single()

        if (existingParticipant) {
            return NextResponse.json(
                { error: 'User already registered for this event' },
                { status: 409 }
            )
        }

        // Check if event is full
        if (event.max_participants && event.current_participants >= event.max_participants) {
            return NextResponse.json(
                { error: 'Event is full' },
                { status: 400 }
            )
        }

        // Add participant
        const { data: participant, error } = await supabaseAdmin
            .from('event_participants')
            .insert({
                event_id,
                user_id
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding participant:', error)
            return NextResponse.json(
                { error: 'Failed to join event' },
                { status: 500 }
            )
        }

        // Update event participant count
        await supabaseAdmin
            .from('events')
            .update({
                current_participants: event.current_participants + 1
            })
            .eq('id', event_id)

        // Send notification to organizer
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: event.organizer_id,
                type: 'event',
                title: 'Người tham gia mới',
                message: `Có người mới tham gia sự kiện "${event.title}"`
            })

        return NextResponse.json({ participant }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/events/participants:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Leave event
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const event_id = searchParams.get('event_id')
        const user_id = searchParams.get('user_id')

        if (!event_id || !user_id) {
            return NextResponse.json(
                { error: 'Event ID and User ID are required' },
                { status: 400 }
            )
        }

        // Check if participant exists
        const { data: participant } = await supabaseAdmin
            .from('event_participants')
            .select('id')
            .eq('event_id', event_id)
            .eq('user_id', user_id)
            .single()

        if (!participant) {
            return NextResponse.json(
                { error: 'User is not registered for this event' },
                { status: 404 }
            )
        }

        // Remove participant
        const { error } = await supabaseAdmin
            .from('event_participants')
            .delete()
            .eq('event_id', event_id)
            .eq('user_id', user_id)

        if (error) {
            console.error('Error removing participant:', error)
            return NextResponse.json(
                { error: 'Failed to leave event' },
                { status: 500 }
            )
        }

        // Update event participant count
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('current_participants')
            .eq('id', event_id)
            .single()

        if (event) {
            await supabaseAdmin
                .from('events')
                .update({
                    current_participants: Math.max(0, event.current_participants - 1)
                })
                .eq('id', event_id)
        }

        return NextResponse.json({ message: 'Successfully left event' })
    } catch (error) {
        console.error('Error in DELETE /api/events/participants:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get event participants
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const event_id = searchParams.get('event_id')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!event_id) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        const { data: participants, error } = await supabaseAdmin
            .from('event_participants')
            .select(`
        *,
        user:user_id (
          id,
          name,
          location,
          rating
        )
      `)
            .eq('event_id', event_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Error fetching participants:', error)
            return NextResponse.json(
                { error: 'Failed to fetch participants' },
                { status: 500 }
            )
        }

        return NextResponse.json({ participants })
    } catch (error) {
        console.error('Error in GET /api/events/participants:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
