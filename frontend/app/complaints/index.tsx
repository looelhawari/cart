import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  ChevronRight,
  Inbox,
  Bot,
  User,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import {
  listComplaints,
  type ComplaintSummary,
} from "@/services/api/complaintsApi";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const statusFilters = [
  { key: "all", label: "All", icon: "apps" as const },
  { key: "open", label: "Open", icon: "alert-circle" as const },
  { key: "in_progress", label: "In Progress", icon: "time" as const },
  { key: "resolved", label: "Resolved", icon: "checkmark-circle" as const },
];

// ─── Skeleton ───────────────────────────────────────────────────────────────

const ComplaintSkeleton = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonCircle, { opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View
            style={[styles.skeletonLine, { width: "55%", opacity }]}
          />
          <Animated.View
            style={[styles.skeletonLine, { width: "80%", opacity }]}
          />
          <Animated.View
            style={[styles.skeletonLine, { width: "40%", height: 10, opacity }]}
          />
        </View>
        <Animated.View style={[styles.skeletonBadge, { opacity }]} />
      </View>
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ComplaintsScreen() {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  const loadComplaints = async () => {
    try {
      const response = await listComplaints(undefined, 50);
      if (!response.success) {
        throw new Error("Failed to load complaints");
      }
      setComplaints(response.data.complaints || []);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err: any) {
      console.error("Failed to load complaints:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadComplaints();
  }, []);

  const filteredComplaints = complaints.filter(
    (c) => activeFilter === "all" || c.status === activeFilter,
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return {
          color: Colors.accentOrange,
          bg: "#fff7ed",
          label: "OPEN",
          icon: "alert-circle-outline" as const,
        };
      case "in_progress":
        return {
          color: "#3b82f6",
          bg: "#eff6ff",
          label: "IN PROGRESS",
          icon: "time-outline" as const,
        };
      case "resolved":
        return {
          color: Colors.primary900,
          bg: Colors.primary100,
          label: "RESOLVED",
          icon: "checkmark-circle-outline" as const,
        };
      case "closed":
        return {
          color: Colors.neutralMedium,
          bg: Colors.neutralLight,
          label: "CLOSED",
          icon: "lock-closed-outline" as const,
        };
      default:
        return {
          color: Colors.neutralMedium,
          bg: Colors.neutralLight,
          label: status.toUpperCase(),
          icon: "help-circle-outline" as const,
        };
    }
  };

  // Stats
  const openCount = complaints.filter((c) => c.status === "open").length;
  const inProgressCount = complaints.filter(
    (c) => c.status === "in_progress",
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === "resolved",
  ).length;

  // ─── Render Complaint Card ──────────────────────────────────────────────

  const renderComplaint = ({
    item,
    index,
  }: {
    item: ComplaintSummary;
    index: number;
  }) => {
    const status = getStatusConfig(item.status);
    const isBotHandling = item.bot_handled && !item.escalated_to_agent;
    const isWithAgent = item.escalated_to_agent;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 15],
                outputRange: [0, 15 + index * 3],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={styles.complaintCard}
          onPress={() => router.push(`/complaints/${item.id}` as any)}
          activeOpacity={0.7}
        >
          {/* Status Indicator Strip */}
          <View
            style={[styles.statusStrip, { backgroundColor: status.color }]}
          />

          <View style={styles.cardContent}>
            {/* Avatar */}
            <View style={styles.cardLeft}>
              {isBotHandling ? (
                <View
                  style={[
                    styles.avatarBg,
                    { backgroundColor: "#8b5cf6" + "15" },
                  ]}
                >
                  <Bot size={20} color="#8b5cf6" />
                </View>
              ) : isWithAgent ? (
                <View
                  style={[
                    styles.avatarBg,
                    { backgroundColor: "#3b82f6" + "15" },
                  ]}
                >
                  <User size={20} color="#3b82f6" />
                </View>
              ) : (
                <View
                  style={[
                    styles.avatarBg,
                    { backgroundColor: Colors.primary100 },
                  ]}
                >
                  <MessageSquare size={20} color={Colors.primary900} />
                </View>
              )}
              {item.priority === "urgent" && <View style={styles.urgentDot} />}
            </View>

            {/* Content */}
            <View style={styles.cardMiddle}>
              <View style={styles.ticketRow}>
                <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
                {isBotHandling && (
                  <View style={styles.botBadge}>
                    <Text style={styles.botBadgeText}>🤖 Bot</Text>
                  </View>
                )}
                {isWithAgent && (
                  <View style={styles.agentBadge}>
                    <Text style={styles.agentBadgeText}>👤 Agent</Text>
                  </View>
                )}
              </View>

              <Text style={styles.subject} numberOfLines={1}>
                {item.subject}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>
                    {item.category
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </Text>
                </View>
                {item.messages_count !== undefined &&
                  item.messages_count > 0 && (
                    <View style={styles.messagesBadge}>
                      <MessageSquare size={10} color={Colors.neutralMedium} />
                      <Text style={styles.messagesCount}>
                        {item.messages_count}
                      </Text>
                    </View>
                  )}
              </View>
            </View>

            {/* Right */}
            <View style={styles.cardRight}>
              <Text style={styles.timeText}>
                {formatTimeAgo(item.created_at)}
              </Text>
              <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                <Ionicons name={status.icon} size={11} color={status.color} />
                <Text style={[styles.statusChipText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.neutralGray} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── Empty State ────────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Inbox size={56} color={Colors.neutralGray} />
      </View>
      <Text style={styles.emptyTitle}>No Tickets Yet</Text>
      <Text style={styles.emptyText}>
        You haven't submitted any support tickets.{"\n"}We're here to help!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push("/complaints/new" as any)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary700, Colors.primary900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Plus size={18} color={Colors.neutralWhite} />
          <Text style={styles.emptyButtonText}>Create First Ticket</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ─── Main Return ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ═══════════════════════════════════════════════════════════════════
          BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Top Bar */}
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={Colors.neutralWhite} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.brandIcon}>
                <MessageSquare size={14} color={Colors.neutralWhite} />
              </View>
              <Text style={styles.headerTitle}>Complaints</Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Stats Row */}
          {!loading && complaints.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{complaints.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{openCount}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{inProgressCount}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{resolvedCount}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          FILTER TABS
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {statusFilters.map((filter) => {
            const isActive = activeFilter === filter.key;
            const count =
              filter.key === "all"
                ? complaints.length
                : complaints.filter((c) => c.status === filter.key).length;

            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={filter.icon}
                  size={14}
                  color={isActive ? Colors.neutralWhite : Colors.neutralMedium}
                />
                <Text
                  style={[
                    styles.filterLabel,
                    isActive && styles.filterLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.filterCount,
                      isActive && styles.filterCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        isActive && styles.filterCountTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENT
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.content}>
        {loading ? (
          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <ComplaintSkeleton />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={filteredComplaints}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderComplaint}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary900]}
                tintColor={Colors.primary900}
              />
            }
            ListEmptyComponent={renderEmptyState}
          />
        )}

        {/* FAB */}
        {!loading && complaints.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("/complaints/new" as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              style={styles.fabGradient}
            >
              <Plus size={24} color={Colors.neutralWhite} strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BRANDED HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  headerWrapper: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS ROW
  // ═══════════════════════════════════════════════════════════════════════════
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: Typography.bodyLarge,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.7)",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER TABS
  // ═══════════════════════════════════════════════════════════════════════════
  filterContainer: {
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: Colors.primary900,
  },
  filterLabel: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralMedium,
  },
  filterLabelActive: {
    color: Colors.neutralWhite,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.neutralGray,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterCountText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralMedium,
  },
  filterCountTextActive: {
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════════════════════
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SKELETON
  // ═══════════════════════════════════════════════════════════════════════════
  skeletonCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  skeletonCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.neutralGray,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.neutralGray,
    borderRadius: 6,
  },
  skeletonBadge: {
    width: 54,
    height: 22,
    backgroundColor: Colors.neutralGray,
    borderRadius: 11,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLAINT CARD
  // ═══════════════════════════════════════════════════════════════════════════
  complaintCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    flexDirection: "row",
  },
  statusStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    gap: Spacing.sm,
  },
  cardLeft: {
    position: "relative",
  },
  avatarBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  urgentDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accentRed,
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
  },
  cardMiddle: {
    flex: 1,
    justifyContent: "center",
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  ticketNumber: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    color: Colors.neutralMedium,
  },
  botBadge: {
    backgroundColor: "#8b5cf6" + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  botBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: "#8b5cf6",
  },
  agentBadge: {
    backgroundColor: "#3b82f6" + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agentBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: "#3b82f6",
  },
  subject: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  categoryChip: {
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  messagesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  messagesCount: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralMedium,
  },
  cardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 9,
    fontFamily: "Poppins-Bold",
    letterSpacing: 0.3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.neutralLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.xs,
  },
  emptyButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FAB
  // ═══════════════════════════════════════════════════════════════════════════
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  fabGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
