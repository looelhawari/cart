@echo off
REM ============================================
REM CART Hypermarket - Production Build Script
REM ============================================

echo.
echo ==========================================
echo   CART Production APK Builder
echo ==========================================
echo.

cd frontend

echo [1/5] Checking environment...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with production API_URL
    pause
    exit /b 1
)

echo.
echo Current .env configuration:
type .env
echo.
echo.

set /p CONFIRM="Is the API_URL set to PRODUCTION? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo.
    echo Please update .env file with production URL:
    echo API_URL=https://cartshop.site/api/v1
    echo APP_ENV=production
    pause
    exit /b 1
)

echo.
echo [2/5] Checking EAS CLI...
call eas --version >nul 2>&1
if errorlevel 1 (
    echo EAS CLI not found. Installing...
    call npm install -g eas-cli
)

echo.
echo [3/5] Logging into EAS...
call eas whoami
if errorlevel 1 (
    echo Please login to EAS:
    call eas login
)

echo.
echo [4/5] Building production APK...
echo This will take 10-20 minutes...
echo.

set /p BUILD_TYPE="Build AAB (for Play Store) or APK? (aab/apk): "
if /i "%BUILD_TYPE%"=="aab" (
    echo Building AAB...
    call eas build --platform android --profile production
) else (
    echo Building APK...
    call eas build --platform android --profile production-apk
)

echo.
echo [5/5] Getting SHA-1 certificate fingerprint...
echo.
echo Please copy these values for Google Cloud Console:
echo.
call eas credentials --platform android

echo.
echo ==========================================
echo   Build Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Download the APK/AAB from the link above
echo 2. Copy the SHA-1 fingerprint
echo 3. Follow the guide in PRODUCTION_APK_COMPLETE_GUIDE.md
echo.
pause
