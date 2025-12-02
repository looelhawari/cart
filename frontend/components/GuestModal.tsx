import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { X, ShoppingBag, Heart, Package } from 'lucide-react-native';

interface GuestModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

export function GuestModal({ visible, onClose, message = 'Sign in to continue' }: GuestModalProps) {
  const router = useRouter();

  const handleSignIn = () => {
    onClose();
    router.push('/(auth)/login');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/(auth)/signup');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <ShoppingBag size={48} color={Colors.primary900} />
            </View>
          </View>

          <Text style={styles.title}>{message}</Text>
          <Text style={styles.description}>
            Create an account or sign in to enjoy these benefits:
          </Text>

          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <Heart size={20} color={Colors.primary900} />
              <Text style={styles.benefitText}>Save your favorites</Text>
            </View>
            <View style={styles.benefitRow}>
              <Package size={20} color={Colors.primary900} />
              <Text style={styles.benefitText}>Track your orders</Text>
            </View>
            <View style={styles.benefitRow}>
              <ShoppingBag size={20} color={Colors.primary900} />
              <Text style={styles.benefitText}>Faster checkout</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Continue as Guest</Text>
          </TouchableOpacity>
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
  content: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralCloud,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary900}15`,
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
  description: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralMedium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  benefits: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralCharcoal,
  },
  signInButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  signInButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_700Bold',
  },
  signUpButton: {
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    marginBottom: Spacing.md,
  },
  signUpButtonText: {
    color: Colors.neutralCharcoal,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_600SemiBold',
  },
  cancelButton: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  cancelText: {
    fontSize: Typography.bodyMedium,
    fontFamily: 'Poppins_500Medium',
    color: Colors.neutralMedium,
  },
});
