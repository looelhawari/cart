import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { authApi } from "@/services/api";
import { useTranslation } from "@/i18n";

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    { text: t.changePassword.atLeast8Chars, met: newPassword.length >= 8 },
    {
      text: t.changePassword.containsUppercase,
      met: /[A-Z]/.test(newPassword),
    },
    {
      text: t.changePassword.containsLowercase,
      met: /[a-z]/.test(newPassword),
    },
    { text: t.changePassword.containsNumber, met: /[0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch =
    newPassword === confirmPassword && newPassword.length > 0;

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      Alert.alert(t.common.error, t.changePassword.enterCurrentPassword);
      return;
    }

    if (!allRequirementsMet) {
      Alert.alert(t.common.error, t.changePassword.meetRequirements);
      return;
    }

    if (!passwordsMatch) {
      Alert.alert(t.common.error, t.signup.passwordsNotMatch);
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      Alert.alert(t.common.success, t.changePassword.passwordUpdated, [
        { text: t.common.ok, onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error.message || t.changePassword.failedToUpdate,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.changePassword.title}</Text>

        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.changePassword.currentPassword}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t.changePassword.enterCurrentPasswordPlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrent(!showCurrent)}
              activeOpacity={0.7}
            >
              {showCurrent ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.changePassword.newPassword}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t.changePassword.enterNewPasswordPlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              secureTextEntry={!showNew}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNew(!showNew)}
              activeOpacity={0.7}
            >
              {showNew ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        {newPassword.length > 0 && (
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>
              {t.changePassword.passwordRequirements}
            </Text>
            {passwordRequirements.map((req, index) => (
              <View key={index} style={styles.requirementRow}>
                {req.met ? (
                  <Check size={16} color={Colors.primary700} />
                ) : (
                  <X size={16} color={Colors.neutralMedium} />
                )}
                <Text
                  style={[
                    styles.requirementText,
                    {
                      color: req.met ? Colors.primary700 : Colors.neutralMedium,
                    },
                  ]}
                >
                  {req.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {t.changePassword.confirmNewPassword}
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t.changePassword.confirmNewPasswordPlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirm(!showConfirm)}
              activeOpacity={0.7}
            >
              {showConfirm ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && (
            <Text
              style={[
                styles.matchText,
                {
                  color: passwordsMatch ? Colors.primary700 : Colors.accentRed,
                },
              ]}
            >
              {passwordsMatch
                ? t.changePassword.passwordsMatch
                : t.changePassword.passwordsNotMatch}
            </Text>
          )}
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={[
            styles.updateButton,
            (!allRequirementsMet ||
              !passwordsMatch ||
              !currentPassword ||
              loading) &&
              styles.updateButtonDisabled,
          ]}
          onPress={handleUpdatePassword}
          disabled={
            !allRequirementsMet ||
            !passwordsMatch ||
            !currentPassword ||
            loading
          }
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.neutralWhite} />
          ) : (
            <Text style={styles.updateButtonText}>
              {t.changePassword.updatePassword}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  requirementsCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  requirementsTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  requirementText: {
    fontSize: Typography.bodyMedium,
  },
  matchText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    marginTop: Spacing.xs,
  },
  updateButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  updateButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  updateButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
