import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Lock, X } from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { API_BASE_URL } from "@/services/api/base";
import { useTranslation } from "@/i18n";

interface PasswordConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export default function PasswordConfirmModal({
  visible,
  onConfirm,
  onCancel,
  title,
  message,
}: PasswordConfirmModalProps) {
  const { t } = useTranslation();
  const displayTitle = title || t.ui.confirmPassword;
  const displayMessage = message || t.ui.confirmPasswordMessage;
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!password) {
      setError(t.ui.passwordRequired);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/confirm-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPassword("");
        onConfirm();
      } else {
        setError(data.message || t.ui.incorrectPassword);
      }
    } catch (err) {
      setError(t.ui.failedToVerifyPassword);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <X size={24} color={Colors.neutralMedium} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Lock size={48} color={Colors.primary700} />
          </View>

          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.message}>{displayMessage}</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={t.ui.enterYourPassword}
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError("");
              }}
              editable={!loading}
              autoFocus
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t.ui.cancel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>{t.ui.confirm}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  input: {
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.regular,
    color: Colors.neutralCharcoal,
  },
  inputError: {
    borderColor: Colors.accentRed,
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
    paddingVertical: Spacing.md,
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
  },
  confirmButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: "#fff",
  },
});
