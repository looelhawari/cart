export interface Promotion {
    id: number;
    title: string;
    title_ar?: string;
    description: string;
    description_ar?: string;
    image_url?: string;
    banner_image_url?: string;
    discount_type: 'percentage' | 'fixed' | 'buy_x_get_y';
    discount_value: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_featured: boolean;
    applies_to: 'all' | 'category' | 'products';
    category_ids?: number[];
    product_barcodes?: string[];
    min_purchase?: number;
    max_discount?: number;
    terms_conditions?: string;
    terms_conditions_ar?: string;
    created_at: string;
    updated_at: string;
    categories?: Array<{
        id: number;
        name: string;
        name_ar?: string;
    }>;
    products_count?: number;
}

export interface PromotionListResponse {
    success: boolean;
    data: {
        promotions: Promotion[];
    };
}

export interface PromotionDetailResponse {
    success: boolean;
    data: {
        promotion: Promotion;
    };
}

export interface PromotionProductsResponse {
    success: boolean;
    data: {
        products: any[]; // Will use existing Product type
        pagination?: {
            total: number;
            per_page: number;
            current_page: number;
            last_page: number;
        };
    };
}
