/**
 * API Helper Functions
 * Common utilities for query building, validation, and response formatting
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../supabase'
import {
    QueryOptions,
    CreateOptions,
    UpdateOptions,
    DeleteOptions,
    GetOptions,
    ValidationRule,
    ValidationResult,
    FilterOptions,
    SortOptions,
    PaginationOptions,
    PaginationResult,
    ApiResponse,
    PaginatedResponse
} from './api-types'
import { logger } from '../logger'

// Response helper functions
export function successResponse<T>(data: T, message?: string): NextResponse {
    const response: ApiResponse<T> = {
        success: true,
        data
    }
    if (message) {
        response.message = message
    }
    return NextResponse.json(response)
}

export function errorResponse(message: string, status: number = 500): NextResponse {
    const response: ApiResponse = {
        success: false,
        error: message
    }
    return NextResponse.json(response, { status })
}

export function paginatedResponse<T>(
    data: T[],
    pagination: PaginationResult,
    message?: string
): NextResponse {
    const response: PaginatedResponse<T> = {
        success: true,
        data,
        pagination: {
            page: pagination.currentPage,
            limit: pagination.totalPages > 0 ? Math.ceil(pagination.totalItems / pagination.totalPages) : 0,
            total: pagination.totalItems,
            totalPages: pagination.totalPages
        }
    }
    if (message) {
        response.message = message
    }
    return NextResponse.json(response)
}

// Validation helper functions
export function validateRequestBody(body: any, rules: ValidationRule[]): ValidationResult {
    const errors: Record<string, string> = {}

    for (const rule of rules) {
        const value = body[rule.field]

        // Check required fields
        if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
            errors[rule.field] = rule.message || `${rule.field} is required`
            continue
        }

        // Skip validation if field is not required and empty
        if (value === undefined || value === null || value === '') {
            continue
        }

        // Type-specific validation
        switch (rule.type) {
            case 'string':
                if (typeof value !== 'string') {
                    errors[rule.field] = rule.message || `${rule.field} must be a string`
                } else {
                    if (rule.min && value.length < rule.min) {
                        errors[rule.field] = rule.message || `${rule.field} must be at least ${rule.min} characters`
                    }
                    if (rule.max && value.length > rule.max) {
                        errors[rule.field] = rule.message || `${rule.field} must be at most ${rule.max} characters`
                    }
                    if (rule.pattern && !rule.pattern.test(value)) {
                        errors[rule.field] = rule.message || `${rule.field} format is invalid`
                    }
                }
                break

            case 'number':
                const numValue = Number(value)
                if (isNaN(numValue)) {
                    errors[rule.field] = rule.message || `${rule.field} must be a number`
                } else {
                    if (rule.min !== undefined && numValue < rule.min) {
                        errors[rule.field] = rule.message || `${rule.field} must be at least ${rule.min}`
                    }
                    if (rule.max !== undefined && numValue > rule.max) {
                        errors[rule.field] = rule.message || `${rule.field} must be at most ${rule.max}`
                    }
                }
                break

            case 'email':
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailPattern.test(value)) {
                    errors[rule.field] = rule.message || `${rule.field} must be a valid email address`
                }
                break

            case 'phone':
                const phonePattern = /^[0-9]{10,11}$/
                const cleanPhone = value.toString().replace(/\s/g, '')
                if (!phonePattern.test(cleanPhone)) {
                    errors[rule.field] = rule.message || `${rule.field} must be a valid phone number (10-11 digits)`
                }
                break

            case 'custom':
                if (rule.custom && !rule.custom(value)) {
                    errors[rule.field] = rule.message || `${rule.field} is invalid`
                }
                break
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    }
}

// Query building helper functions
export function buildQuery(options: QueryOptions) {
    let query = supabaseAdmin.from(options.table).select(options.select || '*')

    // Apply filters
    if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query = query.eq(key, value)
            }
        })
    }

    // Apply ordering
    if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' })
    }

    // Apply pagination
    if (options.limit) {
        query = query.limit(options.limit)
    }
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    return query
}

// Pagination helper functions
export function parsePaginationParams(request: NextRequest): PaginationOptions {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    return {
        page: Math.max(1, page),
        limit: Math.min(100, Math.max(1, limit)), // Cap at 100 items per page
        offset: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit))
    }
}

export function calculatePagination(totalItems: number, options: PaginationOptions): PaginationResult {
    const totalPages = Math.ceil(totalItems / options.limit)

    return {
        currentPage: options.page,
        totalPages,
        totalItems,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
    }
}

// Filter parsing helper functions
export function parseFilterParams(request: NextRequest): FilterOptions {
    const { searchParams } = new URL(request.url)

    return {
        search: searchParams.get('search') || undefined,
        category: searchParams.get('category') || undefined,
        location: searchParams.get('location') || undefined,
        status: searchParams.get('status') || undefined,
        dateFrom: searchParams.get('date_from') || undefined,
        dateTo: searchParams.get('date_to') || undefined,
        minPrice: searchParams.get('min_price') ? parseInt(searchParams.get('min_price')!) : undefined,
        maxPrice: searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!) : undefined
    }
}

export function parseSortParams(request: NextRequest): SortOptions | null {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sort_by')
    const sortDirection = searchParams.get('sort_direction') as 'asc' | 'desc'

    if (!sortBy) return null

    return {
        field: sortBy,
        direction: sortDirection || 'asc'
    }
}

// Database operation helper functions
export async function createRecord(options: CreateOptions) {
    const { data, error } = await supabaseAdmin
        .from(options.table)
        .insert(options.data)
        .select(options.returnFields || '*')
        .single()

    if (error) {
        logger.error('Error creating record', { table: options.table, error: error.message })
        throw error
    }

    return data
}

export async function updateRecord(options: UpdateOptions) {
    const { data, error } = await supabaseAdmin
        .from(options.table)
        .update(options.data)
        .match(options.where)
        .select(options.returnFields || '*')
        .single()

    if (error) {
        logger.error('Error updating record', { table: options.table, where: options.where, error: error.message })
        throw error
    }

    return data
}

export async function deleteRecord(options: DeleteOptions) {
    const { error } = await supabaseAdmin
        .from(options.table)
        .delete()
        .match(options.where)

    if (error) {
        logger.error('Error deleting record', { table: options.table, where: options.where, error: error.message })
        throw error
    }

    return true
}

export async function getRecord(options: GetOptions) {
    let query = supabaseAdmin
        .from(options.table)
        .select(options.select || '*')

    // Apply where conditions
    if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
            query = query.eq(key, value)
        })
    }

    const { data, error } = await query.single()

    if (error) {
        if (error.code === 'PGRST116') {
            return null // Record not found
        }
        logger.error('Error getting record', { table: options.table, where: options.where, error: error.message })
        throw error
    }

    return data
}

export async function getRecords(options: GetOptions) {
    let query = supabaseAdmin.from(options.table).select(options.select || '*')

    // Apply where conditions
    if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
            if (typeof value === 'string' && value.includes('gte.')) {
                const actualValue = value.replace('gte.', '')
                query = query.gte(key, actualValue)
            } else if (typeof value === 'string' && value.includes('lte.')) {
                const actualValue = value.replace('lte.', '')
                query = query.lte(key, actualValue)
            } else {
                query = query.eq(key, value)
            }
        })
    }

    // Apply ordering
    if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' })
    }

    // Apply pagination
    if (options.limit) {
        query = query.limit(options.limit)
    }
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) {
        logger.error('Error getting records', { table: options.table, where: options.where, error: error.message })
        throw error
    }

    return data || []
}

// Common validation rules
export const commonValidationRules = {
    required: (field: string, message?: string): ValidationRule => ({
        field,
        type: 'required',
        message: message || `${field} is required`
    }),

    string: (field: string, min?: number, max?: number, message?: string): ValidationRule => ({
        field,
        type: 'string',
        min,
        max,
        message: message || `${field} must be a string`
    }),

    number: (field: string, min?: number, max?: number, message?: string): ValidationRule => ({
        field,
        type: 'number',
        min,
        max,
        message: message || `${field} must be a number`
    }),

    email: (field: string, message?: string): ValidationRule => ({
        field,
        type: 'email',
        message: message || `${field} must be a valid email address`
    }),

    phone: (field: string, message?: string): ValidationRule => ({
        field,
        type: 'phone',
        message: message || `${field} must be a valid phone number`
    })
}

// Error handling helper
export function handleApiError(error: any, operation: string): NextResponse {
    logger.error(`API error in ${operation}`, { error })

    if (error.code === 'PGRST116') {
        return errorResponse('Resource not found', 404)
    }

    if (error.code === '23505') {
        return errorResponse('Resource already exists', 409)
    }

    if (error.message?.includes('JWT')) {
        return errorResponse('Authentication failed', 401)
    }

    return errorResponse('Internal server error', 500)
}

// Request body parsing helper
export async function parseRequestBody<T>(request: NextRequest): Promise<T> {
    try {
        return await request.json()
    } catch (error) {
        logger.error('Error parsing request body', { error })
        throw errorResponse('Invalid JSON in request body', 400)
    }
}

// URL parameter parsing helper
export function parseUrlParams(request: NextRequest): Record<string, string> {
    const { searchParams } = new URL(request.url)
    const params: Record<string, string> = {}

    searchParams.forEach((value, key) => {
        params[key] = value
    })

    return params
}

// Common CRUD response helpers
export function createResponse<T>(data: T, message?: string): NextResponse {
    return successResponse(data, message)
}

export function updateResponse<T>(data: T, message?: string): NextResponse {
    return successResponse(data, message || 'Record updated successfully')
}

export function deleteResponse(message?: string): NextResponse {
    return successResponse({ deleted: true }, message || 'Record deleted successfully')
}
