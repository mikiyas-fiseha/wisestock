import { useTheme } from '@/context/ThemeContext';
import { ActivityLog, useEntityActivityLogs } from '@/hooks/useActivityLogs';
import { formatDateTime } from '@/utils/date';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface ActivityTimelineProps {
    entityType: string;
    entityId: string | null;
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const { data: logs, isLoading, error } = useEntityActivityLogs(entityType, entityId);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Failed to load activity timeline.</Text>
            </View>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent activity yet.</Text>
            </View>
        );
    }

    const getIconInfo = (action: string): { name: any, color: string, bg: string } => {
        if (action.includes('created')) return { name: 'plus', color: colors.success, bg: colors.success + '20' };
        if (action.includes('updated')) return { name: 'pencil', color: colors.primary, bg: colors.primary + '20' };
        if (action.includes('deleted') || action.includes('cancelled')) return { name: 'trash', color: colors.danger, bg: colors.danger + '20' };
        if (action.includes('payment')) return { name: 'money', color: colors.success, bg: colors.success + '20' };
        if (action.includes('adjusted')) return { name: 'exchange', color: colors.warning, bg: colors.warning + '20' };
        if (action.includes('return')) return { name: 'undo', color: colors.warning, bg: colors.warning + '20' };

        return { name: 'circle-o', color: colors.textSecondary, bg: colors.border };
    };

    const formatActionText = (action: string) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Activity Timeline</Text>

            <View style={styles.timeline}>
                {logs.map((log: ActivityLog, index: number) => {
                    const isLast = index === logs.length - 1;
                    const { name, color, bg } = getIconInfo(log.action);

                    return (
                        <View key={log.id} style={styles.timelineItem}>
                            {/* Left Column (Icon + Line) */}
                            <View style={styles.timelineLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                                    <FontAwesome name={name} size={14} color={color} />
                                </View>
                                {!isLast && <View style={styles.timelineLine} />}
                            </View>

                            {/* Right Column (Content) */}
                            <View style={[styles.timelineContent, isLast && styles.lastContent]}>
                                <Text style={styles.actionText}>
                                    {formatActionText(log.action)}
                                    <Text style={styles.userText}> by {log.user_name}</Text>
                                </Text>
                                <Text style={styles.timeText}>{formatDateTime(new Date(log.created_at))}</Text>

                                {log.details && (
                                    <View style={styles.detailsBox}>
                                        <Text style={styles.detailsText}>
                                            {JSON.stringify(log.details)
                                                .replace(/["{}]/g, '')
                                                .replace(/:/g, ': ')
                                                .replace(/,/g, ', ')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        marginTop: 20,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 20,
    },
    emptyText: {
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    timeline: {
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: 'row',
    },
    timelineLeft: {
        alignItems: 'center',
        marginRight: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 20,
        paddingTop: 4,
    },
    lastContent: {
        paddingBottom: 0,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    userText: {
        fontWeight: 'normal',
        color: colors.textSecondary,
    },
    timeText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    detailsBox: {
        marginTop: 8,
        padding: 10,
        backgroundColor: colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailsText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    }
});
