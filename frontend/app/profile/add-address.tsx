import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Home,
  Briefcase,
  Tag,
  Map,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { Button } from "@/components/Button";
import { addressApi } from "@/services/api";

type AddressLabel = "Home" | "Work" | "Other";

export default function AddAddressScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>("Home");
  const [customLabel, setCustomLabel] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (id) {
      loadAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAddress = async () => {
    try {
      setLoading(true);
      const response: any = await addressApi.getAddress(Number(id));
      const address = response.data;
      setSelectedLabel(
        address.label in ["Home", "Work"] ? address.label : "Other"
      );
      if (!["Home", "Work"].includes(address.label)) {
        setCustomLabel(address.label);
      }
      setStreet(address.street);
      setCity(address.city);
      setIsDefault(address.is_default);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load address"
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const labels: { label: AddressLabel; icon: typeof Home }[] = [
    { label: "Home", icon: Home },
    { label: "Work", icon: Briefcase },
    { label: "Other", icon: Tag },
  ];

  const handleSave = async () => {
    try {
      setLoading(true);
      const label = selectedLabel === "Other" ? customLabel : selectedLabel;
      const addressData = {
        label,
        street,
        city,
        is_default: isDefault,
      };

      if (id) {
        await addressApi.updateAddress(Number(id), addressData);
      } else {
        await addressApi.createAddress(addressData);
      }

      router.back();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save address"
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const hasLabel = selectedLabel !== "Other" || customLabel.trim() !== "";
    return hasLabel && street && city;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: id ? "Edit Address" : "Add New Address",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {loading && id ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary900} />
            <Text style={styles.loadingText}>Loading address...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <TouchableOpacity
                style={styles.locationButton}
                activeOpacity={0.7}
              >
                <Map size={20} color={Colors.primary900} />
                <Text style={styles.locationButtonText}>
                  Use Current Location
                </Text>
              </TouchableOpacity>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Address Label</Text>
                <View style={styles.labelsRow}>
                  {labels.map(({ label, icon: Icon }) => (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.labelButton,
                        selectedLabel === label && styles.labelButtonSelected,
                      ]}
                      onPress={() => setSelectedLabel(label)}
                      activeOpacity={0.7}
                    >
                      <Icon
                        size={20}
                        color={
                          selectedLabel === label
                            ? Colors.primary900
                            : Colors.neutralMedium
                        }
                      />
                      <Text
                        style={[
                          styles.labelText,
                          selectedLabel === label && styles.labelTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedLabel === "Other" && (
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter custom label (e.g., Mom's House)"
                      placeholderTextColor={Colors.neutralMedium}
                      value={customLabel}
                      onChangeText={setCustomLabel}
                    />
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Address Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Street Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123 Main Street, Apt 4B, Floor 3"
                    placeholderTextColor={Colors.neutralMedium}
                    value={street}
                    onChangeText={setStreet}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Cairo"
                    placeholderTextColor={Colors.neutralMedium}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setIsDefault(!isDefault)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    isDefault && styles.checkboxBoxChecked,
                  ]}
                >
                  {isDefault && <View style={styles.checkboxCheck} />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>

              <Button
                title="Save Address"
                onPress={handleSave}
                variant="primary"
                disabled={!isFormValid()}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    padding: Spacing.lg,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary900,
    marginBottom: Spacing.lg,
  },
  locationButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  labelsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  labelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
  },
  labelButtonSelected: {
    borderColor: Colors.primary900,
    backgroundColor: `${Colors.primary900}10`,
  },
  labelText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontWeight: Typography.semibold,
  },
  labelTextSelected: {
    color: Colors.primary900,
  },
  inputGroup: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  input: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary900,
  },
  checkboxCheck: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Colors.neutralWhite,
  },
  checkboxLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
});
