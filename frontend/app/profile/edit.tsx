import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Camera, Save, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { authApi } from "@/services/api";
import { useTranslation } from "@/i18n";

export default function EditProfileScreen() {
  const { user, updateProfile, fetchProfile } = useStore();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    user?.date_of_birth ? new Date(user.date_of_birth) : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(
    user?.gender || null,
  );
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      Alert.alert(t.common.error, t.editProfile.fillAllFields);
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      };

      // Only include date_of_birth if it has a value
      if (dateOfBirth) {
        updateData.date_of_birth = dateOfBirth.toISOString().split("T")[0];
      }

      // Only include gender if it has a value
      if (gender) {
        updateData.gender = gender;
      }

      await updateProfile(updateData);

      Alert.alert(t.common.success, t.editProfile.profileUpdated, [
        { text: t.common.ok, onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error.message || t.editProfile.failedToUpdate,
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t.editProfile.permissionRequired,
        t.editProfile.grantCameraRollPermission,
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t.editProfile.permissionRequired,
        t.editProfile.grantCameraPermission,
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      // Create form data
      const formData: any = new FormData();

      // Get file extension
      const fileExtension = uri.split(".").pop() || "jpg";
      const fileName = `avatar_${Date.now()}.${fileExtension}`;

      formData.append("avatar", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        type: `image/${fileExtension}`,
        name: fileName,
      } as any);

      await authApi.uploadAvatar(formData);
      await fetchProfile();
      Alert.alert(t.common.success, t.editProfile.pictureUpdated);
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error.message || t.editProfile.failedToUpload,
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      t.editProfile.changeProfilePicture,
      t.editProfile.chooseOption,
      [
        {
          text: t.editProfile.takePhoto,
          onPress: handleTakePhoto,
        },
        {
          text: t.editProfile.chooseFromLibrary,
          onPress: handlePickImage,
        },
        {
          text: t.common.cancel,
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const handleDeleteAvatar = async () => {
    Alert.alert(
      t.editProfile.deleteProfilePicture,
      t.editProfile.confirmDeletePicture,
      [
        {
          text: t.common.cancel,
          style: "cancel",
        },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: async () => {
            setUploadingAvatar(true);
            try {
              await authApi.deleteAvatar();
              await fetchProfile();
              Alert.alert(t.common.success, t.editProfile.pictureDeleted);
            } catch (error: any) {
              Alert.alert(
                t.common.error,
                error.message || t.editProfile.failedToDelete,
              );
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ],
    );
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
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {uploadingAvatar ? (
              <View style={styles.photoLoading}>
                <ActivityIndicator size="large" color={Colors.primary900} />
              </View>
            ) : (
              <>
                <Image
                  source={{
                    uri: user?.avatar || "https://i.pravatar.cc/300?img=12",
                  }}
                  style={styles.photo}
                />
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handleChangePhoto}
                  activeOpacity={0.9}
                >
                  <Camera size={20} color={Colors.neutralWhite} />
                </TouchableOpacity>
                {user?.avatar && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteAvatar}
                    activeOpacity={0.9}
                  >
                    <Trash2 size={18} color={Colors.neutralWhite} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          <Text style={styles.photoLabel}>{t.editProfile.changePhoto}</Text>
        </View>

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
            <Text style={styles.label}>{t.auth.email} *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t.editProfile.enterEmail}
              placeholderTextColor={Colors.neutralMedium}
              keyboardType="email-address"
              autoCapitalize="none"
            />
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

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === "other" && styles.genderButtonActive,
                ]}
                onPress={() => setGender("other")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === "other" && styles.genderTextActive,
                  ]}
                >
                  {t.editProfile.other}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={() => router.push("/profile/change-password" as any)}
            activeOpacity={0.9}
          >
            <Text style={styles.changePasswordText}>
              {t.settings.changePassword}
            </Text>
          </TouchableOpacity>

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
    paddingBottom: Spacing.xxl,
  },
  photoSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.neutralWhite,
    marginBottom: Spacing.lg,
  },
  photoContainer: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary900,
  },
  photoLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.primary900,
  },
  photoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.neutralWhite,
  },
  deleteButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.neutralWhite,
  },
  photoLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
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
