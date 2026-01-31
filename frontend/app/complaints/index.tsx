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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Plus, MessageSquare, ChevronRight, Clock, Inbox } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';
import { listComplaints, type ComplaintSummary } from '@/services/api/complaintsApi';

// Format relative time
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

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
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonCircle, { opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[styles.skeletonLine, { width: '60%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '80%', opacity }]} />
        </View>
        <Animated.View style={[styles.skeletonBadge, { opacity }]} />
      </View>
    </View>
  );
};

export default function ComplaintsScreen() {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

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

  const filteredComplaints = complaints.filter(c =>
    activeFilter === 'all' || c.status === activeFilter
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open': return { color: '#f97316', bg: '#fff7ed', dot: '#fb923c' };
      case 'in_progress': return { color: '#3b82f6', bg: '#eff6ff', dot: '#60a5fa' };
      case 'resolved': return { color: '#22c55e', bg: '#f0fdf4', dot: '#4ade80' };
      case 'closed': return { color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af' };
      default: return { color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const renderComplaint = ({ item }: { item: ComplaintSummary }) => {
    const status = getStatusConfig(item.status);
    const priorityColor = getPriorityConfig(item.priority);

    return (
      <TouchableOpacity
        style={styles.complaintCard}
        onPress={() => router.push(`/complaints/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Left: Avatar/Icon */}
          <View style={styles.cardLeft}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.avatarGradient}
            >
              <MessageSquare size={18} color="#fff" />
            </LinearGradient>
            {item.priority === 'urgent' && (
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            )}
          </View>

          {/* Middle: Content */}
          <View style={styles.cardMiddle}>
            <View style={styles.headerRow}>
              <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
              <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            </View>
            <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.category}>
                {item.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
              {item.messages_count !== undefined && item.messages_count > 0 && (
                <View style={styles.messagesBadge}>
                  <MessageSquare size={10} color="#64748b" />
                  <Text style={styles.messagesCount}>{item.messages_count}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Time & Arrow */}
          <View style={styles.cardRight}>
            <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </View>
        </View>

        {/* Status Bar at Bottom */}
        <View style={[styles.statusBar, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#f0fdf4', '#dcfce7']}
        style={styles.emptyIconBg}
      >
        <Inbox size={40} color="#22c55e" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Tickets Yet</Text>
      <Text style={styles.emptyText}>
        You haven't submitted any support tickets. We're here to help!
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Support',
          headerTitleStyle: {
            fontFamily: 'Poppins-SemiBold',
            fontSize: 18,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={22} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
          headerBackground: () => (
            <View style={{ flex: 1, backgroundColor: '#fff' }} />
          ),
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {statusFilters.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count = filter.key === 'all'
                ? complaints.length
                : complaints.filter(c => c.status === filter.key).length;

              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                    {filter.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.content}>
          {loading ? (
            <FlatList
              data={[1, 2, 3, 4]}
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
                  colors={['#22c55e']}
                  tintColor="#22c55e"
                />
              }
              ListEmptyComponent={renderEmptyState}
            />
          )}

          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/complaints/new' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.fabGradient}
            >
              <Plus size={24} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  // Filter Tabs
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#22c55e',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterLabelActive: {
    color: '#fff',
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterCountTextActive: {
    color: '#fff',
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Skeleton
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  skeletonBadge: {
    width: 50,
    height: 20,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
  },
  // Card Styles
  complaintCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  cardLeft: {
    position: 'relative',
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    color: '#94a3b8',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    fontSize: 12,
    color: '#64748b',
  },
  messagesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  messagesCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statusBar: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '75%',
    lineHeight: 20,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
