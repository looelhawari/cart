import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import SupportAnalyticsDashboard from '@/components/support/SupportAnalytics'

export default function SupportAnalyticsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-4">
                <Link to="/support">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary">{t('support.analyticsTitle', 'Support Analytics')}</h1>
                    <p className="text-muted-foreground mt-1">{t('support.analyticsSubtitle', 'Monitor support performance and metrics')}</p>
                </div>
            </div>

            <SupportAnalyticsDashboard />
        </div>
    )
}
