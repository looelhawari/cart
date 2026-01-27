import { API_BASE_URL, safeJsonParse, getAuthToken } from "./base";
import { getSessionId } from "./cartApi";
import type { Offer, OffersResponse, OffersSummaryResponse } from "./types";

export interface OffersQueryParams {
  status?: "all" | "active" | "upcoming" | "expired" | "ended";
  type?: "percentage" | "fixed_amount" | "free_delivery" | "bogo";
  applies_to?: "order" | "category" | "product";
  ending_soon?: boolean;
  for_you?: boolean;
  search?: string;
  sort?: "recommended" | "ending_soon" | "biggest_savings" | "newest";
}

export const getOffers = async (
  params: OffersQueryParams = {},
): Promise<OffersResponse> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.applies_to) query.set("applies_to", params.applies_to);
  if (params.ending_soon) query.set("ending_soon", "1");
  if (params.for_you) query.set("for_you", "1");
  if (params.search) query.set("search", params.search);
  if (params.sort) query.set("sort", params.sort);

  const response = await fetch(`${API_BASE_URL}/offers?${query.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return (await safeJsonParse(response)) as OffersResponse;
};

export const getOffersSummary = async (): Promise<OffersSummaryResponse> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/offers/summary`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return (await safeJsonParse(response)) as OffersSummaryResponse;
};

export type { Offer };
