import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Package,
  CircleCheck,
  Star,
  TrendingUp,
  Clock,
  DollarSign,
} from "lucide-react-native";
import Colors from "@/constants/Colors";
import { driverApi, DriverStats } from "@/services/api/driverApi";
import { useTranslation } from "@/i18n";

type Period = "today" | "7d" | "30d" | "all";

function usePeriods(t: any): { label: string; value: Period }[] {
  return [
    { label: t.driver.today, value: "today" },
    { label: t.driver.sevenDays, value: "7d" },
    { label: t.driver.thirtyDays, value: "30d" },
    { label: t.driver.allTime, value: "all" },
  ];
}

export default function DriverStatsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("7d");
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await driverApi.getStats(period);
        setStats(data);
      } catch (e) {
        console.error("Failed to load stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.driver.myPerformance}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {usePeriods(t).map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.periodBtn,
              period === p.value && styles.periodBtnActive,
            ]}
            onPress={() => setPeriod(p.value)}
          >
            <Text
              style={[
                styles.periodText,
                period === p.value && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      ) : stats ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Main Stats Grid */}
          <View style={styles.grid}>
            <StatCard
              icon={<Package size={22} color={Colors.primary900} />}
              label={t.driver.totalOrders}
              value={stats.total_orders.toString()}
              bg={Colors.primary100}
            />
            <StatCard
              icon={<CircleCheck size={22} color="#16a34a" />}
              label={t.driver.delivered}
              value={stats.delivered_orders.toString()}
              bg="#dcfce7"
            />
            <StatCard
              icon={<DollarSign size={22} color="#ca8a04" />}
              label={t.driver.earnings}
              value={`${t.common.currency} ${parseFloat(stats.total_earnings?.toString() || "0").toFixed(0)}`}
              bg="#fef9c3"
            />
            <StatCard
              icon={<Star size={22} color="#f59e0b" />}
              label={t.driver.rating}
              value={
                stats.average_rating
                  ? stats.average_rating.toFixed(1)
                  : t.driver.notAvailable
              }
              bg="#fef3c7"
            />
          </View>

          {/* Delivery Rate */}
          <View style={styles.card}>
            <View style={styles.rateHeader}>
              <TrendingUp size={18} color={Colors.primary900} />
              <Text style={styles.rateTitle}>{t.driver.deliveryRate}</Text>
            </View>
            <View style={styles.rateBarBg}>
              <View
                style={[
                  styles.rateBarFill,
                  {
                    width: `${
                      stats.total_orders > 0
                        ? Math.round(
                            (stats.delivered_orders / stats.total_orders) * 100,
                          )
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.ratePercent}>
              {stats.total_orders > 0
                ? Math.round(
                    (stats.delivered_orders / stats.total_orders) * 100,
                  )
                : 0}
              {t.driver.completionRate}
            </Text>
          </View>

          {/* Average Times */}
          {stats.avg_delivery_time_minutes != null && (
            <View style={styles.card}>
              <View style={styles.rateHeader}>
                <Clock size={18} color="#8b5cf6" />
                <Text style={styles.rateTitle}>{t.driver.avgDeliveryTime}</Text>
              </View>
              <Text style={styles.bigNumber}>
                {stats.avg_delivery_time_minutes.toFixed(0)}
                {t.driver.min}
              </Text>
            </View>
          )}

          {/* Recent Deliveries Breakdown */}
          {stats.status_breakdown && (
            <View style={styles.card}>
              <Text style={styles.breakdownTitle}>
                {t.driver.orderStatusBreakdown}
              </Text>
              {Object.entries(stats.status_breakdown).map(([status, count]) => (
                <View key={status} style={styles.breakdownRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          status === "delivered"
                            ? Colors.primary900
                            : status === "out_for_delivery"
                              ? "#8b5cf6"
                              : status === "cancelled"
                                ? Colors.accentRed
                                : Colors.neutralMedium,
                      },
                    ]}
                  />
                  <Text style={styles.breakdownLabel}>
                    {status.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.breakdownCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{ color: Colors.neutralMedium }}>
            {t.driver.noStatsAvailable}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const cardWidth = (Dimensions.get("window").width - 52) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutralCloud },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.neutralWhite,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  periodBtnActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  periodText: { fontSize: 13, fontWeight: "600", color: Colors.neutralMedium },
  periodTextActive: { color: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  statCard: {
    width: cardWidth,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.neutralCharcoal },
  statLabel: { fontSize: 12, color: Colors.neutralMedium, fontWeight: "500" },
  card: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  rateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  rateTitle: { fontSize: 15, fontWeight: "700", color: Colors.neutralCharcoal },
  rateBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.neutralLight,
    marginBottom: 8,
    overflow: "hidden",
  },
  rateBarFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: Colors.primary900,
  },
  ratePercent: { fontSize: 13, color: Colors.neutralMedium },
  bigNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: "#8b5cf6",
    marginTop: 4,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.neutralMedium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.neutralCharcoal,
    textTransform: "capitalize",
    flex: 1,
  },
  breakdownCount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
  },
});
