import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user.service'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { Search, Filter, MoreHorizontal, Eye, Ban, CheckCircle, Download, UserPlus, Gift } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { User } from '@/types'

export default function CustomersPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const navigate = useNavigate()
    const [page] = useState(1)
    const [search, setSearch] = useState('')
    const [segment, setSegment] = useState<string>('')
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data: stats } = useQuery({
        queryKey: ['admin-customers-stats'],
        queryFn: userService.getCustomerStats
    })

    const { data: customersData, isLoading } = useQuery({
        queryKey: ['admin-customers', page, search, segment],
        queryFn: () => userService.getCustomers({ page, search, segment, per_page: 20 }),
    })

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
            userService.updateCustomer(id, { is_active }),
        onSuccess: (data: User) => {
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
            queryClient.invalidateQueries({ queryKey: ['admin-customers-stats'] })
            toast({
                title: data.is_active
                    ? t('customers.success.unban')
                    : t('customers.success.ban')
            })
        }
    })

    const getCityFromAddress = (user: User) => {
        if (user.default_address?.city) return user.default_address.city;
        if (user.addresses && user.addresses.length > 0) return user.addresses[0].city;
        return '-';
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('customers.title')}</h1>
                    <p className="text-muted-foreground">{t('customers.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('customers.exportReport')}
                    </Button>
                    {/* Placeholder for future "Manual Order" feature */}
                    <Button variant="default">
                        <UserPlus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        New Customer
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('customers.total')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats?.vip_customers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('customers.active')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.active_customers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('customers.banned')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats?.banned_customers || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className={`absolute ${isRTL ? 'right-2.5' : 'left-2.5'} top-2.5 h-4 w-4 text-muted-foreground`} />
                    <Input
                        placeholder={t('common.search')}
                        className={isRTL ? 'pr-8' : 'pl-8'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={segment === 'vip' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSegment(segment === 'vip' ? '' : 'vip')}
                    >
                        VIP
                    </Button>
                    <Button
                        variant={segment === 'inactive_30d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSegment(segment === 'inactive_30d' ? '' : 'inactive_30d')}
                    >
                        Inactive
                    </Button>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('customers.name')}</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('customers.contact')}</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>City</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>Reg. Date</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('customers.orders')}</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('customers.spent')}</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('customers.status')}</TableHead>
                            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('customers.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24">{t('common.loading')}</TableCell>
                            </TableRow>
                        ) : customersData?.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24">{t('common.noData')}</TableCell>
                            </TableRow>
                        ) : (
                            customersData?.data.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={customer.avatar || undefined} />
                                                <AvatarFallback>{customer.first_name?.[0]}{customer.last_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium flex items-center gap-1">
                                                    {customer.first_name} {customer.last_name}
                                                    {customer.is_vip && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-purple-100 text-purple-700">VIP</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground capitalize">{customer.role.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{customer.email}</span>
                                            <span className="text-muted-foreground">{customer.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {getCityFromAddress(customer)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(customer.created_at)}
                                    </TableCell>
                                    <TableCell>{customer.orders_count || 0}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(customer.orders_sum_total || 0)}</TableCell>
                                    <TableCell>
                                        <Badge variant={customer.is_active ? 'outline' : 'destructive'} className={customer.is_active ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                            {customer.is_active ? t('customers.active') : t('customers.banned')}
                                        </Badge>
                                        {customer.is_cod_restricted && (
                                            <Badge variant="outline" className="ml-1 bg-orange-50 text-orange-700 border-orange-200 text-[10px]">No COD</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link to={`/customers/${customer.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        if (confirm(customer.is_active ? t('customers.banConfirm') : t('customers.unbanConfirm'))) {
                                                            toggleStatusMutation.mutate({ id: customer.id, is_active: !customer.is_active })
                                                        }
                                                    }}>
                                                        {customer.is_active ? (
                                                            <><Ban className="mr-2 h-4 w-4" /> {t('customers.ban')}</>
                                                        ) : (
                                                            <><CheckCircle className="mr-2 h-4 w-4" /> {t('customers.unban')}</>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate('/promo-codes', { state: { user_id: customer.id } })}>
                                                        <Gift className="mr-2 h-4 w-4" /> Give Reward
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination would go here */}
        </div>
    )
}
