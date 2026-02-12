import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth";
import {
    User,
    Mail,
    Phone,
    Car,
    CreditCard,
    Star,
    MapPin,
    ChevronRight,
    LogOut,
    Lock,
    Shield,
} from "lucide-react-native";
import { APP_CONFIG } from "@/config/app.config";

export default function ProfileScreen() {
    const { driver, logout, refreshProfile } = useAuth();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [changingPw, setChangingPw] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Refresh profile data on mount
    useEffect(() => {
        refreshProfile();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    await logout();
                },
            },
        ]);
    };

    const handleChangePassword = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            Alert.alert("Error", "Please fill all password fields");
            return;
        }
        if (newPw.length < 8) {
            Alert.alert("Error", "New password must be at least 8 characters");
            return;
        }
        if (newPw !== confirmPw) {
            Alert.alert("Error", "New passwords don't match");
            return;
        }

        setChangingPw(true);
        try {
            await authService.changePassword(currentPw, newPw, confirmPw);
            Alert.alert("Success", "Password changed successfully");
            setShowPasswordForm(false);
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to change password");
        } finally {
            setChangingPw(false);
        }
    };

    const rating = Number(driver?.average_rating || 0);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#16a34a"]} />
                }
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(driver?.first_name?.[0] || "D").toUpperCase()}
                            {(driver?.last_name?.[0] || "").toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.name}>
                        {driver?.first_name} {driver?.last_name}
                    </Text>
                    {rating > 0 && (
                        <View style={styles.ratingRow}>
                            <Star size={14} color="#eab308" fill="#eab308" />
                            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                        </View>
                    )}
                    <Text style={styles.role}>Driver</Text>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <InfoRow icon={<Mail size={18} color="#6b7280" />} label="Email" value={driver?.email || ""} />
                    <InfoRow icon={<Phone size={18} color="#6b7280" />} label="Phone" value={driver?.phone || ""} />
                    <InfoRow
                        icon={<Car size={18} color="#6b7280" />}
                        label="Vehicle"
                        value={driver?.vehicle_type ? `${driver.vehicle_type}${driver.vehicle_plate ? ` • ${driver.vehicle_plate}` : ""}` : "Not set"}
                    />
                    <InfoRow
                        icon={<MapPin size={18} color="#6b7280" />}
                        label="Zone"
                        value={driver?.assigned_zone?.name || "Not assigned"}
                    />
                    <InfoRow
                        icon={<CreditCard size={18} color="#6b7280" />}
                        label="Total Deliveries"
                        value={String(driver?.total_deliveries || 0)}
                    />
                </View>

                {/* Security Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setShowPasswordForm(!showPasswordForm)}
                    >
                        <View style={styles.menuIcon}>
                            <Lock size={18} color="#6b7280" />
                        </View>
                        <Text style={styles.menuLabel}>Change Password</Text>
                        <ChevronRight size={18} color="#d1d5db" />
                    </TouchableOpacity>

                    {showPasswordForm && (
                        <View style={styles.passwordForm}>
                            <TextInput
                                style={styles.pwInput}
                                placeholder="Current password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry
                                value={currentPw}
                                onChangeText={setCurrentPw}
                            />
                            <TextInput
                                style={styles.pwInput}
                                placeholder="New password (min 8 chars)"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry
                                value={newPw}
                                onChangeText={setNewPw}
                            />
                            <TextInput
                                style={styles.pwInput}
                                placeholder="Confirm new password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry
                                value={confirmPw}
                                onChangeText={setConfirmPw}
                            />
                            <TouchableOpacity
                                style={styles.changePwBtn}
                                onPress={handleChangePassword}
                                disabled={changingPw}
                            >
                                {changingPw ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.changePwBtnText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>
                    <InfoRow
                        icon={<Shield size={18} color="#6b7280" />}
                        label="Version"
                        value={APP_CONFIG.VERSION}
                    />
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.menuIcon}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    profileCard: {
        backgroundColor: "#16a34a",
        paddingTop: 24,
        paddingBottom: 32,
        alignItems: "center",
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
    name: { fontSize: 22, fontWeight: "700", color: "#fff", marginTop: 12 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    ratingText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
    role: {
        fontSize: 13,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
        marginTop: 2,
    },
    section: {
        backgroundColor: "#fff",
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#f1f5f9",
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#9ca3af",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f8fafc",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
    },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
    infoLabel: { fontSize: 11, color: "#9ca3af" },
    infoValue: { fontSize: 14, fontWeight: "500", color: "#111827", marginTop: 1 },
    passwordForm: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        padding: 14,
        gap: 10,
        marginTop: 8,
    },
    pwInput: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: "#111827",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    changePwBtn: {
        backgroundColor: "#16a34a",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 4,
    },
    changePwBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 20,
        marginHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#fef2f2",
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    logoutText: { fontSize: 16, fontWeight: "700", color: "#ef4444" },
});
