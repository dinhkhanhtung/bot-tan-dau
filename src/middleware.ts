import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request: NextRequest) {
    // Check if accessing admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Allow login page
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next()
        }

        // Check for admin token
        const token = request.cookies.get('admin_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production')

            // Add admin info to request headers for API routes
            const response = NextResponse.next()
            response.headers.set('x-admin-id', (decoded as any).adminId)
            response.headers.set('x-admin-role', (decoded as any).role)

            return response
        } catch (error) {
            // Invalid token, redirect to login
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}
