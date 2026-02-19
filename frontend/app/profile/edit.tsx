import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Save,
  Lock,
  Mail,
  ChevronRight,
  RefreshCw,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import { Toast } from "@/components/Toast";
import { profileApi } from "@/services/api/profileApi";
import Constants from "expo-constants";

// Guard: @react-native-google-signin crashes Expo Go
const isExpoGo = Constants.appOwnership === "expo";
let GoogleSignin: any = null;
if (!isExpoGo) {
  try {
    GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  } catch (e) {
    console.warn("Google Sign-In not available:", e);
  }
}

export default function EditProfileScreen() {
  const { user, updateProfile, fetchProfile } = useStore();
  const { t } = useTranslation();

  const isSocialOnly = user?.is_social_only === true;

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(() => {
    if (user?.date_of_birth) {
      // Parse as local date to avoid timezone shift ("2000-01-01" parsed as UTC midnight shifts back a day in UTC+ zones)
      const parts = user.date_of_birth.split("-");
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
    }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(
    user?.gender || null,
  );
  const [loading, setLoading] = useState(false);
  const [relinkLoading, setRelinkLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ visible: true, message, type });
  };

  const handleRelinkGoogle = async () => {
    if (!GoogleSignin) {
      showToast("Google Sign-In requires a development build", "error");
      return;
    }
    setRelinkLoading(true);
    try {
      // Trigger Google Sign-In picker to select the NEW account
      await GoogleSignin.hasPlayServices();
      // Sign out first to force the account picker to show
      try {
        await GoogleSignin.signOut();
      } catch { }
      const response = await GoogleSignin.signIn();
      const idToken = response?.data?.idToken;

      if (!idToken) {
        showToast(t.editProfile.relinkFailed, "error");
        return;
      }

      await profileApi.relinkGoogle({ id_token: idToken });
      await fetchProfile();
      showToast(t.editProfile.relinkSuccess, "success");
    } catch (error: any) {
      if (error?.code === "SIGN_IN_CANCELLED" || error?.code === "12501") {
        // User cancelled — do nothing
        return;
      }
      const msg = error?.message || t.editProfile.relinkFailed;
      showToast(msg, "error");
    } finally {
      setRelinkLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      showToast(t.editProfile.fillAllFields, "error");
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        first_name: firstName,
        last_name: lastName,
        phone,
      };

      // Only include date_of_birth if it has a value
      if (dateOfBirth) {
        // Format using local date parts to avoid UTC timezone shift
        const y = dateOfBirth.getFullYear();
        const m = String(dateOfBirth.getMonth() + 1).padStart(2, "0");
        const d = String(dateOfBirth.getDate()).padStart(2, "0");
        updateData.date_of_birth = `${y}-${m}-${d}`;
      }

      // Only include gender if it has a value
      if (gender) {
        updateData.gender = gender;
      }

      await updateProfile(updateData);
      await fetchProfile();

      showToast(t.editProfile.profileUpdated, "success");
      setTimeout(() => router.back(), 1200);
    } catch (error: any) {
      showToast(error.message || t.editProfile.failedToUpdate, "error");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateOfBirth(selectedDate);
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

        <Text style={styles.headerTitle}>{t.profile.editProfile}</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary900} />
          ) : (
            <Save size={20} color={Colors.primary900} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.editProfile.firstName} *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t.editProfile.enterFirstName}
              placeholderTextColor={Colors.neutralMedium}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.editProfile.lastName} *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t.editProfile.enterLastName}
              placeholderTextColor={Colors.neutralMedium}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.email}</Text>
            <View style={styles.emailContainer}>
              <View style={[styles.input, styles.emailInputReadOnly]}>
                <Mail
                  size={18}
                  color={Colors.neutralMedium}
                  style={{ marginRight: Spacing.xs }}
                />
                <Text style={styles.emailText} numberOfLines={1}>
                  {user?.email || ""}
                </Text>
                {isSocialOnly && (
                  <Lock size={16} color={Colors.neutralMedium} />
                )}
              </View>
              {isSocialOnly ? (
                <View>
                  <Text style={styles.emailHint}>
                    {t.editProfile.emailManagedByGoogle}
                  </Text>
                  <TouchableOpacity
                    style={styles.relinkButton}
                    onPress={handleRelinkGoogle}
                    activeOpacity={0.7}
                    disabled={relinkLoading}
                  >
                    {relinkLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.primary900}
                      />
                    ) : (
                      <>
                        <RefreshCw size={16} color={Colors.primary900} />
                        <Text style={styles.relinkText}>
                          {t.editProfile.relinkGoogle}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.changeEmailButton}
                  onPress={() => router.push("/profile/change-email" as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeEmailText}>
                    {t.editProfile.changeEmail}
                  </Text>
                  <ChevronRight size={16} color={Colors.primary900} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.phone} *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t.editProfile.enterPhone}
              placeholderTextColor={Colors.neutralMedium}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.editProfile.dateOfBirth}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateText,
                  !dateOfBirth && styles.placeholderText,
                ]}
              >
                {dateOfBirth
                  ? dateOfBirth.toLocaleDateString()
                  : t.editProfile.selectDateOfBirth}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.editProfile.gender}</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === "male" && styles.genderButtonActive,
                ]}
                onPress={() => setGender("male")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === "male" && styles.genderTextActive,
                  ]}
                >
                  {t.editProfile.male}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === "female" && styles.genderButtonActive,
                ]}
                onPress={() => setGender("female")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === "female" && styles.genderTextActive,
                  ]}
                >
                  {t.editProfile.female}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Change Password Button – hidden for social-only (no password) */}
          {!isSocialOnly && (
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => router.push("/profile/change-password" as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.changePasswordText}>
                {t.settings.changePassword}
              </Text>
            </TouchableOpacity>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.neutralWhite} />
            ) : (
              <Text style={styles.saveButtonText}>
                {t.editProfile.saveChanges}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  form: {
    paddingHorizontal: Spacing.lg,
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
  input: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  dateText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  placeholderText: {
    color: Colors.neutralMedium,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    alignItems: "center",
  },
  genderButtonActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  genderText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  genderTextActive: {
    color: Colors.neutralWhite,
  },
  changePasswordButton: {
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary900,
  },
  changePasswordText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  emailContainer: {
    gap: Spacing.xs,
  },
  emailInputReadOnly: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralCloud,
    borderColor: Colors.neutralLight,
  },
  emailText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  emailHint: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontStyle: "italic",
    marginTop: 2,
    paddingHorizontal: Spacing.xs,
  },
  changeEmailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  changeEmailText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  relinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  relinkText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  saveButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
