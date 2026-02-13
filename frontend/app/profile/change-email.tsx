import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import { Toast } from "@/components/Toast";
import { profileApi } from "@/services/api/profileApi";

type Step = "request" | "verify" | "success";

export default function ChangeEmailScreen() {
  const { user, fetchProfile } = useStore();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>("request");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  const otpInputs = useRef<(TextInput | null)[]>([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ visible: true, message, type });
  };

  // ─── Step 1: Request OTP ──────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!newEmail.trim()) {
      showToast(t.changeEmail.enterNewEmail, "error");
      return;
    }
    if (!currentPassword.trim()) {
      showToast(t.changeEmail.enterPassword, "error");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      showToast(t.changeEmail.invalidEmail, "error");
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      showToast(t.changeEmail.sameEmail, "error");
      return;
    }

    setLoading(true);
    try {
      await profileApi.requestEmailChange({
        new_email: newEmail.trim().toLowerCase(),
        current_password: currentPassword,
      });
      showToast(t.changeEmail.otpSent, "success");
      setStep("verify");
    } catch (error: any) {
      const msg =
        error?.errors?.current_password?.[0] ||
        error?.errors?.new_email?.[0] ||
        error?.message ||
        t.changeEmail.requestFailed;
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      showToast(t.changeEmail.enterOtp, "error");
      return;
    }

    setLoading(true);
    try {
      await profileApi.verifyEmailChange({
        new_email: newEmail.trim().toLowerCase(),
        otp: otpString,
      });
      // Refresh profile to reflect new email
      await fetchProfile();
      setStep("success");
    } catch (error: any) {
      const msg = error?.message || t.changeEmail.verifyFailed;
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP input handler ────────────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste — distribute digits across inputs
      const digits = text
        .replace(/[^0-9]/g, "")
        .split("")
        .slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      otpInputs.current[nextIdx]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.changeEmail.title}</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── STEP 1: Request ────────────────────────────────────── */}
          {step === "request" && (
            <View style={styles.form}>
              {/* Current email display */}
              <View style={styles.currentEmailBox}>
                <Mail size={20} color={Colors.neutralMedium} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentEmailLabel}>
                    {t.changeEmail.currentEmail}
                  </Text>
                  <Text style={styles.currentEmailValue}>
                    {user?.email || ""}
                  </Text>
                </View>
              </View>

              {/* New email input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.changeEmail.newEmail}</Text>
                <TextInput
                  style={styles.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder={t.changeEmail.enterNewEmail}
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password confirmation */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t.changeEmail.confirmPassword}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t.changeEmail.enterPassword}
                    placeholderTextColor={Colors.neutralMedium}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={Colors.neutralMedium} />
                    ) : (
                      <Eye size={20} color={Colors.neutralMedium} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Security notice */}
              <View style={styles.securityNotice}>
                <ShieldCheck size={18} color={Colors.primary900} />
                <Text style={styles.securityText}>
                  {t.changeEmail.securityNotice}
                </Text>
              </View>

              {/* Send OTP button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRequestOtp}
                activeOpacity={0.9}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {t.changeEmail.sendCode}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Verify OTP ─────────────────────────────────── */}
          {step === "verify" && (
            <View style={styles.form}>
              <View style={styles.verifyHeader}>
                <Lock size={32} color={Colors.primary900} />
                <Text style={styles.verifyTitle}>
                  {t.changeEmail.verifyTitle}
                </Text>
                <Text style={styles.verifySubtitle}>
                  {t.changeEmail.verifySubtitle.replace(
                    "{email}",
                    newEmail.trim().toLowerCase(),
                  )}
                </Text>
              </View>

              {/* OTP inputs */}
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpInputs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : {},
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleOtpKeyPress(nativeEvent.key, index)
                    }
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 6 : 1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Resend */}
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleRequestOtp}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.resendText}>
                  {t.changeEmail.resendCode}
                </Text>
              </TouchableOpacity>

              {/* Verify button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                activeOpacity={0.9}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {t.changeEmail.verify}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back button */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep("request")}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>
                  {t.changeEmail.back}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Success ────────────────────────────────────── */}
          {step === "success" && (
            <View style={styles.successContainer}>
              <CheckCircle size={64} color={Colors.primary900} />
              <Text style={styles.successTitle}>
                {t.changeEmail.successTitle}
              </Text>
              <Text style={styles.successSubtitle}>
                {t.changeEmail.successSubtitle}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.back()}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>
                  {t.changeEmail.done}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  currentEmailBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  currentEmailLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  currentEmailValue: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  securityText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  // OTP step
  verifyHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  verifyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
  },
  verifySubtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralWhite,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
  },
  otpInputFilled: {
    borderColor: Colors.primary900,
    backgroundColor: "#F8F5FF",
  },
  resendButton: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  resendText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  // Success step
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    gap: Spacing.md,
  },
  successTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
  },
  successSubtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
});
