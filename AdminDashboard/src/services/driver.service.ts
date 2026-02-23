import { apiClient } from '@/lib/api-client'

// ── Types ──────────────────────────────────────────────────────────────────

interface ApiResponse<T> {
    success: boolean
    data: T
    message?: string
}

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
    assigned_zone?: {
        id: number
        name: string
        name_ar: string
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
    name: string
    phone: string
    zone?: {
        id: number
        name: string
        name_ar: string
    }
    is_available: boolean
    total_orders: number
    delivered: number
    earnings: number
    avg_delivery_minutes: number | null
    average_rating: number | null
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
        const response = await apiClient.get<ApiResponse<PaginatedDrivers>>('/admin/drivers', { params })
        return response.data
    },

    getDriver: async (id: number): Promise<Driver> => {
        const response = await apiClient.get<ApiResponse<{ driver: Driver; recent_orders: any[] }>>(`/admin/drivers/${id}`)
        return response.data.driver
    },

    createDriver: async (data: CreateDriverData): Promise<Driver> => {
        const response = await apiClient.post<ApiResponse<Driver>>('/admin/drivers', data)
        return response.data
    },

    updateDriver: async (id: number, data: UpdateDriverData): Promise<Driver> => {
        const response = await apiClient.put<ApiResponse<Driver>>(`/admin/drivers/${id}`, data)
        return response.data
    },

    deleteDriver: async (id: number): Promise<void> => {
        await apiClient.delete<ApiResponse<void>>(`/admin/drivers/${id}`)
    },

    getAvailableDrivers: async (): Promise<Driver[]> => {
        const response = await apiClient.get<ApiResponse<Driver[]>>('/admin/drivers/available')
        return response.data
    },

    getDriverLocations: async (): Promise<DriverLocation[]> => {
        const response = await apiClient.get<ApiResponse<DriverLocation[]>>('/admin/drivers/locations')
        return response.data
    },

    getDriverPerformance: async (): Promise<DriverPerformance[]> => {
        const response = await apiClient.get<ApiResponse<DriverPerformance[]>>('/admin/drivers/performance')
        return response.data
    },

    assignDriverToOrder: async (orderId: number, driverId: number): Promise<any> => {
        return apiClient.post(`/admin/orders/${orderId}/assign-driver`, { driver_id: driverId })
    },
}
