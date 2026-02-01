import React, { useEffect, useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, Check, CheckCheck } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Spacing from '@/constants/Spacing';
import {
  getComplaint,
  replyToComplaint,
  broadcastTyping,
  type ComplaintDetail,
  type ComplaintMessage,
} from '@/services/api/complaintsApi';
import echo from '@/services/echo';

// Format time
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Typing Indicator with better animations
const TypingIndicator = () => {
  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDotsContainer}>
          <Animated.View
            style={[styles.typingDot]}
            entering={FadeInUp.delay(0).duration(300)}
          />
          <Animated.View
            style={[styles.typingDot]}
            entering={FadeInUp.delay(100).duration(300)}
          />
          <Animated.View
            style={[styles.typingDot]}
            entering={FadeInUp.delay(200).duration(300)}
          />
        </View>
        <Text style={styles.typingText}>Support is typing...</Text>
      </View>
    </View>
  );
};

export default function ComplaintDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadComplaint = async () => {
    if (!id) return;
    try {
      setError(null);
      const response = await getComplaint(Number(id));
      if (!response.success || !response.data?.complaint) throw new Error('Failed to load');
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

  useEffect(() => {
    if (!id) return;

    const channel = echo.private(`complaints.${id}`)
      .listen('.message.sent', (event: { message: ComplaintMessage }) => {
        setComplaint(prev => {
          if (!prev) return prev;
          if (prev.messages?.some(m => m.id === event.message.id)) return prev;
          return { ...prev, messages: [...(prev.messages || []), event.message] };
        });
      })
      .listen('.user.typing', (event: { is_typing: boolean; is_admin: boolean }) => {
        if (event.is_admin) {
          setIsAdminTyping(event.is_typing);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (event.is_typing) {
            typingTimeoutRef.current = setTimeout(() => setIsAdminTyping(false), 3000);
          }
        }
      });

    return () => {
      echo.leave(`complaints.${id}`);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (sendTypingTimeoutRef.current) clearTimeout(sendTypingTimeoutRef.current);
    };
  }, [id]);

  const handleSend = async () => {
    if (!message.trim() || !id) return;

    const text = message.trim();
    setMessage('');
    setSending(true);

    const tempMsg: ComplaintMessage = {
      id: Date.now(),
      message: text,
      is_admin_reply: false,
      user: undefined,
      created_at: new Date().toISOString(),
    };

    setComplaint(prev => prev ? { ...prev, messages: [...(prev.messages || []), tempMsg] } : prev);

    try {
      await replyToComplaint(Number(id), text);
    } catch (err: any) {
      setError(err.message || 'Failed to send');
      setMessage(text);
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#fff7ed', color: '#f97316' };
      case 'in_progress': return { bg: '#eff6ff', color: '#3b82f6' };
      case 'resolved': return { bg: '#f0fdf4', color: '#22c55e' };
      default: return { bg: '#f9fafb', color: '#6b7280' };
    }
  };

  const renderMessage = ({ item, index }: { item: ComplaintMessage; index: number }) => {
    const isAdmin = item.is_admin_reply;
    const isLast = index === (complaint?.messages?.length || 0) - 1;

    return (
      <Animated.View
        style={[styles.msgRow, isAdmin ? styles.msgLeft : styles.msgRight]}
        entering={FadeInDown.duration(300).delay(50)}
      >
        <View style={[styles.bubble, isAdmin ? styles.bubbleLeft : styles.bubbleRight]}>
          <Text style={[styles.msgText, isAdmin ? styles.textLeft : styles.textRight]}>
            {item.message}
          </Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, isAdmin ? styles.timeLeft : styles.timeRight]}>
              {formatTime(item.created_at)}
            </Text>
            {!isAdmin && (
              <View style={{ marginLeft: 4 }}>
                {item.is_read ? (
                  <CheckCheck size={12} color="rgba(255,255,255,0.9)" />
                ) : (
                  <Check size={12} color="rgba(255,255,255,0.6)" />
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderHeader = () => {
    if (!complaint) return null;
    const status = complaint.status || 'open';
    const statusStyle = getStatusStyle(status);

    return (
      <View style={styles.header}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.ticketNum}>{complaint.ticket_number || 'N/A'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {(status || 'open').replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubject}>{complaint.subject || 'No subject'}</Text>
          <Text style={styles.headerDesc} numberOfLines={3}>{complaint.description || ''}</Text>
          <Text style={styles.headerTime}>{complaint.created_at ? formatTimeAgo(complaint.created_at) : ''}</Text>
        </View>
        <View style={styles.chatDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Messages</Text>
          <View style={styles.dividerLine} />
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ticket Details',
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          style={styles.flex}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary900} />
            </View>
          ) : !complaint ? (
            <View style={styles.center}>
              <AlertCircle size={48} color="#d1d5db" />
              <Text style={styles.errorText}>Ticket not found</Text>
            </View>
          ) : (
            <>
              {error && (
                <TouchableOpacity style={styles.errorBanner} onPress={() => setError(null)}>
                  <AlertCircle size={14} color="#fff" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </TouchableOpacity>
              )}

              <FlatList
                ref={flatListRef}
                data={complaint.messages || []}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={isAdminTyping ? <TypingIndicator /> : null}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#9ca3af"
                  value={message}
                  onChangeText={handleTyping}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!message.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBg: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backBtn: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9ca3af',
  },
  listContent: {
    padding: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketNum: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  headerSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  headerDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 10,
  },
  headerTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chatDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  msgRow: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  msgLeft: {
    alignSelf: 'flex-start',
  },
  msgRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleLeft: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#22c55e',
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textLeft: {
    color: '#1e293b',
  },
  textRight: {
    color: '#fff',
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  msgTime: {
    fontSize: 10,
  },
  timeLeft: {
    color: '#9ca3af',
  },
  timeRight: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingRow: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  typingText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
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
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#1e293b',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
});
