
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface AppTextInputProps extends TextInputProps {
    label?: string;
    error?: string;
    prefix?: string;
    icon?: keyof typeof FontAwesome.glyphMap;
}

export function AppTextInput({ label, error, style, prefix, icon, ...props }: AppTextInputProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                {icon && (
                    <FontAwesome name={icon} size={16} color={colors.primary} style={styles.icon} />
                )}
                {prefix && <Text style={styles.prefix}>{prefix}</Text>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={colors.textSecondary}
                    {...props}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: colors.text,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: colors.background === '#09090B' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        height: 48,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: '100%',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    icon: {
        marginRight: 10,
        marginLeft: 12,
    },
    prefix: {
        fontSize: 16,
        color: colors.textSecondary,
        marginRight: 4,
    },
    inputError: {
        borderColor: colors.danger,
    },
    errorText: {
        color: colors.danger,
        fontSize: 12,
        marginTop: 4,
    },
});
