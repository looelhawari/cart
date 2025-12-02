import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { AlertTriangle } from 'lucide-react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {destructive && (
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <AlertTriangle size={32} color={Colors.accentRed} />
              </View>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                destructive && styles.destructiveButton,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.accentRed}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.h3,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralCharcoal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  cancelButtonText: {
    color: Colors.neutralCharcoal,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_600SemiBold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  destructiveButton: {
    backgroundColor: Colors.accentRed,
  },
  confirmButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_700Bold',
  },
});
