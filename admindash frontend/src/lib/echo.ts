import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Define window interface to include Pusher and Echo
declare global {
    interface Window {
        Pusher: any;
        Echo: Echo;
    }
}

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: 'vst3y4visf3dtbunxyzr', // REVERB_APP_KEY
    wsHost: '192.168.1.10', // Using local IP for device testing support, matching API config
    wsPort: 8081, // REVERB_PORT
    wssPort: 8081,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    disableStats: true, // Reverb doesn't support stats yet
    authEndpoint: 'http://192.168.1.10:8000/api/v1/broadcasting/auth', // Use the backend URL
    auth: {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            Accept: 'application/json',
        },
    },
});

export default echo;
