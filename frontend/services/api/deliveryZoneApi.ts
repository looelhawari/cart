import { apiRequest } from "./base";

// Types
export interface DeliveryZoneInfo {
    id: number;
    name: string;
    name_ar: string | null;
    city: string;
    area: string;
    delivery_fee: number;
    minimum_order: number;
    estimated_delivery_time: string | null;
    max_delivery_time_minutes: number;
    distance_from_center_km?: number;
    is_active: boolean;
    color: string;
    polygon_coordinates: { lat: number; lng: number }[] | null;
}

export interface CoverageResult {
    is_covered: boolean;
    covered: boolean; // alias for is_covered
    zone: DeliveryZoneInfo | null;
    delivery_fee: number;
    message: string;
}

export interface DeliveryFeeResult {
    delivery_fee: number;
    zone: DeliveryZoneInfo | null;
    surge_multiplier: number;
    free_delivery: boolean;
}

export interface AddressValidationResult {
    valid: boolean;
    zone: DeliveryZoneInfo | null;
    delivery_fee: number;
    message: string;
}

/**
 * Shape returned by GeoHelper::findZone — the canonical zone payload for
 * BOTH /delivery-zones/check-coverage and /delivery-zones/reverse-geocode.
 *
 * Note the keys are zone_id / zone_name / zone_name_ar (not id / name).
 * That used to cause `zone.name` reads on the mobile side to silently
 * return `undefined`; consumers should use `zone_name`.
 */
export interface ResolvedZone {
    zone_id: number;
    zone_name: string;
    zone_name_ar: string | null;
    delivery_fee: number;
    base_delivery_fee: number;
    surge_multiplier: number;
    minimum_order: number;
    estimated_delivery_time: string | null;
    max_delivery_time_minutes: number | null;
    can_accept_orders: boolean;
    distance_from_center_km: number;
}

export interface ReverseGeocodeResult {
    address: {
        formatted_address: string | null;
        place_id: string | null;
        components: {
            street_number: string | null;
            street: string | null;
            neighborhood: string | null;
            city: string | null;
            area: string | null;
            governorate: string | null;
            country: string | null;
            postal_code: string | null;
        };
    };
    is_covered: boolean;
    zone: ResolvedZone | null;
}

// Delivery Zone API for mobile app
export const deliveryZoneApi = {
    /**
     * Get all active delivery zones (for map display)
     */
    getZones: () => {
        return apiRequest<{
            success: boolean;
            data: DeliveryZoneInfo[];
        }>("/delivery-zones", { method: "GET" });
    },

    /**
     * Check if coordinates are within a delivery zone
     */
    checkCoverage: (latitude: number, longitude: number) => {
        return apiRequest<{
            success: boolean;
            data: CoverageResult;
        }>("/delivery-zones/check-coverage", {
            method: "POST",
            body: JSON.stringify({ latitude, longitude }),
        });
    },

    /**
     * Calculate delivery fee based on coordinates and cart subtotal
     */
    calculateDeliveryFee: (latitude: number, longitude: number, subtotal: number) => {
        return apiRequest<{
            success: boolean;
            data: DeliveryFeeResult;
        }>("/delivery-zones/calculate-fee", {
            method: "POST",
            body: JSON.stringify({ latitude, longitude, subtotal }),
        });
    },

    /**
     * Validate a saved address for delivery eligibility
     */
    validateAddress: (addressId: number) => {
        return apiRequest<{
            success: boolean;
            data: AddressValidationResult;
        }>("/delivery-zones/validate-address", {
            method: "POST",
            body: JSON.stringify({ address_id: addressId }),
        });
    },

    /**
     * Reverse geocode coordinates to an address + zone info in ONE call.
     *
     * Replaces two separate round-trips (public Nominatim + checkCoverage)
     * the map picker used to make in parallel. Accepts an AbortSignal so
     * the caller can cancel in-flight requests when the user keeps moving
     * the pin.
     */
    reverseGeocode: (
        latitude: number,
        longitude: number,
        signal?: AbortSignal,
    ) => {
        return apiRequest<{
            success: boolean;
            data: ReverseGeocodeResult;
        }>("/delivery-zones/reverse-geocode", {
            method: "POST",
            body: JSON.stringify({ latitude, longitude }),
            signal,
        });
    },
};
