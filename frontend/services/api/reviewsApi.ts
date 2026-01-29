import httpClient from "@/services/httpClient";
import type { Review } from "@/types";

export interface CreateReviewPayload {
  product_id: number;
  order_id: number;
  rating: number;
  comment: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
  images?: string[];
}

export interface ReviewsResponse {
  success: boolean;
  data: Review[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
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
  };
}

export const canReviewProduct = async (
  productId: string | number,
): Promise<CanReviewResponse> => {
  return await httpClient.get<CanReviewResponse>(
    `/reviews/can-review/${productId}`,
  );
};
