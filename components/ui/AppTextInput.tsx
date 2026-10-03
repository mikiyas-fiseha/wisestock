import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface AppTextInputProps extends TextInputProps {
    label?: string;
    error?: string;
    prefix?: string;
    suffix?: string;
    icon?: keyof typeof FontAwesome.glyphMap;
    containerStyle?: any;
    rightIcon?: keyof typeof FontAwesome.glyphMap;
    onRightIconPress?: () => void;
    rightIconAccessibilityLabel?: string;
    rightElement?: React.ReactNode;
}

export function AppTextInput({
    label,
    error,
    style,
    prefix,
    suffix,
    icon,
    rightIcon,
    onRightIconPress,
    rightIconAccessibilityLabel,
    rightElement,
    containerStyle,
    onFocus,
    onBlur,
    ...props
}: AppTextInputProps) {
    const { colors, theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const isMultiline = props.multiline;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused,
                    error ? styles.inputError : null,
                    isMultiline ? { alignItems: 'flex-start', paddingTop: 8 } : { alignItems: 'center' },
                ]}
            >
                {icon && (
                    <FontAwesome
                        name={icon}
                        size={15}
                        color={isFocused ? colors.primary : colors.textSecondary}
                        style={[styles.icon, isMultiline && { marginTop: 4 }]}
                    />
                )}
                {prefix && <Text style={[styles.prefix, isMultiline && { marginTop: 4 }]}>{prefix}</Text>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={colors.textSecondary}
                    textAlignVertical={isMultiline ? 'top' : 'center'}
                    onFocus={(e) => {
                        setIsFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur?.(e);
                    }}
                    {...props}
                />
                {suffix && <Text style={[styles.suffix, isMultiline && { marginTop: 4 }]}>{suffix}</Text>}
                {rightIcon && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                        style={styles.rightIconContainer}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={
                            rightIconAccessibilityLabel ||
                            (rightIcon.includes('slash') ? 'Hide password' : rightIcon.includes('eye') ? 'Show password' : 'Toggle action')
                        }
                    >
                        <FontAwesome
                            name={rightIcon}
                            size={16}
                            color={isFocused ? colors.primary : colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
                {rightElement}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
    container: {
        marginBottom: Layout.spacing.md,
        width: '100%',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        color: colors.text,
        letterSpacing: -0.2,
    },
    inputContainer: {
        flexDirection: 'row',
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Layout.borderRadius.md,
        minHeight: 46,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        } as any : {}),
    },
    inputFocused: {
        borderColor: colors.primary,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 0 0 3px ${colors.ring || 'rgba(99, 102, 241, 0.25)'}`,
        } as any : {}),
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        paddingHorizontal: 12,
        minHeight: 46,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    icon: {
        marginRight: 8,
        marginLeft: 14,
    },
    prefix: {
        fontSize: 15,
        color: colors.textSecondary,
        marginLeft: 12,
        marginRight: -4,
    },
    suffix: {
        fontSize: 15,
        color: colors.textSecondary,
        marginRight: 12,
        marginLeft: -4,
    },
    rightIconContainer: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputError: {
        borderColor: colors.danger,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.25)`,
        } as any : {}),
    },
    errorText: {
        color: colors.danger,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        marginLeft: 2,
    },
});
