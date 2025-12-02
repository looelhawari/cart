import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

export function Toast({ visible, message, type = 'info', onHide }: ToastProps) {
  const icon = {
    success: <CheckCircle size={24} color={Colors.neutralWhite} />,
    error: <AlertCircle size={24} color={Colors.neutralWhite} />,
    info: <Info size={24} color={Colors.neutralWhite} />,
  }[type];

  const backgroundColor = {
    success: Colors.primary700,
    error: Colors.accentRed,
    info: Colors.neutralCharcoal,
  }[type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.toastContainer, { backgroundColor }]}>
          {icon}
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity onPress={onHide} style={styles.closeButton}>
            <X size={20} color={Colors.neutralWhite} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          {message && <Text style={styles.loadingMessage}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
    backgroundColor: 'transparent',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_500Medium',
    color: Colors.neutralWhite,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 200,
  },
  loadingMessage: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_500Medium',
    color: Colors.neutralCharcoal,
    textAlign: 'center',
  },
});
