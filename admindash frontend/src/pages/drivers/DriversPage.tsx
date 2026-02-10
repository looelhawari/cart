import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
    driverService,
    Driver,
    CreateDriverData,
    UpdateDriverData,
} from '@/services/driver.service'
import { deliveryZoneService } from '@/services/delivery-zone.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
    Truck,
    Plus,
    Search,
    MapPin,
    Phone,
    Star,
    Package,
    Edit,
    Trash2,
    Navigation,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    BarChart3,
} from 'lucide-react'

// ── Main Page Component ────────────────────────────────────────────────────

export default function DriversPage() {
    const { t } = useTranslation()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [search, setSearch] = useState('')
    const [filterZone, setFilterZone] = useState<string>('all')
    const [filterAvail, setFilterAvail] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
    const [showPerformance, setShowPerformance] = useState(false)
    const [showLocations, setShowLocations] = useState(false)

    // Queries
    const { data: driversData, isLoading } = useQuery({
        queryKey: ['drivers', search, filterZone, filterAvail, page],
        queryFn: () =>
            driverService.getDrivers({
                search: search || undefined,
                zone_id: filterZone !== 'all' ? Number(filterZone) : undefined,
                is_available: filterAvail !== 'all' ? filterAvail === 'true' : undefined,
                page,
                per_page: 15,
            }),
    })

    const { data: zones } = useQuery({
        queryKey: ['delivery-zones-list'],
        queryFn: () => deliveryZoneService.getZones(),
    })

    const { data: performanceData } = useQuery({
        queryKey: ['driver-performance'],
        queryFn: () => driverService.getDriverPerformance(),
        enabled: showPerformance,
    })

    const { data: locationData } = useQuery({
        queryKey: ['driver-locations'],
        queryFn: () => driverService.getDriverLocations(),
        enabled: showLocations,
        refetchInterval: showLocations ? 10000 : false,
    })

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: CreateDriverData) => driverService.createDriver(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
            setShowForm(false)
            toast({ title: 'Driver created successfully' })
        },
        onError: (err: any) => {
            toast({
                title: 'Failed to create driver',
                description: err.response?.data?.message || 'Unknown error',
                variant: 'destructive',
            })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDriverData }) =>
            driverService.updateDriver(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
            setEditingDriver(null)
            setShowForm(false)
            toast({ title: 'Driver updated successfully' })
        },
        onError: (err: any) => {
            toast({
                title: 'Failed to update driver',
                description: err.response?.data?.message || 'Unknown error',
                variant: 'destructive',
            })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => driverService.deleteDriver(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
            toast({ title: 'Driver removed successfully' })
        },
        onError: (err: any) => {
            toast({
                title: 'Failed to delete driver',
                description: err.response?.data?.message || 'Unknown error',
                variant: 'destructive',
            })
        },
    })

    const drivers = driversData?.data || []
    const totalPages = driversData?.last_page || 1

    const handleDelete = (driver: Driver) => {
        if (window.confirm(`Remove ${driver.first_name} ${driver.last_name} as a driver? This won't delete the user account.`)) {
            deleteMutation.mutate(driver.id)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-green-700">Driver Management</h1>
                    <p className="text-muted-foreground mt-1">Manage delivery drivers, assignments, and performance</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLocations(!showLocations)}
                    >
                        <Navigation className="h-4 w-4 mr-2" />
                        {showLocations ? 'Hide Locations' : 'Live Locations'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPerformance(!showPerformance)}
                    >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {showPerformance ? 'Hide Stats' : 'Performance'}
                    </Button>
                    <Button onClick={() => { setEditingDriver(null); setShowForm(true) }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Driver
                    </Button>
                </div>
            </div>

            {/* Live Locations Panel */}
            {showLocations && locationData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Navigation className="h-5 w-5 mr-2 text-blue-500" />
                            Live Driver Locations
                            <span className="ml-2 text-sm font-normal text-muted-foreground">(auto-refreshes every 10s)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {locationData.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No drivers currently sharing location</p>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {locationData.map((loc) => (
                                    <div key={loc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                        <div className={`w-3 h-3 rounded-full ${loc.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{loc.first_name} {loc.last_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {loc.current_lat.toFixed(4)}, {loc.current_lng.toFixed(4)}
                                            </p>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {loc.location_updated_at
                                                ? new Date(loc.location_updated_at).toLocaleTimeString()
                                                : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Performance Panel */}
            {showPerformance && performanceData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                            Driver Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {performanceData.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No performance data available</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Driver</TableHead>
                                        <TableHead className="text-right">Total Orders</TableHead>
                                        <TableHead className="text-right">Delivered</TableHead>
                                        <TableHead className="text-right">Avg Time (min)</TableHead>
                                        <TableHead className="text-right">Rating</TableHead>
                                        <TableHead className="text-center">Available</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performanceData.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                                            <TableCell className="text-right">{p.total_orders}</TableCell>
                                            <TableCell className="text-right">{p.delivered_orders}</TableCell>
                                            <TableCell className="text-right">
                                                {p.avg_delivery_minutes ? `${Math.round(p.avg_delivery_minutes)}` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {p.average_rating ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                        {p.average_rating.toFixed(1)}
                                                    </span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {p.is_available
                                                    ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                                    : <XCircle className="h-4 w-4 text-gray-400 mx-auto" />
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or phone..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setPage(1) }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Zones" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Zones</SelectItem>
                                {(zones as any)?.data?.map((z: any) => (
                                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                )) || (Array.isArray(zones) && zones.map((z: any) => (
                                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                )))}
                            </SelectContent>
                        </Select>
                        <Select value={filterAvail} onValueChange={(v) => { setFilterAvail(v); setPage(1) }}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Availability" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="true">Available</SelectItem>
                                <SelectItem value="false">Unavailable</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Drivers Table */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading drivers...</div>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-12">
                            <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">No drivers found</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Zone</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Deliveries</TableHead>
                                        <TableHead className="text-right">Rating</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drivers.map((driver) => (
                                        <TableRow key={driver.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{driver.first_name} {driver.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{driver.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Phone className="h-3 w-3" />
                                                    {driver.phone}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {driver.vehicle_type ? (
                                                    <div className="text-sm">
                                                        <p>{driver.vehicle_type}</p>
                                                        {driver.vehicle_plate && (
                                                            <p className="text-xs text-muted-foreground">{driver.vehicle_plate}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Not set</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {driver.zone ? (
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        <MapPin className="h-3 w-3" />
                                                        {driver.zone.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {driver.is_available ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="h-3 w-3" /> Online
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        <XCircle className="h-3 w-3" /> Offline
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <Package className="h-3 w-3" />
                                                    {driver.total_deliveries || driver.driver_orders_count || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {driver.average_rating ? (
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                        {driver.average_rating.toFixed(1)}
                                                    </span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditingDriver(driver); setShowForm(true) }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(driver)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Page {page} of {totalPages} · {driversData?.total || 0} drivers
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Driver Dialog */}
            <DriverFormDialog
                open={showForm}
                onOpenChange={setShowForm}
                driver={editingDriver}
                zones={(zones as any)?.data || (Array.isArray(zones) ? zones : [])}
                onSubmit={(data) => {
                    if (editingDriver) {
                        updateMutation.mutate({ id: editingDriver.id, data })
                    } else {
                        createMutation.mutate(data as CreateDriverData)
                    }
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    )
}

// ── Driver Form Dialog ─────────────────────────────────────────────────────

function DriverFormDialog({
    open,
    onOpenChange,
    driver,
    zones,
    onSubmit,
    isLoading,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    driver: Driver | null
    zones: any[]
    onSubmit: (data: CreateDriverData | UpdateDriverData) => void
    isLoading: boolean
}) {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        vehicle_type: '',
        vehicle_plate: '',
        assigned_zone_id: '',
    })

    // Sync form when dialog opens or driver changes
    const resetForm = () => {
        if (driver) {
            setForm({
                first_name: driver.first_name || '',
                last_name: driver.last_name || '',
                email: driver.email || '',
                phone: driver.phone || '',
                password: '',
                vehicle_type: driver.vehicle_type || '',
                vehicle_plate: driver.vehicle_plate || '',
                assigned_zone_id: driver.assigned_zone_id ? String(driver.assigned_zone_id) : '',
            })
        } else {
            setForm({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                password: '',
                vehicle_type: '',
                vehicle_plate: '',
                assigned_zone_id: '',
            })
        }
    }

    // Reset form when dialog opens
    useState(() => {
        resetForm()
    })

    // Also reset when driver prop changes
    const [prevDriver, setPrevDriver] = useState<Driver | null>(null)
    if (driver !== prevDriver) {
        setPrevDriver(driver)
        if (open) resetForm()
    }

    const handleSubmit = () => {
        const data: any = { ...form }
        if (data.assigned_zone_id) {
            data.assigned_zone_id = Number(data.assigned_zone_id)
        } else {
            data.assigned_zone_id = null
        }
        if (!data.password) delete data.password
        onSubmit(data)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{driver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                    <DialogDescription>
                        {driver
                            ? 'Update driver information and settings.'
                            : 'Create a new driver account. They will be able to log in with the driver app.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>First Name</Label>
                            <Input
                                value={form.first_name}
                                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <Label>Last Name</Label>
                            <Input
                                value={form.last_name}
                                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="driver@elbaraka.com"
                        />
                    </div>

                    <div>
                        <Label>Phone</Label>
                        <Input
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+20xxxxxxxxxx"
                        />
                    </div>

                    <div>
                        <Label>{driver ? 'New Password (leave blank to keep)' : 'Password'}</Label>
                        <Input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder={driver ? '••••••••' : 'Min 8 characters'}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Vehicle Type</Label>
                            <Select
                                value={form.vehicle_type}
                                onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                                    <SelectItem value="car">Car</SelectItem>
                                    <SelectItem value="bicycle">Bicycle</SelectItem>
                                    <SelectItem value="van">Van</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Vehicle Plate</Label>
                            <Input
                                value={form.vehicle_plate}
                                onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
                                placeholder="ABC-1234"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Assigned Zone</Label>
                        <Select
                            value={form.assigned_zone_id}
                            onValueChange={(v) => setForm({ ...form, assigned_zone_id: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="No zone assigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">No Zone</SelectItem>
                                {zones.map((z: any) => (
                                    <SelectItem key={z.id} value={String(z.id)}>
                                        {z.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : driver ? 'Update Driver' : 'Create Driver'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
