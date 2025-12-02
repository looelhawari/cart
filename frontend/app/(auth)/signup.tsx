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
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { StatusBar } from "expo-status-bar";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Check,
  Lock as LockIcon,
} from "lucide-react-native";

type Step = 1 | 2 | 3 | 4;

export default function SignupScreen() {
  const router = useRouter();
  const register = useStore((state) => state.register);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);

  const validateStep1 = () => {
    if (!firstName.trim()) {
      Alert.alert("Error", "Please enter your first name");
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert("Error", "Please enter your last name");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return false;
    }
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return false;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // Submit registration
      try {
        setLoading(true);
        await register({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          password,
          password_confirmation: confirmPassword,
          language,
        });
        setStep(3);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Registration failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const verifyEmail = useStore((state) => state.verifyEmail);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    try {
      setLoading(true);
      await verifyEmail({ email, otp });
      setStep(4);

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2000);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressBar}>
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          style={[styles.progressStep, step >= s && styles.progressStepActive]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepSubtitle}>Enter your personal information</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>First Name</Text>
          <View style={styles.inputWrapper}>
            <User
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              placeholderTextColor={Colors.neutralMedium}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Last Name</Text>
          <View style={styles.inputWrapper}>
            <User
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              placeholderTextColor={Colors.neutralMedium}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>

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
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Phone
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="+20 123 456 7890"
              placeholderTextColor={Colors.neutralMedium}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.languageToggle}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === "en" && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage("en")}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "en" && styles.languageTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === "ar" && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage("ar")}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "ar" && styles.languageTextActive,
                ]}
              >
                العربية
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Password</Text>
      <Text style={styles.stepSubtitle}>Choose a strong password</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter password"
              placeholderTextColor={Colors.neutralMedium}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
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
              placeholder="Confirm password"
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

        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <View style={styles.requirementRow}>
            <Check
              size={16}
              color={
                password.length >= 8 ? Colors.primary700 : Colors.neutralMedium
              }
            />
            <Text
              style={[
                styles.requirementText,
                password.length >= 8 && styles.requirementMet,
              ]}
            >
              At least 8 characters
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Check
              size={16}
              color={
                /[A-Z]/.test(password)
                  ? Colors.primary700
                  : Colors.neutralMedium
              }
            />
            <Text
              style={[
                styles.requirementText,
                /[A-Z]/.test(password) && styles.requirementMet,
              ]}
            >
              One uppercase letter
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Check
              size={16}
              color={
                /[0-9]/.test(password)
                  ? Colors.primary700
                  : Colors.neutralMedium
              }
            />
            <Text
              style={[
                styles.requirementText,
                /[0-9]/.test(password) && styles.requirementMet,
              ]}
            >
              One number
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Check
              size={16}
              color={
                /[!@#$%^&*(),.?":{}|<>]/.test(password)
                  ? Colors.primary700
                  : Colors.neutralMedium
              }
            />
            <Text
              style={[
                styles.requirementText,
                /[!@#$%^&*(),.?":{}|<>]/.test(password) &&
                  styles.requirementMet,
              ]}
            >
              One special character
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Verify Your Account</Text>
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
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.successContainer}>
      <View style={styles.successCircle}>
        <Check size={64} color={Colors.neutralWhite} />
      </View>
      <Text style={styles.successTitle}>Account Created!</Text>
      <Text style={styles.successMessage}>
        Your account has been created successfully.{"\n"}Redirecting to home...
      </Text>
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
          {step > 1 && step < 4 && (
            <TouchableOpacity
              onPress={() => setStep((prev) => (prev - 1) as Step)}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          )}
          {step < 4 && renderProgressBar()}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {step < 3 && (
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.neutralWhite} />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          )}

          {step === 3 && (
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.neutralWhite} />
              ) : (
                <Text style={styles.nextButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
          )}

          {step === 1 && (
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
    marginBottom: Spacing.md,
  },
  progressBar: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.neutralGray,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: Colors.primary900,
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
  },
  inputContainer: {
    gap: Spacing.xs,
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
  requirementsContainer: {
    backgroundColor: Colors.neutralCloud,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  requirementsTitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  requirementText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  requirementMet: {
    color: Colors.primary700,
  },
  otpContainer: {
    marginTop: Spacing.xl,
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
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  resendText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary700,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.h1,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  successMessage: {
    fontSize: Typography.bodyLarge,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 24,
  },
  nextButton: {
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
    marginTop: Spacing.xl,
  },
  nextButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  loginText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  loginLink: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
    color: Colors.primary900,
  },
  languageToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  languageOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralCloud,
    alignItems: "center",
  },
  languageOptionActive: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary900,
  },
  languageText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  languageTextActive: {
    color: Colors.neutralWhite,
  },
});
