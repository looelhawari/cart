import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import "@/i18n"; // Import i18n for internationalization
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthStore } from "@/store/auth.store";
import { getDefaultRoute } from "@/lib/rbac";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/products/ProductsPage";
import CategoriesPage from "@/pages/categories/CategoriesPage";
import OrdersPage from "@/pages/orders/OrdersPage";
import OrderDetailPage from "@/pages/orders/OrderDetailPage";
import OrderReceiptPage from "@/pages/orders/OrderReceiptPage";
import SupportPage from "@/pages/support/SupportPage";
import TicketDetailPage from "@/pages/support/TicketDetailPage";
import SupportAnalyticsPage from "@/pages/support/SupportAnalyticsPage";
import UserManagementPage from "@/pages/users/UserManagementPage";
import CustomerDetailsPage from "@/pages/customers/CustomerDetailsPage";
import ComprehensiveAnalyticsPage from "@/pages/analytics/ComprehensiveAnalyticsPage";
import PromotionsPage from "@/pages/promotions/PromotionsPage";
import PromoCodesPage from "@/pages/promo-codes/PromoCodesPage";
import PromoCodeAnalyticsPage from "@/pages/promo-codes/PromoCodeAnalyticsPage";
import LogsPage from "@/pages/LogsPage";
import NoAccessPage from "@/pages/NoAccessPage";
import ContentManagementPage from "@/pages/content/ContentManagementPage";
import StoreSettingsPage from "@/pages/settings/StoreSettingsPage";
import ReviewsPage from "@/pages/reviews/ReviewsPage";
import RefundDashboardPage from "@/pages/refunds/RefundDashboardPage";
import DeliveryZonesPage from "@/pages/delivery-zones/DeliveryZonesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dashboard is an operations console — admins expect their edits and
      // fresh data to show right away. A 5-min staleTime + no focus refetch
      // made it feel stale ("my change didn't take effect"). Refresh on
      // mount and on window focus, with a short staleTime.
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

/** Redirects authenticated users to their first accessible page, or /login if not authed */
function SmartRedirect() {
  const { isAuthenticated, permissions, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={getDefaultRoute(permissions, user?.role)} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <DashboardLayout>
                    <DashboardPage />
                  </DashboardLayout>
                }
                path="/dashboard"
              />

              <Route
                element={
                  <DashboardLayout>
                    <ProductsPage />
                  </DashboardLayout>
                }
                path="/products"
              />

              <Route
                element={
                  <DashboardLayout>
                    <CategoriesPage />
                  </DashboardLayout>
                }
                path="/categories"
              />

              <Route
                element={
                  <DashboardLayout>
                    <PromotionsPage />
                  </DashboardLayout>
                }
                path="/promotions"
              />

              <Route
                element={
                  <DashboardLayout>
                    <PromoCodesPage />
                  </DashboardLayout>
                }
                path="/promo-codes"
              />
              <Route
                element={
                  <DashboardLayout>
                    <PromoCodeAnalyticsPage />
                  </DashboardLayout>
                }
                path="/promo-codes/:id/analytics"
              />

              <Route
                element={
                  <DashboardLayout>
                    <OrdersPage />
                  </DashboardLayout>
                }
                path="/orders"
              />
              <Route
                element={
                  <DashboardLayout>
                    <OrderDetailPage />
                  </DashboardLayout>
                }
                path="/orders/:id"
              />
              <Route
                path="/orders/:id/receipt"
                element={<OrderReceiptPage />}
              />

              <Route
                element={
                  <DashboardLayout>
                    <RefundDashboardPage />
                  </DashboardLayout>
                }
                path="/refunds"
              />

              <Route
                element={
                  <DashboardLayout>
                    <SupportPage />
                  </DashboardLayout>
                }
                path="/support"
              />
              <Route
                element={
                  <DashboardLayout>
                    <SupportAnalyticsPage />
                  </DashboardLayout>
                }
                path="/support/analytics"
              />
              <Route
                element={
                  <DashboardLayout>
                    <TicketDetailPage />
                  </DashboardLayout>
                }
                path="/support/:id"
              />

              <Route
                element={
                  <DashboardLayout>
                    <UserManagementPage />
                  </DashboardLayout>
                }
                path="/users"
              />

              {/* Legacy URL: customers list now lives in /users as a tab */}
              <Route
                path="/customers"
                element={<Navigate to="/users?tab=customers" replace />}
              />
              <Route
                element={
                  <DashboardLayout>
                    <CustomerDetailsPage />
                  </DashboardLayout>
                }
                path="/customers/:id"
              />

              <Route
                element={
                  <DashboardLayout>
                    <ComprehensiveAnalyticsPage />
                  </DashboardLayout>
                }
                path="/analytics"
              />

              <Route
                element={
                  <DashboardLayout>
                    <LogsPage />
                  </DashboardLayout>
                }
                path="/logs"
              />

              {/* Legacy URLs: both log pages now live in /logs as tabs */}
              <Route
                path="/activity-logs"
                element={<Navigate to="/logs?tab=app" replace />}
              />
              <Route
                path="/admin-logs"
                element={<Navigate to="/logs?tab=admin" replace />}
              />

              <Route
                element={
                  <DashboardLayout>
                    <ContentManagementPage />
                  </DashboardLayout>
                }
                path="/content"
              />

              <Route
                element={
                  <DashboardLayout>
                    <StoreSettingsPage />
                  </DashboardLayout>
                }
                path="/settings"
              />

              <Route
                element={
                  <DashboardLayout>
                    <ReviewsPage />
                  </DashboardLayout>
                }
                path="/reviews"
              />

              <Route
                element={
                  <DashboardLayout>
                    <DeliveryZonesPage />
                  </DashboardLayout>
                }
                path="/delivery-zones"
              />

              {/* Landing page for admins whose role has no permissions yet */}
              <Route path="/no-access" element={<NoAccessPage />} />
            </Route>

            <Route path="/" element={<SmartRedirect />} />
            <Route path="*" element={<SmartRedirect />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
