import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Simple health check without database dependency
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: true, // Assume healthy for now
                facebook: true,
                supabase: true
            },
            uptime: process.uptime(),
            version: '1.0.0'
        }

        return NextResponse.json(health, { status: 200 })

    } catch (error) {
        console.error('Health check error:', error)

        return NextResponse.json(
            {
                status: 'error',
                error: 'Health check failed',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        )
    }
}
