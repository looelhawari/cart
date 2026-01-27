import { API_BASE_URL, getAuthToken } from './base';

/**
 * Save push notification token
 */
export const savePushToken = async (
    token: string,
    deviceType: 'ios' | 'android' | 'web'
): Promise<{
    success: boolean;
    message: string;
}> => {
    const authToken = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/notifications/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ token, device_type: deviceType }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save push token');
    }

    return response.json();
};

/**
 * Remove push notification token
 */
export const removePushToken = async (token: string): Promise<{
    success: boolean;
    message: string;
}> => {
    const authToken = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/notifications/token`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ token }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove push token');
    }

    return response.json();
};
