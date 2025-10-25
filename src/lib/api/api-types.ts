/**
 * API Types and Interfaces
 * Shared TypeScript types for API operations
 */

import { NextRequest, NextResponse } from 'next/server'

// Common API response types
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

// Query options for building database queries
export interface QueryOptions {
    table: string
    select?: string
    filters?: Record<string, any>
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    limit?: number
    offset?: number
    includeRelated?: string[]
}

// CRUD operation options
export interface CreateOptions {
    table: string
    data: Record<string, any>
    returnFields?: string
}

export interface UpdateOptions {
    table: string
    data: Record<string, any>
    where: Record<string, any>
    returnFields?: string
}

export interface DeleteOptions {
    table: string
    where: Record<string, any>
}

export interface GetOptions {
    table: string
    where?: Record<string, any>
    select?: string
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    limit?: number
    offset?: number
    includeRelated?: string[]
}

// Authentication types
export interface AuthUser {
    id: string
    role: string
    permissions: string[]
}

// Request context with authentication
export interface RequestContext {
    request: NextRequest
    user?: AuthUser
    params?: Record<string, string>
}

// API handler function types
export type ApiHandler = (context: RequestContext) => Promise<NextResponse>
export type GetHandler = (context: RequestContext) => Promise<NextResponse>
export type PostHandler = (context: RequestContext) => Promise<NextResponse>
export type PutHandler = (context: RequestContext) => Promise<NextResponse>
export type DeleteHandler = (context: RequestContext) => Promise<NextResponse>

// Validation types
export interface ValidationRule {
    field: string
    type: 'string' | 'number' | 'email' | 'phone' | 'required' | 'custom'
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => boolean
    message?: string
}

export interface ValidationResult {
    isValid: boolean
    errors: Record<string, string>
}

// Filter and search types
export interface FilterOptions {
    search?: string
    category?: string
    location?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    minPrice?: number
    maxPrice?: number
}

export interface SortOptions {
    field: string
    direction: 'asc' | 'desc'
}

// Pagination types
export interface PaginationOptions {
    page: number
    limit: number
    offset?: number
}

export interface PaginationResult {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
}
