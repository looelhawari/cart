import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Globe,
  Moon,
  Info,
  Fingerprint,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import {
  checkBiometricSupport,
  isBiometricLoginEnabled,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricTypeName,
  BiometricType,
} from "@/services/biometricAuth";

// Language options
const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇪🇬" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useStore((state) => state.user);
  const login = useStore((state) => state.login);

  // Notification settings (from user_settings table)
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [smsNotifications, setSmsNotifications] = React.useState(false);
  const [orderUpdates, setOrderUpdates] = React.useState(true);
  const [promotionalEmails, setPromotionalEmails] = React.useState(false);

  // Preferences
  const [darkMode, setDarkMode] = React.useState(false);
  const [language, setLanguage] = React.useState("en");
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const [biometricSupport, setBiometricSupport] = React.useState<BiometricType>(
    {
      available: false,
      type: "none",
      enrolled: false,
    },
  );
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const checkSupport = async () => {
      const support = await checkBiometricSupport();
      console.log("Biometric support:", support);
      setBiometricSupport(support);
    };

    const checkEnabled = async () => {
      const enabled = await isBiometricLoginEnabled();
      console.log("Biometric enabled:", enabled);
      setBiometricEnabled(enabled);
    };

    checkSupport();
    checkEnabled();
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Enable biometric - show password modal
      setShowPasswordModal(true);
    } else {
      // Disable biometric
      Alert.alert(
        t.settings.disableBiometricLogin,
        t.settings.disableBiometricConfirm.replace(
          "{type}",
          getBiometricTypeName(biometricSupport.type),
        ),
        [
          { text: t.common.cancel, style: "cancel" },
          {
            text: t.settings.disable,
            style: "destructive",
            onPress: async () => {
              try {
                await disableBiometricLogin();
                setBiometricEnabled(false);
                Alert.alert(t.common.success, t.settings.biometricDisabled);
              } catch (error: any) {
                Alert.alert(
                  t.common.error,
                  error.message || t.settings.failedToDisableBiometric,
                );
              }
            },
          },
        ],
      );
    }
  };

  const handleEnableBiometric = async () => {
    if (!password || !user?.email) {
      Alert.alert(t.common.error, t.settings.enterPassword);
      return;
    }

    try {
      setLoading(true);

      // Verify password first by attempting login
      await login(user.email, password);

      // Now enable biometric
      await enableBiometricLogin(user.email, password);
      setBiometricEnabled(true);
      setShowPasswordModal(false);
      setPassword("");

      Alert.alert(
        t.common.success,
        t.login.biometricEnabled.replace(
          "{type}",
          getBiometricTypeName(biometricSupport.type),
        ),
      );
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error.message || t.settings.failedToEnableBiometric,
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedLanguage =
    LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
    // TODO: Integrate with i18n context to change app language
    Alert.alert(
      t.settings.languageChanged,
      t.settings.languageChangedMessage.replace(
        "{lang}",
        LANGUAGES.find((l) => l.code === langCode)?.name || "",
      ),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#4CAF50", "#45a049", "#388E3C"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{t.settings.title}</Text>
            <Text style={styles.headerSubtitle}>
              {t.settings.customizeExperience}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons
              name="settings-outline"
              size={36}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.settings.notifications}</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#E8F5E9" }]}
                >
                  <Ionicons name="notifications" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {t.settings.pushNotifications}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t.settings.pushNotificationsDesc}
                  </Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{
                  false: Colors.neutralGray,
                  true: "#4CAF50",
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#E3F2FD" }]}
                >
                  <Ionicons name="mail" size={20} color="#2196F3" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {t.settings.emailNotifications}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t.settings.emailNotificationsDesc}
                  </Text>
                </View>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{
                  false: Colors.neutralGray,
                  true: "#4CAF50",
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#FFF3E0" }]}
                >
                  <Ionicons name="chatbubble" size={20} color="#FF9800" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {t.settings.smsNotifications}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t.settings.smsNotificationsDesc}
                  </Text>
                </View>
              </View>
              <Switch
                value={smsNotifications}
                onValueChange={setSmsNotifications}
                trackColor={{
                  false: Colors.neutralGray,
                  true: "#4CAF50",
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#E8F5E9" }]}
                >
                  <Ionicons name="cube" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {t.settings.orderUpdates}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t.settings.orderUpdatesDesc}
                  </Text>
                </View>
              </View>
              <Switch
                value={orderUpdates}
                onValueChange={setOrderUpdates}
                trackColor={{
                  false: Colors.neutralGray,
                  true: "#4CAF50",
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#FCE4EC" }]}
                >
                  <Ionicons name="pricetag" size={20} color="#E91E63" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {t.settings.promotionalEmails}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t.settings.promotionalEmailsDesc}
                  </Text>
                </View>
              </View>
              <Switch
                value={promotionalEmails}
                onValueChange={setPromotionalEmails}
                trackColor={{
                  false: Colors.neutralGray,
                  true: "#4CAF50",
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.settings.security}</Text>

            {biometricSupport.available && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Fingerprint size={20} color={Colors.primary900} />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>
                      {getBiometricTypeName(biometricSupport.type)}{" "}
                      {t.auth.login}
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      {t.settings.useBiometricToLogin.replace(
                        "{type}",
                        getBiometricTypeName(biometricSupport.type),
                      )}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{
                    false: Colors.neutralGray,
                    true: Colors.primary700,
                  }}
                  thumbColor={Colors.neutralWhite}
                />
              </View>
            )}

            {!biometricSupport.available && (
              <View style={styles.infoCard}>
                <ShieldCheck size={20} color={Colors.neutralMedium} />
                <View style={styles.infoText}>
                  <Text style={styles.settingSubtitle}>
                    {!biometricSupport.enrolled
                      ? t.settings.setupBiometricInDevice
                      : t.settings.biometricNotAvailable}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.settings.preferences}</Text>

            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => setShowLanguageModal(true)}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#E3F2FD" }]}
                >
                  <Ionicons name="language" size={20} color="#2196F3" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{t.settings.language}</Text>
                  <Text style={styles.settingSubtitle}>
                    {selectedLanguage.flag} {selectedLanguage.name} (
                    {selectedLanguage.nativeName})
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: "#F3E5F5" }]}
                >
                  <Ionicons name="moon" size={20} color="#9C27B0" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{t.settings.darkMode}</Text>
                  <Text style={styles.settingSubtitle}>
                    {t.settings.darkModeDesc}
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: Colors.neutralGray,
                  true: "#4CAF50",
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.settings.about}</Text>

            <View style={styles.aboutCard}>
              <View style={styles.aboutHeader}>
                <View style={styles.appIconContainer}>
                  <Ionicons name="storefront" size={32} color="#4CAF50" />
                </View>
                <View style={styles.aboutInfo}>
                  <Text style={styles.appName}>{t.settings.appName}</Text>
                  <Text style={styles.version}>{t.settings.version} 1.0.0</Text>
                </View>
              </View>
            </View>

            <View style={styles.linksCard}>
              <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
                <Text style={styles.linkText}>{t.settings.termsOfService}</Text>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#666"
                />
                <Text style={styles.linkText}>{t.settings.privacyPolicy}</Text>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#666"
                />
                <Text style={styles.linkText}>{t.settings.aboutUs}</Text>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
                <Ionicons name="star-outline" size={20} color="#666" />
                <Text style={styles.linkText}>{t.settings.rateApp}</Text>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 {t.settings.appName}</Text>
            <Text style={styles.footerSubtext}>
              {t.settings.allRightsReserved}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.languageModalOverlay}>
          <View style={styles.languageModalContent}>
            <View style={styles.languageModalHeader}>
              <Text style={styles.languageModalTitle}>
                {t.settings.selectLanguage}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.languageCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.languageOptions}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text
                      style={[
                        styles.languageName,
                        language === lang.code && styles.languageNameActive,
                      ]}
                    >
                      {lang.name}
                    </Text>
                    <Text style={styles.languageNative}>{lang.nativeName}</Text>
                  </View>
                  {language === lang.code && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#4CAF50"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal for Enabling Biometric */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.login.enable} {getBiometricTypeName(biometricSupport.type)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.neutralCharcoal} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {t.settings.enterPasswordToEnableBiometric}
            </Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t.signup.enterPasswordPlaceholder}
                placeholderTextColor={Colors.neutralMedium}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoFocus
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconModal}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.neutralMedium} />
                ) : (
                  <Eye size={20} color={Colors.neutralMedium} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
              >
                <Text style={styles.cancelButtonText}>{t.common.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleEnableBiometric}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.confirmButtonText}>{t.login.enable}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 32,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#888",
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  appIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  aboutInfo: {
    marginLeft: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  version: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  linksCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
  linkDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 48,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#999",
  },
  footerSubtext: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 2,
  },
  // Language Modal Styles
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  languageModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  languageModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  languageCloseButton: {
    padding: 4,
  },
  languageOptions: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  languageOptionActive: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  languageNameActive: {
    color: "#4CAF50",
  },
  languageNative: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.xl,
    width: "85%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginBottom: Spacing.lg,
  },
  passwordInputContainer: {
    position: "relative",
    marginBottom: Spacing.xl,
  },
  passwordInput: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.md,
    paddingRight: 50,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
  },
  eyeIconModal: {
    position: "absolute",
    right: Spacing.md,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: Colors.neutralLight,
  },
  cancelButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  confirmButton: {
    backgroundColor: Colors.primary900,
  },
  confirmButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
