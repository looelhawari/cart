<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cloudinary Configuration
    |--------------------------------------------------------------------------
    |
    | Here you can configure your Cloudinary credentials and settings.
    | Get your credentials from https://cloudinary.com/console
    |
    */

    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
    'api_key' => env('CLOUDINARY_API_KEY'),
    'api_secret' => env('CLOUDINARY_API_SECRET'),
    'secure' => env('CLOUDINARY_SECURE', true),

    /*
    |--------------------------------------------------------------------------
    | Upload Settings
    |--------------------------------------------------------------------------
    |
    | Configure default upload settings for Cloudinary uploads
    |
    */

    'upload_preset' => env('CLOUDINARY_UPLOAD_PRESET', ''),
    'folder' => env('CLOUDINARY_FOLDER', 'elbaraka'),

    /*
    |--------------------------------------------------------------------------
    | Transformation Settings
    |--------------------------------------------------------------------------
    |
    | Default transformation settings for uploaded images
    |
    */

    'transformations' => [
        'avatar' => [
            'width' => 500,
            'height' => 500,
            'crop' => 'fill',
            'gravity' => 'face',
            'quality' => 'auto',
            'fetch_format' => 'auto',
        ],
    ],
];
