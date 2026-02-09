import * as Network from "expo-network";
import { useEffect, useState } from "react";

/**
 * Network State Detector
 * Detects network connectivity and quality
 */

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType;
}

/**
 * Check current network state
 */
export const checkNetworkState = async (): Promise<NetworkState> => {
  try {
    const networkState = await Network.getNetworkStateAsync();

    return {
      isConnected: networkState.isConnected ?? false,
      isInternetReachable: networkState.isInternetReachable ?? false,
      type: networkState.type,
    };
  } catch (error) {
    console.error("Failed to check network state:", error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.UNKNOWN,
    };
  }
};

/**
 * Check if device is online
 */
export const isOnline = async (): Promise<boolean> => {
  const state = await checkNetworkState();
  return state.isConnected && state.isInternetReachable;
};

/**
 * Check if device is offline
 */
export const isOffline = async (): Promise<boolean> => {
  return !(await isOnline());
};

/**
 * React hook to monitor network state
 */
// Cached network state to avoid redundant async calls
let _lastNetworkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: Network.NetworkStateType.UNKNOWN,
};
let _networkCheckInProgress = false;
let _networkListenerCount = 0;
let _networkInterval: ReturnType<typeof setInterval> | null = null;

const startNetworkPolling = () => {
  if (_networkInterval) return;
  // Only poll every 30 seconds — lightweight enough
  _networkInterval = setInterval(async () => {
    if (_networkCheckInProgress) return;
    _networkCheckInProgress = true;
    try {
      _lastNetworkState = await checkNetworkState();
    } catch { }
    _networkCheckInProgress = false;
  }, 30000);
};

const stopNetworkPolling = () => {
  if (_networkInterval) {
    clearInterval(_networkInterval);
    _networkInterval = null;
  }
};

export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<NetworkState>(_lastNetworkState);

  useEffect(() => {
    let isMounted = true;
    _networkListenerCount++;

    // Do one initial check
    (async () => {
      if (_networkCheckInProgress) return;
      _networkCheckInProgress = true;
      try {
        _lastNetworkState = await checkNetworkState();
        if (isMounted) setNetworkState(_lastNetworkState);
      } catch { }
      _networkCheckInProgress = false;
    })();

    startNetworkPolling();

    // Sync from shared state every 30s
    const sync = setInterval(() => {
      if (isMounted) setNetworkState(_lastNetworkState);
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(sync);
      _networkListenerCount--;
      if (_networkListenerCount <= 0) {
        _networkListenerCount = 0;
        stopNetworkPolling();
      }
    };
  }, []);

  return networkState;
};

/**
 * React hook to check if online
 */
export const useIsOnline = (): boolean => {
  const networkState = useNetworkState();
  return networkState.isConnected && networkState.isInternetReachable;
};

/**
 * Get network type description
 */
export const getNetworkTypeDescription = (
  type: Network.NetworkStateType
): string => {
  switch (type) {
    case Network.NetworkStateType.WIFI:
      return "Wi-Fi";
    case Network.NetworkStateType.CELLULAR:
      return "Cellular";
    case Network.NetworkStateType.ETHERNET:
      return "Ethernet";
    case Network.NetworkStateType.BLUETOOTH:
      return "Bluetooth";
    case Network.NetworkStateType.WIMAX:
      return "WiMAX";
    case Network.NetworkStateType.VPN:
      return "VPN";
    case Network.NetworkStateType.NONE:
      return "No Connection";
    case Network.NetworkStateType.UNKNOWN:
    case Network.NetworkStateType.OTHER:
    default:
      return "Unknown";
  }
};
