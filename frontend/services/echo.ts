import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { API_CONFIG } from '@/config/app.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable Pusher logging for debugging
Pusher.logToConsole = true;

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'pusher',
    key: '140ea82c9593f7627bdc',
    cluster: 'eu',
    forceTLS: true,
    authorizer: (channel: any, options: any) => {
        return {
            authorize: async (socketId: string, callback: (error: Error | null, data: any) => void) => {
                try {
                    const token = await AsyncStorage.getItem('access_token');
                    console.log('[Echo] Authorizing channel:', channel.name, 'socketId:', socketId);

                    if (!token) {
                        console.error('[Echo] No auth token found');
                        callback(new Error('No auth token'), null);
                        return;
                    }

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
                        callback(new Error(errorText || `Auth failed: ${response.status}`), null);
                        return;
                    }

                    // Get response text first to handle empty responses
                    const responseText = await response.text();

                    if (!responseText || responseText.trim() === '') {
                        console.error('[Echo] Auth returned empty response');
                        callback(new Error('Server returned empty response'), null);
                        return;
                    }

                    try {
                        const data = JSON.parse(responseText);
                        console.log('[Echo] Auth success:', data);
                        callback(null, data);
                    } catch (parseError) {
                        console.error('[Echo] Failed to parse auth response:', responseText);
                        callback(new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`), null);
                    }
                } catch (error) {
                    console.error('[Echo] Auth error:', error);
                    callback(error instanceof Error ? error : new Error(String(error)), null);
                }
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

echo.connector.pusher.connection.bind('disconnected', () => {
    console.log('[Echo] Disconnected from Pusher');
});

export default echo;
