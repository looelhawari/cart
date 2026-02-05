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
import { ArrowLeft, AlertCircle } from "lucide-react-native";
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

// Category section component
interface CategorySectionProps {
  title: string;
  description: string;
  iconColor: string;
  children: React.ReactNode;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  description,
  iconColor,
  children,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: iconColor + "20" }]}>
        <AlertCircle size={20} color={iconColor} />
      </View>
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
    {children}
  </View>
);

// Preference toggle component
interface PreferenceToggleProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  isLast = false,
}) => (
  <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
    <View style={styles.settingLeft}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
          {subtitle}
        </Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: Colors.neutralGray,
        true: Colors.primary900,
      }}
      thumbColor={Colors.neutralWhite}
      disabled={disabled}
    />
  </View>
);

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useStore();

  const language = user?.language ?? "en";
  const pageTitle = language === "ar" ? "إعدادات الإشعارات" : "Notification Settings";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    // Global
    push_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",

    // Order & Delivery
    order_updates: true,
    delivery_updates: true,
    payment_alerts: true,

    // Marketing
    promotions: true,
    flash_sales: true,
    price_drops: true,

    // Product
    back_in_stock: true,
    price_alerts: true,

    // Cart
    cart_reminders: true,

    // Support
    complaint_updates: true,
    chat_messages: true,

    // Account & Security
    security_alerts: true,

    // Wallet
    wallet_updates: true,

    // Smart/AI
    reorder_reminders: true,

    // System
    system_updates: true,
    marketing: true,
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
      const data = await getPreferences();
      if (data) {
        setPreferences((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const previousValue = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }));

    try {
      setSaving(true);
      await updatePreferences({ [key]: value });
    } catch (error) {
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      Alert.alert("Error", "Failed to update preference. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = async (
    type: "start" | "end",
    event: any,
    selectedDate?: Date
  ) => {
    if (type === "start") {
      setShowStartPicker(false);
    } else {
      setShowEndPicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) return;

    const timeString = `${String(selectedDate.getHours()).padStart(2, "0")}:${String(
      selectedDate.getMinutes()
    ).padStart(2, "0")}`;

    const key = type === "start" ? "quiet_hours_start" : "quiet_hours_end";
    const previousValue = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: timeString }));

    try {
      setSaving(true);
      await updatePreferences({ [key]: timeString });
    } catch (error) {
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      Alert.alert("Error", "Failed to update time. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const parseTimeString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const isPushDisabled = !preferences.push_enabled;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <AlertCircle size={64} color={Colors.neutralMedium} />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.placeholder}>
          {saving && <ActivityIndicator size="small" color={Colors.primary900} />}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.masterSection}>
          <View style={styles.masterToggleRow}>
            <View style={styles.masterLeft}>
              <View style={[styles.masterIcon, { backgroundColor: Colors.primary100 }]}>
                <AlertCircle size={28} color={Colors.primary900} />
              </View>
              <View style={styles.masterInfo}>
                <Text style={styles.masterTitle}>Push Notifications</Text>
                <Text style={styles.masterSubtitle}>
                  {preferences.push_enabled
                    ? "Receiving all enabled notifications"
                    : "All notifications are paused"}
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
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            />
          </View>
        </View>

        {isPushDisabled && (
          <View style={styles.disabledBanner}>
            <AlertCircle size={16} color={Colors.accentOrange} />
            <Text style={styles.disabledBannerText}>
              Turn on push notifications to customize your preferences
            </Text>
          </View>
        )}

        {/* Order & Delivery */}
        <CategorySection
          title="Orders & Delivery"
          description="Order confirmations, status updates, delivery tracking"
          iconColor={Colors.primary900}
        >
          <PreferenceToggle
            title="Order Updates"
            subtitle="Order placed, confirmed, preparing, delivered"
            value={preferences.order_updates}
            onValueChange={(v) => handleToggle("order_updates", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Delivery Updates"
            subtitle="Out for delivery, courier nearby, delays"
            value={preferences.delivery_updates}
            onValueChange={(v) => handleToggle("delivery_updates", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Payment Alerts"
            subtitle="Payment confirmations and failures"
            value={preferences.payment_alerts}
            onValueChange={(v) => handleToggle("payment_alerts", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Product & Inventory */}
        <CategorySection
          title="Product Alerts"
          description="Price changes and stock notifications"
          iconColor={Colors.accentOrange}
        >
          <PreferenceToggle
            title="Back in Stock"
            subtitle="Get notified when wishlist items are available"
            value={preferences.back_in_stock}
            onValueChange={(v) => handleToggle("back_in_stock", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Price Drops"
            subtitle="Alert when prices drop on watched items"
            value={preferences.price_drops}
            onValueChange={(v) => handleToggle("price_drops", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Price Alerts"
            subtitle="Custom price threshold notifications"
            value={preferences.price_alerts}
            onValueChange={(v) => handleToggle("price_alerts", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Offers & Marketing */}
        <CategorySection
          title="Offers & Promotions"
          description="Deals, flash sales, and special offers"
          iconColor={Colors.success700}
        >
          <PreferenceToggle
            title="Promotions"
            subtitle="New deals, discounts, and special offers"
            value={preferences.promotions}
            onValueChange={(v) => handleToggle("promotions", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Flash Sales"
            subtitle="Time-limited sales and exclusive offers"
            value={preferences.flash_sales}
            onValueChange={(v) => handleToggle("flash_sales", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Marketing"
            subtitle="General marketing messages and newsletters"
            value={preferences.marketing}
            onValueChange={(v) => handleToggle("marketing", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Cart & Checkout */}
        <CategorySection
          title="Cart & Checkout"
          description="Reminders about items in your cart"
          iconColor={Colors.primary700}
        >
          <PreferenceToggle
            title="Cart Reminders"
            subtitle="Gentle reminders about abandoned carts"
            value={preferences.cart_reminders}
            onValueChange={(v) => handleToggle("cart_reminders", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Chat & Support */}
        <CategorySection
          title="Chat & Support"
          description="Updates on your support requests"
          iconColor={Colors.neutralCharcoal}
        >
          <PreferenceToggle
            title="Support Updates"
            subtitle="Responses to your complaints and tickets"
            value={preferences.complaint_updates}
            onValueChange={(v) => handleToggle("complaint_updates", v)}
            disabled={isPushDisabled}
          />
          <PreferenceToggle
            title="Chat Messages"
            subtitle="New messages from support agents"
            value={preferences.chat_messages}
            onValueChange={(v) => handleToggle("chat_messages", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Account & Security */}
        <CategorySection
          title="Account & Security"
          description="Login alerts and security notifications"
          iconColor={Colors.accentRed}
        >
          <PreferenceToggle
            title="Security Alerts"
            subtitle="New logins, password changes, suspicious activity"
            value={preferences.security_alerts}
            onValueChange={(v) => handleToggle("security_alerts", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Wallet & Payments */}
        <CategorySection
          title="Wallet & Payments"
          description="Balance updates and payment notifications"
          iconColor={Colors.success900}
        >
          <PreferenceToggle
            title="Wallet Updates"
            subtitle="Credits, refunds, and balance changes"
            value={preferences.wallet_updates}
            onValueChange={(v) => handleToggle("wallet_updates", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Smart Notifications */}
        <CategorySection
          title="Smart Recommendations"
          description="AI-powered personalized suggestions"
          iconColor={Colors.accentYellow}
        >
          <PreferenceToggle
            title="Reorder Reminders"
            subtitle="Smart reminders for products you regularly buy"
            value={preferences.reorder_reminders}
            onValueChange={(v) => handleToggle("reorder_reminders", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* System */}
        <CategorySection
          title="System"
          description="App updates and maintenance notifications"
          iconColor={Colors.neutralMedium}
        >
          <PreferenceToggle
            title="System Updates"
            subtitle="App updates, maintenance, and new features"
            value={preferences.system_updates}
            onValueChange={(v) => handleToggle("system_updates", v)}
            disabled={isPushDisabled}
            isLast
          />
        </CategorySection>

        {/* Quiet Hours */}
        <View style={styles.quietHoursSection}>
          <View style={styles.quietHoursHeader}>
            <View style={styles.quietHoursLeft}>
              <Text style={styles.quietHoursTitle}>Quiet Hours</Text>
              <Text style={styles.quietHoursSubtitle}>
                Pause notifications during specific hours
              </Text>
            </View>
            <Switch
              value={preferences.quiet_hours_enabled}
              onValueChange={(value) => handleToggle("quiet_hours_enabled", value)}
              trackColor={{
                false: Colors.neutralGray,
                true: Colors.primary900,
              }}
              thumbColor={Colors.neutralWhite}
            />
          </View>

          {preferences.quiet_hours_enabled && (
            <View style={styles.timePickerContainer}>
              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timePickerLabel}>From</Text>
                <Text style={styles.timePickerValue}>{preferences.quiet_hours_start}</Text>
              </TouchableOpacity>

              <View style={styles.timePickerDivider} />

              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.timePickerLabel}>To</Text>
                <Text style={styles.timePickerValue}>{preferences.quiet_hours_end}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>

      {showStartPicker && (
        <DateTimePicker
          value={parseTimeString(preferences.quiet_hours_start)}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event, date) => handleTimeChange("start", event, date)}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={parseTimeString(preferences.quiet_hours_end)}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event, date) => handleTimeChange("end", event, date)}
        />
      )}
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
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.semibold as any,
    color: Colors.neutralCharcoal,
  },
  placeholder: {
    width: 40,
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.semibold as any,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  loginButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    marginTop: Spacing.lg,
  },
  loginButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold as any,
    color: Colors.neutralWhite,
  },
  masterSection: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  masterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  masterLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  masterIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  masterInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  masterTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold as any,
    color: Colors.neutralCharcoal,
  },
  masterSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  disabledBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentYellow + "30",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Spacing.sm,
  },
  disabledBannerText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.neutralCharcoal,
    marginLeft: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.neutralWhite,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitleContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold as any,
    color: Colors.neutralCharcoal,
  },
  sectionDescription: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.medium as any,
    color: Colors.neutralCharcoal,
  },
  settingSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  disabledText: {
    color: Colors.neutralGray,
  },
  quietHoursSection: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  quietHoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quietHoursLeft: {
    flex: 1,
  },
  quietHoursTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold as any,
    color: Colors.neutralCharcoal,
  },
  quietHoursSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  timePickerContainer: {
    flexDirection: "row",
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: Spacing.sm,
    overflow: "hidden",
  },
  timePicker: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  timePickerDivider: {
    width: 1,
    backgroundColor: Colors.neutralGray,
  },
  timePickerLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  timePickerValue: {
    fontSize: Typography.h4,
    fontWeight: Typography.semibold as any,
    color: Colors.primary900,
    marginTop: 4,
  },
});
