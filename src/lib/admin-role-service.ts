import { supabaseAdmin } from './supabase'
import { AdminRole, AdminPermission, AdminUser, hasPermission, getRoleDisplayName, ROLE_PERMISSIONS } from '@/types'

export class AdminRoleService {
    // Check if admin has specific permission
    static hasPermission(adminRole: AdminRole, permission: AdminPermission): boolean {
        return hasPermission(adminRole, permission)
    }

    // Get all permissions for a role
    static getRolePermissions(role: AdminRole): AdminPermission[] {
        return ROLE_PERMISSIONS[role] || []
    }

    // Create new admin user
    static async createAdmin(adminData: {
        username: string
        email: string
        name: string
        role: AdminRole
        createdBy: string
    }): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
        try {
            // Check if creator has permission to create admins
            const { data: creatorData } = await supabaseAdmin
                .from('admin_users')
                .select('role')
                .eq('id', adminData.createdBy)
                .single()

            if (!creatorData) {
                return { success: false, error: 'Creator not found' }
            }

            const creatorRole = creatorData.role as AdminRole
            if (!this.hasPermission(creatorRole, AdminPermission.MANAGE_ADMINS)) {
                return { success: false, error: 'Insufficient permissions to create admin users' }
            }

            // Check if username or email already exists
            const { data: existingByUsername } = await supabaseAdmin
                .from('admin_users')
                .select('*')
                .eq('username', adminData.username)
                .maybeSingle()

            if (existingByUsername) {
                return { success: false, error: 'Username already exists' }
            }

            const { data: existingByEmail } = await supabaseAdmin
                .from('admin_users')
                .select('*')
                .eq('email', adminData.email)
                .maybeSingle()

            if (existingByEmail) {
                return { success: false, error: 'Email already exists' }
            }

            // Create admin user
            const { data, error } = await supabaseAdmin
                .from('admin_users')
                .insert({
                    username: adminData.username,
                    email: adminData.email,
                    name: adminData.name,
                    role: adminData.role,
                    permissions: ROLE_PERMISSIONS[adminData.role],
                    is_active: true,
                    created_by: adminData.createdBy
                })
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, admin: data as AdminUser }
        } catch (error) {
            return { success: false, error: 'Failed to create admin user' }
        }
    }

    // Get admin by ID
    static async getAdminById(adminId: string): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_users')
                .select('*')
                .eq('id', adminId)
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, admin: data as AdminUser }
        } catch (error) {
            return { success: false, error: 'Failed to fetch admin user' }
        }
    }

    // Get all admins
    static async getAllAdmins(): Promise<{ success: boolean; admins?: AdminUser[]; error?: string }> {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, admins: data as AdminUser[] }
        } catch (error) {
            return { success: false, error: 'Failed to fetch admin users' }
        }
    }

    // Update admin role and permissions
    static async updateAdminRole(
        adminId: string,
        newRole: AdminRole,
        updatedBy: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if updater has permission
            const updaterRole = await this.getCurrentAdminRole(updatedBy)
            if (!updaterRole || !this.hasPermission(updaterRole, AdminPermission.MANAGE_ADMINS)) {
                return { success: false, error: 'Insufficient permissions to update admin roles' }
            }

            // Super admin can update any role, others can only update lower roles
            if (updaterRole !== AdminRole.SUPER_ADMIN) {
                const targetAdminRole = await this.getCurrentAdminRole(adminId)
                if (targetAdminRole === AdminRole.SUPER_ADMIN) {
                    return { success: false, error: 'Cannot update Super Admin role' }
                }
            }

            const { error } = await supabaseAdmin
                .from('admin_users')
                .update({
                    role: newRole,
                    permissions: ROLE_PERMISSIONS[newRole],
                    updated_at: new Date().toISOString()
                })
                .eq('id', adminId)

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: 'Failed to update admin role' }
        }
    }

    // Deactivate admin
    static async deactivateAdmin(adminId: string, deactivatedBy: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if deactivator has permission
            const deactivatorRole = await this.getCurrentAdminRole(deactivatedBy)
            if (!deactivatorRole || !this.hasPermission(deactivatorRole, AdminPermission.MANAGE_ADMINS)) {
                return { success: false, error: 'Insufficient permissions to deactivate admin users' }
            }

            // Cannot deactivate super admin
            const targetAdminRole = await this.getCurrentAdminRole(adminId)
            if (targetAdminRole === AdminRole.SUPER_ADMIN) {
                return { success: false, error: 'Cannot deactivate Super Admin' }
            }

            const { error } = await supabaseAdmin
                .from('admin_users')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', adminId)

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: 'Failed to deactivate admin user' }
        }
    }

    // Get current admin role from token/session
    static async getCurrentAdminRole(adminId: string): Promise<AdminRole | null> {
        try {
            const { data } = await supabaseAdmin
                .from('admin_users')
                .select('role')
                .eq('id', adminId)
                .single()

            return data?.role as AdminRole || null
        } catch (error) {
            return null
        }
    }

    // Check if admin can perform action based on permissions and restrictions
    static canPerformAction(
        adminRole: AdminRole,
        permission: AdminPermission,
        context?: {
            category?: string
            currentHour?: number
            actionCount?: number
        }
    ): { allowed: boolean; reason?: string } {
        // Check basic permission
        if (!this.hasPermission(adminRole, permission)) {
            return { allowed: false, reason: 'Insufficient permissions' }
        }

        // Check restrictions if available
        const rolePermissions = this.getRolePermissions(adminRole)
        const permissionConfig = rolePermissions.find(p => p === permission)

        if (permissionConfig && context) {
            // Check category restrictions
            if (context.category) {
                // This would need to be implemented based on specific restrictions
                // For now, return allowed
            }

            // Check time restrictions
            if (context.currentHour !== undefined) {
                // This would need to be implemented based on specific restrictions
                // For now, return allowed
            }

            // Check action count restrictions
            if (context.actionCount !== undefined) {
                // This would need to be implemented based on specific restrictions
                // For now, return allowed
            }
        }

        return { allowed: true }
    }

    // Get admin dashboard data based on permissions
    static async getFilteredAdminData(
        adminRole: AdminRole,
        dataType: 'users' | 'listings' | 'payments' | 'analytics',
        filters?: any
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            switch (dataType) {
                case 'users':
                    if (!this.hasPermission(adminRole, AdminPermission.VIEW_USERS)) {
                        return { success: false, error: 'Insufficient permissions to view users' }
                    }
                    break
                case 'listings':
                    if (!this.hasPermission(adminRole, AdminPermission.VIEW_LISTINGS)) {
                        return { success: false, error: 'Insufficient permissions to view listings' }
                    }
                    break
                case 'payments':
                    if (!this.hasPermission(adminRole, AdminPermission.VIEW_PAYMENTS)) {
                        return { success: false, error: 'Insufficient permissions to view payments' }
                    }
                    break
                case 'analytics':
                    if (!this.hasPermission(adminRole, AdminPermission.VIEW_ANALYTICS)) {
                        return { success: false, error: 'Insufficient permissions to view analytics' }
                    }
                    break
            }

            // For now, return success - actual data filtering would be implemented in API routes
            return { success: true, data: {} }
        } catch (error) {
            return { success: false, error: 'Failed to get filtered data' }
        }
    }
}