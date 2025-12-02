# ElBaraka API Test Script
# PowerShell script to test authentication endpoints

$baseUrl = "http://127.0.0.1:8000/api/v1"

Write-Host "=== ElBaraka API Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register
Write-Host "Test 1: Register New User" -ForegroundColor Yellow
$registerBody = @{
    first_name = "John"
    last_name = "Doe"
    email = "john.doe.$(Get-Random)@example.com"
    phone = "+123456$(Get-Random -Minimum 1000 -Maximum 9999)"
    password = "password123"
    password_confirmation = "password123"
    language = "en"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✓ Registration successful" -ForegroundColor Green
    Write-Host "User ID: $($response.data.user.id)" -ForegroundColor Gray
    Write-Host "Email: $($response.data.user.email)" -ForegroundColor Gray
    Write-Host "Phone: $($response.data.user.phone)" -ForegroundColor Gray
    $testPhone = $response.data.user.phone
} catch {
    Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response
}

Write-Host ""
Write-Host "=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server is running at: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API Documentation: backend/AUTH_API_DOCS.md" -ForegroundColor Green
Write-Host ""
Write-Host "To check OTP codes, run:" -ForegroundColor Yellow
Write-Host "  Get-Content backend/storage/logs/laravel.log -Tail 20" -ForegroundColor Gray
