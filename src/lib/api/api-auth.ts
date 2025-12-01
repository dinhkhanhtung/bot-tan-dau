/**
 * API Authentication Middleware
 * Centralized JWT verification and admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { RequestContext, AuthUser, ApiResponse } from './api-types'
import { logger } from '../logger'

// Authentication middleware for admin routes
export async function verifyAdminAuth(request: NextRequest): Promise<{ user: AuthUser } | { error: NextResponse }> {
    try {
        // Development bypass - if enabled, return a mock admin user without JWT
        if (process.env.ADMIN_DEV_BYPASS === 'true') {
            const devUser: AuthUser = { id: 'dev-admin', role: 'super_admin', permissions: ['all'] }
            logger.debug('Admin dev bypass enabled, returning mock admin user', { path: request.url })
            return { user: devUser }
        }

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            logger.warn('Missing authorization token', { path: request.url })
            return {
                error: NextResponse.json(
                    { success: false, message: 'Authorization token required' } as ApiResponse,
                    { status: 401 }
                )
            }
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production') as any

        if (!decoded || !decoded.id || !decoded.role) {
            logger.warn('Invalid token structure', { path: request.url })
            return {
                error: NextResponse.json(
                    { success: false, message: 'Invalid token structure' } as ApiResponse,
                    { status: 401 }
                )
            }
        }

        // Check if user has admin role
        if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
            logger.warn('Insufficient permissions', { path: request.url, role: decoded.role })
            return {
                error: NextResponse.json(
                    { success: false, message: 'Admin access required' } as ApiResponse,
                    { status: 403 }
                )
            }
        }

        const user: AuthUser = {
            id: decoded.id,
            role: decoded.role,
            permissions: decoded.permissions || ['read']
        }

        logger.debug('Admin authentication successful', {
            path: request.url,
            userId: user.id,
            role: user.role
        })

        return { user }
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Invalid JWT token', { path: request.url, error: error.message })
            return {
                error: NextResponse.json(
                    { success: false, message: 'Invalid token' } as ApiResponse,
                    { status: 401 }
                )
            }
        }

        if (error instanceof jwt.TokenExpiredError) {
            logger.warn('Expired JWT token', { path: request.url })
            return {
                error: NextResponse.json(
                    { success: false, message: 'Token expired' } as ApiResponse,
                    { status: 401 }
                )
            }
        }

        logger.error('Authentication error', { path: request.url, error })
        return {
            error: NextResponse.json(
                { success: false, message: 'Authentication failed' } as ApiResponse,
                { status: 500 }
            )
        }
    }
}

// Optional authentication for routes that can work with or without auth
export async function optionalAuth(request: NextRequest): Promise<AuthUser | null> {
    try {
        const result = await verifyAdminAuth(request)
        return 'user' in result ? result.user : null
    } catch (error) {
        logger.debug('Optional auth failed, continuing without auth', { path: request.url })
        return null
    }
}

// Create request context with authentication
export async function createRequestContext(request: NextRequest): Promise<RequestContext> {
    const authResult = await optionalAuth(request)

    return {
        request,
        user: authResult || undefined,
        params: {}
    }
}

// Middleware function to wrap API handlers with authentication
export function withAdminAuth(handler: (context: RequestContext) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const authResult = await verifyAdminAuth(request)

        if ('error' in authResult) {
            return authResult.error
        }

        const context: RequestContext = {
            request,
            user: authResult.user,
            params: {}
        }

        return handler(context)
    }
}

// Middleware function for optional authentication
export function withOptionalAuth(handler: (context: RequestContext) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const user = await optionalAuth(request)

        const context: RequestContext = {
            request,
            user: user || undefined,
            params: {}
        }

        return handler(context)
    }
}
