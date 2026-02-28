import React, { useState, useRef, useEffect, useCallback } from "react";
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
  I18nManager,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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
  RefreshCw,
  ShieldCheck,
  CheckCircle,
} from "lucide-react-native";
import { useTranslation } from "@/i18n";
import { API_CONFIG } from "@/config/app.config";

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState((params.email as string) || "");
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [resendToast, setResendToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const forgotPassword = useStore((state) => state.forgotPassword);
  const verifyResetOtp = authApi.verifyResetOtp.bind(authApi);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert(t.common.error, t.forgotPassword.enterEmail);
      return;
    }

    try {
      setLoading(true);
      await forgotPassword({ email });
      setStep(2);
      startOtpTimer();
      Alert.alert(t.common.success, t.forgotPassword.codeSent);
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error.message || t.forgotPassword.failedToSend,
      );
    } finally {
      setLoading(false);
    }
  };

  // OTP Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (step === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, otpTimer]);

  const startOtpTimer = () => {
    setOtpTimer(30);
    setCanResend(false);
  };

  const showResendToast = useCallback(() => {
    setResendToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => setResendToast(false));
  }, [toastOpacity]);

  const handleOtpDigitChange = (text: string, index: number) => {
    const newDigits = [...otpDigits];
    // Handle paste of full OTP
    if (text.length > 1) {
      const pastedDigits = text
        .replace(/[^0-9]/g, "")
        .slice(0, 6)
        .split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedDigits[i] || "";
      }
      setOtpDigits(newDigits);
      setOtp(newDigits.join(""));
      const lastFilledIndex = Math.min(pastedDigits.length - 1, 5);
      otpInputRefs.current[lastFilledIndex]?.focus();
      return;
    }
    newDigits[index] = text.replace(/[^0-9]/g, "");
    setOtpDigits(newDigits);
    setOtp(newDigits.join(""));
    // Auto-advance to next input
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      const newDigits = [...otpDigits];
      newDigits[index - 1] = "";
      setOtpDigits(newDigits);
      setOtp(newDigits.join(""));
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    startOtpTimer();
    showResendToast();

    try {
      await forgotPassword({ email });
    } catch (error: any) {
      console.warn("Resend forgot password OTP error:", error.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otpDigits.join("");
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert(t.common.error, t.forgotPassword.enterCode);
      return;
    }

    try {
      setLoading(true);
      // Verify OTP with backend before proceeding
      await verifyResetOtp({ email, otp: otpCode });
      setStep(3);
    } catch (error: any) {
      Alert.alert(t.common.error, error.message || t.forgotPassword.invalidOtp);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = useStore((state) => state.resetPassword);

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert(t.common.error, t.forgotPassword.enterNewPassword);
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t.common.error, t.signup.passwordMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.common.error, t.signup.passwordsNotMatch);
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        email,
        otp: otpDigits.join(""),
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      Alert.alert(t.common.success, t.forgotPassword.passwordResetSuccess, [
        { text: t.common.ok, onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error.message || t.forgotPassword.failedToReset,
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t.forgotPassword.title}</Text>
      <Text style={styles.stepSubtitle}>{t.forgotPassword.subtitle}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t.signup.email}</Text>
        <View style={styles.inputWrapper}>
          <Mail
            size={20}
            color={Colors.neutralMedium}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t.signup.enterEmailPlaceholder}
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
          <Text style={styles.actionButtonText}>
            {t.forgotPassword.sendResetCode}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Toast notification */}
      {resendToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <CheckCircle size={18} color={Colors.neutralWhite} />
          <Text style={styles.toastText}>{t.forgotPassword.codeSent}</Text>
        </Animated.View>
      )}

      {/* Header icon */}
      <View style={styles.otpHeaderIcon}>
        <View style={styles.otpIconCircle}>
          <ShieldCheck size={32} color={Colors.primary900} />
        </View>
      </View>

      <Text style={[styles.stepTitle, styles.otpTitle]}>
        {t.forgotPassword.verifyCode}
      </Text>
      <Text style={styles.otpSubtitle}>
        {t.forgotPassword.enterCodeSentTo}
        {"\n"}
        {email}
      </Text>

      {/* Individual digit inputs */}
      <View style={styles.otpDigitsRow}>
        {otpDigits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              otpInputRefs.current[index] = ref;
            }}
            style={[styles.otpDigitInput, digit ? styles.otpDigitFilled : null]}
            value={digit}
            onChangeText={(text) => handleOtpDigitChange(text, index)}
            onKeyPress={(e) => handleOtpKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            autoFocus={index === 0}
            selectTextOnFocus
          />
        ))}
      </View>

      {/* Timer / resend */}
      <View style={styles.resendRow}>
        {isResending ? (
          <ActivityIndicator size="small" color={Colors.primary900} />
        ) : canResend ? (
          <TouchableOpacity
            onPress={handleResendOtp}
            style={styles.resendTouchable}
          >
            <RefreshCw size={16} color={Colors.primary900} />
            <Text style={styles.resendActiveText}>{t.signup.resendCode}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.resendTimerRow}>
            <RefreshCw size={16} color={Colors.neutralMedium} />
            <Text style={styles.resendTimerText}>
              {t.signup.resendIn} {otpTimer}s
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.buttonDisabled]}
        onPress={handleVerifyOtp}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.neutralWhite} />
        ) : (
          <Text style={styles.actionButtonText}>
            {t.forgotPassword.verifyCode}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t.forgotPassword.newPassword}</Text>
      <Text style={styles.stepSubtitle}>
        {t.forgotPassword.createNewPassword}
      </Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.forgotPassword.newPassword}</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.forgotPassword.enterNewPasswordPlaceholder}
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
          <Text style={styles.label}>{t.signup.confirmPassword}</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.forgotPassword.confirmNewPasswordPlaceholder}
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
          <Text style={styles.actionButtonText}>{t.auth.resetPassword}</Text>
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
    paddingRight: I18nManager.isRTL ? undefined : Spacing.xxl,
    paddingLeft: I18nManager.isRTL ? Spacing.xxl : undefined,
  },
  eyeIcon: {
    padding: Spacing.xs,
    position: "absolute",
    right: I18nManager.isRTL ? undefined : Spacing.sm,
    left: I18nManager.isRTL ? Spacing.sm : undefined,
  },
  otpHeaderIcon: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  otpIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary100,
    justifyContent: "center",
    alignItems: "center",
  },
  otpTitle: {
    textAlign: "center",
  },
  otpSubtitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  otpDigitsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: Spacing.lg,
  },
  otpDigitInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralCloud,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
  } as any,
  otpDigitFilled: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary100,
  },
  resendRow: {
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    minHeight: 40,
    justifyContent: "center",
  },
  resendTouchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  resendActiveText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },
  resendTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  resendTimerText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  toast: {
    position: "absolute",
    top: -8,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginHorizontal: Spacing.md,
  },
  toastText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralWhite,
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
