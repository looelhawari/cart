import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import {
  getComplaint,
  replyToComplaint,
  broadcastTyping,
  escalateToAgent,
  rateBotExperience,
  closeComplaint,
  type ComplaintDetail,
  type ComplaintMessage,
} from '@/services/api/complaintsApi';
import echo from '@/services/echo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format time
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Animated Typing Dot
const TypingDot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 200 }),
        withTiming(0, { duration: 200 })
      ),
      -1,
      false
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
      <View style={[styles.avatarSmall, isBot ? styles.avatarBot : styles.avatarAgent]}>
        {isBot ? (
          <Bot size={14} color="#fff" />
        ) : (
          <User size={14} color="#fff" />
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

// Quick Action Button
const QuickAction = ({
  icon: Icon,
  label,
  onPress,
  color = '#22c55e'
}: {
  icon: any;
  label: string;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    style={[styles.quickAction, { borderColor: color }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon size={16} color={color} />
    <Text style={[styles.quickActionText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// Rating Modal
const RatingModal = ({
  visible,
  onClose,
  onSubmit
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, feedback);
    }
  };

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
            <View style={styles.ratingIconContainer}>
              <Sparkles size={24} color="#f59e0b" />
            </View>
            <Text style={styles.ratingTitle}>Rate Your Experience</Text>
            <Text style={styles.ratingSubtitle}>How was your chat with our assistant?</Text>
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
              >
                <Star
                  size={40}
                  color={star <= rating ? '#f59e0b' : '#e2e8f0'}
                  fill={star <= rating ? '#f59e0b' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.feedbackInput}
            placeholder="Any feedback? (optional)"
            placeholderTextColor="#9ca3af"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            maxLength={200}
          />

          <View style={styles.ratingButtons}>
            <TouchableOpacity
              style={styles.ratingBtnSecondary}
              onPress={onClose}
            >
              <Text style={styles.ratingBtnSecondaryText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ratingBtnPrimary, rating === 0 && styles.ratingBtnDisabled]}
              onPress={handleSubmit}
              disabled={rating === 0}
            >
              <Text style={styles.ratingBtnPrimaryText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Message Bubble Component
const MessageBubble = ({
  message,
  isLast
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
        <View style={[
          styles.avatarSmall,
          isBot ? styles.avatarBot : styles.avatarAgent,
        ]}>
          {isBot ? (
            <Bot size={14} color="#fff" />
          ) : (
            <User size={14} color="#fff" />
          )}
        </View>
      )}

      <View style={[
        styles.messageBubble,
        isFromUser ? styles.messageBubbleUser : styles.messageBubbleOther,
        isBot && styles.messageBubbleBot,
        isLast && (isFromUser ? styles.messageBubbleLastRight : styles.messageBubbleLastLeft),
      ]}>
        {!isFromUser && (
          <Text style={styles.senderLabel}>
            {isBot ? '🤖 ElBaraka Assistant' : '👤 Support Agent'}
          </Text>
        )}
        <Text style={[
          styles.messageText,
          isFromUser ? styles.messageTextUser : styles.messageTextOther,
        ]}>
          {message.message}
        </Text>
        <Text style={[
          styles.messageTime,
          isFromUser ? styles.messageTimeUser : styles.messageTimeOther,
        ]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </Animated.View>
  );
};

// Main Screen Component
export default function ComplaintChatScreen() {
  const { id } = useLocalSearchParams();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadComplaint = async () => {
    if (!id) return;
    try {
      setError(null);
      const response = await getComplaint(Number(id));
      if (!response.success || !response.data?.complaint) {
        throw new Error('Failed to load complaint');
      }
      setComplaint(response.data.complaint);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
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

    const channel = echo.private(`complaints.${id}`)
      .listen('.message.sent', (event: { message: ComplaintMessage }) => {
        setComplaint(prev => {
          if (!prev) return prev;
          if (prev.messages?.some(m => m.id === event.message.id)) return prev;
          return { ...prev, messages: [...(prev.messages || []), event.message] };
        });
        setIsTyping(false);
        Vibration.vibrate(100);
      })
      .listen('.user.typing', (event: { is_typing: boolean; is_admin: boolean }) => {
        if (event.is_admin) {
          setIsTyping(event.is_typing);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (event.is_typing) {
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
          }
        }
      });

    return () => {
      echo.leave(`complaints.${id}`);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (sendTypingTimeoutRef.current) clearTimeout(sendTypingTimeoutRef.current);
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
    setMessage('');
    setSending(true);

    // Optimistic update
    const tempMsg: ComplaintMessage = {
      id: Date.now(),
      message: text,
      is_admin_reply: false,
      is_bot_reply: false,
      created_at: new Date().toISOString(),
    };

    setComplaint(prev =>
      prev ? { ...prev, messages: [...(prev.messages || []), tempMsg] } : prev
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
        setComplaint(prev => prev ? { ...prev, escalated_to_agent: true } : prev);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send');
      setMessage(text);
      setIsTyping(false);
      // Revert optimistic update
      setComplaint(prev =>
        prev ? { ...prev, messages: prev.messages?.filter(m => m.id !== tempMsg.id) } : prev
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
      setComplaint(prev => prev ? { ...prev, escalated_to_agent: true } : prev);
      Vibration.vibrate(100);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRateBot = async (rating: number, feedback: string) => {
    if (!id) return;
    try {
      await rateBotExperience(Number(id), rating, feedback);
      setShowRating(false);
      setComplaint(prev => prev ? { ...prev, bot_satisfaction_rating: rating } : prev);
    } catch (err) {
      console.error('Failed to rate:', err);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      await closeComplaint(Number(id));
      setComplaint(prev => prev ? { ...prev, status: 'closed' } : prev);
      setShowRating(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open': return { color: '#f97316', bg: '#fff7ed', label: 'Open' };
      case 'in_progress': return { color: '#3b82f6', bg: '#eff6ff', label: 'In Progress' };
      case 'awaiting_response': return { color: '#8b5cf6', bg: '#f5f3ff', label: 'Awaiting Response' };
      case 'resolved': return { color: '#22c55e', bg: '#f0fdf4', label: 'Resolved' };
      case 'closed': return { color: '#6b7280', bg: '#f9fafb', label: 'Closed' };
      default: return { color: '#6b7280', bg: '#f9fafb', label: status };
    }
  };

  const renderHeader = () => {
    if (!complaint) return null;
    const status = getStatusConfig(complaint.status);
    const isBotHandling = complaint.bot_handled && !complaint.escalated_to_agent;

    return (
      <View style={styles.headerSection}>
        {/* Ticket Info Card */}
        <Animated.View
          style={styles.ticketCard}
          entering={FadeIn.duration(400)}
        >
          <LinearGradient
            colors={['#f0fdf4', '#ecfdf5']}
            style={styles.ticketCardGradient}
          >
            <View style={styles.ticketHeader}>
              <View style={styles.ticketHeaderLeft}>
                <Text style={styles.ticketNumber}>{complaint.ticket_number}</Text>
                <Text style={styles.ticketSubject} numberOfLines={2}>{complaint.subject}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {complaint.description && (
              <Text style={styles.ticketDescription} numberOfLines={2}>
                {complaint.description}
              </Text>
            )}

            <View style={styles.ticketMeta}>
              <View style={styles.ticketMetaItem}>
                <Clock size={12} color="#64748b" />
                <Text style={styles.ticketMetaText}>
                  {formatDate(complaint.created_at)}
                </Text>
              </View>
              {isBotHandling && (
                <View style={styles.botBadge}>
                  <Bot size={12} color="#8b5cf6" />
                  <Text style={styles.botBadgeText}>Smart Assistant</Text>
                </View>
              )}
              {complaint.escalated_to_agent && (
                <View style={[styles.botBadge, { backgroundColor: '#eff6ff' }]}>
                  <User size={12} color="#3b82f6" />
                  <Text style={[styles.botBadgeText, { color: '#3b82f6' }]}>Live Agent</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        {!complaint.escalated_to_agent && complaint.status !== 'closed' && complaint.status !== 'resolved' && (
          <View style={styles.quickActions}>
            <QuickAction
              icon={Phone}
              label="Talk to Agent"
              onPress={handleEscalate}
              color="#8b5cf6"
            />
            <QuickAction
              icon={CheckCircle}
              label="Issue Resolved"
              onPress={handleClose}
              color="#22c55e"
            />
          </View>
        )}

        {/* Chat Divider */}
        <View style={styles.chatDivider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerCenter}>
            <MessageCircle size={12} color="#94a3b8" />
            <Text style={styles.dividerText}>
              {isBotHandling ? 'Chat with Assistant' : 'Chat with Support'}
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: ComplaintMessage; index: number }) => (
    <MessageBubble
      message={item}
      isLast={index === (complaint?.messages?.length || 0) - 1}
    />
  );

  const renderFooter = () => {
    if (isTyping) {
      return <TypingIndicator isBot={Boolean(complaint?.bot_handled && !complaint?.escalated_to_agent)} />;
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary900} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }

  if (!complaint) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <AlertCircle size={64} color="#d1d5db" />
        <Text style={styles.errorTitle}>Ticket Not Found</Text>
        <Text style={styles.errorSubtitle}>This support ticket doesn't exist or was deleted.</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isClosedOrResolved = ['closed', 'resolved'].includes(complaint.status);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={22} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={styles.connectionDot} />
              <Text style={styles.headerRightText}>Connected</Text>
            </View>
          ),
          headerBackground: () => (
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={StyleSheet.absoluteFill}
            />
          ),
          headerShadowVisible: false,
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          style={styles.keyboardView}
        >
          {error && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={() => setError(null)}
              activeOpacity={0.8}
            >
              <AlertCircle size={16} color="#fff" />
              <Text style={styles.errorBannerText}>{error}</Text>
              <X size={16} color="#fff" />
            </TouchableOpacity>
          )}

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
                  placeholderTextColor="#9ca3af"
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
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.closedBanner}>
              <CheckCircle size={20} color="#22c55e" />
              <Text style={styles.closedBannerText}>
                This ticket has been {complaint.status}
              </Text>
              {!complaint.bot_satisfaction_rating && complaint.bot_handled && (
                <TouchableOpacity
                  style={styles.rateBannerButton}
                  onPress={() => setShowRating(true)}
                >
                  <Star size={14} color="#f59e0b" />
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
    fontFamily: 'Poppins-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e293b',
  },
  errorSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#22c55e',
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerRightText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Poppins-Medium',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  headerSection: {
    marginBottom: 16,
  },
  ticketCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketCardGradient: {
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  ticketHeaderLeft: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#64748b',
    marginBottom: 4,
  },
  ticketSubject: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'capitalize',
  },
  ticketDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  botBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  botBadgeText: {
    fontSize: 10,
    color: '#8b5cf6',
    fontFamily: 'Poppins-SemiBold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    backgroundColor: '#fff',
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  chatDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: '#94a3b8',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    maxWidth: '85%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarBot: {
    backgroundColor: '#8b5cf6',
  },
  avatarAgent: {
    backgroundColor: '#3b82f6',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  messageBubbleUser: {
    backgroundColor: '#22c55e',
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageBubbleBot: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  messageBubbleLastLeft: {
    borderBottomLeftRadius: 6,
  },
  messageBubbleLastRight: {
    borderBottomRightRadius: 6,
  },
  senderLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
    fontFamily: 'Poppins-Medium',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#94a3b8',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 14,
    color: '#1e293b',
    fontFamily: 'Poppins-Regular',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    gap: 8,
  },
  closedBannerText: {
    fontSize: 14,
    color: '#15803d',
    fontFamily: 'Poppins-Medium',
    textTransform: 'capitalize',
  },
  rateBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  rateBannerButtonText: {
    fontSize: 12,
    color: '#d97706',
    fontFamily: 'Poppins-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  ratingModal: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  ratingHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  feedbackInput: {
    width: '100%',
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  ratingBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  ratingBtnSecondaryText: {
    fontSize: 15,
    color: '#64748b',
    fontFamily: 'Poppins-SemiBold',
  },
  ratingBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  ratingBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  ratingBtnPrimaryText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
});
