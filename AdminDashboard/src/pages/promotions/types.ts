import type { Promotion } from '@/types'

// Form data interface matching backend validation
export interface PromotionFormData {
    title: string
    title_ar: string
    description: string
    description_ar: string
    discount_type: 'percentage' | 'fixed' | 'buy_x_get_y'
    discount_value: number
    start_date: string
    end_date: string
    is_active: boolean
    is_featured: boolean
    applies_to: 'all' | 'category' | 'products'
    min_purchase: number
    max_discount: number
    terms_conditions: string
    terms_conditions_ar: string
    category_ids: number[]
    product_barcodes: string[]
}

// Default form values to prevent uncontrolled to controlled warnings
export const defaultFormValues: PromotionFormData = {
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    discount_type: 'percentage',
    discount_value: 0,
    start_date: '',
    end_date: '',
    is_active: false,
    is_featured: false,
    applies_to: 'all',
    min_purchase: 0,
    max_discount: 0,
    terms_conditions: '',
    terms_conditions_ar: '',
    category_ids: [],
    product_barcodes: [],
}

// Helper to convert Promotion to form data for editing
export const promotionToFormData = (promotion: Promotion): PromotionFormData => {
    const formatDate = (date: string) => {
        try {
            const d = new Date(date)
            return d.toISOString().slice(0, 16) // Format: yyyy-MM-ddTHH:mm
        } catch {
            return ''
        }
    }

    return {
        title: promotion.title || '',
        title_ar: promotion.title_ar || '',
        description: promotion.description || '',
        description_ar: promotion.description_ar || '',
        discount_type: promotion.discount_type || 'percentage',
        discount_value: promotion.discount_value || 0,
        start_date: formatDate(promotion.start_date),
        end_date: formatDate(promotion.end_date),
        is_active: promotion.is_active ?? false,
        is_featured: promotion.is_featured ?? false,
        applies_to: promotion.applies_to || 'all',
        min_purchase: promotion.min_purchase || 0,
        max_discount: promotion.max_discount || 0,
        terms_conditions: promotion.terms_conditions || '',
        terms_conditions_ar: promotion.terms_conditions_ar || '',
        category_ids: promotion.categories?.map(c => c.id) || [],
        product_barcodes: promotion.products?.map(p => p.barcode) || [],
    }
}

// Product type for selection
export interface ProductForSelection {
    barcode: string
    name_en?: string
    name_ar?: string
    price: number
    stock?: number
}

// Category type for selection
export interface CategoryForSelection {
    id: number
    name_en: string
    name_ar: string
    subcategories?: CategoryForSelection[]
}
