import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChevronRight } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";

export const PromoBannerSection = memo(function PromoBannerSection() {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push("/(tabs)/offers")}
      activeOpacity={0.92}
    >
      <LinearGradient
        colors={[Colors.primary700, Colors.primary900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="gift-outline"
                size={22}
                color={Colors.neutralWhite}
              />
            </View>
            <View>
              <Text style={styles.title}>{t.ui.exclusiveOffers}</Text>
              <Text style={styles.subtitle}>{t.ui.getUpTo50}</Text>
            </View>
          </View>
          <View style={styles.arrow}>
            <ChevronRight size={22} color="rgba(255,255,255,0.75)" />
          </View>
        </View>
        {/* Decorative circles */}
        <View style={styles.decor1} />
        <View style={styles.decor2} />
      </LinearGradient>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    position: "relative",
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.82)",
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  decor1: {
    position: "absolute",
    top: -28,
    right: -28,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  decor2: {
    position: "absolute",
    bottom: -35,
    right: 55,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
