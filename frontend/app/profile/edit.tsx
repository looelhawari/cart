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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Camera, Save } from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";

export default function EditProfileScreen() {
  const { user, updateProfile } = useStore();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || "");
  const [gender, setGender] = useState<"male" | "female" | "other">(
    user?.gender || "male"
  );

  const handleSave = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    updateProfile({
      name,
      email,
      phone,
      dateOfBirth,
      gender,
    });

    Alert.alert("Success", "Profile updated successfully", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const handleChangePhoto = () => {
    Alert.alert("Change Photo", "Photo upload feature (coming soon)");
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

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Save size={20} color={Colors.primary900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
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
          </View>
          <Text style={styles.photoLabel}>Change Photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your first name"
              placeholderTextColor={Colors.neutralMedium}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your last name"
              placeholderTextColor={Colors.neutralMedium}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.neutralMedium}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor={Colors.neutralMedium}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.neutralMedium}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
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
                  Male
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
                  Female
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
                  Other
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
            <Text style={styles.changePasswordText}>Change Password</Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.9}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  saveButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
