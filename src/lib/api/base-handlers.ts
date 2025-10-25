/**
 * Base API Handlers
 * Common CRUD operations and patterns for all API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../supabase'
import {
    RequestContext,
    GetOptions,
    CreateOptions,
    UpdateOptions,
    DeleteOptions,
    ValidationRule,
    ApiResponse
} from './api-types'
import {
    withAdminAuth,
    withOptionalAuth,
    createRequestContext
} from './api-auth'
import {
    validateRequestBody,
    parsePaginationParams,
    parseFilterParams,
    parseSortParams,
    calculatePagination,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    getRecords,
    successResponse,
    errorResponse,
    paginatedResponse,
    handleApiError,
    commonValidationRules
} from './api-helpers'
import { logger } from '../logger'

// Base handler for all API routes
export abstract class BaseApiHandler {
    protected tableName: string
    protected defaultSelect: string = '*'
    protected defaultLimit: number = 20
    protected maxLimit: number = 100

    constructor(tableName: string) {
        this.tableName = tableName
    }

    // GET handler with pagination and filtering
    async handleGet(context: RequestContext): Promise<NextResponse> {
        try {
            const { request } = context
            const pagination = parsePaginationParams(request)
            const filters = parseFilterParams(request)
            const sort = parseSortParams(request)

            // Build query options
            const queryOptions: GetOptions = {
                table: this.tableName,
                select: this.defaultSelect,
                limit: pagination.limit,
                offset: pagination.offset,
                orderBy: sort?.field,
                orderDirection: sort?.direction
            }

            // Apply filters
            if (Object.keys(filters).length > 0) {
                queryOptions.where = {}
                if (filters.category) queryOptions.where.category = filters.category
                if (filters.location) queryOptions.where.location = filters.location
                if (filters.status) queryOptions.where.status = filters.status
                if (filters.minPrice) queryOptions.where.price = `gte.${filters.minPrice}`
                if (filters.maxPrice) queryOptions.where.price = `lte.${filters.maxPrice}`
            }

            // Get total count for pagination
            const totalResult = await this.getTotalCount(queryOptions)
            const totalItems = totalResult.count || 0

            // Get records
            const records = await getRecords(queryOptions)

            // Calculate pagination info
            const paginationInfo = calculatePagination(totalItems, pagination)

            return paginatedResponse(records, paginationInfo)
        } catch (error) {
            return handleApiError(error, 'GET handler')
        }
    }

    // POST handler for creating records
    async handlePost(context: RequestContext): Promise<NextResponse> {
        try {
            const { request } = context
            const body = await request.json()

            // Validate required fields
            const validation = validateRequestBody(body, this.getCreateValidationRules())
            if (!validation.isValid) {
                return errorResponse(
                    `Validation failed: ${Object.values(validation.errors).join(', ')}`,
                    400
                )
            }

            // Create record
            const createOptions: CreateOptions = {
                table: this.tableName,
                data: body,
                returnFields: this.defaultSelect
            }

            const record = await createRecord(createOptions)

            return successResponse(record, 'Record created successfully')
        } catch (error) {
            return handleApiError(error, 'POST handler')
        }
    }

    // PUT handler for updating records
    async handlePut(context: RequestContext): Promise<NextResponse> {
        try {
            const { request } = context
            const body = await request.json()

            if (!body.id) {
                return errorResponse('Record ID is required', 400)
            }

            // Validate update fields
            const validation = validateRequestBody(body, this.getUpdateValidationRules())
            if (!validation.isValid) {
                return errorResponse(
                    `Validation failed: ${Object.values(validation.errors).join(', ')}`,
                    400
                )
            }

            // Update record
            const { id, ...updateData } = body
            const updateOptions: UpdateOptions = {
                table: this.tableName,
                data: updateData,
                where: { id },
                returnFields: this.defaultSelect
            }

            const record = await updateRecord(updateOptions)

            return successResponse(record, 'Record updated successfully')
        } catch (error) {
            return handleApiError(error, 'PUT handler')
        }
    }

    // DELETE handler for deleting records
    async handleDelete(context: RequestContext): Promise<NextResponse> {
        try {
            const { request } = context
            const url = new URL(request.url)
            const id = url.searchParams.get('id')

            if (!id) {
                return errorResponse('Record ID is required', 400)
            }

            // Delete record
            const deleteOptions: DeleteOptions = {
                table: this.tableName,
                where: { id }
            }

            await deleteRecord(deleteOptions)

            return successResponse({ deleted: true }, 'Record deleted successfully')
        } catch (error) {
            return handleApiError(error, 'DELETE handler')
        }
    }

    // Abstract methods to be implemented by specific handlers
    protected abstract getCreateValidationRules(): ValidationRule[]
    protected abstract getUpdateValidationRules(): ValidationRule[]

    // Helper method to get total count
    private async getTotalCount(baseOptions: GetOptions): Promise<{ count: number }> {
        try {
            const { data, error } = await supabaseAdmin
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .match(baseOptions.where || {})

            if (error) throw error

            return { count: data?.length || 0 }
        } catch (error) {
            logger.error('Error getting total count', { table: this.tableName, error })
            return { count: 0 }
        }
    }
}

// Admin API handler with authentication
export abstract class AdminApiHandler extends BaseApiHandler {
    constructor(tableName: string) {
        super(tableName)
    }

    // GET with admin auth
    static async handleGet(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handleGet(context)
    }

    // POST with admin auth
    static async handlePost(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handlePost(context)
    }

    // PUT with admin auth
    static async handlePut(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handlePut(context)
    }

    // DELETE with admin auth
    static async handleDelete(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handleDelete(context)
    }
}

// Public API handler without authentication
export abstract class PublicApiHandler extends BaseApiHandler {
    constructor(tableName: string) {
        super(tableName)
    }

    // GET without auth
    static async handleGet(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handleGet(context)
    }

    // POST without auth
    static async handlePost(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handlePost(context)
    }

    // PUT without auth
    static async handlePut(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handlePut(context)
    }

    // DELETE without auth
    static async handleDelete(context: RequestContext): Promise<NextResponse> {
        const handler = new (this as any)()
        return handler.handleDelete(context)
    }
}

// Specific handlers for common entities
export class UsersApiHandler extends AdminApiHandler {
    constructor() {
        super('users')
    }

    protected getCreateValidationRules(): ValidationRule[] {
        return [
            commonValidationRules.required('facebook_id'),
            commonValidationRules.required('name'),
            commonValidationRules.required('phone'),
            commonValidationRules.required('location'),
            commonValidationRules.required('birthday'),
            commonValidationRules.phone('phone'),
            commonValidationRules.string('name', 1, 100),
            commonValidationRules.string('location', 1, 100)
        ]
    }

    protected getUpdateValidationRules(): ValidationRule[] {
        return [
            commonValidationRules.string('name', 1, 100),
            commonValidationRules.phone('phone'),
            commonValidationRules.string('location', 1, 100)
        ]
    }
}

export class ListingsApiHandler extends PublicApiHandler {
    constructor() {
        super('listings')
    }

    protected getCreateValidationRules(): ValidationRule[] {
        return [
            commonValidationRules.required('user_id'),
            commonValidationRules.required('title'),
            commonValidationRules.required('category'),
            commonValidationRules.required('price'),
            commonValidationRules.required('description'),
            commonValidationRules.required('location'),
            commonValidationRules.string('title', 1, 200),
            commonValidationRules.number('price', 0),
            commonValidationRules.string('description', 10, 2000)
        ]
    }

    protected getUpdateValidationRules(): ValidationRule[] {
        return [
            commonValidationRules.string('title', 1, 200),
            commonValidationRules.number('price', 0),
            commonValidationRules.string('description', 10, 2000)
        ]
    }
}

export class PaymentsApiHandler extends AdminApiHandler {
    constructor() {
        super('payments')
    }

    protected getCreateValidationRules(): ValidationRule[] {
        return [
            commonValidationRules.required('user_id'),
            commonValidationRules.required('amount'),
            commonValidationRules.number('amount', 0)
        ]
    }

    protected getUpdateValidationRules(): ValidationRule[] {
        return [
            commonValidationRules.string('status'),
            commonValidationRules.string('admin_notes')
        ]
    }
}

// API route factory functions
export function createApiRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    handlerClass: typeof BaseApiHandler,
    requireAuth: boolean = false
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        try {
            // Create context
            const context = await createRequestContext(request)

            // Create handler instance
            const handler = new (handlerClass as any)()

            // Route to appropriate method
            switch (method) {
                case 'GET':
                    return handler.handleGet(context)
                case 'POST':
                    return handler.handlePost(context)
                case 'PUT':
                    return handler.handlePut(context)
                case 'DELETE':
                    return handler.handleDelete(context)
                default:
                    return errorResponse('Method not allowed', 405)
            }
        } catch (error) {
            return handleApiError(error, `${method} route`)
        }
    }
}

export function createAdminApiRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    handlerClass: typeof AdminApiHandler
) {
    const middleware = withAdminAuth(async (context: RequestContext) => {
        const handler = new (handlerClass as any)()

        switch (method) {
            case 'GET':
                return handler.handleGet(context)
            case 'POST':
                return handler.handlePost(context)
            case 'PUT':
                return handler.handlePut(context)
            case 'DELETE':
                return handler.handleDelete(context)
            default:
                return errorResponse('Method not allowed', 405)
        }
    })

    return middleware
}

export function createPublicApiRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    handlerClass: typeof PublicApiHandler
) {
    const middleware = withOptionalAuth(async (context: RequestContext) => {
        const handler = new (handlerClass as any)()

        switch (method) {
            case 'GET':
                return handler.handleGet(context)
            case 'POST':
                return handler.handlePost(context)
            case 'PUT':
                return handler.handlePut(context)
            case 'DELETE':
                return handler.handleDelete(context)
            default:
                return errorResponse('Method not allowed', 405)
        }
    })

    return middleware
}
