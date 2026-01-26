<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ComplaintFavoriteSeeder extends Seeder
{
    /**
     * Seed complaints, complaint messages/attachments, and favorites for user_id=2.
     */
    public function run(): void
    {
        $now = now();

        // Ensure user_id=2 exists for testing.
        DB::table('users')->updateOrInsert(
            ['id' => 2],
            [
                'first_name' => 'Seed',
                'last_name' => 'User',
                'email' => 'seed.user2@example.com',
                'phone' => '+201000000002',
                'password' => bcrypt('Password123!'),
                'language' => 'en',
                'role' => 'customer',
                'is_active' => 1,
                'is_verified' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        // Favorites for user_id=2 (use common product barcodes from schema seeds).
        $favoriteProducts = [1001, 2001, 3001, 5003];
        $favoriteTimestamps = ['created_at' => $now];
        if (Schema::hasColumn('favorites', 'updated_at')) {
            $favoriteTimestamps['updated_at'] = $now;
        }

        foreach ($favoriteProducts as $barcode) {
            DB::table('favorites')->updateOrInsert(
                ['user_id' => 2, 'product_id' => $barcode],
                $favoriteTimestamps
            );
        }

        // Complaint 1
        $ticketOne = 'TKT-' . now()->format('Ymd') . '-000002';
        DB::table('complaints')->updateOrInsert(
            ['ticket_number' => $ticketOne],
            [
                'user_id' => 2,
                'order_id' => null,
                'subject' => 'Damaged Product Received',
                'category' => 'product_quality',
                'priority' => 'high',
                'status' => 'in_progress',
                'description' => 'The milk carton was leaking on arrival.',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        $complaintId = DB::table('complaints')
            ->where('ticket_number', $ticketOne)
            ->value('id');

        $messages = [
            [
                'complaint_id' => $complaintId,
                'user_id' => 2,
                'message' => 'I received a damaged product in my last order.',
                'is_admin_reply' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'complaint_id' => $complaintId,
                'user_id' => 2,
                'message' => 'Please advise on the next steps.',
                'is_admin_reply' => 0,
                'created_at' => $now->copy()->addMinutes(5),
                'updated_at' => $now->copy()->addMinutes(5),
            ],
        ];

        foreach ($messages as $msg) {
            $exists = DB::table('complaint_messages')
                ->where('complaint_id', $msg['complaint_id'])
                ->where('message', $msg['message'])
                ->exists();

            if (!$exists) {
                DB::table('complaint_messages')->insert($msg);
            }
        }

        $attachmentRows = [
            [
                'complaint_id' => $complaintId,
                'user_id' => 2,
                'file_name' => 'damaged-milk.jpg',
                'file_path' => 'https://res.cloudinary.com/demo/image/upload/v1/complaints/damaged-milk.jpg',
                'file_type' => 'image',
                'mime_type' => 'image/jpeg',
                'size_bytes' => 245891,
                'file_size' => 245891,
                'storage_provider' => 'cloudinary',
                'public_id' => 'complaints/' . Str::uuid(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'complaint_id' => $complaintId,
                'user_id' => 2,
                'file_name' => 'invoice.pdf',
                'file_path' => 'https://res.cloudinary.com/demo/raw/upload/v1/complaints/invoice.pdf',
                'file_type' => 'pdf',
                'mime_type' => 'application/pdf',
                'size_bytes' => 512000,
                'file_size' => 512000,
                'storage_provider' => 'cloudinary',
                'public_id' => 'complaints/' . Str::uuid(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        $attachmentColumns = Schema::getColumnListing('complaint_attachments');
        $attachmentRows = array_map(function (array $row) use ($attachmentColumns) {
            return array_filter(
                $row,
                fn ($key) => in_array($key, $attachmentColumns, true),
                ARRAY_FILTER_USE_KEY
            );
        }, $attachmentRows);

        foreach ($attachmentRows as $attachment) {
            $exists = DB::table('complaint_attachments')
                ->where('complaint_id', $attachment['complaint_id'])
                ->where('file_name', $attachment['file_name'])
                ->exists();

            if (!$exists) {
                DB::table('complaint_attachments')->insert($attachment);
            }
        }

        // Complaint 2
        $ticketTwo = 'TKT-' . now()->format('Ymd') . '-000003';
        DB::table('complaints')->updateOrInsert(
            ['ticket_number' => $ticketTwo],
            [
                'user_id' => 2,
                'order_id' => null,
                'subject' => 'Late Delivery',
                'category' => 'delivery_problem',
                'priority' => 'medium',
                'status' => 'open',
                'description' => 'Order arrived 2 hours late.',
                'created_at' => $now->copy()->subDay(),
                'updated_at' => $now->copy()->subDay(),
            ]
        );
    }
}
