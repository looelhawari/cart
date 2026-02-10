import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    deliveryZoneService,
    type DeliveryZone,
    type DeliveryZoneFilters,
    type CreateDeliveryZoneData,
    type Coordinate,
    type DashboardOverview,
} from '@/services/delivery-zone.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import {
    Plus,
    Search,
    Edit,
    Trash2,
    MapPin,
    Map as MapIcon,
    Eye,
    EyeOff,
    RefreshCw,
    Truck,
    Users,
    ShoppingCart,
    DollarSign,
    Clock,
    Activity,
    BarChart3,
    Layers,
    Palette,
    AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix Leaflet default marker icon path bug with bundlers (Vite/Webpack)
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Constants ───────────────────────────────────────────────────────────────

const ZONE_COLORS = [
    '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0',
    '#00BCD4', '#FF5722', '#3F51B5', '#8BC34A', '#FFC107',
    '#795548', '#607D8B', '#F44336', '#009688', '#673AB7',
]

// Default center: Cairo, Egypt — [lat, lng] for Leaflet
const DEFAULT_CENTER: L.LatLngTuple = [30.0444, 31.2357]
const DEFAULT_ZOOM = 11

// Free tile layers
const TILE_LAYERS = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP',
    },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert our Coordinate[] (lat/lng objects) to Leaflet LatLng tuples */
function coordsToLatLngs(coords: Coordinate[]): L.LatLngTuple[] {
    return coords.map(c => [c.lat, c.lng] as L.LatLngTuple)
}

