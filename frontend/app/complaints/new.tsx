import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, FileText, Send, Paperclip } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';

const categories = [
  'Order Issue',
  'Product Quality',
  'Delivery Problem',
  'Payment Issue',
  'Technical Issue',
  'General Inquiry',
  'Suggestion',
  'Other',
];

export default function NewComplaintScreen() {
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
    orderId: '',
  });
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleSubmit = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Submit Complaint',
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
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Subject</Text>
                <View style={styles.inputWrapper}>
                  <FileText size={20} color={Colors.neutralMedium} />
                  <TextInput
                    style={styles.input}
                    placeholder="Brief description of your issue"
                    placeholderTextColor={Colors.neutralMedium}
                    value={formData.subject}
                    onChangeText={(text) =>
                      setFormData({ ...formData, subject: text })
                    }
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesRow}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        formData.category === category && styles.categoryChipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          formData.category === category && styles.categoryTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Order ID (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., #ORD-2024-001"
                    placeholderTextColor={Colors.neutralMedium}
                    value={formData.orderId}
                    onChangeText={(text) =>
                      setFormData({ ...formData, orderId: text })
                    }
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Provide detailed information about your complaint..."
                  placeholderTextColor={Colors.neutralMedium}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={styles.attachButton}>
                <Paperclip size={20} color={Colors.primary900} />
                <Text style={styles.attachText}>Attach Files (Optional)</Text>
              </TouchableOpacity>

              <Button
                title="Submit Complaint"
                onPress={handleSubmit}
                icon={<Send size={20} color={Colors.neutralWhite} />}
                variant="primary"
              />
            </View>
          </ScrollView>
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
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 56,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    height: '100%',
  },
  textArea: {
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    minHeight: 120,
  },
  categoriesRow: {
    gap: Spacing.sm,
  },
  categoryChip: {
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  categoryText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontWeight: Typography.semibold,
  },
  categoryTextActive: {
    color: Colors.neutralWhite,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  attachText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
});
