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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Send, Package, X, Check, Image as ImageIcon, File, AlertCircle, ChevronDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

import Colors from '@/constants/Colors';
import Spacing from '@/constants/Spacing';
import { createComplaint } from '@/services/api/complaintsApi';
import { BottomSheet } from '@/components/BottomSheet';
import { orderApi, type Order } from '@/services/api/orderApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const categories = [
  { label: 'Order Issue', value: 'order_issue', icon: '📦' },
  { label: 'Product Quality', value: 'product_quality', icon: '⭐' },
  { label: 'Delivery', value: 'delivery_problem', icon: '🚚' },
  { label: 'Payment', value: 'payment_issue', icon: '💳' },
  { label: 'Technical', value: 'technical_issue', icon: '🔧' },
  { label: 'Suggestion', value: 'suggestion', icon: '💡' },
  { label: 'Other', value: 'other', icon: '❓' },
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
    try {
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
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.category || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

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
        throw new Error(response.message || 'Failed to submit');
      }

      router.replace('/complaints');
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = formData.subject && formData.category && formData.description;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New Request',
          headerTitleStyle: { fontFamily: 'Poppins-SemiBold', fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
          headerBackground: () => <View style={styles.headerBg} />,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = formData.category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.categoryItem, isSelected && styles.categoryItemActive]}
                      onPress={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkIcon}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>Subject <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Briefly describe the issue"
                placeholderTextColor="#9ca3af"
                value={formData.subject}
                onChangeText={(text) => setFormData({ ...formData, subject: text })}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide more details..."
                placeholderTextColor="#9ca3af"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>

            {/* Order Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Related Order <Text style={styles.optional}>(Optional)</Text></Text>
              <TouchableOpacity
                style={styles.orderSelector}
                onPress={() => setShowOrdersSheet(true)}
              >
                <Package size={18} color={selectedOrder ? '#22c55e' : '#9ca3af'} />
                <Text style={[styles.orderText, selectedOrder && styles.orderTextActive]}>
                  {selectedOrder ? `Order #${selectedOrder.order_number}` : 'Select an order'}
                </Text>
                <ChevronDown size={18} color="#9ca3af" />
              </TouchableOpacity>
              {selectedOrder && (
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.clearBtn}>
                  <X size={12} color="#ef4444" />
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Attachments */}
            <View style={styles.section}>
              <Text style={styles.label}>Attachments <Text style={styles.optional}>(Optional)</Text></Text>

              {attachments.length > 0 && (
                <View style={styles.attachmentList}>
                  {attachments.map((file, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      {file.mimeType?.startsWith('image/') ? (
                        <ImageIcon size={16} color="#22c55e" />
                      ) : (
                        <File size={16} color="#3b82f6" />
                      )}
                      <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                      <TouchableOpacity onPress={() => removeAttachment(index)}>
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAttachments}>
                <Text style={styles.uploadText}>+ Add files</Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Orders Bottom Sheet */}
      <BottomSheet
        visible={showOrdersSheet}
        onClose={() => setShowOrdersSheet(false)}
        title="Select Order"
        snapPoints={[0.5]}
      >
        <ScrollView contentContainerStyle={styles.sheetContent}>
          {ordersLoading ? (
            <ActivityIndicator color="#22c55e" style={{ marginTop: 20 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Package size={32} color="#d1d5db" />
              <Text style={styles.emptyOrdersText}>No recent orders</Text>
            </View>
          ) : (
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderOption, selectedOrder?.id === order.id && styles.orderOptionActive]}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowOrdersSheet(false);
                }}
              >
                <Package size={16} color={selectedOrder?.id === order.id ? '#22c55e' : '#64748b'} />
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {selectedOrder?.id === order.id && <Check size={18} color="#22c55e" />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  headerBg: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backBtn: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryItem: {
    width: (SCREEN_WIDTH - 48) / 3,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemActive: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#22c55e',
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Input
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Order Selector
  orderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  orderText: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
  },
  orderTextActive: {
    color: '#1e293b',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    color: '#ef4444',
  },
  // Attachments
  attachmentList: {
    marginBottom: 10,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  uploadBtn: {
    paddingVertical: 10,
  },
  uploadText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#ef4444',
  },
  // Footer
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Sheet
  sheetContent: {
    padding: 16,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyOrdersText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  orderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  orderOptionActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
