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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, Paperclip, FileText, Check } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import {
  getComplaint,
  replyToComplaint,
  type ComplaintDetail,
  type ComplaintMessage,
} from '@/services/api/complaintsApi';
import echo from '@/services/echo';

export default function ComplaintDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadComplaint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getComplaint(Number(id));
      if (!response.success || !response.data?.complaint) {
        throw new Error('Failed to load complaint');
      }
      setComplaint(response.data.complaint);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    console.log(`Listening to complaints.${id}`);
    const channel = echo.private(`complaints.${id}`)
      .listen('message.sent', (event: { message: ComplaintMessage }) => {
        console.log('New message received:', event.message);
        setComplaint((prev) => {
          if (!prev) return prev;
          // Avoid duplicates
          if (prev.messages?.some((m) => m.id === event.message.id)) return prev;

          return {
            ...prev,
            messages: [...(prev.messages || []), event.message],
          };
        });
      });

    return () => {
      console.log(`Leaving complaints.${id}`);
      echo.leave(`complaints.${id}`);
    };
  }, [id]);

  const handleSend = async () => {
    if (!message.trim() || !complaint) return;
    try {
      setSending(true);
      await replyToComplaint(complaint.id, message.trim());
      setMessage('');

      // Optimistic update or reload
      await loadComplaint();
      // Scroll to bottom after reload
      if (flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return Colors.accentOrange;
      case 'in_progress': return Colors.primary700;
      case 'resolved': return Colors.primary900;
      case 'closed': return Colors.neutralMedium;
      default: return Colors.neutralMedium;
    }
  };

  const renderHeader = () => {
    if (!complaint) return null;
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.ticketNumber}>{complaint.ticket_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(complaint.status)}15` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>
                {complaint.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.subject}>{complaint.subject}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaLabel}>{complaint.category.replace('_', ' ')}</Text>
            </View>
            {complaint.order_id && (
              <View style={[styles.metaChip, styles.orderChip]}>
                <Text style={[styles.metaLabel, styles.orderLabel]}>Order #{complaint.order_id}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.descriptionText}>{complaint.description}</Text>

          {complaint.attachments && complaint.attachments.length > 0 && (
            <View style={styles.attachmentsRow}>
              {complaint.attachments.map((att) => (
                <View key={att.id} style={styles.attachmentChip}>
                  <Paperclip size={14} color={Colors.primary900} />
                  <Text style={styles.attachmentName} numberOfLines={1}>{att.file_name}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.timestamp}>
            Created on {new Date(complaint.created_at).toLocaleString()}
          </Text>
        </View>
        <View style={styles.chatDivider}>
          <Text style={styles.chatDividerText}>Conversation History</Text>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ComplaintMessage }) => {
    const isAdmin = item.is_admin_reply;
    return (
      <View style={[styles.messageRow, isAdmin ? styles.messageRowLeft : styles.messageRowRight]}>
        {isAdmin && (
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://ui-avatars.com/api/?name=Support&background=16a34a&color=fff' }}
              style={styles.avatar}
            />
          </View>
        )}
        <View style={[styles.messageBubble, isAdmin ? styles.bubbleLeft : styles.bubbleRight]}>
          <Text style={[styles.messageText, isAdmin ? styles.textLeft : styles.textRight]}>
            {item.message}
          </Text>
          <View style={styles.messageMeta}>
            <Text style={[styles.messageTime, isAdmin ? styles.timeLeft : styles.timeRight]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {!isAdmin && <Check size={12} color={Colors.primary100} style={{ marginLeft: 4 }} />}
          </View>
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={styles.keyboardView}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary900} />
            </View>
          ) : !complaint ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color={Colors.neutralMedium} />
              <Text style={styles.errorText}>Complaint not found</Text>
            </View>
          ) : (
            <>
              {error && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={Colors.neutralWhite} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                  <TouchableOpacity onPress={() => setError(null)}>
                    <Check size={16} color={Colors.neutralWhite} />
                  </TouchableOpacity>
                </View>
              )}
              <FlatList
                ref={flatListRef}
                data={[...(complaint.messages || [])].reverse()} // Reverse for inverted list
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={styles.listContent}
                ListFooterComponent={renderHeader} // Footer becomes header in inverted list
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Type your reply..."
                placeholderTextColor={Colors.neutralMedium}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!message.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!message.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Send size={20} color={Colors.neutralWhite} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.neutralMedium,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    padding: 8,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  // Header Styles
  headerContainer: {
    marginBottom: Spacing.lg,
  },
  headerCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.md,
    shadowColor: Colors.neutralCharcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: Colors.neutralMedium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutralCharcoal,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.neutralMedium,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  orderChip: {
    backgroundColor: `${Colors.primary900}10`,
  },
  orderLabel: {
    color: Colors.primary900,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralLight,
    marginVertical: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.neutralCharcoal,
    lineHeight: 22,
    marginBottom: 12,
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  attachmentName: {
    fontSize: 11,
    color: Colors.neutralCharcoal,
    maxWidth: 150,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.neutralMedium,
    textAlign: 'right',
  },
  chatDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  chatDividerText: {
    fontSize: 11,
    color: Colors.neutralMedium,
    fontWeight: '600',
    backgroundColor: Colors.neutralCloud,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
  },
  // Message Styles
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    minWidth: 100,
  },
  bubbleLeft: {
    backgroundColor: Colors.neutralWhite,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleRight: {
    backgroundColor: Colors.primary900,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  textLeft: {
    color: Colors.neutralCharcoal,
  },
  textRight: {
    color: Colors.neutralWhite,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 10,
  },
  timeLeft: {
    color: Colors.neutralMedium,
  },
  timeRight: {
    color: Colors.primary100,
    opacity: 0.8,
  },
  // Input Styles
  inputContainer: {
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.neutralLight,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.neutralCharcoal,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutralMedium,
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.neutralWhite,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
});
