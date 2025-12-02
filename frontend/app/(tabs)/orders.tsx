import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Clock, Truck, CheckCircle, XCircle, Search, ShoppingBag } from 'lucide-react-native';
import { router } from 'expo-router';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { orders } from '@/data/orders';
import { Order } from '@/types';

type OrderStatus = 'processing' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
type TabType = 'active' | 'completed' | 'cancelled';

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filterOrdersByTab = (orderList: Order[]): Order[] => {
    if (activeTab === 'active') {
      return orderList.filter(
        (order) =>
          order.status === 'processing' ||
          order.status === 'confirmed' ||
          order.status === 'preparing' ||
          order.status === 'out_for_delivery'
      );
    } else if (activeTab === 'completed') {
      return orderList.filter((order) => order.status === 'delivered');
    } else {
      return orderList.filter((order) => order.status === 'cancelled');
    }
  };

  const filterOrdersBySearch = (orderList: Order[]): Order[] => {
    if (!searchQuery.trim()) return orderList;
    return orderList.filter((order) =>
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredOrders = filterOrdersBySearch(filterOrdersByTab(orders));

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'processing':
        return <Clock size={20} color={Colors.accentOrange} />;
      case 'confirmed':
        return <Package size={20} color={Colors.primary700} />;
      case 'preparing':
        return <Package size={20} color={Colors.primary700} />;
      case 'out_for_delivery':
        return <Truck size={20} color={Colors.primary900} />;
      case 'delivered':
        return <CheckCircle size={20} color={Colors.primary700} />;
      case 'cancelled':
        return <XCircle size={20} color={Colors.accentRed} />;
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'processing':
        return 'Processing';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'processing':
        return Colors.accentOrange;
      case 'confirmed':
        return Colors.primary700;
      case 'preparing':
        return Colors.primary700;
      case 'out_for_delivery':
        return Colors.primary900;
      case 'delivered':
        return Colors.primary700;
      case 'cancelled':
        return Colors.accentRed;
    }
  };

  const renderEmptyState = () => {
    let title = '';
    let subtitle = '';

    if (activeTab === 'active') {
      title = 'No Active Orders';
      subtitle = 'Your active orders will appear here';
    } else if (activeTab === 'completed') {
      title = 'No Completed Orders';
      subtitle = 'Your order history will appear here';
    } else {
      title = 'No Cancelled Orders';
      subtitle = 'You don\'t have any cancelled orders';
    }

    return (
      <View style={styles.emptyState}>
        <ShoppingBag size={80} color={Colors.neutralGray} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{subtitle}</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.neutralMedium} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order number"
            placeholderTextColor={Colors.neutralMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
          onPress={() => setActiveTab('cancelled')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'cancelled' && styles.activeTabText,
            ]}
          >
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push(`/orders/${order.id}` as any)}
            activeOpacity={0.9}
          >
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(order.status)}20` },
                ]}
              >
                {getStatusIcon(order.status)}
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(order.status) },
                  ]}
                >
                  {getStatusText(order.status)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.orderFooter}>
              <View style={styles.itemsPreview}>
                {order.items.slice(0, 3).map((item, index) => (
                  <Image
                    key={index}
                    source={{ uri: item.image }}
                    style={[styles.itemImage, { marginLeft: index > 0 ? -8 : 0 }]}
                  />
                ))}
                {order.items.length > 3 && (
                  <View style={styles.moreItemsBadge}>
                    <Text style={styles.moreItemsText}>+{order.items.length - 3}</Text>
                  </View>
                )}
              </View>
              <View style={styles.orderFooterRight}>
                <Text style={styles.itemsCount}>{order.items.length} items</Text>
                <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredOrders.length === 0 && renderEmptyState()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
  },
  activeTab: {
    backgroundColor: Colors.primary900,
  },
  tabText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  activeTabText: {
    color: Colors.neutralWhite,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  orderCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderNumber: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralGray,
    marginBottom: Spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
  },
  moreItemsBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
  },
  moreItemsText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  orderFooterRight: {
    alignItems: 'flex-end',
  },
  itemsCount: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl,
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
    textAlign: 'center',
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
