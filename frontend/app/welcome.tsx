import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🛒</Text>
          </View>
          <Text style={styles.brandName}>ELBARAKA</Text>
          <Text style={styles.tagline}>Your daily groceries delivered fresh</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.guestButton}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxxl,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary900,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 72,
  },
  brandName: {
    fontSize: 42,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary900,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.bodyLarge,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralMedium,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_700Bold',
  },
  secondaryButton: {
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  secondaryButtonText: {
    color: Colors.neutralCharcoal,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_600SemiBold',
  },
  guestButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  guestButtonText: {
    color: Colors.neutralMedium,
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_500Medium',
  },
});
