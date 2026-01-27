export interface PromoCode {
    id: number;
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: string;
    minimum_order: string | null;
    maximum_discount: string | null;
    usage_limit: number | null;
    per_user_limit: number | null;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
}

export interface PromoCodeValidation {
    promo_code: {
        code: string;
        type: 'percentage' | 'fixed_amount';
        value: number;
        discount_amount: number;
        description?: string;
    };
}

export interface ValidatePromoCodeRequest {
    code: string;
    cart_total: number;
}

export interface ValidatePromoCodeResponse {
    success: boolean;
    data?: PromoCodeValidation;
    message?: string;
}
