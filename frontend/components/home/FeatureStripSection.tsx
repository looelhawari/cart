import React, { memo, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";
import { getDeliverySettings } from "@/services/api/storeApi";

/**
 * Module-level cache so every mount of this component (home tab focus, etc.)
 * doesn't re-fire /store/delivery-settings. The threshold rarely changes;
 * a fresh value lands the next time the app cold-starts.
 */
let cachedThreshold: number | null = null;

export const FeatureStripSection = memo(function FeatureStripSection() {
  const { t } = useTranslation();
  const [threshold, setThreshold] = useState<number | null>(cachedThreshold);

  // Pull the free-delivery threshold from the admin's store settings so the
  // home banner stays in sync when ops bumps it from 200 → 300. Falls back
  // to the prior static "200+ EGP" string on any failure.
  useEffect(() => {
    let aborted = false;
    if (cachedThreshold !== null) return;

    getDeliverySettings()
      .then((res) => {
        if (aborted) return;
        const v = res?.data?.free_delivery_threshold;
        if (typeof v === "number" && v > 0) {
          cachedThreshold = v;
          setThreshold(v);
        }
      })
      .catch(() => {
        /* fall through to static fallback */
      });

    return () => {
      aborted = true;
    };
  }, []);

  // Render the dynamic threshold once it's loaded; until then, use the
  // legacy string so the strip never flashes empty during the first fetch.
  const freeDeliverySubtitle =
    threshold !== null
      ? (t.ui?.aboveThreshold ?? "{threshold}+ {currency}")
          .replace("{threshold}", String(threshold))
          .replace("{currency}", t.common?.currency ?? "EGP")
      : t.ui.above200;

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
        <Text style={styles.subtitle}>{freeDeliverySubtitle}</Text>
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
