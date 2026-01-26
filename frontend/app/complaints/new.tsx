import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, FileText, Send, Paperclip, ChevronDown, Package } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';
import { createComplaint } from '@/services/api/complaintsApi';
import { BottomSheet } from '@/components/BottomSheet';
import { orderApi, type Order } from '@/services/api/orderApi';

const categories = [
  { label: 'Order Issue', value: 'order_issue' },
  { label: 'Product Quality', value: 'product_quality' },
  { label: 'Delivery Problem', value: 'delivery_problem' },
  { label: 'Payment Issue', value: 'payment_issue' },
  { label: 'Technical Issue', value: 'technical_issue' },
  { label: 'General Inquiry', value: 'general_inquiry' },
  { label: 'Suggestion', value: 'suggestion' },
  { label: 'Other', value: 'other' },
];

export default function NewComplaintScreen() {
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
  });
  const [attachments, setAttachments] = useState<
    Array<{ uri: string; name: string; mimeType: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrdersSheet, setShowOrdersSheet] = useState(false);

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await orderApi.getOrders(undefined, 1, 5);
      setOrders(response.data?.orders || []);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handlePickAttachments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const files = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name || `attachment-${Date.now()}`,
      mimeType: asset.mimeType || 'application/octet-stream',
    }));

    setAttachments((prev) => [...prev, ...files]);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await createComplaint({
        subject: formData.subject,
        category: formData.category,
        description: formData.description,
        order_id: selectedOrder?.id || undefined,
        attachments,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to submit complaint');
      }

      router.replace('/complaints');
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Submit Complaint',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: -8 }}>
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Subject</Text>
                <View style={styles.inputWrapper}>
                  <FileText size={20} color={Colors.neutralMedium} />
                  <TextInput
                    style={styles.input}
                    placeholder="Brief description of your issue"
                    placeholderTextColor={Colors.neutralMedium}
                    value={formData.subject}
                    onChangeText={(text) =>
                      setFormData({ ...formData, subject: text })
                    }
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesRow}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.categoryChip,
                        formData.category === category.value &&
                          styles.categoryChipActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, category: category.value })
                      }
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          formData.category === category.value &&
                            styles.categoryTextActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Order (Optional)</Text>
                <TouchableOpacity
                  style={styles.selectOrderButton}
                  onPress={() => setShowOrdersSheet(true)}
                  activeOpacity={0.9}
                >
                  <View style={styles.selectOrderLeft}>
                    <View style={styles.selectOrderIcon}>
                      <Package size={18} color={Colors.primary900} />
                    </View>
                    <View>
                      <Text style={styles.selectOrderText}>
                        {selectedOrder
                          ? selectedOrder.order_number
                          : ordersLoading
                            ? 'Loading orders...'
                            : 'Select your order'}
                      </Text>
                      <Text style={styles.selectOrderSubtext}>
                        {selectedOrder
                          ? `${new Date(
                              selectedOrder.created_at,
                            ).toLocaleDateString()} • ${selectedOrder.status_label || selectedOrder.status}`
                          : 'Choose from your latest 5 orders'}
                      </Text>
                    </View>
                  </View>
                  <ChevronDown size={18} color={Colors.neutralMedium} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Provide detailed information about your complaint..."
                  placeholderTextColor={Colors.neutralMedium}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.attachButton}
                onPress={handlePickAttachments}
              >
                <Paperclip size={20} color={Colors.primary900} />
                <Text style={styles.attachText}>
                  Attach Files (PDF, JPG, PNG, WEBP)
                </Text>
              </TouchableOpacity>

              {attachments.length > 0 && (
                <View style={styles.attachmentList}>
                  <Text style={styles.attachmentCount}>
                    {attachments.length} attachment
                    {attachments.length === 1 ? '' : 's'} selected
                  </Text>
                </View>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title={submitting ? 'Submitting...' : 'Submit Complaint'}
                onPress={handleSubmit}
                icon={<Send size={20} color={Colors.neutralWhite} />}
                variant="primary"
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        visible={showOrdersSheet}
        onClose={() => setShowOrdersSheet(false)}
        title="Select an Order"
        snapPoints={[0.6]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.orderOption}
            onPress={() => {
              setSelectedOrder(null);
              setShowOrdersSheet(false);
            }}
          >
            <Text style={styles.orderOptionTitle}>No Order</Text>
            <Text style={styles.orderOptionMeta}>Submit without linking an order</Text>
          </TouchableOpacity>

          {ordersLoading && (
            <View style={styles.ordersLoadingRow}>
              <ActivityIndicator size="small" color={Colors.primary900} />
              <Text style={styles.ordersLoadingText}>Loading orders...</Text>
            </View>
          )}

          {!ordersLoading && orders.length === 0 && (
            <View style={styles.ordersEmpty}>
              <Text style={styles.ordersEmptyTitle}>No recent orders</Text>
              <Text style={styles.ordersEmptyText}>
                You can still submit a complaint without linking an order.
              </Text>
            </View>
          )}

          {!ordersLoading &&
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderOption}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowOrdersSheet(false);
                }}
              >
                <View style={styles.orderOptionRow}>
                  <View style={styles.orderOptionBadge}>
                    <Package size={16} color={Colors.primary900} />
                  </View>
                  <View style={styles.orderOptionInfo}>
                    <Text style={styles.orderOptionTitle}>{order.order_number}</Text>
                    <Text style={styles.orderOptionMeta}>
                      {new Date(order.created_at).toLocaleDateString()} •{' '}
                      {order.status_label || order.status}
                    </Text>
                  </View>
                  <Text style={styles.orderOptionTotal}>
                    {order.total !== undefined && order.total !== null
                      ? `${Number(order.total).toFixed(2)} EGP`
                      : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 56,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    height: '100%',
  },
  textArea: {
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    minHeight: 120,
  },
  categoriesRow: {
    gap: Spacing.sm,
  },
  categoryChip: {
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  categoryText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontWeight: Typography.semibold,
  },
  categoryTextActive: {
    color: Colors.neutralWhite,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  attachText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  selectOrderButton: {
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectOrderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectOrderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.primary900}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOrderText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    fontWeight: Typography.semibold,
  },
  selectOrderSubtext: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  orderOption: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  orderOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderOptionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.primary900}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderOptionInfo: {
    flex: 1,
  },
  orderOptionTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  orderOptionMeta: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 4,
  },
  orderOptionTotal: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  ordersLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  ordersLoadingText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  ordersEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  ordersEmptyTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  ordersEmptyText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  attachmentList: {
    marginBottom: Spacing.md,
  },
  attachmentCount: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  errorText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    marginBottom: Spacing.md,
  },
});
