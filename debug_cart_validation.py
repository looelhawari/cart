import paramiko

host = '72.62.235.178'
username = 'root'
password = 'Cartrehab2026#'

script = """
cd /var/www/elbaraka/cart/unibackend
php artisan tinker --execute="\$cart=App\Models\Cart::find(173); \$cart->load('items.product'); \$productQuantities = []; foreach (\$cart->items as \$c) { \$pid = (int)\$c->product_id; \$productQuantities[\$pid] = (\$productQuantities[\$pid] ?? 0) + (int)\$c->quantity; } \$products=App\Models\Product::whereIn('barcode', array_keys(\$productQuantities))->get()->keyBy(fn(\$p)=>(int)\$p->barcode); \$out=[]; foreach (\$productQuantities as \$pid => \$qty) { \$p = \$products->get((int)\$pid); \$fail = !\$p || !\$p->is_active || !\$p->is_in_stock; \$out[] = ['pid'=>\$pid, 'found'=>\$p!==null, 'is_active'=>\$p?->is_active, 'is_in_stock'=>\$p?->is_in_stock, 'fail'=>\$fail]; } echo json_encode(['cart_id'=>173, 'checks'=>\$out]);"
"""

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=username, password=password)
    
    stdin, stdout, stderr = client.exec_command(script)
    print("STDOUT:")
    print(stdout.read().decode())
    print("STDERR:")
    print(stderr.read().decode())
    
    client.close()
except Exception as e:
    print(f"Error: {e}")
