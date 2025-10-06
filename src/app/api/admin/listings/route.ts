import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
    try {
        // Verify admin token
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verify token
        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
        const decoded = jwt.verify(token, jwtSecret) as any

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'all'
        const limit = parseInt(searchParams.get('limit') || '100')

        // Build query
        let query = supabaseAdmin
            .from('listings')
            .select(`
                *,
                users!listings_user_id_fkey (
                    name,
                    phone,
                    location
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit)

        // Apply status filter
        if (status !== 'all') {
            query = query.eq('status', status)
        }

        const { data: listings, error } = await query

        if (error) {
            console.error('Error fetching listings:', error)
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            listings: listings || []
        })

    } catch (error) {
        console.error('Admin listings error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
