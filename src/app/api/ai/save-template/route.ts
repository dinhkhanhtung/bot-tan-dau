import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AIPromptForm } from '@/types'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


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
        const { prompt, tone, context, category, templateName }: AIPromptForm = body

        // Validate required fields
        if (!prompt || !tone || !context || !category || !templateName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate field values
        if (!['friendly', 'professional', 'casual'].includes(tone)) {
            return NextResponse.json(
                { error: 'Invalid tone value' },
                { status: 400 }
            )
        }

        if (!['user_type', 'situation', 'goal'].includes(context)) {
            return NextResponse.json(
                { error: 'Invalid context value' },
                { status: 400 }
            )
        }

        // Save template to database
        const { data, error } = await supabase
            .from('ai_templates')
            .insert([{
                admin_id: adminInfo.id,
                name: templateName,
                prompt: prompt,
                tone: tone,
                context: context,
                category: category,
                is_active: true,
                usage_count: 0
            }])
            .select()
            .single()

        if (error) {
            console.error('Save template error:', error)
            return NextResponse.json(
                { error: 'Failed to save template', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data,
            message: 'Template saved successfully'
        })

    } catch (error) {
        console.error('Save Template API Error:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
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

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Build query
        let query = supabase
            .from('ai_templates')
            .select('*')
            .eq('admin_id', adminInfo.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (category) {
            query = query.eq('category', category)
        }

        if (limit > 0) {
            query = query.range(offset, offset + limit - 1)
        }

        const { data, error } = await query

        if (error) {
            console.error('Get templates error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch templates', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            pagination: {
                limit,
                offset,
                count: data?.length || 0
            }
        })

    } catch (error) {
        console.error('Get Templates API Error:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url)
        const templateId = searchParams.get('id')

        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            )
        }

        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('ai_templates')
            .update({ is_active: false })
            .eq('id', templateId)
            .eq('admin_id', adminInfo.id)

        if (error) {
            console.error('Delete template error:', error)
            return NextResponse.json(
                { error: 'Failed to delete template', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Template deleted successfully'
        })

    } catch (error) {
        console.error('Delete Template API Error:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
