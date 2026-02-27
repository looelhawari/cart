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
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useResponsive } from "@/hooks/useResponsive";
import { useTranslation } from "@/i18n";
import { StatusBar } from "expo-status-bar";
import {
  Eye,
  EyeOff,
  Mail,
  Lock as LockIcon,
  Fingerprint,
} from "lucide-react-native";
import { signInWithGoogle, isAppleAuthAvailable } from "@/services/socialAuth";
import * as AppleAuthentication from "expo-apple-authentication";
import { authApi } from "@/services/api";
import { GoogleIcon, AppleIcon } from "@/components/SocialIcons";
import {
  checkBiometricSupport,
  getSavedCredentials,
  enableBiometricLogin,
  isBiometricLoginEnabled,
  getBiometricTypeName,
  BiometricType,
} from "@/services/biometricAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login, socialLogin } = useStore();
  const { wp, hp, isSmallDevice, isLargeDevice } = useResponsive();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState<BiometricType>({
    available: false,
    type: "none",
    enrolled: false,
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check Apple availability and biometric support
  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable);
    checkBiometricSupport().then(setBiometricSupport);
    isBiometricLoginEnabled().then(setBiometricEnabled);
  }, []);

  // Try biometric login on mount if enabled
  useEffect(() => {
    if (biometricEnabled && biometricSupport.available) {
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricSupport.available]);

  // Google Sign-In using native SDK (no browser redirect)
  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);

      // Native Google Sign-In — always shows account picker, returns id_token
      const idToken = await signInWithGoogle();

      if (!idToken) {
        Alert.alert(t.common.error, t.ui.failedGoogleCredentials);
        return;
      }

      // Use store's socialLogin to properly set auth state
      // socialLogin calls the backend, saves Sanctum tokens to AsyncStorage,
      // and sets isAuthenticated + user in Zustand state.
      await socialLogin("google", idToken);

      // Login successful — go straight to home
      router.replace("/(tabs)");
    } catch (error: any) {
      // User cancelled — don't show error
      if (error?.message === "CANCELLED") return;

      const message = error?.message || t.login.googleSignInFailed;
      // Handle specific backend error codes
      if (error?.error_code === "ACCOUNT_DEACTIVATED") {
        Alert.alert(t.common.error, t.ui.accountDeactivated);
      } else if (error?.error_code === "SOCIAL_CONFLICT") {
        Alert.alert(t.common.error, message);
      } else if (error?.error_code === "TOKEN_EXPIRED") {
        // Token was cleared by a concurrent refresh — user needs to retry
        Alert.alert(t.common.error, t.ui.trySignInAgain);
      } else {
        Alert.alert(t.common.error, message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setAppleLoading(true);

      // Get Apple credential (identity token JWT + user info)
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert(t.common.error, t.ui.noAppleIdentityToken);
        return;
      }

      // Use store's socialLogin — the authApi.socialApple will be called
      // which sends the token + user data to backend
      const result = await authApi.socialApple({
        token: credential.identityToken,
        user: {
          name: {
            firstName: credential.fullName?.givenName || "User",
            lastName: credential.fullName?.familyName || "",
          },
        },
      });

      if (result.data?.access_token && result.data?.refresh_token) {
        // Tokens are already saved by authApi.socialApple
        // Update store state
        useStore.setState({
          isAuthenticated: true,
          user: result.data.user,
          pendingUser: null,
        });
      }

      // Login successful — go straight to home
      router.replace("/(tabs)");
    } catch (error: any) {
      if (error.message !== "Apple Sign-In was canceled") {
        Alert.alert(t.common.error, error.message || t.login.appleSignInFailed);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t.common.error, t.auth.enterEmailPassword);
      return;
    }

    try {
      setLoading(true);
      await login(email, password);

      // Offer to enable biometric login after successful login
      if (rememberMe && biometricSupport.available && !biometricEnabled) {
        Alert.alert(
          t.login.enableBiometric.replace(
            "{type}",
            getBiometricTypeName(biometricSupport.type),
          ),
          t.login.wouldYouLikeBiometric.replace(
            "{type}",
            getBiometricTypeName(biometricSupport.type),
          ),
          [
            {
              text: t.login.enable,
              onPress: async () => {
                try {
                  await enableBiometricLogin(email, password);
                  setBiometricEnabled(true);
                  Alert.alert(
                    t.common.success,
                    t.login.biometricEnabled.replace(
                      "{type}",
                      getBiometricTypeName(biometricSupport.type),
                    ),
                  );
                } catch (error: any) {
                  console.log("Failed to enable biometric:", error);
                }
              },
            },
            { text: t.login.notNow, style: "cancel" },
          ],
        );
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      // Check if user needs email verification
      if (error.requires_verification) {
        Alert.alert(
          t.login.emailVerificationRequired,
          error.message || t.login.pleaseVerifyEmail,
          [
            {
              text: t.login.verifyNow,
              onPress: () => {
                // Navigate to signup with email pre-filled and go directly to OTP step
                router.push({
                  pathname: "/(auth)/signup",
                  params: { email: email, step: "3" },
                });
              },
            },
            { text: t.common.cancel, style: "cancel" },
          ],
        );
      } else {
        Alert.alert(
          t.common.error,
          error.message || t.login.invalidCredentials,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      const credentials = await getSavedCredentials();

      if (credentials) {
        await login(credentials.email, credentials.password);
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert(
        t.login.loginFailed,
        error.message || t.login.biometricFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralWhite,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      paddingTop: isSmallDevice ? Spacing.xxl : Spacing.xxxl,
      paddingBottom: Spacing.xl,
    },
    header: {
      marginBottom: isSmallDevice ? Spacing.lg : Spacing.xxl,
    },
    title: {
      fontSize: isSmallDevice ? Typography.h2 : Typography.h1,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: isSmallDevice ? Typography.bodyBase : Typography.bodyLarge,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
    },
    form: {
      gap: isSmallDevice ? Spacing.md : Spacing.lg,
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
      minHeight: isSmallDevice ? 50 : 56,
      paddingHorizontal: Spacing.md,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyBase,
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
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rememberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: Colors.neutralGray,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxChecked: {
      backgroundColor: Colors.primary900,
      borderColor: Colors.primary900,
    },
    checkmark: {
      color: Colors.neutralWhite,
      fontSize: 16,
      fontFamily: "Poppins_700Bold",
    },
    rememberText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralCharcoal,
    },
    forgotText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.primary900,
    },
    loginButton: {
      backgroundColor: Colors.primary900,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: 16,
      alignItems: "center",
      minHeight: isSmallDevice ? 50 : 56,
      justifyContent: "center",
      shadowColor: Colors.primary900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      marginTop: Spacing.md,
    },
    loginButtonText: {
      color: Colors.neutralWhite,
      fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyBase,
      fontFamily: "Poppins_700Bold",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    biometricButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: Colors.primary900,
      backgroundColor: Colors.neutralWhite,
      marginTop: Spacing.md,
      minHeight: isSmallDevice ? 50 : 56,
    },
    biometricButtonText: {
      color: Colors.primary900,
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Colors.neutralGray,
    },
    dividerText: {
      marginHorizontal: Spacing.md,
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
    },
    socialButtons: {
      gap: Spacing.md,
    },
    socialButton: {
      flexDirection: "row",
      backgroundColor: Colors.neutralWhite,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: Colors.neutralGray,
      minHeight: isSmallDevice ? 50 : 56,
      gap: Spacing.sm,
    },
    googleButton: {
      borderColor: "#E8E8E8",
      backgroundColor: Colors.neutralWhite,
    },
    googleIconContainer: {
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    googleButtonText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralCharcoal,
    },
    appleButton: {
      backgroundColor: "#000000",
      borderColor: "#000000",
    },
    appleIcon: {
      fontSize: 20,
      color: Colors.neutralWhite,
    },
    appleButtonText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralWhite,
    },
    signupRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: Spacing.md,
    },
    signupText: {
      fontSize: Typography.bodyBase,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
    },
    signupLink: {
      fontSize: Typography.bodyBase,
      fontFamily: "Poppins_700Bold",
      color: Colors.primary900,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t.login.welcomeBack}</Text>
            <Text style={styles.subtitle}>{t.login.signInToAccount}</Text>
          </View>

          <View style={styles.form}>
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
                  autoComplete="email"
                />
              </View>
            </View>

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

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>{t.auth.rememberMe}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text style={styles.forgotText}>{t.auth.forgotPassword}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.neutralWhite} />
              ) : (
                <Text style={styles.loginButtonText}>{t.auth.login}</Text>
              )}
            </TouchableOpacity>

            {biometricSupport.available && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Fingerprint size={24} color={Colors.primary} />
                <Text style={styles.biometricButtonText}>
                  {t.login.loginWithBiometric.replace(
                    "{type}",
                    getBiometricTypeName(biometricSupport.type),
                  )}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.login.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  styles.googleButton,
                  (googleLoading || loading) && styles.buttonDisabled,
                ]}
                activeOpacity={0.8}
                onPress={() => handleGoogleAuth()}
                disabled={googleLoading || loading || appleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.neutralCharcoal}
                  />
                ) : (
                  <>
                    <GoogleIcon size={20} />
                    <Text style={styles.googleButtonText}>
                      {t.auth.continueWithGoogle}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {appleAvailable && (
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    styles.appleButton,
                    (appleLoading || loading) && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleAppleLogin}
                  disabled={appleLoading || loading || googleLoading}
                >
                  {appleLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <AppleIcon size={20} color="#FFFFFF" />
                      <Text style={styles.appleButtonText}>
                        {t.auth.continueWithApple}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>{t.auth.dontHaveAccount} </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                <Text style={styles.signupLink}>{t.auth.signUp}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
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
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  checkmark: {
    color: Colors.neutralWhite,
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  rememberText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
  },
  forgotText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },
  loginButton: {
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
  loginButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary900,
    backgroundColor: Colors.neutralWhite,
    marginTop: Spacing.md,
    minHeight: 56,
  },
  biometricButtonText: {
    color: Colors.primary900,
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutralGray,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  socialButtons: {
    gap: Spacing.md,
  },
  socialButton: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.neutralGray,
    minHeight: 56,
    gap: Spacing.sm,
  },
  googleButton: {
    borderColor: "#E8E8E8",
    backgroundColor: Colors.neutralWhite,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  appleButton: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  appleIcon: {
    fontSize: 20,
    color: Colors.neutralWhite,
  },
  appleButtonText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralWhite,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  signupText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  signupLink: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
    color: Colors.primary900,
  },
});
