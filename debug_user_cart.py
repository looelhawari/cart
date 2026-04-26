import paramiko
import json

host = '72.62.235.178'
username = 'root'
password = 'Cartrehab2026#'

script = r"""
cd /var/www/elbaraka/cart/unibackend
php artisan tinker --execute="\$u = App\Models\User::where('email','nadermohamed10077@gmail.com')->first(); \$cart = App\Models\Cart::where('user_id', \$u->id)->first(); \$out = []; if (\$cart){ foreach(\$cart->items as \$i){ \$p = App\Models\Product::where('barcode', \$i->product_id)->first(); \$out[] = ['cart_product_id' => \$i->product_id, 'cart_qty' => \$i->quantity, 'found' => \$p!==null, 'is_active'=>\$p?->is_active, 'is_in_stock'=>\$p?->is_in_stock, 'db_stock'=>\$p?->stock_quantity, 'name'=>\$p?->name_en]; } } echo json_encode(['cart_id' => \$cart?->id, 'items' => \$out]);"
"""

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=username, password=password)
    
    stdin, stdout, stderr = client.exec_command(script)
    output = stdout.read().decode().strip()
    
    # Try to find JSON in the output
    for line in output.split('\n'):
        if line.startswith('{'):
            data = json.loads(line)
            print("Cart ID:", data.get('cart_id'))
            for item in data.get('items', []):
                print(f"Product: {item.get('name')}")
                print(f"  Barcode: {item.get('cart_product_id')}")
                print(f"  Cart Qty: {item.get('cart_qty')}")
                print(f"  Found in DB: {item.get('found')}")
                if item.get('found'):
                    print(f"  Active: {item.get('is_active')}")
                    print(f"  In Stock: {item.get('is_in_stock')}")
                    print(f"  Stock Qty (DB): {item.get('db_stock')}")
                print("-" * 30)
    
    client.close()
except Exception as e:
    print(f"Error: {e}")
