import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AppHeaderProps {
    title: string;
    showBack?: boolean;
    rightElement?: React.ReactNode;
}

export const AppHeader = ({ title, showBack, rightElement }: AppHeaderProps) => {
    const { colors, theme, setTheme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                {showBack && (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.right}>
                <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                    <FontAwesome name={theme === 'light' ? 'moon-o' : 'sun-o'} size={20} color={colors.text} />
                </TouchableOpacity>
                {rightElement}
            </View>
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.spacing.md,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: 10,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeToggle: {
        padding: 8,
        marginRight: Layout.spacing.sm,
    }
});
