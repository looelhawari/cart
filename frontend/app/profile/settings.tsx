import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Globe, Moon, Info, Fingerprint, ShieldCheck, Eye, EyeOff, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { useStore } from '@/store';
import {
  checkBiometricSupport,
  isBiometricLoginEnabled,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricTypeName,
  BiometricType,
} from '@/services/biometricAuth';

export default function SettingsScreen() {
  const user = useStore((state) => state.user);
  const login = useStore((state) => state.login);

  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);
  const [biometricSupport, setBiometricSupport] = React.useState<BiometricType>({
    available: false,
    type: 'none',
    enrolled: false,
  });
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const checkSupport = async () => {
      const support = await checkBiometricSupport();
      console.log('Biometric support:', support);
      setBiometricSupport(support);
    };

    const checkEnabled = async () => {
      const enabled = await isBiometricLoginEnabled();
      console.log('Biometric enabled:', enabled);
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
        'Disable Biometric Login',
        `Are you sure you want to disable ${getBiometricTypeName(biometricSupport.type)} login?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await disableBiometricLogin();
                setBiometricEnabled(false);
                Alert.alert('Success', 'Biometric login disabled');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to disable biometric login');
              }
            },
          },
        ]
      );
    }
  };

  const handleEnableBiometric = async () => {
    if (!password || !user?.email) {
      Alert.alert('Error', 'Please enter your password');
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
      setPassword('');

      Alert.alert('Success', `${getBiometricTypeName(biometricSupport.type)} login enabled`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enable biometric login. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Bell size={20} color={Colors.primary900} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>
                    Receive order updates and offers
                  </Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{
                  false: Colors.neutralGray,
                  true: Colors.primary700,
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Bell size={20} color={Colors.primary900} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Email Notifications</Text>
                  <Text style={styles.settingSubtitle}>
                    Get updates via email
                  </Text>
                </View>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{
                  false: Colors.neutralGray,
                  true: Colors.primary700,
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>

            {biometricSupport.available && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Fingerprint size={20} color={Colors.primary900} />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>
                      {getBiometricTypeName(biometricSupport.type)} Login
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Use {getBiometricTypeName(biometricSupport.type)} to login
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
                      ? 'Please set up biometric authentication in your device settings'
                      : 'Biometric authentication not available on this device'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.9}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Globe size={20} color={Colors.primary700} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Language</Text>
                  <Text style={styles.settingSubtitle}>English</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Moon size={20} color={Colors.neutralMedium} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingSubtitle}>
                    Use dark theme
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: Colors.neutralGray,
                  true: Colors.primary700,
                }}
                thumbColor={Colors.neutralWhite}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>

            <View style={styles.infoCard}>
              <Info size={20} color={Colors.primary900} />
              <View style={styles.infoText}>
                <Text style={styles.appName}>ElBaraka Hypermarket</Text>
                <Text style={styles.version}>Version 1.0.0</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.linkItem} activeOpacity={0.8}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkItem} activeOpacity={0.8}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkItem} activeOpacity={0.8}>
              <Text style={styles.linkText}>About Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Password Modal for Enabling Biometric */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enable {getBiometricTypeName(biometricSupport.type)}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.neutralCharcoal} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please enter your password to enable biometric login
            </Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
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
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.buttonDisabled]}
                onPress={handleEnableBiometric}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.confirmButtonText}>Enable</Text>
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
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
  appName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  version: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  linkItem: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.xs,
  },
  linkText: {
    fontSize: Typography.bodyBase,
    color: Colors.primary900,
    fontWeight: Typography.medium,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralCharcoal,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralMedium,
    marginBottom: Spacing.lg,
  },
  passwordInputContainer: {
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  passwordInput: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.md,
    paddingRight: 50,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralCharcoal,
  },
  eyeIconModal: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: Colors.neutralLight,
  },
  cancelButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutralCharcoal,
  },
  confirmButton: {
    backgroundColor: Colors.primary900,
  },
  confirmButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutralWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
