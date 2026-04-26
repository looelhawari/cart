import paramiko

host = '72.62.235.178'
username = 'root'
password = 'Cartrehab2026#'

script = """
cd /var/www/elbaraka/cart/unibackend
php artisan tinker --execute="\$cart = App\Models\Cart::has('items')->latest()->first(); \$productQuantities = []; foreach (\$cart->items as \$cartItem) { \$productId = (int) \$cartItem->product_id; \$productQuantities[\$productId] = (\$productQuantities[\$productId] ?? 0) + (int) \$cartItem->quantity; } \$products = App\Models\Product::whereIn('barcode', array_keys(\$productQuantities))->lockForUpdate()->get()->keyBy(fn(\$product) => (int) \$product->barcode); \$out = []; foreach (\$productQuantities as \$productId => \$qty) { \$product = \$products->get((int) \$productId); \$out[] = ['pid' => \$productId, 'found' => \$product !== null]; } echo json_encode(['cart_id' => \$cart->id, 'keys' => \$products->keys()->toArray(), 'checks' => \$out]);"
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
