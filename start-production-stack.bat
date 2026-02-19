@echo off
REM =========================================
REM ElBaraka Production Stack Launcher
REM Nginx + PHP-CGI (FastCGI) + Redis
REM =========================================
echo [ElBaraka] Starting production stack...

REM Kill any existing processes
taskkill /F /IM nginx.exe 2>nul
taskkill /F /IM php-cgi.exe 2>nul
timeout /t 1 /nobreak >nul

REM Ensure Redis is running
echo [ElBaraka] Checking Redis...
C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-cli.exe ping >nul 2>&1
if errorlevel 1 (
    echo [ElBaraka] Starting Redis...
    start "" /B C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-server.exe C:\laragon\bin\redis\redis-x64-5.0.14.1\redis.windows.conf
    timeout /t 2 /nobreak >nul
)

REM Create tmp directory for Nginx
if not exist "C:\laragon\tmp\nginx-cache" mkdir "C:\laragon\tmp\nginx-cache"

REM Start PHP-CGI on port 9001 (with max children)
echo [ElBaraka] Starting PHP-CGI FastCGI on port 9001...
set PHP_FCGI_MAX_REQUESTS=10000
set PHP_FCGI_CHILDREN=8
start "" /B C:\laragon\bin\php\php-8.3.16-Win32-vs16-x64\php-cgi.exe -b 127.0.0.1:9001

timeout /t 1 /nobreak >nul

REM Start Nginx
echo [ElBaraka] Starting Nginx on port 8000...
cd /d C:\laragon\bin\nginx\nginx-1.27.4
start "" /B nginx.exe

timeout /t 1 /nobreak >nul

REM Verify
echo.
echo [ElBaraka] Verifying services...
C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-cli.exe ping
curl -s -o nul -w "Nginx+PHP: HTTP %%{http_code}\n" http://localhost:8000/api/health

echo.
echo [ElBaraka] Production stack is running!
echo   - Nginx:    http://localhost:8000 (API)
echo   - PHP-CGI:  127.0.0.1:9001 (FastCGI, 8 workers)
echo   - Redis:    127.0.0.1:6379
echo   - MySQL:    127.0.0.1:3306
echo.
echo Press any key to stop all services...
pause >nul

REM Cleanup
echo [ElBaraka] Stopping services...
taskkill /F /IM nginx.exe 2>nul
taskkill /F /IM php-cgi.exe 2>nul
echo [ElBaraka] Stopped.
