import { Gradients } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';

interface Option {
    label: string;
    value: string | number;
    color?: string;
}

interface AppSelectProps {
    label?: string;
    options: Option[];
    selectedValue: string | number;
    onValueChange: (value: any) => void;
    placeholder?: string;
    error?: string;
    containerStyle?: any;
}

export function AppSelect({ label, options, selectedValue, onValueChange, placeholder, error, containerStyle }: AppSelectProps) {
    const { colors, theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const { width, height } = useWindowDimensions();

    const selectedOption = options.find(o => o.value === selectedValue);
    const displayText = selectedOption ? selectedOption.label : (placeholder || 'Select...');

    const handleSelect = (value: any) => {
        onValueChange(value);
        setIsOpen(false);
    };

    const renderDropdownContent = (isModal = false) => (
        <View style={[
            styles.dropdown,
            {
                borderColor: colors.border,
            },
            isModal && styles.modalDropdown
        ]}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : ['#FFFFFF', '#F8FAFC']}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView
                style={{ maxHeight: isModal ? 400 : 135 }}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={true}
            >
                {isModal && <View style={styles.modalHandle} />}
                {options.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.option,
                            selectedValue === option.value && { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }
                        ]}
                        onPress={() => handleSelect(option.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.optionText,
                            { color: option.color || colors.text },
                            selectedValue === option.value && { fontWeight: '700', color: colors.primary }
                        ]}>
                            {option.label}
                        </Text>
                        {selectedValue === option.value && (
                            <FontAwesome name="check" size={12} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const isMobile = Platform.OS !== 'web';

    return (
        <View style={[styles.container, containerStyle, { zIndex: isOpen ? 9999 : 1 }]}>
            {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}

            <View style={styles.anchorContainer}>
                <Pressable
                    style={[
                        styles.selector,
                        {
                            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                            borderColor: theme === 'dark' ? colors.border : 'rgba(0,0,0,0.12)',
                        },
                        isOpen && { borderColor: colors.primary },
                        error ? styles.selectorError : null
                    ]}
                    onPress={() => setIsOpen(!isOpen)}
                >
                    <Text style={[styles.selectorText, { color: selectedOption ? colors.text : colors.textSecondary }]}>
                        {displayText}
                    </Text>
                    <FontAwesome name={isOpen ? "chevron-up" : "chevron-down"} size={12} color={colors.textSecondary} />
                </Pressable>

                {isOpen && !isMobile && (
                    <View style={styles.dropdownPositioner}>
                        {/* Semi-transparent backdrop to close */}
                        <Pressable
                            onPress={() => setIsOpen(false)}
                            style={styles.fullBackdrop}
                        />
                        {renderDropdownContent()}
                    </View>
                )}

                {isOpen && isMobile && (
                    <Modal
                        visible={isOpen}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setIsOpen(false)}
                    >
                        <Pressable
                            style={styles.modalOverlay}
                            onPress={() => setIsOpen(false)}
                        >
                            <View style={styles.modalContent}>
                                {renderDropdownContent(true)}
                            </View>
                        </Pressable>
                    </Modal>
                )}
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
    anchorContainer: {
        position: 'relative',
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    selectorText: {
        fontSize: 15,
    },
    selectorError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    dropdownPositioner: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 10000,
        elevation: 10,
    },
    fullBackdrop: {
        position: 'absolute',
        top: -1000,
        left: -2000,
        right: -2000,
        bottom: 1000,
        zIndex: 9999,
    },
    dropdown: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 6,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    optionText: {
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'transparent',
    },
    modalDropdown: {
        maxHeight: 450,
        borderRadius: 32,
        overflow: 'hidden',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    }
});
