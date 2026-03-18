
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface ModernModalProps {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    hideHeader?: boolean;
}

const { height } = Dimensions.get('window');

export function ModernModal({ visible, title, onClose, children, hideHeader }: ModernModalProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [animation] = useState(new Animated.Value(0));
    const [showModal, setShowModal] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShowModal(true);
            Animated.spring(animation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 60,
                friction: 8
            }).start();
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start(() => setShowModal(false));
        }
    }, [visible]);

    if (!showModal) return null;

    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1]
    });

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0]
    });

    const opacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });

    return (
        <Modal transparent visible={showModal} onRequestClose={onClose} animationType="none">
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity }]}>
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                    </Animated.View>
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity,
                            transform: [{ scale }, { translateY }]
                        }
                    ]}
                >
                    {!hideHeader && (
                        <View style={styles.header}>
                            <Text style={styles.title}>{title}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <FontAwesome name="times" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.content}>
                        {children}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: colors.card,
        borderRadius: 20,
        ...Layout.shadows.large,
        overflow: 'hidden',
        maxHeight: height * 0.8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.border + '50',
    },
    content: {
        // padding: 20, // Let children handle padding if they are scrollviews
    }
});
