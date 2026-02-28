import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";

export const DeliveryBannerSection = memo(function DeliveryBannerSection() {
  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <View style={styles.icon}>
        <Ionicons name="location" size={16} color={Colors.primary900} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {t.delivery?.areaRestrictionTitle || "Delivery Area"}
        </Text>
        <Text style={styles.subtitle}>
          {t.delivery?.areaRestrictionNote ||
            "We currently deliver only to Al Tagamoa and Al Rehab areas."}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900 + "0D",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary900 + "20",
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary900 + "18",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary900,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.neutralCharcoal,
    lineHeight: 15,
  },
});
