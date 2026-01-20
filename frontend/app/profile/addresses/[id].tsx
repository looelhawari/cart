import React, { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Save, Home, Briefcase, MapPinned } from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { API_CONFIG } from "@/config/app.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "@/store";

type AddressLabel = "Home" | "Work" | "Other";

export default function AddEditAddressScreen() {
    const params = useLocalSearchParams();
    const addressId = params.id && params.id !== "new" ? params.id : null;
    const isEdit = !!addressId;
    const { user } = useStore();

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEdit);

    const [label, setLabel] = useState<AddressLabel>("Home");
    const [recipientName, setRecipientName] = useState("");
    const [phone, setPhone] = useState(user?.phone || "");
    const [street, setStreet] = useState("");
    const [building, setBuilding] = useState("");
    const [floor, setFloor] = useState("");
    const [apartment, setApartment] = useState("");
    const [city, setCity] = useState("");
    const [area, setArea] = useState("");
    const [landmark, setLandmark] = useState("");
    const [notes, setNotes] = useState("");
    const [isDefault, setIsDefault] = useState(false);

    const getToken = async () => {
        return await AsyncStorage.getItem("access_token");
    };

    useEffect(() => {
        if (isEdit) {
            loadAddress();
        }
    }, []);

    const loadAddress = async () => {
        try {
            setInitialLoading(true);
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/addresses/${addressId}`,
                {
                    headers: {
                        Authorization: `Bearer ${await getToken()}`,
                    },
                }
            );
            const data = await response.json();
            if (data.success) {
                const address = data.data;
                setLabel(address.label);
                setRecipientName(address.recipient_name);
                setPhone(address.phone);
                setStreet(address.street);
                setBuilding(address.building || "");
                setFloor(address.floor || "");
                setApartment(address.apartment || "");
                setCity(address.city);
                setArea(address.area || "");
                setLandmark(address.landmark || "");
                setNotes(address.notes || "");
                setIsDefault(address.is_default);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to load address");
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSave = async () => {
        if (!recipientName.trim()) {
            Alert.alert("Error", "Please enter recipient name");
            return;
        }
        if (!phone.trim()) {
            Alert.alert("Error", "Please enter phone number");
            return;
        }
        if (!street.trim()) {
            Alert.alert("Error", "Please enter street address");
            return;
        }
        if (!city.trim()) {
            Alert.alert("Error", "Please enter city");
            return;
        }

        setLoading(true);
        try {
            const addressData = {
                label,
                recipient_name: recipientName,
                phone,
                street,
                building: building || null,
                floor: floor || null,
                apartment: apartment || null,
                city,
                area: area || null,
                landmark: landmark || null,
                notes: notes || null,
                is_default: isDefault,
            };

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}/addresses/${addressId}`
                : `${API_CONFIG.BASE_URL}/addresses`;

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await getToken()}`,
                },
                body: JSON.stringify(addressData),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    "Success",
                    `Address ${isEdit ? "updated" : "added"} successfully`,
                    [
                        {
                            text: "OK",
                            onPress: () => router.back(),
                        },
                    ]
                );
            } else {
                Alert.alert("Error", data.message || "Failed to save address");
            }
        } catch (error: any) {
            Alert.alert("Error", "Failed to save address");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color={Colors.neutralCharcoal} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isEdit ? "Edit" : "Add"} Address
                    </Text>
                    <View style={styles.backButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary900} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={24} color={Colors.neutralCharcoal} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEdit ? "Edit" : "Add"} Address
                </Text>
                <TouchableOpacity
                    style={styles.saveHeaderButton}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.primary900} />
                    ) : (
                        <Save size={20} color={Colors.primary900} />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Address Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Address Type</Text>
                    <View style={styles.labelRow}>
                        <TouchableOpacity
                            style={[styles.labelButton, label === "Home" && styles.labelButtonActive]}
                            onPress={() => setLabel("Home")}
                            activeOpacity={0.7}
                        >
                            <Home
                                size={20}
                                color={label === "Home" ? Colors.neutralWhite : Colors.neutralMedium}
                            />
                            <Text
                                style={[
                                    styles.labelButtonText,
                                    label === "Home" && styles.labelButtonTextActive,
                                ]}
                            >
                                Home
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.labelButton, label === "Work" && styles.labelButtonActive]}
                            onPress={() => setLabel("Work")}
                            activeOpacity={0.7}
                        >
                            <Briefcase
                                size={20}
                                color={label === "Work" ? Colors.neutralWhite : Colors.neutralMedium}
                            />
                            <Text
                                style={[
                                    styles.labelButtonText,
                                    label === "Work" && styles.labelButtonTextActive,
                                ]}
                            >
                                Work
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.labelButton, label === "Other" && styles.labelButtonActive]}
                            onPress={() => setLabel("Other")}
                            activeOpacity={0.7}
                        >
                            <MapPinned
                                size={20}
                                color={label === "Other" ? Colors.neutralWhite : Colors.neutralMedium}
                            />
                            <Text
                                style={[
                                    styles.labelButtonText,
                                    label === "Other" && styles.labelButtonTextActive,
                                ]}
                            >
                                Other
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Contact Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Recipient Name <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter recipient name"
                            placeholderTextColor={Colors.neutralMedium}
                            value={recipientName}
                            onChangeText={setRecipientName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Phone Number <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+20 123 456 7890"
                            placeholderTextColor={Colors.neutralMedium}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                {/* Address Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Address Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Street Address <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Enter street address"
                            placeholderTextColor={Colors.neutralMedium}
                            value={street}
                            onChangeText={setStreet}
                            multiline
                            numberOfLines={2}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Building</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Building"
                                placeholderTextColor={Colors.neutralMedium}
                                value={building}
                                onChangeText={setBuilding}
                            />
                        </View>

                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Floor</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Floor"
                                placeholderTextColor={Colors.neutralMedium}
                                value={floor}
                                onChangeText={setFloor}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Apartment / Unit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Apartment or unit number"
                            placeholderTextColor={Colors.neutralMedium}
                            value={apartment}
                            onChangeText={setApartment}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            City <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter city"
                            placeholderTextColor={Colors.neutralMedium}
                            value={city}
                            onChangeText={setCity}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Area</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Area or district"
                            placeholderTextColor={Colors.neutralMedium}
                            value={area}
                            onChangeText={setArea}
                        />
                    </View>
                </View>

                {/* Additional Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Landmark (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nearby landmark for easy location"
                            placeholderTextColor={Colors.neutralMedium}
                            value={landmark}
                            onChangeText={setLandmark}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Delivery Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="E.g., Ring the doorbell, Call on arrival..."
                            placeholderTextColor={Colors.neutralMedium}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                {/* Set as Default */}
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setIsDefault(!isDefault)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
                        {isDefault && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={styles.checkboxLabel}>Set as default address</Text>
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.neutralWhite} />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {isEdit ? "Update" : "Save"} Address
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
    backButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    saveHeaderButton: {
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    section: {
        backgroundColor: Colors.neutralWhite,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.bodyLarge,
        fontWeight: Typography.bold,
        color: Colors.neutralCharcoal,
        marginBottom: Spacing.md,
    },
    labelRow: {
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
        paddingHorizontal: Spacing.sm,
        borderRadius: 12,
        backgroundColor: Colors.neutralCloud,
        borderWidth: 2,
        borderColor: Colors.neutralGray,
    },
    labelButtonActive: {
        backgroundColor: Colors.primary900,
        borderColor: Colors.primary900,
    },
    labelButtonText: {
        fontSize: Typography.bodyMedium,
        fontWeight: Typography.semibold,
        color: Colors.neutralMedium,
    },
    labelButtonTextActive: {
        color: Colors.neutralWhite,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.bodyMedium,
        fontWeight: Typography.semibold,
        color: Colors.neutralCharcoal,
        marginBottom: Spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    input: {
        backgroundColor: Colors.neutralCloud,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: Typography.bodyBase,
        color: Colors.neutralCharcoal,
        borderWidth: 2,
        borderColor: Colors.neutralGray,
        minHeight: 48,
    },
    textArea: {
        minHeight: 80,
        paddingTop: Spacing.sm,
        textAlignVertical: "top",
    },
    row: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    halfWidth: {
        flex: 1,
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.neutralWhite,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.neutralMedium,
        marginRight: Spacing.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxActive: {
        borderColor: Colors.primary900,
        backgroundColor: Colors.primary900,
    },
    checkboxInner: {
        width: 12,
        height: 12,
        borderRadius: 3,
        backgroundColor: Colors.neutralWhite,
    },
    checkboxLabel: {
        fontSize: Typography.bodyBase,
        color: Colors.neutralCharcoal,
        fontWeight: Typography.medium,
    },
    saveButton: {
        backgroundColor: Colors.primary900,
        paddingVertical: Spacing.md,
        borderRadius: 16,
        alignItems: "center",
        minHeight: 56,
        justifyContent: "center",
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
