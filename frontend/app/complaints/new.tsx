import React, { useEffect, useState, useRef } from "react";
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
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Send,
  Package,
  X,
  Check,
  Image as ImageIcon,
  File,
  AlertCircle,
  ChevronDown,
  Paperclip,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { createComplaint } from "@/services/api/complaintsApi";
import { BottomSheet } from "@/components/BottomSheet";
import { orderApi, type Order } from "@/services/api/orderApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const categories = [
  {
    label: "Order Issue",
    value: "order_issue",
    icon: "📦",
    color: Colors.accentOrange,
  },
  {
    label: "Product Quality",
    value: "product_quality",
    icon: "⭐",
    color: Colors.accentYellow,
  },
  {
    label: "Delivery",
    value: "delivery_problem",
    icon: "🚚",
    color: "#3b82f6",
  },
  { label: "Payment", value: "payment_issue", icon: "💳", color: "#8b5cf6" },
  {
    label: "Technical",
    value: "technical_issue",
    icon: "🔧",
    color: Colors.neutralMedium,
  },
  {
    label: "Suggestion",
    value: "suggestion",
    icon: "💡",
    color: Colors.primary900,
  },
  { label: "Other", value: "other", icon: "❓", color: Colors.accentRed },
];

export default function NewComplaintScreen() {
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    description: "",
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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await orderApi.getOrders(undefined, 1, 5);
      setOrders(response.data?.orders || []);
    } catch (err: any) {
      console.error("Failed to load orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const files = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name || `attachment-${Date.now()}`,
        mimeType: asset.mimeType || "application/octet-stream",
      }));

      setAttachments((prev) => [...prev, ...files]);
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.category || !formData.description) {
      setError("Please fill in all required fields");
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
        throw new Error(response.message || "Failed to submit");
      }

      router.replace("/complaints");
    } catch (err: any) {
      setError(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = formData.subject && formData.category && formData.description;

  // Character count helpers
  const subjectCount = formData.subject.length;
  const descriptionCount = formData.description.length;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Request</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* ═══════════════════════════════════════════════════════════════
                CATEGORY SECTION
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Ionicons name="grid" size={16} color={Colors.primary900} />
                <Text style={styles.label}>
                  Category <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = formData.category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, category: cat.value })
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.categoryIconBg,
                          {
                            backgroundColor: isSelected
                              ? cat.color + "20"
                              : Colors.neutralLight,
                          },
                        ]}
                      >
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          isSelected && styles.categoryLabelActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkIcon}>
                          <Check
                            size={10}
                            color={Colors.neutralWhite}
                            strokeWidth={3}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                SUBJECT
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Ionicons name="text" size={16} color={Colors.primary900} />
                <Text style={styles.label}>
                  Subject <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Briefly describe the issue"
                  placeholderTextColor={Colors.neutralMedium}
                  value={formData.subject}
                  onChangeText={(text) =>
                    setFormData({ ...formData, subject: text })
                  }
                  maxLength={100}
                />
              </View>
              <Text style={styles.charCount}>{subjectCount}/100</Text>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                DESCRIPTION
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="document-text"
                  size={16}
                  color={Colors.primary900}
                />
                <Text style={styles.label}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Provide more details about your issue..."
                  placeholderTextColor={Colors.neutralMedium}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
              </View>
              <Text style={styles.charCount}>{descriptionCount}/1000</Text>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                ORDER SELECTION
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Package size={16} color={Colors.primary900} />
                <Text style={styles.label}>
                  Related Order <Text style={styles.optional}>(Optional)</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.orderSelector,
                  selectedOrder && styles.orderSelectorActive,
                ]}
                onPress={() => setShowOrdersSheet(true)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.orderIconBg,
                    {
                      backgroundColor: selectedOrder
                        ? Colors.primary100
                        : Colors.neutralLight,
                    },
                  ]}
                >
                  <Package
                    size={18}
                    color={
                      selectedOrder ? Colors.primary900 : Colors.neutralMedium
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.orderText,
                    selectedOrder && styles.orderTextActive,
                  ]}
                >
                  {selectedOrder
                    ? `Order #${selectedOrder.order_number}`
                    : "Select an order"}
                </Text>
                <ChevronDown size={18} color={Colors.neutralMedium} />
              </TouchableOpacity>
              {selectedOrder && (
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                >
                  <X size={12} color={Colors.accentRed} />
                  <Text style={styles.clearText}>Clear selection</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                ATTACHMENTS
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Paperclip size={16} color={Colors.primary900} />
                <Text style={styles.label}>
                  Attachments <Text style={styles.optional}>(Optional)</Text>
                </Text>
              </View>

              {attachments.length > 0 && (
                <View style={styles.attachmentList}>
                  {attachments.map((file, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      <View
                        style={[
                          styles.attachmentIconBg,
                          {
                            backgroundColor: file.mimeType?.startsWith("image/")
                              ? Colors.primary100
                              : "#eff6ff",
                          },
                        ]}
                      >
                        {file.mimeType?.startsWith("image/") ? (
                          <ImageIcon size={14} color={Colors.primary900} />
                        ) : (
                          <File size={14} color="#3b82f6" />
                        )}
                      </View>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeAttachment(index)}
                        style={styles.attachmentRemove}
                        activeOpacity={0.7}
                      >
                        <X size={14} color={Colors.accentRed} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handlePickAttachments}
                activeOpacity={0.7}
              >
                <View style={styles.uploadIconBg}>
                  <Paperclip size={16} color={Colors.primary900} />
                </View>
                <Text style={styles.uploadText}>Add files</Text>
                <Text style={styles.uploadHint}>PDF or images</Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.accentRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!isValid || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.neutralWhite} />
            ) : (
              <LinearGradient
                colors={
                  isValid
                    ? [Colors.primary700, Colors.primary900]
                    : [Colors.neutralGray, Colors.neutralGray]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Send size={18} color={Colors.neutralWhite} />
                <Text style={styles.submitText}>Submit Request</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ═══════════════════════════════════════════════════════════════════
          ORDERS BOTTOM SHEET
      ═══════════════════════════════════════════════════════════════════ */}
      <BottomSheet
        visible={showOrdersSheet}
        onClose={() => setShowOrdersSheet(false)}
        title="Select Order"
        snapPoints={[0.5]}
      >
        <ScrollView contentContainerStyle={styles.sheetContent}>
          {ordersLoading ? (
            <ActivityIndicator
              color={Colors.primary900}
              style={{ marginTop: Spacing.lg }}
            />
          ) : orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <View style={styles.emptyOrdersIconBg}>
                <Package size={28} color={Colors.neutralGray} />
              </View>
              <Text style={styles.emptyOrdersText}>No recent orders</Text>
            </View>
          ) : (
            orders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderOption,
                    isSelected && styles.orderOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedOrder(order);
                    setShowOrdersSheet(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.orderOptionIconBg,
                      {
                        backgroundColor: isSelected
                          ? Colors.primary100
                          : Colors.neutralLight,
                      },
                    ]}
                  >
                    <Package
                      size={16}
                      color={
                        isSelected ? Colors.primary900 : Colors.neutralMedium
                      }
                    />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>
                      Order #{order.order_number}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.orderCheck}>
                      <Check
                        size={14}
                        color={Colors.neutralWhite}
                        strokeWidth={3}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  flex: {
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  headerRight: {
    width: 44,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════════════════════════════════════════════
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  section: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },
  required: {
    color: Colors.accentRed,
    fontFamily: "Poppins-Bold",
  },
  optional: {
    color: Colors.neutralMedium,
    fontFamily: "Poppins-Regular",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY GRID
  // ═══════════════════════════════════════════════════════════════════════════
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.xs * 2) / 3,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  categoryItemActive: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary100,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  categoryLabelActive: {
    color: Colors.primary900,
    fontFamily: "Poppins-SemiBold",
  },
  checkIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary900,
    justifyContent: "center",
    alignItems: "center",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════════════════════
  inputWrapper: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neutralLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
    textAlign: "right",
    marginTop: 4,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER SELECTOR
  // ═══════════════════════════════════════════════════════════════════════════
  orderSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.neutralLight,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  orderSelectorActive: {
    borderColor: Colors.primary900 + "40",
  },
  orderIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    flex: 1,
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
  },
  orderTextActive: {
    color: Colors.neutralCharcoal,
    fontFamily: "Poppins-SemiBold",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  clearText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-Medium",
    color: Colors.accentRed,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  attachmentList: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    padding: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  attachmentIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: {
    flex: 1,
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralCharcoal,
  },
  attachmentRemove: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.accentRed + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.neutralLight,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  uploadIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },
  uploadHint: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    flex: 1,
    textAlign: "right",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentRed + "10",
    borderRadius: 12,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accentRed + "20",
  },
  errorText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-Medium",
    color: Colors.accentRed,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  footer: {
    padding: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? Spacing.xs : Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: Spacing.xs,
  },
  submitText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOTTOM SHEET
  // ═══════════════════════════════════════════════════════════════════════════
  sheetContent: {
    padding: Spacing.md,
  },
  emptyOrders: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyOrdersIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyOrdersText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  orderOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 14,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  orderOptionActive: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary900 + "30",
  },
  orderOptionIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },
  orderDate: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  orderCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },
});
