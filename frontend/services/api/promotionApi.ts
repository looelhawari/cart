import { API_BASE_URL, getAuthToken } from './base';
import type {
    Promotion,
    PromotionListResponse,
    PromotionDetailResponse,
    PromotionProductsResponse
} from '@/types/promotion';

/**
 * Get all active promotions
 */
export const getPromotions = async (params?: {
    applies_to?: 'all' | 'category' | 'products';
    category_id?: number;
}): Promise<PromotionListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.applies_to) queryParams.append('applies_to', params.applies_to);
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());

    const url = `${API_BASE_URL}/promotions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch promotions');
    }

    return response.json();
};

/**
 * Get featured promotion for homepage hero banner
 */
export const getFeaturedPromotion = async (): Promise<PromotionDetailResponse> => {
    const response = await fetch(`${API_BASE_URL}/promotions/featured`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch featured promotion');
    }

    return response.json();
};

/**
 * Get single promotion details
 */
export const getPromotion = async (id: number): Promise<PromotionDetailResponse> => {
    const response = await fetch(`${API_BASE_URL}/promotions/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch promotion details');
    }

    return response.json();
};

/**
 * Get products in a promotion
 */
export const getPromotionProducts = async (
    id: number,
    page: number = 1
): Promise<PromotionProductsResponse> => {
    const response = await fetch(`${API_BASE_URL}/promotions/${id}/products?page=${page}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch promotion products');
    }

    return response.json();
};
