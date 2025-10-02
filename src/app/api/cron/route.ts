import { NextRequest, NextResponse } from 'next/server'
import { runAllCronJobs } from '@/lib/cron-jobs'

// API route to trigger cron jobs
export async function GET(request: NextRequest) {
    try {
        // Check for authorization (you can customize this)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || 'your-secret-key'

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.log('🚀 Starting cron jobs via API...')

        // Run all cron jobs
        await runAllCronJobs()

        return NextResponse.json({
            success: true,
            message: 'All cron jobs completed successfully',
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error running cron jobs via API:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

// POST method for manual trigger (if needed)
export async function POST(request: NextRequest) {
    try {
        // Check for authorization
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || 'your-secret-key'

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { job } = body

        console.log(`🚀 Starting specific cron job: ${job}`)

        // Import specific cron job functions
        const { sendTrialReminders, sendBirthdayNotifications, sendHoroscopeUpdates, sendPaymentFollowUps, cleanupOldData } = await import('@/lib/cron-jobs')

        let result

        switch (job) {
            case 'trial_reminders':
                await sendTrialReminders()
                result = 'Trial reminders completed'
                break
            case 'birthday_notifications':
                await sendBirthdayNotifications()
                result = 'Birthday notifications completed'
                break
            case 'horoscope_updates':
                await sendHoroscopeUpdates()
                result = 'Horoscope updates completed'
                break
            case 'payment_followups':
                await sendPaymentFollowUps()
                result = 'Payment follow-ups completed'
                break
            case 'cleanup':
                await cleanupOldData()
                result = 'Data cleanup completed'
                break
            case 'all':
            default:
                await runAllCronJobs()
                result = 'All cron jobs completed'
                break
        }

        return NextResponse.json({
            success: true,
            message: result,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error running specific cron job via API:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
