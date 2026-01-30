import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Plus, AlertCircle, ChevronRight, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';
import { listComplaints, type ComplaintSummary } from '@/services/api/complaintsApi';

// Skeleton Component
const ComplaintSkeleton = () => {
  const animatedValue = new Animated.Value(0);

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
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonText, { width: 80, height: 16, opacity }]} />
        <Animated.View style={[styles.skeletonBadge, { opacity }]} />
      </View>
      <Animated.View style={[styles.skeletonText, { width: '80%', height: 20, marginBottom: 8, opacity }]} />
      <Animated.View style={[styles.skeletonText, { width: 100, height: 14, opacity }]} />
      <View style={styles.skeletonFooter}>
        <Animated.View style={[styles.skeletonBadge, { width: 80, opacity }]} />
        <Animated.View style={[styles.skeletonText, { width: 60, height: 12, opacity }]} />
      </View>
    </View>
  );
};

export default function ComplaintsScreen() {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComplaints = async () => {
    try {
      setError(null);
      const response = await listComplaints(undefined, 50);
      if (!response.success) {
        throw new Error('Failed to load complaints');
      }
      setComplaints(response.data.complaints || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaints');
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { color: Colors.accentOrange, label: 'Open', bg: '#FFF7ED' };
      case 'in_progress':
        return { color: Colors.primary700, label: 'In Progress', bg: '#F0FDF4' };
      case 'resolved':
        return { color: Colors.primary900, label: 'Resolved', bg: '#DCFCE7' };
      case 'closed':
        return { color: Colors.neutralMedium, label: 'Closed', bg: '#F1F5F9' };
      default:
        return { color: Colors.neutralMedium, label: status, bg: '#F1F5F9' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: Colors.accentRed, label: 'Urgent' };
      case 'high':
        return { color: Colors.accentOrange, label: 'High' };
      case 'medium':
        return { color: Colors.accentYellow, label: 'Medium' };
      case 'low':
        return { color: Colors.neutralMedium, label: 'Low' };
      default:
        return { color: Colors.neutralMedium, label: priority };
    }
  };

  const renderComplaint = ({ item }: { item: ComplaintSummary }) => {
    const status = getStatusConfig(item.status);
    const priority = getPriorityConfig(item.priority);

    return (
      <TouchableOpacity
        style={styles.complaintCard}
        onPress={() => router.push(`/complaints/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.ticketBadge}>
            <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
          </View>
          <View style={[styles.priorityPill, { borderColor: priority.color }]}>
            <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
            <Text style={[styles.priorityText, { color: priority.color }]}>
              {priority.label}
            </Text>
          </View>
        </View>

        <Text style={styles.subject} numberOfLines={2}>
          {item.subject}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{item.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
          </View>
          {item.messages_count !== undefined && item.messages_count > 0 && (
            <View style={styles.messageCount}>
              <MessageSquare size={12} color={Colors.neutralMedium} />
              <Text style={styles.messageCountText}>{item.messages_count}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <ChevronRight size={16} color={Colors.neutralMedium} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Support Tickets',
          headerTitleStyle: {
            fontFamily: 'Poppins-SemiBold',
            fontSize: 18,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
          headerBackground: () => (
            <View style={{ flex: 1, backgroundColor: Colors.neutralCloud }} />
          ),
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
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
              data={complaints}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderComplaint}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary900]} />
              }
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <LinearGradient
                      colors={[Colors.primary100, '#ffffff']}
                      style={styles.emptyIconBg}
                    >
                      <AlertCircle size={48} color={Colors.primary900} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.emptyTitle}>No Complaints Found</Text>
                  <Text style={styles.emptyText}>
                    You haven&apos;t submitted any complaints yet. We're here to help if you need anything!
                  </Text>
                </View>
              )}
            />
          )}

          <View style={styles.footer}>
            <Button
              title="Create New Ticket"
              onPress={() => router.push('/complaints/new' as any)}
              icon={<Plus size={20} color={Colors.neutralWhite} />}
              variant="primary"
              style={styles.createButton}
            />
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100, // Space for floating button
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  // Skeleton Styles
  skeletonCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonText: {
    backgroundColor: Colors.neutralGray,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBadge: {
    height: 24,
    width: 80,
    backgroundColor: Colors.neutralGray,
    borderRadius: 12,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  // Card Styles
  complaintCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.neutralCharcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ticketBadge: {
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ticketNumber: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: Colors.neutralMedium,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 13,
    color: Colors.neutralMedium,
    fontWeight: '500',
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  messageCountText: {
    fontSize: 11,
    color: Colors.neutralMedium,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralLight,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: Colors.neutralMedium,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary500,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyTitle: {
    fontSize: Typography.h4,
    fontWeight: '700',
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  // Footer Button
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.lg,
    backgroundColor: 'transparent',
  },
  createButton: {
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
