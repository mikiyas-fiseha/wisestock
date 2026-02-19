import { Colors, Layout } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportsHubScreen() {
    const router = useRouter();

    const renderReportItem = (title: string, subtitle: string, icon: any, color: string, route: string) => (
        <TouchableOpacity style={styles.navCard} onPress={() => router.push(route as any)}>
            <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                <FontAwesome name={icon} size={20} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>{title}</Text>
                <Text style={styles.navSubtitle}>{subtitle}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#ccc" />
        </TouchableOpacity>
    );

    const renderSection = (title: string, items: any[]) => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{title}</Text>
            <View style={styles.cardGroup}>
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {renderReportItem(item.title, item.subtitle, item.icon, item.color, item.route)}
                        {index < items.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reports</Text>
                <Text style={styles.headerSubtitle}>Select a report to view details</Text>
            </View>

            {renderSection("Sales Reports", [
                { title: "Sales Summary", subtitle: "Total revenue by date", icon: "bar-chart", color: Colors.light.primary, route: "/reports/sales-summary" },
                { title: "Sales by Customer", subtitle: "Revenue per customer", icon: "user", color: "#8B5CF6", route: "/reports/sales-customer" },
                { title: "Sales by Item", subtitle: "Top selling products", icon: "tag", color: "#EC4899", route: "/reports/sales-item" },
            ])}

            {renderSection("Inventory", [
                { title: "Stock Valuation", subtitle: "Cost vs Retail value", icon: "cube", color: "#F59E0B", route: "/reports/inventory" },
            ])}

            {renderSection("Financials", [
                { title: "Customer Debts", subtitle: "Outstanding balances", icon: "dollar", color: "#10B981", route: "/reports/debts" },
            ])}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: Layout.spacing.lg, paddingTop: 60 },
    header: { marginBottom: Layout.spacing.xl },
    headerTitle: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -1 },
    headerSubtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 4 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    cardGroup: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...Layout.shadows.small },
    navCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, backgroundColor: '#fff' },
    iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    navTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
    navSubtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
    separator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 72 },
});
