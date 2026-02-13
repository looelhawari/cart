import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Vibration,
  Modal,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Send,
  AlertCircle,
  Bot,
  User,
  Phone,
  Star,
  X,
  CheckCircle,
  Clock,
  Sparkles,
  MessageCircle,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import {
  getComplaint,
  replyToComplaint,
  broadcastTyping,
  escalateToAgent,
  rateBotExperience,
  closeComplaint,
  type ComplaintDetail,
  type ComplaintMessage,
} from "@/services/api/complaintsApi";
import { getEcho } from "@/services/echo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Format time
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Animated Typing Dot
const TypingDot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      ),
      -1,
      false,
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.typingDot, animatedStyle]}
      entering={ZoomIn.delay(delay)}
    />
  );
};

// Typing Indicator Component
const TypingIndicator = ({ isBot }: { isBot: boolean }) => {
  return (
    <Animated.View
      style={styles.typingContainer}
      entering={FadeIn.duration(300)}
    >
      <View
        style={[
          styles.avatarSmall,
          isBot ? styles.avatarBot : styles.avatarAgent,
        ]}
      >
        {isBot ? (
          <Bot size={14} color={Colors.neutralWhite} />
        ) : (
          <User size={14} color={Colors.neutralWhite} />
        )}
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <TypingDot delay={0} />
          <TypingDot delay={150} />
          <TypingDot delay={300} />
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Quick Action Button ────────────────────────────────────────────────────

const QuickAction = ({
  icon: Icon,
  label,
  onPress,
  color = Colors.primary900,
  bgColor = Colors.primary100,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  color?: string;
  bgColor?: string;
}) => (
  <TouchableOpacity
    style={styles.quickAction}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.quickActionIconBg, { backgroundColor: bgColor }]}>
      <Icon size={16} color={color} />
    </View>
    <Text style={[styles.quickActionText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Rating Modal ───────────────────────────────────────────────────────────

const RatingModal = ({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, feedback);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={styles.ratingModal}
          entering={ZoomIn.duration(300)}
        >
          <View style={styles.ratingHeader}>
            <LinearGradient
              colors={[Colors.accentYellow + "30", Colors.accentYellow + "10"]}
              style={styles.ratingIconContainer}
            >
              <Sparkles size={28} color={Colors.accentYellow} />
            </LinearGradient>
            <Text style={styles.ratingTitle}>Rate Your Experience</Text>
            <Text style={styles.ratingSubtitle}>
              How was your chat with our assistant?
            </Text>
          </View>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  setRating(star);
                  Vibration.vibrate(50);
                }}
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <Star
                  size={38}
                  color={
                    star <= rating ? Colors.accentYellow : Colors.neutralGray
                  }
                  fill={star <= rating ? Colors.accentYellow : "transparent"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Animated.Text
              style={styles.ratingLabel}
              entering={FadeIn.duration(200)}
            >
              {ratingLabels[rating]}
            </Animated.Text>
          )}

          <View style={styles.feedbackWrapper}>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Any feedback? (optional)"
              placeholderTextColor={Colors.neutralMedium}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              maxLength={200}
            />
            <Text style={styles.feedbackCount}>{feedback.length}/200</Text>
          </View>

          <View style={styles.ratingButtons}>
            <TouchableOpacity
              style={styles.ratingBtnSecondary}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.ratingBtnSecondaryText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.ratingBtnPrimary,
                rating === 0 && styles.ratingBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={rating === 0}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  rating > 0
                    ? [Colors.primary700, Colors.primary900]
                    : [Colors.neutralGray, Colors.neutralGray]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ratingBtnGradient}
              >
                <Text style={styles.ratingBtnPrimaryText}>Submit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────────────

