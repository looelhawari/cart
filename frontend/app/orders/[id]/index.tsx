import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Share,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Package, Clock } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useResponsive } from "@/hooks/useResponsive";

import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import {
  getOrder,
  cancelOrder as cancelOrderApi,
  checkCancellationEligibility,
  getCancellationReasons,
  partialItemCancel,
  getInvoiceDownloadUrl,
  emailInvoice,
  Order,
  CancellationEligibility,
  CancellationReason,
} from "@/services/api/orderApi";
import { getAuthToken } from "@/services/api/base";
import { createReview, rateDriver } from "@/services/api/reviewsApi";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";
import { Toast } from "@/components/Toast";

/** Safely format a number to 2 decimal places, never crashes */
const safePrice = (val: any): string => {
  const n = typeof val === "number" ? val : parseFloat(String(val ?? "0"));
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

export default function OrderDetailsScreen() {
  const { isSmallDevice } = useResponsive();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelEligibility, setCancelEligibility] =
    useState<CancellationEligibility | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);
  const [showRefundResult, setShowRefundResult] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<
    CancellationReason[]
  >([]);
  const [selectedReasonKey, setSelectedReasonKey] = useState<string>("");
  const [showPartialCancelDialog, setShowPartialCancelDialog] = useState(false);
  const [selectedItemsForCancel, setSelectedItemsForCancel] = useState<
    number[]
  >([]);
  const [partialCancelling, setPartialCancelling] = useState(false);

  // Rating state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState<number[]>([]);

  // Driver rating state
  const [showDriverRatingModal, setShowDriverRatingModal] = useState(false);
  const [driverRating, setDriverRating] = useState(0);
  const [driverReviewComment, setDriverReviewComment] = useState("");
  const [submittingDriverReview, setSubmittingDriverReview] = useState(false);
  const [driverRated, setDriverRated] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success",
  );

  // Order actions menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [emailingInvoice, setEmailingInvoice] = useState(false);
  const [sharingOrder, setSharingOrder] = useState(false);

  // Create responsive styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralCloud,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.md,
    },
    loadingText: {
      fontSize: Typography.bodyBase,
      color: Colors.neutralMedium,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.md,
    },
    emptyTitle: {
      fontSize: Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    backButton: {
      backgroundColor: Colors.primary900,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: 16,
      marginTop: Spacing.md,
    },
    backButtonText: {
      fontSize: Typography.bodyBase,
      fontWeight: Typography.bold,
      color: Colors.neutralWhite,
    },
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
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: Colors.neutralCloud,
    },
    headerTitle: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    content: {
      flex: 1,
    },
    orderHeader: {
      backgroundColor: Colors.neutralWhite,
      marginHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      marginTop: Spacing.md,
      borderRadius: 20,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    orderHeaderTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: Spacing.md,
    },
    orderNumberContainer: {
      flex: 1,
    },
    orderNumberLabel: {
      fontSize: Typography.bodySmall,
      color: Colors.neutralMedium,
      marginBottom: 4,
    },
    orderNumber: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      paddingHorizontal: isSmallDevice ? Spacing.sm : Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: isSmallDevice ? 16 : 20,
    },
    statusText: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      fontWeight: Typography.semibold,
    },
    orderDate: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
    },
    orderMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    orderMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    orderMetaText: {
      fontSize: Typography.bodySmall,
      color: Colors.neutralMedium,
    },
    progressSection: {
      marginTop: Spacing.sm,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.neutralLight,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: Colors.neutralLight,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: Colors.primary700,
      borderRadius: 3,
    },
    progressSteps: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: Spacing.sm,
    },
    progressStep: {
      alignItems: "center",
      gap: 4,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    progressStepText: {
      fontSize: 10,
      color: Colors.neutralMedium,
    },
    lastUpdatedText: {
      fontSize: 10,
      color: Colors.neutralGray,
      marginTop: Spacing.sm,
      textAlign: "center",
    },
    section: {
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      marginTop: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    sectionTitle: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h4,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.md,
      letterSpacing: 0.2,
    },
    timeline: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    timelineItem: {
      flexDirection: "row",
    },
    timelineIconContainer: {
      alignItems: "center",
      marginRight: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    timelineDot: {
      width: isSmallDevice ? 10 : 12,
      height: isSmallDevice ? 10 : 12,
      borderRadius: isSmallDevice ? 5 : 6,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: Colors.neutralGray,
      marginVertical: Spacing.xs,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    timelineStatus: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.semibold,
      color: Colors.neutralCharcoal,
      textTransform: "capitalize",
    },
    timelineDate: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      marginTop: 2,
    },
    timelineNotes: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      marginTop: Spacing.xs,
      fontStyle: "italic",
    },
    infoCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    infoRow: {
      flexDirection: "row",
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      alignItems: "flex-start",
    },
    infoTextContainer: {
      flex: 1,
    },
    infoLabel: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      marginBottom: Spacing.xs,
    },
    infoValue: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralCharcoal,
      lineHeight: isSmallDevice ? 18 : 20,
    },
    paymentStatus: {
      fontSize: Typography.bodySmall,
      color: Colors.neutralMedium,
      marginTop: Spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.neutralGray,
      marginVertical: Spacing.md,
    },
    itemsContainer: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    orderItem: {
      flexDirection: "row",
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      paddingBottom: isSmallDevice ? Spacing.sm : Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    itemImage: {
      width: isSmallDevice ? 50 : 60,
      height: isSmallDevice ? 50 : 60,
      borderRadius: 8,
      backgroundColor: Colors.neutralGray,
    },
    itemInfo: {
      flex: 1,
      justifyContent: "center",
    },
    itemName: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.semibold,
      color: Colors.neutralCharcoal,
      marginBottom: 4,
    },
    itemQuantity: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
    },
    itemSku: {
      fontSize: isSmallDevice ? 10 : Typography.bodySmall,
      color: Colors.neutralGray,
      marginTop: 2,
    },
    itemPrice: {
      fontSize: isSmallDevice ? Typography.bodyBase : Typography.bodyLarge,
      fontWeight: Typography.bold,
      color: Colors.primary900,
      alignSelf: "center",
    },
    summaryCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.sm,
    },
    summaryLabel: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralMedium,
    },
    summaryValue: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralCharcoal,
    },
    discountLabel: {
      color: Colors.accentRed,
    },
    discountValue: {
      color: Colors.accentRed,
    },
    promoRow: {
      marginBottom: Spacing.sm,
    },
    promoLabel: {
      fontSize: Typography.bodySmall,
      color: Colors.primary700,
      fontWeight: Typography.semibold,
    },
    totalLabel: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h4,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    totalValue: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.primary900,
    },
    footer: {
      flexDirection: isSmallDevice ? "column" : "row",
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      backgroundColor: Colors.neutralWhite,
      borderTopWidth: 1,
      borderTopColor: Colors.neutralGray,
    },
    reorderButton: {
      flex: isSmallDevice ? undefined : 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      backgroundColor: Colors.neutralWhite,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: isSmallDevice ? 12 : 16,
      borderWidth: 2,
      borderColor: Colors.primary900,
    },
    reorderText: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.bold,
      color: Colors.primary900,
    },
    cancelButton: {
      flex: isSmallDevice ? undefined : 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      backgroundColor: Colors.neutralWhite,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: isSmallDevice ? 12 : 16,
      borderWidth: 2,
      borderColor: Colors.accentRed,
      minHeight: 48,
    },
    cancelText: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.bold,
      color: Colors.accentRed,
      flexShrink: 0,
    },
    modalOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    modalContent: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 16 : 24,
      padding: isSmallDevice ? Spacing.lg : Spacing.xl,
      width: "100%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.sm,
    },
    modalMessage: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralMedium,
      marginBottom: Spacing.md,
    },
    modalInput: {
      backgroundColor: Colors.neutralCloud,
      borderRadius: 12,
      padding: Spacing.md,
      fontSize: Typography.bodyBase,
      color: Colors.neutralCharcoal,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: Spacing.lg,
    },
    modalButtons: {
      flexDirection: "row",
      gap: Spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    modalButtonSecondary: {
      backgroundColor: Colors.neutralCloud,
    },
    modalButtonPrimary: {
      backgroundColor: Colors.accentRed,
    },
    modalButtonTextSecondary: {
      fontSize: Typography.bodyBase,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    modalButtonTextPrimary: {
      fontSize: Typography.bodyBase,
      fontWeight: Typography.bold,
      color: Colors.neutralWhite,
    },
  });

  const fetchOrderDetails = useCallback(
    async (silent: boolean = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const response = await getOrder(Number(id));
        const newOrder = response.data.order;

        // Check if driver was already rated
        if (newOrder.driver_rating) {
          setDriverRated(true);
        }

        // Check if status changed
        setOrder((prevOrder) => {
          if (prevOrder && newOrder.status !== prevOrder.status) {
            console.log(
              "ðŸ“¦ [ORDER] Status changed:",
              prevOrder.status,
              "->",
              newOrder.status,
            );
          }
          return newOrder;
        });
        setLastUpdated(new Date());
      } catch (error: any) {
        if (!silent) {
          Alert.alert("Error", error.message || "Failed to load order details");
          router.back();
        } else {
          console.error("Failed to refresh order:", error);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [id],
  );

  const handleOpenCancelDialog = async () => {
    setCheckingEligibility(true);
    try {
      const [eligibility, reasons] = await Promise.all([
        checkCancellationEligibility(Number(id)),
        getCancellationReasons(),
      ]);
      setCancelEligibility(eligibility);
      setCancellationReasons(reasons);
      if (!eligibility.can_cancel) {
        setToastMessage(eligibility.reason);
        setToastType("error");
        setToastVisible(true);
        return;
      }
      setShowCancelDialog(true);
    } catch (error: any) {
      setToastMessage(
        error.message || "Failed to check cancellation eligibility",
      );
      setToastType("error");
      setToastVisible(true);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleCancelOrder = async () => {
    // Build reason from selected predefined reason + optional custom text
    const selectedReason = cancellationReasons.find(
      (r) => r.key === selectedReasonKey,
    );
    const reasonText = selectedReason
      ? cancelReason.trim()
        ? `${selectedReason.label_en}: ${cancelReason.trim()}`
        : selectedReason.label_en
      : cancelReason.trim() || "Cancelled by user";

    setCancelling(true);
    try {
      const result = await cancelOrderApi(Number(id), reasonText);
      setShowCancelDialog(false);
      setCancelReason("");
      setSelectedReasonKey("");

      if (result.data?.refund) {
        setRefundResult(result.data.refund);
        setShowRefundResult(true);
      }

      setToastMessage(result.message || "Order cancelled successfully");
      setToastType("success");
      setToastVisible(true);
      fetchOrderDetails(); // Refresh order
    } catch (error: any) {
      setToastMessage(error.message || "Failed to cancel order");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setCancelling(false);
    }
  };

  const handlePartialItemCancel = async () => {
    if (selectedItemsForCancel.length === 0) {
      setToastMessage("Please select at least one item to cancel");
      setToastType("error");
      setToastVisible(true);
      return;
    }

    const selectedReason = cancellationReasons.find(
      (r) => r.key === selectedReasonKey,
    );
    const reasonText = selectedReason
      ? cancelReason.trim()
        ? `${selectedReason.label_en}: ${cancelReason.trim()}`
        : selectedReason.label_en
      : cancelReason.trim() || "Item no longer needed";

    setPartialCancelling(true);
    try {
      const result = await partialItemCancel(
        Number(id),
        selectedItemsForCancel,
        reasonText,
      );
      setShowPartialCancelDialog(false);
      setSelectedItemsForCancel([]);
      setCancelReason("");
      setSelectedReasonKey("");

      if (result.refund) {
        // Normalize partial refund shape to match full cancel refund shape
        setRefundResult({
          ...result.refund,
          refund_amount:
            result.refund.refund_amount ?? result.refund.amount ?? 0,
          penalty_amount: result.refund.penalty_amount ?? 0,
          penalty_percent: result.refund.penalty_percent ?? 0,
          estimated_days: result.refund.estimated_days ?? "3-5 business days",
        });
        setShowRefundResult(true);
      }

      setToastMessage(result.message || "Items cancelled successfully");
      setToastType("success");
      setToastVisible(true);
      fetchOrderDetails();
    } catch (error: any) {
      setToastMessage(error.message || "Failed to cancel items");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setPartialCancelling(false);
    }
  };

  const toggleItemForCancel = (itemId: number) => {
    setSelectedItemsForCancel((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleOpenRating = (product: any) => {
    setSelectedProduct(product);
    setRating(0);
    setReviewComment("");
    setShowRatingModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedProduct || rating === 0) {
      setToastMessage("Please select a rating");
      setToastType("error");
      setToastVisible(true);
      return;
    }

    setSubmittingReview(true);
    try {
      await createReview({
        product_id: selectedProduct.product_id,
        order_id: Number(id),
        rating: rating,
        comment: reviewComment.trim() || "Great product!",
      });

      setToastMessage("Thank you for your review!");
      setToastType("success");
      setToastVisible(true);
      setReviewedProducts((prev) => [...prev, selectedProduct.product_id]);
      setShowRatingModal(false);
      setSelectedProduct(null);
      setRating(0);
      setReviewComment("");
    } catch (error: any) {
      console.error("Review submission error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit review";
      setToastMessage(errorMessage);
      setToastType("error");
      setToastVisible(true);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitDriverReview = async () => {
    if (driverRating === 0) {
      setToastMessage("Please select a rating");
      setToastType("error");
      setToastVisible(true);
      return;
    }

    setSubmittingDriverReview(true);
    try {
      await rateDriver(Number(id), {
        rating: driverRating,
        comment: driverReviewComment.trim() || undefined,
      });

      setToastMessage("Thank you for rating the driver!");
      setToastType("success");
      setToastVisible(true);
      setDriverRated(true);
      setShowDriverRatingModal(false);
      setDriverRating(0);
      setDriverReviewComment("");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit driver rating";
      setToastMessage(errorMessage);
      setToastType("error");
      setToastVisible(true);
    } finally {
      setSubmittingDriverReview(false);
    }
  };

  /** Download invoice PDF in background and open with system viewer */
  const handleDownloadInvoice = async () => {
    setShowActionsMenu(false);
    setDownloadingInvoice(true);
    try {
      const downloadUrl = getInvoiceDownloadUrl(Number(id));
      const token = await getAuthToken();
      const filename = `Invoice-Order-${id}.pdf`;
      const destination = new FileSystem.File(FileSystem.Paths.cache, filename);

      // Stream PDF directly to disk with auth headers
      const downloadedFile = await FileSystem.File.downloadFileAsync(
        downloadUrl,
        destination,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "application/pdf",
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "CART-Mobile-App",
          },
          idempotent: true, // overwrite if file already exists
        },
      );

      // Open the downloaded PDF with the system viewer
      const openUri =
        Platform.OS === "android"
          ? downloadedFile.contentUri // content:// URI works on Android
          : downloadedFile.uri; // file:// URI works on iOS
      await Linking.openURL(openUri);
    } catch (error: any) {
      setToastMessage(error.message || "Failed to download invoice");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  /** Email invoice PDF to the customer's registered email */
  const handleEmailInvoice = async () => {
    setShowActionsMenu(false);
    setEmailingInvoice(true);
    try {
      const result = await emailInvoice(Number(id));
      setToastMessage(result.message || "Invoice sent to your email");
      setToastType("success");
      setToastVisible(true);
    } catch (error: any) {
      setToastMessage(error.message || "Failed to send invoice email");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setEmailingInvoice(false);
    }
  };

  /** Share order info via OS share sheet */
  const handleShareOrder = async () => {
    setShowActionsMenu(false);
    setSharingOrder(true);
    try {
      const shareText = `Order #${order?.order_number}\nTotal: ${safePrice(order?.total)} EGP\nStatus: ${order?.status_label || order?.status}`;
      const result = await Share.share(
        {
          title: `Order #${order?.order_number}`,
          message: shareText,
        },
        { dialogTitle: "Share Order" },
      );
      if (result.action === Share.dismissedAction) return;
    } catch (error: any) {
      setToastMessage(error.message || "Failed to share order");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setSharingOrder(false);
    }
  };

  /** Helper: whether invoice/order actions should show */
  const canShowInvoice = (status: string) => {
    return [
      "delivered",
      "cancelled",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "shipped",
    ].includes(status);
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case "pending":
      case "processing":
        return "time-outline";
      case "confirmed":
      case "preparing":
        return "cube-outline";
      case "out_for_delivery":
      case "shipped":
        return "car-outline";
      case "delivered":
        return "checkmark-circle-outline";
      case "cancelled":
      case "failed":
        return "close-circle-outline";
      default:
        return "cube-outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return Colors.accentOrange;
      case "confirmed":
      case "preparing":
        return Colors.primary700;
      case "out_for_delivery":
      case "shipped":
        return Colors.primary900;
      case "delivered":
        return Colors.primary700;
      case "cancelled":
      case "failed":
        return Colors.accentRed;
      default:
        return Colors.neutralMedium;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "pending":
        return 15;
      case "processing":
        return 30;
      case "confirmed":
        return 45;
      case "preparing":
        return 55;
      case "shipped":
      case "out_for_delivery":
        return 75;
      case "delivered":
        return 100;
      default:
        return 0;
    }
  };

  const canCancelOrder = (status: string) => {
    // Show cancel button for all statuses where cancellation MIGHT be possible.
    // Actual eligibility is verified server-side via /can-cancel endpoint.
    return ["pending", "pending_payment", "confirmed", "preparing"].includes(
      status,
    );
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetails();

      // Set up polling to refresh order status every 30 seconds
      const pollInterval = setInterval(() => {
        fetchOrderDetails(true); // Silent refresh
      }, 30000); // 30 seconds

      // Cleanup interval on unmount
      return () => clearInterval(pollInterval);
    }
  }, [id, fetchOrderDetails]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={{ padding: Spacing.lg }}>
          {/* Header Skeleton */}
          <View style={{ marginBottom: Spacing.lg }}>
            <SkeletonLoader width={150} height={28} borderRadius={8} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width={200} height={20} borderRadius={6} />
          </View>

          {/* Status Card Skeleton */}
          <View
            style={{
              backgroundColor: Colors.neutralWhite,
              borderRadius: 12,
              padding: Spacing.md,
              marginBottom: Spacing.lg,
            }}
          >
            <SkeletonLoader width={120} height={24} borderRadius={6} />
            <View style={{ height: 12 }} />
            <SkeletonLoader width="80%" height={16} borderRadius={4} />
          </View>

          {/* Items Skeleton */}
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                marginBottom: Spacing.md,
                backgroundColor: Colors.neutralWhite,
                borderRadius: 12,
                padding: Spacing.md,
              }}
            >
              <SkeletonLoader width={80} height={80} borderRadius={8} />
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <SkeletonLoader width="70%" height={18} borderRadius={4} />
                <View style={{ height: 8 }} />
                <SkeletonLoader width="40%" height={16} borderRadius={4} />
                <View style={{ height: 8 }} />
                <SkeletonLoader width="30%" height={20} borderRadius={6} />
              </View>
            </View>
          ))}

          {/* Summary Skeleton */}
          <View
            style={{
              backgroundColor: Colors.neutralWhite,
              borderRadius: 12,
              padding: Spacing.md,
            }}
          >
            <SkeletonLoader width={100} height={20} borderRadius={6} />
            <View style={{ height: 12 }} />
            {[1, 2, 3, 4].map((i) => (
              <View key={i}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <SkeletonLoader width={100} height={16} borderRadius={4} />
                  <SkeletonLoader width={60} height={16} borderRadius={4} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Package size={80} color={Colors.neutralGray} />
          <Text style={styles.emptyTitle}>Order Not Found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusIconName = getStatusIcon(order.status);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        {order && canShowInvoice(order.status) ? (
          <TouchableOpacity
            onPress={() => setShowActionsMenu(true)}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={Colors.neutralCharcoal}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Header Card */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderTop}>
            <View style={styles.orderNumberContainer}>
              <Text style={styles.orderNumberLabel}>Order Number</Text>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
            </View>
            <LinearGradient
              colors={[
                getStatusColor(order.status) + "30",
                getStatusColor(order.status) + "10",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statusBadge]}
            >
              <Ionicons
                name={statusIconName as any}
                size={16}
                color={getStatusColor(order.status)}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(order.status) },
                ]}
              >
                {order.status_label}
              </Text>
            </LinearGradient>
          </View>

          {/* Order Meta Info */}
          <View style={styles.orderMetaRow}>
            <View style={styles.orderMetaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={Colors.neutralMedium}
              />
              <Text style={styles.orderMetaText}>
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.orderMetaItem}>
              <Clock size={14} color={Colors.neutralMedium} />
              <Text style={styles.orderMetaText}>
                {new Date(order.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View style={styles.orderMetaItem}>
              <Ionicons
                name="cart-outline"
                size={14}
                color={Colors.neutralMedium}
              />
              <Text style={styles.orderMetaText}>
                {order.items?.length || 0} items
              </Text>
            </View>
          </View>

          {/* Progress Bar for Active Orders */}
          {!["cancelled", "failed", "delivered"].includes(order.status) && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${getProgressPercentage(order.status)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressSteps}>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      { backgroundColor: Colors.primary700 },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Ordered</Text>
                </View>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getProgressPercentage(order.status) >= 40
                            ? Colors.primary700
                            : Colors.neutralLight,
                      },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Processing</Text>
                </View>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getProgressPercentage(order.status) >= 70
                            ? Colors.primary700
                            : Colors.neutralLight,
                      },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Shipping</Text>
                </View>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getProgressPercentage(order.status) >= 100
                            ? Colors.primary700
                            : Colors.neutralLight,
                      },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Delivered</Text>
                </View>
              </View>
            </View>
          )}

          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>

        {/* Rating Banner for Delivered Orders */}
        {order.status === "delivered" && (
          <View
            style={{
              backgroundColor: Colors.accentYellow + "15",
              marginHorizontal: Spacing.md,
              marginTop: Spacing.md,
              padding: Spacing.md,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: Colors.accentYellow + "40",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="star" size={24} color={Colors.accentOrange} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: Colors.neutralCharcoal,
                  marginLeft: 8,
                }}
              >
                Rate Your Order
              </Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: Colors.neutralMedium,
                marginBottom: 12,
              }}
            >
              How was your experience? Tap on any product below to leave a
              review.
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name="star-outline"
                  size={28}
                  color={Colors.accentYellow}
                />
              ))}
            </View>
          </View>
        )}

        {/* Rate Driver Banner for Delivered Orders */}
        {order.status === "delivered" && order.driver_id && !driverRated && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowDriverRatingModal(true)}
            style={{
              backgroundColor: "#eff6ff",
              marginHorizontal: Spacing.md,
              marginTop: Spacing.md,
              padding: Spacing.md,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#bfdbfe",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="car-outline" size={24} color="#3b82f6" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: Colors.neutralCharcoal,
                  marginLeft: 8,
                  flex: 1,
                }}
              >
                Rate Your Driver
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
            </View>
            <Text
              style={{
                fontSize: 13,
                color: Colors.neutralMedium,
              }}
            >
              {order.driver
                ? `How was your delivery by ${order.driver.first_name}? Tap to rate.`
                : "How was your delivery experience? Tap to rate."}
            </Text>
          </TouchableOpacity>
        )}

        {/* Driver Already Rated Badge */}
        {order.status === "delivered" && driverRated && (
          <View
            style={{
              backgroundColor: "#f0fdf4",
              marginHorizontal: Spacing.md,
              marginTop: Spacing.md,
              padding: Spacing.md,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#bbf7d0",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={{ fontSize: 14, color: "#16a34a", fontWeight: "600" }}>
              Driver rated — thank you!
            </Text>
          </View>
        )}

        {/* Status History Timeline */}
        {order.status_history && order.status_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            <View style={styles.timeline}>
              {order.status_history.map((history, index) => (
                <View key={history.id} style={styles.timelineItem}>
                  <View style={styles.timelineIconContainer}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: getStatusColor(history.status) },
                      ]}
                    />
                    {index < order.status_history!.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{history.status}</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(history.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </Text>
                    {history.notes && (
                      <Text style={styles.timelineNotes}>{history.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={20}
                color={Colors.primary900}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Delivery Address</Text>
                {order.delivery_address && (
                  <View>
                    <Text
                      style={[
                        styles.infoValue,
                        { fontWeight: Typography.semibold },
                      ]}
                    >
                      {order.delivery_address.label}
                    </Text>
                    <Text style={styles.infoValue}>
                      {order.delivery_address.street}
                    </Text>
                    {(order.delivery_address.building ||
                      order.delivery_address.floor ||
                      order.delivery_address.apartment) && (
                        <Text style={styles.infoValue}>
                          {order.delivery_address.building
                            ? `Bldg ${order.delivery_address.building}`
                            : ""}
                          {order.delivery_address.floor
                            ? `${order.delivery_address.building ? ", " : ""}Floor ${order.delivery_address.floor}`
                            : ""}
                          {order.delivery_address.apartment
                            ? `${order.delivery_address.building || order.delivery_address.floor ? ", " : ""}Apt ${order.delivery_address.apartment}`
                            : ""}
                        </Text>
                      )}
                    <Text style={styles.infoValue}>
                      {order.delivery_address.city}
                      {order.delivery_address.area
                        ? `, ${order.delivery_address.area}`
                        : ""}
                    </Text>
                    {order.delivery_address.landmark && (
                      <Text
                        style={[
                          styles.infoValue,
                          { fontStyle: "italic", color: Colors.neutralMedium },
                        ]}
                      >
                        Near: {order.delivery_address.landmark}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Clock size={20} color={Colors.primary900} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Delivery Schedule</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.delivery_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.infoValue}>{order.delivery_time_slot}</Text>
              </View>
            </View>
            {order.delivery_notes && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Package size={20} color={Colors.primary900} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Delivery Notes</Text>
                    <Text style={styles.infoValue}>{order.delivery_notes}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              {order.payment_method === "cod" ||
                order.payment_method === "cash_on_delivery" ? (
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={Colors.primary900}
                />
              ) : (
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={Colors.primary900}
                />
              )}
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoValue}>
                  {order.payment_method === "cod" ||
                    order.payment_method === "cash_on_delivery"
                    ? "Cash on Delivery"
                    : order.payment_method === "wallet"
                      ? "Wallet Payment"
                      : order.payment_method === "wallet+card"
                        ? "Wallet + Card Payment"
                        : "Card Payment"}
                </Text>
                <Text
                  style={[
                    styles.paymentStatus,
                    order.payment_status === "refunded" && {
                      color: Colors.accentOrange,
                      fontWeight: Typography.semibold,
                    },
                  ]}
                >
                  Status:{" "}
                  {order.payment_status.charAt(0).toUpperCase() +
                    order.payment_status.slice(1)}
                </Text>
                {order.payment_status === "refunded" && (
                  <Text
                    style={{
                      fontSize: isSmallDevice ? 10 : Typography.bodySmall,
                      color: Colors.accentOrange,
                      marginTop: Spacing.xs,
                      fontStyle: "italic",
                    }}
                  >
                    Your payment has been refunded to your original payment
                    method
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: Spacing.md,
            }}
          >
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items &&
              (() => {
                const refundedCount = order.items.filter(
                  (i: any) => i.refunded,
                ).length;
                if (refundedCount > 0) {
                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: Colors.accentOrange + "15",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name="information-circle"
                        size={14}
                        color={Colors.accentOrange}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: Colors.accentOrange,
                        }}
                      >
                        {refundedCount} of {order.items.length} refunded
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
          </View>
          <View style={styles.itemsContainer}>
            {order.items?.map((item) => {
              const isRefunded = !!(item as any).refunded;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.orderItem,
                    isRefunded && {
                      backgroundColor: "#FEF2F2",
                      borderBottomColor: "#FECACA",
                      borderRadius: 12,
                      padding: Spacing.sm,
                      marginBottom: 4,
                    },
                  ]}
                >
                  {item.product?.image && (
                    <Image
                      source={{ uri: item.product.image }}
                      style={[styles.itemImage, isRefunded && { opacity: 0.5 }]}
                    />
                  )}
                  <View style={styles.itemInfo}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={[
                          styles.itemName,
                          isRefunded && {
                            textDecorationLine: "line-through",
                            color: Colors.neutralMedium,
                          },
                        ]}
                      >
                        {item.product_name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.itemQuantity,
                        isRefunded && { color: Colors.neutralGray },
                      ]}
                    >
                      Qty: {item.quantity}
                    </Text>
                    {item.product_sku ? (
                      <Text
                        style={[
                          styles.itemSku,
                          isRefunded && { color: Colors.neutralGray },
                        ]}
                      >
                        SKU: {item.product_sku}
                      </Text>
                    ) : null}

                    {/* Refunded Badge */}
                    {isRefunded && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#FEE2E2",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          marginTop: 6,
                          alignSelf: "flex-start",
                          gap: 4,
                          borderWidth: 1,
                          borderColor: "#FECACA",
                        }}
                      >
                        <Ionicons
                          name="return-down-back"
                          size={12}
                          color="#DC2626"
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#DC2626",
                          }}
                        >
                          Refunded
                        </Text>
                      </View>
                    )}

                    {/* Rate button for delivered orders - only non-refunded */}
                    {!isRefunded &&
                      order.status === "delivered" &&
                      !reviewedProducts.includes(item.product_id) && (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: Colors.primary100,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 12,
                            marginTop: 6,
                            alignSelf: "flex-start",
                            gap: 4,
                          }}
                          onPress={() => handleOpenRating(item)}
                        >
                          <Ionicons
                            name="star-outline"
                            size={14}
                            color={Colors.primary900}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: Colors.primary900,
                            }}
                          >
                            Rate
                          </Text>
                        </TouchableOpacity>
                      )}
                    {!isRefunded &&
                      reviewedProducts.includes(item.product_id) && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 6,
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={Colors.primary700}
                          />
                          <Text
                            style={{ fontSize: 12, color: Colors.primary700 }}
                          >
                            Reviewed
                          </Text>
                        </View>
                      )}
                  </View>
                  <View
                    style={{ alignItems: "flex-end", justifyContent: "center" }}
                  >
                    <Text
                      style={[
                        styles.itemPrice,
                        isRefunded && {
                          textDecorationLine: "line-through",
                          color: Colors.neutralGray,
                          fontSize: isSmallDevice
                            ? Typography.bodySmall
                            : Typography.bodyBase,
                        },
                      ]}
                    >
                      {safePrice(item.subtotal)} EGP
                    </Text>
                    {isRefunded && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#DC2626",
                          fontWeight: "600",
                          marginTop: 2,
                        }}
                      >
                        Refunded
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {safePrice(order.subtotal)} EGP
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                {order.delivery_fee === 0
                  ? "FREE"
                  : `${safePrice(order.delivery_fee)} EGP`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (14%)</Text>
              <Text style={styles.summaryValue}>
                {safePrice(order.tax)} EGP
              </Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>
                  Discount
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -{safePrice(order.discount)} EGP
                </Text>
              </View>
            )}
            {order.promo_code && (
              <View style={styles.promoRow}>
                <Text style={styles.promoLabel}>
                  Promo Code: {order.promo_code}
                </Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {safePrice(order.total)} EGP
              </Text>
            </View>
            {order.refunded_amount && order.refunded_amount > 0 ? (
              <>
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="return-down-back"
                      size={14}
                      color="#DC2626"
                    />
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: "#DC2626", fontWeight: "600" as const },
                      ]}
                    >
                      Refunded
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: "#DC2626", fontWeight: "700" as const },
                    ]}
                  >
                    -{safePrice(order.refunded_amount)} EGP
                  </Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 4 }]}>
                  <Text
                    style={[
                      styles.totalLabel,
                      { fontSize: Typography.bodyBase },
                    ]}
                  >
                    Net Paid
                  </Text>
                  <Text
                    style={[styles.totalValue, { color: Colors.primary900 }]}
                  >
                    {safePrice(order.total - order.refunded_amount)} EGP
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* Refund History */}
        {order.refunds && order.refunds.length > 0 && (
          <View style={styles.section}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: Spacing.sm,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="receipt-outline" size={20} color="#DC2626" />
                <Text style={styles.sectionTitle}>Refund History</Text>
              </View>
              <View
                style={{
                  backgroundColor: "#FEE2E2",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: "#DC2626" }}
                >
                  {order.refunds.length}{" "}
                  {order.refunds.length === 1 ? "Refund" : "Refunds"}
                </Text>
              </View>
            </View>

            {order.refunds.map((refund, idx) => {
              const typeConfig = {
                full: {
                  label: "Full Order",
                  color: "#DC2626",
                  bg: "#FEE2E2",
                  icon: "close-circle" as const,
                },
                partial: {
                  label: "Partial Items",
                  color: "#F59E0B",
                  bg: "#FEF3C7",
                  icon: "remove-circle" as const,
                },
                penalty: {
                  label: "With Penalty",
                  color: "#9333EA",
                  bg: "#F3E8FF",
                  icon: "alert-circle" as const,
                },
              };
              const statusConfig = {
                pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7" },
                processing: {
                  label: "Processing",
                  color: "#3B82F6",
                  bg: "#DBEAFE",
                },
                completed: {
                  label: "Completed",
                  color: "#16A34A",
                  bg: "#DCFCE7",
                },
                failed: { label: "Failed", color: "#DC2626", bg: "#FEE2E2" },
              };
              const tc = typeConfig[refund.type] || typeConfig.full;
              const sc = statusConfig[refund.status] || statusConfig.pending;
              const refundDate = new Date(refund.created_at);
              const formattedDate = refundDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = refundDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <View
                  key={refund.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: Spacing.md,
                    marginBottom:
                      idx < order.refunds!.length - 1 ? Spacing.sm : 0,
                    borderWidth: 1,
                    borderColor: "#F1F5F9",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  {/* Top row: type badge + status badge */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons name={tc.icon} size={16} color={tc.color} />
                      <View
                        style={{
                          backgroundColor: tc.bg,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: tc.color,
                          }}
                        >
                          {tc.label}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        backgroundColor: sc.bg,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: sc.color,
                        }}
                      >
                        {sc.label}
                      </Text>
                    </View>
                  </View>

                  {/* Amount row */}
                  <View
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: Colors.neutralMedium }}
                      >
                        Refund Amount
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "800",
                          color: "#16A34A",
                        }}
                      >
                        {safePrice(refund.refund_amount)} EGP
                      </Text>
                    </View>
                    {refund.penalty_amount > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginTop: 6,
                        }}
                      >
                        <Text
                          style={{ fontSize: 12, color: Colors.neutralMedium }}
                        >
                          Penalty ({refund.penalty_percent}%)
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#DC2626",
                            fontWeight: "600",
                          }}
                        >
                          -{safePrice(refund.penalty_amount)} EGP
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{ fontSize: 12, color: Colors.neutralMedium }}
                      >
                        Method
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: Colors.neutralCharcoal,
                          fontWeight: "600",
                        }}
                      >
                        {refund.refund_method === "paymob"
                          ? "ðŸ’³ Card"
                          : refund.refund_method === "wallet"
                            ? "ðŸ‘› Wallet"
                            : "ðŸ’µ Cash"}
                      </Text>
                    </View>
                  </View>

                  {/* Refunded items list (for partial refunds) */}
                  {refund.refunded_items &&
                    refund.refunded_items.length > 0 && (
                      <View
                        style={{
                          backgroundColor: "#FFF7ED",
                          borderRadius: 10,
                          padding: 10,
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#92400E",
                            marginBottom: 6,
                          }}
                        >
                          Cancelled Items:
                        </Text>
                        {refund.refunded_items.map((ri: any, riIdx: number) => (
                          <View
                            key={riIdx}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              paddingVertical: 4,
                              borderTopWidth: riIdx > 0 ? 1 : 0,
                              borderTopColor: "#FDE68A",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#78350F",
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {ri.product_name} Ã— {ri.quantity}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: "#DC2626",
                              }}
                            >
                              {safePrice(ri.amount)} EGP
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* Reason */}
                  {refund.reason && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color={Colors.neutralMedium}
                        style={{ marginTop: 1 }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: Colors.neutralMedium,
                          flex: 1,
                        }}
                      >
                        {refund.reason}
                      </Text>
                    </View>
                  )}

                  {/* Date & initiated by */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={Colors.neutralMedium}
                      />
                      <Text
                        style={{ fontSize: 11, color: Colors.neutralMedium }}
                      >
                        {formattedDate} at {formattedTime}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.neutralMedium }}>
                      by {refund.initiated_by === "customer" ? "You" : "Admin"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {!["delivered", "cancelled", "failed"].includes(order.status) && (
        <View style={styles.footer}>
          {/* Track Order button for active orders */}
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: Colors.primary900,
              paddingVertical: 14,
              borderRadius: 16,
            }}
            onPress={() =>
              router.push(`/orders/tracking?id=${order.id}` as any)
            }
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              Track Order
            </Text>
          </TouchableOpacity>

          {canCancelOrder(order.status) && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                isSmallDevice ? { width: "100%" } : { flex: 1 },
              ]}
              onPress={handleOpenCancelDialog}
              disabled={checkingEligibility}
              activeOpacity={0.7}
            >
              {checkingEligibility ? (
                <ActivityIndicator size="small" color={Colors.accentRed} />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={Colors.accentRed}
                  />
                  <Text style={styles.cancelText}>Cancel Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canCancelOrder(order.status) &&
            order.items &&
            order.items.filter((i) => !i.refunded).length > 1 && (
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    borderColor: Colors.accentOrange,
                  },
                  isSmallDevice ? { width: "100%" } : { flex: 1 },
                ]}
                onPress={async () => {
                  try {
                    const reasons = await getCancellationReasons();
                    setCancellationReasons(reasons);
                  } catch { }
                  setShowPartialCancelDialog(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={20}
                  color={Colors.accentOrange}
                />
                <Text
                  style={[styles.cancelText, { color: Colors.accentOrange }]}
                >
                  Cancel Items
                </Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      {/* Cancel Dialog with Penalty Warning */}
      {showCancelDialog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>

            {/* Penalty Warning */}
            {cancelEligibility?.refund_type === "penalty" && (
              <View
                style={{
                  backgroundColor: "#FFF3CD",
                  borderRadius: 12,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.accentOrange,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall,
                    fontWeight: Typography.bold,
                    color: "#856404",
                    marginBottom: 4,
                  }}
                >
                  âš ï¸ Cancellation Fee Applies
                </Text>
                <Text
                  style={{
                    fontSize: Typography.bodySmall,
                    color: "#856404",
                  }}
                >
                  {cancelEligibility.reason}
                </Text>
              </View>
            )}

            {/* Full Refund Notice */}
            {cancelEligibility?.refund_type === "full" && (
              <View
                style={{
                  backgroundColor: "#D4EDDA",
                  borderRadius: 12,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: "#28A745",
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall,
                    fontWeight: Typography.bold,
                    color: "#155724",
                    marginBottom: 4,
                  }}
                >
                  âœ… Full Refund
                </Text>
                <Text
                  style={{
                    fontSize: Typography.bodySmall,
                    color: "#155724",
                  }}
                >
                  {cancelEligibility.reason}
                </Text>
              </View>
            )}

            {/* COD Notice */}
            {cancelEligibility?.refund_type === "none" && (
              <View
                style={{
                  backgroundColor: "#E2E3E5",
                  borderRadius: 12,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.neutralMedium,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall,
                    color: "#383D41",
                  }}
                >
                  {cancelEligibility.reason}
                </Text>
              </View>
            )}

            <Text style={styles.modalMessage}>
              Select a reason for cancellation:
            </Text>

            {/* Predefined Reasons Dropdown */}
            <View style={{ marginBottom: Spacing.sm }}>
              {cancellationReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.key}
                  onPress={() => setSelectedReasonKey(reason.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.sm,
                    backgroundColor:
                      selectedReasonKey === reason.key
                        ? "#E8F5E9"
                        : "transparent",
                    borderRadius: 8,
                    marginBottom: 4,
                    borderWidth: selectedReasonKey === reason.key ? 1 : 0,
                    borderColor: Colors.primary900,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor:
                        selectedReasonKey === reason.key
                          ? Colors.primary900
                          : Colors.neutralGray,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    {selectedReasonKey === reason.key && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: Colors.primary900,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: Typography.bodySmall,
                      color: Colors.neutralCharcoal,
                      flex: 1,
                    }}
                  >
                    {reason.label_en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional additional details */}
            <TextInput
              style={styles.modalInput}
              placeholder="Additional details (optional)"
              placeholderTextColor={Colors.neutralGray}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowCancelDialog(false);
                  setCancelReason("");
                  setSelectedReasonKey("");
                  setCancelEligibility(null);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  cancelEligibility?.refund_type === "penalty" && { flex: 1.4 },
                ]}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonTextPrimary,
                      { textAlign: "center" },
                    ]}
                  >
                    {cancelEligibility?.refund_type === "penalty"
                      ? "Cancel & Accept\nFee"
                      : "Cancel Order"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Partial Cancel Dialog */}
      {showPartialCancelDialog && order?.items && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Cancel Specific Items</Text>
            <Text style={[styles.modalMessage, { marginBottom: Spacing.sm }]}>
              Select items you want to cancel and get refunded:
            </Text>

            <ScrollView style={{ maxHeight: 250, marginBottom: Spacing.sm }}>
              {order.items
                .filter((item: any) => !item.refunded)
                .map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItemForCancel(item.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: Spacing.sm,
                      backgroundColor: selectedItemsForCancel.includes(item.id)
                        ? "#E8F5E9"
                        : "#F8F9FA",
                      borderRadius: 8,
                      marginBottom: 6,
                      borderWidth: selectedItemsForCancel.includes(item.id)
                        ? 1
                        : 0,
                      borderColor: Colors.primary900,
                    }}
                  >
                    <Ionicons
                      name={
                        selectedItemsForCancel.includes(item.id)
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={22}
                      color={
                        selectedItemsForCancel.includes(item.id)
                          ? Colors.primary900
                          : Colors.neutralGray
                      }
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: Typography.bodySmall,
                          fontWeight: "600",
                          color: Colors.neutralCharcoal,
                        }}
                      >
                        {item.product_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: Colors.neutralGray }}>
                        Qty: {item.quantity} Ã— {safePrice(item.price)} EGP
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontWeight: "700",
                        color: Colors.neutralCharcoal,
                      }}
                    >
                      {safePrice(item.subtotal)} EGP
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {selectedItemsForCancel.length > 0 && (
              <View
                style={{
                  backgroundColor: "#E8F5E9",
                  borderRadius: 8,
                  padding: Spacing.sm,
                  marginBottom: Spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall,
                    color: Colors.primary900,
                    fontWeight: "600",
                  }}
                >
                  {selectedItemsForCancel.length} item(s) selected for refund
                </Text>
              </View>
            )}

            {/* Reason selection */}
            <Text
              style={{
                fontSize: Typography.bodySmall,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Reason:
            </Text>
            <View style={{ maxHeight: 120, marginBottom: Spacing.sm }}>
              <ScrollView>
                {cancellationReasons.map((reason) => (
                  <TouchableOpacity
                    key={reason.key}
                    onPress={() => setSelectedReasonKey(reason.key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      backgroundColor:
                        selectedReasonKey === reason.key
                          ? "#E8F5E9"
                          : "transparent",
                      borderRadius: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor:
                          selectedReasonKey === reason.key
                            ? Colors.primary900
                            : Colors.neutralGray,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      {selectedReasonKey === reason.key && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: Colors.primary900,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={{ fontSize: 13, color: Colors.neutralCharcoal }}
                    >
                      {reason.label_en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowPartialCancelDialog(false);
                  setSelectedItemsForCancel([]);
                  setCancelReason("");
                  setSelectedReasonKey("");
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    opacity: selectedItemsForCancel.length === 0 ? 0.5 : 1,
                  },
                ]}
                onPress={handlePartialItemCancel}
                disabled={
                  partialCancelling || selectedItemsForCancel.length === 0
                }
              >
                {partialCancelling ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    Refund Selected
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Refund Result Modal */}
      {showRefundResult && refundResult && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#DCFCE7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { textAlign: "center" }]}>
              Refund Processed
            </Text>
            <View
              style={{
                backgroundColor: "#F1F5F9",
                borderRadius: 12,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: Colors.neutralMedium,
                    fontSize: Typography.bodySmall,
                  }}
                >
                  Refund Type
                </Text>
                <Text
                  style={{
                    fontWeight: Typography.bold,
                    fontSize: Typography.bodySmall,
                    textTransform: "capitalize",
                    color: Colors.neutralCharcoal,
                  }}
                >
                  {refundResult.type}
                </Text>
              </View>
              {refundResult.penalty_amount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#64748B",
                      fontSize: Typography.bodySmall,
                    }}
                  >
                    Cancellation Fee ({refundResult.penalty_percent}%)
                  </Text>
                  <Text
                    style={{
                      fontWeight: Typography.bold,
                      fontSize: Typography.bodySmall,
                      color: Colors.accentRed,
                    }}
                  >
                    -{safePrice(refundResult.penalty_amount)} EGP
                  </Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: Colors.neutralMedium,
                    fontSize: Typography.bodySmall,
                  }}
                >
                  Refund Amount
                </Text>
                <Text
                  style={{
                    fontWeight: Typography.bold,
                    fontSize: Typography.bodyBase,
                    color: "#28A745",
                  }}
                >
                  {safePrice(refundResult.refund_amount)} EGP
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: Colors.neutralMedium,
                    fontSize: Typography.bodySmall,
                  }}
                >
                  Estimated Arrival
                </Text>
                <Text
                  style={{
                    fontWeight: Typography.bold,
                    fontSize: Typography.bodySmall,
                    color: Colors.neutralCharcoal,
                  }}
                >
                  {refundResult.estimated_days}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: Colors.primary900,
                  width: "100%",
                  paddingVertical: Spacing.md,
                },
              ]}
              onPress={() => {
                setShowRefundResult(false);
                setRefundResult(null);
              }}
            >
              <Text
                style={{
                  fontSize: Typography.bodyBase,
                  fontWeight: "700",
                  color: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                Alright
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Order Actions Menu */}
      <Modal
        visible={showActionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionsMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View
            style={{
              position: "absolute",
              top: 90,
              right: 16,
              backgroundColor: Colors.neutralWhite,
              borderRadius: 16,
              paddingVertical: 8,
              minWidth: 220,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            {/* Download Invoice */}
            <TouchableOpacity
              onPress={handleDownloadInvoice}
              disabled={downloadingInvoice}
              activeOpacity={0.6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                gap: 14,
              }}
            >
              {downloadingInvoice ? (
                <ActivityIndicator size="small" color={Colors.primary900} />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={Colors.primary900}
                />
              )}
              <Text
                style={{
                  fontSize: Typography.bodyBase,
                  fontWeight: "600" as const,
                  color: Colors.neutralCharcoal,
                }}
              >
                Download Invoice
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <View
              style={{
                height: 1,
                backgroundColor: Colors.neutralLight,
                marginHorizontal: 16,
              }}
            />

            {/* Email Invoice */}
            <TouchableOpacity
              onPress={handleEmailInvoice}
              disabled={emailingInvoice}
              activeOpacity={0.6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                gap: 14,
              }}
            >
              {emailingInvoice ? (
                <ActivityIndicator size="small" color={Colors.primary900} />
              ) : (
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={Colors.primary900}
                />
              )}
              <Text
                style={{
                  fontSize: Typography.bodyBase,
                  fontWeight: "600" as const,
                  color: Colors.neutralCharcoal,
                }}
              >
                Email Me Invoice
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <View
              style={{
                height: 1,
                backgroundColor: Colors.neutralLight,
                marginHorizontal: 16,
              }}
            />

            {/* Share Order */}
            <TouchableOpacity
              onPress={handleShareOrder}
              disabled={sharingOrder}
              activeOpacity={0.6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                gap: 14,
              }}
            >
              {sharingOrder ? (
                <ActivityIndicator size="small" color={Colors.primary900} />
              ) : (
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={Colors.primary900}
                />
              )}
              <Text
                style={{
                  fontSize: Typography.bodyBase,
                  fontWeight: "600" as const,
                  color: Colors.neutralCharcoal,
                }}
              >
                Share Order
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Driver Rating Modal */}
      <Modal
        visible={showDriverRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriverRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Ionicons name="car-outline" size={22} color="#3b82f6" />
              <Text
                style={[styles.modalTitle, { marginLeft: 8, marginBottom: 0 }]}
              >
                Rate Your Driver
              </Text>
            </View>
            {order?.driver && (
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.neutralMedium,
                  marginBottom: 16,
                }}
              >
                How was your delivery by {order.driver.first_name}{" "}
                {order.driver.last_name}?
              </Text>
            )}

            {/* Star Rating */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 20,
                gap: 8,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setDriverRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= driverRating ? "star" : "star-outline"}
                    size={36}
                    color={
                      star <= driverRating
                        ? Colors.accentOrange
                        : Colors.neutralGray
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                color: Colors.neutralMedium,
                marginBottom: 8,
              }}
            >
              Leave a comment (optional)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="How was the delivery experience?"
              placeholderTextColor={Colors.neutralGray}
              value={driverReviewComment}
              onChangeText={setDriverReviewComment}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowDriverRatingModal(false);
                  setDriverRating(0);
                  setDriverReviewComment("");
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#3b82f6" }]}
                onPress={handleSubmitDriverReview}
                disabled={submittingDriverReview || driverRating === 0}
              >
                {submittingDriverReview ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    Submit Rating
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Product</Text>
            {selectedProduct && (
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.neutralMedium,
                  marginBottom: 16,
                }}
              >
                {selectedProduct.product_name}
              </Text>
            )}

            {/* Star Rating */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 20,
                gap: 8,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color={
                      star <= rating ? Colors.accentOrange : Colors.neutralGray
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                color: Colors.neutralMedium,
                marginBottom: 8,
              }}
            >
              Write a review (optional)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Share your experience with this product..."
              placeholderTextColor={Colors.neutralGray}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowRatingModal(false);
                  setSelectedProduct(null);
                  setRating(0);
                  setReviewComment("");
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: Colors.primary900 },
                ]}
                onPress={handleSubmitReview}
                disabled={submittingReview || rating === 0}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    Submit Review
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
        duration={3000}
      />
    </SafeAreaView>
  );
}
