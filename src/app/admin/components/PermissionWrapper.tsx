'use client'

import { ReactNode } from 'react'
import { AdminRole, AdminPermission, hasPermission } from '@/types'

interface PermissionWrapperProps {
    children: ReactNode
    permission?: AdminPermission
    role?: AdminRole
    adminRole: AdminRole
    fallback?: ReactNode
    requireAll?: boolean // If true, requires both permission AND role
}

export default function PermissionWrapper({
    children,
    permission,
    role,
    adminRole,
    fallback = null,
    requireAll = false
}: PermissionWrapperProps) {
    // Check role requirement
    const roleMatch = !role || adminRole === role

    // Check permission requirement
    const permissionMatch = !permission || hasPermission(adminRole, permission)

    // If requireAll is true, both conditions must be met
    // If requireAll is false, either condition can be met (OR logic)
    const hasAccess = requireAll
        ? (roleMatch && permissionMatch)
        : (roleMatch || permissionMatch)

    if (!hasAccess) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

// Hook for using permissions in functional components
export function usePermissions(adminRole: AdminRole) {
    const checkPermission = (permission: AdminPermission): boolean => {
        return hasPermission(adminRole, permission)
    }

    const checkRole = (role: AdminRole): boolean => {
        return adminRole === role
    }

    const checkAccess = (options: {
        permission?: AdminPermission
        role?: AdminRole
        requireAll?: boolean
    }): boolean => {
        const { permission, role, requireAll = false } = options

        const roleMatch = !role || checkRole(role)
        const permissionMatch = !permission || checkPermission(permission)

        return requireAll
            ? (roleMatch && permissionMatch)
            : (roleMatch || permissionMatch)
    }

    return {
        checkPermission,
        checkRole,
        checkAccess,
        hasPermission: checkPermission,
        hasRole: checkRole,
        canAccess: checkAccess
    }
}