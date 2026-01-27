import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { Toaster } from '@/components/ui/toaster'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'
import ErrorBoundary from '@/components/ErrorBoundary'

// Pages
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/products/ProductsPage'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import OrderDetailPage from '@/pages/orders/OrderDetailPage'
import SupportPage from '@/pages/support/SupportPage'
import TicketDetailPage from '@/pages/support/TicketDetailPage'
import FinancialPage from '@/pages/financial/FinancialPage'
import UsersPage from '@/pages/users/UsersPage'
import ComprehensiveAnalyticsPage from '@/pages/analytics/ComprehensiveAnalyticsPage'
import PromotionsPage from '@/pages/promotions/PromotionsPage'
import PromoCodesPage from '@/pages/promo-codes/PromoCodesPage'
import ActivityLogsPage from '@/pages/ActivityLogsPage'
import AdminLogsPage from '@/pages/AdminLogsPage'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
})

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route element={<ProtectedRoute />}>
                            <Route element={<DashboardLayout><DashboardPage /></DashboardLayout>} path="/dashboard" />

                            <Route element={<DashboardLayout><ProductsPage /></DashboardLayout>} path="/products" />

                            <Route element={<DashboardLayout><CategoriesPage /></DashboardLayout>} path="/categories" />

                            <Route element={<DashboardLayout><PromotionsPage /></DashboardLayout>} path="/promotions" />

                            <Route element={<DashboardLayout><PromoCodesPage /></DashboardLayout>} path="/promo-codes" />

                            <Route element={<DashboardLayout><OrdersPage /></DashboardLayout>} path="/orders" />
                            <Route element={<DashboardLayout><OrderDetailPage /></DashboardLayout>} path="/orders/:id" />

                            <Route element={<DashboardLayout><SupportPage /></DashboardLayout>} path="/support" />
                            <Route element={<DashboardLayout><TicketDetailPage /></DashboardLayout>} path="/support/:id" />

                            <Route element={<DashboardLayout><FinancialPage /></DashboardLayout>} path="/financial" />

                            <Route element={<DashboardLayout><UsersPage /></DashboardLayout>} path="/users" />

                            <Route element={<DashboardLayout><ComprehensiveAnalyticsPage /></DashboardLayout>} path="/analytics" />

                            <Route element={<DashboardLayout><ActivityLogsPage /></DashboardLayout>} path="/activity-logs" />

                            <Route element={<DashboardLayout><AdminLogsPage /></DashboardLayout>} path="/admin-logs" />
                        </Route>

                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster />
            </QueryClientProvider>
        </ErrorBoundary>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
