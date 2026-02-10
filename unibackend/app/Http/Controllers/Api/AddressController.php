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
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        $user = $request->user();

        $address = $user->addresses()->create($request->validated());

        // Auto-assign delivery zone based on coordinates
        if ($address->hasCoordinates()) {
            $this->geoHelper->autoAssignZone($address);
            $address->refresh();
        }

        // If this is the first address or marked as default, set it as default
        if ($request->input('is_default', false) || $user->addresses()->count() === 1) {
            $address->setAsDefault();
            $address->refresh();
        }

        ActivityLog::log('address_created', $user->id, 'Address', $address->id);

        return response()->json([
            'success' => true,
            'message' => 'Address created successfully',
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

        $address->update($request->validated());

        // Re-assign delivery zone if coordinates changed
        if ($request->has('latitude') || $request->has('longitude')) {
            if ($address->hasCoordinates()) {
                $this->geoHelper->autoAssignZone($address);
            }
        }

        // If marked as default, set it as default
        if ($request->input('is_default', false)) {
            $address->setAsDefault();
            $address->refresh();
        }

        ActivityLog::log('address_updated', $user->id, 'Address', $address->id);

        return response()->json([
            'success' => true,
            'message' => 'Address updated successfully',
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
            'message' => 'Address deleted successfully',
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
            'message' => 'Default address set successfully',
            'data' => $address,
        ]);
    }
}
