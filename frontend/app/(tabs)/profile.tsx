import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Animated,
    Dimensions,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChevronRight, Package, MessageSquare } from "lucide-react-native";
import { router } from "expo-router";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";

const { width } = Dimensions.get("window");

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
    const { user, fetchProfile, logout, isAuthenticated, orders } = useStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        loadProfile();
    }, [isAuthenticated]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            await fetchProfile();
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
            if (error?.message === "Unauthenticated." || error?.message === "TOKEN_EXPIRED") {
                Alert.alert(t.alerts?.sessionExpired || "Session Expired", t.alerts?.sessionExpiredMessage || "Please login again", [
                    {
                        text: t.auth?.login || "Login",
                        onPress: () => {
                            logout();
                            router.replace("/login");
                        },
                    },
                ]);
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
            ]
        );
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
            id: "6",
            title: t.profile?.wallet || "Wallet",
            icon: <Ionicons name="wallet" size={22} color="#10B981" />,
            route: "/profile/wallet",
            color: "#10B981",
            bgColor: "#10B981" + "15",
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
    const filteredMenuItems = menuItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
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
                                <Text style={styles.brandName}>ElBaraka</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.guestContainer}>
                    <View style={styles.guestIconContainer}>
                        <Ionicons name="person" size={60} color={Colors.neutralGray} />
                    </View>
                    <Text style={styles.guestTitle}>{t.auth?.loginRequired || "Sign In Required"}</Text>
                    <Text style={styles.guestText}>{"Sign in to view your profile"}</Text>
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
                            <Text style={styles.signInButtonText}>{t.auth?.login || "Sign In"}</Text>
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
                    <Text style={styles.loadingText}>{t.common?.loading || "Loading..."}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* ═══════════════════════════════════════════════════════════════════════════
          BRANDED HEADER WITH PROFILE
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
                            <Text style={styles.brandName}>ElBaraka</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => router.push("/profile/edit")}
                            style={styles.editButton}
                        >
                            <Ionicons name="create-outline" size={16} color={Colors.neutralWhite} />
                            <Text style={styles.editText}>{t.common?.edit || "Edit"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Profile Info Card */}
                    <View style={styles.profileCard}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => router.push("/profile/edit")}
                            activeOpacity={0.8}
                        >
                            {user?.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            ) : (
                                <LinearGradient
                                    colors={[Colors.primary700, Colors.primary900]}
                                    style={styles.avatarPlaceholder}
                                >
                                    <Text style={styles.avatarInitials}>
                                        {user?.first_name?.charAt(0) || "U"}{user?.last_name?.charAt(0) || ""}
                                    </Text>
                                </LinearGradient>
                            )}
                            <View style={styles.cameraButton}>
                                <Ionicons name="camera" size={12} color={Colors.neutralWhite} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {user?.first_name} {user?.last_name}
                            </Text>
                            <Text style={styles.profileEmail}>{user?.email}</Text>
                            {user?.phone && (
                                <View style={styles.phoneRow}>
                                    <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.profilePhone}>{user.phone}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{orders?.length || 0}</Text>
                            <Text style={styles.statLabel}>{t.nav?.orders || "Orders"}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>{t.profile?.favorites || "Favorites"}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>{"Points"}</Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={Colors.neutralMedium} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={"Search settings..."}
                            placeholderTextColor={Colors.neutralMedium}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Ionicons name="close-circle" size={18} color={Colors.neutralMedium} />
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary900]} />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {/* ═══════════════════════════════════════════════════════════════════════════
            MENU ITEMS
        ═══════════════════════════════════════════════════════════════════════════ */}
                <Text style={styles.sectionTitle}>{t.profile?.myAccount || "Account"}</Text>

                {filteredMenuItems.map((item, index) => (
                    <Animated.View
                        key={item.id}
                        style={{
                            opacity: fadeAnim,
                            transform: [{
                                translateY: slideAnim.interpolate({
                                    inputRange: [0, 20],
                                    outputRange: [0, 20 + index * 5],
                                }),
                            }],
                        }}
                    >
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.menuIconBg, { backgroundColor: item.bgColor }]}>
                                    {item.icon}
                                </View>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                            </View>
                            <ChevronRight size={20} color={Colors.neutralMedium} />
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    activeOpacity={0.9}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={22} color={Colors.accentRed} />
                    <Text style={styles.logoutText}>{t.auth?.logout || "Logout"}</Text>
                </TouchableOpacity>

                {/* App Version */}
                <Text style={styles.versionText}>ElBaraka v1.0.0</Text>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutralCloud,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER
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
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 6,
    },
    editText: {
        fontSize: 12,
        fontFamily: "Poppins-SemiBold",
        color: Colors.neutralWhite,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE CARD
    // ═══════════════════════════════════════════════════════════════════════════
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 18,
        padding: 14,
        marginBottom: 14,
    },
    avatarContainer: {
        position: "relative",
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.3)",
    },
    avatarPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.3)",
    },
    avatarInitials: {
        fontSize: 24,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
    },
    cameraButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary900,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: Colors.neutralWhite,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 14,
    },
    profileName: {
        fontSize: 18,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 13,
        fontFamily: "Poppins-Regular",
        color: "rgba(255,255,255,0.8)",
        marginBottom: 4,
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    profilePhone: {
        fontSize: 12,
        fontFamily: "Poppins-Regular",
        color: "rgba(255,255,255,0.7)",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // STATS ROW
    // ═══════════════════════════════════════════════════════════════════════════
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 14,
        paddingVertical: 12,
        marginBottom: 14,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        fontSize: 18,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: "Poppins-Medium",
        color: "rgba(255,255,255,0.7)",
    },
    statDivider: {
        width: 1,
        height: 30,
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
        paddingTop: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralCharcoal,
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.neutralWhite,
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    menuLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    menuIconBg: {
        width: 44,
        height: 44,
        borderRadius: 14,
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
        gap: 10,
        backgroundColor: Colors.neutralWhite,
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
        borderWidth: 2,
        borderColor: Colors.accentRed,
    },
    logoutText: {
        fontSize: 15,
        fontFamily: "Poppins-Bold",
        color: Colors.accentRed,
    },
    versionText: {
        textAlign: "center",
        fontSize: 12,
        fontFamily: "Poppins-Regular",
        color: Colors.neutralMedium,
        marginTop: 20,
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
});
