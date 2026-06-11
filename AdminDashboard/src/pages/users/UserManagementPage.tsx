import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/usePermissions'
import { Users, ShoppingBag, ShieldCheck } from 'lucide-react'
import CustomersPage from '@/pages/customers/CustomersPage'
import UsersPage from '@/pages/users/UsersPage'
import RolesTab from '@/pages/users/RolesTab'

/**
 * Single user-management hub replacing the separate Customers and Users
 * sidebar pages:
 *  - Customers: shoppers (role = customer) — needs customers.view
 *  - Team:      staff/admin accounts        — needs users.view
 *  - Roles:     role → permission matrix    — needs users.manage
 * The active tab syncs to ?tab= so old links can deep-link into a tab.
 */
export default function UserManagementPage() {
    const { t } = useTranslation()
    const { canAny, can } = usePermissions()
    const [searchParams, setSearchParams] = useSearchParams()

    const tabs = useMemo(
        () =>
            [
                {
                    value: 'customers',
                    visible: canAny(['customers.view', 'customers.manage']),
                    icon: ShoppingBag,
                    label: t('customers.title', 'Customers'),
                },
                {
                    value: 'team',
                    visible: canAny(['users.view', 'users.manage']),
                    icon: Users,
                    label: t('users.teamTab', 'Team'),
                },
                {
                    value: 'roles',
                    visible: can('users.manage'),
                    icon: ShieldCheck,
                    label: t('rbac.rolesTab', 'Roles & Permissions'),
                },
            ].filter((tab) => tab.visible),
        [canAny, can, t],
    )

    const requested = searchParams.get('tab')
    const activeTab = tabs.some((tab) => tab.value === requested)
        ? (requested as string)
        : tabs[0]?.value

    if (!activeTab) return null

    return (
        <div className="space-y-6">
            <Tabs
                value={activeTab}
                onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}
            >
                <TabsList>
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                <Icon className="h-4 w-4 mr-2" />
                                {tab.label}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                <TabsContent value="customers" className="mt-6">
                    <CustomersPage />
                </TabsContent>
                <TabsContent value="team" className="mt-6">
                    <UsersPage />
                </TabsContent>
                <TabsContent value="roles" className="mt-6">
                    <RolesTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