/** Convert Leaflet LatLng[] back to our Coordinate[] */
function latLngsToCoords(latLngs: L.LatLng[]): Coordinate[] {
    return latLngs.map(ll => ({ lat: ll.lat, lng: ll.lng }))
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DeliveryZonesPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // State
    const [filters, setFilters] = useState<DeliveryZoneFilters>({ page: 1, per_page: 50 })
    const [searchInput, setSearchInput] = useState('')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
    const [deleteZone, setDeleteZone] = useState<DeliveryZone | null>(null)
    const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null)
    const [mapReady, setMapReady] = useState(false)

    // Map refs
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
    const drawControlRef = useRef<L.Control.Draw | null>(null)
    const zoneLayersRef = useRef<Map<number, L.Polygon>>(new Map())
    const isDrawingMode = useRef(false)
    const activeDrawHandlerRef = useRef<any>(null)

    // Form state
    const [formData, setFormData] = useState<CreateDeliveryZoneData>({
        name: '',
        name_ar: '',
        description: '',
        city: '',
        area: '',
        delivery_fee: 0,
        min_order_amount: 0,
        estimated_delivery_time: '30-45 min',
        max_delivery_time_minutes: 60,
        is_active: true,
        polygon_coordinates: [],
        color: ZONE_COLORS[0],
        opacity: 0.3,
        surge_multiplier: 1.0,
        max_concurrent_orders: 50,
    })

    // ── Queries ─────────────────────────────────────────────────────────────

    const { data: zonesData, isLoading: zonesLoading } = useQuery({
        queryKey: ['delivery-zones', filters],
        queryFn: () => deliveryZoneService.getZones(filters),
    })

    const { data: dashboard } = useQuery({
        queryKey: ['delivery-zones-dashboard'],
        queryFn: () => deliveryZoneService.getDashboard(),
    })

    const zones = zonesData?.data || []

    // ── Mutations ───────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: (data: CreateDeliveryZoneData) => deliveryZoneService.createZone(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-zones'] })
            queryClient.invalidateQueries({ queryKey: ['delivery-zones-dashboard'] })
            toast({ title: isRTL ? 'تم إنشاء المنطقة بنجاح' : 'Zone created successfully' })
            closeForm()
        },
        onError: (error: any) => {
            toast({
                title: isRTL ? 'فشل في إنشاء المنطقة' : 'Failed to create zone',
                description: error?.response?.data?.message || error.message,
                variant: 'destructive',
            })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CreateDeliveryZoneData> }) =>
            deliveryZoneService.updateZone(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-zones'] })
            queryClient.invalidateQueries({ queryKey: ['delivery-zones-dashboard'] })
            toast({ title: isRTL ? 'تم تحديث المنطقة بنجاح' : 'Zone updated successfully' })
            closeForm()
        },
        onError: (error: any) => {
            toast({
                title: isRTL ? 'فشل في تحديث المنطقة' : 'Failed to update zone',
                description: error?.response?.data?.message || error.message,
                variant: 'destructive',
            })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deliveryZoneService.deleteZone(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-zones'] })
            queryClient.invalidateQueries({ queryKey: ['delivery-zones-dashboard'] })
            toast({ title: isRTL ? 'تم حذف المنطقة بنجاح' : 'Zone deleted successfully' })
            setDeleteZone(null)
        },
        onError: (error: any) => {
            toast({
                title: isRTL ? 'فشل في حذف المنطقة' : 'Failed to delete zone',
                description: error?.response?.data?.message || error.message,
                variant: 'destructive',
            })
        },
    })

    const toggleMutation = useMutation({
        mutationFn: (id: number) => deliveryZoneService.toggleStatus(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-zones'] })
            queryClient.invalidateQueries({ queryKey: ['delivery-zones-dashboard'] })
            toast({ title: isRTL ? 'تم تحديث الحالة' : 'Status updated' })
        },
    })

    // ── Leaflet Map Initialization ──────────────────────────────────────────

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return
        if (activeTab !== 'map') return

        const map = L.map(mapContainerRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: false,
        })

        // Street tiles (default)
        const streetLayer = L.tileLayer(TILE_LAYERS.street.url, {
            attribution: TILE_LAYERS.street.attribution,
            maxZoom: 19,
        }).addTo(map)

        // Satellite tiles
        const satelliteLayer = L.tileLayer(TILE_LAYERS.satellite.url, {
            attribution: TILE_LAYERS.satellite.attribution,
            maxZoom: 18,
        })

        // Layer switcher (street / satellite)
        L.control.layers(
            { 'Street': streetLayer, 'Satellite': satelliteLayer },
            undefined,
            { position: 'topright' }
        ).addTo(map)

        // Zoom controls
        L.control.zoom({ position: 'topright' }).addTo(map)

        // Scale bar
        L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map)

        // Feature group to hold drawn polygons
        const drawnItems = new L.FeatureGroup()
        map.addLayer(drawnItems)
        drawnItemsRef.current = drawnItems

        // Build Draw control (kept in ref, added/removed as needed)
        const drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: { color: '#4CAF50', weight: 2, fillOpacity: 0.3 },
                },
                polyline: false,
                circle: false,
                rectangle: false,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: drawnItems,
                remove: false,
            },
        })
        drawControlRef.current = drawControl

        // Draw CREATED handler
        map.on(L.Draw.Event.CREATED, (e: any) => {
            if (!isDrawingMode.current) return
            const layer = e.layer as L.Polygon

            drawnItems.clearLayers()
            drawnItems.addLayer(layer)

            const latLngs = layer.getLatLngs()[0] as L.LatLng[]
            const coords = latLngsToCoords(latLngs)
            setFormData(prev => ({ ...prev, polygon_coordinates: coords }))
        })

        // Draw EDITED handler
        map.on(L.Draw.Event.EDITED, (e: any) => {
            if (!isDrawingMode.current) return
            const layers = (e as any).layers as L.LayerGroup
            layers.eachLayer((layer: any) => {
                const latLngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[]
                const coords = latLngsToCoords(latLngs)
                setFormData(prev => ({ ...prev, polygon_coordinates: coords }))
            })
        })

        map.whenReady(() => setMapReady(true))
        mapRef.current = map

        return () => {
            map.remove()
            mapRef.current = null
            drawnItemsRef.current = null
            drawControlRef.current = null
            zoneLayersRef.current.clear()
            activeDrawHandlerRef.current = null
            setMapReady(false)
        }
    }, [activeTab])

    // ── Render Zone Polygons ────────────────────────────────────────────────

    const renderZonePolygons = useCallback((map: L.Map, zonesToRender: DeliveryZone[]) => {
        // Clear existing zone polygons
        zoneLayersRef.current.forEach(layer => {
            try { map.removeLayer(layer) } catch { /* ignore */ }
        })
        zoneLayersRef.current.clear()

        const bounds = L.latLngBounds([])
        let hasBounds = false

        zonesToRender.forEach(zone => {
            if (!zone.polygon_coordinates || zone.polygon_coordinates.length < 3) return

            const latLngs = coordsToLatLngs(zone.polygon_coordinates)
            const color = zone.color || '#4CAF50'
            const fillOp = zone.is_active ? (zone.opacity || 0.3) : 0.1
            const strokeOp = zone.is_active ? 1.0 : 0.4

            const polygon = L.polygon(latLngs, {
                color,
                weight: selectedZoneId === zone.id ? 3 : 2,
                fillColor: color,
                fillOpacity: selectedZoneId === zone.id ? fillOp + 0.15 : fillOp,
                opacity: strokeOp,
            }).addTo(map)

            // Popup
            polygon.bindPopup(`
                <div style="min-width:200px;font-family:system-ui;line-height:1.5">
                    <h3 style="margin:0 0 6px;font-size:15px;font-weight:600">${zone.name}</h3>
                    <p style="margin:0 0 3px;color:#666;font-size:13px">${zone.city} — ${zone.area}</p>
                    <p style="margin:0 0 3px;font-size:13px"><b>${isRTL ? 'رسوم التوصيل' : 'Delivery Fee'}:</b> EGP ${zone.delivery_fee}</p>
                    <p style="margin:0 0 3px;font-size:13px"><b>${isRTL ? 'الحالة' : 'Status'}:</b>
                        <span style="color:${zone.is_active ? '#4CAF50' : '#F44336'}">${zone.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'متوقف' : 'Inactive')}</span>
                    </p>
                    ${zone.orders_count !== undefined ? `<p style="margin:0;font-size:13px"><b>${isRTL ? 'الطلبات' : 'Orders'}:</b> ${zone.orders_count}</p>` : ''}
                </div>
            `, { maxWidth: 300 })

            // Hover
            polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: fillOp + 0.15, weight: 3 }))
            polygon.on('mouseout', () => polygon.setStyle({
                fillOpacity: selectedZoneId === zone.id ? fillOp + 0.15 : fillOp,
                weight: selectedZoneId === zone.id ? 3 : 2,
            }))

            // Click
            polygon.on('click', () => setSelectedZoneId(zone.id))

            // Bounds
            const polyBounds = polygon.getBounds()
            if (polyBounds.isValid()) {
                bounds.extend(polyBounds)
                hasBounds = true
            }

            zoneLayersRef.current.set(zone.id, polygon)
        })

        if (hasBounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }
    }, [selectedZoneId, isRTL])

    // Re-render when zones or selection change
    useEffect(() => {
        if (mapRef.current && mapReady && zones.length >= 0) {
            renderZonePolygons(mapRef.current, zones)
        }
    }, [zones, mapReady, renderZonePolygons])

    // ── Form Handlers ───────────────────────────────────────────────────────

    const openCreateForm = () => {
        setEditingZone(null)
        setFormData({
            name: '',
            name_ar: '',
            description: '',
            city: '',
            area: '',
            delivery_fee: 0,
            min_order_amount: 0,
            estimated_delivery_time: '30-45 min',
            max_delivery_time_minutes: 60,
            is_active: true,
            polygon_coordinates: [],
            color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
            opacity: 0.3,
            surge_multiplier: 1.0,
            max_concurrent_orders: 50,
        })
        setIsFormOpen(true)
    }

    const openEditForm = (zone: DeliveryZone) => {
        setEditingZone(zone)
        setFormData({
            name: zone.name,
            name_ar: zone.name_ar || '',
            description: zone.description || '',
            city: zone.city,
            area: zone.area,
            delivery_fee: zone.delivery_fee,
            min_order_amount: zone.min_order_amount,
            estimated_delivery_time: zone.estimated_delivery_time || '',
            max_delivery_time_minutes: zone.max_delivery_time_minutes,
            is_active: zone.is_active,
            polygon_coordinates: zone.polygon_coordinates || [],
            color: zone.color || ZONE_COLORS[0],
            opacity: zone.opacity || 0.3,
            surge_multiplier: zone.surge_multiplier || 1.0,
            max_concurrent_orders: zone.max_concurrent_orders || 50,
        })
        setIsFormOpen(true)

        // Zoom to zone
        if (mapRef.current && zone.polygon_coordinates?.length) {
            const latLngs = coordsToLatLngs(zone.polygon_coordinates)
            const b = L.latLngBounds(latLngs)
            if (b.isValid()) mapRef.current.fitBounds(b, { padding: [80, 80], maxZoom: 15 })
        }

        // Load existing polygon into draw layer for editing
        setTimeout(() => {
            if (drawnItemsRef.current && mapRef.current && zone.polygon_coordinates?.length) {
                isDrawingMode.current = true
                drawnItemsRef.current.clearLayers()

                const latLngs = coordsToLatLngs(zone.polygon_coordinates)
                const editPoly = L.polygon(latLngs, {
                    color: zone.color || '#4CAF50',
                    weight: 2,
                    fillOpacity: 0.3,
                })
                drawnItemsRef.current.addLayer(editPoly)

                // Hide static layer for this zone while editing
                const staticLayer = zoneLayersRef.current.get(zone.id)
                if (staticLayer) staticLayer.setStyle({ opacity: 0, fillOpacity: 0 })

                // Add draw control
                if (drawControlRef.current) {
                    try { mapRef.current.addControl(drawControlRef.current) } catch { /* already on map */ }
                }
            }
        }, 200)
    }

    const closeForm = () => {
        setIsFormOpen(false)
        setEditingZone(null)
        isDrawingMode.current = false

        // Disable any active drawing handler
        if (activeDrawHandlerRef.current) {
            try { activeDrawHandlerRef.current.disable() } catch { /* ignore */ }
            activeDrawHandlerRef.current = null
        }

        // Clean drawn layer
        if (drawnItemsRef.current) drawnItemsRef.current.clearLayers()

        // Remove draw control
        if (drawControlRef.current && mapRef.current) {
            try { mapRef.current.removeControl(drawControlRef.current) } catch { /* ignore */ }
        }

        // Restore all zone polygons
        if (mapRef.current && mapReady) {
            renderZonePolygons(mapRef.current, zones)
        }
    }

    const handleSubmit = () => {
        if (!formData.name || !formData.city || !formData.area) {
            toast({
                title: isRTL ? 'بيانات مفقودة' : 'Missing fields',
                description: isRTL ? 'الرجاء ملء الاسم والمدينة والمنطقة' : 'Please fill in name, city, and area',
                variant: 'destructive',
            })
            return
        }

        // Pull latest polygon from drawn layer
        if (drawnItemsRef.current && isDrawingMode.current) {
            const layers = drawnItemsRef.current.getLayers()
            if (layers.length > 0) {
                const layer = layers[0] as L.Polygon
                const latLngs = layer.getLatLngs()[0] as L.LatLng[]
                formData.polygon_coordinates = latLngsToCoords(latLngs)
            }
        }

        if (editingZone) {
            updateMutation.mutate({ id: editingZone.id, data: formData })
        } else {
            createMutation.mutate(formData)
        }
    }

    const startDrawing = () => {
        if (!mapRef.current || !drawnItemsRef.current) return
        isDrawingMode.current = true

        // Clear any existing draw
        drawnItemsRef.current.clearLayers()
        setFormData(prev => ({ ...prev, polygon_coordinates: [] }))

        // Add draw control
        if (drawControlRef.current) {
            try { mapRef.current.addControl(drawControlRef.current) } catch { /* already */ }
        }

        // Programmatically start polygon drawing
        const handler = new (L.Draw as any).Polygon(mapRef.current, {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
                color: formData.color || '#4CAF50',
                weight: 2,
                fillOpacity: 0.3,
            },
        })
        handler.enable()
        activeDrawHandlerRef.current = handler
    }

    const clearPolygon = () => {
        if (activeDrawHandlerRef.current) {
            try { activeDrawHandlerRef.current.disable() } catch { /* ignore */ }
            activeDrawHandlerRef.current = null
        }
        if (drawnItemsRef.current) drawnItemsRef.current.clearLayers()
        isDrawingMode.current = false
        setFormData(prev => ({ ...prev, polygon_coordinates: [] }))
    }

    const focusZone = (zone: DeliveryZone) => {
        setSelectedZoneId(zone.id)
        if (mapRef.current && zone.polygon_coordinates?.length) {
            const latLngs = coordsToLatLngs(zone.polygon_coordinates)
            const b = L.latLngBounds(latLngs)
            if (b.isValid()) mapRef.current.fitBounds(b, { padding: [80, 80], maxZoom: 15 })
        } else if (mapRef.current && zone.center_lat && zone.center_lng) {
            mapRef.current.setView([zone.center_lat, zone.center_lng], 14, { animate: true })
        }
        setActiveTab('map')
    }

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchInput || undefined, page: 1 }))
        }, 400)
        return () => clearTimeout(timer)
    }, [searchInput])

    // ── Render ──────────────────────────────────────────────────────────────

    const formatCurrency = (amount: number) => `EGP ${amount.toFixed(2)}`

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isRTL ? 'مناطق التوصيل' : 'Delivery Zones'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isRTL
                            ? 'إدارة مناطق التوصيل والرسوم والتغطية'
                            : 'Manage delivery zones, fees, and coverage areas'}
                    </p>
                </div>
                <Button onClick={openCreateForm} className="bg-elbaraka-primary hover:bg-elbaraka-primary/90">
                    <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {isRTL ? 'إضافة منطقة' : 'Add Zone'}
                </Button>
            </div>

            {/* Dashboard Stats */}
            {dashboard && <DashboardStats dashboard={dashboard} isRTL={isRTL} />}

            {/* Search & Tabs */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input
                        placeholder={isRTL ? 'بحث في المناطق...' : 'Search zones...'}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={cn(isRTL ? "pr-10" : "pl-10")}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={filters.is_active?.toString() || 'all'}
                        onValueChange={(val) => setFilters(prev => ({
                            ...prev,
                            is_active: val === 'all' ? undefined : val,
                            page: 1,
                        }))}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                            <SelectItem value="true">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                            <SelectItem value="false">{isRTL ? 'متوقف' : 'Inactive'}</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex border rounded-lg overflow-hidden">
                        <Button
                            variant={activeTab === 'map' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('map')}
                            className={activeTab === 'map' ? 'bg-elbaraka-primary text-white' : ''}
                        >
                            <MapIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTab === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('list')}
                            className={activeTab === 'list' ? 'bg-elbaraka-primary text-white' : ''}
                        >
                            <Layers className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {activeTab === 'map' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Map */}
                    <div className="lg:col-span-3">
                        <Card className="overflow-hidden">
                            <div
                                ref={mapContainerRef}
                                className="w-full"
                                style={{ height: '600px' }}
                            />
                        </Card>
                    </div>

                    {/* Zone Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="h-[600px] flex flex-col">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">
                                    {isRTL ? 'المناطق' : 'Zones'} ({zones.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-2 p-3">
                                {zonesLoading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : zones.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        {isRTL ? 'لا توجد مناطق بعد' : 'No zones yet'}
                                    </div>
                                ) : (
                                    zones.map(zone => (
                                        <ZoneSidebarCard
                                            key={zone.id}
                                            zone={zone}
                                            isSelected={selectedZoneId === zone.id}
                                            isRTL={isRTL}
                                            onFocus={() => focusZone(zone)}
                                            onEdit={() => openEditForm(zone)}
                                            onToggle={() => toggleMutation.mutate(zone.id)}
                                            onDelete={() => setDeleteZone(zone)}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <ZoneListView
                    zones={zones}
                    isLoading={zonesLoading}
                    isRTL={isRTL}
                    onEdit={openEditForm}
                    onDelete={setDeleteZone}
                    onToggle={(id) => toggleMutation.mutate(id)}
                    onFocus={focusZone}
                    formatCurrency={formatCurrency}
                />
            )}

            {/* Create/Edit Form Dialog */}
            <ZoneFormDialog
                isOpen={isFormOpen}
                onClose={closeForm}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isEditing={!!editingZone}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                isRTL={isRTL}
                onStartDrawing={startDrawing}
                onClearPolygon={clearPolygon}
                mapReady={mapReady}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteZone} onOpenChange={() => setDeleteZone(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isRTL ? 'حذف المنطقة' : 'Delete Zone'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isRTL
                                ? `هل أنت متأكد من حذف منطقة "${deleteZone?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                                : `Are you sure you want to delete "${deleteZone?.name}"? This action cannot be undone.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteZone && deleteMutation.mutate(deleteZone.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isRTL ? 'حذف' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function DashboardStats({ dashboard, isRTL }: { dashboard: DashboardOverview; isRTL: boolean }) {
    const stats = [
        {
            label: isRTL ? 'إجمالي المناطق' : 'Total Zones',
            value: dashboard.total_zones,
            sub: `${dashboard.active_zones} ${isRTL ? 'نشط' : 'active'}`,
            icon: MapPin,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            label: isRTL ? 'السائقون' : 'Drivers',
            value: dashboard.total_drivers,
            sub: `${dashboard.available_drivers} ${isRTL ? 'متاح' : 'available'}`,
            icon: Truck,
            color: 'text-green-600 bg-green-50',
        },
        {
            label: isRTL ? 'طلبات اليوم' : "Today's Orders",
            value: dashboard.today_orders,
            sub: `${dashboard.active_orders} ${isRTL ? 'نشط' : 'active'}`,
            icon: ShoppingCart,
            color: 'text-orange-600 bg-orange-50',
        },
        {
            label: isRTL ? 'تغطية العناوين' : 'Address Coverage',
            value: `${dashboard.coverage_stats?.coverage_percentage?.toFixed(0) || 0}%`,
            sub: `${dashboard.coverage_stats?.zoned_addresses || 0}/${dashboard.coverage_stats?.total_addresses || 0}`,
            icon: Activity,
            color: 'text-purple-600 bg-purple-50',
        },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <Card key={i}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                            </div>
                            <div className={cn('p-2 rounded-lg', stat.color)}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ZoneSidebarCard({
    zone, isSelected, isRTL, onFocus, onEdit, onToggle, onDelete,
}: {
    zone: DeliveryZone; isSelected: boolean; isRTL: boolean
    onFocus: () => void; onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
    return (
        <div
            className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                isSelected ? 'border-elbaraka-primary bg-elbaraka-primary/5' : 'border-gray-200'
            )}
            onClick={onFocus}
        >
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color || '#4CAF50' }} />
                    <span className="text-sm font-medium truncate">{zone.name}</span>
                </div>
                <Badge variant={zone.is_active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {zone.is_active ? (isRTL ? 'نشط' : 'On') : (isRTL ? 'معطل' : 'Off')}
                </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{zone.city} - {zone.area}</p>
            <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium">EGP {zone.delivery_fee}</span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit() }}>
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onToggle() }}>
                        {zone.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function ZoneListView({
    zones, isLoading, isRTL, onEdit, onDelete, onToggle, onFocus, formatCurrency,
}: {
    zones: DeliveryZone[]; isLoading: boolean; isRTL: boolean
    onEdit: (z: DeliveryZone) => void; onDelete: (z: DeliveryZone) => void
    onToggle: (id: number) => void; onFocus: (z: DeliveryZone) => void
    formatCurrency: (n: number) => string
}) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-16">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-gray-50/50">
                                <th className={cn("px-4 py-3 text-xs font-medium text-muted-foreground", isRTL ? "text-right" : "text-left")}>{isRTL ? 'المنطقة' : 'Zone'}</th>
                                <th className={cn("px-4 py-3 text-xs font-medium text-muted-foreground", isRTL ? "text-right" : "text-left")}>{isRTL ? 'الموقع' : 'Location'}</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">{isRTL ? 'رسوم التوصيل' : 'Delivery Fee'}</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">{isRTL ? 'الحد الأدنى' : 'Min Order'}</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">{isRTL ? 'الوقت المقدّر' : 'Est. Time'}</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">{isRTL ? 'المناطق' : 'Polygon'}</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zones.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{isRTL ? 'لا توجد مناطق' : 'No zones found'}</td></tr>
                            ) : (
                                zones.map(zone => (
                                    <tr key={zone.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color || '#4CAF50' }} />
                                                <div>
                                                    <p className="text-sm font-medium">{zone.name}</p>
                                                    {zone.name_ar && <p className="text-xs text-muted-foreground">{zone.name_ar}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{zone.city} - {zone.area}</td>
                                        <td className="px-4 py-3 text-sm text-center font-medium">{formatCurrency(zone.delivery_fee)}</td>
                                        <td className="px-4 py-3 text-sm text-center">{formatCurrency(zone.min_order_amount)}</td>
                                        <td className="px-4 py-3 text-sm text-center">{zone.estimated_delivery_time || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {zone.polygon_coordinates?.length ? (
                                                <Badge variant="default" className="text-[10px]">{zone.polygon_coordinates.length} pts</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px]">{isRTL ? 'بدون' : 'None'}</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                                                {zone.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'متوقف' : 'Inactive')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onFocus(zone)} title={isRTL ? 'عرض على الخريطة' : 'View on map'}><MapPin className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(zone)}><Edit className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggle(zone.id)}>{zone.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(zone)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

function ZoneFormDialog({
    isOpen, onClose, formData, setFormData, onSubmit, isEditing, isSubmitting, isRTL, onStartDrawing, onClearPolygon, mapReady,
}: {
    isOpen: boolean; onClose: () => void; formData: CreateDeliveryZoneData
    setFormData: React.Dispatch<React.SetStateAction<CreateDeliveryZoneData>>
    onSubmit: () => void; isEditing: boolean; isSubmitting: boolean; isRTL: boolean
    onStartDrawing: () => void; onClearPolygon: () => void; mapReady: boolean
}) {
    const handleChange = (field: keyof CreateDeliveryZoneData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? (isRTL ? 'تعديل منطقة التوصيل' : 'Edit Delivery Zone')
                            : (isRTL ? 'إنشاء منطقة توصيل جديدة' : 'Create Delivery Zone')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{isRTL ? 'المعلومات الأساسية' : 'Basic Information'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label><Input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Maadi Zone" /></div>
                            <div><Label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={formData.name_ar || ''} onChange={(e) => handleChange('name_ar', e.target.value)} placeholder="مثال: منطقة المعادي" dir="rtl" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>{isRTL ? 'المدينة' : 'City'} *</Label><Input value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="e.g. Cairo" /></div>
                            <div><Label>{isRTL ? 'المنطقة' : 'Area'} *</Label><Input value={formData.area} onChange={(e) => handleChange('area', e.target.value)} placeholder="e.g. Maadi" /></div>
                        </div>
                        <div><Label>{isRTL ? 'الوصف' : 'Description'}</Label><Textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} placeholder={isRTL ? 'وصف اختياري...' : 'Optional description...'} rows={2} /></div>
                    </div>

                    {/* Pricing & Delivery */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{isRTL ? 'التسعير والتوصيل' : 'Pricing & Delivery'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>{isRTL ? 'رسوم التوصيل (EGP)' : 'Delivery Fee (EGP)'}</Label><Input type="number" min={0} step={0.01} value={formData.delivery_fee} onChange={(e) => handleChange('delivery_fee', parseFloat(e.target.value) || 0)} /></div>
                            <div><Label>{isRTL ? 'الحد الأدنى للطلب (EGP)' : 'Min Order Amount (EGP)'}</Label><Input type="number" min={0} step={0.01} value={formData.min_order_amount} onChange={(e) => handleChange('min_order_amount', parseFloat(e.target.value) || 0)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>{isRTL ? 'وقت التوصيل المقدّر' : 'Estimated Delivery Time'}</Label><Input value={formData.estimated_delivery_time || ''} onChange={(e) => handleChange('estimated_delivery_time', e.target.value)} placeholder="e.g. 30-45 min" /></div>
                            <div><Label>{isRTL ? 'أقصى وقت للتوصيل (دقيقة)' : 'Max Delivery Time (min)'}</Label><Input type="number" min={0} value={formData.max_delivery_time_minutes || 60} onChange={(e) => handleChange('max_delivery_time_minutes', parseInt(e.target.value) || 60)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>{isRTL ? 'معامل الزيادة' : 'Surge Multiplier'}</Label><Input type="number" min={1} max={5} step={0.1} value={formData.surge_multiplier || 1.0} onChange={(e) => handleChange('surge_multiplier', parseFloat(e.target.value) || 1.0)} /></div>
                            <div><Label>{isRTL ? 'أقصى عدد طلبات متزامنة' : 'Max Concurrent Orders'}</Label><Input type="number" min={1} value={formData.max_concurrent_orders || 50} onChange={(e) => handleChange('max_concurrent_orders', parseInt(e.target.value) || 50)} /></div>
                        </div>
                    </div>

                    {/* Polygon */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{isRTL ? 'حدود المنطقة على الخريطة' : 'Zone Boundary on Map'}</h3>
                        {mapReady ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Button type="button" variant="outline" size="sm" onClick={onStartDrawing}>
                                        <MapIcon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                        {formData.polygon_coordinates?.length ? (isRTL ? 'إعادة رسم' : 'Redraw') : (isRTL ? 'رسم حدود المنطقة' : 'Draw Zone Boundary')}
                                    </Button>
                                    {formData.polygon_coordinates?.length ? (
                                        <Button type="button" variant="ghost" size="sm" onClick={onClearPolygon}>{isRTL ? 'مسح' : 'Clear'}</Button>
                                    ) : null}
                                </div>
                                {formData.polygon_coordinates?.length ? (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />{formData.polygon_coordinates.length} {isRTL ? 'نقطة محددة' : 'points defined'}
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">{isRTL ? 'انقر على "رسم حدود المنطقة" ثم ارسم المضلع على الخريطة' : 'Click "Draw Zone Boundary" then draw the polygon on the map'}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">{isRTL ? 'جارِ تحميل الخريطة...' : 'Loading map...'}</p>
                        )}
                    </div>

                    {/* Appearance */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{isRTL ? 'المظهر' : 'Appearance'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{isRTL ? 'لون المنطقة' : 'Zone Color'}</Label>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <input type="color" value={formData.color || '#4CAF50'} onChange={(e) => handleChange('color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                                    <div className="flex flex-wrap gap-1.5">
                                        {ZONE_COLORS.slice(0, 8).map(color => (
                                            <button key={color} type="button" className={cn('w-6 h-6 rounded-full border-2 transition-transform hover:scale-110', formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent')} style={{ backgroundColor: color }} onClick={() => handleChange('color', color)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label>{isRTL ? 'الشفافية' : 'Opacity'} ({((formData.opacity || 0.3) * 100).toFixed(0)}%)</Label>
                                <input type="range" min={0.1} max={0.8} step={0.05} value={formData.opacity || 0.3} onChange={(e) => handleChange('opacity', parseFloat(e.target.value))} className="w-full mt-2" />
                            </div>
                        </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium">{isRTL ? 'المنطقة نشطة' : 'Zone Active'}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'المناطق غير النشطة لن تقبل طلبات' : 'Inactive zones will not accept orders'}</p>
                        </div>
                        <Switch checked={formData.is_active} onCheckedChange={(checked) => handleChange('is_active', checked)} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={onSubmit} disabled={isSubmitting} className="bg-elbaraka-primary hover:bg-elbaraka-primary/90">
                        {isSubmitting ? (
                            <><RefreshCw className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />{isRTL ? 'جارِ الحفظ...' : 'Saving...'}</>
                        ) : (
                            isEditing ? (isRTL ? 'تحديث المنطقة' : 'Update Zone') : (isRTL ? 'إنشاء المنطقة' : 'Create Zone')
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
