import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import type { TrackingTimelineStep } from "@/services/api/trackingApi";

interface OrderStatusBarProps {
    timeline: TrackingTimelineStep[];
    currentStatus: string;
}

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    pending: "receipt-outline",
    confirmed: "checkmark-circle-outline",
    preparing: "cube-outline",
    out_for_delivery: "car-outline",
    delivered: "checkmark-done-circle-outline",
};

export default function OrderStatusBar({ timeline, currentStatus }: OrderStatusBarProps) {
    return (
        <View style={styles.container}>
            {timeline.map((step, index) => {
                const isActive = step.status === currentStatus;
                const isCompleted = step.completed;
                const isLast = index === timeline.length - 1;
                const iconName = STEP_ICONS[step.status] || "ellipse-outline";

                return (
                    <View key={step.status} style={styles.stepRow}>
                        {/* Icon + connector line */}
                        <View style={styles.iconColumn}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    isCompleted && styles.iconCircleCompleted,
                                    isActive && styles.iconCircleActive,
                                ]}
                            >
                                <Ionicons
                                    name={isCompleted ? "checkmark" : (iconName as any)}
                                    size={isCompleted ? 14 : 16}
                                    color={isCompleted || isActive ? "#fff" : Colors.neutralGray}
                                />
                            </View>
                            {!isLast && (
                                <View
                                    style={[
                                        styles.connector,
                                        isCompleted && styles.connectorCompleted,
                                    ]}
                                />
                            )}
                        </View>

                        {/* Label + time */}
                        <View style={styles.labelColumn}>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    (isCompleted || isActive) && styles.stepLabelActive,
                                    isActive && styles.stepLabelCurrent,
                                ]}
                            >
                                {step.label}
                            </Text>
                            {step.time && (
                                <Text style={styles.stepTime}>
                                    {new Date(step.time).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconColumn: {
        alignItems: "center",
        width: 32,
        marginRight: 12,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.neutralLight,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: Colors.neutralGray,
    },
    iconCircleCompleted: {
        backgroundColor: Colors.primary700,
        borderColor: Colors.primary700,
    },
    iconCircleActive: {
        backgroundColor: Colors.primary900,
        borderColor: Colors.primary900,
        shadowColor: Colors.primary900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    connector: {
        width: 2,
        height: 24,
        backgroundColor: Colors.neutralGray,
        marginVertical: 2,
    },
    connectorCompleted: {
        backgroundColor: Colors.primary700,
    },
    labelColumn: {
        flex: 1,
        paddingTop: 4,
        paddingBottom: 16,
    },
    stepLabel: {
        fontSize: 13,
        color: Colors.neutralGray,
        fontWeight: "500",
    },
    stepLabelActive: {
        color: Colors.neutralCharcoal,
    },
    stepLabelCurrent: {
        fontWeight: "700",
        color: Colors.primary900,
    },
    stepTime: {
        fontSize: 11,
        color: Colors.neutralMedium,
        marginTop: 2,
    },
});
