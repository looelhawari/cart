import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import PaymentWebView from "@/components/PaymentWebView";
import Colors from "@/constants/Colors";

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const iframeUrl = params.iframeUrl as string;
  const orderId = params.orderId ? parseInt(params.orderId as string) : 0;

  const handlePaymentSuccess = () => {
    // WebView component will navigate to order-success
  };

  const handlePaymentFailure = (error: string) => {
    // WebView component will navigate back
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <PaymentWebView
        iframeUrl={iframeUrl}
        orderId={orderId}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
});
