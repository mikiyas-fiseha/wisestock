import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppHeaderProps {
    title: string;
    showBack?: boolean;
    rightElement?: React.ReactNode;
}

export const AppHeader = ({ title, showBack, rightElement }: AppHeaderProps) => {
    const { colors, theme, setTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = React.useMemo(() => createStyles(colors, insets), [colors, insets]);
    const router = useRouter();

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <View style={styles.container}>
            <BlurView
                tint={theme === 'dark' ? 'dark' : 'light'}
                intensity={80}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
                <View style={styles.left}>
                    {showBack && (
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <FontAwesome name="chevron-left" size={16} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                </View>
                <View style={styles.right}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
                        <FontAwesome name={theme === 'light' ? 'moon-o' : 'sun-o'} size={18} color={colors.text} />
                    </TouchableOpacity>
                    {rightElement}
                </View>
            </View>
        </View>
    );
};

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '40',
        zIndex: 100,
    },
    content: {
        height: 56,
        marginTop: Platform.OS === 'web' ? 0 : insets.top,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.card + '80',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: colors.border + '20',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
