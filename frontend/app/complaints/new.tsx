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
import { ArrowLeft, FileText, Send, Paperclip, ChevronDown, Package, X, Check, Image as ImageIcon, File, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';
import { createComplaint } from '@/services/api/complaintsApi';
import { BottomSheet } from '@/components/BottomSheet';
import { orderApi, type Order } from '@/services/api/orderApi';

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

  // Load orders only when needed or in background
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
          title: 'New Request',
          headerTitleStyle: { fontFamily: 'Poppins-SemiBold', fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
          headerBackground: () => <View style={{ flex: 1, backgroundColor: Colors.neutralCloud }} />,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What can we help you with? *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryCard,
                      formData.category === cat.value && styles.categoryCardActive
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      formData.category === cat.value && styles.categoryLabelActive
                    ]}>
                      {cat.label}
                    </Text>
                    {formData.category === cat.value && (
                      <View style={styles.checkBadge}>
                        <Check size={10} color={Colors.neutralWhite} strokeWidth={4} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>Subject *</Text>
              <TextInput
                style={styles.input}
                placeholder="Briefly describe the issue"
                placeholderTextColor={Colors.neutralMedium}
                value={formData.subject}
                onChangeText={(text) => setFormData({ ...formData, subject: text })}
              />
            </View>

            {/* Order Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Related Order (Optional)</Text>
              <TouchableOpacity
                style={styles.orderSelector}
                onPress={() => setShowOrdersSheet(true)}
              >
                <View style={styles.orderSelectorContent}>
                  <View style={styles.iconBox}>
                    <Package size={20} color={Colors.primary900} />
                  </View>
                  {selectedOrder ? (
                    <View>
                      <Text style={styles.selectedOrderText}>Order #{selectedOrder.order_number}</Text>
                      <Text style={styles.selectedOrderSub}>
                        {new Date(selectedOrder.created_at).toLocaleDateString()} • {selectedOrder.status_label || selectedOrder.status}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.placeholderText}>Select an order</Text>
                      <Text style={styles.subText}>Link this request to a recent purchase</Text>
                    </View>
                  )}
                </View>
                <ChevronDown size={20} color={Colors.neutralMedium} />
              </TouchableOpacity>
              {selectedOrder && (
                <TouchableOpacity
                  style={styles.clearOrderBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Text style={styles.clearOrderText}>Clear selection</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Details *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Please provide as much detail as possible..."
                placeholderTextColor={Colors.neutralMedium}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Attachments */}
            <View style={styles.section}>
              <View style={styles.attachmentHeader}>
                <Text style={styles.label}>Attachments</Text>
                <TouchableOpacity onPress={handlePickAttachments}>
                  <Text style={styles.addText}>+ Add Files</Text>
                </TouchableOpacity>
              </View>

              {attachments.length === 0 ? (
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={handlePickAttachments}
                >
                  <Paperclip size={24} color={Colors.neutralMedium} />
                  <Text style={styles.uploadText}>Tap to upload photos or documents</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.attachmentGrid}>
                  {attachments.map((file, index) => {
                    const isImage = file.mimeType?.startsWith('image/');
                    return (
                      <View key={index} style={styles.attachmentItem}>
                        <View style={styles.attachmentIcon}>
                          {isImage ? (
                            <ImageIcon size={20} color={Colors.primary900} />
                          ) : (
                            <File size={20} color={Colors.primary900} />
                          )}
                        </View>
                        <View style={styles.attachmentInfo}>
                          <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                          <Text style={styles.attachmentSize}>
                            {isImage ? 'Image' : 'Document'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => removeAttachment(index)}
                        >
                          <X size={16} color={Colors.neutralMedium} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.addMoreBtn}
                    onPress={handlePickAttachments}
                  >
                    <Text style={styles.addMoreText}>+ Add another</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.accentRed} />
                <Text style={styles.errorMsg}>{error}</Text>
              </View>
            )}

            <View style={styles.footerSpacing} />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={submitting ? 'Submitting...' : 'Submit Request'}
              onPress={handleSubmit}
              icon={<Send size={20} color={Colors.neutralWhite} />}
              variant="primary"
              disabled={submitting}
              style={styles.submitBtn}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        visible={showOrdersSheet}
        onClose={() => setShowOrdersSheet(false)}
        title="Select Related Order"
        snapPoints={[0.6]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {ordersLoading ? (
            <ActivityIndicator color={Colors.primary900} style={{ marginTop: 20 }} />
          ) : orders.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: Colors.neutralMedium }}>No recent orders found</Text>
            </View>
          ) : (
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.sheetOption}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowOrdersSheet(false);
                }}
              >
                <View style={styles.sheetIcon}>
                  <Package size={20} color={Colors.primary900} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Order #{order.order_number}</Text>
                  <Text style={styles.sheetSub}>
                    {new Date(order.created_at).toLocaleDateString()} • {Number(order.total).toFixed(2)} EGP
                  </Text>
                </View>
                {selectedOrder?.id === order.id && (
                  <Check size={20} color={Colors.primary900} />
                )}
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
    backgroundColor: Colors.neutralCloud,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutralCharcoal,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutralCharcoal,
    marginBottom: 8,
  },
  // Categories
  categoriesRow: {
    paddingRight: 16,
    paddingBottom: 4,
  },
  categoryCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCardActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutralCharcoal,
  },
  categoryLabelActive: {
    color: Colors.neutralWhite,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 2,
  },
  // Inputs
  input: {
    backgroundColor: Colors.neutralWhite,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.neutralCharcoal,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  // Order Selector
  orderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutralWhite,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 12,
    padding: 12,
  },
  orderSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary900}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOrderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutralCharcoal,
  },
  selectedOrderSub: {
    fontSize: 12,
    color: Colors.neutralMedium,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.neutralCharcoal,
  },
  subText: {
    fontSize: 12,
    color: Colors.neutralMedium,
  },
  clearOrderBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  clearOrderText: {
    fontSize: 12,
    color: Colors.accentRed,
  },
  // Attachments
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary900,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.neutralGray}20`,
  },
  uploadText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.neutralMedium,
  },
  attachmentGrid: {
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  attachmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${Colors.primary900}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutralCharcoal,
  },
  attachmentSize: {
    fontSize: 11,
    color: Colors.neutralMedium,
  },
  removeBtn: {
    padding: 8,
  },
  addMoreBtn: {
    alignItems: 'center',
    padding: 8,
  },
  addMoreText: {
    fontSize: 13,
    color: Colors.primary900,
    fontWeight: '500',
  },
  // Error & Footer
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  errorMsg: {
    color: Colors.accentRed,
    fontSize: 13,
  },
  footerSpacing: {
    height: 80,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.neutralWhite,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralGray,
  },
  submitBtn: {
    borderRadius: 14,
    height: 52,
  },
  // Sheet
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary900}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutralCharcoal,
  },
  sheetSub: {
    fontSize: 13,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
});
