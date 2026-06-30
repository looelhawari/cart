<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Http\Requests\Address\UpdateAddressRequest;
use App\Models\ActivityLog;
use App\Services\AddressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    private AddressService $addressService;

    public function __construct(AddressService $addressService)
    {
        $this->addressService = $addressService;
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

        $address = $this->addressService->createForUser($user, $request->validated());

        ActivityLog::log('address_created', $user->id, 'Address', $address->id);

        return response()->json([
            'success' => true,
            'message' => __('address.created'),
            'data' => $address->load('deliveryZone'),
        ], 201);
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

        $address = $this->addressService->updateAddress(
            $address,
            $request->validated(),
            $coordsChanged,
            $request->boolean('is_default')
        );

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
