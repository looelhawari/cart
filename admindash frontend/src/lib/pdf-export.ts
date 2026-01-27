import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FinancialDashboard } from '@/services/financial.service'
import type { Transaction } from '@/types'

// Helper to format currency
const formatCurrency = (value: number) => {
    return `EGP ${(value || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Helper to draw a stat card
const drawStatCard = (
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    value: string,
    colorHex: string
) => {
    // Parse color
    const r = parseInt(colorHex.slice(1, 3), 16)
    const g = parseInt(colorHex.slice(3, 5), 16)
    const b = parseInt(colorHex.slice(5, 7), 16)

    // Card background
    doc.setFillColor(250, 250, 250)
    doc.setDrawColor(230, 230, 230)
    doc.roundedRect(x, y, width, height, 2, 2, 'FD')

    // Color accent bar on left
    doc.setFillColor(r, g, b)
    doc.rect(x, y, 3, height, 'F')

    // Title
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(title, x + 6, y + 8)

    // Value
    doc.setFontSize(10)
    doc.setTextColor(r, g, b)
    doc.text(value, x + 6, y + 18)
}

// Helper to draw a simple horizontal bar chart
const drawHorizontalBarChart = (
    doc: jsPDF,
    data: { label: string; value: number }[],
    x: number,
    y: number,
    width: number,
    title: string
) => {
    const maxValue = Math.max(...data.map(d => d.value), 1)
    const barHeight = 8
    const gap = 4

    // Title
    doc.setFontSize(10)
    doc.setTextColor(45, 90, 61)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x, y)
    doc.setFont('helvetica', 'normal')

    data.forEach((item, index) => {
        const barY = y + 8 + index * (barHeight + gap)
        const barWidth = (item.value / maxValue) * (width - 50)

        // Label
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        doc.text(item.label, x, barY + 5)

        // Bar background
        doc.setFillColor(230, 230, 230)
        doc.roundedRect(x + 40, barY, width - 50, barHeight, 1, 1, 'F')

        // Bar fill
        doc.setFillColor(45, 90, 61)
        if (barWidth > 0) {
            doc.roundedRect(x + 40, barY, barWidth, barHeight, 1, 1, 'F')
        }

        // Value
        doc.setFontSize(7)
        doc.setTextColor(45, 90, 61)
        doc.text(formatCurrency(item.value), x + 40 + barWidth + 3, barY + 5)
    })
}

export const exportFinancialDashboardPDF = (
    financialData: FinancialDashboard,
    transactions: Transaction[],
    promoCodesData?: any,
    dateFrom?: string,
    dateTo?: string
) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ===== PAGE 1: HEADER WITH COMPANY BRANDING =====
    // Header background gradient effect
    doc.setFillColor(45, 90, 61)
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Company name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('El Baraka', 14, 20)

    // Report subtitle
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Financial Dashboard Report', 14, 32)

    // Date range in header
    doc.setFillColor(74, 124, 89)
    doc.roundedRect(pageWidth - 75, 10, 65, 22, 3, 3, 'F')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('Report Period', pageWidth - 72, 18)
    doc.setFontSize(8)
    doc.text(`${dateFrom || 'Last 30 days'} - ${dateTo || 'Today'}`, pageWidth - 72, 26)

    // Generation timestamp
    doc.setTextColor(200, 200, 200)
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`, pageWidth - 14, 38, { align: 'right' })

    // ===== KEY METRICS CARDS =====
    const cardY = 50
    const cardWidth = 44
    const cardHeight = 24
    const cardGap = 3

    drawStatCard(doc, 14, cardY, cardWidth, cardHeight, 'Total Revenue', formatCurrency(financialData.total_revenue), '#27ae60')
    drawStatCard(doc, 14 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 'Cash Revenue', formatCurrency(financialData.cash_revenue), '#3498db')
    drawStatCard(doc, 14 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 'Online Revenue', formatCurrency(financialData.online_revenue), '#9b59b6')
    drawStatCard(doc, 14 + (cardWidth + cardGap) * 3, cardY, cardWidth, cardHeight, 'Pending', formatCurrency(financialData.pending_payments), '#f39c12')

    // ===== FINANCIAL SUMMARY TABLE =====
    doc.setTextColor(45, 90, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Financial Summary', 14, 85)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
        startY: 90,
        head: [['Metric', 'Value']],
        body: [
            ['Total Revenue', formatCurrency(financialData.total_revenue)],
            ['Cash Revenue (COD)', formatCurrency(financialData.cash_revenue)],
            ['Online Revenue (Card/Wallet)', formatCurrency(financialData.online_revenue)],
            ['Pending Payments', formatCurrency(financialData.pending_payments)],
            ['Refunded Amount', formatCurrency(financialData.refunded_amount)],
        ],
        theme: 'striped',
        headStyles: {
            fillColor: [45, 90, 61],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: pageWidth / 2 + 5 }
    })

    // Order Statistics (side by side)
    autoTable(doc, {
        startY: 90,
        head: [['Order Status', 'Count']],
        body: [
            ['Total Orders', financialData.total_orders.toString()],
            ['Paid / Completed', financialData.paid_orders.toString()],
            ['Pending Payment', financialData.pending_orders.toString()],
            ['Failed Orders', financialData.failed_orders.toString()],
        ],
        theme: 'striped',
        headStyles: {
            fillColor: [74, 124, 89],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: pageWidth / 2 + 5, right: 14 }
    })

    // ===== REVENUE BY PAYMENT METHOD =====
    const paymentY = 160
    doc.setTextColor(45, 90, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Revenue by Payment Method', 14, paymentY)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
        startY: paymentY + 5,
        head: [['Payment Method', 'Revenue (EGP)', 'Orders', '% of Total']],
        body: financialData.revenue_by_payment_method.map(item => {
            const percentage = financialData.total_revenue > 0
                ? ((item.amount / financialData.total_revenue) * 100).toFixed(1) + '%'
                : '0%'
            return [
                item.method.replace('_', ' ').toUpperCase(),
                formatCurrency(item.amount),
                item.count.toString(),
                percentage
            ]
        }),
        theme: 'striped',
        headStyles: {
            fillColor: [45, 90, 61],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'center' },
            3: { halign: 'center' }
        },
        margin: { left: 14, right: 14 }
    })

    // ===== DAILY REVENUE CHART =====
    if (financialData.revenue_by_day && financialData.revenue_by_day.length > 0) {
        const chartY = (doc as any).lastAutoTable.finalY + 15
        const revenueData = financialData.revenue_by_day.slice(-5).map(item => ({
            label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: item.revenue
        }))
        drawHorizontalBarChart(doc, revenueData, 14, chartY, 180, 'Daily Revenue (Last 5 Days)')
    }

    // ===== PAGE 2: TRANSACTIONS =====
    if (transactions && transactions.length > 0) {
        doc.addPage()

        // Page header
        doc.setFillColor(45, 90, 61)
        doc.rect(0, 0, pageWidth, 28, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Recent Transactions', 14, 18)
        doc.setFont('helvetica', 'normal')

        autoTable(doc, {
            startY: 38,
            head: [['Transaction ID', 'Amount', 'Method', 'Status', 'Date']],
            body: transactions.slice(0, 20).map(t => [
                t.paymob_transaction_id || t.id?.toString() || '-',
                formatCurrency(t.amount || 0),
                (t.payment_method || '-').replace('_', ' '),
                t.payment_status || '-',
                t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }) : '-'
            ]),
            theme: 'striped',
            headStyles: {
                fillColor: [45, 90, 61],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 248, 245] },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 35, halign: 'right' },
                2: { cellWidth: 35 },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 35 }
            },
            margin: { left: 14, right: 14 }
        })
    }

    // ===== PAGE 3: PROMO CODES ANALYTICS =====
    if (promoCodesData) {
        doc.addPage()

        // Page header
        doc.setFillColor(45, 90, 61)
        doc.rect(0, 0, pageWidth, 28, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Promo Codes Analytics', 14, 18)
        doc.setFont('helvetica', 'normal')

        // Stats cards
        const promoCardY = 38
        drawStatCard(doc, 14, promoCardY, 44, 22, 'Total Codes', (promoCodesData.total_codes || 0).toString(), '#3498db')
        drawStatCard(doc, 61, promoCardY, 44, 22, 'Active', (promoCodesData.active_codes || 0).toString(), '#27ae60')
        drawStatCard(doc, 108, promoCardY, 44, 22, 'Usage', (promoCodesData.total_usage || 0).toString(), '#9b59b6')
        drawStatCard(doc, 155, promoCardY, 44, 22, 'Discounts', formatCurrency(promoCodesData.total_discount_given || 0), '#e74c3c')

        // Overview Table
        doc.setTextColor(45, 90, 61)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Promo Codes Overview', 14, 75)
        doc.setFont('helvetica', 'normal')

        autoTable(doc, {
            startY: 80,
            head: [['Metric', 'Value']],
            body: [
                ['Total Promo Codes', (promoCodesData.total_codes || 0).toString()],
                ['Active Codes', (promoCodesData.active_codes || 0).toString()],
                ['Expired Codes', (promoCodesData.expired_codes || 0).toString()],
                ['Scheduled Codes', (promoCodesData.scheduled_codes || 0).toString()],
                ['Total Times Used', (promoCodesData.total_usage || 0).toString()],
                ['Total Discount Given', formatCurrency(promoCodesData.total_discount_given || 0)],
                ['Revenue with Promo Codes', formatCurrency(promoCodesData.revenue_with_promo || 0)],
                ['Orders with Promo Codes', (promoCodesData.orders_with_promo || 0).toString()],
            ],
            theme: 'striped',
            headStyles: {
                fillColor: [45, 90, 61],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 248, 245] },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: pageWidth / 2 + 5 }
        })

        // Most Used Codes Table
        if (promoCodesData.most_used_codes && promoCodesData.most_used_codes.length > 0) {
            doc.setTextColor(45, 90, 61)
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('Top Performing Promo Codes', pageWidth / 2 + 5, 75)
            doc.setFont('helvetica', 'normal')

            autoTable(doc, {
                startY: 80,
                head: [['Code', 'Type', 'Value', 'Used']],
                body: promoCodesData.most_used_codes.map((code: any) => [
                    code.code || '-',
                    code.type === 'percentage' ? '%' : 'EGP',
                    code.type === 'percentage' ? `${code.value}%` : formatCurrency(code.value || 0),
                    (code.times_used || 0).toString()
                ]),
                theme: 'striped',
                headStyles: {
                    fillColor: [74, 124, 89],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [245, 248, 245] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    2: { halign: 'right' },
                    3: { halign: 'center' }
                },
                margin: { left: pageWidth / 2 + 5, right: 14 }
            })
        }
    }

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Footer line
        doc.setDrawColor(45, 90, 61)
        doc.setLineWidth(0.5)
        doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18)

        // Footer text
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('El Baraka - Confidential Financial Report', 14, pageHeight - 10)
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
    }

    // Save the PDF
    const fileName = `ElBaraka-Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
}

// ===== DASHBOARD PDF EXPORT =====
interface DashboardData {
    totalRevenue: number
    totalOrders: number
    avgOrderValue: number
    uniqueCustomers: number
    completionRate: number
    cancellationRate: number
    avgItemsPerOrder: number
    summary: {
        pending_count?: number
        confirmed_count?: number
        preparing_count?: number
        out_for_delivery_count?: number
        delivered_count?: number
        cancelled_count?: number
    }
    statusData: { name: string; value: number; color: string }[]
    last7Days: { date: string; orders: number; revenue: number }[]
    paymentMethods: { name: string; value: number; color: string }[]
    revenueByStatus: { status: string; revenue: number; color: string }[]
    topProducts: { name: string; revenue: number; quantity: number }[]
    stockHealth: { name: string; current: number; threshold: number }[]
    promotionsData?: {
        active_promotions?: number
        total_promotions?: number
        scheduled_promotions?: number
        products_on_sale?: number
        total_discount_given?: number
        featured_promotion?: { title: string; discount_value: number; discount_type: string }
    }
}

export const exportDashboardPDF = (dashboardData: DashboardData) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ===== PAGE 1: HEADER WITH COMPANY BRANDING =====
    doc.setFillColor(45, 90, 61)
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Company name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('El Baraka', 14, 20)

    // Report subtitle
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Analytics Dashboard Report', 14, 32)

    // Date in header
    doc.setFillColor(74, 124, 89)
    doc.roundedRect(pageWidth - 60, 10, 50, 22, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('Generated', pageWidth - 57, 18)
    doc.setFontSize(9)
    doc.text(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - 57, 26)

    // ===== KEY METRICS ROW 1 =====
    const cardY = 50
    const cardWidth = 44
    const cardHeight = 24
    const cardGap = 3

    drawStatCard(doc, 14, cardY, cardWidth, cardHeight, 'Total Revenue', formatCurrency(dashboardData.totalRevenue), '#27ae60')
    drawStatCard(doc, 14 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 'Total Orders', dashboardData.totalOrders.toString(), '#3498db')
    drawStatCard(doc, 14 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 'Avg Order', formatCurrency(dashboardData.avgOrderValue), '#9b59b6')
    drawStatCard(doc, 14 + (cardWidth + cardGap) * 3, cardY, cardWidth, cardHeight, 'Customers', dashboardData.uniqueCustomers.toString(), '#f39c12')

    // ===== KEY METRICS ROW 2 =====
    const cardY2 = 78
    drawStatCard(doc, 14, cardY2, cardWidth, cardHeight, 'Completion', `${dashboardData.completionRate.toFixed(1)}%`, '#27ae60')
    drawStatCard(doc, 14 + cardWidth + cardGap, cardY2, cardWidth, cardHeight, 'Cancellation', `${dashboardData.cancellationRate.toFixed(1)}%`, '#e74c3c')
    drawStatCard(doc, 14 + (cardWidth + cardGap) * 2, cardY2, cardWidth, cardHeight, 'Items/Order', dashboardData.avgItemsPerOrder.toFixed(1), '#3498db')

    // Promotions card if available
    if (dashboardData.promotionsData) {
        drawStatCard(doc, 14 + (cardWidth + cardGap) * 3, cardY2, cardWidth, cardHeight, 'Active Promos', (dashboardData.promotionsData.active_promotions || 0).toString(), '#e91e63')
    }

    // ===== ORDER STATUS DISTRIBUTION =====
    const statusY = 112
    doc.setTextColor(45, 90, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Order Status Distribution', 14, statusY)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
        startY: statusY + 4,
        head: [['Status', 'Count', 'Percentage']],
        body: dashboardData.statusData.map(item => {
            const total = dashboardData.totalOrders || 1
            return [
                item.name,
                item.value.toString(),
                `${((item.value / total) * 100).toFixed(1)}%`
            ]
        }),
        theme: 'striped',
        headStyles: { fillColor: [45, 90, 61], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 14, right: pageWidth / 2 + 10 }
    })

    // ===== PAYMENT METHODS =====
    doc.setTextColor(45, 90, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Methods', pageWidth / 2 + 5, statusY)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
        startY: statusY + 4,
        head: [['Method', 'Orders', '%']],
        body: dashboardData.paymentMethods.map(item => {
            const total = dashboardData.paymentMethods.reduce((s, p) => s + p.value, 0) || 1
            return [
                item.name,
                item.value.toString(),
                `${((item.value / total) * 100).toFixed(1)}%`
            ]
        }),
        theme: 'striped',
        headStyles: { fillColor: [74, 124, 89], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: pageWidth / 2 + 5, right: 14 }
    })

    // ===== 7-DAY TREND =====
    const trendY = (doc as any).lastAutoTable?.finalY + 15 || 175
    doc.setTextColor(45, 90, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('7-Day Performance Trend', 14, trendY)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
        startY: trendY + 4,
        head: [['Date', 'Orders', 'Revenue']],
        body: dashboardData.last7Days.map(day => [
            day.date,
            day.orders.toString(),
            formatCurrency(day.revenue)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [45, 90, 61], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 14, right: pageWidth / 2 + 10 }
    })

    // ===== REVENUE BY STATUS =====
    doc.setTextColor(45, 90, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Revenue by Payment Status', pageWidth / 2 + 5, trendY)
    doc.setFont('helvetica', 'normal')

    const totalStatusRevenue = dashboardData.revenueByStatus.reduce((s, r) => s + r.revenue, 0) || 1
    autoTable(doc, {
        startY: trendY + 4,
        head: [['Status', 'Revenue', '%']],
        body: dashboardData.revenueByStatus.map(item => [
            item.status,
            formatCurrency(item.revenue),
            `${((item.revenue / totalStatusRevenue) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [74, 124, 89], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: pageWidth / 2 + 5, right: 14 }
    })

    // ===== PAGE 2: PRODUCTS & STOCK =====
    doc.addPage()

    // Page header
    doc.setFillColor(45, 90, 61)
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Product Performance & Inventory', 14, 18)
    doc.setFont('helvetica', 'normal')

    // Top Products
    if (dashboardData.topProducts.length > 0) {
        doc.setTextColor(45, 90, 61)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Top Selling Products', 14, 40)
        doc.setFont('helvetica', 'normal')

        autoTable(doc, {
            startY: 45,
            head: [['Product', 'Qty Sold', 'Revenue']],
            body: dashboardData.topProducts.map(p => [
                p.name,
                p.quantity.toString(),
                formatCurrency(p.revenue)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [45, 90, 61], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 248, 245] },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 35, halign: 'right' }
            },
            margin: { left: 14, right: pageWidth / 2 + 10 }
        })
    }

    // Stock Health
    if (dashboardData.stockHealth.length > 0) {
        doc.setTextColor(45, 90, 61)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Stock Levels', pageWidth / 2 + 5, 40)
        doc.setFont('helvetica', 'normal')

        autoTable(doc, {
            startY: 45,
            head: [['Product', 'Stock', 'Threshold', 'Status']],
            body: dashboardData.stockHealth.map(p => {
                const status = p.current <= p.threshold ? 'LOW' : 'OK'
                return [
                    p.name,
                    p.current.toString(),
                    p.threshold.toString(),
                    status
                ]
            }),
            theme: 'striped',
            headStyles: { fillColor: [74, 124, 89], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 248, 245] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 15, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' }
            },
            didParseCell: function (data: any) {
                if (data.column.index === 3 && data.section === 'body') {
                    if (data.cell.raw === 'LOW') {
                        data.cell.styles.textColor = [231, 76, 60]
                        data.cell.styles.fontStyle = 'bold'
                    } else {
                        data.cell.styles.textColor = [39, 174, 96]
                    }
                }
            },
            margin: { left: pageWidth / 2 + 5, right: 14 }
        })
    }

    // ===== PROMOTIONS SECTION =====
    if (dashboardData.promotionsData) {
        const promoY = (doc as any).lastAutoTable?.finalY + 20 || 140
        doc.setTextColor(45, 90, 61)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Promotions Overview', 14, promoY)
        doc.setFont('helvetica', 'normal')

        autoTable(doc, {
            startY: promoY + 5,
            head: [['Metric', 'Value']],
            body: [
                ['Total Promotions', (dashboardData.promotionsData.total_promotions || 0).toString()],
                ['Active Promotions', (dashboardData.promotionsData.active_promotions || 0).toString()],
                ['Scheduled Promotions', (dashboardData.promotionsData.scheduled_promotions || 0).toString()],
                ['Products on Sale', (dashboardData.promotionsData.products_on_sale || 0).toString()],
                ['Total Discount Value', formatCurrency(dashboardData.promotionsData.total_discount_given || 0)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [233, 30, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [252, 228, 236] },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: pageWidth / 2 + 10 }
        })

        // Featured promotion
        if (dashboardData.promotionsData.featured_promotion) {
            const fp = dashboardData.promotionsData.featured_promotion
            doc.setTextColor(45, 90, 61)
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('Featured Promotion', pageWidth / 2 + 5, promoY)
            doc.setFont('helvetica', 'normal')

            doc.setFillColor(252, 228, 236)
            doc.roundedRect(pageWidth / 2 + 5, promoY + 5, 80, 30, 3, 3, 'F')

            doc.setFontSize(10)
            doc.setTextColor(233, 30, 99)
            doc.setFont('helvetica', 'bold')
            doc.text(fp.title || 'No Title', pageWidth / 2 + 10, promoY + 16)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.text(
                `${fp.discount_value}${fp.discount_type === 'percentage' ? '%' : ' EGP'} OFF`,
                pageWidth / 2 + 10,
                promoY + 26
            )
        }
    }

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Footer line
        doc.setDrawColor(45, 90, 61)
        doc.setLineWidth(0.5)
        doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18)

        // Footer text
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('El Baraka - Analytics Dashboard Report', 14, pageHeight - 10)
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
    }

    // Save the PDF
    const fileName = `ElBaraka-Dashboard-Report-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
}
