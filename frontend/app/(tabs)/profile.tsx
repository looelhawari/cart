import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  MapPin,
  Heart,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  MessageSquare,
  Bell,
  Wallet,
} from "lucide-react-native";
import { router } from "expo-router";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

export default function ProfileScreen() {
  const { user, fetchProfile, logout, isAuthenticated } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check if user is authenticated before loading
    if (!isAuthenticated) {
      Alert.alert(
        "Not Logged In",
        "Please login to view your profile.",
        [
          {
            text: "Login",
            onPress: () => router.replace("/login")
          }
        ]
      );
      setLoading(false);
      return;
    }

    loadProfile();
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      await fetchProfile();
    } catch (error: any) {
      console.error("Failed to load profile:", error);

      // Check if unauthenticated
      if (error?.message === "Unauthenticated." || error?.message === "TOKEN_EXPIRED") {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please login again.",
          [
            {
              text: "Login",
              onPress: () => {
                logout();
                router.replace("/login");
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to load profile. Please try again.");
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
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
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
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      id: "1",
      title: "Edit Profile",
      icon: <User size={24} color={Colors.primary900} />,
      route: "/profile/edit",
      color: Colors.primary900,
    },
    {
      id: "2",
      title: "My Addresses",
      icon: <MapPin size={24} color={Colors.primary700} />,
      route: "/profile/addresses",
      color: Colors.primary700,
    },
    {
      id: "3",
      title: "Favorites",
      icon: <Heart size={24} color={Colors.accentRed} />,
      route: "/profile/favorites",
      color: Colors.accentRed,
    },
    {
      id: "4",
      title: "My Wallet",
      icon: <Wallet size={24} color={Colors.primary700} />,
      route: "/profile/wallet",
      color: Colors.primary700,
    },
    {
      id: "5",
      title: "My Complaints",
      icon: <MessageSquare size={24} color={Colors.accentOrange} />,
      route: "/complaints",
      color: Colors.accentOrange,
    },
    {
      id: "6",
      title: "Notifications",
      icon: <Bell size={24} color={Colors.primary700} />,
      route: "/notifications",
      color: Colors.primary700,
    },
    {
      id: "7",
      title: "Help & Support",
      icon: <HelpCircle size={24} color={Colors.neutralMedium} />,
      route: "/profile/help",
      color: Colors.neutralMedium,
    },
    {
      id: "8",
      title: "Settings",
      icon: <Settings size={24} color={Colors.neutralMedium} />,
      route: "/profile/settings",
      color: Colors.neutralMedium,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => router.push("/profile/edit")}
              activeOpacity={0.8}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color={Colors.neutralWhite} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={styles.email}>{user?.email}</Text>
              <Text style={styles.phone}>{user?.phone}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.9}
            >
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  {item.icon}
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color={Colors.neutralMedium} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.9}
            onPress={handleLogout}
          >
            <LogOut size={24} color={Colors.accentRed} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
  header: {
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: Colors.primary900,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  email: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  phone: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    borderRadius: 20,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primary900,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.neutralGray,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 20,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.accentRed,
  },
  logoutText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.accentRed,
  },
});
