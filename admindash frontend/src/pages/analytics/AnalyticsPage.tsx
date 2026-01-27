import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/services/analytics.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Package, Users, ShoppingCart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

export default function AnalyticsPage() {
    const { data: salesData } = useQuery({
        queryKey: ['analytics-sales'],
        queryFn: () => analyticsService.getSalesAnalytics(),
    })

    const { data: productData } = useQuery({
        queryKey: ['analytics-products'],
        queryFn: () => analyticsService.getProductPerformance(),
    })

    const { data: customerData } = useQuery({
        queryKey: ['analytics-customers'],
        queryFn: () => analyticsService.getCustomerAnalytics(),
    })

    const COLORS = ['#2D5A3D', '#4A7C59', '#F4A259', '#E8B4A0', '#8B9D77']

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-elbaraka-primary">Analytics & Reports</h1>
                <p className="text-muted-foreground mt-1">Comprehensive business insights and performance metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(salesData?.total_revenue || 0)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{salesData?.total_orders || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customerData?.total_customers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
                        <Package className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(salesData?.average_order_value || 0)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={salesData?.daily_sales || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#2D5A3D" strokeWidth={3} name="Revenue" />
                            <Line type="monotone" dataKey="orders" stroke="#F4A259" strokeWidth={2} name="Orders" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Products & Categories */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Selling Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={productData?.slice(0, 10) || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="quantity_sold" fill="#2D5A3D" name="Quantity Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={salesData?.top_categories || []}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => entry.name}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="revenue"
                                >
                                    {salesData?.top_categories?.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Product Performance Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Product</th>
                                    <th className="text-left p-3">Category</th>
                                    <th className="text-right p-3">Sold</th>
                                    <th className="text-right p-3">Revenue</th>
                                    <th className="text-right p-3">Profit</th>
                                    <th className="text-right p-3">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productData?.slice(0, 10).map((product) => (
                                    <tr key={product.barcode} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{product.name}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{product.category_name}</td>
                                        <td className="p-3 text-right">{product.quantity_sold}</td>
                                        <td className="p-3 text-right font-semibold">{formatCurrency(product.revenue)}</td>
                                        <td className="p-3 text-right text-green-600 font-semibold">
                                            {formatCurrency(product.profit)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <span
                                                className={product.stock_quantity < 10 ? 'text-red-600 font-medium' : ''}
                                            >
                                                {product.stock_quantity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Analytics */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {customerData?.top_customers?.slice(0, 5).map((customer, index) => (
                                <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-elbaraka-primary flex items-center justify-center text-white font-semibold">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {customer.first_name} {customer.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{customer.total_orders} orders</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatCurrency(customer.total_spent)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Customer Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">New Customers</span>
                            <span className="text-lg font-bold">{customerData?.new_customers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Returning Customers</span>
                            <span className="text-lg font-bold">{customerData?.returning_customers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Avg Order Value</span>
                            <span className="text-lg font-bold">
                                {formatCurrency(customerData?.average_order_value || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Customer Lifetime Value</span>
                            <span className="text-lg font-bold">
                                {formatCurrency(customerData?.customer_lifetime_value || 0)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
