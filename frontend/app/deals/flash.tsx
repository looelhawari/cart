import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Clock, Filter, Zap } from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useTranslation } from "@/i18n";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/products";

export default function FlashDealsScreen() {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 32,
    seconds: 15,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }

        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const flashDealsProducts = products
    .filter(
      (p) => p.salePrice && ((p.price - p.salePrice) / p.price) * 100 >= 20,
    )
    .slice(0, 12);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Zap
            size={24}
            color={Colors.accentOrange}
            fill={Colors.accentOrange}
          />
          <Text style={styles.headerTitle}>{t.flashDeals.title}</Text>
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Filter size={20} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
      </View>

      {/* Timer Card */}
      <View style={styles.timerCard}>
        <View style={styles.timerHeader}>
          <Clock size={24} color={Colors.neutralWhite} />
          <Text style={styles.timerTitle}>{t.flashDeals.dealsEndIn}</Text>
        </View>

        <View style={styles.timerContainer}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{formatTime(timeLeft.hours)}</Text>
            <Text style={styles.timeLabel}>{t.flashDeals.hours}</Text>
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{formatTime(timeLeft.minutes)}</Text>
            <Text style={styles.timeLabel}>{t.flashDeals.minutes}</Text>
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{formatTime(timeLeft.seconds)}</Text>
            <Text style={styles.timeLabel}>{t.flashDeals.seconds}</Text>
          </View>
        </View>

        <Text style={styles.timerSubtext}>{t.flashDeals.hurryLimited}</Text>
      </View>

      {/* Products Grid */}
      <FlatList
        data={flashDealsProducts}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}` as any)}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productsGrid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Zap size={80} color={Colors.neutralMedium} />
            <Text style={styles.emptyTitle}>{t.flashDeals.noActiveDeals}</Text>
            <Text style={styles.emptyText}>{t.flashDeals.checkBackLater}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyButtonText}>
                {t.flashDeals.browseProducts}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  timerCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.accentOrange,
    borderRadius: 24,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timerTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  timeBlock: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    minWidth: 70,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  timeLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    opacity: 0.9,
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  timerSubtext: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralWhite,
    textAlign: "center",
    opacity: 0.9,
  },
  productsGrid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  row: {
    justifyContent: "space-between",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
