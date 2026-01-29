# Deployment Guide - El Baraka (Ubuntu Server on Hostinger)

This guide covers deploying the **Admin Dashboard** (React/Vite) and **Backend** (Laravel 11) to your Ubuntu server on Hostinger.

---

## Prerequisites on Server

Before starting, ensure your Ubuntu server has:
- SSH access configured
- Domain or subdomain pointing to your server IP

---

## Step 1: Connect to Your Server via SSH

```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

---

## Step 2: Update System & Install Required Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Nginx
sudo apt install -y nginx

# Install PHP 8.2 and required extensions
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.2-fpm php8.2-cli php8.2-common php8.2-mysql php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl php8.2-xml php8.2-bcmath php8.2-intl php8.2-redis

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js 20.x (for building admin dashboard)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL (if not using external database)
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

---

## Step 3: Create MySQL Database

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE elbaraka_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'elbaraka_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON elbaraka_db.* TO 'elbaraka_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import your database
mysql -u elbaraka_user -p elbaraka_db < /path/to/elbaraka_unified.sql
```

---

## Step 4: Create Project Directory Structure

```bash
# Create directories
sudo mkdir -p /var/www/elbaraka/backend
sudo mkdir -p /var/www/elbaraka/admin

# Set ownership
sudo chown -R $USER:www-data /var/www/elbaraka
```

---

## Step 5: Deploy Backend (Laravel)

### Option A: Upload via Git (Recommended)

```bash
cd /var/www/elbaraka/backend

# Clone repository (if using Git)
git clone your-repo-url .

# Or copy files manually via SCP from your local machine:
# scp -r ./unibackend/* user@server-ip:/var/www/elbaraka/backend/
```

### Option B: Upload via SCP (From your local Windows machine)

Open PowerShell locally:
```powershell
scp -r D:\elbarakkaaaaa\unibackend\* user@server-ip:/var/www/elbaraka/backend/
```

### Configure Laravel on Server

```bash
cd /var/www/elbaraka/backend

# Install dependencies (without dev dependencies for production)
composer install --no-dev --optimize-autoloader

# Copy and configure environment
cp .env.example .env
nano .env
```

### Update `.env` file:

```env
APP_NAME="El Baraka"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elbaraka_db
DB_USERNAME=elbaraka_user
DB_PASSWORD=your_secure_password

# Add your other configs (Paymob, Cloudinary, Mail, etc.)
```

### Continue Laravel Setup

```bash
# Generate application key
php artisan key:generate

# Run migrations (skip if you imported SQL)
# php artisan migrate --force

# Clear and cache config for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage link
php artisan storage:link

# Set proper permissions
sudo chown -R www-data:www-data /var/www/elbaraka/backend
sudo chmod -R 755 /var/www/elbaraka/backend
sudo chmod -R 775 /var/www/elbaraka/backend/storage
sudo chmod -R 775 /var/www/elbaraka/backend/bootstrap/cache
```

---

## Step 6: Deploy Admin Dashboard (React/Vite)

### Build Locally First (Recommended)

On your **local Windows machine**:

```powershell
cd "D:\elbarakkaaaaa\admindash frontend"

# Create production .env
# Edit .env with your production API URL:
# VITE_API_URL=https://api.yourdomain.com/api

# Install dependencies and build
npm install
npm run build
```

### Upload Built Files to Server

```powershell
# Upload the dist folder to server
scp -r "D:\elbarakkaaaaa\admindash frontend\dist\*" user@server-ip:/var/www/elbaraka/admin/
```

### Or Build on Server

```bash
cd /var/www/elbaraka

# Clone or copy admin dashboard source
# Then:
cd /var/www/elbaraka/admin-source
npm install
npm run build

# Copy built files
cp -r dist/* /var/www/elbaraka/admin/
```

---

## Step 7: Configure Nginx

### Create Backend Configuration

```bash
sudo nano /etc/nginx/sites-available/elbaraka-api
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/elbaraka/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Increase upload size for images
    client_max_body_size 50M;
}
```

### Create Admin Dashboard Configuration

```bash
sudo nano /etc/nginx/sites-available/elbaraka-admin
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /var/www/elbaraka/admin;

    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

### Enable Sites

```bash
# Enable configurations
sudo ln -s /etc/nginx/sites-available/elbaraka-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/elbaraka-admin /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 8: Install SSL Certificates (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates for both domains
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com

# Auto-renewal is automatically configured
# Test auto-renewal:
sudo certbot renew --dry-run
```

---

## Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Step 10: Set Up Laravel Queue Worker (Optional but Recommended)

Create a systemd service for Laravel queue:

```bash
sudo nano /etc/systemd/system/laravel-queue.service
```

Add:

```ini
[Unit]
Description=Laravel Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/elbaraka/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable laravel-queue
sudo systemctl start laravel-queue
```

---

## Step 11: Set Up Laravel Scheduler (Cron)

```bash
# Edit crontab
sudo crontab -e

# Add this line:
* * * * * cd /var/www/elbaraka/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## Quick Deployment Commands Summary

### From Your Local Windows Machine:

```powershell
# 1. Build admin dashboard
cd "D:\elbarakkaaaaa\admindash frontend"
npm run build

# 2. Upload backend
scp -r D:\elbarakkaaaaa\unibackend\* user@server:/var/www/elbaraka/backend/

# 3. Upload admin dashboard
scp -r "D:\elbarakkaaaaa\admindash frontend\dist\*" user@server:/var/www/elbaraka/admin/
```

### On Server After Upload:

```bash
cd /var/www/elbaraka/backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo chown -R www-data:www-data /var/www/elbaraka
sudo systemctl restart nginx php8.2-fpm
```

---

## Troubleshooting

### Check Logs

```bash
# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Laravel logs
sudo tail -f /var/www/elbaraka/backend/storage/logs/laravel.log

# PHP-FPM logs
sudo tail -f /var/log/php8.2-fpm.log
```

### Common Issues

1. **500 Error**: Check Laravel logs, ensure `.env` is configured correctly
2. **Permission Denied**: Run the chmod commands from Step 5
3. **CORS Issues**: Ensure Laravel CORS is configured for your admin domain
4. **API Connection Failed**: Verify the `VITE_API_URL` in admin dashboard

### Clear All Caches

```bash
cd /var/www/elbaraka/backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

---

## DNS Configuration (In Hostinger Panel)

Create these DNS records pointing to your server IP:

| Type | Name | Value |
|------|------|-------|
| A | api | Your-Server-IP |
| A | admin | Your-Server-IP |

---

## Updating the Application

```bash
# Pull latest changes (if using Git)
cd /var/www/elbaraka/backend
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache

# For admin dashboard
cd /var/www/elbaraka/admin
# Upload new dist files
```

---

**Your sites will be available at:**
- **Admin Dashboard**: https://admin.yourdomain.com
- **API Backend**: https://api.yourdomain.com
