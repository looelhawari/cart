import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { financialService } from '@/services/financial.service'
import { promoCodeService } from '@/services/promo-code.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DollarSign, CreditCard, TrendingUp, Download, FileText, Tag } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { exportFinancialDashboardPDF } from '@/lib/pdf-export'
import { exportFinancialDashboardExcel } from '@/lib/excel-export'

export default function FinancialPage() {
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const { data: financialData, isLoading: isLoadingDashboard, error: dashboardError } = useQuery({
        queryKey: ['financial-dashboard', dateFrom, dateTo],
        queryFn: async () => {
            console.log('[Financial] Fetching dashboard data with params:', { dateFrom, dateTo })
            // Only pass non-empty values
            const result = await financialService.getDashboard(
                dateFrom || undefined,
                dateTo || undefined
            )
            console.log('[Financial] Dashboard API Response:', result)
            console.log('[Financial] Response type:', typeof result)
            console.log('[Financial] Response keys:', result ? Object.keys(result) : 'null')

            // Check if response is wrapped in a 'data' property
            if (result && typeof result === 'object' && 'data' in result) {
                console.log('[Financial] Response appears to be wrapped, extracting data property')
                return result.data as any
            }

            return result
        },
        refetchOnMount: true,
        staleTime: 0,
    })

    const { data: transactions, isLoading: isLoadingTransactions, error: transactionsError } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            console.log('[Financial] Fetching transactions')
            const result = await financialService.getTransactions({ per_page: 10 })
            console.log('[Financial] Transactions API Response:', result)

            // Check if response is wrapped in a 'data' property
            if (result && typeof result === 'object' && 'data' in result && !Array.isArray(result.data)) {
                console.log('[Financial] Transactions response appears to be wrapped')
                return result.data as any
            }

            return result
        },
        refetchOnMount: true,
        staleTime: 0,
    })

    const { data: promoCodesData } = useQuery({
        queryKey: ['promo-codes-analytics'],
        queryFn: async () => {
            const result = await promoCodeService.getAnalytics()
            return result
        },
        refetchOnMount: true,
        staleTime: 0,
    })

    // Debug logs
    console.log('[Financial] Financial Data:', financialData)
    console.log('[Financial] Total Revenue:', financialData?.total_revenue)
    console.log('[Financial] Cash Revenue:', financialData?.cash_revenue)
    console.log('[Financial] Online Revenue:', financialData?.online_revenue)
    console.log('[Financial] Transactions:', transactions)
    console.log('[Financial] Dashboard Error:', dashboardError)
    console.log('[Financial] Transactions Error:', transactionsError)

    // Calculate stats dynamically when data changes
    const stats = [
        {
            title: 'Total Revenue',
            value: formatCurrency(financialData?.total_revenue || 0),
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            title: 'Cash Revenue',
            value: formatCurrency(financialData?.cash_revenue || 0),
            icon: DollarSign,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            title: 'Online Revenue',
            value: formatCurrency(financialData?.online_revenue || 0),
            icon: CreditCard,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
        {
            title: 'Pending Payments',
            value: formatCurrency(financialData?.pending_payments || 0),
            icon: TrendingUp,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
    ]

    const COLORS = ['#2D5A3D', '#4A7C59', '#F4A259', '#E8B4A0']

    const handleExportExcel = () => {
        if (!financialData) {
            console.error('No financial data available')
            return
        }

        try {
            exportFinancialDashboardExcel(
                financialData,
                transactions?.data || [],
                promoCodesData,
                dateFrom,
                dateTo
            )
        } catch (error) {
            console.error('Excel export failed:', error)
        }
    }

    const handleExportPDF = () => {
        if (!financialData) {
            console.error('No financial data available')
            return
        }

        try {
            exportFinancialDashboardPDF(
                financialData,
                transactions?.data || [],
                promoCodesData,
                dateFrom,
                dateTo
            )
        } catch (error) {
            console.error('PDF export failed:', error)
        }
    }

    return (
        <div className="space-y-6">
            {(dashboardError || transactionsError) && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    <p className="font-semibold">Error loading financial data</p>
                    <p className="text-sm">{String(dashboardError || transactionsError)}</p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary">Financial Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Revenue tracking and financial analytics</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExportPDF} variant="outline" className="border-elbaraka-primary text-elbaraka-primary hover:bg-elbaraka-primary hover:text-white">
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                    </Button>
                    <Button onClick={handleExportExcel} className="bg-elbaraka-primary hover:bg-elbaraka-secondary">
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label className="text-sm font-medium">From Date</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm font-medium">To Date</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {isLoadingDashboard ? (
                    <div className="col-span-4 text-center py-8">Loading financial data...</div>
                ) : (
                    stats.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <Card key={stat.title}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                        <Icon className={`h-4 w-4 ${stat.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={financialData?.revenue_by_day || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#2D5A3D" name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={financialData?.revenue_by_payment_method || []}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.method}: ${formatCurrency(entry.amount)}`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="amount"
                                >
                                    {financialData?.revenue_by_payment_method?.map((_entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Promo Codes Analytics */}
            {promoCodesData && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="h-5 w-5" />
                                Promo Codes Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Total Codes</p>
                                    <p className="text-2xl font-bold">{promoCodesData.total_codes || 0}</p>
                                    <p className="text-xs text-green-600">{promoCodesData.active_codes || 0} active</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Total Usage</p>
                                    <p className="text-2xl font-bold">{promoCodesData.total_usage || 0}</p>
                                    <p className="text-xs text-muted-foreground">Times applied</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Total Discount Given</p>
                                    <p className="text-2xl font-bold text-red-600">{formatCurrency(promoCodesData.total_discount_given || 0)}</p>
                                    <p className="text-xs text-muted-foreground">Customer savings</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Revenue with Promo</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(promoCodesData.revenue_with_promo || 0)}</p>
                                    <p className="text-xs text-muted-foreground">{promoCodesData.orders_with_promo || 0} orders</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Most Used Promo Codes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {promoCodesData.most_used_codes?.length > 0 ? (
                                        promoCodesData.most_used_codes.map((code: any) => (
                                            <div key={code.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-semibold">{code.code}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {code.type === 'percentage' ? `${code.value}% off` : `${formatCurrency(code.value)} off`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-green-600">{code.times_used}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {code.usage_limit ? `of ${code.usage_limit}` : 'uses'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">No promo codes used yet</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Promo Codes by Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={promoCodesData.codes_by_type?.map((item: any) => ({
                                                name: item.type === 'percentage' ? 'Percentage' : 'Fixed Amount',
                                                value: item.count
                                            })) || []}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {promoCodesData.codes_by_type?.map((_entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Transaction ID</th>
                                    <th className="text-left p-3">Amount</th>
                                    <th className="text-left p-3">Payment Method</th>
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-left p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingTransactions ? (
                                    <tr>
                                        <td colSpan={5} className="p-3 text-center">Loading transactions...</td>
                                    </tr>
                                ) : transactions?.data && transactions.data.length > 0 ? (
                                    transactions.data.map((transaction: any) => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono text-sm">{transaction.paymob_transaction_id || transaction.id}</td>
                                            <td className="p-3 font-semibold">{formatCurrency(transaction.amount)}</td>
                                            <td className="p-3 text-sm">{transaction.payment_method.replace('_', ' ')}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${transaction.payment_status === 'paid'
                                                        ? 'bg-green-100 text-green-800'
                                                        : transaction.payment_status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : transaction.payment_status === 'failed'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {transaction.payment_status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm">{formatDate(transaction.transaction_date)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-3 text-center text-gray-500">No transactions found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
