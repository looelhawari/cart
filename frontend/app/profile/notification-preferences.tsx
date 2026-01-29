import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  ShoppingBag,
  Tag,
  Wallet,
  MessageSquare,
  Moon,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import {
  NotificationPreferences,
  getPreferences,
  updatePreferences,
} from "@/services/notificationService";

// Styles defined at module level
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.lg,
  },
  loginButtonText: {
    color: Colors.neutralWhite,
    fontFamily: "Poppins_600SemiBold",
    fontSize: Typography.bodyBase,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_500Medium",
    color: Colors.neutralCharcoal,
  },
  settingSubtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  timeButton: {
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_500Medium",
    color: Colors.primary900,
  },
});

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    order_updates: true,
    promotions: true,
    wallet_updates: true,
    complaint_updates: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      setSaving(true);
      await updatePreferences({ [key]: value });
    } catch {
      // Revert on error
      setPreferences(preferences);
      Alert.alert("Error", "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = async (type: "start" | "end", date: Date) => {
    const timeString = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    const key = type === "start" ? "quiet_hours_start" : "quiet_hours_end";
    const newPreferences = { ...preferences, [key]: timeString };
    setPreferences(newPreferences);

    try {
      setSaving(true);
      await updatePreferences({ [key]: timeString });
    } catch {
      setPreferences(preferences);
      Alert.alert("Error", "Failed to update preferences");
    } finally {
      setSaving(false);
      if (type === "start") setShowStartPicker(false);
      else setShowEndPicker(false);
    }
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const pageTitle = "Notification Preferences";

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Bell size={64} color={Colors.neutralMedium} />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyText}>
            Please login to manage your notification preferences
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.placeholder}>
          {saving && (
            <ActivityIndicator size="small" color={Colors.primary900} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionDescription}>
            Enable or disable all push notifications
          </Text>
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Bell size={20} color={Colors.primary900} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>
                  Enable Push Notifications
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.push_enabled}
              onValueChange={(value) => handleToggle("push_enabled", value)}
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <Text style={styles.sectionDescription}>
            Choose which notifications you want to receive
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <ShoppingBag size={20} color={Colors.primary900} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Order Updates</Text>
                <Text style={styles.settingSubtitle}>
                  Order status, delivery updates
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.order_updates}
              onValueChange={(value) => handleToggle("order_updates", value)}
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
              disabled={!preferences.push_enabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Tag size={20} color={Colors.accentOrange} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Promotions & Offers</Text>
                <Text style={styles.settingSubtitle}>
                  Deals, discounts, new arrivals
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.promotions}
              onValueChange={(value) => handleToggle("promotions", value)}
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
              disabled={!preferences.push_enabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Wallet size={20} color={Colors.success700} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Wallet Updates</Text>
                <Text style={styles.settingSubtitle}>
                  Credits, refunds, balance changes
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.wallet_updates}
              onValueChange={(value) => handleToggle("wallet_updates", value)}
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
              disabled={!preferences.push_enabled}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <MessageSquare size={20} color={Colors.primary700} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Complaint Updates</Text>
                <Text style={styles.settingSubtitle}>
                  Responses to your complaints
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.complaint_updates}
              onValueChange={(value) =>
                handleToggle("complaint_updates", value)
              }
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
              disabled={!preferences.push_enabled}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionDescription}>
            Set a time period when you do not want to receive notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Moon size={20} color={Colors.primary900} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
              </View>
            </View>
            <Switch
              value={preferences.quiet_hours_enabled}
              onValueChange={(value) =>
                handleToggle("quiet_hours_enabled", value)
              }
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
              disabled={!preferences.push_enabled}
            />
          </View>

          {preferences.quiet_hours_enabled && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Start Time</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {preferences.quiet_hours_start}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.settingRow, styles.settingRowLast]}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>End Time</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {preferences.quiet_hours_end}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={parseTime(preferences.quiet_hours_start)}
          mode="time"
          is24Hour={true}
          onChange={(event, date) => {
            if (event.type === "dismissed") {
              setShowStartPicker(false);
            } else if (date) {
              handleTimeChange("start", date);
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={parseTime(preferences.quiet_hours_end)}
          mode="time"
          is24Hour={true}
          onChange={(event, date) => {
            if (event.type === "dismissed") {
              setShowEndPicker(false);
            } else if (date) {
              handleTimeChange("end", date);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
