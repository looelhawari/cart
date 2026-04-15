@echo off
REM ============================================
REM CART - Create New EAS Project & Build AAB
REM ============================================

echo.
echo ==========================================
echo   CART - New EAS Project Setup
echo ==========================================
echo.

cd frontend

echo [Step 1/6] Checking EAS CLI installation...
call eas --version >nul 2>&1
if errorlevel 1 (
    echo EAS CLI not found. Installing...
    call npm install -g eas-cli
    echo.
) else (
    echo EAS CLI is installed.
    echo.
)

echo [Step 2/6] Checking EAS login status...
call eas whoami
if errorlevel 1 (
    echo.
    echo You need to login to EAS.
    echo.
    call eas login
)

echo.
echo [Step 3/6] Creating new EAS project...
echo This will create a new project under YOUR Expo account.
echo.
pause
call eas build:configure

echo.
echo [Step 4/6] Verifying .env configuration...
if not exist .env (
    echo WARNING: .env file not found!
    echo Creating .env with production settings...
    echo API_URL=https://cartshop.site/api/v1 > .env
    echo APP_ENV=production >> .env
    echo APP_NAME=CART >> .env
    echo.
) else (
    echo .env file found. Current configuration:
    type .env
    echo.
)

set /p CONFIRM_ENV="Is this the PRODUCTION API URL? (y/n): "
if /i not "%CONFIRM_ENV%"=="y" (
    echo.
    echo Please update .env file with your production API URL:
    echo   API_URL=https://your-domain.com/api/v1
    echo   APP_ENV=production
    echo.
    notepad .env
    echo.
    echo Press any key after saving the file...
    pause >nul
)

echo.
echo [Step 5/6] Building production AAB (Android App Bundle)...
echo This will take 15-20 minutes.
echo You will get a download link when complete.
echo.
pause
call eas build --platform android --profile production

echo.
echo [Step 6/6] Getting SHA-1 certificate fingerprint...
echo You need this for Google Cloud Console OAuth setup.
echo.
pause
call eas credentials --platform android

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo What you have now:
echo   1. New EAS project under YOUR account
echo   2. Production AAB file (download from link above)
echo   3. SHA-1 certificate (copy from output above)
echo.
echo Next steps:
echo   1. Download the AAB file from the link
echo   2. Copy your SHA-1 fingerprint
echo   3. Follow DEPLOYMENT_STEPS.md (starting from Step 8)
echo.
echo Your new project URL will be:
echo   https://expo.dev/accounts/YOUR-USERNAME/projects/CART-app
echo.
pause
