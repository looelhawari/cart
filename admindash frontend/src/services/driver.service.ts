import { apiClient } from '@/lib/api-client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Driver {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    role: string
    is_available: boolean
    current_lat: number | null
    current_lng: number | null
    location_updated_at: string | null
    assigned_zone_id: number | null
    vehicle_type: string | null
    vehicle_plate: string | null
    total_deliveries: number
    average_rating: number | null
    created_at: string
    updated_at: string
    // Counts from withCount
    driver_orders_count?: number
    total_orders?: number
    active_orders?: number
    delivered_orders?: number
    zone?: {
        id: number
        name: string
    }
}

export interface DriverLocation {
    id: number
    first_name: string
    last_name: string
    current_lat: number
    current_lng: number
    location_updated_at: string
    is_available: boolean
    active_orders?: number
}

export interface DriverPerformance {
    id: number
    first_name: string
    last_name: string
    total_orders: number
    delivered_orders: number
    avg_delivery_minutes: number | null
    average_rating: number | null
    is_available: boolean
}

export interface CreateDriverData {
    first_name: string
    last_name: string
    email: string
    phone: string
    password: string
    vehicle_type?: string
    vehicle_plate?: string
    assigned_zone_id?: number | null
}

export interface UpdateDriverData {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    password?: string
    is_available?: boolean
    vehicle_type?: string
    vehicle_plate?: string
    assigned_zone_id?: number | null
}

export interface PaginatedDrivers {
    data: Driver[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}

// ── Service ────────────────────────────────────────────────────────────────

export const driverService = {
    getDrivers: async (params?: {
        search?: string
        zone_id?: number
        is_available?: boolean
        page?: number
        per_page?: number
    }): Promise<PaginatedDrivers> => {
        return apiClient.get('/admin/drivers', { params })
    },

    getDriver: async (id: number): Promise<Driver> => {
        return apiClient.get(`/admin/drivers/${id}`)
    },

    createDriver: async (data: CreateDriverData): Promise<Driver> => {
        return apiClient.post('/admin/drivers', data)
    },

    updateDriver: async (id: number, data: UpdateDriverData): Promise<Driver> => {
        return apiClient.put(`/admin/drivers/${id}`, data)
    },

    deleteDriver: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/drivers/${id}`)
    },

    getAvailableDrivers: async (): Promise<Driver[]> => {
        return apiClient.get('/admin/drivers/available')
    },

    getDriverLocations: async (): Promise<DriverLocation[]> => {
        return apiClient.get('/admin/drivers/locations')
    },

    getDriverPerformance: async (): Promise<DriverPerformance[]> => {
        return apiClient.get('/admin/drivers/performance')
    },

    assignDriverToOrder: async (orderId: number, driverId: number): Promise<any> => {
        return apiClient.post(`/admin/orders/${orderId}/assign-driver`, { driver_id: driverId })
    },
}
