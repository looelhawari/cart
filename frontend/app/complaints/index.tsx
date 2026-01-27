import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';
import { listComplaints, type ComplaintSummary } from '@/services/api/complaintsApi';

export default function ComplaintsScreen() {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComplaints = async () => {
    try {
      setLoading(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.accentOrange;
      case 'in_progress':
        return Colors.primary700;
      case 'resolved':
        return Colors.primary900;
      case 'closed':
        return Colors.neutralMedium;
      default:
        return Colors.neutralMedium;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return Colors.accentRed;
      case 'high':
        return Colors.accentOrange;
      case 'medium':
        return Colors.accentYellow;
      case 'low':
        return Colors.neutralMedium;
      default:
        return Colors.neutralMedium;
    }
  };

  const renderComplaint = ({ item }: { item: ComplaintSummary }) => (
    <TouchableOpacity
      style={styles.complaintCard}
      onPress={() => router.push(`/complaints/${item.id}` as any)}
    >
      <View style={styles.complaintHeader}>
        <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: `${getPriorityColor(item.priority)}20` },
          ]}
        >
          <Text
            style={[
              styles.priorityText,
              { color: getPriorityColor(item.priority) },
            ]}
          >
            {item.priority.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.subject} numberOfLines={1}>
        {item.subject}
      </Text>
      <Text style={styles.category}>{item.category.replace('_', ' ')}</Text>
      <View style={styles.complaintFooter}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'My Complaints',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: -8 }}>
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary900} />
              <Text style={styles.loadingText}>Loading complaints...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
          <FlatList
            data={complaints}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderComplaint}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <AlertCircle size={64} color={Colors.neutralMedium} />
                <Text style={styles.emptyTitle}>No Complaints Yet</Text>
                <Text style={styles.emptyText}>
                  You haven&apos;t submitted any complaints
                </Text>
              </View>
            )}
          />
          <Button
            title="Submit New Complaint"
            onPress={() => router.push('/complaints/new' as any)}
            icon={<Plus size={20} color={Colors.neutralWhite} />}
            variant="primary"
          />
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
    padding: Spacing.lg,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  errorText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    marginBottom: Spacing.sm,
  },
  complaintCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ticketNumber: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
  },
  subject: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  category: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: Spacing.sm,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
  },
  date: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: 'center',
  },
});
