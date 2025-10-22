import { NextResponse } from 'next/server'
import { BotError, ErrorHandler } from './error-handler'

/**
 * Standardized response utility for API routes
 * Helps reduce duplication in error handling and responses
 */

export class ResponseUtils {
    static success(data: any, status: number = 200): NextResponse {
        return NextResponse.json({ success: true, ...data }, { status })
    }

    static error(error: string | Error | BotError, status: number = 500): NextResponse {
        const handler = ErrorHandler.getInstance()
        const err = typeof error === 'string' ? new Error(error) : error
        const botError = handler.handleError(err)

        return NextResponse.json({
            success: false,
            message: handler.getUserFriendlyMessage(botError),
            error: botError.message
        }, { status })
    }

    static validationError(message: string): NextResponse {
        return NextResponse.json({ success: false, message }, { status: 400 })
    }

    static unauthorized(message: string = 'Unauthorized'): NextResponse {
        return NextResponse.json({ success: false, message }, { status: 401 })
    }

    static notFound(message: string = 'Not found'): NextResponse {
        return NextResponse.json({ success: false, message }, { status: 404 })
    }

    static conflict(message: string): NextResponse {
        return NextResponse.json({ success: false, message }, { status: 409 })
    }
}