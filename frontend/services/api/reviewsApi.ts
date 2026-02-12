import httpClient from "@/services/httpClient";
import type { Review } from "@/types";

export type RatingType = "product" | "order" | "store";

export interface CreateReviewPayload {
  product_id?: number;
  order_id?: number;
  rating: number;
  comment: string;
  rating_type?: RatingType;
  images?: string[];
}

export interface CreateOrderReviewPayload {
  order_id: number;
  rating: number;
  comment: string;
  rating_type: "order";
}

export interface CreateStoreReviewPayload {
  rating: number;
  comment: string;
  rating_type: "store";
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
  images?: string[];
}

export interface ReviewsResponse {
  success?: boolean;
  data: Review[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface SingleReviewResponse {
  success: boolean;
  data: Review;
}

/**
 * Get all reviews for a specific product
 */
export const getProductReviews = async (
  productId: string | number,
  page: number = 1,
): Promise<ReviewsResponse> => {
  return await httpClient.get<ReviewsResponse>(
    `/reviews/product/${productId}?page=${page}`,
  );
};

/**
 * Get a single review by ID
 */
export const getReview = async (
  reviewId: string | number,
): Promise<SingleReviewResponse> => {
  return await httpClient.get<SingleReviewResponse>(`/reviews/${reviewId}`);
};

/**
 * Create a new review (requires authentication)
 */
export const createReview = async (
  payload: CreateReviewPayload,
): Promise<SingleReviewResponse> => {
  return await httpClient.post<SingleReviewResponse>("/reviews", payload);
};

/**
 * Update an existing review (requires authentication)
 */
export const updateReview = async (
  reviewId: string | number,
  payload: UpdateReviewPayload,
): Promise<SingleReviewResponse> => {
  return await httpClient.put<SingleReviewResponse>(
    `/reviews/${reviewId}`,
    payload,
  );
};

/**
 * Delete a review (requires authentication)
 */
export const deleteReview = async (
  reviewId: string | number,
): Promise<{ success: boolean; message: string }> => {
  return await httpClient.delete<{ success: boolean; message: string }>(
    `/reviews/${reviewId}`,
  );
};

/**
 * Mark a review as helpful (requires authentication)
 */
export const markReviewHelpful = async (
  reviewId: string | number,
): Promise<{ success: boolean; message: string }> => {
  return await httpClient.post<{ success: boolean; message: string }>(
    `/reviews/${reviewId}/helpful`,
  );
};

/**
 * Get user's own reviews (requires authentication)
 */
export const getUserReviews = async (
  page: number = 1,
): Promise<ReviewsResponse> => {
  return await httpClient.get<ReviewsResponse>(
    `/reviews/my-reviews?page=${page}`,
  );
};

/**
 * Check if user can review a product (has purchased and delivered, and hasn't reviewed yet)
 */
export interface CanReviewResponse {
  success: boolean;
  data: {
    can_review: boolean;
    has_purchased: boolean;
    already_reviewed: boolean;
    eligible_orders: {
      order_id: number;
      order_number: string;
      delivered_at: string;
    }[];
    existing_review?: Review;
  };
}

export const canReviewProduct = async (
  productId: string | number,
): Promise<CanReviewResponse> => {
  return await httpClient.get<CanReviewResponse>(
    `/reviews/can-review/${productId}`,
  );
};

/**
 * Create an order review (rating for the overall order experience)
 */
export const createOrderReview = async (
  payload: CreateOrderReviewPayload,
): Promise<SingleReviewResponse> => {
  return await httpClient.post<SingleReviewResponse>("/reviews", {
    ...payload,
    rating_type: "order",
  });
};

/**
 * Create a store review (overall store rating)
 */
export const createStoreReview = async (
  payload: CreateStoreReviewPayload,
): Promise<SingleReviewResponse> => {
  return await httpClient.post<SingleReviewResponse>("/reviews", {
    ...payload,
    rating_type: "store",
  });
};

/**
 * Get reviews for a specific order
 */
export const getOrderReviews = async (
  orderId: string | number,
): Promise<ReviewsResponse> => {
  return await httpClient.get<ReviewsResponse>(`/reviews/order/${orderId}`);
};

/**
 * Check if user can review an order (order must be delivered)
 */
export interface CanReviewOrderResponse {
  success: boolean;
  data: {
    can_review: boolean;
    already_reviewed: boolean;
    order_status: string;
  };
}

export const canReviewOrder = async (
  orderId: string | number,
): Promise<CanReviewOrderResponse> => {
  return await httpClient.get<CanReviewOrderResponse>(
    `/reviews/can-review-order/${orderId}`,
  );
};

// ====== Driver Rating APIs ======

export interface RateDriverPayload {
  rating: number;
  comment?: string;
}

export interface RateDriverResponse {
  success: boolean;
  message: string;
  data?: {
    review_id: number;
    rating: number;
    comment: string | null;
  };
}

export interface CanRateDriverResponse {
  success: boolean;
  data: {
    can_rate: boolean;
    already_rated?: boolean;
    driver?: {
      id: number;
      name: string | null;
    };
  };
}

/**
 * Rate the driver for a delivered order
 */
export const rateDriver = async (
  orderId: string | number,
  payload: RateDriverPayload,
): Promise<RateDriverResponse> => {
  return await httpClient.post<RateDriverResponse>(
    `/orders/${orderId}/rate-driver`,
    payload,
  );
};

/**
 * Check if customer can rate the driver for an order
 */
export const canRateDriver = async (
  orderId: string | number,
): Promise<CanRateDriverResponse> => {
  return await httpClient.get<CanRateDriverResponse>(
    `/orders/${orderId}/can-rate-driver`,
  );
};
