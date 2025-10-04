import { NextRequest, NextResponse } from 'next/server'
import { AIUtils } from '@/lib/ai/ai-utils'
import { AIGenerateRequest } from '@/types'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verify admin token (simplified - in production, use proper JWT verification)
        const adminInfo = JSON.parse(request.headers.get('x-admin-info') || '{}')
        if (!adminInfo || !adminInfo.id) {
            return NextResponse.json(
                { error: 'Invalid admin session' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { prompt, tone, context, maxTokens, temperature, model }: AIGenerateRequest = body

        // Validate request
        const validation = AIUtils.validateRequest({ prompt, tone, context, maxTokens, temperature, model })
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            )
        }

        // Check if AI is enabled
        if (!AIUtils.isAIEnabled()) {
            return NextResponse.json(
                { error: 'AI features are currently disabled' },
                { status: 503 }
            )
        }

        // Generate AI response
        const aiRequest: AIGenerateRequest = {
            prompt,
            tone,
            context,
            maxTokens,
            temperature,
            model
        }

        const response = await AIUtils.generateResponse(aiRequest)

        return NextResponse.json({
            success: true,
            data: response
        })

    } catch (error) {
        console.error('AI Generate Response API Error:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        // Check if AI is enabled
        const isEnabled = AIUtils.isAIEnabled()
        const providers = AIUtils.getAvailableProviders()

        return NextResponse.json({
            success: true,
            data: {
                enabled: isEnabled,
                providers: providers
            }
        })

    } catch (error) {
        console.error('AI Status API Error:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
