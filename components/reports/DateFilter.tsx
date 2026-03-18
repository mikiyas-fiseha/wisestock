import { Layout } from '@/constants/Colors';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type DatePeriod = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
    start: Date;
    end: Date;
}

interface DateFilterProps {
    period: DatePeriod;
    onPeriodChange: (period: DatePeriod) => void;
    customRange: DateRange;
    onCustomRangeChange: (range: DateRange) => void;
}

export const DateFilter = ({ period, onPeriodChange, customRange, onCustomRangeChange }: DateFilterProps) => {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [modalVisible, setModalVisible] = useState(false);
    const [tempStart, setTempStart] = useState('');
    const [tempEnd, setTempEnd] = useState('');

    const openCustom = () => {
        setTempStart(customRange.start.toISOString().split('T')[0]); // YYYY-MM-DD
        setTempEnd(customRange.end.toISOString().split('T')[0]);
        setModalVisible(true);
    };

    const applyCustom = () => {
        const start = new Date(tempStart);
        const end = new Date(tempEnd);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            // Set end time to end of day
            end.setHours(23, 59, 59, 999);
            onCustomRangeChange({ start, end });
            onPeriodChange('custom');
        }
        setModalVisible(false);
    };

    const QuickChip = ({ label, value }: { label: string; value: DatePeriod }) => (
        <TouchableOpacity
            style={[styles.chip, period === value && styles.chipActive]}
            onPress={() => value === 'custom' ? openCustom() : onPeriodChange(value)}
        >
            <Text style={[styles.chipText, period === value && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <QuickChip label="Today" value="today" />
                <QuickChip label="7D" value="week" />
                <QuickChip label="30D" value="month" />
                <QuickChip label={period === 'custom' ? `${customRange.start.getDate()}/${customRange.start.getMonth() + 1}` : "Custom"} value="custom" />
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Custom Range</Text>
                        <Text style={styles.modalSubtitle}>Format: YYYY-MM-DD</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Start Date</Text>
                            <TextInput
                                style={styles.input}
                                value={tempStart}
                                onChangeText={setTempStart}
                                placeholder="2024-01-01"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>End Date</Text>
                            <TextInput
                                style={styles.input}
                                value={tempEnd}
                                onChangeText={setTempEnd}
                                placeholder="2024-01-31"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.submit]} onPress={applyCustom}>
                                <Text style={styles.buttonTextSubmit}>Apply Range</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Also export a helper to get dates for presets
export const getRangeForPeriod = (period: DatePeriod, currentCustom: { start: Date; end: Date }) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (period === 'today') {
        start.setHours(0, 0, 0, 0);
        return { start, end };
    }
    if (period === 'week') {
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { start, end };
    }
    if (period === 'month') {
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { start, end };
    }
    return currentCustom;
};

import { useTheme } from '@/context/ThemeContext';
import { ScrollView } from 'react-native';

const createStyles = (colors: any) => StyleSheet.create({
    container: { marginBottom: 0 },
    scroll: { gap: 8 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: (colors.card + 'E0'),

    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: (colors.card + 'E0'),
        borderRadius: 16,
        padding: 24,
        ...Layout.shadows.medium,

    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: colors.text },
    modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: colors.text },
    input: {

        backgroundColor: 'transparent',
        color: colors.text,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
    cancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    submit: { backgroundColor: colors.primary },
    buttonTextCancel: { fontWeight: '600', color: colors.textSecondary },
    buttonTextSubmit: { fontWeight: '600', color: '#fff' },
});
