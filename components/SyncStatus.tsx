import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSync } from '../context/SyncContext';

/** Global Sync Status Indicator — Offline and Reconnect feedback */
export const SyncStatus = () => {
    const { isOnline, isDbInitialized, isInMemory } = useSync();
    const insets = useSafeAreaInsets();
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        const wasOffline = isOnline === false;

        if (!isDbInitialized) {
            // Priority 1: DB Error (Persistent)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else if (isInMemory) {
            // Priority 1.5: In-Memory fallback (Persistent)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else if (!isOnline) {
            // Priority 2: Offline (Persistent)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else if (isOnline && wasOffline) {
            // Priority 3: Reconnected (Temporary)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => {
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }).start();
                }, 3000);
            });
        } else if (isOnline && isDbInitialized && !isInMemory && !wasOffline) {
            // Success state - fade out if it was shown for some reason
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }).start();
        }
    }, [isOnline, isDbInitialized, isInMemory]);

    let bgColor = '#10b981';
    let text = "Back Online — Syncing";
    let icon = "cloud-check-variant";

    if (!isDbInitialized) {
        bgColor = '#ef4444'; // Danger
        text = "Database Error — Local Storage Blocked";
        icon = "database-off";
    } else if (isInMemory) {
        bgColor = '#3b82f6'; // Info (Blue)
        text = "Temporary Storage (In-Memory) — Data won't persist on refresh";
        icon = "database-clock";
    } else if (!isOnline) {
        bgColor = '#f59e0b'; // Warning
        text = "Offline Mode — Saving Locally";
        icon = "cloud-off-outline";
    }

    return (
        <Animated.View style={[
            styles.container,
            {
                opacity: fadeAnim,
                backgroundColor: bgColor,
                paddingTop: Platform.OS === 'ios' ? insets.top : 10
            }
        ]}>
            <View style={styles.content}>
                <MaterialCommunityIcons
                    name={icon as any}
                    size={16}
                    color="#fff"
                />
                <Text style={styles.text}>{text}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 8,
        letterSpacing: 0.5,
    },
});
