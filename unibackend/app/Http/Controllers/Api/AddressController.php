<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Http\Requests\Address\UpdateAddressRequest;
use App\Models\Address;
use App\Models\ActivityLog;
use App\Services\GeoHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    private GeoHelper $geoHelper;

    public function __construct(GeoHelper $geoHelper)
    {
        $this->geoHelper = $geoHelper;
    }
    /**
     * Display a listing of the user's addresses.
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->addresses()->orderBy('is_default', 'desc')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
        ]);
    }

    /**
     * Store a newly created address.
     *
     * SECURITY (Slice 3): when the client supplies lat/lng, we no longer
     * trust the matching `formatted_address` text. The driver follows the
     * GPS pin, and the customer-readable address is what admin / support
     * sees in the dashboard — they MUST agree. We reverse-geocode the
     * supplied coordinates server-side and overwrite formatted_address
     * with the canonical Nominatim result. The customer's typed
     * city/area/street are kept (so the customer sees what they typed) but
     * the canonical address is server-authoritative.
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        $user = $request->user();

        $address = $user->addresses()->create($request->validated());

        if (!$address->hasCoordinates()) {
            $this->geocodeAndAssignZone($address);
        } else {
            $this->reverseGeocodeAndStamp($address);
            $this->geoHelper->autoAssignZone($address);
        }
        $address->refresh();

        // If this is the first address or marked as default, set it as default
        if ($request->input('is_default', false) || $user->addresses()->count() === 1) {
            $address->setAsDefault();
            $address->refresh();
        }

        ActivityLog::log('address_created', $user->id, 'Address', $address->id);

        return response()->json([
            'success' => true,
            'message' => __('address.created'),
            'data' => $address->load('deliveryZone'),
        ], 201);
    }

    /**
     * Build address string from fields, forward-geocode it, save coordinates & assign zone.
     * Uses a fallback strategy: full address → area+city → city only.
     */
    private function geocodeAndAssignZone(Address $address): void
    {
        $result = $this->geocodeAddressFields($address);

        if ($result && isset($result['latitude'], $result['longitude'])) {
            $address->update([
                'latitude' => $result['latitude'],
                'longitude' => $result['longitude'],
                'formatted_address' => $address->formatted_address ?: ($result['formatted_address'] ?? null),
                'place_id' => $address->place_id ?: ($result['place_id'] ?? null),
            ]);

            // Now assign zone with the new coordinates
            $this->geoHelper->autoAssignZone($address);
        }
    }

    /**
     * Reverse-geocode the (client-supplied) coordinates server-side and
     * stamp formatted_address / place_id from the canonical result.
     *
     * Why: the client mobile app sends both `latitude/longitude` and
     * `formatted_address`. Trusting the client text means a customer in
     * an expensive zone can supply coordinates inside a cheap zone but
     * keep the formatted_address pointing at their real (expensive)
     * location. Driver follows the pin → wrong delivery, or customer
     * disputes the fee post-hoc. Server-side reverse-geocode resolves
     * the disagreement: pin and address text always describe the same
     * place.
     *
     * Failure handling: if Nominatim is unreachable we keep whatever the
     * client sent. The downside (slightly stale text) is acceptable; the
     * upside (we fail open instead of refusing every new address while
     * Nominatim is down) outweighs it.
     */
    private function reverseGeocodeAndStamp(Address $address): void
    {
        try {
            $result = $this->geoHelper->reverseGeocode(
                (float) $address->latitude,
                (float) $address->longitude
            );
        } catch (\Throwable $e) {
            $result = null;
        }

        if (! $result || empty($result['formatted_address'])) {
            return;
        }

        $address->forceFill([
            'formatted_address' => $result['formatted_address'],
            'place_id'          => $result['place_id'] ?? $address->place_id,
        ])->save();
    }

    /**
     * Try geocoding with progressively broader queries until one succeeds.
     */
    private function geocodeAddressFields(Address $address): ?array
    {
        // Strategy 1: Full address (street + area + city)
        $queries = [];
        $full = array_filter([$address->street, $address->area, $address->city, 'Egypt']);
        if (count($full) >= 3) {
            $queries[] = implode(', ', $full);
        }

        // Strategy 2: Area + City (skip possibly vague street)
        if ($address->area && $address->city) {
            $queries[] = implode(', ', [$address->area, $address->city, 'Egypt']);
        }

        // Strategy 3: Just city
        if ($address->city) {
            $queries[] = $address->city . ', Egypt';
        }

        foreach ($queries as $query) {
            $result = $this->geoHelper->forwardGeocode($query);
            if ($result && isset($result['latitude'], $result['longitude'])) {
                return $result;
            }
        }

        return null;
    }

    /**
     * Display the specified address.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $address,
        ]);
    }

    /**
     * Update the specified address.
     */
    public function update(UpdateAddressRequest $request, $id): JsonResponse
    {
        $user = $request->user();
        $address = $user->addresses()->findOrFail($id);

        $coordsChanged = $request->has('latitude') || $request->has('longitude');

        $address->update($request->validated());

        if ($address->hasCoordinates()) {
            // Slice 3: when the client edits coords, re-stamp the canonical
            // formatted_address from the server-side reverse-geocode so the
            // map pin and the displayed address can't drift apart.
            if ($coordsChanged) {
                $this->reverseGeocodeAndStamp($address);
            }
            $this->geoHelper->autoAssignZone($address);
        } else {
            $this->geocodeAndAssignZone($address);
        }

        // If marked as default, set it as default
        if ($request->input('is_default', false)) {
            $address->setAsDefault();
            $address->refresh();
        }

        ActivityLog::log('address_updated', $user->id, 'Address', $address->id);

        return response()->json([
            'success' => true,
            'message' => __('address.updated'),
            'data' => $address,
        ]);
    }

    /**
     * Remove the specified address.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $address = $user->addresses()->findOrFail($id);

        $wasDefault = $address->is_default;

        $address->delete();

        // If this was the default address, set the next one as default
        if ($wasDefault) {
            $nextAddress = $user->addresses()->first();
            if ($nextAddress) {
                $nextAddress->setAsDefault();
            }
        }

        ActivityLog::log('address_deleted', $user->id, 'Address', $id);

        return response()->json([
            'success' => true,
            'message' => __('address.deleted'),
        ]);
    }

    /**
     * Set the specified address as default.
     */
    public function setDefault(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $address = $user->addresses()->findOrFail($id);

        $address->setAsDefault();
        $address->refresh();

        ActivityLog::log('address_set_default', $user->id, 'Address', $address->id);

        return response()->json([
            'success' => true,
            'message' => __('address.default_set'),
            'data' => $address,
        ]);
    }
}
