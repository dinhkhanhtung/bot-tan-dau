import { NextRequest, NextResponse } from 'next/server'
import { healthCheck } from '@/lib/integration'

// Health check API endpoint
export async function GET(request: NextRequest) {
    try {
        const health = await healthCheck()

        const statusCode = health.status === 'healthy' ? 200 : 503

        return NextResponse.json(health, { status: statusCode })

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
