import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import {
  getComplaint,
  replyToComplaint,
  type ComplaintDetail,
} from '@/services/api/complaintsApi';

export default function ComplaintDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSend = async () => {
    if (!message.trim() || !complaint) return;
    try {
      setSending(true);
      await replyToComplaint(complaint.id, message.trim());
      setMessage('');
      await loadComplaint();
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.accentOrange;
      case 'in_progress':
        return Colors.primary700;
      case 'resolved':
        return Colors.primary900;
      case 'closed':
        return Colors.neutralMedium;
      default:
        return Colors.neutralMedium;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: complaint?.ticket_number || 'Complaint',
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
              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary900} />
                  <Text style={styles.loadingText}>Loading complaint...</Text>
                </View>
              )}
              {error && <Text style={styles.errorText}>{error}</Text>}
              {!loading && !complaint && (
                <Text style={styles.errorText}>Complaint not found</Text>
              )}
              {complaint && (
                <>
                  <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                      <Text style={styles.subject}>{complaint.subject}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${getStatusColor(complaint.status)}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(complaint.status) },
                          ]}
                        >
                          {complaint.status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        Category: {complaint.category.replace('_', ' ')}
                      </Text>
                    </View>
                    {complaint.order_id && (
                      <Text style={styles.orderId}>
                        Related Order: #{complaint.order_id}
                      </Text>
                    )}
                    <Text style={styles.descriptionText}>
                      {complaint.description}
                    </Text>
                  </View>

                  <View style={styles.messagesSection}>
                    {(complaint.messages || []).map((msg) => (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageCard,
                          msg.is_admin_reply ? styles.adminMessage : styles.userMessage,
                        ]}
                      >
                        <Text style={styles.messageSender}>
                          {msg.is_admin_reply ? 'Support Team' : 'You'}
                        </Text>
                        <Text style={styles.messageText}>{msg.message}</Text>
                        <Text style={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    {(complaint.messages || []).length === 0 && (
                      <View style={styles.emptyMessages}>
                        <AlertCircle size={40} color={Colors.neutralMedium} />
                        <Text style={styles.emptyText}>No messages yet</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.inputSection}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor={Colors.neutralMedium}
                value={message}
                onChangeText={setMessage}
                multiline
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
  content: {
    padding: Spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  errorText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    marginBottom: Spacing.sm,
  },
  headerCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  subject: {
    flex: 1,
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  orderId: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  descriptionText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  messagesSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginTop: Spacing.sm,
  },
  messageCard: {
    borderRadius: 16,
    padding: Spacing.md,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary900,
  },
  adminMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.neutralWhite,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  messageSender: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    marginBottom: 4,
  },
  messageText: {
    fontSize: Typography.bodyBase,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: Typography.bodySmall,
    opacity: 0.7,
  },
  inputSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralGray,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.neutralLight,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
});
