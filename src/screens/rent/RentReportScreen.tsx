import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTenants } from '../../services/tenantService';
import { getPaymentsByMonth, getCostsByMonth } from '../../services/rentService';
import { Tenant, RentPayment, RentCost, RootStackParamList } from '../../types';
import { formatCurrency, toMonthKey } from '../../utils/formatting';
import { MONTHS } from '../../constants/categories';
import { RENT_COST_CATEGORY_ICONS, DEFAULT_RENT_COST_ICON } from '../../constants/rent';

const { width: SCREEN_W } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const RentReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  // Theme-aware card palette
  const cCardBg = theme.dark ? '#1E3A5F' : colors.card;
  const cBorder = theme.dark ? 'transparent' : colors.border;
  const cText   = theme.dark ? '#fff' : colors.text;
  const cSub    = theme.dark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
  const cFaint  = theme.dark ? 'rgba(255,255,255,0.1)' : colors.surface;

  const [month, setMonth] = useState(toMonthKey(Date.now()));
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [costs, setCosts] = useState<RentCost[]>([]);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [trendCollected, setTrendCollected] = useState<number[]>([]);
  const [trendCosts, setTrendCosts] = useState<number[]>([]);
  const [trendNet, setTrendNet] = useState<number[]>([]);

  const navMonth = (dir: -1 | 1) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(toMonthKey(d.getTime()));
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  const loadData = useCallback(async () => {
    try {
      const [t, p, c] = await Promise.all([
        getTenants(),
        getPaymentsByMonth(month),
        getCostsByMonth(month),
      ]);
      setTenants(t);
      setPayments(p);
      setCosts(c);
    } catch (e) {
      console.warn('RentReport load error:', e);
    }

    // 6-month trend
    try {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { key: toMonthKey(d.getTime()), label: MONTHS[d.getMonth()].slice(0, 3) };
      });
      const results = await Promise.all(
        months.map(m => Promise.all([getPaymentsByMonth(m.key), getCostsByMonth(m.key)])),
      );
      setTrendLabels(months.map(m => m.label));
      const coll = results.map(([p]) => p.reduce((s, x) => s + x.amount, 0));
      const cost = results.map(([, c]) => c.reduce((s, x) => s + x.amount, 0));
      setTrendCollected(coll);
      setTrendCosts(cost);
      setTrendNet(coll.map((c, i) => c - cost[i]));
    } catch (e) {
      console.warn('RentReport trend error:', e);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed ──
  const totalExpected = tenants.reduce((s, t) => s + t.rentAmount, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const netIncome = totalCollected - totalCosts;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const paidTenants = tenants.filter(tn => payments.some(p => p.tenantId === tn.id));
  const unpaidTenants = tenants.filter(tn => !payments.some(p => p.tenantId === tn.id));

  // Cost breakdown by category
  const costCatTotals: Record<string, number> = {};
  costs.forEach(c => { costCatTotals[c.category] = (costCatTotals[c.category] || 0) + c.amount; });
  const costCatEntries = Object.entries(costCatTotals).sort((a, b) => b[1] - a[1]);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const chartW = SCREEN_W - 64;
  const barCfg = (barColor: string) => ({
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => barColor.replace(')', `, ${opacity})`).replace('rgb(', 'rgba('),
    labelColor: () => colors.textSecondary,
    decimalPlaces: 0,
    barPercentage: 0.5,
    propsForLabels: { fontSize: 10 },
    fillShadowGradientOpacity: 1,
  });

  const costColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Rent Report</Text>
        <TouchableOpacity
          style={[styles.pdfBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
          onPress={() => navigation.navigate('PDFExport', { source: 'rent' })}>
          <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Month Selector ── */}
      <View style={[styles.monthBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navMonth(-1)} style={styles.monthArrow}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.primary} />
          <Text style={[styles.monthText, { color: colors.text }]}>{monthLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => navMonth(1)} style={styles.monthArrow}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ══ OVERVIEW CARD ══ */}
      <View style={[styles.overviewCard, { backgroundColor: cCardBg, borderColor: cBorder, borderWidth: 1 }]}>
        <Text style={[styles.ovLabel, { color: cSub }]}>RENT OVERVIEW</Text>

        {/* Top row: Expected + Collected */}
        <View style={styles.ovRow}>
          <View style={[styles.ovMetricCard, { backgroundColor: cFaint }]}>
            <View style={[styles.ovIconBg, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
              <MaterialCommunityIcons name="home-city-outline" size={18} color="#4ADE80" />
            </View>
            <Text style={[styles.ovMetricLabel, { color: cSub }]}>Expected</Text>
            <Text style={[styles.ovMetricValue, { color: cText }]}>{formatCurrency(totalExpected)}</Text>
          </View>
          <View style={[styles.ovMetricCard, { backgroundColor: cFaint }]}>
            <View style={[styles.ovIconBg, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
              <MaterialCommunityIcons name="cash-check" size={18} color="#4ADE80" />
            </View>
            <Text style={[styles.ovMetricLabel, { color: cSub }]}>Collected</Text>
            <Text style={[styles.ovMetricValue, { color: '#4ADE80' }]}>{formatCurrency(totalCollected)}</Text>
          </View>
        </View>

        {/* Bottom row: Costs + Net */}
        <View style={[styles.ovRow, { marginTop: 8 }]}>
          <View style={[styles.ovMetricCard, { backgroundColor: cFaint }]}>
            <View style={[styles.ovIconBg, { backgroundColor: 'rgba(248,113,113,0.2)' }]}>
              <MaterialCommunityIcons name="cash-minus" size={18} color="#F87171" />
            </View>
            <Text style={[styles.ovMetricLabel, { color: cSub }]}>Costs</Text>
            <Text style={[styles.ovMetricValue, { color: '#F87171' }]}>{formatCurrency(totalCosts)}</Text>
          </View>
          <View style={[styles.ovMetricCard, { backgroundColor: cFaint }]}>
            <View style={[styles.ovIconBg, { backgroundColor: netIncome >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }]}>
              <MaterialCommunityIcons name="bank-outline" size={18} color={netIncome >= 0 ? '#4ADE80' : '#F87171'} />
            </View>
            <Text style={[styles.ovMetricLabel, { color: cSub }]}>Net Income</Text>
            <Text style={[styles.ovMetricValue, { color: netIncome >= 0 ? '#4ADE80' : '#F87171' }]}>
              {netIncome < 0 ? '-' : ''}{formatCurrency(Math.abs(netIncome))}
            </Text>
          </View>
        </View>

        {/* Collection Rate Bar */}
        <View style={styles.rateSection}>
          <View style={styles.rateHeader}>
            <Text style={[styles.rateLabel, { color: cSub }]}>Collection Rate</Text>
            <Text style={[styles.rateValue, { color: collectionRate >= 80 ? '#4ADE80' : collectionRate >= 50 ? '#FBBF24' : '#F87171' }]}>
              {collectionRate}%
            </Text>
          </View>
          <View style={[styles.rateTrack, { backgroundColor: cFaint }]}>
            <View style={[styles.rateFill, {
              width: `${Math.min(collectionRate, 100)}%`,
              backgroundColor: collectionRate >= 80 ? '#4ADE80' : collectionRate >= 50 ? '#FBBF24' : '#F87171',
            }]} />
          </View>
          <Text style={[styles.rateMeta, { color: cSub }]}>
            {paidTenants.length}/{tenants.length} tenants paid
          </Text>
        </View>
      </View>

      {/* ══ TENANT STATUS ══ */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.success }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tenant Status</Text>
        <View style={[styles.sectionPill, { backgroundColor: colors.success + '22' }]}>
          <Text style={[styles.sectionPillText, { color: colors.success }]}>
            {paidTenants.length}/{tenants.length}
          </Text>
        </View>
      </View>

      {tenants.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Paid tenants */}
          {paidTenants.map(tn => {
            const pmt = payments.find(p => p.tenantId === tn.id);
            return (
              <View key={tn.id} style={styles.tenantRow}>
                <View style={[styles.tenantStatus, { backgroundColor: '#4ADE8025' }]}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                </View>
                <View style={styles.tenantInfo}>
                  <Text style={[styles.tenantName, { color: colors.text }]}>{tn.name}</Text>
                  <Text style={[styles.tenantFlat, { color: colors.textSecondary }]}>Flat {tn.flatNumber}</Text>
                </View>
                <View style={styles.tenantAmountCol}>
                  <Text style={[styles.tenantPaid, { color: colors.success }]}>
                    {formatCurrency(pmt?.amount ?? tn.rentAmount)}
                  </Text>
                  <Text style={[styles.tenantLabel, { color: colors.success }]}>Paid</Text>
                </View>
              </View>
            );
          })}
          {/* Unpaid tenants */}
          {unpaidTenants.map(tn => (
            <View key={tn.id} style={styles.tenantRow}>
              <View style={[styles.tenantStatus, { backgroundColor: '#F8717125' }]}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.error} />
              </View>
              <View style={styles.tenantInfo}>
                <Text style={[styles.tenantName, { color: colors.text }]}>{tn.name}</Text>
                <Text style={[styles.tenantFlat, { color: colors.textSecondary }]}>Flat {tn.flatNumber}</Text>
              </View>
              <View style={styles.tenantAmountCol}>
                <Text style={[styles.tenantUnpaid, { color: colors.error }]}>
                  {formatCurrency(tn.rentAmount)}
                </Text>
                <Text style={[styles.tenantLabel, { color: colors.error }]}>Due</Text>
              </View>
            </View>
          ))}

          {/* Per-tenant collection bar chart */}
          {tenants.length > 1 && (
            <>
              <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />
              <View style={styles.cardHeader}>
                <View style={[styles.trendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Per-Tenant Collection</Text>
              </View>
              <BarChart
                data={{
                  labels: tenants.map(tn => tn.flatNumber.length > 4 ? tn.flatNumber.slice(0, 4) : tn.flatNumber),
                  datasets: [{
                    data: tenants.map(tn => {
                      const pmt = payments.find(p => p.tenantId === tn.id);
                      return pmt ? pmt.amount : 0.01;
                    }),
                  }],
                }}
                width={chartW}
                height={160}
                chartConfig={barCfg('rgb(34, 197, 94)')}
                style={styles.chart}
                yAxisLabel="৳"
                yAxisSuffix=""
                withInnerLines={false}
              />
            </>
          )}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="account-group-outline" size={36} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tenants added</Text>
        </View>
      )}

      {/* ══ COST BREAKDOWN ══ */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.error }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Costs</Text>
        <View style={[styles.sectionPill, { backgroundColor: colors.error + '22' }]}>
          <Text style={[styles.sectionPillText, { color: colors.error }]}>{formatCurrency(totalCosts)}</Text>
        </View>
      </View>

      {costCatEntries.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="tag-multiple-outline" size={15} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>By Category</Text>
          </View>
          {costCatEntries.map(([cat, amount], i) => {
            const icon = RENT_COST_CATEGORY_ICONS[cat] ?? DEFAULT_RENT_COST_ICON;
            const color = costColors[i % costColors.length];
            const pct = totalCosts > 0 ? (amount / totalCosts) * 100 : 0;
            return (
              <View key={cat} style={styles.barRow}>
                <View style={[styles.barIconWrap, { backgroundColor: color + '22' }]}>
                  <MaterialCommunityIcons name={icon} size={14} color={color} />
                </View>
                <View style={styles.barBody}>
                  <View style={styles.barTop}>
                    <Text style={[styles.barLabel, { color: colors.text }]}>{cap(cat)}</Text>
                    <Text style={[styles.barAmount, { color: colors.error }]}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}

          {/* Cost category bar chart */}
          {costCatEntries.length > 1 && (
            <>
              <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />
              <View style={styles.cardHeader}>
                <View style={[styles.trendDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Cost Distribution</Text>
              </View>
              <BarChart
                data={{
                  labels: costCatEntries.map(([cat]) => cat.length > 6 ? cat.slice(0, 6) : cat),
                  datasets: [{ data: costCatEntries.map(([, a]) => a || 0.01) }],
                }}
                width={chartW}
                height={160}
                chartConfig={barCfg('rgb(239, 68, 68)')}
                style={styles.chart}
                yAxisLabel="৳"
                yAxisSuffix=""
                withInnerLines={false}
              />
            </>
          )}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="cash-minus" size={36} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No costs this month</Text>
        </View>
      )}

      {/* ══ 6-MONTH TREND ══ */}
      {(trendCollected.some(v => v > 0) || trendCosts.some(v => v > 0)) && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>6-Month Trend</Text>
          </View>

          {/* Collected trend */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.trendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Collected</Text>
            </View>
            <BarChart
              data={{
                labels: trendLabels,
                datasets: [{ data: trendCollected.map(v => v || 0.01) }],
              }}
              width={chartW}
              height={170}
              chartConfig={barCfg('rgb(34, 197, 94)')}
              style={styles.chart}
              yAxisLabel="৳"
              yAxisSuffix=""
              withInnerLines={false}
            />
          </View>

          {/* Costs trend */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.trendDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Costs</Text>
            </View>
            <BarChart
              data={{
                labels: trendLabels,
                datasets: [{ data: trendCosts.map(v => v || 0.01) }],
              }}
              width={chartW}
              height={170}
              chartConfig={barCfg('rgb(239, 68, 68)')}
              style={styles.chart}
              yAxisLabel="৳"
              yAxisSuffix=""
              withInnerLines={false}
            />
          </View>

          {/* Net income trend */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.trendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Net Income</Text>
            </View>
            <BarChart
              data={{
                labels: trendLabels,
                datasets: [{ data: trendNet.map(v => v || 0.01) }],
              }}
              width={chartW}
              height={170}
              chartConfig={barCfg('rgb(74, 144, 217)')}
              style={styles.chart}
              yAxisLabel="৳"
              yAxisSuffix=""
              withInnerLines={false}
            />
          </View>
        </>
      )}

      {/* ── Export CTA ── */}
      <TouchableOpacity
        style={[styles.exportCta, { backgroundColor: theme.dark ? '#1E3A5F' : colors.primaryDark }]}
        onPress={() => navigation.navigate('PDFExport', { source: 'rent' })}
        activeOpacity={0.85}>
        <View style={styles.exportCtaLeft}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color="rgba(255,255,255,0.9)" />
          <View>
            <Text style={styles.exportCtaTitle}>Export Rent Report</Text>
            <Text style={styles.exportCtaSub}>Download a detailed PDF report</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, flex: 1 },
  pdfBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Month bar
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  monthArrow: { padding: 4 },
  monthCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  monthText: { fontSize: 16, fontWeight: '700' },

  // Overview
  overviewCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ovLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  ovRow: { flexDirection: 'row', gap: 8 },
  ovMetricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  ovIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovMetricLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '500' },
  ovMetricValue: { color: '#fff', fontSize: 15, fontWeight: '800' },
  rateSection: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rateLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  rateValue: { fontSize: 18, fontWeight: '800' },
  rateTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  rateFill: { height: 8, borderRadius: 4 },
  rateMeta: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 6, textAlign: 'center' },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  sectionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  sectionPillText: { fontSize: 13, fontWeight: '700' },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },

  // Tenant rows
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tenantStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 14, fontWeight: '600' },
  tenantFlat: { fontSize: 11, marginTop: 1 },
  tenantAmountCol: { alignItems: 'flex-end' },
  tenantPaid: { fontSize: 14, fontWeight: '700' },
  tenantUnpaid: { fontSize: 14, fontWeight: '700' },
  tenantLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  // Bar rows
  barRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  barIconWrap: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  barBody: { flex: 1 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  barLabel: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  barAmount: { fontSize: 13, fontWeight: '700' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  barPct: { fontSize: 10, marginTop: 3 },

  // Chart
  chart: { borderRadius: 8, marginVertical: 4, alignSelf: 'center' },
  chartDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  trendDot: { width: 10, height: 10, borderRadius: 5 },

  // Empty
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14 },

  // Export CTA
  exportCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  exportCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  exportCtaTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  exportCtaSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
});

export default RentReportScreen;
