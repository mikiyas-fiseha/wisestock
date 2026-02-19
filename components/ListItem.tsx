
import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View } from 'react-native';

interface ListItemProps {
    title: string;
    subtitle?: string;
    rightText?: string;
    rightSubtitle?: string;
    onPress?: () => void;
    isDanger?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    titleStyle?: TextStyle;
    rightTextStyle?: TextStyle;
}

export function ListItem({ title, subtitle, rightText, rightSubtitle, onPress, isDanger, leftIcon, rightIcon, titleStyle, rightTextStyle }: ListItemProps) {
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.content}>
                <View style={styles.left}>
                    <Text style={[styles.title, isDanger && { color: Colors.light.danger }, titleStyle]}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                <View style={styles.right}>
                    {rightText && <Text style={[styles.rightText, isDanger && { color: Colors.light.danger }, rightTextStyle]}>{rightText}</Text>}
                    {rightSubtitle && <Text style={styles.rightSubtitle}>{rightSubtitle}</Text>}
                    {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
                </View>
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    left: {
        flex: 1,
        paddingRight: 8,
    },
    right: {
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    rightText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 4,
    },
    rightSubtitle: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
});
