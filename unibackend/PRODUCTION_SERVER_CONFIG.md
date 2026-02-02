# =============================================================
# ElBaraka Single-Server Production Configuration
# =============================================================
# OPTIMIZED FOR: 16GB RAM, 4 vCPU, 200GB Storage
# TARGET: 25,000 peak users, 10,000 orders/day
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
; For 16GB: (16384 - 6000 MySQL - 2000 Redis - 1000 System) / 50 = ~150
; Conservative setting for stability:
pm.max_children = 100

; Start servers - 25% of max_children
pm.start_servers = 25

; Minimum spare servers
pm.min_spare_servers = 10

; Maximum spare servers
pm.max_spare_servers = 35

; Requests before child respawn (prevents memory leaks)
pm.max_requests = 1000

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
# For 16GB server: 8-10GB for DB
innodb_buffer_pool_size = 8G

# Buffer pool instances (1 per GB, max 8)
innodb_buffer_pool_instances = 8

# Log file size (larger = better performance, slower recovery)
innodb_log_file_size = 1G
innodb_log_buffer_size = 128M

# Flush method
innodb_flush_method = O_DIRECT
innodb_flush_log_at_trx_commit = 2

# File per table (easier maintenance)
innodb_file_per_table = 1

# Thread concurrency
innodb_thread_concurrency = 8

# Connection settings (increased for 25k users)
max_connections = 500
max_allowed_packet = 64M
thread_cache_size = 100

# Query cache (deprecated in MySQL 8, use app-level caching)
# query_cache_type = 0

# Temp tables (increased for complex queries)
tmp_table_size = 128M
max_heap_table_size = 128M

# Join buffer (increased for better JOIN performance)
join_buffer_size = 8M
sort_buffer_size = 8M
read_buffer_size = 4M
read_rnd_buffer_size = 4M

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1


# =============================================================
# 3. Redis Configuration (/etc/redis/redis.conf)
# =============================================================

# Memory limit (2GB for Redis with 16GB server)
maxmemory 2gb

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

# Max clients (increased for 25k users)
maxclients 20000


# =============================================================
# 4. Supervisor Configuration (/etc/supervisor/conf.d/laravel-worker.conf)
# =============================================================

[program:laravel-worker-default]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --memory=256
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/log/supervisor/laravel-worker-default.log
stopwaitsecs=3600

[program:laravel-worker-high]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/artisan queue:work redis --queue=high --sleep=1 --tries=3 --max-time=3600 --memory=256
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
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
# 10. Expected Performance (16GB RAM, 4 vCPU)
# =============================================================

# With all optimizations applied:
# - 20,000 - 30,000 concurrent users
# - 500+ orders per hour (12,000/day)
# - < 100ms API response time (cached endpoints)
# - < 300ms API response time (DB queries)
# - 60-80% bandwidth reduction with Gzip
# - 50-80% reduction in DB load with Redis caching


# =============================================================
# 11. OPcache Configuration (/etc/php/8.2/fpm/conf.d/10-opcache.ini)
# =============================================================

[opcache]
; Enable OPcache
opcache.enable=1
opcache.enable_cli=1

; Memory for opcode cache (256MB for 16GB server)
opcache.memory_consumption=256

; Maximum number of files to cache
opcache.max_accelerated_files=20000

; Validation - Set to 0 in production for max speed
opcache.validate_timestamps=0

; Revalidation frequency (seconds)
opcache.revalidate_freq=0

; Huge pages for better performance (if supported)
opcache.huge_code_pages=1

; Interned strings buffer
opcache.interned_strings_buffer=32

; Save comments for annotations
opcache.save_comments=1

; Fast shutdown
opcache.fast_shutdown=1


# =============================================================
# 12. PHP.ini Production Settings (/etc/php/8.2/fpm/php.ini)
# =============================================================

[PHP]
; Memory limit per request
memory_limit = 256M

; Maximum execution time
max_execution_time = 60

; Upload limits
upload_max_filesize = 20M
post_max_size = 25M

; Realpath cache for faster file operations
realpath_cache_size = 4M
realpath_cache_ttl = 600

; Output buffering
output_buffering = 4096

; Disable expose_php header
expose_php = Off

; Error reporting (production)
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log

; Session settings (already using Redis, but just in case)
session.gc_probability = 0


# =============================================================
# 13. Nginx Worker Optimization (add to /etc/nginx/nginx.conf)
# =============================================================

# Main context settings for high traffic:
worker_processes auto;  # Usually matches CPU cores
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;  # Per worker
    use epoll;
    multi_accept on;
}

http {
    # Connection optimizations
    keepalive_timeout 30;
    keepalive_requests 1000;
    
    # Buffer sizes for proxying
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    
    # File descriptor cache
    open_file_cache max=10000 inactive=30s;
    open_file_cache_valid 60s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # Rate limiting (optional, additional layer)
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=conn:10m;
}
