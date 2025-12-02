import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  MapPin,
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Download,
  RotateCcw,
  MessageSquare,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { orders } from '@/data/orders';
import { useStore } from '@/store';
import { Order as OrderType } from '@/types';

type OrderStatus = 'processing' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const order = orders.find((o) => o.id === id);
  const { cancelOrder } = useStore();
  const [showMore, setShowMore] = useState(false);

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Order not found</Text>
      </SafeAreaView>
    );
  }

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelOrder(order.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleReorder = () => {
    // Add all order items back to cart
    Alert.alert('Reorder', 'Items added to cart!');
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share order details');
  };

  const handleDownloadReceipt = () => {
    Alert.alert('Download', 'Downloading receipt...');
  };

  const getStatusInfo = (status: OrderStatus) => {
    const statuses = {
      processing: { label: 'Processing', icon: Clock, color: Colors.accentOrange },
      confirmed: { label: 'Confirmed', icon: CheckCircle, color: Colors.primary700 },
      preparing: { label: 'Preparing', icon: Package, color: Colors.primary700 },
      out_for_delivery: { label: 'Out for Delivery', icon: Truck, color: Colors.primary900 },
      delivered: { label: 'Delivered', icon: CheckCircle, color: Colors.primary700 },
      cancelled: { label: 'Cancelled', icon: XCircle, color: Colors.accentRed },
    };
    return statuses[status];
  };

  const timelineSteps = [
    { status: 'processing', label: 'Order Placed', completed: true },
    { status: 'confirmed', label: 'Confirmed', completed: order.status !== 'processing' && order.status !== 'cancelled' },
    { status: 'preparing', label: 'Preparing', completed: ['preparing', 'out_for_delivery', 'delivered'].includes(order.status) },
    { status: 'out_for_delivery', label: 'Out for Delivery', completed: ['out_for_delivery', 'delivered'].includes(order.status) },
    { status: 'delivered', label: 'Delivered', completed: order.status === 'delivered' },
  ];

  const canCancel = order.status === 'processing' || order.status === 'confirmed';
  const canTrack = order.status === 'out_for_delivery';
  const canRate = order.status === 'delivered';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Order Details</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={20} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowMore(!showMore)}
            activeOpacity={0.7}
          >
            <MoreVertical size={20} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
        </View>
      </View>

      {showMore && (
        <View style={styles.moreMenu}>
          <TouchableOpacity
            style={styles.moreMenuItem}
            onPress={handleDownloadReceipt}
            activeOpacity={0.7}
          >
            <Download size={20} color={Colors.neutralCharcoal} />
            <Text style={styles.moreMenuText}>Download Receipt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMore(false);
              router.push(`/complaints/new?orderId=${order.id}` as any);
            }}
            activeOpacity={0.7}
          >
            <MessageSquare size={20} color={Colors.accentOrange} />
            <Text style={styles.moreMenuText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          
          <View style={styles.timeline}>
            {timelineSteps.map((step, index) => {
              const IconComponent = getStatusInfo(step.status as OrderStatus).icon;
              return (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineIcon,
                        {
                          backgroundColor: step.completed
                            ? Colors.primary900
                            : Colors.neutralGray,
                        },
                      ]}
                    >
                      <IconComponent
                        size={16}
                        color={step.completed ? Colors.neutralWhite : Colors.neutralMedium}
                      />
                    </View>
                    {index < timelineSteps.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: step.completed
                              ? Colors.primary900
                              : Colors.neutralGray,
                          },
                        ]}
                      />
                    )}
                  </View>
                  
                  <View style={styles.timelineRight}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        {
                          color: step.completed
                            ? Colors.neutralCharcoal
                            : Colors.neutralMedium,
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                    {step.completed && (
                      <Text style={styles.timelineDate}>
                        {new Date(order.date).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Estimated Delivery */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={styles.deliveryCard}>
            <Clock size={24} color={Colors.primary900} />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
              <Text style={styles.deliveryTime}>Today, 2:00 PM - 4:00 PM</Text>
            </View>
          </View>
        )}

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MapPin size={20} color={Colors.primary900} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Address</Text>
                <Text style={styles.infoText}>
                  123 Main Street, Apt 4B{'\n'}Cairo, Egypt 11511
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Clock size={20} color={Colors.primary900} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Time Slot</Text>
                <Text style={styles.infoText}>Today, 2:00 PM - 4:00 PM</Text>
              </View>
            </View>
            
            {order.deliveryInstructions && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <MessageSquare size={20} color={Colors.primary900} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Delivery Instructions</Text>
                    <Text style={styles.infoText}>{order.deliveryInstructions}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({order.items.length})</Text>
          
          <View style={styles.itemsCard}>
            {order.items.map((item, index) => (
              <View key={index}>
                <View style={styles.itemRow}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                  <View style={styles.itemPricing}>
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                    <Text style={styles.itemSubtotal}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
                {index < order.items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${order.deliveryFee.toFixed(2)}</Text>
            </View>
            
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: Colors.primary700 }]}>
                  -${order.discount.toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${order.tax.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Paid</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.paymentRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.paymentMethod}>{order.paymentMethod}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {canTrack && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/orders/${order.id}/track` as any)}
              activeOpacity={0.9}
            >
              <Truck size={20} color={Colors.neutralWhite} />
              <Text style={styles.primaryButtonText}>Track Order</Text>
            </TouchableOpacity>
          )}
          
          {canRate && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/orders/${order.id}/rate` as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Rate Order</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleReorder}
            activeOpacity={0.9}
          >
            <RotateCcw size={20} color={Colors.primary900} />
            <Text style={styles.secondaryButtonText}>Reorder</Text>
          </TouchableOpacity>
          
          {canCancel && (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleCancelOrder}
              activeOpacity={0.9}
            >
              <XCircle size={20} color={Colors.accentRed} />
              <Text style={styles.dangerButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  moreMenu: {
    backgroundColor: Colors.neutralWhite,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: 16,
    padding: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  moreMenuText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  timeline: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineLabel: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.primary900,
    borderRadius: 24,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralWhite,
    opacity: 0.9,
    marginBottom: 4,
  },
  deliveryTime: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  infoCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  infoText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralGray,
    marginVertical: Spacing.md,
  },
  itemsCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  itemPricing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  itemPrice: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  itemSubtotal: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  summaryCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  summaryValue: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  totalLabel: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  totalValue: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary900,
  },
  secondaryButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.accentRed,
  },
  dangerButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.accentRed,
  },
});
