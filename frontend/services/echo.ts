import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { API_CONFIG } from '@/config/app.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// @ts-ignore
window.Pusher = Pusher;

// Extract hostname from BASE_URL
const getHost = () => {
    try {
        const url = new URL(API_CONFIG.BASE_URL);
        return url.hostname;
    } catch (e) {
        return '192.168.1.10'; // Fallback
    }
};

const echo = new Echo({
    broadcaster: 'reverb',
    key: 'vst3y4visf3dtbunxyzr', // REVERB_APP_KEY
    wsHost: getHost(),
    wsPort: 8081,
    wssPort: 8081,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authorizer: (channel, options) => {
        return {
            authorize: async (socketId, callback) => {
                try {
                    const token = await AsyncStorage.getItem('access_token');
                    console.log('[Echo] Authorizing channel:', channel.name, 'with socketId:', socketId);

                    const response = await fetch(`${API_CONFIG.BASE_URL}/broadcasting/auth`, {
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
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('[Echo] Auth failed with status:', response.status, errorText);
                        callback(new Error(errorText), null);
                        return;
                    }

                    const data = await response.json();
                    console.log('[Echo] Auth success:', data);
                    callback(null, data);
                } catch (error) {
                    console.error('[Echo] Auth error:', error);
                    callback(error instanceof Error ? error : new Error(String(error)), null);
                }
            }
        };
    },
});

export default echo;
