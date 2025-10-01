import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status')
        const location = searchParams.get('location')
        const search = searchParams.get('search')

        const supabase = createClient()
        let query = supabase
            .from('users')
            .select('*', { count: 'exact' })

        // Apply filters
        if (status) {
            query = query.eq('status', status)
        }
        if (location) {
            query = query.eq('location', location)
        }
        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        // Apply pagination
        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data: users, error, count } = await query
            .range(from, to)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi cơ sở dữ liệu' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
                has_next: page * limit < (count || 0),
                has_prev: page > 1,
            }
        })

    } catch (error) {
        console.error('Users API error:', error)
        return NextResponse.json(
            { error: 'Lỗi server' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const userData = await request.json()

        const supabase = createClient()

        const { data: user, error } = await supabase
            .from('users')
            .insert(userData)
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi tạo người dùng' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: user,
            message: 'Tạo người dùng thành công'
        })

    } catch (error) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { error: 'Lỗi tạo người dùng' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { id, ...updateData } = await request.json()

        if (!id) {
            return NextResponse.json(
                { error: 'Thiếu ID người dùng' },
                { status: 400 }
            )
        }

        const supabase = createClient()

        const { data: user, error } = await supabase
            .from('users')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi cập nhật người dùng' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: user,
            message: 'Cập nhật người dùng thành công'
        })

    } catch (error) {
        console.error('Update user error:', error)
        return NextResponse.json(
            { error: 'Lỗi cập nhật người dùng' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Thiếu ID người dùng' },
                { status: 400 }
            )
        }

        const supabase = createClient()

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi xóa người dùng' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Xóa người dùng thành công'
        })

    } catch (error) {
        console.error('Delete user error:', error)
        return NextResponse.json(
            { error: 'Lỗi xóa người dùng' },
            { status: 500 }
        )
    }
}
