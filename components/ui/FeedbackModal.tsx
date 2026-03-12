

import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { ModernModal } from './ModernModal';

interface FeedbackModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info' | string;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void; // For confirming actions like "Are you sure?"
    confirmText?: string;
}

export function FeedbackModal({ visible, type, title, message, onClose, onConfirm, confirmText }: FeedbackModalProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    let iconName = 'check-circle';
    let color = colors.success;

    switch (type) {
        case 'error': iconName = 'exclamation-circle'; color = colors.danger; break;
        case 'warning': iconName = 'exclamation-triangle'; color = '#FFA500'; break;
        case 'info': iconName = 'info-circle'; color = colors.primary; break;
    }

    const isSuccess = type === 'success';

    return (
        <ModernModal visible={visible} title="" onClose={onClose} hideHeader>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <FontAwesome name={iconName as any} size={32} color={color} />
                </View>

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>

                <View style={styles.actions}>
                    {onConfirm ? (
                        <>
                            <AppButton
                                title="Cancel"
                                onPress={onClose}
                                variant="outline"
                                style={{ flex: 1, marginRight: 8, height: 36, paddingVertical: 0 }}
                                textStyle={{ fontSize: 14 }}
                            />
                            <AppButton
                                title={confirmText || "Confirm"}
                                onPress={() => { onConfirm(); onClose(); }}
                                style={{ flex: 1, backgroundColor: color, height: 36, paddingVertical: 0 }}
                                textStyle={{ fontSize: 14 }}
                            />
                        </>
                    ) : (
                        <AppButton
                            title={isSuccess ? "Ok!" : "Close"}
                            onPress={onClose}
                            style={{ width: '100%', backgroundColor: color, height: 36, paddingVertical: 0 }}
                            textStyle={{ fontSize: 14 }}
                        />
                    )}
                </View>
            </View>
        </ModernModal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    iconContainer: {
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        textAlign: 'center',
        color: colors.text,
    },
    message: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
    }
});
