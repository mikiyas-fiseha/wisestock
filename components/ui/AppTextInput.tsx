
import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface AppTextInputProps extends TextInputProps {
    label?: string;
    error?: string;
    prefix?: string;
}

export function AppTextInput({ label, error, style, prefix, ...props }: AppTextInputProps) {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                {prefix && <Text style={styles.prefix}>{prefix}</Text>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor="#999"
                    {...props}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: Colors.light.text,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.light.text,
        height: '100%',
    },
    prefix: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        marginRight: 4,
    },
    inputError: {
        borderColor: Colors.light.danger,
    },
    errorText: {
        color: Colors.light.danger,
        fontSize: 12,
        marginTop: 4,
    },
});
