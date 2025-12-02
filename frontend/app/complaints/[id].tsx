import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';

interface Message {
  id: string;
  text: string;
  isAdmin: boolean;
  timestamp: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    text: 'I received a damaged product in my order #ORD-2024-001. The milk carton was leaking.',
    isAdmin: false,
    timestamp: '2024-01-20 10:30 AM',
  },
  {
    id: '2',
    text: 'We apologize for the inconvenience. We will issue a full refund and send a replacement. Please allow 24-48 hours for processing.',
    isAdmin: true,
    timestamp: '2024-01-20 11:15 AM',
  },
  {
    id: '3',
    text: 'Thank you! When can I expect the replacement?',
    isAdmin: false,
    timestamp: '2024-01-20 11:20 AM',
  },
];

export default function ComplaintDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');

  const complaint = {
    ticketNumber: '#TKT-001',
    subject: 'Damaged Product Received',
    category: 'Product Quality',
    status: 'in_progress',
    priority: 'high',
    date: '2024-01-20',
    orderId: '#ORD-2024-001',
  };

  const handleSend = () => {
    if (message.trim()) {
      setMessage('');
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
          title: complaint.ticketNumber,
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
                  <Text style={styles.metaText}>Category: {complaint.category}</Text>
                  <Text style={styles.metaText}>•</Text>
                  <Text style={styles.metaText}>Priority: {complaint.priority.toUpperCase()}</Text>
                </View>
                {complaint.orderId && (
                  <Text style={styles.orderId}>Related Order: {complaint.orderId}</Text>
                )}
              </View>

              <View style={styles.messagesSection}>
                {mockMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageCard,
                      msg.isAdmin ? styles.adminMessage : styles.userMessage,
                    ]}
                  >
                    <Text style={styles.messageSender}>
                      {msg.isAdmin ? 'Support Team' : 'You'}
                    </Text>
                    <Text style={styles.messageText}>{msg.text}</Text>
                    <Text style={styles.messageTime}>{msg.timestamp}</Text>
                  </View>
                ))}
              </View>
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
                  !message.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!message.trim()}
              >
                <Send size={20} color={Colors.neutralWhite} />
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
  messagesSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
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
