# =============================================================
# ElBaraka Single-Server Production Configuration
# =============================================================
# This file contains optimized configurations for running
# the entire stack on a single 8GB RAM, 4 vCPU server.
# =============================================================

# =============================================================
# 1. PHP-FPM Configuration (/etc/php/8.2/fpm/pool.d/www.conf)
# =============================================================

[www]
user = www-data
group = www-data

listen = /run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data

; Process Manager - Dynamic for memory efficiency
pm = dynamic

; Maximum children - Based on: (Total RAM - Other Services) / 50MB per child
; For 8GB: (8192 - 2000 MySQL - 1000 Redis - 500 System) / 50 = ~90
; Conservative setting for stability:
pm.max_children = 40

; Start servers - 25% of max_children
pm.start_servers = 10

; Minimum spare servers
pm.min_spare_servers = 5

; Maximum spare servers
pm.max_spare_servers = 15

; Requests before child respawn (prevents memory leaks)
pm.max_requests = 500

; Request timeout
request_terminate_timeout = 60s

; Slow log for debugging
slowlog = /var/log/php-fpm/slow.log
request_slowlog_timeout = 5s

; Status page (useful for monitoring)
pm.status_path = /fpm-status
ping.path = /fpm-ping


# =============================================================
# 2. MySQL Configuration (/etc/mysql/mysql.conf.d/mysqld.cnf)
# =============================================================

[mysqld]
# Basic Settings
user = mysql
datadir = /var/lib/mysql
socket = /var/run/mysqld/mysqld.sock
bind-address = 127.0.0.1

# CRITICAL: InnoDB Buffer Pool
# Set to 60-70% of available RAM for database
# For 8GB server with other services: 4-5GB
innodb_buffer_pool_size = 4G

# Buffer pool instances (1 per GB)
innodb_buffer_pool_instances = 4

# Log file size (larger = better performance, slower recovery)
innodb_log_file_size = 512M
innodb_log_buffer_size = 64M

# Flush method
innodb_flush_method = O_DIRECT
innodb_flush_log_at_trx_commit = 2

# File per table (easier maintenance)
innodb_file_per_table = 1

# Thread concurrency
innodb_thread_concurrency = 8

# Connection settings
max_connections = 200
max_allowed_packet = 64M
thread_cache_size = 50

# Query cache (deprecated in MySQL 8, use app-level caching)
# query_cache_type = 0

# Temp tables
tmp_table_size = 64M
max_heap_table_size = 64M

# Join buffer
join_buffer_size = 4M
sort_buffer_size = 4M
read_buffer_size = 2M
read_rnd_buffer_size = 2M

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1


# =============================================================
# 3. Redis Configuration (/etc/redis/redis.conf)
# =============================================================

# Memory limit (1GB for Redis)
maxmemory 1gb

# Eviction policy - Remove least recently used keys when memory full
maxmemory-policy allkeys-lru

# Persistence - RDB snapshots (less I/O than AOF)
save 900 1
save 300 10
save 60 10000

# Disable AOF for performance (enable if you need persistence)
appendonly no

# TCP settings
tcp-keepalive 300
timeout 0

# Max clients
maxclients 10000


# =============================================================
# 4. Supervisor Configuration (/etc/supervisor/conf.d/laravel-worker.conf)
# =============================================================

[program:laravel-worker-default]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --memory=128
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/laravel-worker-default.log
stopwaitsecs=3600

[program:laravel-worker-high]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --queue=high --sleep=1 --tries=3 --max-time=3600 --memory=128
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/laravel-worker-high.log
stopwaitsecs=3600

[program:laravel-worker-emails]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --queue=emails --sleep=3 --tries=3 --max-time=3600 --memory=64
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/supervisor/laravel-worker-emails.log
stopwaitsecs=3600


# =============================================================
# 5. Nginx Configuration (/etc/nginx/sites-available/elbaraka)
# =============================================================

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    root /var/www/elbaraka/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;
    gzip_disable "MSIE [1-6]\.";

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

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
        fastcgi_read_timeout 60;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}


# =============================================================
# 6. Laravel .env Production Additions
# =============================================================

# Add these to your .env for production:

# APP_ENV=production
# APP_DEBUG=false
# LOG_LEVEL=warning

# CACHE_STORE=redis
# SESSION_DRIVER=redis
# QUEUE_CONNECTION=redis

# DB_CONNECTION=mysql
# (configure your production DB credentials)

# REDIS_HOST=127.0.0.1
# REDIS_PASSWORD=null
# REDIS_PORT=6379


# =============================================================
# 7. Cron Job (/etc/cron.d/laravel)
# =============================================================

* * * * * www-data cd /var/www/elbaraka && php artisan schedule:run >> /dev/null 2>&1


# =============================================================
# 8. Useful Commands
# =============================================================

# Clear all caches
# php artisan cache:clear
# php artisan config:cache
# php artisan route:cache
# php artisan view:cache

# Restart queue workers after code changes
# php artisan queue:restart

# Monitor queue
# php artisan queue:monitor redis:default,redis:high,redis:emails

# Check PHP-FPM status
# curl http://localhost/fpm-status

# Restart services
# sudo systemctl restart php8.2-fpm
# sudo systemctl restart nginx
# sudo systemctl restart mysql
# sudo systemctl restart redis-server
# sudo supervisorctl restart all


# =============================================================
# 9. Monitoring Recommendations
# =============================================================

# Install these for monitoring:
# - htop (system resources)
# - mytop (MySQL queries)
# - redis-cli monitor (Redis commands)
# - Laravel Telescope (development only - disable in production)

# Quick health checks:
# redis-cli ping
# mysql -e "SHOW STATUS LIKE 'Threads_connected';"
# curl -s localhost/fpm-status | grep "active processes"


# =============================================================
# 10. Expected Performance (8GB RAM, 4 vCPU)
# =============================================================

# With all optimizations applied:
# - 5,000 - 15,000 concurrent users
# - 1,000+ orders per hour
# - < 200ms API response time (cached)
# - < 500ms API response time (DB queries)
# - 50-80% reduction in DB load with Redis caching
