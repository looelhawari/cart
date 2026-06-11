import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { rbacService, type RbacRole, type RbacModule } from '@/services/rbac.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ShieldCheck, RotateCcw, Save } from 'lucide-react'

/**
 * Roles & permissions matrix. Rows are permissions grouped by module,
 * columns are the editable (non-owner) roles. Owner always has everything
 * and cannot be edited, so it is shown as a static note instead of a column.
 */
export default function RolesTab() {
    const { t } = useTranslation()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: roles, isLoading: rolesLoading } = useQuery({
        queryKey: ['rbac-roles'],
        queryFn: rbacService.getRoles,
    })

    const { data: modules, isLoading: permsLoading } = useQuery({
        queryKey: ['rbac-permissions'],
        queryFn: rbacService.getPermissions,
    })

    const editableRoles = useMemo(
        () => (roles ?? []).filter((r) => r.slug !== 'owner'),
        [roles],
    )

    // Local editable copy: role slug → set of permission slugs
    const [draft, setDraft] = useState<Record<string, Set<string>>>({})

    useEffect(() => {
        if (!roles) return
        const next: Record<string, Set<string>> = {}
        for (const role of roles) {
            if (role.slug === 'owner') continue
            next[role.slug] = new Set(role.permissions)
        }
        setDraft(next)
    }, [roles])

    const dirtyRoles = useMemo(() => {
        if (!roles) return []
        return editableRoles.filter((role) => {
            const current = draft[role.slug]
            if (!current) return false
            if (current.size !== role.permissions.length) return true
            return role.permissions.some((p) => !current.has(p))
        })
    }, [roles, editableRoles, draft])

    const toggle = (roleSlug: string, permSlug: string) => {
        setDraft((prev) => {
            const next = { ...prev }
            const set = new Set(next[roleSlug])
            if (set.has(permSlug)) set.delete(permSlug)
            else set.add(permSlug)
            next[roleSlug] = set
            return next
        })
    }

    const saveMutation = useMutation({
        mutationFn: async (toSave: RbacRole[]) => {
            for (const role of toSave) {
                await rbacService.updateRolePermissions(role.id, Array.from(draft[role.slug] ?? []))
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rbac-roles'] })
            toast({ title: t('rbac.saveSuccess', 'Role permissions updated') })
        },
        onError: (err: any) => {
            toast({
                title: t('common.error', 'Error'),
                description: err?.response?.data?.message || 'Failed to update role permissions',
                variant: 'destructive',
            })
        },
    })

    const resetDraft = () => {
        if (!roles) return
        const next: Record<string, Set<string>> = {}
        for (const role of roles) {
            if (role.slug === 'owner') continue
            next[role.slug] = new Set(role.permissions)
        }
        setDraft(next)
    }

    if (rolesLoading || permsLoading) {
        return <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-elbaraka-primary shrink-0" />
                    {t(
                        'rbac.ownerNote',
                        'The Owner role always has every permission and cannot be edited.',
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={resetDraft}
                        disabled={dirtyRoles.length === 0 || saveMutation.isPending}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('common.reset', 'Reset')}
                    </Button>
                    <Button
                        size="sm"
                        className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                        onClick={() => saveMutation.mutate(dirtyRoles)}
                        disabled={dirtyRoles.length === 0 || saveMutation.isPending}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {saveMutation.isPending
                            ? t('common.saving', 'Saving...')
                            : t('rbac.saveChanges', 'Save changes')}
                        {dirtyRoles.length > 0 && ` (${dirtyRoles.length})`}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                        {t('rbac.matrixTitle', 'Permissions per role')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 font-medium">
                                        {t('rbac.permission', 'Permission')}
                                    </th>
                                    {editableRoles.map((role) => (
                                        <th key={role.slug} className="text-center p-2 font-medium">
                                            <div>{role.display_name}</div>
                                            <Badge variant="outline" className="mt-1 font-normal">
                                                {(draft[role.slug]?.size ?? 0)}{' '}
                                                {t('rbac.granted', 'granted')}
                                            </Badge>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(modules ?? []).map((mod: RbacModule) => (
                                    <ModuleRows
                                        key={mod.module}
                                        module={mod}
                                        roles={editableRoles}
                                        draft={draft}
                                        onToggle={toggle}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function ModuleRows({
    module,
    roles,
    draft,
    onToggle,
}: {
    module: RbacModule
    roles: RbacRole[]
    draft: Record<string, Set<string>>
    onToggle: (roleSlug: string, permSlug: string) => void
}) {
    return (
        <>
            <tr className="bg-gray-50">
                <td
                    colSpan={roles.length + 1}
                    className="p-2 font-semibold text-xs uppercase tracking-wide text-gray-600"
                >
                    {module.module.replace(/_/g, ' ')}
                </td>
            </tr>
            {module.permissions.map((perm) => (
                <tr key={perm.slug} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-2">
                        <span className="font-medium">{perm.display_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{perm.slug}</span>
                    </td>
                    {roles.map((role) => (
                        <td key={role.slug} className="p-2 text-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-green-700 cursor-pointer"
                                checked={draft[role.slug]?.has(perm.slug) ?? false}
                                onChange={() => onToggle(role.slug, perm.slug)}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}
