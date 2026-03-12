import {Layout, Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Pure-RN mini bar chart ───────────────────────────────────────────────────
function MiniBarChart({ data, maxVal, color, textColor }: { data: { label: string; value: number }[]; maxVal?: number; color?: string; textColor?: string }) {
    const max = maxVal ?? Math.max(...data.map(d => d.value), 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
            {data.map((d, i) => {
                const pct = max === 0 ? 0 : d.value / max;
                const barH = Math.max(4, pct * 110);
                return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Text style={{ fontSize: 9, color: textColor, marginBottom: 2 }} numberOfLines={1}>
                            {d.value > 0 ? `$${d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value.toFixed(0)}` : ''}
                        </Text>
                        <View style={{ height: barH, width: '80%', borderRadius: 4, backgroundColor: color, opacity: 0.85 + 0.15 * (i / data.length) }} />
                        <Text style={{ fontSize: 9, color: textColor, marginTop: 4 }} numberOfLines={1}>{d.label}</Text>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Donut (payment breakdown) ────────────────────────────────────────────────
const PAY_COLORS: Record<string, string> = {
    cash: '#10B981', credit: '#F59E0B', bank: '#3B82F6', mobile_money: '#8B5CF6', card: '#0EA5E9',
};

function DonutSegment({ pct, color, index }: { pct: number; color: string; index: number }) {
    return (
        <View style={{ flex: pct, height: 16, backgroundColor: color, borderRadius: index === 0 ? 8 : 0 }} />
    );
}

function PaymentDonut({ items, textColor, textSecondaryColor }: { items: { label: string; pct: number; color: string; amount: number }[]; textColor?: string; textSecondaryColor?: string }) {
    return (
        <View>
            <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
                {items.map((item, i) => item.pct > 0 && (
                    <View key={i} style={{ flex: item.pct, backgroundColor: item.color }} />
                ))}
            </View>
            <View style={{ gap: 8 }}>
                {items.map((item, i) => item.amount > 0 && (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                            <Text style={{ fontSize: 13, color: textColor, fontWeight: '500' }}>{item.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: textSecondaryColor }}>{item.pct.toFixed(0)}%</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>${item.amount.toFixed(2)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, change, icon, color, cardColor, textColor, textSecondaryColor }: { label: string; value: string; change?: string; icon: string; color: string; cardColor: string; textColor: string; textSecondaryColor: string }) {
    return (
        <View style={[kS.tile, { backgroundColor: cardColor, borderColor: cardColor === '#fff' ? 'transparent' : 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
            <View style={[kS.iconBox, { backgroundColor: color + '20' }]}>
                <FontAwesome name={icon as any} size={18} color={color} />
            </View>
            <Text style={[kS.value, { color: textColor }]}>{value}</Text>
            <Text style={[kS.label, { color: textSecondaryColor }]}>{label}</Text>
            {change ? <Text style={[kS.change, { color: change.startsWith('+') ? '#10B981' : '#EF4444' }]}>{change} vs last period</Text> : null}
        </View>
    );
}
const kS = StyleSheet.create({
    tile: { flex: 1, borderRadius: 16, padding: 14, ...Layout.shadows.small },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    value: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    label: { fontSize: 11, fontWeight: '600' },
    change: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SalesAnalyticsScreen() {
    const { colors, theme } = useTheme();
    const aS = React.useMemo(() => createStyles(colors), [colors]);
    const { company, branch, isAdmin } = useAuth();
    const router = useRouter();
    const statusBarPad = Platform.OS === 'web' ? 16 : 50;

    const [salesData, setSalesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => { if (company) fetchAnalytics(); }, [company, branch, range]);

    const fetchAnalytics = async () => {
        setLoading(true);
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const from = new Date(Date.now() - days * 86400000).toISOString();

        let q = supabase
            .from('sales')
            .select('*, sale_items(product_id, product_name, quantity, total_price, cost_price, unit_price)')
            .eq('company_id', company!.id)
            .gte('created_at', from)
            .order('created_at', { ascending: true });

        if (branch?.id) q = q.eq('branch_id', branch.id);

        const { data, error } = await q;
        if (!error) setSalesData(data || []);
        setLoading(false);
    };

    // ─── Aggregates ───────────────────────────────────────────────────────────
    const { totalRevenue, totalProfit, totalCount, avgOrder, dailyBars, topProducts, paymentBreakdown } = useMemo(() => {
        const totalRevenue = salesData.reduce((s, x) => s + (x.total_amount || 0), 0);
        const totalProfit = salesData.reduce((s, x) => {
            return s + (x.sale_items || []).reduce((p: number, i: any) =>
                p + ((i.unit_price || 0) - (i.cost_price || 0)) * i.quantity, 0);
        }, 0);
        const totalCount = salesData.length;
        const avgOrder = totalCount > 0 ? totalRevenue / totalCount : 0;

        // Daily bar data
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const buckets: Record<string, number> = {};

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            buckets[key] = 0;
        }

        salesData.forEach(s => {
            const d = new Date(s.created_at);
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            if (key in buckets) buckets[key] += s.total_amount || 0;
        });

        // For 30d or 90d, group by week to avoid overcrowding
        let dailyBars: { label: string; value: number }[];
        if (days <= 7) {
            dailyBars = Object.entries(buckets).map(([k, v]) => ({ label: k, value: v }));
        } else {
            // Aggregate by week buckets (show 8-12 bars)
            const entries = Object.entries(buckets);
            const groupSize = days === 30 ? 3 : 7;
            const grouped: { label: string; value: number }[] = [];
            for (let i = 0; i < entries.length; i += groupSize) {
                const slice = entries.slice(i, i + groupSize);
                const total = slice.reduce((s, [, v]) => s + v, 0);
                grouped.push({ label: slice[0]?.[0] || '', value: total });
            }
            dailyBars = grouped;
        }

        // Top products
        const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
        salesData.forEach(s => {
            (s.sale_items || []).forEach((i: any) => {
                const key = i.product_id || i.product_name;
                if (!prodMap[key]) prodMap[key] = { name: i.product_name, qty: 0, revenue: 0 };
                prodMap[key].qty += i.quantity;
                prodMap[key].revenue += i.total_price || 0;
            });
        });
        const topProducts = Object.values(prodMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Payment breakdown
        const payTotals: Record<string, number> = {};
        salesData.forEach(s => {
            const m = s.payment_method || 'cash';
            payTotals[m] = (payTotals[m] || 0) + (s.total_amount || 0);
        });
        const payEntries = Object.entries(payTotals);
        const totalPay = payEntries.reduce((s, [, v]) => s + v, 0);
        const paymentBreakdown = payEntries.map(([m, v]) => ({
            label: m === 'mobile_money' ? 'Mobile' : m.charAt(0).toUpperCase() + m.slice(1),
            color: PAY_COLORS[m] || '#94A3B8',
            amount: v,
            pct: totalPay > 0 ? (v / totalPay) * 100 : 0,
        })).sort((a, b) => b.amount - a.amount);

        return { totalRevenue, totalProfit, totalCount, avgOrder, dailyBars, topProducts, paymentBreakdown };
    }, [salesData, range]);

    const maxBar = Math.max(...dailyBars.map(d => d.value), 1);
    const maxProd = Math.max(...topProducts.map(p => p.revenue), 1);

    return (
        <View style={aS.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            
            {/* Header */}
            <View style={[aS.header, { paddingTop: statusBarPad }]}>
                <TouchableOpacity style={aS.backBtn} onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={aS.headerTitle}>Sales Analytics</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['7d', '30d', '90d'] as const).map(r => (
                        <TouchableOpacity
                            key={r}
                            style={[aS.rangeChip, range === r && aS.rangeChipActive]}
                            onPress={() => setRange(r)}
                        >
                            <Text style={[aS.rangeChipText, range === r && aS.rangeChipTextActive]}>{r}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={aS.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={aS.content}>
                    {/* KPI Row */}
                    <View style={aS.kpiRow}>
                        <KpiTile label="Revenue" value={`$${totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(1) + 'k' : totalRevenue.toFixed(2)}`} icon="dollar" color={colors.primary} cardColor={(colors.card + 'E0')} textColor={colors.text} textSecondaryColor={colors.textSecondary} />
                        <KpiTile label="Orders" value={`${totalCount}`} icon="shopping-cart" color="#7C3AED" cardColor={(colors.card + 'E0')} textColor={colors.text} textSecondaryColor={colors.textSecondary} />
                    </View>
                    <View style={[aS.kpiRow, { marginTop: 10 }]}>
                        {isAdmin && <KpiTile label="Gross Profit" value={`$${totalProfit.toFixed(2)}`} icon="line-chart" color="#059669" cardColor={(colors.card + 'E0')} textColor={colors.text} textSecondaryColor={colors.textSecondary} />}
                        <KpiTile label="Avg Order" value={`$${avgOrder.toFixed(2)}`} icon="tag" color="#D97706" cardColor={(colors.card + 'E0')} textColor={colors.text} textSecondaryColor={colors.textSecondary} />
                    </View>

                    {/* Revenue Chart */}
                    <View style={aS.card}>
                        <Text style={aS.cardTitle}>Revenue Over Time</Text>
                        <MiniBarChart data={dailyBars} maxVal={maxBar} color={colors.primary} textColor={colors.textSecondary} />
                    </View>

                    {/* Payment Breakdown */}
                    <View style={aS.card}>
                        <Text style={aS.cardTitle}>Payment Methods</Text>
                        {paymentBreakdown.length > 0 ? (
                            <PaymentDonut items={paymentBreakdown} textColor={colors.text} textSecondaryColor={colors.textSecondary} />
                        ) : (
                            <Text style={aS.emptyText}>No payment data</Text>
                        )}
                    </View>

                    {/* Top Products */}
                    <View style={aS.card}>
                        <Text style={aS.cardTitle}>Top Products by Revenue</Text>
                        {topProducts.length === 0 ? (
                            <Text style={aS.emptyText}>No product data</Text>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {topProducts.map((p, i) => {
                                    const pct = p.revenue / maxProd;
                                    return (
                                        <View key={i}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{p.name}</Text>
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{p.qty} sold</Text>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>${p.revenue.toFixed(2)}</Text>
                                                </View>
                                            </View>
                                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                                                <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* If data is empty */}
                    {salesData.length === 0 && (
                        <View style={[aS.card, aS.center, { paddingVertical: 40, borderStyle: 'dotted' }]}>
                            <Text style={{ fontSize: 36, marginBottom: 12 }}>📊</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No Data Yet</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>Start recording sales to see analytics appear here.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
    rangeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    rangeChipActive: { backgroundColor: colors.card + 'E0', borderColor: 'transparent' },
    rangeChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
    rangeChipTextActive: { color: colors.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 60, gap: 0 },
    kpiRow: { flexDirection: 'row', gap: 10 },
    card: { backgroundColor: colors.card + 'E0', borderRadius: 16, padding: 18, marginTop: 14, ...Layout.shadows.small, borderWidth: 1, borderColor: colors.border },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },
});
