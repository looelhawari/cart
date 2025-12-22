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
export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: Network.NetworkStateType.UNKNOWN,
  });

  useEffect(() => {
    let isMounted = true;

    const updateNetworkState = async () => {
      const state = await checkNetworkState();
      if (isMounted) {
        setNetworkState(state);
      }
    };

    // Initial check
    updateNetworkState();

    // Poll network state every 5 seconds
    const interval = setInterval(updateNetworkState, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
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
