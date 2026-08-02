import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Phone, X } from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import {
  normalizeEgyptianMobile,
  sanitizeEgyptianMobileInput,
} from "@/utils/egyptianMobile";
import KeyboardDoneAccessory, {
  PHONE_INPUT_ACCESSORY_ID,
} from "@/components/KeyboardDoneAccessory";

interface PhoneNumberModalProps {
  visible: boolean;
  /** Called after the phone number is validated and saved successfully. */
  onSuccess: () => void;
  /** Called when the user dismisses the modal without saving. */
  onClose: () => void;
  title?: string;
  message?: string;
}

/**
 * Reusable modal that asks the user to complete a mandatory Egyptian mobile
 * number and saves it via the profile update endpoint. Validation reuses the
 * shared {@link normalizeEgyptianMobile} rules (010/011/012/015 + 8 digits) so
 * the rules stay identical to registration and the profile screen.
 *
 * On success it calls {@link PhoneNumberModalProps.onSuccess}, letting the
 * caller resume whatever flow was interrupted (e.g. placing an order).
 */
export default function PhoneNumberModal({
  visible,
  onSuccess,
  onClose,
  title,
  message,
}: PhoneNumberModalProps) {
  const { t } = useTranslation();
  const updateProfile = useStore((state) => state.updateProfile);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayTitle = title || t.auth.phoneRequiredTitle;
  const displayMessage = message || t.auth.googlePhoneRequiredMessage;

  const reset = () => {
    setPhone("");
    setError("");
  };

  const handleSave = async () => {
    if (loading) return;

    // Dismiss the keyboard before validating so the result (error text or the
    // resumed checkout flow) is fully visible and the primary action feels final.
    Keyboard.dismiss();

    const trimmed = phone.trim();
    if (!trimmed) {
      setError(t.signup.enterPhone);
      return;
    }

    const validation = normalizeEgyptianMobile(trimmed, t.signup.invalidEgyptPhone);
    if (!validation.normalized) {
      setError(validation.error || t.signup.invalidEgyptPhone);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Persists via PUT /profile, which re-validates the number and enforces
      // uniqueness on the backend before the store user is updated.
      await updateProfile({ phone: validation.normalized });
      reset();
      onSuccess();
    } catch (err: any) {
      setError(err?.message || t.signup.invalidEgyptPhone);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      {/* Tapping the backdrop dismisses the keyboard (an intuitive iOS escape
          hatch) without closing the mandatory modal. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Absorb card taps so they don't bubble to the backdrop; tapping a
              non-interactive part of the card also dismisses the keyboard. */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={loading}
          >
            <X size={24} color={Colors.neutralMedium} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Phone size={40} color={Colors.primary700} />
          </View>

          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.message}>{displayMessage}</Text>

          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
              <View style={styles.countryCodePill}>
                <Text style={styles.countryCodeText}>+20</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="1012345678"
                placeholderTextColor={Colors.neutralMedium}
                value={phone}
                onChangeText={(text) => {
                  setPhone((current) => sanitizeEgyptianMobileInput(text, current));
                  setError("");
                }}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                inputAccessoryViewID={PHONE_INPUT_ACCESSORY_ID}
                editable={!loading}
                autoFocus
              />
            </View>
            <Text style={error ? styles.errorText : styles.helperText}>
              {error || t.signup.phoneHelper}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText} numberOfLines={1}>
                {t.common.cancel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText} numberOfLines={1}>
                  {t.common.save}
                </Text>
              )}
            </TouchableOpacity>
          </View>
            </View>
          </TouchableWithoutFeedback>

          <KeyboardDoneAccessory nativeID={PHONE_INPUT_ACCESSORY_ID} />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    textAlign: "center",
    marginBottom: Spacing.sm,
    color: Colors.neutralCharcoal,
  },
  message: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.regular,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
  },
  inputError: {
    borderColor: Colors.accentRed,
  },
  countryCodePill: {
    paddingRight: Spacing.sm,
    marginRight: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.neutralGray,
  },
  countryCodeText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.regular,
    color: Colors.neutralCharcoal,
  },
  helperText: {
    color: Colors.neutralMedium,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.regular,
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.accentRed,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.regular,
    marginTop: Spacing.xs,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: Colors.neutralLight,
  },
  confirmButton: {
    backgroundColor: Colors.primary700,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
  confirmButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: "#fff",
    textAlign: "center",
  },
});