const MessageBubble = ({
  message,
  isLast,
}: {
  message: ComplaintMessage;
  isLast: boolean;
}) => {
  const isFromUser = !message.is_admin_reply && !message.is_bot_reply;
  const isBot = message.is_bot_reply;

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isFromUser ? styles.messageRowRight : styles.messageRowLeft,
      ]}
      entering={FadeInDown.duration(300).delay(50)}
    >
      {!isFromUser && (
        <View
          style={[
            styles.avatarSmall,
            isBot ? styles.avatarBot : styles.avatarAgent,
          ]}
        >
          {isBot ? (
            <Bot size={14} color={Colors.neutralWhite} />
          ) : (
            <User size={14} color={Colors.neutralWhite} />
          )}
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          isFromUser ? styles.messageBubbleUser : styles.messageBubbleOther,
          isBot && styles.messageBubbleBot,
          isLast &&
            (isFromUser
              ? styles.messageBubbleLastRight
              : styles.messageBubbleLastLeft),
        ]}
      >
        {!isFromUser && (
          <View style={styles.senderRow}>
            <View
              style={[
                styles.senderDot,
                { backgroundColor: isBot ? "#8b5cf6" : "#3b82f6" },
              ]}
            />
            <Text style={styles.senderLabel}>
              {isBot ? "ElBaraka Assistant" : "Support Agent"}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.messageText,
            isFromUser ? styles.messageTextUser : styles.messageTextOther,
          ]}
        >
          {message.message}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isFromUser ? styles.messageTimeUser : styles.messageTimeOther,
          ]}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ComplaintChatScreen() {
  const { id } = useLocalSearchParams();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const loadComplaint = async () => {
    if (!id) return;
    try {
      const response = await getComplaint(Number(id));
      if (!response.success || !response.data?.complaint) {
        throw new Error("Failed to load complaint");
      }
      setComplaint(response.data.complaint);
    } catch (err: any) {
      console.error("Failed to load complaint:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let echoRef: any = null;

    (async () => {
      const echo = await getEcho();
      if (cancelled) return;
      echoRef = echo;

      echo
        .private(`complaints.${id}`)
        .listen(".message.sent", (event: { message: ComplaintMessage }) => {
          setComplaint((prev) => {
            if (!prev) return prev;
            if (prev.messages?.some((m) => m.id === event.message.id))
              return prev;
            return {
              ...prev,
              messages: [...(prev.messages || []), event.message],
            };
          });
          setIsTyping(false);
          Vibration.vibrate(100);
        })
        .listen(
          ".user.typing",
          (event: { is_typing: boolean; is_admin: boolean }) => {
            if (event.is_admin) {
              setIsTyping(event.is_typing);
              if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
              if (event.is_typing) {
                typingTimeoutRef.current = setTimeout(
                  () => setIsTyping(false),
                  3000,
                );
              }
            }
          },
        );
    })();

    return () => {
      cancelled = true;
      if (echoRef) {
        echoRef.leave(`complaints.${id}`);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (sendTypingTimeoutRef.current)
        clearTimeout(sendTypingTimeoutRef.current);
    };
  }, [id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (complaint?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [complaint?.messages?.length]);

  const handleSend = async () => {
    if (!message.trim() || !id) return;

    const text = message.trim();
    setMessage("");
    setSending(true);

    // Optimistic update
    const tempMsg: ComplaintMessage = {
      id: Date.now(),
      message: text,
      is_admin_reply: false,
      is_bot_reply: false,
      created_at: new Date().toISOString(),
    };

    setComplaint((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), tempMsg] } : prev,
    );

    // Show typing indicator for bot
    if (complaint?.bot_handled && !complaint?.escalated_to_agent) {
      setTimeout(() => setIsTyping(true), 300);
    }

    try {
      const response = await replyToComplaint(Number(id), text);
      setIsTyping(false);

      // If bot responded, it will come via WebSocket
      if (response.data?.bot_response?.escalated) {
        setComplaint((prev) =>
          prev ? { ...prev, escalated_to_agent: true } : prev,
        );
      }
    } catch (err: any) {
      console.error("Failed to send:", err.message);
      setMessage(text);
      setIsTyping(false);
      // Revert optimistic update
      setComplaint((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages?.filter((m) => m.id !== tempMsg.id),
            }
          : prev,
      );
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessage(text);
    if (!id) return;

    if (sendTypingTimeoutRef.current) {
      clearTimeout(sendTypingTimeoutRef.current);
    } else {
      broadcastTyping(Number(id), true);
    }

    sendTypingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(Number(id), false);
      sendTypingTimeoutRef.current = null;
    }, 2000);
  };

  const handleEscalate = async () => {
    if (!id) return;
    try {
      await escalateToAgent(Number(id));
      setComplaint((prev) =>
        prev ? { ...prev, escalated_to_agent: true } : prev,
      );
      Vibration.vibrate(100);
    } catch (err: any) {
      console.error("Failed to escalate:", err.message);
    }
  };

  const handleRateBot = async (rating: number, feedback: string) => {
    if (!id) return;
    try {
      await rateBotExperience(Number(id), rating, feedback);
      setShowRating(false);
      setComplaint((prev) =>
        prev ? { ...prev, bot_satisfaction_rating: rating } : prev,
      );
    } catch (err) {
      console.error("Failed to rate:", err);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      await closeComplaint(Number(id));
      setComplaint((prev) => (prev ? { ...prev, status: "closed" } : prev));
      setShowRating(true);
    } catch (err: any) {
      console.error("Failed to close:", err.message);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return {
          color: Colors.accentOrange,
          bg: "#fff7ed",
          label: "Open",
          icon: "alert-circle-outline" as const,
        };
      case "in_progress":
        return {
          color: "#3b82f6",
          bg: "#eff6ff",
          label: "In Progress",
          icon: "time-outline" as const,
        };
      case "awaiting_response":
        return {
          color: "#8b5cf6",
          bg: "#f5f3ff",
          label: "Awaiting Response",
          icon: "hourglass-outline" as const,
        };
      case "resolved":
        return {
          color: Colors.primary900,
          bg: Colors.primary100,
          label: "Resolved",
          icon: "checkmark-circle-outline" as const,
        };
      case "closed":
        return {
          color: Colors.neutralMedium,
          bg: Colors.neutralLight,
          label: "Closed",
          icon: "lock-closed-outline" as const,
        };
      default:
        return {
          color: Colors.neutralMedium,
          bg: Colors.neutralLight,
          label: status,
          icon: "help-circle-outline" as const,
        };
    }
  };

  const renderHeader = () => {
    if (!complaint) return null;
    const status = getStatusConfig(complaint.status);
    const isBotHandling =
      complaint.bot_handled && !complaint.escalated_to_agent;

    return (
      <View style={styles.headerSection}>
        {/* Ticket Info Card */}
        <Animated.View
          style={styles.ticketCard}
          entering={FadeIn.duration(400)}
        >
          <View style={styles.ticketCardInner}>
            {/* Top Row */}
            <View style={styles.ticketTopRow}>
              <View style={styles.ticketHeaderLeft}>
                <Text style={styles.ticketNumber}>
                  {complaint.ticket_number}
                </Text>
                <Text style={styles.ticketSubject} numberOfLines={2}>
                  {complaint.subject}
                </Text>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: status.bg }]}
              >
                <Ionicons name={status.icon} size={12} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Description */}
            {complaint.description && (
              <Text style={styles.ticketDescription} numberOfLines={2}>
                {complaint.description}
              </Text>
            )}

            {/* Meta Row */}
            <View style={styles.ticketMeta}>
              <View style={styles.ticketMetaItem}>
                <Clock size={12} color={Colors.neutralMedium} />
                <Text style={styles.ticketMetaText}>
                  {formatDate(complaint.created_at)}
                </Text>
              </View>
              {isBotHandling && (
                <View
                  style={[
                    styles.handlerBadge,
                    { backgroundColor: "#8b5cf6" + "12" },
                  ]}
                >
                  <Bot size={12} color="#8b5cf6" />
                  <Text style={[styles.handlerBadgeText, { color: "#8b5cf6" }]}>
                    Smart Assistant
                  </Text>
                </View>
              )}
              {complaint.escalated_to_agent && (
                <View
                  style={[
                    styles.handlerBadge,
                    { backgroundColor: "#3b82f6" + "12" },
                  ]}
                >
                  <User size={12} color="#3b82f6" />
                  <Text style={[styles.handlerBadgeText, { color: "#3b82f6" }]}>
                    Live Agent
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        {!complaint.escalated_to_agent &&
          complaint.status !== "closed" &&
          complaint.status !== "resolved" && (
            <View style={styles.quickActions}>
              <QuickAction
                icon={Phone}
                label="Talk to Agent"
                onPress={handleEscalate}
                color="#8b5cf6"
                bgColor={"#8b5cf6" + "12"}
              />
              <QuickAction
                icon={CheckCircle}
                label="Issue Resolved"
                onPress={handleClose}
                color={Colors.primary900}
                bgColor={Colors.primary100}
              />
            </View>
          )}

        {/* Chat Divider */}
        <View style={styles.chatDivider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerCenter}>
            <MessageCircle size={12} color={Colors.neutralMedium} />
            <Text style={styles.dividerText}>
              {isBotHandling ? "Chat with Assistant" : "Chat with Support"}
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
      </View>
    );
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: ComplaintMessage;
    index: number;
  }) => (
    <MessageBubble
      message={item}
      isLast={index === (complaint?.messages?.length || 0) - 1}
    />
  );

  const renderFooter = () => {
    if (isTyping) {
      return (
        <TypingIndicator
          isBot={Boolean(
            complaint?.bot_handled && !complaint?.escalated_to_agent,
          )}
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <View style={styles.loadingInner}>
          <View style={styles.loadingIconBg}>
            <ActivityIndicator size="large" color={Colors.primary900} />
          </View>
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!complaint) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={["top"]}>
        <View style={styles.errorInner}>
          <View style={styles.errorIconBg}>
            <AlertCircle size={48} color={Colors.neutralGray} />
          </View>
          <Text style={styles.errorTitle}>Ticket Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This support ticket doesn&apos;t exist or was deleted.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.errorButtonGradient}
            >
              <ArrowLeft size={18} color={Colors.neutralWhite} />
              <Text style={styles.errorButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isClosedOrResolved = ["closed", "resolved"].includes(complaint.status);
  const isBotHandling = complaint.bot_handled && !complaint.escalated_to_agent;
  const statusConfig = getStatusConfig(complaint.status);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.neutralCharcoal} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarRow}>
            <View
              style={[
                styles.headerAvatar,
                {
                  backgroundColor: isBotHandling
                    ? "#8b5cf6" + "15"
                    : "#3b82f6" + "15",
                },
              ]}
            >
              {isBotHandling ? (
                <Bot size={16} color="#8b5cf6" />
              ) : (
                <User size={16} color="#3b82f6" />
              )}
            </View>
            <View>
              <Text style={styles.headerName}>
                {isBotHandling ? "ElBaraka Assistant" : "Support Agent"}
              </Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.connectionDot} />
                <Text style={styles.headerStatusText}>Online</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerRightSpace} />
      </View>

      {/* Chat Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={styles.keyboardView}
      >
        <FlatList
          ref={flatListRef}
          data={complaint.messages || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        {/* Input Area */}
        {!isClosedOrResolved ? (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your message..."
                placeholderTextColor={Colors.neutralMedium}
                value={message}
                onChangeText={handleTyping}
                multiline
                maxLength={1000}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!message.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!message.trim() || sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.neutralWhite} />
              ) : (
                <LinearGradient
                  colors={
                    message.trim()
                      ? [Colors.primary700, Colors.primary900]
                      : [Colors.neutralGray, Colors.neutralGray]
                  }
                  style={styles.sendButtonGradient}
                >
                  <Send size={18} color={Colors.neutralWhite} />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <View style={styles.closedBannerLeft}>
              <View style={styles.closedIconBg}>
                <Ionicons
                  name={statusConfig.icon}
                  size={18}
                  color={statusConfig.color}
                />
              </View>
              <Text style={styles.closedBannerText}>
                This ticket has been {complaint.status}
              </Text>
            </View>
            {!complaint.bot_satisfaction_rating && complaint.bot_handled && (
              <TouchableOpacity
                style={styles.rateBannerButton}
                onPress={() => setShowRating(true)}
                activeOpacity={0.7}
              >
                <Star size={14} color={Colors.accentYellow} />
                <Text style={styles.rateBannerButtonText}>Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <RatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleRateBot}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  keyboardView: {
    flex: 1,
  },

  // ═══ Loading State ══════════════════════════════════════════════════════════
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  loadingInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },

  // ═══ Error / Not Found ══════════════════════════════════════════════════════
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  errorInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  errorSubtitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  errorButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.xs,
  },
  errorButtonText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // ═══ Custom Header ══════════════════════════════════════════════════════════
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary900,
  },
  headerStatusText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.primary900,
  },
  headerRightSpace: {
    width: 40,
  },

  // ═══ Message List ═══════════════════════════════════════════════════════════
  messageList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xs,
  },

  // ═══ Ticket Info Card ═══════════════════════════════════════════════════════
  headerSection: {
    marginBottom: Spacing.md,
  },
  ticketCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.neutralWhite,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketCardInner: {
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary900,
  },
  ticketTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  ticketHeaderLeft: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  ticketSubject: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    textTransform: "capitalize",
  },
  ticketDescription: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  ticketMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  ticketMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ticketMetaText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  handlerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  handlerBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
  },

  // ═══ Quick Actions ══════════════════════════════════════════════════════════
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 14,
    gap: Spacing.xs,
    backgroundColor: Colors.neutralWhite,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-SemiBold",
  },

  // ═══ Chat Divider ═══════════════════════════════════════════════════════════
  chatDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutralGray,
  },
  dividerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.neutralCloud,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralMedium,
  },

  // ═══ Message Bubbles ════════════════════════════════════════════════════════
  messageRow: {
    flexDirection: "row",
    marginVertical: 5,
    maxWidth: "85%",
  },
  messageRowLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-end",
  },
  messageRowRight: {
    alignSelf: "flex-end",
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
    marginBottom: 4,
  },
  avatarBot: {
    backgroundColor: "#8b5cf6",
  },
  avatarAgent: {
    backgroundColor: "#3b82f6",
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  messageBubbleUser: {
    backgroundColor: Colors.primary900,
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    backgroundColor: Colors.neutralWhite,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  messageBubbleBot: {
    backgroundColor: "#faf5ff",
    borderColor: "#e9d5ff",
  },
  messageBubbleLastLeft: {
    borderBottomLeftRadius: 6,
  },
  messageBubbleLastRight: {
    borderBottomRightRadius: 6,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  senderDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  senderLabel: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralMedium,
  },
  messageText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
  },
  messageTextUser: {
    color: Colors.neutralWhite,
  },
  messageTextOther: {
    color: Colors.neutralCharcoal,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageTimeUser: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  messageTimeOther: {
    color: Colors.neutralMedium,
  },

  // ═══ Typing Indicator ═══════════════════════════════════════════════════════
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    alignSelf: "flex-start",
    marginVertical: 6,
  },
  typingBubble: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  typingDots: {
    flexDirection: "row",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutralMedium,
  },

  // ═══ Input Area ═════════════════════════════════════════════════════════════
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    paddingBottom: Platform.OS === "ios" ? Spacing.xs : Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.neutralLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    maxHeight: 120,
  },
  textInput: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ═══ Closed Banner ══════════════════════════════════════════════════════════
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  closedBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  closedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  closedBannerText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralCharcoal,
    textTransform: "capitalize",
  },
  rateBannerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentYellow + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  rateBannerButtonText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins-SemiBold",
    color: "#d97706",
  },

  // ═══ Rating Modal ═══════════════════════════════════════════════════════════
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  ratingModal: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
    alignItems: "center",
  },
  ratingHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  ratingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  ratingTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-SemiBold",
    color: Colors.accentYellow,
    marginBottom: Spacing.md,
  },
  feedbackWrapper: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  feedbackInput: {
    width: "100%",
    height: 80,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    textAlignVertical: "top",
    borderWidth: 1.5,
    borderColor: Colors.neutralLight,
  },
  feedbackCount: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
    textAlign: "right",
    marginTop: 4,
  },
  ratingButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
  },
  ratingBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBtnSecondaryText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralMedium,
  },
  ratingBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  ratingBtnDisabled: {
    opacity: 0.5,
  },
  ratingBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBtnPrimaryText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },
});
