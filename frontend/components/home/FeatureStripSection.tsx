import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";

export const FeatureStripSection = memo(function FeatureStripSection() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View
          style={[styles.icon, { backgroundColor: Colors.primary900 + "18" }]}
        >
          <Ionicons name="car" size={19} color={Colors.primary900} />
        </View>
        <Text style={styles.title}>
          {t.common?.freeDelivery || "Free Delivery"}
        </Text>
        <Text style={styles.subtitle}>{t.ui.above200}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.card}>
        <View
          style={[styles.icon, { backgroundColor: Colors.accentOrange + "18" }]}
        >
          <Ionicons name="time" size={19} color={Colors.accentOrange} />
        </View>
        <Text style={styles.title}>{t.ui.fastDelivery}</Text>
        <Text style={styles.subtitle}>{t.ui.thirtyToFortyFiveMins}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.card}>
        <View style={[styles.icon, { backgroundColor: "#3B82F618" }]}>
          <Ionicons name="shield-checkmark-outline" size={19} color="#3B82F6" />
        </View>
        <Text style={styles.title}>{t.ui.quality}</Text>
        <Text style={styles.subtitle}>{t.ui.guaranteed}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    flex: 1,
    alignItems: "center",
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 9,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: "55%",
    backgroundColor: Colors.neutralGray,
    alignSelf: "center",
  },
});
