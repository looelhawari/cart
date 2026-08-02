import React from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useTranslation } from "@/i18n";

/**
 * Shared id linking a `TextInput`'s `inputAccessoryViewID` to the Done bar.
 * A single id is safe because only one input is focused at a time.
 */
export const PHONE_INPUT_ACCESSORY_ID = "phoneInputDone";

interface KeyboardDoneAccessoryProps {
  /** Must match the `inputAccessoryViewID` on the paired TextInput. */
  nativeID: string;
  /** Optional extra action after the keyboard is dismissed. */
  onDone?: () => void;
}

/**
 * iOS-only toolbar shown above the keyboard with a native "Done" button.
 *
 * This exists because iOS `keyboardType="phone-pad"` (and other numeric
 * keypads) render no Return/Done key, leaving users unable to dismiss the
 * keyboard. Pair it with a `TextInput` via `inputAccessoryViewID`.
 *
 * On Android it renders nothing and the paired `inputAccessoryViewID` prop is
 * ignored by the platform, so Android keyboard behavior is unaffected.
 */
export default function KeyboardDoneAccessory({
  nativeID,
  onDone,
}: KeyboardDoneAccessoryProps) {
  const { t } = useTranslation();

  if (Platform.OS !== "ios") return null;

  const handleDone = () => {
    Keyboard.dismiss();
    onDone?.();
  };

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={handleDone}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t.common.done}
        >
          <Text style={styles.doneText}>{t.common.done}</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutralGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  doneText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
});
