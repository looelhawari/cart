<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Cloudinary\Api\Upload\UploadApi;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CloudinaryService
{
    protected $cloudinary;
    protected $uploadApi;

    public function __construct()
    {
        $this->cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => config('cloudinary.cloud_name'),
                'api_key' => config('cloudinary.api_key'),
                'api_secret' => config('cloudinary.api_secret'),
            ],
            'url' => [
                'secure' => config('cloudinary.secure', true),
            ],
        ]);

        $this->uploadApi = new UploadApi();
    }

    /**
     * Upload an image to Cloudinary
     *
     * @param UploadedFile $file
     * @param string $folder
     * @param array $options
     * @return array
     */
    public function uploadImage(UploadedFile $file, string $folder = 'avatars', array $options = []): array
    {
        try {
            $defaultOptions = [
                'folder' => config('cloudinary.folder') . '/' . $folder,
                'resource_type' => 'image',
                'transformation' => [
                    'width' => 500,
                    'height' => 500,
                    'crop' => 'fill',
                    'gravity' => 'face',
                    'quality' => 'auto',
                    'fetch_format' => 'auto',
                ],
            ];

            $uploadOptions = array_merge($defaultOptions, $options);

            $result = $this->uploadApi->upload(
                $file->getRealPath(),
                $uploadOptions
            );

            return [
                'success' => true,
                'public_id' => $result['public_id'],
                'url' => $result['secure_url'],
                'width' => $result['width'],
                'height' => $result['height'],
                'format' => $result['format'],
            ];
        } catch (\Exception $e) {
            Log::error('Cloudinary upload failed: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Upload a file to Cloudinary (images or PDFs).
     *
     * @param UploadedFile $file
     * @param string $folder
     * @param string $resourceType
     * @return array
     */
    public function uploadFile(UploadedFile $file, string $folder = 'complaints', string $resourceType = 'auto'): array
    {
        try {
            $extension = strtolower($file->getClientOriginalExtension());
            $resolvedResourceType = $resourceType;

            if ($resourceType === 'auto') {
                $resolvedResourceType = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)
                    ? 'image'
                    : 'raw';
            }

            $publicId = (string) Str::uuid();

            $uploadOptions = [
                'folder' => config('cloudinary.folder') . '/' . $folder,
                'resource_type' => $resolvedResourceType,
                'public_id' => $publicId,
                'use_filename' => false,
                'unique_filename' => false,
                'overwrite' => false,
            ];

            $result = $this->uploadApi->upload(
                $file->getRealPath(),
                $uploadOptions
            );

            return [
                'success' => true,
                'public_id' => $result['public_id'] ?? $publicId,
                'url' => $result['secure_url'] ?? null,
                'resource_type' => $result['resource_type'] ?? $resolvedResourceType,
                'format' => $result['format'] ?? $extension,
                'bytes' => $result['bytes'] ?? $file->getSize(),
            ];
        } catch (\Exception $e) {
            Log::error('Cloudinary upload failed: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete an image from Cloudinary by public_id
     *
     * @param string $publicId
     * @return array
     */
    public function deleteImage(string $publicId): array
    {
        try {
            $result = $this->uploadApi->destroy($publicId, [
                'resource_type' => 'image',
            ]);

            return [
                'success' => $result['result'] === 'ok',
                'result' => $result['result'],
            ];
        } catch (\Exception $e) {
            Log::error('Cloudinary delete failed: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extract public_id from Cloudinary URL
     *
     * @param string $url
     * @return string|null
     */
    public function getPublicIdFromUrl(string $url): ?string
    {
        // Extract public_id from Cloudinary URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
        // Returns: folder/image

        preg_match('/\/v\d+\/(.+)\.\w+$/', $url, $matches);

        return $matches[1] ?? null;
    }

    /**
     * Get optimized image URL
     *
     * @param string $publicId
     * @param array $transformations
     * @return string
     */
    public function getOptimizedUrl(string $publicId, array $transformations = []): string
    {
        $defaultTransformations = [
            'quality' => 'auto',
            'fetch_format' => 'auto',
        ];

        $options = array_merge($defaultTransformations, $transformations);

        return $this->cloudinary->image($publicId)->toUrl($options);
    }
}
