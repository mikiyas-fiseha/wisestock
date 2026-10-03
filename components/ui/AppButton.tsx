import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

interface AppButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'subtle';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export function AppButton({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
}: AppButtonProps) {
    const { colors, theme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);

    const getBackgroundColor = () => {
        if (disabled) return theme === 'dark' ? '#1E293B' : '#E2E8F0';
        switch (variant) {
            case 'primary': return colors.primary;
            case 'secondary': return colors.secondary;
            case 'danger': return colors.danger;
            case 'subtle': return colors.primaryLight;
            case 'outline':
            case 'ghost':
                return isHovered ? (theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent';
            default: return colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme === 'dark' ? '#64748B' : '#94A3B8';
        switch (variant) {
            case 'outline': return colors.primary;
            case 'ghost': return colors.text;
            case 'subtle': return colors.primary;
            default: return '#FFFFFF';
        }
    };

    const getBorder = () => {
        if (variant === 'outline') {
            return {
                borderWidth: 1,
                borderColor: disabled ? (theme === 'dark' ? '#334155' : '#CBD5E1') : colors.primary,
            };
        }
        if (variant === 'ghost') {
            return {
                borderWidth: 1,
                borderColor: isHovered ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
            };
        }
        return {};
    };

    const sizeStyle = () => {
        switch (size) {
            case 'sm':
                return { height: 36, paddingHorizontal: 12, borderRadius: Layout.borderRadius.sm };
            case 'lg':
                return { height: 52, paddingHorizontal: 22, borderRadius: Layout.borderRadius.md };
            case 'md':
            default:
                return { height: 46, paddingHorizontal: 16, borderRadius: Layout.borderRadius.md };
        }
    };

    const textFontSize = () => {
        switch (size) {
            case 'sm': return 13;
            case 'lg': return 16;
            case 'md':
            default: return 14;
        }
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                sizeStyle(),
                { backgroundColor: getBackgroundColor() },
                getBorder(),
                (variant === 'primary' || variant === 'danger') && !disabled && styles.elevatedButton,
                isHovered && !disabled && styles.hoveredButton,
                pressed && !disabled && styles.pressedButton,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            // @ts-ignore Web hover props
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {loading ? (
                <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            {
                                color: getTextColor(),
                                fontSize: textFontSize(),
                                marginLeft: icon ? 8 : 0,
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </Pressable>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 6,
        minWidth: 80,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.15s ease',
        } as any : {}),
    },
    elevatedButton: {
        ...(Platform.OS === 'web' ? {
            boxShadow: theme === 'dark'
                ? '0 4px 14px rgba(99, 102, 241, 0.35)'
                : '0 4px 14px rgba(79, 70, 229, 0.25)',
        } as any : {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 3,
        }),
    },
    hoveredButton: {
        ...(Platform.OS === 'web' ? {
            transform: 'translateY(-1px)',
            filter: 'brightness(1.06)',
        } as any : {}),
    },
    pressedButton: {
        opacity: 0.9,
        ...(Platform.OS === 'web' ? {
            transform: 'translateY(1px) scale(0.99)',
        } as any : {
            transform: [{ scale: 0.98 }],
        }),
    },
    text: {
        fontWeight: '600',
        letterSpacing: -0.2,
    },
});
