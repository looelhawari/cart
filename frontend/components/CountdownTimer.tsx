import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
    endDate: string;
    onExpire?: () => void;
    compact?: boolean;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
    endDate,
    onExpire,
    compact = false
}) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    useEffect(() => {
        const calculateTimeLeft = (): TimeLeft | null => {
            const difference = new Date(endDate).getTime() - new Date().getTime();

            if (difference <= 0) {
                onExpire?.();
                return null;
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [endDate, onExpire]);

    if (!timeLeft) {
        return null;
    }

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <Text style={styles.compactText}>
                    Ends in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Ends in:</Text>
            <View style={styles.timerRow}>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>Days</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>Hours</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>Mins</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>Secs</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        fontWeight: '600',
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeBlock: {
        alignItems: 'center',
        minWidth: 50,
    },
    timeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    timeLabel: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
    },
    separator: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginHorizontal: 4,
    },
    compactContainer: {
        backgroundColor: '#FFF3F0',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    compactText: {
        fontSize: 12,
        color: '#FF3B30',
        fontWeight: '600',
    },
});
