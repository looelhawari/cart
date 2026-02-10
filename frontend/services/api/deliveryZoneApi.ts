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

export interface ReverseGeocodeResult {
    formatted_address: string;
    place_id: string;
    zone: DeliveryZoneInfo | null;
    address_components: {
        street: string;
        city: string;
        area: string;
        governorate: string;
    };
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
     * Reverse geocode coordinates to an address + zone info
     */
    reverseGeocode: (latitude: number, longitude: number) => {
        return apiRequest<{
            success: boolean;
            data: ReverseGeocodeResult;
        }>("/delivery-zones/reverse-geocode", {
            method: "POST",
            body: JSON.stringify({ latitude, longitude }),
        });
    },
};
