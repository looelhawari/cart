import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  TextInput,
  InteractionManager,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChevronRight, Package, MessageSquare } from "lucide-react-native";
import { router } from "expo-router";

import Colors from "@/constants/Colors";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import { orderApi } from "@/services/api/orderApi";

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  bgColor: string;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const {
    user,
    fetchProfile,
    logout,
    deleteAccount,
    isAuthenticated,
    favorites,
    fetchFavorites,
  } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      loadProfile();
    });
    return () => task.cancel();
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      await fetchProfile();
      // Fetch orders for stats - use per_page:1 and read pagination totals
      try {
        const ordersRes = await orderApi.getOrders(undefined, 1, 1);
        // Try to read total from pagination metadata
        const meta = ordersRes?.data?.meta || ordersRes?.data;
        const totalOrders = meta?.total || meta?.pagination?.total || 0;
        setOrdersCount(totalOrders);
        // For total spent, use the total from pagination or default to 0
        // We can't calculate total spent from 1 order, so use a dedicated stat if available
        const totalSpentVal =
          meta?.total_spent || ordersRes?.data?.total_spent || 0;
        setTotalSpent(totalSpentVal);
      } catch (e) {
        console.error("Failed to fetch orders stats:", e);
      }
      // Fetch favorites count
      try {
        await fetchFavorites();
      } catch (e) {
        console.error("Failed to fetch favorites:", e);
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      if (
        error?.message === "Unauthenticated." ||
        error?.message === "TOKEN_EXPIRED"
      ) {
        Alert.alert(
          t.alerts?.sessionExpired || "Session Expired",
          t.alerts?.sessionExpiredMessage || "Please login again",
          [
            {
              text: t.auth?.login || "Login",
              onPress: () => {
                logout();
                router.replace("/login");
              },
            },
          ],
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      t.alerts?.logoutConfirmTitle || "Logout",
      t.alerts?.logoutConfirmMessage || "Are you sure you want to logout?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.auth?.logout || "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/login");
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert(
        t.alerts?.deleteAccountTitle || "Delete Account",
        t.alerts?.enterPassword || "Enter your password to confirm",
      );
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      setDeletePassword("");
      Alert.alert(
        t.alerts?.deleteAccountSuccess || "Account Deleted",
        t.alerts?.deleteAccountSuccessMessage || t.ui.accountDeletedMessage,
        [
          {
            text: t.ui.ok,
            onPress: () => router.replace("/login"),
          },
        ],
      );
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.errors?.password?.[0] ||
        t.alerts?.deleteAccountError ||
        t.ui.deleteAccountError;

      // Check for active orders error
      if (
        errorMessage.toLowerCase().includes("active order") ||
        errorMessage.toLowerCase().includes("pending order")
      ) {
        Alert.alert(
          t.alerts?.deleteAccountTitle || "Delete Account",
          t.alerts?.deleteAccountActiveOrders || t.ui.activeOrdersWarning,
        );
      } else {
        Alert.alert(
          t.alerts?.deleteAccountTitle || "Delete Account",
          errorMessage,
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "1",
      title: t.profile?.editProfile || "Edit Profile",
      icon: <Ionicons name="person" size={22} color={Colors.primary900} />,
      route: "/profile/edit",
      color: Colors.primary900,
      bgColor: Colors.primary100,
    },
    {
      id: "2",
      title: t.nav?.orders || "My Orders",
      icon: <Package size={22} color={Colors.accentOrange} />,
      route: "/(tabs)/orders",
      color: Colors.accentOrange,
      bgColor: Colors.accentOrange + "15",
    },
    {
      id: "3",
      title: t.profile?.myAddresses || "My Addresses",
      icon: <Ionicons name="location" size={22} color="#3B82F6" />,
      route: "/profile/addresses",
      color: "#3B82F6",
      bgColor: "#3B82F6" + "15",
    },
    {
      id: "4",
      title: t.profile?.paymentMethods || "Payment Methods",
      icon: <Ionicons name="card" size={22} color="#8B5CF6" />,
      route: "/profile/payment-methods",
      color: "#8B5CF6",
      bgColor: "#8B5CF6" + "15",
    },
    {
      id: "5",
      title: t.profile?.myFavorites || "My Favorites",
      icon: <Ionicons name="heart" size={22} color={Colors.accentRed} />,
      route: "/profile/favorites",
      color: Colors.accentRed,
      bgColor: Colors.accentRed + "15",
    },
    {
      id: "7",
      title: t.profile?.myComplaints || "My Complaints",
      icon: <MessageSquare size={22} color="#F59E0B" />,
      route: "/complaints",
      color: "#F59E0B",
      bgColor: "#F59E0B" + "15",
    },
    {
      id: "8",
      title: t.profile?.notifications || "Notifications",
      icon: <Ionicons name="notifications" size={22} color="#EC4899" />,
      route: "/notifications",
      color: "#EC4899",
      bgColor: "#EC4899" + "15",
    },
    {
      id: "9",
      title: t.profile?.help || "Help & Support",
      icon: <Ionicons name="help-circle" size={22} color="#6366F1" />,
      route: "/profile/help",
      color: "#6366F1",
      bgColor: "#6366F1" + "15",
    },
    {
      id: "10",
      title: t.profile?.settings || "Settings",
      icon: <Ionicons name="settings" size={22} color={Colors.neutralMedium} />,
      route: "/profile/settings",
      color: Colors.neutralMedium,
      bgColor: Colors.neutralLight,
    },
  ];

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Guest state
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.primary900, Colors.primary800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.brandName}>
                  {t.nav?.profile || "Profile"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <Ionicons name="person" size={60} color={Colors.neutralGray} />
          </View>
          <Text style={styles.guestTitle}>
            {t.auth?.loginRequired || "Sign In Required"}
          </Text>
          <Text style={styles.guestText}>{t.ui.signInToViewProfile}</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/login")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInButtonGradient}
            >
              <Text style={styles.signInButtonText}>
                {t.auth?.login || "Sign In"}
              </Text>
              <ChevronRight size={18} color={Colors.neutralWhite} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="person" size={32} color={Colors.primary900} />
          </View>
          <Text style={styles.loadingText}>
            {t.common?.loading || "Loading..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ═══════════════════════════════════════════════════════════════════════════
          BRANDED HEADER – matches Home / Orders / Cart tabs
      ═══════════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <View style={styles.brandIcon}>
                <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
              </View>
              <Text style={styles.brandName}>
                {t.nav?.profile || "Profile"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/profile/edit")}
              style={styles.headerEditBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name="create-outline"
                size={14}
                color={Colors.neutralWhite}
              />
              <Text style={styles.headerEditText}>
                {t.common?.edit || "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Compact Profile Row inside header */}
          <View style={styles.profileCardInline}>
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitials}>
                {user?.first_name?.charAt(0) || "U"}
                {user?.last_name?.charAt(0) || ""}
              </Text>
            </LinearGradient>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push("/(tabs)/orders" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{ordersCount}</Text>
              <Text style={styles.statLabel}>{t.nav?.orders || "Orders"}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push("/profile/favorites" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{favorites?.length || 0}</Text>
              <Text style={styles.statLabel}>
                {t.profile?.favorites || "Favorites"}
              </Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>{t.ui.spent}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary900]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════════════════════════════════════════════════════════════════════
            SEARCH BAR
        ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.neutralMedium} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.ui.searchSettings}
            placeholderTextColor={Colors.neutralMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.neutralMedium}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            MENU ITEMS
        ═══════════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionTitle}>
          {t.profile?.myAccount || "Account"}
        </Text>

        <View style={styles.menuCard}>
          {filteredMenuItems.slice(0, 5).map((item, index) => (
            <Animated.View
              key={item.id}
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 20],
                      outputRange: [0, 20 + index * 3],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  index < Math.min(filteredMenuItems.length, 5) - 1 &&
                    styles.menuItemBorder,
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.6}
              >
                <View style={styles.menuLeft}>
                  <View
                    style={[
                      styles.menuIconBg,
                      { backgroundColor: item.bgColor },
                    ]}
                  >
                    {item.icon}
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                </View>
                <ChevronRight size={18} color={Colors.neutralGray} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {filteredMenuItems.length > 5 && (
          <>
            <Text style={styles.sectionTitle}>
              {t.profile?.settings || "General"}
            </Text>
            <View style={styles.menuCard}>
              {filteredMenuItems.slice(5).map((item, index) => (
                <Animated.View
                  key={item.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 20],
                          outputRange: [0, 20 + index * 3],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      index < filteredMenuItems.slice(5).length - 1 &&
                        styles.menuItemBorder,
                    ]}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.menuLeft}>
                      <View
                        style={[
                          styles.menuIconBg,
                          { backgroundColor: item.bgColor },
                        ]}
                      >
                        {item.icon}
                      </View>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.neutralGray} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </>
        )}

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          activeOpacity={0.9}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={styles.deleteAccountText}>
            {t.alerts?.deleteAccountTitle || "Delete Account"}
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.9}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.accentRed} />
          <Text style={styles.logoutText}>{t.auth?.logout || "Logout"}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>{t.ui.appVersion}</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════════
          DELETE ACCOUNT MODAL
      ═══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleteLoading) {
            setShowDeleteModal(false);
            setDeletePassword("");
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              if (!deleteLoading) {
                setShowDeleteModal(false);
                setDeletePassword("");
              }
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={styles.modalContent}
            >
              {/* Close button */}
              <TouchableOpacity
                style={styles.deleteCloseBtn}
                onPress={() => {
                  if (!deleteLoading) {
                    setShowDeleteModal(false);
                    setDeletePassword("");
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.neutralMedium} />
              </TouchableOpacity>

              {/* Modal Header */}
              <View style={styles.deleteModalHeader}>
                <View style={styles.deleteModalIconBg}>
                  <Ionicons
                    name="person-remove-outline"
                    size={30}
                    color={Colors.danger900}
                  />
                </View>
                <Text style={styles.deleteModalTitle}>
                  {t.alerts?.deleteAccountTitle || "Delete Account"}
                </Text>
                <Text style={styles.deleteModalSubtitle}>
                  {t.alerts?.deleteAccountWarning || t.ui.deleteWarningDetail}
                </Text>
              </View>

              {/* What will be deleted */}
              <View style={styles.deleteInfoList}>
                <View style={styles.deleteInfoItem}>
                  <Ionicons
                    name="cart-outline"
                    size={16}
                    color={Colors.neutralMedium}
                  />
                  <Text style={styles.deleteInfoText}>
                    {t.alerts?.deleteDataOrders ||
                      "Order history & saved items"}
                  </Text>
                </View>
                <View style={styles.deleteInfoItem}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={Colors.neutralMedium}
                  />
                  <Text style={styles.deleteInfoText}>
                    {t.alerts?.deleteDataAddresses ||
                      "Saved addresses & preferences"}
                  </Text>
                </View>
                <View style={styles.deleteInfoItem}>
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={Colors.neutralMedium}
                  />
                  <Text style={styles.deleteInfoText}>
                    {t.alerts?.deleteDataPayment || "Payment methods & wallet"}
                  </Text>
                </View>
              </View>

              {/* Password Input */}
              <Text style={styles.deleteInputLabel}>
                {t.alerts?.enterPassword || "Enter your password to confirm"}
              </Text>
              <View style={styles.deletePasswordContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.neutralMedium}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={styles.deletePasswordInput}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.neutralGray}
                  secureTextEntry={!showDeletePassword}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  autoCapitalize="none"
                  editable={!deleteLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowDeletePassword(!showDeletePassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={
                      showDeletePassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={Colors.neutralMedium}
                  />
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteModalCancelBtn}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeletePassword("");
                  }}
                  disabled={deleteLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={Colors.primary900}
                  />
                  <Text style={styles.deleteModalCancelText}>
                    {t.alerts?.deleteAccountCancel || "Keep Account"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteModalConfirmBtn,
                    (!deletePassword.trim() || deleteLoading) &&
                      styles.deleteModalConfirmBtnDisabled,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={!deletePassword.trim() || deleteLoading}
                  activeOpacity={0.7}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.deleteModalConfirmText}>
                      {t.alerts?.deleteAccountConfirm || "Delete My Account"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER – matches Home / Orders / Cart
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },
  headerEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  headerEditText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE CARD (inside header)
  // ═══════════════════════════════════════════════════════════════════════════
  profileCardInline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarInitials: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    lineHeight: 20,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 17,
  },
  profilePhone: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.65)",
    lineHeight: 15,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS ROW (inside header)
  // ═══════════════════════════════════════════════════════════════════════════
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 14,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH BAR
  // ═══════════════════════════════════════════════════════════════════════════
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    padding: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════════════════════════════════════════════
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralMedium,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.neutralWhite,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: Colors.accentRed + "30",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: Colors.accentRed,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    marginTop: 16,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ACCOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: Colors.danger900 + "25",
  },
  deleteAccountText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: Colors.danger900,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ACCOUNT MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: 28,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  deleteCloseBtn: {
    position: "absolute" as const,
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutralLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 1,
  },
  deleteModalHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8,
  },
  deleteModalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#FECACA",
  },
  deleteModalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    textAlign: "center",
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  deleteInfoList: {
    backgroundColor: Colors.neutralCloud,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  deleteInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteInfoText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    flex: 1,
  },
  deleteInputLabel: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
  },
  deletePasswordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.neutralGray,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.neutralCloud,
    marginBottom: 24,
  },
  deletePasswordInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    padding: 0,
  },
  deleteModalActions: {
    gap: 10,
  },
  deleteModalCancelBtn: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary100,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary900 + "30",
  },
  deleteModalCancelText: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: Colors.primary900,
  },
  deleteModalConfirmBtn: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger900,
    gap: 6,
  },
  deleteModalConfirmBtnDisabled: {
    opacity: 0.4,
  },
  deleteModalConfirmText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING & GUEST STATES
  // ═══════════════════════════════════════════════════════════════════════════
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  guestContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  guestText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 6,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // Legacy (kept for guest header)
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },
});
