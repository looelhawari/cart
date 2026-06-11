import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/usePermissions'
import { Shield, Activity } from 'lucide-react'
import AdminLogsPage from '@/pages/AdminLogsPage'
import ActivityLogsPage from '@/pages/ActivityLogsPage'

/**
 * Single logs hub replacing the separate Admin Logs / App Logs sidebar pages:
 *  - Admin actions: who-changed-what audit trail (admin_logs) — needs admin_logs.view
 *  - App activity:  app-level events like logins (activity_logs) — needs app_logs.view
 * Active tab syncs to ?tab= so old links can deep-link into a tab.
 */
export default function LogsPage() {
    const { t } = useTranslation()
    const { can } = usePermissions()
    const [searchParams, setSearchParams] = useSearchParams()

    const tabs = useMemo(
        () =>
            [
                {
                    value: 'admin',
                    visible: can('admin_logs.view'),
                    icon: Shield,
                    label: t('navigation.adminLogs', 'Admin Actions'),
                },
                {
                    value: 'app',
                    visible: can('app_logs.view'),
                    icon: Activity,
                    label: t('navigation.appLogs', 'App Activity'),
                },
            ].filter((tab) => tab.visible),
        [can, t],
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

                <TabsContent value="admin" className="mt-6">
                    <AdminLogsPage />
                </TabsContent>
                <TabsContent value="app" className="mt-6">
                    <ActivityLogsPage />
                </TabsContent>
            </Tabs>
        </div>
    )
}
