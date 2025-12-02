import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { StatusBar } from "expo-status-bar";
import { Phone, Shield } from "lucide-react-native";

export default function PhoneVerificationScreen() {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp, user } = useStore();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 1: Enter phone, 2: Enter OTP
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    // Ensure phone starts with +
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    try {
      setLoading(true);
      await sendPhoneOtp(formattedPhone);
      setStep(2);
      setCountdown(60);
      Alert.alert("Success", "OTP sent to your phone number");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    try {
      setLoading(true);
      await verifyPhoneOtp(formattedPhone, otp);
      Alert.alert(
        "Success! 🎉",
        "Your phone number has been verified. Welcome to ElBaraka!",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              {step === 1 ? (
                <Phone size={48} color={Colors.primary900} />
              ) : (
                <Shield size={48} color={Colors.primary900} />
              )}
            </View>
            <Text style={styles.title}>
              {step === 1 ? "Verify Your Phone" : "Enter Verification Code"}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? "We need your phone number for delivery updates 🚚"
                : `We sent a 6-digit code to ${phone}`}
            </Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputWrapper}>
                <View style={styles.flagContainer}>
                  <Text style={styles.flag}>🇪🇬</Text>
                  <Text style={styles.countryCode}>+20</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="1012345678"
                  placeholderTextColor={Colors.neutralMedium}
                  value={phone.replace("+20", "")}
                  onChangeText={(text) =>
                    setPhone(`+20${text.replace(/\D/g, "")}`)
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.buttonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={Colors.neutralMedium}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textAlign="center"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>
                    Resend in {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={styles.resendLink}>Resend</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.changeNumberButton}
                onPress={() => {
                  setStep(1);
                  setOtp("");
                }}
              >
                <Text style={styles.changeNumberText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  flagContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.neutralGray,
  },
  flag: {
    fontSize: 24,
  },
  countryCode: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  phoneInput: {
    flex: 1,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
    paddingLeft: Spacing.md,
  },
  otpInput: {
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary900,
    paddingVertical: Spacing.lg,
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    letterSpacing: 8,
  },
  button: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: Spacing.md,
  },
  buttonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  resendText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  countdownText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralMedium,
  },
  resendLink: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_700Bold",
    color: Colors.primary900,
  },
  changeNumberButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  changeNumberText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
    textAlign: "center",
  },
});
