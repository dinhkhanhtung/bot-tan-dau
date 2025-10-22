import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { StatsService } from '@/lib/stats-service'
import jwt from 'jsonwebtoken'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production')

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'

        // Initialize StatsService
        const statsService = new StatsService()

        // Get comprehensive statistics using StatsService
        const stats = await statsService.getAllStats(range)

        return NextResponse.json({
            success: true,
            stats
        })

    } catch (error) {
        console.error('Admin stats error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}