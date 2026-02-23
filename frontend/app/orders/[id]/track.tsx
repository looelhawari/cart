import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";

const { width } = Dimensions.get("window");

export default function OrderTrackingScreen() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -18, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    const ripple = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();

    ripple(ring1, 0); ripple(ring2, 650); ripple(ring3, 1300);

    const dotPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

    dotPulse(dot1, 0); dotPulse(dot2, 200); dotPulse(dot3, 400);
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.5] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1C1B1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 38 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.rippleContainer}>
          <Animated.View style={[styles.ring, ringStyle(ring1)]} />
          <Animated.View style={[styles.ring, ringStyle(ring2)]} />
          <Animated.View style={[styles.ring, ringStyle(ring3)]} />
          <Animated.View style={[styles.truckWrapper, { transform: [{ translateY: floatAnim }] }]}>
            <LinearGradient colors={["#6C63FF", "#4F46E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.truckCircle}>
              <Text style={styles.truckEmoji}>🚚</Text>
            </LinearGradient>
          </Animated.View>
        </View>
        <View style={styles.badgeWrapper}>
          <LinearGradient colors={["#6C63FF", "#A855F7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
            <Text style={styles.badgeText}>✨  Coming Soon</Text>
          </LinearGradient>
        </View>
        <Text style={styles.title}>Live Order Tracking</Text>
        <Text style={styles.subtitle}>We're building a real-time map experience so you can watch your order travel to your door, step by step.</Text>
        <View style={styles.featureRow}>
          {["📍 Live Map", "🔔 Push Updates", "⏱ ETA Counter"].map((f) => (
            <View key={f} style={styles.pill}><Text style={styles.pillText}>{f}</Text></View>
          ))}
        </View>
        <View style={styles.dotsRow}>
          <Text style={styles.dotsLabel}>Working on it</Text>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back to Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const RING_SIZE = 180;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF9" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: "#F0EFF4", backgroundColor: "#fff" },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F4F3FF", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1C1B1F", letterSpacing: -0.3 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl, paddingBottom: 20 },
  rippleContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  ring: { position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 2, borderColor: "#6C63FF" },
  truckWrapper: { zIndex: 10 },
  truckCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  truckEmoji: { fontSize: 38 },
  badgeWrapper: { marginBottom: 18 },
  badge: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 50 },
  badgeText: { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: "800", color: "#1C1B1F", textAlign: "center", letterSpacing: -0.5, marginBottom: 14 },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 23, marginBottom: 28, maxWidth: width * 0.82 },
  featureRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 32 },
  pill: { backgroundColor: "#F4F3FF", borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#DDD9FF" },
  pillText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dotsLabel: { fontSize: 13, color: "#9CA3AF", marginRight: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#6C63FF" },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
  backButton: { backgroundColor: "#F4F3FF", borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "#DDD9FF" },
  backButtonText: { color: "#4F46E5", fontSize: 16, fontWeight: "700" },
});
