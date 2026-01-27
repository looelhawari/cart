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
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff, Mail, Lock as LockIcon, Fingerprint } from "lucide-react-native";
import {
  useGoogleAuth,
  handleGoogleResponse,
  signInWithApple,
  isAppleAuthAvailable,
} from "@/services/socialAuth";
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
  const { login, socialLogin } = useStore();
  const { wp, hp, isSmallDevice, isLargeDevice } = useResponsive();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState<BiometricType>({
    available: false,
    type: 'none',
    enrolled: false,
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Google Auth
  const { promptAsync: promptGoogleAsync, response: googleResponse } =
    useGoogleAuth();

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

  // Handle Google response
  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleGoogleAuth();
    }
  }, [googleResponse]);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const result = await handleGoogleResponse(googleResponse);
      if (result) {
        if (result.data.requires_phone_verification) {
          router.push("/phone-verification");
        } else {
          router.replace("/(tabs)");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithApple();
      if (result.data.requires_phone_verification) {
        router.push("/phone-verification");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      if (error.message !== "Apple Sign-In was canceled") {
        Alert.alert("Error", error.message || "Apple sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);

      // Offer to enable biometric login after successful login
      if (rememberMe && biometricSupport.available && !biometricEnabled) {
        Alert.alert(
          `Enable ${getBiometricTypeName(biometricSupport.type)}?`,
          `Would you like to use ${getBiometricTypeName(biometricSupport.type)} to login next time?`,
          [
            {
              text: "Enable",
              onPress: async () => {
                try {
                  await enableBiometricLogin(email, password);
                  setBiometricEnabled(true);
                  Alert.alert("Success", `${getBiometricTypeName(biometricSupport.type)} login enabled`);
                } catch (error: any) {
                  console.log("Failed to enable biometric:", error);
                }
              },
            },
            { text: "Not Now", style: "cancel" },
          ]
        );
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      // Check if user needs email verification
      if (error.requires_verification) {
        Alert.alert(
          "Email Verification Required",
          error.message || "Please verify your email address to continue",
          [
            {
              text: "Verify Now",
              onPress: () => {
                // Navigate to signup with email pre-filled and go directly to OTP step
                router.push({
                  pathname: "/(auth)/signup",
                  params: { email: email, step: "3" },
                });
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        Alert.alert("Error", error.message || "Invalid credentials");
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
      Alert.alert("Login Failed", error.message || "Biometric authentication failed");
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
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
                  autoComplete="email"
                />
              </View>
            </View>

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
                  placeholder="Enter your password"
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
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
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
                <Text style={styles.loginButtonText}>Login</Text>
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
                  Login with {getBiometricTypeName(biometricSupport.type)}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                activeOpacity={0.8}
                onPress={() => promptGoogleAsync()}
                disabled={loading}
              >
                <GoogleIcon size={20} />
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              {appleAvailable && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  activeOpacity={0.8}
                  onPress={handleAppleLogin}
                  disabled={loading}
                >
                  <AppleIcon size={20} color="#FFFFFF" />
                  <Text style={styles.appleButtonText}>
                    Continue with Apple
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
