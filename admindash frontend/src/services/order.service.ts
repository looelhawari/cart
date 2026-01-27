import { apiClient } from '@/lib/api-client'
import type { Order, OrderStatus, PaginatedResponse } from '@/types'

export interface OrderFilters {
    page?: number
    per_page?: number
    search?: string
    status?: OrderStatus | OrderStatus[]
    payment_status?: string | string[]
    payment_method?: string
    date_from?: string
    date_to?: string
    user_id?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export const orderService = {
    getOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
        return apiClient.get('/admin/orders', filters)
    },

    getOrder: async (id: number): Promise<Order> => {
        const response = await apiClient.get(`/admin/orders/${id}`) as any
        console.log('Order API Response:', JSON.stringify(response, null, 2))

        // Extract from data wrapper if it exists
        let orderData = response.data || response
        console.log('Extracted order data:', JSON.stringify(orderData, null, 2))

        // Process delivery address - keep both string and structured format
        let deliveryAddressString = ''
        let deliveryAddressDetails = undefined

        if (orderData.delivery_address && typeof orderData.delivery_address === 'object') {
            const addr = orderData.delivery_address
            deliveryAddressDetails = {
                street: addr.street || '',
                building: addr.building || '',
                floor: addr.floor || '',
                apartment: addr.apartment || '',
                area: addr.area || '',
                city: addr.city || '',
                landmark: addr.landmark || '',
                recipient_name: addr.recipient_name || ''
            }
            deliveryAddressString = [
                addr.street,
                addr.building,
                addr.floor,
                addr.apartment,
                addr.area,
                addr.city
            ].filter(Boolean).join(', ')
            console.log('Converted from delivery_address object:', deliveryAddressString)
        } else if (orderData.deliveryAddress && typeof orderData.deliveryAddress === 'object') {
            const addr = orderData.deliveryAddress
            deliveryAddressDetails = {
                street: addr.street || '',
                building: addr.building || '',
                floor: addr.floor || '',
                apartment: addr.apartment || '',
                area: addr.area || '',
                city: addr.city || '',
                landmark: addr.landmark || '',
                recipient_name: addr.recipient_name || ''
            }
            deliveryAddressString = [
                addr.street,
                addr.building,
                addr.floor,
                addr.apartment,
                addr.area,
                addr.city
            ].filter(Boolean).join(', ')
            console.log('Converted from deliveryAddress object:', deliveryAddressString)
        } else if (typeof orderData.delivery_address === 'string') {
            deliveryAddressString = orderData.delivery_address
            console.log('Using delivery_address string:', deliveryAddressString)
        }

        // Map backend fields to frontend expected fields - create completely new object
        const cleanOrder: Order = {
            id: orderData.id,
            order_number: orderData.order_number,
            user_id: orderData.user_id,
            user: orderData.user ? {
                id: orderData.user.id,
                first_name: orderData.user.first_name,
                last_name: orderData.user.last_name,
                email: orderData.user.email,
                phone: orderData.user.phone
            } : undefined,
            total_amount: parseFloat(orderData.total_amount || orderData.subtotal || 0),
            discount_amount: parseFloat(orderData.discount_amount || orderData.discount || 0),
            delivery_fee: parseFloat(orderData.delivery_fee || 0),
            final_amount: parseFloat(orderData.final_amount || orderData.total || 0),
            status: orderData.status,
            payment_method: orderData.payment_method,
            payment_status: orderData.payment_status,
            delivery_address: deliveryAddressString,
            delivery_address_details: deliveryAddressDetails,
            delivery_latitude: orderData.delivery_latitude || null,
            delivery_longitude: orderData.delivery_longitude || null,
            delivery_notes: orderData.delivery_notes || orderData.notes || null,
            estimated_delivery_time: orderData.estimated_delivery_time || orderData.delivery_date || null,
            actual_delivery_time: orderData.actual_delivery_time || null,
            promo_code_id: orderData.promo_code_id || null,
            created_at: orderData.created_at,
            updated_at: orderData.updated_at,
            items: (orderData.items || []).map((item: any) => ({
                id: item.id,
                order_id: item.order_id,
                product_barcode: item.product_sku || item.product_barcode,
                product_name: item.product_name,
                product_price: parseFloat(item.price || item.product_price || 0),
                quantity: parseInt(item.quantity || 0),
                subtotal: parseFloat(item.subtotal || (item.price * item.quantity) || 0)
            }))
        }

        console.log('Clean order data:', JSON.stringify(cleanOrder, null, 2))
        console.log('delivery_address type:', typeof cleanOrder.delivery_address)
        console.log('delivery_address value:', cleanOrder.delivery_address)
        return cleanOrder
    },

    updateOrderStatus: async (id: number, status: OrderStatus): Promise<Order> => {
        return apiClient.put(`/admin/orders/${id}/status`, { status })
    },

    cancelOrder: async (id: number, reason: string): Promise<Order> => {
        return apiClient.post(`/admin/orders/${id}/cancel`, { cancellation_reason: reason })
    },

    getOrderTimeline: async (id: number): Promise<any[]> => {
        return apiClient.get(`/admin/orders/${id}/timeline`)
    },
}
