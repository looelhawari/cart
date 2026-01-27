import { API_BASE_URL, getAuthToken } from './base';
import type {
    ValidatePromoCodeRequest,
    ValidatePromoCodeResponse
} from '@/types/promoCode';

/**
 * Validate promo code at checkout
 */
export const validatePromoCode = async (
    request: ValidatePromoCodeRequest
): Promise<ValidatePromoCodeResponse> => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/checkout/validate-promo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            promo_code: request.code,
            order_total: request.cart_total,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to validate promo code');
    }

    return data;
};
