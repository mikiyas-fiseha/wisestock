
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface AppTextInputProps extends TextInputProps {
    label?: string;
    error?: string;
    prefix?: string;
    suffix?: string;
    icon?: keyof typeof FontAwesome.glyphMap;
    containerStyle?: any;
}

export function AppTextInput({ label, error, style, prefix, suffix, icon, containerStyle, ...props }: AppTextInputProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const isMultiline = props.multiline;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                error ? styles.inputError : null,
                isMultiline ? { alignItems: 'flex-start', paddingTop: 8 } : { alignItems: 'center' }
            ]}>
                {icon && (
                    <FontAwesome name={icon} size={16} color={colors.primary} style={[styles.icon, isMultiline && { marginTop: 4 }]} />
                )}
                {prefix && <Text style={[styles.prefix, isMultiline && { marginTop: 4 }]}>{prefix}</Text>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={colors.textSecondary}
                    textAlignVertical={isMultiline ? 'top' : 'center'}
                    {...props}
                />
                {suffix && <Text style={[styles.suffix, isMultiline && { marginTop: 4 }]}>{suffix}</Text>}
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
        backgroundColor: colors.background === '#09090B' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderWidth: 1,
        borderColor: colors.background === '#09090B' ? colors.border : 'rgba(0,0,0,0.12)',
        borderRadius: 8,
        minHeight: 48,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        paddingHorizontal: 12,
        minHeight: 48,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    icon: {
        marginRight: 10,
        marginLeft: 12,
    },
    prefix: {
        fontSize: 16,
        color: colors.textSecondary,
        marginLeft: 12,
        marginRight: -4,
    },
    suffix: {
        fontSize: 16,
        color: colors.textSecondary,
        marginRight: 12,
        marginLeft: -4,
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
