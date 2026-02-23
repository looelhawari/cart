import * as XLSX from 'xlsx'
import type { FinancialDashboard } from '@/services/financial.service'
import type { Transaction } from '@/types'

export const exportFinancialDashboardExcel = (
    financialData: FinancialDashboard,
    transactions: Transaction[],
    promoCodesData?: any,
    dateFrom?: string,
    dateTo?: string
) => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // ===== SHEET 1: Financial Summary =====
    const summaryData = [
        ['FINANCIAL DASHBOARD REPORT'],
        [`Period: ${dateFrom || 'Last 30 days'} to ${dateTo || 'Today'}`],
        [`Generated: ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`],
        [],
        ['FINANCIAL SUMMARY'],
        ['Metric', 'Value'],
        ['Total Revenue', `EGP ${financialData.total_revenue.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Cash Revenue', `EGP ${financialData.cash_revenue.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Online Revenue', `EGP ${financialData.online_revenue.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Pending Payments', `EGP ${financialData.pending_payments.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Refunded Amount', `EGP ${financialData.refunded_amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        [],
        ['ORDER STATISTICS'],
        ['Metric', 'Count'],
        ['Total Orders', financialData.total_orders],
        ['Paid Orders', financialData.paid_orders],
        ['Pending Orders', financialData.pending_orders],
        ['Failed Orders', financialData.failed_orders],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // Set column widths
    summarySheet['!cols'] = [
        { wch: 30 },
        { wch: 25 }
    ]

    // Style the header rows
    if (summarySheet['A1']) {
        summarySheet['A1'].s = {
            font: { bold: true, sz: 16 },
            alignment: { horizontal: 'center' }
        }
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // ===== SHEET 2: Revenue by Payment Method =====
    const paymentMethodData = [
        ['REVENUE BY PAYMENT METHOD'],
        [],
        ['Payment Method', 'Amount (EGP)', 'Order Count'],
        ...financialData.revenue_by_payment_method.map(item => [
            item.method,
            item.amount.toFixed(2),
            item.count
        ])
    ]

    const paymentMethodSheet = XLSX.utils.aoa_to_sheet(paymentMethodData)
    paymentMethodSheet['!cols'] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 15 }
    ]

    XLSX.utils.book_append_sheet(workbook, paymentMethodSheet, 'Payment Methods')

    // ===== SHEET 3: Revenue by Day =====
    const revenueByDayData = [
        ['REVENUE BY DAY'],
        [],
        ['Date', 'Revenue (EGP)'],
        ...financialData.revenue_by_day.map(item => [
            new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            item.revenue.toFixed(2)
        ])
    ]

    const revenueByDaySheet = XLSX.utils.aoa_to_sheet(revenueByDayData)
    revenueByDaySheet['!cols'] = [
        { wch: 20 },
        { wch: 20 }
    ]

    XLSX.utils.book_append_sheet(workbook, revenueByDaySheet, 'Daily Revenue')

    // ===== SHEET 4: Transactions =====
    if (transactions && transactions.length > 0) {
        const transactionsData = [
            ['RECENT TRANSACTIONS'],
            [],
            ['Transaction ID', 'Amount (EGP)', 'Payment Method', 'Status', 'Date'],
            ...transactions.map(t => [
                t.paymob_transaction_id || t.id.toString(),
                t.amount.toFixed(2),
                t.payment_method.replace('_', ' '),
                t.payment_status,
                new Date(t.transaction_date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            ])
        ]

        const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData)
        transactionsSheet['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 20 },
            { wch: 12 },
            { wch: 20 }
        ]

        XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions')
    }

    // ===== SHEET 5: Promo Codes Analytics =====
    if (promoCodesData) {
        const promoCodesAnalyticsData = [
            ['PROMO CODES ANALYTICS'],
            [],
            ['OVERVIEW'],
            ['Metric', 'Value'],
            ['Total Promo Codes', promoCodesData.total_codes?.toString() || '0'],
            ['Active Codes', promoCodesData.active_codes?.toString() || '0'],
            ['Expired Codes', promoCodesData.expired_codes?.toString() || '0'],
            ['Scheduled Codes', promoCodesData.scheduled_codes?.toString() || '0'],
            ['Total Usage', promoCodesData.total_usage?.toString() || '0'],
            ['Total Discount Given', `EGP ${(promoCodesData.total_discount_given || 0).toFixed(2)}`],
            ['Revenue with Promo Codes', `EGP ${(promoCodesData.revenue_with_promo || 0).toFixed(2)}`],
            ['Orders with Promo Codes', promoCodesData.orders_with_promo?.toString() || '0'],
            [],
        ]

        // Add most used codes if available
        if (promoCodesData.most_used_codes && promoCodesData.most_used_codes.length > 0) {
            promoCodesAnalyticsData.push(
                ['MOST USED PROMO CODES'],
                ['Code', 'Type', 'Value', 'Times Used', 'Usage Limit'],
                ...promoCodesData.most_used_codes.map((code: any) => [
                    code.code,
                    code.type === 'percentage' ? 'Percentage' : 'Fixed Amount',
                    code.type === 'percentage' ? `${code.value}%` : `EGP ${code.value}`,
                    code.times_used?.toString() || '0',
                    code.usage_limit?.toString() || 'Unlimited'
                ])
            )
        }

        const promoCodesSheet = XLSX.utils.aoa_to_sheet(promoCodesAnalyticsData)
        promoCodesSheet['!cols'] = [
            { wch: 30 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ]

        XLSX.utils.book_append_sheet(workbook, promoCodesSheet, 'Promo Codes')
    }

    // Generate and download the file
    const fileName = `financial-dashboard-${dateFrom || 'last-30-days'}-to-${dateTo || 'today'}-${Date.now()}.xlsx`
    XLSX.writeFile(workbook, fileName)
}
