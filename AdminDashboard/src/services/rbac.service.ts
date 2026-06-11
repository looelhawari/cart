import { apiClient } from '@/lib/api-client'

export interface RbacRole {
    id: number
    slug: string
    display_name: string
    description: string | null
    is_system: boolean
    permissions: string[]
    permission_count: number
}

export interface RbacPermission {
    id: number
    slug: string
    action: string
    display_name: string
}

export interface RbacModule {
    module: string
    permissions: RbacPermission[]
}

export const rbacService = {
    async getRoles(): Promise<RbacRole[]> {
        const res = await apiClient.get<{ success: boolean; data: RbacRole[] }>('/admin/rbac/roles')
        return (res as any).data ?? res
    },

    async getPermissions(): Promise<RbacModule[]> {
        const res = await apiClient.get<{ success: boolean; data: RbacModule[] }>('/admin/rbac/permissions')
        return (res as any).data ?? res
    },

    async updateRolePermissions(roleId: number, permissions: string[]): Promise<void> {
        await apiClient.put(`/admin/rbac/roles/${roleId}/permissions`, { permissions })
    },
}
