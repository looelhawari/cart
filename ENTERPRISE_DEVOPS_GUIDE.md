# 🏗️ El Baraka — Enterprise-Grade DevOps & Production Deployment Guide

> **Version:** 1.0 | **Date:** February 2026  
> **Scope:** Complete A-to-Z infrastructure, deployment, monitoring, security hardening, and operational runbooks  
> **Audience:** DevOps engineers, backend developers, system administrators  
> **System:** Laravel 11 API + React Native (Expo) Mobile Apps + React (Vite) Admin Dashboard

---

## Table of Contents

1. [Infrastructure Architecture Overview](#1-infrastructure-architecture)
2. [Domain & DNS Setup](#2-domain-dns)
3. [Server Provisioning (VPS)](#3-server-provisioning)
4. [System Dependencies Installation](#4-system-dependencies)
5. [MySQL Database Setup & Hardening](#5-mysql-setup)
6. [Redis Setup & Configuration](#6-redis-setup)
7. [Laravel Backend Deployment](#7-laravel-deployment)
8. [Nginx Reverse Proxy & SSL](#8-nginx-ssl)
9. [PHP-FPM Tuning](#9-php-fpm)
10. [Queue Workers & Scheduled Tasks](#10-queue-workers)
11. [File Storage & CDN](#11-file-storage-cdn)
12. [Admin Dashboard Deployment](#12-admin-dashboard)
13. [Mobile App Build & Release (EAS)](#13-mobile-app-build)
14. [Driver App Build & Release](#14-driver-app-build)
15. [CI/CD Pipeline (GitHub Actions)](#15-cicd)
16. [Environment Variables & Secrets Management](#16-env-secrets)
17. [Security Hardening Checklist](#17-security-hardening)
18. [Firewall & Network Security](#18-firewall)
19. [SSL/TLS Configuration](#19-ssl-tls)
20. [Monitoring & Alerting](#20-monitoring)
21. [Logging Strategy](#21-logging)
22. [Backup & Disaster Recovery](#22-backup-dr)
23. [Database Maintenance & Optimization](#23-db-maintenance)
24. [Horizontal Scaling Guide](#24-scaling)
25. [Load Testing](#25-load-testing)
26. [Incident Response Runbook](#26-incident-response)
27. [Rollback Procedures](#27-rollback)
28. [Cost Estimation](#28-cost)
29. [Maintenance Calendar](#29-maintenance-calendar)
30. [Production Readiness Checklist](#30-production-checklist)

---

## 1. Infrastructure Architecture Overview <a name="1-infrastructure-architecture"></a>

### Target Architecture (Single-Server Start → Multi-Server Scale)

```
                        ┌──────────────────────────────┐
                        │       Cloudflare CDN          │
                        │  - SSL termination            │
                        │  - DDoS protection            │
                        │  - Static asset caching       │
                        │  - WAF rules                  │
                        └──────────┬───────────────────┘
                                   │
                        ┌──────────▼───────────────────┐
                        │    VPS / Cloud Instance       │
                        │    (Ubuntu 22.04 LTS)         │
                        │                               │
                        │  ┌─────────────────────────┐  │
                        │  │  Nginx (Reverse Proxy)  │  │
                        │  │  - api.elbaraka.com     │  │
                        │  │  - admin.elbaraka.com   │  │
                        │  │  - Rate limiting         │  │
                        │  │  - Gzip compression     │  │
                        │  └──────────┬──────────────┘  │
                        │             │                  │
                        │  ┌──────────▼──────────────┐  │
                        │  │  PHP 8.2-FPM            │  │
                        │  │  (Laravel Application)  │  │
                        │  └──────────┬──────────────┘  │
                        │             │                  │
                        │  ┌──────────▼──────────────┐  │
                        │  │  Queue Worker (Horizon)  │  │
                        │  │  - Email sending         │  │
                        │  │  - Push notifications    │  │
                        │  │  - Invoice generation    │  │
                        │  └─────────────────────────┘  │
                        │                               │
                        │  ┌───────────┐ ┌───────────┐  │
                        │  │  MySQL 8  │ │  Redis 7  │  │
                        │  │ (Primary) │ │ (Cache +  │  │
                        │  │           │ │  Queue +  │  │
                        │  │           │ │  Session) │  │
                        │  └───────────┘ └───────────┘  │
                        └──────────────────────────────┘
                                   │
                        ┌──────────▼───────────────────┐
                        │  Object Storage (S3/R2)       │
                        │  - Product images             │
                        │  - Invoices (PDF)              │
                        │  - User uploads                │
                        └──────────────────────────────┘
```

### Component Map

| Component       | Domain                 | Technology             | Hosting                  |
| --------------- | ---------------------- | ---------------------- | ------------------------ |
| Customer API    | `api.elbaraka.com`     | Laravel 11 / PHP 8.2   | VPS (Nginx + PHP-FPM)    |
| Admin Dashboard | `admin.elbaraka.com`   | React + Vite (static)  | Nginx / Cloudflare Pages |
| Customer App    | App Store / Play Store | Expo / React Native    | EAS Build + OTA          |
| Driver App      | Internal Distribution  | Expo / React Native    | EAS Build (internal)     |
| Database        | Internal               | MySQL 8.0              | Same VPS (initially)     |
| Cache / Queue   | Internal               | Redis 7                | Same VPS (initially)     |
| File Storage    | `cdn.elbaraka.com`     | Cloudflare R2 / AWS S3 | Cloud                    |
| Email           | SMTP                   | Mailgun / AWS SES      | Cloud                    |

---

## 2. Domain & DNS Setup <a name="2-domain-dns"></a>

### 2.1 Purchase a Domain

Recommended registrars: **Namecheap**, **Cloudflare Registrar**, or **Google Domains**.

**Recommended domain:** `elbaraka.com` or `elbaraka.app`

### 2.2 DNS Records (Cloudflare)

```
Type    Name              Content              Proxy    TTL
──────────────────────────────────────────────────────────────
A       @                 YOUR_VPS_IP          Proxied  Auto
A       api               YOUR_VPS_IP          Proxied  Auto
A       admin             YOUR_VPS_IP          Proxied  Auto
CNAME   cdn               YOUR_R2_BUCKET.r2.dev  Proxied  Auto
CNAME   www               @                    Proxied  Auto
MX      @                 mx.mailgun.org       DNS Only 3600
TXT     @                 v=spf1 include:mailgun.org ~all  DNS Only  3600
```

### 2.3 Cloudflare Settings

```
SSL/TLS Mode:           Full (Strict)
Always Use HTTPS:       ON
Min TLS Version:        1.2
Automatic HTTPS:        ON
HSTS:                   ON (max-age=31536000, includeSubDomains)
Brotli:                 ON
Early Hints:            ON
HTTP/3 (QUIC):          ON
0-RTT Connection:       ON
Bot Fight Mode:         ON
```

### 2.4 Cloudflare Page Rules

```
Rule 1: api.elbaraka.com/api/*
  - Cache Level: Bypass
  - Disable Performance (no Rocket Loader on API)

Rule 2: cdn.elbaraka.com/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 week

Rule 3: admin.elbaraka.com/*
  - Security Level: High
  - Browser Integrity Check: ON
```

---

## 3. Server Provisioning (VPS) <a name="3-server-provisioning"></a>

### 3.1 Recommended Providers

| Provider          | Plan            | CPU    | RAM  | Storage     | Bandwidth | Price/mo |
| ----------------- | --------------- | ------ | ---- | ----------- | --------- | -------- |
| **DigitalOcean**  | Premium Droplet | 2 vCPU | 4 GB | 80 GB NVMe  | 4 TB      | $24      |
| **Hetzner**       | CPX21           | 3 vCPU | 4 GB | 80 GB NVMe  | 20 TB     | €8.49    |
| **AWS Lightsail** | Large           | 2 vCPU | 4 GB | 80 GB SSD   | 4 TB      | $20      |
| **Vultr**         | High Perf       | 2 vCPU | 4 GB | 100 GB NVMe | 4 TB      | $24      |

**Recommendation:** Start with **Hetzner CPX21** (best price/performance ratio).

### 3.2 Initial Server Setup

```bash
# ═══════════════════════════════════════════════════════════════
# STEP 1: SSH into your new server as root
# ═══════════════════════════════════════════════════════════════
ssh root@YOUR_VPS_IP

# ═══════════════════════════════════════════════════════════════
# STEP 2: Create a deploy user (NEVER run apps as root)
# ═══════════════════════════════════════════════════════════════
adduser deploy
usermod -aG sudo deploy

# ═══════════════════════════════════════════════════════════════
# STEP 3: Set up SSH key authentication for deploy user
# ═══════════════════════════════════════════════════════════════
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# ═══════════════════════════════════════════════════════════════
# STEP 4: Disable root login & password authentication
# ═══════════════════════════════════════════════════════════════
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# ═══════════════════════════════════════════════════════════════
# STEP 5: Update system
# ═══════════════════════════════════════════════════════════════
apt update && apt upgrade -y
apt install -y software-properties-common curl wget git unzip htop
```

### 3.3 Set Timezone & Locale

```bash
timedatectl set-timezone Africa/Cairo    # Match your target market
locale-gen en_US.UTF-8
update-locale LANG=en_US.UTF-8
```

### 3.4 Set Hostname

```bash
hostnamectl set-hostname elbaraka-prod
echo "127.0.0.1 elbaraka-prod" >> /etc/hosts
```

---

## 4. System Dependencies Installation <a name="4-system-dependencies"></a>

### 4.1 PHP 8.2 + Extensions

```bash
add-apt-repository ppa:ondrej/php -y
apt update

apt install -y \
    php8.2-fpm \
    php8.2-cli \
    php8.2-mysql \
    php8.2-redis \
    php8.2-curl \
    php8.2-xml \
    php8.2-mbstring \
    php8.2-zip \
    php8.2-gd \
    php8.2-bcmath \
    php8.2-intl \
    php8.2-soap \
    php8.2-opcache \
    php8.2-readline \
    php8.2-imagick

# Verify
php -v    # Should show PHP 8.2.x
```

### 4.2 Composer (PHP Package Manager)

```bash
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# Verify
composer --version
```

### 4.3 Nginx

```bash
apt install -y nginx

# Verify
nginx -v
systemctl enable nginx
systemctl start nginx
```

### 4.4 MySQL 8.0

```bash
apt install -y mysql-server-8.0

# Verify
mysql --version
systemctl enable mysql
systemctl start mysql
```

### 4.5 Redis 7

```bash
apt install -y redis-server

# Verify
redis-server --version
systemctl enable redis-server
systemctl start redis-server
```

### 4.6 Node.js 20 LTS (for admin dashboard build)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node -v    # v20.x.x
npm -v

# Install pnpm (optional but recommended)
npm install -g pnpm
```

### 4.7 Certbot (SSL)

```bash
apt install -y certbot python3-certbot-nginx
```

### 4.8 Supervisor (Process Manager)

```bash
apt install -y supervisor
systemctl enable supervisor
systemctl start supervisor
```

---

## 5. MySQL Database Setup & Hardening <a name="5-mysql-setup"></a>

### 5.1 Secure Installation

```bash
mysql_secure_installation
# Answer: Yes to all prompts
# Set a strong root password
```

### 5.2 Create Production Database & User

```sql
-- Connect as root
sudo mysql -u root -p

-- Create database
CREATE DATABASE elbaraka_prod
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Create application user (principle of least privilege)
CREATE USER 'elbaraka_app'@'localhost'
    IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';

-- Grant ONLY necessary privileges (no GRANT, no CREATE USER, no DROP DATABASE)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
    ON elbaraka_prod.*
    TO 'elbaraka_app'@'localhost';

-- Create read-only user for reporting/analytics
CREATE USER 'elbaraka_readonly'@'localhost'
    IDENTIFIED BY 'ANOTHER_STRONG_PASSWORD';

GRANT SELECT ON elbaraka_prod.* TO 'elbaraka_readonly'@'localhost';

FLUSH PRIVILEGES;
```

### 5.3 MySQL Configuration Tuning

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# ═══════════════════════════════════════════════════════════
# PERFORMANCE
# ═══════════════════════════════════════════════════════════
innodb_buffer_pool_size = 1G          # ~50% of RAM for DB-heavy server
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2    # Slight durability trade for perf
innodb_flush_method = O_DIRECT

# ═══════════════════════════════════════════════════════════
# CONNECTIONS
# ═══════════════════════════════════════════════════════════
max_connections = 200
wait_timeout = 300
interactive_timeout = 300

# ═══════════════════════════════════════════════════════════
# QUERY CACHE (MySQL 8 uses query result cache differently)
# ═══════════════════════════════════════════════════════════
tmp_table_size = 64M
max_heap_table_size = 64M

# ═══════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2                    # Log queries taking > 2 seconds
log_queries_not_using_indexes = 1

# ═══════════════════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════════════════
bind-address = 127.0.0.1              # Only local connections
local-infile = 0                       # Disable LOAD DATA LOCAL

# ═══════════════════════════════════════════════════════════
# CHARACTER SET
# ═══════════════════════════════════════════════════════════
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```bash
# Restart MySQL after config changes
systemctl restart mysql
```

### 5.4 Import Existing Schema

```bash
# From your local machine, export the schema
mysqldump -u root -p elbaraka_server --no-data > schema.sql
mysqldump -u root -p elbaraka_server --no-create-info > seed_data.sql

# Upload to server
scp schema.sql deploy@YOUR_VPS_IP:/tmp/
scp seed_data.sql deploy@YOUR_VPS_IP:/tmp/

# On server, import
mysql -u elbaraka_app -p elbaraka_prod < /tmp/schema.sql
mysql -u elbaraka_app -p elbaraka_prod < /tmp/seed_data.sql
```

---

## 6. Redis Setup & Configuration <a name="6-redis-setup"></a>

### 6.1 Configuration

Edit `/etc/redis/redis.conf`:

```conf
# ═══════════════════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════════════════
bind 127.0.0.1 ::1
requirepass YOUR_REDIS_PASSWORD
protected-mode yes

# ═══════════════════════════════════════════════════════════
# MEMORY
# ═══════════════════════════════════════════════════════════
maxmemory 512mb
maxmemory-policy allkeys-lru

# ═══════════════════════════════════════════════════════════
# PERSISTENCE (RDB snapshots)
# ═══════════════════════════════════════════════════════════
save 900 1
save 300 10
save 60 10000

# ═══════════════════════════════════════════════════════════
# AOF (Append-Only File for durability)
# ═══════════════════════════════════════════════════════════
appendonly yes
appendfsync everysec
```

```bash
systemctl restart redis-server

# Test connection
redis-cli -a YOUR_REDIS_PASSWORD ping    # Should return PONG
```

---

## 7. Laravel Backend Deployment <a name="7-laravel-deployment"></a>

### 7.1 Clone Repository

```bash
# Switch to deploy user
su - deploy

# Create application directory
sudo mkdir -p /var/www/elbaraka
sudo chown deploy:deploy /var/www/elbaraka

# Clone
cd /var/www
git clone https://github.com/YOUR_ORG/elbaraka-backend.git elbaraka
cd elbaraka
```

### 7.2 Install Dependencies

```bash
# Production install (no dev dependencies)
composer install --no-dev --optimize-autoloader --no-interaction
```

### 7.3 Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with production values:

```env
# ═══════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════
APP_NAME="El Baraka"
APP_ENV=production
APP_KEY=                                # Will be generated below
APP_DEBUG=false
APP_TIMEZONE=Africa/Cairo
APP_URL=https://api.elbaraka.com

# ═══════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elbaraka_prod
DB_USERNAME=elbaraka_app
DB_PASSWORD=YOUR_STRONG_PASSWORD

# ═══════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_PORT=6379

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# ═══════════════════════════════════════════════════════════
# MAIL (Mailgun example)
# ═══════════════════════════════════════════════════════════
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@mg.elbaraka.com
MAIL_PASSWORD=YOUR_MAILGUN_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@elbaraka.com
MAIL_FROM_NAME="El Baraka"

# ═══════════════════════════════════════════════════════════
# PAYMOB PAYMENT GATEWAY
# ═══════════════════════════════════════════════════════════
PAYMOB_API_KEY=YOUR_PAYMOB_API_KEY
PAYMOB_INTEGRATION_ID=YOUR_INTEGRATION_ID
PAYMOB_HMAC_SECRET=YOUR_HMAC_SECRET
PAYMOB_REDIRECT_URL=https://api.elbaraka.com/api/v1/payments/callback

# ═══════════════════════════════════════════════════════════
# PUSHER (Real-time notifications)
# ═══════════════════════════════════════════════════════════
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=YOUR_APP_ID
PUSHER_APP_KEY=YOUR_APP_KEY
PUSHER_APP_SECRET=YOUR_APP_SECRET
PUSHER_APP_CLUSTER=eu

# ═══════════════════════════════════════════════════════════
# FILE STORAGE
# ═══════════════════════════════════════════════════════════
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_R2_SECRET_KEY
AWS_DEFAULT_REGION=auto
AWS_BUCKET=elbaraka-assets
AWS_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
AWS_URL=https://cdn.elbaraka.com

# ═══════════════════════════════════════════════════════════
# DELIVERY FEE CONFIG
# ═══════════════════════════════════════════════════════════
DELIVERY_FEE=25
FREE_DELIVERY_THRESHOLD=200

# ═══════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════
LOG_CHANNEL=daily
LOG_LEVEL=warning
LOG_DAILY_DAYS=14

# ═══════════════════════════════════════════════════════════
# SENTRY (Error Tracking)
# ═══════════════════════════════════════════════════════════
SENTRY_LARAVEL_DSN=https://YOUR_SENTRY_DSN
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 7.4 Generate Key & Run Migrations

```bash
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force    # Only if you have seeders for production data
```

### 7.5 Optimize for Production

```bash
# Cache configuration (CRITICAL for performance)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Create storage symlink
php artisan storage:link

# Set correct permissions
sudo chown -R deploy:www-data /var/www/elbaraka
sudo chmod -R 755 /var/www/elbaraka
sudo chmod -R 775 /var/www/elbaraka/storage
sudo chmod -R 775 /var/www/elbaraka/bootstrap/cache
```

### 7.6 Deploy Script (Reusable)

Create `/var/www/elbaraka/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /var/www/elbaraka

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# Run migrations
echo "🗃️  Running migrations..."
php artisan migrate --force

# Clear and rebuild caches
echo "🔄 Clearing caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Restart queue workers
echo "🔄 Restarting queue workers..."
php artisan queue:restart

# Restart PHP-FPM
echo "🔄 Restarting PHP-FPM..."
sudo systemctl reload php8.2-fpm

echo "✅ Deployment complete!"
```

```bash
chmod +x /var/www/elbaraka/deploy.sh
```

---

## 8. Nginx Reverse Proxy & SSL <a name="8-nginx-ssl"></a>

### 8.1 API Configuration

Create `/etc/nginx/sites-available/api.elbaraka.com`:

```nginx
# ═══════════════════════════════════════════════════════════
# Rate Limiting Zones
# ═══════════════════════════════════════════════════════════
# Place this in /etc/nginx/conf.d/rate-limiting.conf:
# limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
# limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
# limit_req_zone $binary_remote_addr zone=general:10m rate=60r/s;

server {
    listen 80;
    server_name api.elbaraka.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.elbaraka.com;

    # ═══════════════════════════════════════════════════════
    # SSL (managed by Certbot or Cloudflare Origin Cert)
    # ═══════════════════════════════════════════════════════
    ssl_certificate /etc/ssl/cloudflare/api.elbaraka.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/api.elbaraka.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # ═══════════════════════════════════════════════════════
    # Document Root
    # ═══════════════════════════════════════════════════════
    root /var/www/elbaraka/public;
    index index.php;

    # ═══════════════════════════════════════════════════════
    # Security Headers
    # ═══════════════════════════════════════════════════════
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'" always;

    # ═══════════════════════════════════════════════════════
    # Gzip Compression
    # ═══════════════════════════════════════════════════════
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # ═══════════════════════════════════════════════════════
    # Request Size Limits
    # ═══════════════════════════════════════════════════════
    client_max_body_size 10M;
    client_body_timeout 30s;
    client_header_timeout 30s;

    # ═══════════════════════════════════════════════════════
    # Main Location Block
    # ═══════════════════════════════════════════════════════
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ═══════════════════════════════════════════════════════
    # PHP Processing
    # ═══════════════════════════════════════════════════════
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 60s;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
    }

    # ═══════════════════════════════════════════════════════
    # Rate Limiting for Auth Endpoints
    # ═══════════════════════════════════════════════════════
    location ~ ^/api/v1/auth/(login|register|verify|reset) {
        limit_req zone=auth burst=3 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ═══════════════════════════════════════════════════════
    # Block Sensitive Files
    # ═══════════════════════════════════════════════════════
    location ~ /\.(?!well-known) { deny all; }
    location ~ /\.env { deny all; }
    location ~ /\.git { deny all; }
    location ~* \.(sql|bak|log|sh)$ { deny all; }

    # ═══════════════════════════════════════════════════════
    # Static File Caching
    # ═══════════════════════════════════════════════════════
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff2|woff|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ═══════════════════════════════════════════════════════
    # Health Check (no logging)
    # ═══════════════════════════════════════════════════════
    location = /health {
        access_log off;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Logs
    access_log /var/log/nginx/api.elbaraka.access.log;
    error_log /var/log/nginx/api.elbaraka.error.log;
}
```

### 8.2 Admin Dashboard Configuration

Create `/etc/nginx/sites-available/admin.elbaraka.com`:

```nginx
server {
    listen 80;
    server_name admin.elbaraka.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.elbaraka.com;

    ssl_certificate /etc/ssl/cloudflare/admin.elbaraka.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/admin.elbaraka.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /var/www/admin-dashboard/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/admin.elbaraka.access.log;
    error_log /var/log/nginx/admin.elbaraka.error.log;
}
```

### 8.3 Enable Sites & Rate Limiting

```bash
# Create rate limiting config
cat > /etc/nginx/conf.d/rate-limiting.conf << 'EOF'
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=60r/s;
EOF

# Enable sites
ln -sf /etc/nginx/sites-available/api.elbaraka.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/admin.elbaraka.com /etc/nginx/sites-enabled/

# Remove default
rm -f /etc/nginx/sites-enabled/default

# Test & reload
nginx -t
systemctl reload nginx
```

### 8.4 SSL with Certbot (if not using Cloudflare Origin Certs)

```bash
certbot --nginx -d api.elbaraka.com -d admin.elbaraka.com
certbot renew --dry-run    # Verify auto-renewal
```

---

## 9. PHP-FPM Tuning <a name="9-php-fpm"></a>

### 9.1 Pool Configuration

Edit `/etc/php/8.2/fpm/pool.d/www.conf`:

```ini
[www]
user = www-data
group = www-data

listen = /run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data

; ═══════════════════════════════════════════════════════════
; PROCESS MANAGEMENT
; ═══════════════════════════════════════════════════════════
pm = dynamic
pm.max_children = 50           ; Max PHP processes
pm.start_servers = 10          ; Start with 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500          ; Restart after 500 requests (prevent memory leaks)
pm.process_idle_timeout = 10s

; ═══════════════════════════════════════════════════════════
; SLOW LOG (identifies slow PHP scripts)
; ═══════════════════════════════════════════════════════════
slowlog = /var/log/php/fpm-slow.log
request_slowlog_timeout = 5s

; ═══════════════════════════════════════════════════════════
; TIMEOUTS
; ═══════════════════════════════════════════════════════════
request_terminate_timeout = 60s
```

### 9.2 PHP.ini Tuning

Edit `/etc/php/8.2/fpm/php.ini`:

```ini
; ═══════════════════════════════════════════════════════════
; PERFORMANCE
; ═══════════════════════════════════════════════════════════
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 32
opcache.max_accelerated_files = 20000
opcache.validate_timestamps = 0          ; Set 0 in production (restart FPM to pick up changes)
opcache.revalidate_freq = 0
opcache.jit = tracing
opcache.jit_buffer_size = 64M

; ═══════════════════════════════════════════════════════════
; LIMITS
; ═══════════════════════════════════════════════════════════
memory_limit = 256M
max_execution_time = 60
max_input_time = 30
post_max_size = 12M
upload_max_filesize = 10M
max_file_uploads = 10

; ═══════════════════════════════════════════════════════════
; SECURITY
; ═══════════════════════════════════════════════════════════
expose_php = Off
display_errors = Off
display_startup_errors = Off
log_errors = On
error_log = /var/log/php/error.log
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
```

```bash
mkdir -p /var/log/php
chown www-data:www-data /var/log/php
systemctl restart php8.2-fpm
```

---

## 10. Queue Workers & Scheduled Tasks <a name="10-queue-workers"></a>

### 10.1 Supervisor Configuration for Queue Workers

Create `/etc/supervisor/conf.d/elbaraka-worker.conf`:

```ini
[program:elbaraka-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --max-jobs=1000
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=deploy
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/elbaraka-worker.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
stopwaitsecs=3600
```

### 10.2 Supervisor for Laravel Scheduler (alternative to cron)

Create `/etc/supervisor/conf.d/elbaraka-scheduler.conf`:

```ini
[program:elbaraka-scheduler]
process_name=%(program_name)s
command=/bin/bash -c "while true; do php /var/www/elbaraka/artisan schedule:run --no-interaction >> /dev/null 2>&1; sleep 60; done"
autostart=true
autorestart=true
user=deploy
redirect_stderr=true
stdout_logfile=/var/log/supervisor/elbaraka-scheduler.log
stdout_logfile_maxbytes=5MB
```

```bash
# Apply supervisor config
supervisorctl reread
supervisorctl update
supervisorctl start all

# Check status
supervisorctl status
```

### 10.3 Alternative: Cron for Scheduler

```bash
# Edit crontab for deploy user
crontab -u deploy -e

# Add this line:
* * * * * cd /var/www/elbaraka && php artisan schedule:run >> /dev/null 2>&1
```

### 10.4 Common Queued Jobs to Set Up

In your Laravel app, ensure these tasks use queues:

```php
// ❌ Blocking (BAD for production)
Mail::to($user)->send(new OrderConfirmation($order));

// ✅ Queued (GOOD)
Mail::to($user)->queue(new OrderConfirmation($order));

// ❌ Blocking notification
$user->notify(new OrderShippedNotification($order));

// ✅ Queued notification
$user->notify((new OrderShippedNotification($order))->afterCommit());
```

---

## 11. File Storage & CDN <a name="11-file-storage-cdn"></a>

### 11.1 Cloudflare R2 Setup (S3-compatible, no egress fees)

```bash
# 1. Create R2 bucket in Cloudflare dashboard
#    Name: elbaraka-assets
#    Region: Auto

# 2. Create API token for R2
#    Permissions: Admin Read & Write

# 3. Connect custom domain: cdn.elbaraka.com → R2 bucket
```

### 11.2 Laravel Filesystem Config

In `config/filesystems.php`:

```php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION', 'auto'),
    'bucket' => env('AWS_BUCKET'),
    'url' => env('AWS_URL'),                    // cdn.elbaraka.com
    'endpoint' => env('AWS_ENDPOINT'),          // R2 endpoint
    'use_path_style_endpoint' => false,
    'throw' => true,
],
```

### 11.3 Migration Script (Local → R2)

```bash
# Upload existing local files to R2
php artisan storage:link    # Ensure symlink exists

# Use rclone for bulk migration
apt install rclone

rclone config
# Type: s3
# Provider: Cloudflare
# Access key: YOUR_R2_KEY
# Secret key: YOUR_R2_SECRET
# Endpoint: https://ACCOUNT_ID.r2.cloudflarestorage.com

rclone sync /var/www/elbaraka/storage/app/public r2:elbaraka-assets/
```

---

## 12. Admin Dashboard Deployment <a name="12-admin-dashboard"></a>

### 12.1 Build Locally (or in CI)

```bash
cd admindash-frontend
npm install
npm run build    # Creates /dist folder
```

### 12.2 Deploy to Server

```bash
# Upload build
rsync -avz --delete dist/ deploy@YOUR_VPS_IP:/var/www/admin-dashboard/dist/

# Set permissions
ssh deploy@YOUR_VPS_IP "sudo chown -R www-data:www-data /var/www/admin-dashboard/dist"
```

### 12.3 Alternative: Cloudflare Pages (Free, Automatic)

```bash
# 1. Connect GitHub repo to Cloudflare Pages
# 2. Build command: npm run build
# 3. Output directory: dist
# 4. Custom domain: admin.elbaraka.com
# Automatic deploys on every push to main!
```

---

## 13. Mobile App Build & Release (EAS) <a name="13-mobile-app-build"></a>

### 13.1 Initial Setup

```bash
cd frontend

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Initialize EAS
eas build:configure
```

### 13.2 EAS Configuration

Create/update `eas.json`:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development",
        "API_URL": "http://192.168.1.10:8000/api/v1"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_ENV": "staging",
        "API_URL": "https://staging-api.elbaraka.com/api/v1"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://api.elbaraka.com/api/v1"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "autoIncrement": "buildNumber"
      },
      "autoSubmit": false
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "YOUR_APP_STORE_CONNECT_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### 13.3 Build Commands

```bash
# ─── Development (for testing on real devices) ───
eas build --platform android --profile development
eas build --platform ios --profile development

# ─── Preview (APK for internal testing) ───
eas build --platform android --profile preview

# ─── Production ───
eas build --platform android --profile production
eas build --platform ios --profile production

# ─── Submit to stores ───
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

### 13.4 OTA Updates (Over-the-Air)

```bash
# Push JS-only updates without new build
eas update --branch production --message "Bug fix: cart total display"

# Preview before pushing
eas update --branch preview --message "Testing new payment screen"
```

### 13.5 API URL Configuration

Update `frontend/config/api.ts`:

```typescript
import Constants from "expo-constants";

const ENV = Constants.expoConfig?.extra?.APP_ENV || "development";

const API_URLS: Record<string, string> = {
  development: "http://192.168.1.10:8000/api/v1",
  staging: "https://staging-api.elbaraka.com/api/v1",
  production: "https://api.elbaraka.com/api/v1",
};

export const API_CONFIG = {
  BASE_URL: API_URLS[ENV] || API_URLS.production,
  TIMEOUT: 15000,
};
```

---

## 14. Driver App Build & Release <a name="14-driver-app-build"></a>

Same process as customer app, but with:

- **Internal distribution only** (not on public stores)
- Use EAS internal distribution or Firebase App Distribution
- Driver-specific API URL pointing to the same backend

```bash
cd driver-app
eas build:configure
eas build --platform android --profile preview    # APK for driver testing
```

---

## 15. CI/CD Pipeline (GitHub Actions) <a name="15-cicd"></a>

### 15.1 Backend Pipeline

Create `.github/workflows/backend-deploy.yml`:

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths: ["unibackend/**"]
  pull_request:
    branches: [main]
    paths: ["unibackend/**"]

env:
  PHP_VERSION: "8.2"

jobs:
  # ═══════════════════════════════════════════════════════════
  # STAGE 1: Test
  # ═══════════════════════════════════════════════════════════
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: elbaraka_test
        ports: ["3306:3306"]
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
      redis:
        image: redis:7
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: mbstring, xml, mysql, redis, gd, bcmath, zip
          coverage: xdebug

      - name: Install dependencies
        working-directory: unibackend
        run: composer install --prefer-dist --no-interaction

      - name: Setup environment
        working-directory: unibackend
        run: |
          cp .env.example .env
          php artisan key:generate
          sed -i 's/DB_CONNECTION=.*/DB_CONNECTION=mysql/' .env
          sed -i 's/DB_HOST=.*/DB_HOST=127.0.0.1/' .env
          sed -i 's/DB_DATABASE=.*/DB_DATABASE=elbaraka_test/' .env
          sed -i 's/DB_USERNAME=.*/DB_USERNAME=root/' .env
          sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=test_password/' .env

      - name: Run migrations
        working-directory: unibackend
        run: php artisan migrate --force

      - name: Run tests
        working-directory: unibackend
        run: php artisan test --coverage-text

      - name: Laravel Pint (Code Style)
        working-directory: unibackend
        run: vendor/bin/pint --test

  # ═══════════════════════════════════════════════════════════
  # STAGE 2: Security Scan
  # ═══════════════════════════════════════════════════════════
  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: PHP Security Checker
        uses: symfonycorp/security-checker-action@v5
        with:
          lock: unibackend/composer.lock

  # ═══════════════════════════════════════════════════════════
  # STAGE 3: Deploy (only on main push)
  # ═══════════════════════════════════════════════════════════
  deploy:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/elbaraka
            ./deploy.sh
```

### 15.2 Admin Dashboard Pipeline

Create `.github/workflows/admin-deploy.yml`:

```yaml
name: Admin Dashboard CI/CD

on:
  push:
    branches: [main]
    paths: ["admindash frontend/**"]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
          cache-dependency-path: "admindash frontend/package-lock.json"

      - name: Install & Build
        working-directory: admindash frontend
        run: |
          npm ci
          npm run build

      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            rsync -avz --delete /tmp/admin-dist/ /var/www/admin-dashboard/dist/
```

### 15.3 Mobile App Pipeline

Create `.github/workflows/mobile-build.yml`:

```yaml
name: Mobile App Build

on:
  push:
    branches: [main]
    paths: ["frontend/**"]
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build Android (preview)
        if: "!startsWith(github.ref, 'refs/tags/v')"
        working-directory: frontend
        run: eas build --platform android --profile preview --non-interactive

      - name: Build Production (on tag)
        if: startsWith(github.ref, 'refs/tags/v')
        working-directory: frontend
        run: |
          eas build --platform android --profile production --non-interactive
          eas build --platform ios --profile production --non-interactive
```

### 15.4 GitHub Secrets to Configure

```
SERVER_HOST          → Your VPS IP address
SERVER_USER          → deploy
SSH_PRIVATE_KEY      → Contents of ~/.ssh/id_ed25519
EXPO_TOKEN           → From expo.dev account settings
```

---

## 16. Environment Variables & Secrets Management <a name="16-env-secrets"></a>

### 16.1 Never Commit Secrets

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.production" >> .gitignore
echo "*.key" >> .gitignore
echo "*.pem" >> .gitignore
echo "google-service-account.json" >> .gitignore
```

### 16.2 Secret Rotation Schedule

| Secret             | Rotation Frequency         | How                             |
| ------------------ | -------------------------- | ------------------------------- |
| Database passwords | Every 90 days              | Change in MySQL + `.env`        |
| Redis password     | Every 90 days              | Change in Redis config + `.env` |
| APP_KEY            | Never (unless compromised) | `php artisan key:generate`      |
| Paymob API keys    | Every 6 months             | Regenerate in Paymob dashboard  |
| JWT tokens         | Built-in expiry            | Token refresh flow handles this |
| SSH keys           | Every 12 months            | Generate new keypair            |
| Expo token         | When compromised           | Regenerate in Expo dashboard    |

### 16.3 Environment Validation

Create a Laravel command to validate all env vars are set:

```php
// app/Console/Commands/ValidateEnvironment.php
php artisan make:command ValidateEnvironment

// Check that all required env vars are set on startup
$required = [
    'APP_KEY', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD',
    'REDIS_HOST', 'MAIL_HOST', 'PAYMOB_API_KEY',
];
```

---

## 17. Security Hardening Checklist <a name="17-security-hardening"></a>

### Server Level

- [x] SSH key authentication only (no passwords)
- [x] Root login disabled
- [x] Non-standard SSH port (optional: change from 22 to 2222)
- [ ] Fail2ban installed and configured
- [ ] Automatic security updates enabled
- [ ] UFW firewall configured
- [ ] ClamAV antivirus (optional for file upload scanning)

### Application Level

- [ ] `APP_DEBUG=false` in production
- [ ] `APP_ENV=production` in production
- [ ] CORS configured (specific origins only)
- [ ] Rate limiting on all auth endpoints
- [ ] CSRF protection enabled
- [ ] SQL injection prevention (Laravel parameterized queries ✅)
- [ ] XSS prevention (Blade template escaping ✅)
- [ ] File upload validation (type, size, content)
- [ ] Webhook signature verification (Paymob HMAC)
- [ ] IDOR protection (Laravel Policies)
- [ ] Admin auth separated from customer auth

### Infrastructure Level

- [ ] SSL/TLS 1.2+ only
- [ ] HSTS headers
- [ ] Security response headers
- [ ] Database only accessible from localhost
- [ ] Redis only accessible from localhost
- [ ] Log files not publicly accessible
- [ ] `.env` file not accessible via web

### Install Fail2ban

```bash
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/api.elbaraka.error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### Enable Automatic Security Updates

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
# Select "Yes"
```

---

## 18. Firewall & Network Security <a name="18-firewall"></a>

### 18.1 UFW (Uncomplicated Firewall)

```bash
# Reset rules
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow HTTP & HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow MySQL ONLY from specific IP (for remote management)
# ufw allow from YOUR_OFFICE_IP to any port 3306 comment 'MySQL remote'

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

### 18.2 What Should NOT Be Exposed

| Port | Service | Accessible?                 |
| ---- | ------- | --------------------------- |
| 22   | SSH     | ✅ Yes (key-only)           |
| 80   | HTTP    | ✅ Yes (redirects to HTTPS) |
| 443  | HTTPS   | ✅ Yes                      |
| 3306 | MySQL   | ❌ No (localhost only)      |
| 6379 | Redis   | ❌ No (localhost only)      |
| 9000 | PHP-FPM | ❌ No (unix socket)         |

---

## 19. SSL/TLS Configuration <a name="19-ssl-tls"></a>

### 19.1 Using Cloudflare Origin Certificates (Recommended)

```bash
# 1. In Cloudflare Dashboard → SSL/TLS → Origin Server
# 2. Create Certificate → Generate private key and CSR with Cloudflare
# 3. Hostnames: *.elbaraka.com, elbaraka.com
# 4. Validity: 15 years

# 5. Save certificate and key on server
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/api.elbaraka.com.pem    # Paste certificate
nano /etc/ssl/cloudflare/api.elbaraka.com.key    # Paste private key

# 6. Set permissions
chmod 600 /etc/ssl/cloudflare/*.key
chmod 644 /etc/ssl/cloudflare/*.pem
```

### 19.2 Using Let's Encrypt (Alternative)

```bash
certbot --nginx -d api.elbaraka.com -d admin.elbaraka.com

# Auto-renewal (certbot installs a systemd timer automatically)
systemctl status certbot.timer
certbot renew --dry-run
```

### 19.3 SSL Test

After setup, test your SSL configuration:

- https://www.ssllabs.com/ssltest/analyze.html?d=api.elbaraka.com
- Target grade: **A+**

---

## 20. Monitoring & Alerting <a name="20-monitoring"></a>

### 20.1 Uptime Monitoring (UptimeRobot — Free)

```
Monitor 1: https://api.elbaraka.com/health
  Type: HTTP(s)
  Interval: 5 minutes
  Alert: Email + Telegram

Monitor 2: https://admin.elbaraka.com
  Type: HTTP(s)
  Interval: 5 minutes
  Alert: Email + Telegram

Monitor 3: api.elbaraka.com
  Type: Port (443)
  Interval: 5 minutes
  Alert: Email
```

### 20.2 Error Tracking (Sentry)

```bash
# Backend
cd /var/www/elbaraka
composer require sentry/sentry-laravel

php artisan sentry:publish --dsn=YOUR_SENTRY_DSN
```

Add to `.env`:

```env
SENTRY_LARAVEL_DSN=https://YOUR_KEY@o12345.ingest.sentry.io/12345
SENTRY_TRACES_SAMPLE_RATE=0.1      # 10% of requests traced
```

For the mobile apps, add `sentry-expo`:

```bash
cd frontend
npx expo install sentry-expo
```

### 20.3 Server Resource Monitoring

```bash
# Install netdata (real-time server monitoring dashboard)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access at http://YOUR_IP:19999 (restrict in firewall)
ufw allow from YOUR_OFFICE_IP to any port 19999 comment 'Netdata'
```

### 20.4 MySQL Monitoring Queries

```sql
-- Check slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 20;

-- Check connection count
SHOW STATUS LIKE 'Threads_connected';

-- Check table sizes
SELECT table_name, ROUND(data_length/1024/1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'elbaraka_prod'
ORDER BY data_length DESC;
```

### 20.5 Redis Monitoring

```bash
# Real-time stats
redis-cli -a YOUR_PASSWORD monitor    # Live command stream (careful in prod)

# Memory usage
redis-cli -a YOUR_PASSWORD info memory

# Key count
redis-cli -a YOUR_PASSWORD dbsize
```

### 20.6 Custom Health Check Endpoint

Your Laravel app already has `/health`. Enhance it:

```php
// Return detailed health for internal monitoring
Route::get('/health/detailed', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'checks' => [
            'database' => DB::connection()->getPdo() ? 'ok' : 'fail',
            'redis' => Cache::store('redis')->put('health', true, 10) ? 'ok' : 'fail',
            'queue' => Queue::size() < 1000 ? 'ok' : 'warning',
            'disk' => disk_free_space('/') > 1073741824 ? 'ok' : 'warning', // > 1GB
        ],
    ]);
});
```

---

## 21. Logging Strategy <a name="21-logging"></a>

### 21.1 Laravel Logging Configuration

In `config/logging.php`:

```php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['daily', 'sentry'],
    ],

    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'warning'),
        'days' => 14,
        'permission' => 0664,
    ],

    'sentry' => [
        'driver' => 'sentry',
        'level' => 'error',
    ],
],
```

### 21.2 Nginx Log Rotation

Create `/etc/logrotate.d/nginx-elbaraka`:

```
/var/log/nginx/api.elbaraka.*.log
/var/log/nginx/admin.elbaraka.*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### 21.3 PHP-FPM Log Rotation

Create `/etc/logrotate.d/php-fpm`:

```
/var/log/php/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
}
```

### 21.4 Structured Logging

For important business events, use structured logging:

```php
Log::channel('daily')->info('Order placed', [
    'order_id' => $order->id,
    'user_id' => $order->user_id,
    'total' => $order->total,
    'payment_method' => $order->payment_method,
    'items_count' => $order->items->count(),
]);
```

---

## 22. Backup & Disaster Recovery <a name="22-backup-dr"></a>

### 22.1 Automated Database Backup Script

Create `/opt/scripts/backup-db.sh`:

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════════════
# El Baraka – Database Backup Script
# Run daily via cron
# ═══════════════════════════════════════════════════════════

set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/database"
RETENTION_DAYS=30
DB_NAME="elbaraka_prod"
DB_USER="elbaraka_app"
DB_PASS="YOUR_DB_PASSWORD"
R2_BUCKET="elbaraka-backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump database
echo "[$(date)] Starting database backup..."
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Get file size
SIZE=$(du -sh "$BACKUP_DIR/db_${DATE}.sql.gz" | cut -f1)
echo "[$(date)] Backup created: db_${DATE}.sql.gz ($SIZE)"

# Upload to R2/S3
if command -v rclone &> /dev/null; then
    rclone copy "$BACKUP_DIR/db_${DATE}.sql.gz" "r2:${R2_BUCKET}/database/"
    echo "[$(date)] Uploaded to R2"
fi

# Remove old local backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete!"
```

### 22.2 File Storage Backup

Create `/opt/scripts/backup-files.sh`:

```bash
#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/files"
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

# Backup Laravel storage (user uploads, invoices)
tar czf "$BACKUP_DIR/storage_${DATE}.tar.gz" \
    /var/www/elbaraka/storage/app/public/

# Backup .env file
cp /var/www/elbaraka/.env "$BACKUP_DIR/env_${DATE}.bak"

# Backup Nginx configs
tar czf "$BACKUP_DIR/nginx_${DATE}.tar.gz" \
    /etc/nginx/sites-available/

# Upload to R2
if command -v rclone &> /dev/null; then
    rclone copy "$BACKUP_DIR/storage_${DATE}.tar.gz" "r2:elbaraka-backups/files/"
fi

# Cleanup
find "$BACKUP_DIR" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] File backup complete!"
```

### 22.3 Schedule Backups

```bash
chmod +x /opt/scripts/backup-db.sh
chmod +x /opt/scripts/backup-files.sh

# Add to crontab
crontab -e

# Database: Daily at 3:00 AM
0 3 * * * /opt/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1

# Files: Weekly on Sunday at 4:00 AM
0 4 * * 0 /opt/scripts/backup-files.sh >> /var/log/backup-files.log 2>&1
```

### 22.4 Restore Procedures

```bash
# ═══════════════════════════════════════════════════════════
# RESTORE DATABASE
# ═══════════════════════════════════════════════════════════

# 1. Download the backup
rclone copy "r2:elbaraka-backups/database/db_20260218_030000.sql.gz" /tmp/

# 2. Stop the application (prevent writes during restore)
sudo supervisorctl stop all
sudo systemctl stop php8.2-fpm

# 3. Restore
gunzip < /tmp/db_20260218_030000.sql.gz | mysql -u elbaraka_app -p elbaraka_prod

# 4. Restart application
sudo systemctl start php8.2-fpm
sudo supervisorctl start all

# ═══════════════════════════════════════════════════════════
# RESTORE FILES
# ═══════════════════════════════════════════════════════════

# 1. Download
rclone copy "r2:elbaraka-backups/files/storage_20260218_040000.tar.gz" /tmp/

# 2. Extract
tar xzf /tmp/storage_20260218_040000.tar.gz -C /

# 3. Fix permissions
chown -R deploy:www-data /var/www/elbaraka/storage/app/public/
```

### 22.5 Disaster Recovery Plan

| Scenario            | Recovery Time | Steps                                                           |
| ------------------- | ------------- | --------------------------------------------------------------- |
| Server crash        | 1-2 hours     | Provision new VPS → Run setup scripts → Restore DB + files      |
| Database corruption | 30 min        | Restore latest backup, run migrations                           |
| Hacked/compromised  | 2-4 hours     | Isolate server → Fresh provision → Restore → Rotate ALL secrets |
| DDoS attack         | 5 min         | Cloudflare "Under Attack" mode → Review firewall rules          |
| Code deployment bug | 5 min         | Git revert → redeploy (see Rollback section)                    |

---

## 23. Database Maintenance & Optimization <a name="23-db-maintenance"></a>

### 23.1 Essential Indexes

```sql
-- Run this migration to add performance indexes
-- Create: database/migrations/xxxx_add_performance_indexes.php

-- Orders (most queried table)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_driver ON orders(driver_id, status);

-- Products
CREATE INDEX idx_products_category ON products(category_id, is_active);
CREATE INDEX idx_products_featured ON products(is_featured, is_active);
CREATE INDEX idx_products_slug ON products(slug);

-- Cart Items
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id, product_id);

-- Notifications
CREATE INDEX idx_notif_user_read ON notifications(user_id, read_at);
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

-- Addresses
CREATE INDEX idx_addresses_user ON addresses(user_id, is_default);

-- Payment Methods
CREATE INDEX idx_pm_user_default ON payment_methods(user_id, is_default);

-- Reviews
CREATE INDEX idx_reviews_product ON reviews(product_id, created_at DESC);
```

### 23.2 Weekly Maintenance Script

Create `/opt/scripts/db-maintenance.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "[$(date)] Starting database maintenance..."

mysql -u elbaraka_app -p"YOUR_PASSWORD" elbaraka_prod << 'SQL'
-- Optimize frequently updated tables
OPTIMIZE TABLE orders;
OPTIMIZE TABLE cart_items;
OPTIMIZE TABLE notifications;

-- Analyze tables for query optimizer
ANALYZE TABLE orders;
ANALYZE TABLE products;
ANALYZE TABLE users;
ANALYZE TABLE categories;
SQL

echo "[$(date)] Database maintenance complete!"
```

```bash
# Schedule weekly on Sunday at 5:00 AM
0 5 * * 0 /opt/scripts/db-maintenance.sh >> /var/log/db-maintenance.log 2>&1
```

### 23.3 Data Archiving Strategy

```sql
-- Archive orders older than 6 months to archive table
CREATE TABLE orders_archive LIKE orders;

INSERT INTO orders_archive
SELECT * FROM orders
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
AND status IN ('delivered', 'cancelled');

-- Then delete from main table (run in batches)
DELETE FROM orders
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
AND status IN ('delivered', 'cancelled')
LIMIT 1000;
```

---

## 24. Horizontal Scaling Guide <a name="24-scaling"></a>

### When to Scale

| Metric            | Threshold       | Action                                  |
| ----------------- | --------------- | --------------------------------------- |
| CPU usage         | Sustained > 80% | Add more PHP-FPM workers or upgrade VPS |
| RAM usage         | > 85%           | Upgrade VPS or optimize queries         |
| MySQL connections | > 150           | Add read replica                        |
| Response time P95 | > 2 seconds     | Profile queries, add caching            |
| Concurrent users  | > 500           | Move to multi-server architecture       |
| Storage           | > 70% disk      | Move files to R2/S3                     |

### Multi-Server Architecture (When Needed)

```
                    Load Balancer (Cloudflare / Nginx)
                         │              │
                  ┌──────▼──┐    ┌──────▼──┐
                  │  App 1  │    │  App 2  │
                  │ (PHP)   │    │ (PHP)   │
                  └────┬────┘    └────┬────┘
                       │              │
              ┌────────▼──────────────▼────────┐
              │     Shared Services             │
              │  ┌─────────┐  ┌──────────────┐  │
              │  │ Redis   │  │ MySQL        │  │
              │  │ Cluster │  │ Primary +    │  │
              │  │         │  │ Read Replica │  │
              │  └─────────┘  └──────────────┘  │
              └────────────────────────────────┘
```

### Session & Cache Considerations for Multi-Server

```env
# Sessions MUST be in Redis (not file-based)
SESSION_DRIVER=redis

# Cache MUST be in Redis
CACHE_STORE=redis

# Queue MUST be in Redis
QUEUE_CONNECTION=redis

# File storage MUST be on S3/R2 (not local disk)
FILESYSTEM_DISK=s3
```

---

## 25. Load Testing <a name="25-load-testing"></a>

### 25.1 Using k6 (Recommended)

```bash
# Install k6
apt install -y k6

# Or via Docker
docker run --rm -i grafana/k6 run -
```

### 25.2 Load Test Script

Create `load-test.js`:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 }, // Ramp up to 50 users
    { duration: "3m", target: 50 }, // Stay at 50 users
    { duration: "1m", target: 100 }, // Ramp to 100
    { duration: "3m", target: 100 }, // Stay at 100
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests < 500ms
    http_req_failed: ["rate<0.01"], // Error rate < 1%
  },
};

const BASE_URL = "https://api.elbaraka.com/api/v1";

export default function () {
  // Health check
  let res = http.get(`${BASE_URL}/../health`);
  check(res, { "health ok": (r) => r.status === 200 });

  // Get categories
  res = http.get(`${BASE_URL}/categories`);
  check(res, { "categories ok": (r) => r.status === 200 });

  // Get products
  res = http.get(`${BASE_URL}/products?page=1&per_page=20`);
  check(res, { "products ok": (r) => r.status === 200 });

  sleep(1);
}
```

```bash
k6 run load-test.js
```

---

## 26. Incident Response Runbook <a name="26-incident-response"></a>

### Severity Levels

| Level  | Description          | Response Time     | Examples                                        |
| ------ | -------------------- | ----------------- | ----------------------------------------------- |
| **P0** | Total outage         | Immediate         | Server down, database crashed                   |
| **P1** | Major feature broken | 30 min            | Checkout failing, payments not processing       |
| **P2** | Minor feature broken | 2 hours           | Notifications not sending, image upload failing |
| **P3** | Cosmetic/minor       | Next business day | UI glitch, slow query                           |

### P0 Response Steps

```
1. ACKNOWLEDGE — Confirm the issue in team channel
2. DIAGNOSE — Check in order:
   a. Server reachable? → ssh deploy@server
   b. Nginx running? → systemctl status nginx
   c. PHP-FPM running? → systemctl status php8.2-fpm
   d. MySQL running? → systemctl status mysql
   e. Redis running? → systemctl status redis-server
   f. Disk space? → df -h
   g. Recent deployment? → git log --oneline -5
3. FIX — Apply the fix (restart service, rollback, scale)
4. VERIFY — Check health endpoint + test critical paths
5. COMMUNICATE — Update team and stakeholders
6. POST-MORTEM — Document what happened & prevent recurrence
```

### Common Issue Quick Fixes

```bash
# ═══════════════════════════════════════════════════════════
# 502 Bad Gateway → PHP-FPM crashed
# ═══════════════════════════════════════════════════════════
sudo systemctl restart php8.2-fpm
sudo tail -20 /var/log/php/error.log

# ═══════════════════════════════════════════════════════════
# Disk full → Clean up logs and temp files
# ═══════════════════════════════════════════════════════════
df -h
sudo truncate -s 0 /var/log/nginx/api.elbaraka.access.log
sudo find /var/www/elbaraka/storage/logs -name "*.log" -mtime +7 -delete
sudo apt autoremove -y

# ═══════════════════════════════════════════════════════════
# MySQL too many connections
# ═══════════════════════════════════════════════════════════
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "KILL [process_id];"    # Kill stuck queries

# ═══════════════════════════════════════════════════════════
# Redis out of memory
# ═══════════════════════════════════════════════════════════
redis-cli -a PASSWORD info memory
redis-cli -a PASSWORD FLUSHDB    # Nuclear option: clear cache

# ═══════════════════════════════════════════════════════════
# Queue stuck / jobs piling up
# ═══════════════════════════════════════════════════════════
php artisan queue:retry all
sudo supervisorctl restart elbaraka-worker:*

# ═══════════════════════════════════════════════════════════
# Laravel in maintenance mode (accidentally left on)
# ═══════════════════════════════════════════════════════════
php artisan up
```

---

## 27. Rollback Procedures <a name="27-rollback"></a>

### 27.1 Code Rollback (Git)

```bash
cd /var/www/elbaraka

# Option 1: Revert last commit
git revert HEAD --no-edit
git push origin main

# Option 2: Hard reset to specific commit
git log --oneline -10    # Find the good commit
git reset --hard COMMIT_SHA
git push origin main --force

# After rollback, rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl reload php8.2-fpm
```

### 27.2 Database Rollback

```bash
# Rollback last migration
php artisan migrate:rollback --step=1

# Rollback to specific batch
php artisan migrate:rollback --batch=5
```

### 27.3 Full System Restore

```bash
# 1. Code to known-good version
git checkout KNOWN_GOOD_TAG
composer install --no-dev --optimize-autoloader

# 2. Database from backup
gunzip < /opt/backups/database/db_LATEST.sql.gz | mysql -u root -p elbaraka_prod

# 3. Rebuild everything
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl restart php8.2-fpm
sudo supervisorctl restart all
```

---

## 28. Cost Estimation <a name="28-cost"></a>

### Monthly Operating Costs (Starting)

| Service               | Provider      | Plan                        | Cost/mo     |
| --------------------- | ------------- | --------------------------- | ----------- |
| VPS (4GB RAM)         | Hetzner       | CPX21                       | $9          |
| Domain                | Cloudflare    | .com                        | $0.83       |
| CDN + WAF             | Cloudflare    | Free                        | $0          |
| Object Storage        | Cloudflare R2 | Free tier (10 GB)           | $0          |
| Email (transactional) | Mailgun       | Flex (1000/mo free)         | $0          |
| Error Tracking        | Sentry        | Developer (free)            | $0          |
| Uptime Monitoring     | UptimeRobot   | Free (50 monitors)          | $0          |
| Expo EAS              | Expo          | Free (30 builds/mo)         | $0          |
| GitHub                | GitHub        | Free (public/private repos) | $0          |
| **TOTAL**             |               |                             | **~$10/mo** |

### Scaling Costs (As You Grow)

| Users          | VPS  | Database      | Redis    | Storage      | Email | Total/mo |
| -------------- | ---- | ------------- | -------- | ------------ | ----- | -------- |
| 0-1,000        | $9   | Included      | Included | $0 (R2 free) | $0    | ~$10     |
| 1,000-5,000    | $18  | Included      | Included | $5           | $35   | ~$60     |
| 5,000-20,000   | $36  | $15 (managed) | $10      | $15          | $80   | ~$160    |
| 20,000-100,000 | $72+ | $50 (cluster) | $25      | $30          | $200  | ~$400    |

---

## 29. Maintenance Calendar <a name="29-maintenance-calendar"></a>

### Daily (Automated)

- [x] Database backup at 3:00 AM
- [x] Log rotation
- [x] Health check monitoring (every 5 min)
- [x] Queue worker auto-restart on failure

### Weekly

- [ ] Review slow query log
- [ ] Check disk space and resource usage
- [ ] Review Sentry error reports
- [ ] Database optimization (Sunday 5 AM)

### Monthly

- [ ] Review and update dependencies (`composer update`, `npm update`)
- [ ] Review Cloudflare analytics (attack attempts, bandwidth)
- [ ] Test backup restore procedure
- [ ] Review user feedback and error reports
- [ ] Update documentation

### Quarterly

- [ ] Rotate database passwords
- [ ] Security audit (review access logs, admin activity)
- [ ] Load testing
- [ ] Review and update this document
- [ ] PHP/MySQL/Redis version check (security patches)

### Annually

- [ ] SSL certificate renewal (if not using Cloudflare auto)
- [ ] SSH key rotation
- [ ] Full disaster recovery drill
- [ ] Architecture review and capacity planning

---

## 30. Production Readiness Checklist <a name="30-production-checklist"></a>

### Before Going Live

```
PRE-LAUNCH CHECKLIST
═══════════════════════════════════════════════════════════

INFRASTRUCTURE
  [ ] VPS provisioned and hardened
  [ ] Domain purchased and DNS configured
  [ ] SSL certificates installed (grade A+)
  [ ] Cloudflare configured (SSL, WAF, CDN)
  [ ] Firewall rules applied (UFW)
  [ ] Fail2ban installed
  [ ] Automatic security updates enabled

BACKEND
  [ ] APP_ENV=production, APP_DEBUG=false
  [ ] APP_KEY generated
  [ ] Database created with proper user privileges
  [ ] Migrations run successfully
  [ ] Redis configured with password
  [ ] config:cache, route:cache, view:cache run
  [ ] Storage symlink created
  [ ] File permissions set correctly
  [ ] Queue workers running (Supervisor)
  [ ] Scheduler running (cron/Supervisor)
  [ ] CORS configured for specific origins
  [ ] Rate limiting on auth endpoints
  [ ] Webhook signatures verified
  [ ] All .env variables set and validated

FRONTEND (Mobile)
  [ ] API URL pointing to production
  [ ] EAS build successful (Android + iOS)
  [ ] App tested on real devices
  [ ] Push notifications configured
  [ ] Deep linking tested
  [ ] Offline behavior tested
  [ ] Auth flow tested end-to-end
  [ ] Payment flow tested with real Paymob sandbox

ADMIN DASHBOARD
  [ ] Built and deployed
  [ ] API URL pointing to production
  [ ] Admin auth tested
  [ ] All CRUD operations verified

MONITORING
  [ ] Uptime monitoring configured
  [ ] Sentry connected (backend + frontend)
  [ ] Health check endpoint working
  [ ] Log rotation configured
  [ ] Alerting channels set up (Email, Telegram)

BACKUPS
  [ ] Database backup script tested
  [ ] Backup uploaded to off-site storage (R2/S3)
  [ ] Restore procedure tested and documented
  [ ] .env backup stored securely

CI/CD
  [ ] GitHub Actions workflows created
  [ ] Secrets configured in GitHub
  [ ] Test pipeline passing
  [ ] Deploy pipeline tested
  [ ] Rollback procedure documented and tested

SECURITY
  [ ] No hardcoded secrets in code
  [ ] .env not in version control
  [ ] SQL injection prevention verified
  [ ] XSS prevention verified
  [ ] CSRF protection enabled
  [ ] File upload validation
  [ ] Admin and customer auth separated
  [ ] All sensitive routes rate-limited
  [ ] Security headers configured in Nginx

PERFORMANCE
  [ ] Database indexes added
  [ ] Slow query log enabled
  [ ] OPcache enabled and configured
  [ ] Gzip compression enabled
  [ ] Static assets cached
  [ ] API responses < 500ms (P95)
  [ ] Load test completed (100 concurrent users)

DOCUMENTATION
  [ ] API documentation complete
  [ ] Deployment runbook complete
  [ ] Incident response plan documented
  [ ] Team members have server access
  [ ] This checklist completed and signed off
```

---

**END OF DOCUMENT**

_This guide should be reviewed and updated with every major infrastructure change. Store this document alongside your codebase and keep it version-controlled._

_Last reviewed: February 2026 | Next review: May 2026_
