import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Enable Pusher logging for debugging
Pusher.logToConsole = true;

// Define window interface to include Pusher and Echo
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

window.Pusher = Pusher as any;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://cartshop.site/api/v1';

const echo = new Echo({
    broadcaster: 'pusher',
    key: '140ea82c9593f7627bdc',
    cluster: 'eu',
    forceTLS: true,
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
    authorizer: (channel: any, _options: any) => {
        return {
            authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
                // Get token dynamically at auth time, not at module load time
                const token = localStorage.getItem('auth_token');
                console.log('[Echo] Authorizing channel:', channel.name, 'socketId:', socketId, 'hasToken:', !!token);

                if (!token) {
                    console.error('[Echo] No auth token found in localStorage');
                    callback(new Error('No auth token'), null);
                    return;
                }

                fetch(`${API_BASE_URL}/broadcasting/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name
                    })
                })
                    .then(async response => {
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Auth failed: ${response.status} - ${errorText || 'Unknown error'}`);
                        }
                        const text = await response.text();
                        if (!text || text.trim() === '') {
                            throw new Error('Server returned empty response');
                        }
                        return JSON.parse(text);
                    })
                    .then(data => {
                        console.log('[Echo] Auth success:', data);
                        callback(null, data);
                    })
                    .catch(error => {
                        console.error('[Echo] Auth error:', error);
                        callback(error, null);
                    });
            }
        };
    },
});

// Connection status logging
echo.connector.pusher.connection.bind('connected', () => {
    console.log('[Echo] ✓ Connected to Pusher');
});

echo.connector.pusher.connection.bind('error', (err: any) => {
    console.error('[Echo] Connection error:', err);
});

export default echo;
