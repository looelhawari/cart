import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";

export const BrowseCTASection = memo(function BrowseCTASection() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/(tabs)/categories")}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[Colors.primary800, Colors.primary900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name="grid-outline"
              size={20}
              color={Colors.neutralWhite}
            />
          </View>
          <Text style={styles.text}>
            {t.common?.browse || "Browse Categories"}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.7)"
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  button: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
});
