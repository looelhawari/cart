/**
 * ElBaraka Driver App Configuration
 */

export const API_CONFIG = {
    BASE_URL: "http://192.168.1.5:8000/api/v1",
    TIMEOUT: 15000,
};

export const APP_CONFIG = {
    APP_NAME: "ElBaraka Driver",
    VERSION: "1.0.0",
    SUPPORT_PHONE: "+201234567890",
};

export const LOCATION_CONFIG = {
    /** How often to send location to server (ms) */
    UPDATE_INTERVAL: 15000,
    /** Min distance change to trigger update (meters) */
    DISTANCE_FILTER: 20,
    /** Background task name */
    TASK_NAME: "DRIVER_LOCATION_TASK",
};

export const STORAGE_KEYS = {
    ACCESS_TOKEN: "driver_access_token",
    USER_DATA: "driver_user_data",
};
