import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "@/store";
import { authApi } from "@/services/api";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { StatusBar } from "expo-status-bar";
import {
  Mail,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock as LockIcon,
} from "lucide-react-native";

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const forgotPassword = useStore((state) => state.forgotPassword);
  const verifyResetOtp = authApi.verifyResetOtp.bind(authApi);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword({ email });
      setStep(2);
      Alert.alert("Success", "Reset code has been sent to your email");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    try {
      setLoading(true);
      // Verify OTP with backend before proceeding
      await verifyResetOtp({ email, otp });
      setStep(3);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = useStore((state) => state.resetPassword);

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        email,
        otp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      Alert.alert("Success", "Password has been reset successfully", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Forgot Password?</Text>
      <Text style={styles.stepSubtitle}>
        Enter your email address and we will send you a reset code
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <Mail
            size={20}
            color={Colors.neutralMedium}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={Colors.neutralMedium}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.neutralWhite} />
        ) : (
          <Text style={styles.actionButtonText}>Send Reset Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Verify Code</Text>
      <Text style={styles.stepSubtitle}>
        Enter the 6-digit code sent to{"\n"}
        {email}
      </Text>

      <View style={styles.otpContainer}>
        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor={Colors.neutralMedium}
          value={otp}
          onChangeText={(text) => setOtp(text.slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
      </View>

      <TouchableOpacity style={styles.resendButton} disabled={otpTimer > 0}>
        <Text style={styles.resendText}>
          {otpTimer > 0 ? `Resend code in ${otpTimer}s` : "Resend Code"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.buttonDisabled]}
        onPress={handleVerifyOtp}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.neutralWhite} />
        ) : (
          <Text style={styles.actionButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>New Password</Text>
      <Text style={styles.stepSubtitle}>Create a new strong password</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter new password"
              placeholderTextColor={Colors.neutralMedium}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              {showNewPassword ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.neutralMedium}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}  
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.neutralWhite} />
        ) : (
          <Text style={styles.actionButtonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView} 
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 1) {
                router.back();
              } else {
                setStep((prev) => (prev - 1) as Step);
              }
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutralCloud,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.h1,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: Typography.bodyLarge,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
  },
  passwordInput: {
    paddingRight: Spacing.xxl,
  },
  eyeIcon: {
    padding: Spacing.xs,
    position: "absolute",
    right: Spacing.sm,
  },
  otpContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    letterSpacing: 12,
    padding: Spacing.lg,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    color: Colors.neutralCharcoal,
  },
  resendButton: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    padding: Spacing.md,
  },
  resendText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },
  actionButton: {
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
  },
  actionButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
