import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppState, AppStateStatus } from "react-native";
import { useStore } from "@/store";
import { I18nProvider } from "@/i18n";
import {
  hasPendingPayment,
  isActivePaymentFlow,
} from "@/services/payment/paymentRecovery";
import {
  initializePushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  handleNotificationAction,
  setBadgeCount,
  getUnreadCount,
  isPushNotificationsSupported,
} from "@/services/notificationService";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useStore(
    (state) => state.hasCompletedOnboarding,
  );
  const checkAuthStatus = useStore((state) => state.checkAuthStatus);
  const fetchCart = useStore((state) => state.fetchCart);

  const notificationListener =
    useRef<ReturnType<typeof addNotificationReceivedListener>>();
  const responseListener =
    useRef<ReturnType<typeof addNotificationResponseListener>>();

  // Check authentication status on app startup
  useEffect(() => {
    checkAuthStatus().catch((error) => {
      console.log("Auth check failed on startup:", error);
    });
  }, []);

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Only initialize if push notifications are supported (not in Expo Go)
      if (isPushNotificationsSupported()) {
        // Initialize push notifications and register token
        initializePushNotifications().then((token) => {
          if (token) {
            console.log("Push notifications initialized with token:", token);
          }
        });

        // Update badge count on app start
        getUnreadCount().then((count) => {
          setBadgeCount(count);
        });
      } else {
        console.log(
          "Push notifications not supported in this environment (Expo Go or simulator)",
        );
      }
    }
  }, [isAuthenticated]);

  // Set up notification listeners (only if push notifications are supported)
  useEffect(() => {
    // Skip if push notifications are not supported (Expo Go or simulator)
    if (!isPushNotificationsSupported()) {
      return;
    }

    // Setup listeners asynchronously
    (async () => {
      // Handle notifications received while app is foregrounded
      notificationListener.current = await addNotificationReceivedListener(
        (notification) => {
          console.log("Notification received in foreground:", notification);
          // Update badge count
          getUnreadCount().then((count) => {
            setBadgeCount(count);
          });
        },
      );

      // Handle notification taps (user clicks on notification)
      responseListener.current = await addNotificationResponseListener(
        (response) => {
          console.log("Notification tapped:", response);
          const data = response.notification.request.content.data;
          if (data) {
            handleNotificationAction(data as Record<string, unknown>, router);
          }
        },
      );
    })();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Fetch cart on app start (if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart().catch((error) => {
        console.log("Failed to fetch cart on startup:", error);
      });
    }
  }, [isAuthenticated]);

  // Payment recovery on app resume
  useEffect(() => {
    const checkPendingPaymentOnResume = async () => {
      // Skip if we're in the middle of payment flow
      if (
        pathname === "/payment" ||
        pathname === "/payment-recovery" ||
        pathname?.startsWith("/checkout")
      ) {
        return;
      }

      // Skip if active payment flow is in progress (user just clicked Place Order)
      const isActive = await isActivePaymentFlow();
      if (isActive) {
        return;
      }

      const isPending = await hasPendingPayment();
      if (isPending) {
        router.replace("/payment-recovery");
      }
    };

    // DON'T check on mount - only on app resume
    // This prevents interference with normal payment flow

    // Check when app comes to foreground (app was backgrounded/killed)
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkPendingPaymentOnResume();
        }
      },
    );

    return () => subscription.remove();
  }, [pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pathname === "/") {
        if (!hasCompletedOnboarding) {
          router.replace("/onboarding");
        } else if (!isAuthenticated) {
          router.replace("/welcome");
        } else {
          router.replace("/(tabs)");
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="welcome"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="search"
        options={{ presentation: "modal", headerShown: true, title: "Search" }}
      />
      <Stack.Screen name="product" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: true, title: "Notifications" }}
      />
      <Stack.Screen name="complaints" options={{ headerShown: false }} />
      <Stack.Screen name="categories" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
      <Stack.Screen
        name="payment"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="payment-recovery"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="order-success"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </I18nProvider>
    </QueryClientProvider>
  );
}
