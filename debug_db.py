import paramiko
import os

host = '72.62.235.178'
username = 'root'
password = 'Cartrehab2026#'

script = """
cd /var/www/elbaraka/cart/unibackend
php artisan tinker --execute="\$i=App\Models\CartItem::latest()->first(); \$p=App\Models\Product::where('barcode', \$i?->product_id)->first(); echo json_encode(['cart_item_product_id'=>\$i?->product_id, 'cart_id'=>\$i?->cart_id, 'product_matches'=>\$p?->barcode, 'is_active'=>\$p?->is_active, 'is_in_stock'=>\$p?->is_in_stock, 'stock'=>\$p?->stock_quantity]);"
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
