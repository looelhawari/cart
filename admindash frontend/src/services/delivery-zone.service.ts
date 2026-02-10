import { apiClient } from '@/lib/api-client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Coordinate {
    lat: number
    lng: number
}

export interface ZoneSchedule {
    id?: number
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
    surge_multiplier: number
}

export interface DeliveryZone {
    id: number
    name: string
    name_ar: string | null
    description: string | null
    city: string
    area: string
    delivery_fee: number
    min_order_amount: number
    estimated_delivery_time: string | null
    max_delivery_time_minutes: number
    is_active: boolean
    polygon_coordinates: Coordinate[] | null
    center_lat: number | null
    center_lng: number | null
    color: string
    opacity: number
    surge_multiplier: number
    max_concurrent_orders: number
    sort_order: number
    created_at: string
    updated_at: string
    deleted_at: string | null
    // Relationships
    schedules?: ZoneSchedule[]
    // Computed stats
    orders_count?: number
    active_orders_count?: number
    drivers_count?: number
    addresses_count?: number
    total_revenue?: number
}

export interface DeliveryZoneFilters {
    page?: number
    per_page?: number
    search?: string
    is_active?: boolean | string
    city?: string
    has_polygon?: boolean
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface CreateDeliveryZoneData {
    name: string
    name_ar?: string
    description?: string
    city: string
    area: string
    delivery_fee: number
    min_order_amount: number
    estimated_delivery_time?: string
    max_delivery_time_minutes?: number
    is_active?: boolean
    polygon_coordinates?: Coordinate[]
    color?: string
    opacity?: number
    surge_multiplier?: number
    max_concurrent_orders?: number
    schedules?: Omit<ZoneSchedule, 'id'>[]
}

export interface UpdateDeliveryZoneData extends Partial<CreateDeliveryZoneData> { }

export interface ZoneAnalytics {
    zone: DeliveryZone
    period: {
        from: string
        to: string
    }
    orders: {
        total: number
        completed: number
        cancelled: number
        average_value: number
    }
    revenue: {
        total: number
        delivery_fees: number
    }
    performance: {
        average_delivery_time: number
        on_time_percentage: number
    }
}

export interface DashboardOverview {
    total_zones: number
    active_zones: number
    total_drivers: number
    available_drivers: number
    today_orders: number
    active_orders: number
    unzoned_orders: number
    coverage_stats: {
        zoned_addresses: number
        total_addresses: number
        coverage_percentage: number
    }
}

export interface CoordinateCheckResult {
    latitude: number
    longitude: number
    zone: DeliveryZone | null
    in_zone: boolean
}

export interface PaginatedResponse<T> {
    data: T[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}

// ── Service ────────────────────────────────────────────────────────────────

export const deliveryZoneService = {
    // List zones with pagination, search, filters
    getZones: async (filters?: DeliveryZoneFilters): Promise<PaginatedResponse<DeliveryZone>> => {
        const response = await apiClient.get('/admin/delivery-zones', filters) as any
        return response.data || response
    },

    // Get single zone with schedules
    getZone: async (id: number): Promise<DeliveryZone> => {
        const response = await apiClient.get(`/admin/delivery-zones/${id}`) as any
        return response.data || response
    },

    // Create zone
    createZone: async (data: CreateDeliveryZoneData): Promise<DeliveryZone> => {
        const response = await apiClient.post('/admin/delivery-zones', data) as any
        return response.data || response
    },

    // Update zone
    updateZone: async (id: number, data: UpdateDeliveryZoneData): Promise<DeliveryZone> => {
        const response = await apiClient.put(`/admin/delivery-zones/${id}`, data) as any
        return response.data || response
    },

    // Delete zone (soft delete)
    deleteZone: async (id: number): Promise<void> => {
        await apiClient.delete(`/admin/delivery-zones/${id}`)
    },

    // Toggle active status
    toggleStatus: async (id: number): Promise<DeliveryZone> => {
        const response = await apiClient.post(`/admin/delivery-zones/${id}/toggle-status`) as any
        return response.data || response
    },

    // Get zone analytics
    getAnalytics: async (id: number, from?: string, to?: string): Promise<ZoneAnalytics> => {
        const response = await apiClient.get(`/admin/delivery-zones/${id}/analytics`, { from, to }) as any
        return response.data || response
    },

    // Get dashboard overview
    getDashboard: async (): Promise<DashboardOverview> => {
        const response = await apiClient.get('/admin/delivery-zones/dashboard') as any
        return response.data || response
    },

    // Check if coordinate falls in a zone
    checkCoordinate: async (lat: number, lng: number): Promise<CoordinateCheckResult> => {
        const response = await apiClient.post('/admin/delivery-zones/check-coordinate', {
            latitude: lat,
            longitude: lng,
        }) as any
        return response.data || response
    },

    // Reorder zones
    reorderZones: async (zoneIds: number[]): Promise<void> => {
        await apiClient.post('/admin/delivery-zones/reorder', { zone_ids: zoneIds })
    },
}
