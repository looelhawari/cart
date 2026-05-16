<?php

namespace Database\Seeders;

use App\Models\StoreSetting;
use Illuminate\Database\Seeder;

/**
 * Seeds the canonical `store_settings` keys that the admin Settings page
 * and the customer-facing /store/* endpoints both read from.
 *
 * Idempotent — uses updateOrCreate so re-running on a populated DB only
 * fills in *missing* keys with defaults and never overwrites operator
 * choices.
 *
 * Wired into DatabaseSeeder so fresh deploys never hit the previous
 * "store_settings table is empty -> admin save 422s -> customer endpoint
 * returns defaults instead of stored values" failure mode.
 */
class StoreSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Delivery & order economics
            ['key' => 'minimum_order_amount',      'value' => '50',    'type' => 'number',  'category' => 'delivery'],
            ['key' => 'delivery_fee',              'value' => '20',    'type' => 'number',  'category' => 'delivery'],
            ['key' => 'free_delivery_threshold',   'value' => '200',   'type' => 'number',  'category' => 'delivery'],

            // Working hours (24h format strings; opening time stored as "HH:MM")
            ['key' => 'opening_time',              'value' => '08:00', 'type' => 'time',    'category' => 'hours'],
            ['key' => 'closing_time',              'value' => '00:00', 'type' => 'time',    'category' => 'hours'],
            ['key' => 'accept_orders_outside_hours','value' => 'false','type' => 'boolean', 'category' => 'hours'],
            ['key' => 'store_temporarily_closed',  'value' => 'false', 'type' => 'boolean', 'category' => 'hours'],
            ['key' => 'closure_message_en',        'value' => '',      'type' => 'string',  'category' => 'hours'],
            ['key' => 'closure_message_ar',        'value' => '',      'type' => 'string',  'category' => 'hours'],
        ];

        foreach ($defaults as $row) {
            StoreSetting::updateOrCreate(
                ['key' => $row['key']],
                [
                    // updateOrCreate only fills the value/type/etc. when the
                    // row is being CREATED. If it already exists we leave
                    // operator-set values intact — which is why we don't
                    // include 'value' on the update side of updateOrCreate.
                    'type'     => $row['type'],
                    'category' => $row['category'],
                    'is_public'=> true,
                    // value only on first-create; further updates don't touch it.
                    'value'    => StoreSetting::where('key', $row['key'])->value('value') ?? $row['value'],
                ]
            );
        }

        StoreSetting::clearCache();
    }
}
