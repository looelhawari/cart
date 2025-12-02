import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Globe, Moon, Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);

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
});
