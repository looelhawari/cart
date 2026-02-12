import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import { Truck } from "lucide-react-native";

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Error", "Please enter both email and password");
            return;
        }

        setLoading(true);
        try {
            await login(email.trim(), password);
            router.replace("/(tabs)/home");
        } catch (err: any) {
            Alert.alert("Login Failed", err?.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Truck size={48} color="#fff" strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>ElBaraka</Text>
                <Text style={styles.subtitle}>Driver App</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                <Text style={styles.welcomeText}>Welcome back</Text>
                <Text style={styles.descText}>Sign in to start delivering</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="driver@example.com"
                        placeholderTextColor="#9ca3af"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!showPassword}
                            editable={!loading}
                            onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity
                            style={styles.showBtn}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={styles.showBtnText}>{showPassword ? "Hide" : "Show"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.loginBtnText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Contact admin if you don't have an account
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#16a34a",
    },
    header: {
        flex: 0.35,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 40,
    },
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: "#fff",
    },
    subtitle: {
        fontSize: 16,
        color: "rgba(255,255,255,0.85)",
        marginTop: 4,
        fontWeight: "500",
    },
    form: {
        flex: 0.65,
        backgroundColor: "#fff",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    welcomeText: {
        fontSize: 26,
        fontWeight: "700",
        color: "#111827",
    },
    descText: {
        fontSize: 15,
        color: "#6b7280",
        marginTop: 4,
        marginBottom: 28,
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#f3f4f6",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: "#111827",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    showBtn: {
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    showBtnText: {
        color: "#16a34a",
        fontWeight: "600",
        fontSize: 14,
    },
    loginBtn: {
        backgroundColor: "#16a34a",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 8,
        shadowColor: "#16a34a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginBtnDisabled: {
        opacity: 0.7,
    },
    loginBtnText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    footerText: {
        textAlign: "center",
        color: "#9ca3af",
        fontSize: 13,
        marginTop: 20,
    },
});
