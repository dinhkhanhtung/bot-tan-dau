import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Create new event
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            title,
            description,
            event_date,
            location,
            organizer_id,
            max_participants
        } = body

        // Validate required fields
        if (!title || !description || !event_date || !location || !organizer_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate event date
        const eventDate = new Date(event_date)
        if (eventDate <= new Date()) {
            return NextResponse.json(
                { error: 'Event date must be in the future' },
                { status: 400 }
            )
        }

        // Create event
        const { data: event, error } = await supabaseAdmin
            .from('events')
            .insert({
                title,
                description,
                event_date: eventDate.toISOString(),
                location,
                organizer_id,
                max_participants: max_participants || null,
                current_participants: 0,
                status: 'upcoming'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating event:', error)
            return NextResponse.json(
                { error: 'Failed to create event' },
                { status: 500 }
            )
        }

        // Send notification to all users
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('status', 'active')

        if (users && users.length > 0) {
            const notifications = users.map(user => ({
                user_id: user.id,
                type: 'event',
                title: 'Sự kiện mới',
                message: `Sự kiện "${title}" đã được tạo. Hãy tham gia ngay!`
            }))

            await supabaseAdmin
                .from('notifications')
                .insert(notifications)
        }

        return NextResponse.json({ event }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/events:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get events
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabaseAdmin
            .from('events')
            .select(`
        *,
        organizer:organizer_id (
          id,
          name
        )
      `)
            .order('event_date', { ascending: true })
            .range(offset, offset + limit - 1)

        if (status) {
            query = query.eq('status', status)
        }

        const { data: events, error } = await query

        if (error) {
            console.error('Error fetching events:', error)
            return NextResponse.json(
                { error: 'Failed to fetch events' },
                { status: 500 }
            )
        }

        return NextResponse.json({ events })
    } catch (error) {
        console.error('Error in GET /api/events:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update event
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        const { data: event, error } = await supabaseAdmin
            .from('events')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating event:', error)
            return NextResponse.json(
                { error: 'Failed to update event' },
                { status: 500 }
            )
        }

        return NextResponse.json({ event })
    } catch (error) {
        console.error('Error in PUT /api/events:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete event
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('events')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting event:', error)
            return NextResponse.json(
                { error: 'Failed to delete event' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Event deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/events:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
