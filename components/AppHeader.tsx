
import { Colors, Layout } from '@/constants/Colors';
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
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                {showBack && (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={Colors.light.text} />
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.right}>
                {rightElement}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.spacing.md,
        backgroundColor: Colors.light.background,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 10, // Adjust for status bar if needed, though SafeAreaView usually handles it
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
        color: Colors.light.text,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
