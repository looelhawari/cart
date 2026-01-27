import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingBag, Tag, User, CheckCircle } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { notifications } from '@/data/notifications';
import { Notification } from '@/types';

type Tab = 'all' | 'orders' | 'offers' | 'account';

export default function NotificationsScreen() {
  const { wp, hp, isSmallDevice } = useResponsive();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [notificationList, setNotificationList] = useState(notifications);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'orders', label: 'Orders' },
    { key: 'offers', label: 'Offers' },
    { key: 'account', label: 'Account' },
  ];

  const filteredNotifications = notificationList.filter((notif) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'orders') return notif.type === 'order';
    if (activeTab === 'offers') return notif.type === 'offer';
    if (activeTab === 'account') return notif.type === 'account';
    return true;
  });

  const markAllAsRead = () => {
    setNotificationList((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  const markAsRead = (id: string) => {
    setNotificationList((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
    );
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingBag size={24} color={Colors.primary900} />;
      case 'offer':
        return <Tag size={24} color={Colors.accentOrange} />;
      case 'account':
        return <User size={24} color={Colors.primary700} />;
      default:
        return <CheckCircle size={24} color={Colors.primary900} />;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{getIcon(item.type)}</View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralCloud,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: Colors.neutralWhite,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontFamily: 'Poppins_700Bold',
      color: Colors.neutralCharcoal,
      flex: 1,
      textAlign: 'center',
    },
    markAllText: {
      fontSize: Typography.bodyMedium,
      fontFamily: 'Poppins_600SemiBold',
      color: Colors.primary900,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: Colors.neutralWhite,
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    tab: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: 20,
    },
    activeTab: {
      backgroundColor: Colors.primary900,
    },
    tabText: {
      fontSize: Typography.bodyMedium,
      fontFamily: 'Poppins_600SemiBold',
      color: Colors.neutralMedium,
    },
    activeTabText: {
      color: Colors.neutralWhite,
    },
    listContent: {
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      gap: Spacing.sm,
    },
    notificationCard: {
      flexDirection: 'row',
      backgroundColor: Colors.neutralWhite,
      borderRadius: 16,
      padding: isSmallDevice ? Spacing.sm : Spacing.md,
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    unreadCard: {
      backgroundColor: Colors.neutralLight,
      borderLeftWidth: 3,
      borderLeftColor: Colors.primary900,
    },
    iconContainer: {
      width: isSmallDevice ? 40 : 48,
      height: isSmallDevice ? 40 : 48,
      borderRadius: isSmallDevice ? 20 : 24,
      backgroundColor: Colors.neutralLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentContainer: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyBase,
      fontFamily: 'Poppins_600SemiBold',
      color: Colors.neutralCharcoal,
    },
    unreadTitle: {
      fontFamily: 'Poppins_700Bold',
    },
    message: {
      fontSize: Typography.bodyMedium,
      fontFamily: 'Poppins_400Regular',
      color: Colors.neutralMedium,
      lineHeight: 20,
    },
    timestamp: {
      fontSize: Typography.bodySmall,
      fontFamily: 'Poppins_400Regular',
      color: Colors.neutralMedium,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary900,
      alignSelf: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xxl,
    },
    emptyTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontFamily: 'Poppins_700Bold',
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      fontSize: Typography.bodyBase,
      fontFamily: 'Poppins_400Regular',
      color: Colors.neutralMedium,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You&apos;ll see notifications here when you have them
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

