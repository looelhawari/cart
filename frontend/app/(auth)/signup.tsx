import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
  I18nManager,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useResponsive } from "@/hooks/useResponsive";
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
  Edit3,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
} from "lucide-react-native";
import { useTranslation } from "@/i18n";
import { API_CONFIG } from "@/config/app.config";
import { getCommonHeaders } from "@/services/api/base";

type Step = 1 | 2 | 3 | 4;

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const register = useStore((state) => state.register);
  const { wp, hp, isSmallDevice, isLargeDevice } = useResponsive();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>(
    params.step ? (parseInt(params.step as string) as Step) : 1,
  );
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState((params.email as string) || "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
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

  // Track the email/phone that were used in a successful register() call
  // so we can skip "already taken" checks for our own unverified record
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [registeredPhone, setRegisteredPhone] = useState<string | null>(null);

  // OTP BYPASS: Auto-start OTP timer / resend logic (commented out)
  // useEffect(() => {
  //   if (params.autoVerify === "true" && params.verifyEmail) {
  //     setEmail(params.verifyEmail as string);
  //     setStep(3);
  //     startOtpTimer();
  //     return;
  //   }
  //   if (params.step === "3") {
  //     startOtpTimer();
  //     if (params.email) {
  //       (async () => {
  //         try {
  //           await fetch(`${API_CONFIG.BASE_URL}/auth/resend-otp`, {
  //             method: "POST",
  //             headers: getCommonHeaders(),
  //             body: JSON.stringify({ email: params.email }),
  //           });
  //         } catch (error) {
  //           console.warn("Auto-send OTP error:", error);
  //         }
  //       })();
  //     }
  //   }
  // }, []);
  const checkEmailAvailability = async (emailToCheck: string) => {
    // Skip check if this email belongs to our own pending registration
    if (
      registeredEmail &&
      emailToCheck.trim().toLowerCase() === registeredEmail.toLowerCase()
    ) {
      setEmailError("");
      return;
    }
    try {
      setIsCheckingEmail(true);
      setEmailError("");

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
        },
        body: JSON.stringify({ email: emailToCheck }),
      });

      const data = await response.json();

      if (!response.ok && data.errors?.email) {
        setEmailError(data.errors.email[0]);
      }
    } catch (error) {
      console.log("Email check error:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const checkPhoneAvailability = async (phoneToCheck: string) => {
    // Skip check if this phone belongs to our own pending registration
    if (registeredPhone && phoneToCheck.trim() === registeredPhone.trim()) {
      setPhoneError("");
      return;
    }
    try {
      setIsCheckingPhone(true);
      setPhoneError("");

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
        },
        body: JSON.stringify({ phone: phoneToCheck }),
      });

      const data = await response.json();

      if (!response.ok && data.errors?.phone) {
        setPhoneError(data.errors.phone[0]);
      }
    } catch (error) {
      console.log("Phone check error:", error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const validateStep1 = () => {
    if (!firstName.trim()) {
      Alert.alert(t.common.error, t.signup.enterFirstName);
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert(t.common.error, t.signup.enterLastName);
      return false;
    }
    if (!email.trim()) {
      Alert.alert(t.common.error, t.signup.enterEmail);
      return false;
    }
    if (emailError) {
      Alert.alert(t.common.error, emailError);
      return false;
    }
    if (!phone.trim()) {
      Alert.alert(t.common.error, t.signup.enterPhone);
      return false;
    }
    if (phoneError) {
      Alert.alert(t.common.error, phoneError);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!password) {
      Alert.alert(t.common.error, t.signup.enterPassword);
      return false;
    }
    if (password.length < 8) {
      Alert.alert(t.common.error, t.signup.passwordMinLength);
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert(t.common.error, t.signup.passwordNeedsUppercase);
      return false;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert(t.common.error, t.signup.passwordNeedsNumber);
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      Alert.alert(t.common.error, t.signup.passwordNeedsSpecialChar);
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert(t.common.error, t.signup.passwordsNotMatch);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;

      // Actively verify email & phone are not already registered
      setLoading(true);
      try {
        let hasError = false;
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
        };

        // Skip check for email/phone that belong to our own unverified record
        const skipEmailCheck =
          registeredEmail &&
          email.trim().toLowerCase() === registeredEmail.toLowerCase();
        const skipPhoneCheck =
          registeredPhone && phone.trim() === registeredPhone.trim();

        if (!skipEmailCheck) {
          const emailRes = await fetch(
            `${API_CONFIG.BASE_URL}/auth/check-email`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ email: email.trim() }),
            },
          );
          const emailData = await emailRes.json();
          if (!emailRes.ok && emailData.errors?.email) {
            setEmailError(emailData.errors.email[0]);
            hasError = true;
          }
        }

        if (!skipPhoneCheck) {
          const phoneRes = await fetch(
            `${API_CONFIG.BASE_URL}/auth/check-phone`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ phone: phone.trim() }),
            },
          );
          const phoneData = await phoneRes.json();
          if (!phoneRes.ok && phoneData.errors?.phone) {
            setPhoneError(phoneData.errors.phone[0]);
            hasError = true;
          }
        }

        if (hasError) {
          Alert.alert(t.signup.validationError, t.signup.checkInputData);
          return;
        }

        setStep(2);
      } catch (error) {
        Alert.alert(t.common.error, t.alerts.networkError);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!validateStep2()) return;

      // OTP BYPASS: Register user and redirect directly to home (skip OTP step 3).
      //
      // BUGFIX: previously this fired-and-forgot the navigation 2s after
      // register() resolved, but `register()` resolves as soon as the HTTP
      // response is parsed — saveTokens() runs synchronously after that on
      // the same microtask but AsyncStorage.multiSet() is async. If the
      // user's network was fast OR the user tapped Next quickly, the first
      // authenticated request (orders/profile) could fire BEFORE
      // multiSet() had flushed, returning 401.
      //
      // We now: (1) await register() — which now also awaits the multiSet —
      // and (2) verify a token is actually visible in the in-memory cache
      // before navigating. If somehow the backend didn't return tokens, we
      // surface the error instead of dumping the user into /(tabs) where
      // every API call would 401.
      setLoading(true);
      try {
        await register({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          password,
          password_confirmation: confirmPassword,
          language,
        });

        // Defensive double-check: token must be persisted before we send
        // the user to authenticated screens. getAuthToken() reads the
        // in-memory cache that saveTokens() populates synchronously, so
        // this is effectively a "did the backend actually return tokens?"
        // assertion.
        const { getAuthToken } = await import("@/services/api/base");
        const token = await getAuthToken();
        if (!token) {
          throw new Error(
            "Registration succeeded but no session token was issued. Please log in.",
          );
        }

        // Track what we registered so we can skip checks if user edits and comes back
        setRegisteredEmail(email.trim());
        setRegisteredPhone(phone.trim());

        // OTP BYPASS: Skip step 3 (OTP), go directly to step 4 (success) then home
        setStep(4);
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 2000);

        // ---- OTP VERIFICATION FLOW (commented out) ----
        // setStep(3);
        // startOtpTimer();
        // if (result?.emailSent === false) {
        //   console.warn("[Signup] Initial OTP email failed, auto-resending...");
        //   try {
        //     await fetch(`${API_CONFIG.BASE_URL}/auth/resend-otp`, {
        //       method: "POST",
        //       headers: getCommonHeaders(),
        //       body: JSON.stringify({ email }),
        //     });
        //   } catch (retryError) {
        //     console.warn("[Signup] Auto-resend also failed:", retryError);
        //   }
        // }
        // ---- END OTP VERIFICATION FLOW ----
      } catch (error: any) {
        if (error.errors) {
          if (error.errors.email) {
            setEmailError(error.errors.email[0]);
          }
          if (error.errors.phone) {
            setPhoneError(error.errors.phone[0]);
          }
          setStep(1);
          Alert.alert(
            t.signup.validationError,
            error.message || t.signup.checkInputData,
          );
        } else {
          Alert.alert(
            t.common.error,
            error.message || t.signup.registrationFailed,
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // ---- OTP VERIFICATION FLOW (commented out) ----
  // const verifyEmail = useStore((state) => state.verifyEmail);

  // OTP timer effect (commented out - OTP step bypassed)
  // useEffect(() => {
  //   let interval: NodeJS.Timeout | undefined;
  //   if (step === 3 && otpTimer > 0) {
  //     interval = setInterval(() => {
  //       setOtpTimer((prev) => {
  //         if (prev <= 1) {
  //           setCanResend(true);
  //           return 0;
  //         }
  //         return prev - 1;
  //       });
  //     }, 1000);
  //   }
  //   return () => {
  //     if (interval) clearInterval(interval);
  //   };
  // }, [step, otpTimer]);

  // const startOtpTimer = () => {
  //   setOtpTimer(30);
  //   setCanResend(false);
  // };
  // ---- END OTP VERIFICATION FLOW ----

  // Placeholder so the rest of code that references startOtpTimer doesn't break
  const startOtpTimer = () => {};

  // Email validation effect (preserved - not OTP related)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && email.includes("@")) {
        checkEmailAvailability(email);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [email]);

  // Phone validation effect (preserved - not OTP related)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone && phone.length >= 10) {
        checkPhoneAvailability(phone);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [phone]);

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

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: getCommonHeaders(),
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        showResendToast();
      } else {
        const data = await response.json().catch(() => null);
        Alert.alert(
          t.common.error,
          data?.message || t.signup.failedToResendOtp,
        );
      }
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        t.alerts.networkError || "Network error. Please check your connection.",
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleEditEmail = () => {
    Alert.alert(t.signup.editEmail, t.signup.editEmailConfirm, [
      {
        text: t.common.cancel,
        style: "cancel",
      },
      {
        text: t.signup.yesEdit,
        onPress: () => {
          setStep(1);
          setOtp("");
        },
      },
    ]);
  };

  // ---- OTP VERIFICATION FLOW (commented out) ----
  // const handleVerify = async () => {
  //   const otpCode = otpDigits.join("");
  //   if (!otpCode || otpCode.length !== 6) {
  //     Alert.alert(t.common.error, t.signup.enterOtpCode);
  //     return;
  //   }
  //   try {
  //     setLoading(true);
  //     await verifyEmail({ email, otp: otpDigits.join("") });
  //     setStep(4);
  //     setTimeout(() => {
  //       router.replace("/(tabs)");
  //     }, 2000);
  //   } catch (error: any) {
  //     Alert.alert(t.common.error, error.message || t.signup.verificationFailed);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // ---- END OTP VERIFICATION FLOW ----
  const handleVerify = async () => {}; // OTP bypassed - placeholder to avoid reference errors


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
      <Text style={styles.stepTitle}>{t.signup.createAccount}</Text>
      <Text style={styles.stepSubtitle}>{t.signup.enterPersonalInfo}</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.firstName}</Text>
          <View style={styles.inputWrapper}>
            <User
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={t.signup.enterFirstNamePlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.lastName}</Text>
          <View style={styles.inputWrapper}>
            <User
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={t.signup.enterLastNamePlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.email}</Text>
          <View style={[styles.inputWrapper, emailError && styles.inputError]}>
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
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(""); // Clear error when user types
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {isCheckingEmail && (
              <ActivityIndicator
                size="small"
                color={Colors.primary900}
                style={styles.inputLoader}
              />
            )}
          </View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.phoneNumber}</Text>
          <View style={[styles.inputWrapper, phoneError && styles.inputError]}>
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
              onChangeText={(text) => {
                setPhone(text);
                setPhoneError(""); // Clear error when user types
              }}
              keyboardType="phone-pad"
            />
            {isCheckingPhone && (
              <ActivityIndicator
                size="small"
                color={Colors.primary900}
                style={styles.inputLoader}
              />
            )}
          </View>
          {phoneError ? (
            <Text style={styles.errorText}>{phoneError}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.language}</Text>
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
      <Text style={styles.stepTitle}>{t.signup.createPassword}</Text>
      <Text style={styles.stepSubtitle}>{t.signup.chooseStrongPassword}</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.password}</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.signup.enterPasswordPlaceholder}
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
          <Text style={styles.label}>{t.signup.confirmPassword}</Text>
          <View style={styles.inputWrapper}>
            <LockIcon
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.signup.confirmPasswordPlaceholder}
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
          <Text style={styles.requirementsTitle}>
            {t.signup.passwordMustContain}
          </Text>
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
              {t.signup.atLeast8Chars}
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
              {t.signup.oneUppercase}
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
              {t.signup.oneNumber}
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
              {t.signup.oneSpecialChar}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      {/* Toast notification */}
      {resendToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <CheckCircle size={18} color={Colors.neutralWhite} />
          <Text style={styles.toastText}>{t.signup.otpResent}</Text>
        </Animated.View>
      )}

      {/* Header icon */}
      <View style={styles.otpHeaderIcon}>
        <View style={styles.otpIconCircle}>
          <ShieldCheck size={32} color={Colors.primary900} />
        </View>
      </View>

      <Text style={[styles.stepTitle, styles.otpTitle]}>
        {t.signup.verifyAccount}
      </Text>
      <Text style={styles.otpSubtitle}>{t.signup.enterCodeSentTo}</Text>

      {/* Email display card */}
      <View style={styles.emailCard}>
        <View style={styles.emailCardLeft}>
          <Mail size={18} color={Colors.primary900} />
          <Text
            style={styles.emailCardText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {email}
          </Text>
        </View>
        <TouchableOpacity onPress={handleEditEmail} style={styles.editChip}>
          <Edit3 size={13} color={Colors.primary900} />
          <Text style={styles.editChipText}>{t.common.edit}</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.successContainer}>
      {/* Outer glow ring */}
      <View style={styles.successRingOuter}>
        <View style={styles.successRingInner}>
          <View style={styles.successCircle}>
            <Check size={48} color={Colors.neutralWhite} strokeWidth={3} />
          </View>
        </View>
      </View>
      <Text style={styles.successTitle}>{t.signup.accountCreated}</Text>
      <Text style={styles.successMessage}>
        {t.signup.accountCreatedSuccess}
      </Text>
      <View style={styles.successDivider} />
      <Text style={styles.successRedirecting}>{t.ui.redirectingToHome}</Text>
      <ActivityIndicator
        size="small"
        color={Colors.primary900}
        style={{ marginTop: Spacing.md }}
      />
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
                <Text style={styles.nextButtonText}>{t.common.next}</Text>
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
                <Text style={styles.nextButtonText}>{t.signup.verify}</Text>
              )}
            </TouchableOpacity>
          )}

          {step === 1 && (
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>
                {t.signup.alreadyHaveAccount}{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.loginLink}>{t.signup.signIn}</Text>
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
    marginEnd: Spacing.sm,
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
  otpSubtitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  emailCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  emailCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  emailCardText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary800,
    marginLeft: Spacing.xs,
    flexShrink: 1,
  },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editChipText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },
  otpDigitsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: Spacing.lg,
  },
  otpTitle: {
    textAlign: "center",
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
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  successRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successRingInner: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: Colors.success100,
    justifyContent: "center",
    alignItems: "center",
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary900,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  successMessage: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  successDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  successRedirecting: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
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
  inputError: {
    borderColor: Colors.accentRed,
  },
  errorText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.accentRed,
    marginTop: Spacing.xs,
  },

  inputLoader: {
    marginLeft: Spacing.xs,
  },
});
