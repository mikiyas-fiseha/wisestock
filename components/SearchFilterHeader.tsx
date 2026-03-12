import { Gradients, Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BarcodeScannerModal } from './BarcodeScannerModal';
interface FilterOption {
    label: string;
    value: string;
}

interface FilterGroup {
    key: string;
    title: string;
    options: FilterOption[];
    type?: 'select' | 'radio'; // Default to radio for single select, can add multi-select later
}

interface SearchFilterHeaderProps {
    placeholder?: string;
    onSearch: (text: string) => void;
    onFilter?: (filters: Record<string, string>) => void;
    onScan?: (data: string) => void;
    filterGroups?: FilterGroup[];
    activeFilters?: Record<string, string>;
}

export function SearchFilterHeader({
    placeholder = "Search...",
    onSearch,
    onFilter,
    onScan,
    filterGroups = [],
    activeFilters = {}
}: SearchFilterHeaderProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [searchText, setSearchText] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [tempFilters, setTempFilters] = useState<Record<string, string>>(activeFilters);

    const handleSearchChange = (text: string) => {
        setSearchText(text);
        onSearch(text);
    };

    const handleOpenFilters = () => {
        setTempFilters({ ...activeFilters });
        setFilterModalVisible(true);
    };

    const handleApplyFilters = () => {
        if (onFilter) onFilter(tempFilters);
        setFilterModalVisible(false);
    };

    const handleClearFilters = () => {
        const cleared: Record<string, string> = {};
        setTempFilters(cleared);
    };

    const toggleFilter = (groupKey: string, value: string) => {
        setTempFilters(prev => {
            if (prev[groupKey] === value) {
                const next = { ...prev };
                delete next[groupKey];
                return next;
            }
            return { ...prev, [groupKey]: value };
        });
    };

    const activeFilterCount = Object.keys(activeFilters).length;

    const [scannerVisible, setScannerVisible] = useState(false);

    const handleScan = (data: string) => {
        if (onScan) onScan(data);
        setScannerVisible(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <FontAwesome name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        value={searchText}
                        onChangeText={handleSearchChange}
                        placeholderTextColor={colors.textSecondary}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearchChange('')}>
                            <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {onScan && (
                    <TouchableOpacity style={styles.filterBtn} onPress={() => setScannerVisible(true)}>
                        <FontAwesome name="barcode" size={18} color={colors.text} />
                    </TouchableOpacity>
                )}

                {filterGroups.length > 0 && (
                    <TouchableOpacity style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={handleOpenFilters}>
                        <FontAwesome name="filter" size={18} color={activeFilterCount > 0 ? '#fff' : colors.text} />
                        {activeFilterCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Modal */}
            <Modal transparent visible={filterModalVisible} animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>

                    <View style={styles.modalContent}>
                        <LinearGradient
                            colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filters</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <FontAwesome name="times" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {filterGroups.map(group => (
                                <View key={group.key} style={styles.filterGroup}>
                                    <Text style={styles.groupTitle}>{group.title}</Text>
                                    <View style={styles.optionsRow}>
                                        {group.options.map(option => {
                                            const isActive = tempFilters[group.key] === option.value;
                                            return (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[styles.optionChip, isActive && styles.optionChipActive]}
                                                    onPress={() => toggleFilter(group.key, option.value)}
                                                >
                                                    <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{option.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
                                <Text style={styles.clearBtnText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
                                <Text style={styles.applyBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Barcode Scanner Modal */}
            {onScan && (
                <BarcodeScannerModal
                    visible={scannerVisible}
                    onClose={() => setScannerVisible(false)}
                    onScan={handleScan}
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        paddingHorizontal: Layout.spacing.lg,
        paddingBottom: Layout.spacing.md,
        backgroundColor: 'transparent',
    },
    searchRow: {
        flexDirection: 'row',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: (colors.card + 'E0'),
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,

    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: colors.text,
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: (colors.card + 'E0'),
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',

    },
    filterBtnActive: {
        backgroundColor: colors.primary,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.danger,
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: 'transparent',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40, // Safe area
        maxHeight: '80%',

    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalBody: {
        padding: 20,
    },
    filterGroup: {
        marginBottom: 24,
    },
    groupTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',

    },
    optionChipActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 14,
        color: colors.text,
    },
    optionTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderColor: colors.border,
        gap: 16,
        backgroundColor: 'transparent',
    },
    clearBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderRadius: 8,

    },
    clearBtnText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    applyBtn: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});
