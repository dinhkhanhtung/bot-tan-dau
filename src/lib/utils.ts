import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Core Utilities
 * Essential utility functions that don't belong to specific domains
 */

// Deep clone object
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}







// DEPRECATED FUNCTIONS REMOVED - Use database-service.ts directly
