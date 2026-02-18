# 🚀 ElBaraka — Production Server Performance Guide

> **Complete step-by-step instructions to deploy and optimize ElBaraka for maximum performance on a production Linux server (Ubuntu/Debian).**

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Initial Server Setup](#2-initial-server-setup)
3. [Install PHP 8.2 + Extensions](#3-install-php-82--extensions)
4. [Install & Configure Nginx](#4-install--configure-nginx)
5. [Install & Configure MySQL 8](#5-install--configure-mysql-8)
6. [Install & Configure Redis](#6-install--configure-redis)
7. [Deploy Laravel Application](#7-deploy-laravel-application)
8. [PHP-FPM Tuning](#8-php-fpm-tuning)
9. [Laravel Production Optimizations](#9-laravel-production-optimizations)
10. [OPcache Configuration](#10-opcache-configuration)
11. [MySQL Performance Tuning](#11-mysql-performance-tuning)
12. [Redis Cache Configuration](#12-redis-cache-configuration)
13. [Nginx Performance Tuning](#13-nginx-performance-tuning)
14. [Queue Workers & Supervisor](#14-queue-workers--supervisor)
15. [SSL/TLS with Certbot](#15-ssltls-with-certbot)
16. [CDN & Image Optimization](#16-cdn--image-optimization)
17. [Monitoring & Logging](#17-monitoring--logging)
18. [Security Hardening](#18-security-hardening)
19. [Automated Deployment Script](#19-automated-deployment-script)
20. [Performance Verification Checklist](#20-performance-verification-checklist)

---

## 1. Server Requirements

| Resource    | Minimum          | Recommended      |
| ----------- | ---------------- | ---------------- |
| **CPU**     | 2 vCPUs          | 4 vCPUs          |
| **RAM**     | 4 GB             | 8 GB             |
| **Storage** | 40 GB SSD        | 80 GB NVMe SSD   |
| **OS**      | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **Network** | 1 Gbps           | 1 Gbps+          |

**Recommended providers:** DigitalOcean, Hetzner, AWS EC2, Azure VM, Vultr

---

## 2. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Set timezone
sudo timedatectl set-timezone Africa/Cairo

# Install essential tools
sudo apt install -y curl wget git unzip htop software-properties-common ufw

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Create deploy user (don't run app as root)
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo su - deploy
```

---

## 3. Install PHP 8.2 + Extensions

```bash
# Add PHP repository
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.2 with all required extensions
sudo apt install -y \
  php8.2-fpm \
  php8.2-cli \
  php8.2-mysql \
  php8.2-pgsql \
  php8.2-redis \
  php8.2-curl \
  php8.2-gd \
  php8.2-mbstring \
  php8.2-xml \
  php8.2-zip \
  php8.2-bcmath \
  php8.2-intl \
  php8.2-opcache \
  php8.2-readline \
  php8.2-tokenizer \
  php8.2-fileinfo

# Verify installation
php -v
php -m | grep -i redis
```

---

## 4. Install & Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/elbaraka
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    root /var/www/elbaraka/public;
    index index.php;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/json
        application/javascript
        text/css
        text/plain
        text/xml
        application/xml
        image/svg+xml;

    # Client body size (for file uploads)
    client_max_body_size 20M;

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff2|woff|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Laravel routing
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_read_timeout 60;
    }

    # Deny access to dotfiles
    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

```bash
# Enable site and restart
sudo ln -s /etc/nginx/sites-available/elbaraka /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Install & Configure MySQL 8

```bash
# Install MySQL 8
sudo apt install -y mysql-server

# Secure installation
sudo mysql_secure_installation
# → Set root password
# → Remove anonymous users: YES
# → Disallow root login remotely: YES
# → Remove test database: YES
# → Reload privilege tables: YES

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE elbaraka_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'elbaraka'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON elbaraka_production.* TO 'elbaraka'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 6. Install & Configure Redis

> **This is CRITICAL.** Without Redis running, every cached API call falls back to file cache with significantly higher latency.

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Key Redis settings to change:**

```ini
# Bind to localhost only (security)
bind 127.0.0.1 ::1

# Set password
requirepass YOUR_REDIS_PASSWORD_HERE

# Memory limit (set to 25% of RAM)
maxmemory 2gb

# Eviction policy — remove least recently used keys when memory is full
maxmemory-policy allkeys-lru

# Disable snapshotting for pure cache use (faster)
# Comment out all "save" lines:
# save 900 1
# save 300 10
# save 60 10000

# Enable lazy freeing (non-blocking deletes)
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes

# TCP keepalive
tcp-keepalive 300
```

```bash
# Restart Redis and enable on boot
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli -a YOUR_REDIS_PASSWORD_HERE ping
# Should return: PONG
```

---

## 7. Deploy Laravel Application

```bash
# Create web directory
sudo mkdir -p /var/www/elbaraka
sudo chown deploy:deploy /var/www/elbaraka

# Clone repository
cd /var/www/elbaraka
git clone YOUR_REPO_URL .

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install dependencies (no dev packages in production)
composer install --no-dev --optimize-autoloader --no-interaction

# Copy and configure environment
cp .env.example .env
nano .env
```

**Critical `.env` settings for production:**

```env
APP_NAME=ElBaraka
APP_ENV=production
APP_KEY=  # Generate with: php artisan key:generate
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elbaraka_production
DB_USERNAME=elbaraka
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# ── CRITICAL CACHE SETTINGS ──
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_LIFETIME=120
SESSION_ENCRYPT=true

# Redis
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE
REDIS_PORT=6379

# Logging
LOG_CHANNEL=daily
LOG_LEVEL=warning
LOG_DEPRECATIONS_CHANNEL=null
```

```bash
# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate --force

# Set permissions
sudo chown -R deploy:www-data /var/www/elbaraka
sudo chmod -R 775 /var/www/elbaraka/storage
sudo chmod -R 775 /var/www/elbaraka/bootstrap/cache

# Create storage link
php artisan storage:link
```

---

## 8. PHP-FPM Tuning

```bash
sudo nano /etc/php/8.2/fpm/pool.d/www.conf
```

**Optimized settings:**

```ini
; Process manager — use 'static' for predictable load, 'dynamic' for variable load
pm = dynamic

; Max children — calculate: Available RAM / avg PHP process size (~40MB)
; For 8GB RAM: (8192 - 2048 for OS/MySQL/Redis) / 40 = ~150
pm.max_children = 100

; Start servers — 25% of max_children
pm.start_servers = 25

; Min spare — 10% of max_children
pm.min_spare_servers = 10

; Max spare — 30% of max_children
pm.max_spare_servers = 30

; Max requests before recycling (prevents memory leaks)
pm.max_requests = 1000

; Request timeout
request_terminate_timeout = 60s

; Slow log (identify slow scripts)
slowlog = /var/log/php-fpm/slow.log
request_slowlog_timeout = 5s
```

```bash
sudo mkdir -p /var/log/php-fpm
sudo systemctl restart php8.2-fpm
```

---

## 9. Laravel Production Optimizations

> **Run these commands EVERY TIME you deploy new code.**

```bash
cd /var/www/elbaraka

# ── Step 1: Cache all configuration into a single file ──
# This eliminates reading ~20 config files per request
php artisan config:cache

# ── Step 2: Cache all routes into a single file ──
# This eliminates route registration overhead
php artisan route:cache

# ── Step 3: Cache all Blade views ──
php artisan view:cache

# ── Step 4: Cache events & listeners ──
php artisan event:cache

# ── Step 5: Optimize Composer autoloader ──
# Generates a classmap for faster class loading
composer dump-autoload --optimize --no-dev

# ── Step 6: Clear old application cache ──
php artisan cache:clear

# ── Step 7: Restart queue workers (if running) ──
php artisan queue:restart
```

**Create a deploy script** (`/var/www/elbaraka/deploy.sh`):

```bash
#!/bin/bash
set -e

echo "🚀 Deploying ElBaraka..."

cd /var/www/elbaraka

# Pull latest code
git pull origin main

# Install dependencies
composer install --no-dev --optimize-autoloader --no-interaction

# Run migrations
php artisan migrate --force

# Clear and rebuild all caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan cache:clear

# Restart services
php artisan queue:restart
sudo systemctl restart php8.2-fpm

echo "✅ Deployment complete!"
```

```bash
chmod +x /var/www/elbaraka/deploy.sh
```

---

## 10. OPcache Configuration

> **OPcache is the single biggest performance improvement for PHP.** It caches compiled PHP bytecode in shared memory, eliminating the need to parse and compile PHP files on every request.

```bash
sudo nano /etc/php/8.2/fpm/conf.d/10-opcache.ini
```

```ini
[opcache]
; Enable OPcache
opcache.enable=1

; Memory for storing compiled scripts (MB)
opcache.memory_consumption=256

; Max number of scripts to cache
opcache.max_accelerated_files=20000

; Don't check file timestamps in production (faster)
; Set to 0 — you MUST restart PHP-FPM after deploying new code
opcache.validate_timestamps=0

; Interned strings buffer (MB)
opcache.interned_strings_buffer=16

; Enable file-based cache for warm restarts
opcache.file_cache=/tmp/opcache

; JIT compilation (PHP 8.2+)
opcache.jit=1255
opcache.jit_buffer_size=128M

; Save comments (required for Laravel)
opcache.save_comments=1

; Fast shutdown
opcache.fast_shutdown=1

; Enable CLI OPcache (for artisan commands)
opcache.enable_cli=1
```

```bash
sudo systemctl restart php8.2-fpm
```

**⚠️ IMPORTANT:** After every deployment, restart PHP-FPM to clear OPcache:

```bash
sudo systemctl restart php8.2-fpm
```

---

## 11. MySQL Performance Tuning

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

**Add/modify these settings:**

```ini
[mysqld]
# ── InnoDB Buffer Pool ──
# Set to 70% of available RAM dedicated to MySQL
# For 8GB total, ~4GB for MySQL: 70% = ~2.8GB
innodb_buffer_pool_size = 2G
innodb_buffer_pool_instances = 4

# ── InnoDB Log ──
innodb_log_file_size = 512M
innodb_log_buffer_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# ── Query Cache (MySQL 5.7 only — disabled in 8.0+) ──
# query_cache_type = 1
# query_cache_size = 128M

# ── Connection Settings ──
max_connections = 200
wait_timeout = 300
interactive_timeout = 300

# ── Thread Pool ──
thread_cache_size = 32

# ── Temp Tables ──
tmp_table_size = 64M
max_heap_table_size = 64M

# ── Sort & Join Buffers ──
sort_buffer_size = 4M
join_buffer_size = 4M
read_rnd_buffer_size = 4M

# ── Slow Query Log ──
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1

# ── Binary Log (if replication needed) ──
# binlog_expire_logs_seconds = 604800
# max_binlog_size = 100M

# ── Performance Schema ──
performance_schema = ON

# ── Character Set ──
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```bash
sudo systemctl restart mysql

# Verify settings
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

---

## 12. Redis Cache Configuration

### Laravel Redis Configuration

In your production `.env`, these should be set:

```env
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE
REDIS_PORT=6379
```

### Monitor Redis Performance

```bash
# Real-time monitoring
redis-cli -a YOUR_REDIS_PASSWORD_HERE monitor

# Check memory usage
redis-cli -a YOUR_REDIS_PASSWORD_HERE info memory

# Check cache hit rate
redis-cli -a YOUR_REDIS_PASSWORD_HERE info stats | grep keyspace

# Check connected clients
redis-cli -a YOUR_REDIS_PASSWORD_HERE info clients
```

### Verify Cache is Working

```bash
cd /var/www/elbaraka

# Test cache
php artisan tinker
>>> Cache::put('test', 'working', 60);
>>> Cache::get('test');
# Should return: "working"
```

---

## 13. Nginx Performance Tuning

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
worker_processes auto;  # Auto-detect CPU cores
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;  # Hide Nginx version

    # Buffer sizes
    client_body_buffer_size 16K;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    # File cache
    open_file_cache max=10000 inactive=30s;
    open_file_cache_valid 60s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Rate limiting (API protection)
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # Gzip (already in server block, but global here too)
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types application/json text/plain text/css application/javascript;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**Add rate limiting to your API routes** in the site config:

```nginx
# In your server block:
location /api/ {
    limit_req zone=api burst=60 nodelay;
    try_files $uri $uri/ /index.php?$query_string;
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 14. Queue Workers & Supervisor

> **Supervisor keeps your Laravel queue workers running permanently.**

```bash
# Install Supervisor
sudo apt install -y supervisor

# Create worker configuration
sudo nano /etc/supervisor/conf.d/elbaraka-worker.conf
```

```ini
[program:elbaraka-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --max-jobs=500
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=deploy
numprocs=4
redirect_stderr=true
stdout_logfile=/var/log/supervisor/elbaraka-worker.log
stdout_logfile_maxbytes=10MB
stopwaitsecs=3600
```

```bash
# Reload and start
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start elbaraka-worker:*

# Check status
sudo supervisorctl status
```

---

## 15. SSL/TLS with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal (already set up by certbot, verify with)
sudo certbot renew --dry-run

# Add HTTP/2 support — edit your nginx site config:
# Change: listen 443 ssl;
# To:     listen 443 ssl http2;
sudo nano /etc/nginx/sites-available/elbaraka
```

Modify the SSL server block:

```nginx
listen 443 ssl http2;

# HSTS (force HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Modern SSL settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 16. CDN & Image Optimization

### Option A: Cloudflare (Free — Recommended)

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your registrar
4. Enable these settings:
   - **Auto Minify:** JS, CSS, HTML
   - **Brotli:** ON
   - **Always Use HTTPS:** ON
   - **Browser Cache TTL:** 1 month
   - **Caching Level:** Standard
   - **Polish:** Lossy (Pro plan)
   - **Rocket Loader:** ON (carefully test)

### Option B: Image Optimization on Server

```bash
# Install image optimization tools
sudo apt install -y jpegoptim optipng pngquant webp

# Convert product images to WebP (smaller, faster)
# Add to your deploy script:
find /var/www/elbaraka/storage/app/public/products -name "*.jpg" -exec sh -c '
  cwebp -q 80 "$1" -o "${1%.jpg}.webp"
' _ {} \;

find /var/www/elbaraka/storage/app/public/products -name "*.png" -exec sh -c '
  cwebp -q 80 "$1" -o "${1%.png}.webp"
' _ {} \;
```

### Serve WebP with Nginx Fallback

```nginx
# In your server block:
location ~* \.(jpg|jpeg|png)$ {
    add_header Vary Accept;
    try_files $uri$webp_suffix $uri =404;
}

# In http block:
map $http_accept $webp_suffix {
    default "";
    "~*webp" ".webp";
}
```

---

## 17. Monitoring & Logging

### Server Monitoring

```bash
# Install Netdata (real-time monitoring dashboard)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# Access at: http://your-server-ip:19999
```

### Laravel Telescope (Development) / Pulse (Production)

```bash
# For production monitoring, use Laravel Pulse:
composer require laravel/pulse
php artisan vendor:publish --provider="Laravel\Pulse\PulseServiceProvider"
php artisan migrate

# Access at: https://yourdomain.com/pulse
# Add authentication in PulseServiceProvider
```

### Log Rotation

```bash
# Laravel already uses daily log channel
# Ensure logrotate handles PHP-FPM and Nginx logs:
sudo nano /etc/logrotate.d/elbaraka
```

```
/var/www/elbaraka/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
```

---

## 18. Security Hardening

```bash
# ── 1. Disable expose_php ──
sudo nano /etc/php/8.2/fpm/php.ini
# Set: expose_php = Off

# ── 2. Disable dangerous PHP functions ──
# In php.ini:
# disable_functions = exec,passthru,shell_exec,system,proc_open,popen

# ── 3. Set file permissions ──
cd /var/www/elbaraka
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod -R 775 storage bootstrap/cache

# ── 4. Protect .env file ──
chmod 600 .env

# ── 5. Install Fail2ban ──
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ── 6. Enable automatic security updates ──
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 19. Automated Deployment Script

Save this as `/var/www/elbaraka/deploy.sh`:

```bash
#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/elbaraka"
cd $APP_DIR

echo -e "${YELLOW}🚀 Starting ElBaraka deployment...${NC}"

# 1. Enable maintenance mode
echo -e "${YELLOW}[1/10] Enabling maintenance mode...${NC}"
php artisan down --retry=60

# 2. Pull latest code
echo -e "${YELLOW}[2/10] Pulling latest code...${NC}"
git pull origin main

# 3. Install dependencies
echo -e "${YELLOW}[3/10] Installing dependencies...${NC}"
composer install --no-dev --optimize-autoloader --no-interaction

# 4. Run migrations
echo -e "${YELLOW}[4/10] Running migrations...${NC}"
php artisan migrate --force

# 5. Clear caches
echo -e "${YELLOW}[5/10] Clearing old caches...${NC}"
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 6. Rebuild caches
echo -e "${YELLOW}[6/10] Building production caches...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 7. Optimize autoloader
echo -e "${YELLOW}[7/10] Optimizing autoloader...${NC}"
composer dump-autoload --optimize --no-dev

# 8. Restart queue workers
echo -e "${YELLOW}[8/10] Restarting queue workers...${NC}"
php artisan queue:restart

# 9. Restart PHP-FPM (clears OPcache)
echo -e "${YELLOW}[9/10] Restarting PHP-FPM...${NC}"
sudo systemctl restart php8.2-fpm

# 10. Disable maintenance mode
echo -e "${YELLOW}[10/10] Going live...${NC}"
php artisan up

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}   App is now live at: https://yourdomain.com${NC}"
```

```bash
chmod +x /var/www/elbaraka/deploy.sh

# Deploy with:
./deploy.sh
```

---

## 20. Performance Verification Checklist

After deployment, run through this checklist:

### ✅ Services Running

```bash
# Check all services are active
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
sudo systemctl status mysql
sudo systemctl status redis-server
sudo supervisorctl status
```

### ✅ Redis Connected

```bash
redis-cli -a YOUR_REDIS_PASSWORD_HERE ping
# Expected: PONG
```

### ✅ OPcache Active

```bash
php -r "var_dump(opcache_get_status(false)['opcache_enabled']);"
# Expected: bool(true)
```

### ✅ Laravel Caches Built

```bash
cd /var/www/elbaraka
php artisan config:show app.env
# Expected: production

php artisan route:list --count
# Should show cached routes

ls bootstrap/cache/
# Should contain: config.php, routes-v7.php, events.php
```

### ✅ API Response Times

```bash
# Test critical endpoints
time curl -s https://yourdomain.com/api/v1/categories > /dev/null
# Expected: < 100ms

time curl -s https://yourdomain.com/api/v1/products/featured > /dev/null
# Expected: < 150ms

time curl -s https://yourdomain.com/api/v1/products/flash-deals > /dev/null
# Expected: < 150ms

time curl -s https://yourdomain.com/api/v1/search/popular > /dev/null
# Expected: < 80ms
```

### ✅ Database Performance

```bash
mysql -u root -p -e "
  SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests';
  SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_reads';
  SHOW GLOBAL STATUS LIKE 'Threads_connected';
  SHOW GLOBAL STATUS LIKE 'Slow_queries';
"
```

### ✅ Memory Usage

```bash
# Overall memory
free -h

# PHP-FPM memory per process
ps -eo pid,rss,command | grep php-fpm | awk '{total+=$2; count++} END {print "Average:", total/count/1024, "MB per process"}'

# Redis memory
redis-cli -a YOUR_REDIS_PASSWORD_HERE info memory | grep used_memory_human
```

---

## 📊 Expected Performance Results

| Metric                     | Without Optimization | With Full Optimization |
| -------------------------- | -------------------- | ---------------------- |
| API response (categories)  | 3–5 seconds          | **< 50ms**             |
| API response (products)    | 2–4 seconds          | **< 80ms**             |
| Throughput (requests/sec)  | ~20                  | **500+**               |
| PHP memory per request     | ~30MB                | **< 10MB**             |
| Time to first byte (TTFB)  | 2–5 seconds          | **< 100ms**            |
| OPcache hit rate           | 0%                   | **99.9%**              |
| Redis cache hit rate       | 0%                   | **95%+**               |
| MySQL buffer pool hit rate | ~70%                 | **99%+**               |

---

## 🔄 Quick Reference — Commands You'll Use Often

```bash
# Deploy new code
./deploy.sh

# Check logs
tail -f storage/logs/laravel.log

# Clear cache
php artisan cache:clear

# Restart everything
sudo systemctl restart php8.2-fpm nginx redis-server mysql

# Monitor Redis
redis-cli -a YOUR_REDIS_PASSWORD_HERE info stats

# MySQL slow queries
sudo tail -f /var/log/mysql/slow.log

# PHP-FPM status
sudo systemctl status php8.2-fpm

# Queue status
sudo supervisorctl status

# Disk usage
df -h
```

---

> **Remember:** After EVERY deployment, you MUST run:
>
> 1. `php artisan config:cache`
> 2. `php artisan route:cache`
> 3. `sudo systemctl restart php8.2-fpm` (clears OPcache)
>
> Or simply run `./deploy.sh` which does all of this automatically.
