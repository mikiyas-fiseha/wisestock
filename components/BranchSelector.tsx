

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export function BranchSelector() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const { branch, allBranches, switchBranch, isAdmin, isSuperAdmin, isAllBranches } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;

    const canSwitchBranch = isAdmin || isSuperAdmin;
    const canViewAll = isAdmin || isSuperAdmin;

    // Don't render if no branches or user can't switch
    if (allBranches.length === 0) return null;

    // Single branch, non-admin => just show label
    if (allBranches.length <= 1 && !canSwitchBranch) {
        return (
            <View style={styles.readOnlyContainer}>
                <FontAwesome name="building-o" size={13} color={colors.textSecondary} />
                <Text style={styles.readOnlyText} numberOfLines={1}>
                    {branch?.name || 'Main Branch'}
                </Text>
            </View>
        );
    }

    const displayName = isAllBranches ? 'All Branches' : (branch?.name || 'Select Branch');

    const handleSelect = (selectedBranch: typeof branch) => {
        switchBranch(selectedBranch);
        setDropdownOpen(false);
    };

    // Web: inline dropdown
    if (isWeb) {
        return (
            <View style={styles.webContainer}>
                <Pressable
                    style={[styles.selector, dropdownOpen && styles.selectorActive]}
                    onPress={() => canSwitchBranch && setDropdownOpen(!dropdownOpen)}
                >
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : ['#F1F5F9', '#E2E8F0']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.selectorContent}>
                        <FontAwesome
                            name={isAllBranches ? 'globe' : 'building-o'}
                            size={13}
                            color={isAllBranches ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.selectorText, isAllBranches && styles.allBranchesText]} numberOfLines={1}>
                            {displayName}
                        </Text>
                        {canSwitchBranch && (
                            <FontAwesome name="chevron-down" size={10} color={colors.textSecondary} />
                        )}
                    </View>
                </Pressable>

                {dropdownOpen && (
                    <>
                        <Pressable style={styles.webBackdrop} onPress={() => setDropdownOpen(false)} />
                        <View style={styles.webDropdown}>
                            <LinearGradient
                                colors={theme === 'dark' ? Gradients.authDark : ['#FFFFFF', '#F8FAFC']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={{ position: 'relative', zIndex: 1 }}>
                                <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>SWITCH BRANCH</Text>

                                {canViewAll && (
                                    <Pressable
                                        style={[styles.dropdownItem, isAllBranches && styles.dropdownItemActive]}
                                        onPress={() => handleSelect(null)}
                                    >
                                        <FontAwesome name="globe" size={14} color={isAllBranches ? colors.primary : colors.textSecondary} />
                                        <Text style={[styles.dropdownItemText, { color: colors.text }, isAllBranches && styles.dropdownItemTextActive]}>
                                            All Branches
                                        </Text>
                                        {isAllBranches && <FontAwesome name="check" size={12} color={colors.primary} />}
                                    </Pressable>
                                )}

                                <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />

                                {allBranches.map(b => {
                                    const isSelected = branch?.id === b.id;
                                    return (
                                        <Pressable
                                            key={b.id}
                                            style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                                            onPress={() => handleSelect(b)}
                                        >
                                            <FontAwesome name="building-o" size={14} color={isSelected ? colors.primary : colors.textSecondary} />
                                            <Text style={[styles.dropdownItemText, { color: colors.text }, isSelected && styles.dropdownItemTextActive]}>
                                                {b.name}
                                            </Text>
                                            {b.isMain && <Text style={styles.mainBadge}>Main</Text>}
                                            {isSelected && <FontAwesome name="check" size={12} color={colors.primary} />}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </>
                )}
            </View>
        );
    }

    // Mobile: modal dropdown
    return (
        <>
            <Pressable
                style={styles.mobileSelector}
                onPress={() => canSwitchBranch && setDropdownOpen(true)}
            >
                <LinearGradient
                    colors={theme === 'dark' ? Gradients.authDark : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.1)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.selectorContentMobile}>
                    <FontAwesome
                        name={isAllBranches ? 'globe' : 'building-o'}
                        size={13}
                        color={isAllBranches ? colors.primary : colors.text}
                    />
                    <Text style={[styles.mobileSelectorText, { color: colors.text }]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    {canSwitchBranch && (
                        <FontAwesome name="chevron-down" size={9} color={colors.textSecondary} />
                    )}
                </View>
            </Pressable>

            <Modal visible={dropdownOpen} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setDropdownOpen(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <LinearGradient
                            colors={theme === 'dark' ? Gradients.authDark : ['#FFFFFF', '#F2F6FF']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={{ position: 'relative', zIndex: 1 }}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Switch Branch</Text>

                            <ScrollView style={styles.modalScroll}>
                                {canViewAll && (
                                    <Pressable
                                        style={[styles.modalItem, isAllBranches && styles.modalItemActive]}
                                        onPress={() => handleSelect(null)}
                                    >
                                        <FontAwesome name="globe" size={16} color={isAllBranches ? colors.primary : colors.textSecondary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.modalItemText, { color: colors.text }, isAllBranches && styles.modalItemTextActive]}>
                                                All Branches
                                            </Text>
                                        </View>
                                        {isAllBranches && <FontAwesome name="check" size={14} color={colors.primary} />}
                                    </Pressable>
                                )}

                                {allBranches.map(b => {
                                    const isSelected = branch?.id === b.id;
                                    return (
                                        <Pressable
                                            key={b.id}
                                            style={[styles.modalItem, isSelected && styles.modalItemActive]}
                                            onPress={() => handleSelect(b)}
                                        >
                                            <FontAwesome name="building-o" size={16} color={isSelected ? colors.primary : colors.textSecondary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.modalItemText, { color: colors.text }, isSelected && styles.modalItemTextActive]}>
                                                    {b.name}
                                                </Text>
                                                {b.address && <Text style={[styles.modalItemSubtext, { color: colors.textSecondary }]}>{b.address}</Text>}
                                            </View>
                                            {b.isMain && <Text style={styles.mainBadge}>Main</Text>}
                                            {isSelected && <FontAwesome name="check" size={14} color={colors.primary} />}
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    // Read-only (non-admin single branch)
    readOnlyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
    },
    readOnlyText: {
        fontSize: 11,
        color: colors.textSecondary,
    },

    // Web selector
    webContainer: {
        position: 'relative',
        zIndex: 100,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
        // @ts-ignore
        cursor: 'pointer',
        // @ts-ignore
        transition: 'all 0.15s ease',
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        zIndex: 1,
    },
    selectorActive: {
        borderColor: colors.primary,
    },
    selectorText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        maxWidth: 130,
    },
    allBranchesText: {
        color: colors.primary,
    },

    // Web dropdown
    webBackdrop: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        width: 10000,
        height: 10000,
        // @ts-ignore
        zIndex: 98,
    },
    webDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF',
        borderRadius: 10,

        // @ts-ignore
        boxShadow: theme === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
        paddingVertical: 6,
        minWidth: 200,
        zIndex: 999,
    },
    dropdownLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        // @ts-ignore
        cursor: 'pointer',
    },
    dropdownItemActive: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    dropdownItemText: {
        fontSize: 13,
        color: colors.text,
        flex: 1,
        fontWeight: '500',
    },
    dropdownItemTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    mainBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },

    // Mobile selector
    mobileSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        overflow: 'hidden',
    },
    selectorContentMobile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        zIndex: 1,
        width: '100%',
    },
    mobileSelectorText: {
        fontSize: 13,
        fontWeight: '700',
        maxWidth: 120,
    },

    // Mobile modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '60%',
        overflow: 'hidden',

    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2E8F0',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    modalScroll: {
        paddingHorizontal: 12,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 2,
    },
    modalItemActive: {
        backgroundColor: `${colors.primary}08`,
    },
    modalItemText: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    modalItemTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    modalItemSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
});
