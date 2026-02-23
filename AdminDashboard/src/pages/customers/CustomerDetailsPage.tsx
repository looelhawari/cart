import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user.service'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Ban, CheckCircle, Mail, Phone, MapPin, Calendar, AlertTriangle, Lock, Smartphone, Gift } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'


export default function CustomerDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const customerId = parseInt(id || '0')
    const [note, setNote] = useState('')
    const [noteVisible, setNoteVisible] = useState(false)

    const { data: customer, isLoading } = useQuery({
        queryKey: ['admin-customer', customerId],
        queryFn: () => userService.getCustomer(customerId),
        enabled: !!customerId
    })

    const { data: activityLogs } = useQuery({
        queryKey: ['admin-customer-activity', customerId],
        queryFn: () => userService.getActivityLog(customerId),
        enabled: !!customerId
    })

    const updateCustomerMutation = useMutation({
        mutationFn: (data: any) => userService.updateCustomer(customerId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] })
            toast({ title: "Customer profile updated successfully" })
        }
    })

    const addNoteMutation = useMutation({
        mutationFn: () => userService.addCustomerNote(customerId, { note, is_visible_to_customer: noteVisible }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] })
            setNote('')
            setNoteVisible(false)
            toast({ title: "Note added successfully" })
        }
    })

    const resetPasswordMutation = useMutation({
        mutationFn: () => {
            // In a real app this would likely open a dialog to input password. 
            // For now we'll simulate a random one or just default. 
            // Ideally we need a dialog here. Implementing simple confirms for MVP.
            const newPass = prompt("Enter new password for customer (min 8 chars):");
            if (!newPass || newPass.length < 8) return Promise.reject("Invalid password");
            return userService.resetCustomerPassword(customerId, { password: newPass, password_confirmation: newPass });
        },
        onSuccess: () => {
            toast({ title: "Password reset successfully. Customer logged out." })
        },
        onError: () => {
            toast({ title: "Failed to reset password", variant: "destructive" })
        }
    })

    if (isLoading) return <div className="p-8 text-center">{t('common.loading')}</div>
    if (!customer) return <div className="p-8 text-center">{t('common.notFound')}</div>

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
                        <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </Button>
                    <Avatar className="h-16 w-16 border-2 border-white shadow">
                        <AvatarImage src={customer.avatar || undefined} />
                        <AvatarFallback className="text-xl bg-elbaraka-primary text-white">
                            {customer.first_name?.[0]}{customer.last_name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {customer.first_name} {customer.last_name}
                            <Badge className={customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {customer.is_active ? t('customers.active') : t('customers.banned')}
                            </Badge>
                            {customer.is_vip && <Badge className="bg-purple-100 text-purple-800 border-purple-200">VIP</Badge>}
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" /> {customer.email}
                            <span className="mx-1">•</span>
                            <Phone className="h-3 w-3" /> {customer.phone}
                            {customer.registration_source && (
                                <>
                                    <span className="mx-1">•</span>
                                    <Smartphone className="h-3 w-3" /> {customer.registration_source}
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => updateCustomerMutation.mutate({ is_vip: !customer.is_vip })}>
                                {customer.is_vip ? 'Remove VIP Status' : 'Mark as VIP'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateCustomerMutation.mutate({ is_cod_restricted: !customer.is_cod_restricted })}>
                                {customer.is_cod_restricted ? 'Enable COD' : 'Disable COD'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resetPasswordMutation.mutate()}>
                                <Lock className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/promo-codes', { state: { user_id: customer.id } })}>
                                <Gift className="mr-2 h-4 w-4" /> Give Reward
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant={customer.is_active ? 'destructive' : 'default'}
                        onClick={() => {
                            if (confirm(customer.is_active ? t('customers.banConfirm') : t('customers.unbanConfirm'))) {
                                updateCustomerMutation.mutate({ is_active: !customer.is_active })
                            }
                        }}
                    >
                        {customer.is_active ? (
                            <>
                                <Ban className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('customers.ban')}
                            </>
                        ) : (
                            <>
                                <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('customers.unban')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Warning Flags */}
            {(customer.is_cod_restricted || !customer.is_active) && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3 text-red-800">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        <h4 className="font-bold">Customer Alerts</h4>
                        <ul className="list-disc list-inside text-sm">
                            {!customer.is_active && <li>Account is currently BANNED. User cannot login.</li>}
                            {customer.is_cod_restricted && <li>Cash on Delivery (COD) is RESTRICTED for this user.</li>}
                        </ul>
                    </div>
                </div>
            )}

            <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-[800px]">
                    <TabsTrigger value="info">{t('customers.details.info')}</TabsTrigger>
                    <TabsTrigger value="activity">{t('customers.details.activity')}</TabsTrigger>
                    <TabsTrigger value="orders">{t('customers.details.orders')}</TabsTrigger>
                    <TabsTrigger value="support">Support</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                {/* Tab: Info */}
                <TabsContent value="info" className="space-y-4 mt-4">
                    {/* Existing Info Layout */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('customers.details.info')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <span className="text-muted-foreground">{t('common.date')}:</span>
                                    <span className="col-span-2 font-medium">{formatDate(customer.created_at)}</span>

                                    <span className="text-muted-foreground">ID:</span>
                                    <span className="col-span-2">{customer.id}</span>

                                    <span className="text-muted-foreground">{t('common.status')}:</span>
                                    <span className="col-span-2">
                                        {customer.email_verified_at ? <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified</span> : 'Unverified'}
                                    </span>

                                    <span className="text-muted-foreground">Loyalty Points:</span>
                                    <span className="col-span-2 font-medium text-orange-600">{customer.loyalty_points || 0} pts</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Addresses ({customer.addresses?.length || 0})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {customer.addresses && customer.addresses.length > 0 ? (
                                    <ul className="space-y-2">
                                        {customer.addresses.map((addr: any) => (
                                            <li key={addr.id} className="text-sm border-b pb-2 last:border-0 flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <span>
                                                    {addr.street}, {addr.building}, {addr.city}
                                                    {addr.is_default && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No addresses found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab: Analytics */}
                <TabsContent value="analytics" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Lifetime Value</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(customer.analytics?.ltv || 0)}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Order Value</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(customer.analytics?.avg_order_value || 0)}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{customer.analytics?.total_orders || 0}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cancel Rate</CardTitle></CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${(customer.analytics?.cancel_rate || 0) > 20 ? 'text-red-600' : 'text-green-600'}`}>
                                    {customer.analytics?.cancel_rate || 0}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab: Notes */}
                <TabsContent value="notes" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Internal Notes</CardTitle>
                            <CardDescription>Private notes for staff. Not visible to customer unless checked.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2 items-start">
                                <div className="grid w-full gap-2">
                                    <Textarea placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} />
                                    <div className="flex items-center space-x-2">
                                        <Switch id="visible" checked={noteVisible} onCheckedChange={setNoteVisible} />
                                        <Label htmlFor="visible">Visible to Customer?</Label>
                                    </div>
                                </div>
                                <Button onClick={() => addNoteMutation.mutate()} disabled={!note}>Add</Button>
                            </div>

                            <div className="space-y-4 mt-6">
                                {customer.notes?.map((n: any) => (
                                    <div key={n.id} className="bg-gray-50 p-4 rounded-lg text-sm border">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-semibold">{n.author?.first_name || 'Staff'}</span>
                                            <span className="text-muted-foreground text-xs">{formatDate(n.created_at)}</span>
                                        </div>
                                        <p>{n.note}</p>
                                        {n.is_visible_to_customer && (
                                            <Badge variant="outline" className="mt-2 text-[10px]">Visible to User</Badge>
                                        )}
                                    </div>
                                ))}
                                {!customer.notes?.length && <p className="text-muted-foreground text-center py-4">No notes yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Activity */}
                <TabsContent value="activity" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('customers.details.activity')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activityLogs?.data.map((log) => (
                                    <div key={log.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                                        <div className="bg-gray-100 p-2 rounded-full">
                                            <Calendar className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{log.description}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Orders */}
                <TabsContent value="orders" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="p-3">Order #</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Total</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customer.orders?.map((order: any) => (
                                            <tr key={order.id} className="border-b">
                                                <td className="p-3 font-medium">{order.order_number}</td>
                                                <td className="p-3">{formatDate(order.created_at)}</td>
                                                <td className="p-3">{formatCurrency(order.total || order.total_amount)}</td>
                                                <td className="p-3"><Badge variant="outline">{order.status}</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Support */}
                <TabsContent value="support" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Support Tickets & QA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {customer.complaints?.map((ticket: any) => (
                                    <div key={ticket.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-sm flex items-center gap-2">
                                                    #{ticket.ticket_number} - {ticket.subject}
                                                    <Badge>{ticket.status}</Badge>
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">{formatDate(ticket.created_at)}</p>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => navigate(`/support/${ticket.id}`)}>
                                                View
                                            </Button>
                                        </div>
                                        <p className="text-sm bg-gray-50 p-2 rounded">{ticket.description}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
