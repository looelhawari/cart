import paramiko

host = '72.62.235.178'
username = 'root'
password = 'Cartrehab2026#'
local_path = r'c:\Users\Kareem H\Music\Track\CART\cart\unibackend\app\Services\OrderService.php'
remote_path = '/var/www/elbaraka/cart/unibackend/app/Services/OrderService.php'

try:
    print(f"Connecting to {host}...")
    transport = paramiko.Transport((host, 22))
    transport.connect(username=username, password=password)
    
    print("Starting SFTP session...")
    sftp = paramiko.SFTPClient.from_transport(transport)
    
    print(f"Uploading {local_path} to {remote_path}...")
    sftp.put(local_path, remote_path)
    
    print("Upload successful!")
    sftp.close()
    transport.close()
except Exception as e:
    print(f"Error: {e}")
