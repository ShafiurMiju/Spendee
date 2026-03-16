import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExpenses, getExpensesByMonth } from '../../services/expenseService';
import { getIncomes, getIncomesByMonth } from '../../services/incomeService';
import { Expense, Income, RootStackParamList } from '../../types';
import { formatCurrency, getMonthRange, getColorForIndex } from '../../utils/formatting';
import {
  MONTHS,
  CATEGORY_ICONS, DEFAULT_CATEGORY_ICON,
  TYPE_ICONS, DEFAULT_TYPE_ICON,
  INCOME_SOURCE_ICONS, DEFAULT_INCOME_ICON,
} from '../../constants/categories';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Period = 'this_month' | 'last_month' | '3_months' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: '3_months', label: '3 Months' },
  { key: 'custom', label: 'Custom' },
];

function getPeriodRange(period: Period, cs: Date, ce: Date) {
  const now = new Date();
  if (period === 'this_month') return getMonthRange(now.getFullYear(), now.getMonth());
  if (period === 'last_month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return getMonthRange(d.getFullYear(), d.getMonth());
  }
  if (period === '3_months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const s = getMonthRange(d.getFullYear(), d.getMonth());
    const e = getMonthRange(now.getFullYear(), now.getMonth());
    return { startDate: s.startDate, endDate: e.endDate };
  }
  return { startDate: cs.getTime(), endDate: ce.getTime() };
}

// ─── helpers ────────────────────────────────────────────────────────────────
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function barCfg(hex: string, cardBg: string) {
  return {
    backgroundGradientFrom: cardBg,
    backgroundGradientTo: cardBg,
    color: (op = 1) => hex + Math.round(op * 255).toString(16).padStart(2, '0'),
    labelColor: () => '#94A3B8',
    decimalPlaces: 0,
    barPercentage: 0.6,
    propsForLabels: { fontSize: 10 },
    fillShadowGradientOpacity: 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
const ReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const now = new Date();
  // Theme-aware card palette
  const cCardBg = theme.dark ? '#1E3A5F' : colors.card;
  const cBorder = theme.dark ? 'transparent' : colors.border;
  const cSub    = theme.dark ? 'rgba(255,255,255,0.5)' : colors.textSecondary;
  const cFaint  = theme.dark ? 'rgba(255,255,255,0.1)' : colors.border;

  const [period, setPeriod] = useState<Period>('this_month');
  const [customStart, setCustomStart] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [customEnd, setCustomEnd] = useState(now);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [trendExp, setTrendExp] = useState<number[]>([]);
  const [trendInc, setTrendInc] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    const range = getPeriodRange(period, customStart, customEnd);
    try {
      const [expData, incData] = await Promise.all([
        getExpenses({ dateRange: { startDate: range.startDate, endDate: range.endDate } }),
        getIncomes({ dateRange: { startDate: range.startDate, endDate: range.endDate } }),
      ]);
      setExpenses(expData);
      setIncomes(incData);
    } catch (e) { console.warn('Reports load error:', e); }

    try {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()].slice(0, 3) };
      });
      const results = await Promise.all(
        months.map(m => Promise.all([getExpensesByMonth(m.year, m.month), getIncomesByMonth(m.year, m.month)])),
      );
      setTrendLabels(months.map(m => m.label));
      setTrendExp(results.map(([exp]) => exp.reduce((s, e) => s + e.amount, 0)));
      setTrendInc(results.map(([, inc]) => inc.reduce((s, i) => s + i.amount, 0)));
    } catch (e) { console.warn('Reports trend error:', e); }
  }, [period, customStart, customEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed ────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : null;
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const biggestExpense = expenses.reduce((m, e) => e.amount > m ? e.amount : m, 0);
  const top5Expenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Type totals
  const typeTotals: Record<string, number> = {};
  expenses.forEach(e => { typeTotals[e.type] = (typeTotals[e.type] || 0) + e.amount; });
  const typeEntries = Object.entries(typeTotals).sort((a, b) => b[1] - a[1]);

  // Category totals
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { if (e.category) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Income source totals
  const sourceTotals: Record<string, number> = {};
  incomes.forEach(i => { sourceTotals[i.source] = (sourceTotals[i.source] || 0) + i.amount; });
  const sourceEntries = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1]);

  // Weekly spending buckets (6 buckets across selected period)
  const range = getPeriodRange(period, customStart, customEnd);
  const totalMs = range.endDate - range.startDate;
  const bucketMs = Math.max(totalMs / 6, 1);
  const weeklyLabels: string[] = [];
  const weeklyAmounts: number[] = [];
  for (let b = 0; b < 6; b++) {
    const bStart = range.startDate + b * bucketMs;
    const bEnd = bStart + bucketMs;
    if (bStart > range.endDate) break;
    weeklyLabels.push(`W${b + 1}`);
    weeklyAmounts.push(
      expenses.filter(e => e.date >= bStart && e.date < bEnd).reduce((s, e) => s + e.amount, 0),
    );
  }
  const hasWeekly = weeklyAmounts.some(v => v > 0);

  // Type barchart data
  const hasTypeBars = typeEntries.length > 1;
  const typeBarLabels = typeEntries.map(([t]) => cap(t).slice(0, 6));
  const typeBarData = typeEntries.map(([, v]) => v || 0.01);

  // Source barchart data
  const hasSourceBars = sourceEntries.length > 1;
  const sourceBarLabels = sourceEntries.map(([s]) => cap(s).slice(0, 6));
  const sourceBarData = sourceEntries.map(([, v]) => v || 0.01);

  // Trend net
  const trendNet = trendExp.map((v, i) => trendInc[i] - v);
  const hasTrend = trendExp.some(v => v > 0) || trendInc.some(v => v > 0);

  // Income/expense ratio (visual bar width %)
  const ratioTotal = totalIncome + totalExpenses;
  const incRatio = ratioTotal > 0 ? (totalIncome / ratioTotal) * 100 : 50;
  const expRatio = ratioTotal > 0 ? (totalExpenses / ratioTotal) * 100 : 50;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Reports</Text>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
          onPress={() => navigation.navigate('PDFExport', { source: 'both' })}>
          <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Period Selector ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll} contentContainerStyle={styles.periodContent}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
              onPress={() => setPeriod(p.key)}>
              <Text style={{ color: active ? colors.textInverse : colors.text, fontSize: 13, fontWeight: '600' }}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Custom Date Range ── */}
      {period === 'custom' && (
        <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowStartPicker(true)}>
            <MaterialCommunityIcons name="calendar-start" size={15} color={colors.primary} />
            <Text style={[styles.dateBtnText, { color: colors.text }]}>
              {customStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textSecondary} />
          <TouchableOpacity style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowEndPicker(true)}>
            <MaterialCommunityIcons name="calendar-end" size={15} color={colors.primary} />
            <Text style={[styles.dateBtnText, { color: colors.text }]}>
              {customEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker value={customStart} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setCustomStart(d); }} />
          )}
          {showEndPicker && (
            <DateTimePicker value={customEnd} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setCustomEnd(d); }} />
          )}
        </View>
      )}

      {/* ══ FINANCIAL OVERVIEW ══ */}
      <View style={[styles.overviewCard, { backgroundColor: cCardBg, borderColor: cBorder, borderWidth: 1 }]}>
        <Text style={[styles.overviewPeriodLabel, { color: cSub }]}>
          {(PERIODS.find(p => p.key === period)?.label ?? 'Overview').toUpperCase()} · FINANCIAL SUMMARY
        </Text>

        <View style={styles.overviewMetrics}>
          <View style={[styles.overviewMetric, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)' }]}>
            <MaterialCommunityIcons name="arrow-down-circle" size={22} color="#4ADE80" />
            <Text style={[styles.overviewMetricLabel, { color: cSub }]}>Income</Text>
            <Text style={[styles.overviewMetricValue, { color: '#4ADE80' }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={[styles.overviewMetric, { backgroundColor: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.3)' }]}>
            <MaterialCommunityIcons name="arrow-up-circle" size={22} color="#F87171" />
            <Text style={[styles.overviewMetricLabel, { color: cSub }]}>Expenses</Text>
            <Text style={[styles.overviewMetricValue, { color: '#F87171' }]}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={[styles.overviewMetric, {
            backgroundColor: balance >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            borderColor: balance >= 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
          }]}>
            <MaterialCommunityIcons name="scale-balance" size={22} color={balance >= 0 ? '#4ADE80' : '#F87171'} />
            <Text style={[styles.overviewMetricLabel, { color: cSub }]}>Balance</Text>
            <Text style={[styles.overviewMetricValue, { color: balance >= 0 ? '#4ADE80' : '#F87171' }]}>
              {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance))}
            </Text>
          </View>
        </View>

        {/* Income vs Expense ratio bar */}
        {ratioTotal > 0 && (
          <View style={styles.ratioSection}>
            <View style={[styles.ratioBar, { backgroundColor: cFaint }]}>
              <View style={[styles.ratioInc, { width: `${incRatio}%` }]} />
              <View style={[styles.ratioExp, { width: `${expRatio}%` }]} />
            </View>
            <View style={styles.ratioLegend}>
              <View style={styles.ratioLegendItem}>
                <View style={[styles.ratioLegendDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={[styles.ratioLegendText, { color: cSub }]}>Income {incRatio.toFixed(0)}%</Text>
              </View>
              <View style={styles.ratioLegendItem}>
                <View style={[styles.ratioLegendDot, { backgroundColor: '#F87171' }]} />
                <Text style={[styles.ratioLegendText, { color: cSub }]}>Expenses {expRatio.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        )}

        {savingsRate !== null && (
          <View style={styles.savingsBar}>
            <View style={[styles.savingsRateTrack, { backgroundColor: cFaint }]}>
              <View style={[styles.savingsRateFill, {
                width: `${Math.min(Math.abs(savingsRate), 100)}%`,
                backgroundColor: savingsRate >= 0 ? '#4ADE80' : '#F87171',
              }]} />
            </View>
            <View style={styles.savingsRateLabelRow}>
              <MaterialCommunityIcons name={savingsRate >= 0 ? 'piggy-bank-outline' : 'alert-circle-outline'} size={13} color={savingsRate >= 0 ? '#4ADE80' : '#F87171'} />
              <Text style={[styles.savingsText, { color: savingsRate >= 0 ? '#4ADE80' : '#F87171' }]}>
                {savingsRate >= 0 ? `Saving ${savingsRate}% of income` : `Overspent by ${Math.abs(savingsRate)}%`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Quick Stats ── */}
      {(expenses.length > 0 || incomes.length > 0) && (
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{expenses.length + incomes.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Transactions</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="calculator-variant-outline" size={16} color={colors.error} />
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(avgExpense)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Expense</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="arrow-up-bold" size={16} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(biggestExpense)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Highest</Text>
          </View>
        </View>
      )}

      {/* ══ EXPENSES ══ */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.error }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses</Text>
        <View style={[styles.sectionPill, { backgroundColor: colors.error + '22' }]}>
          <Text style={[styles.sectionPillText, { color: colors.error }]}>{formatCurrency(totalExpenses)}</Text>
        </View>
      </View>

      {/* Weekly Spending Pattern */}
      {hasWeekly && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeaderColored, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={15} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Pattern</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>by week/period</Text>
          </View>
          <BarChart
            data={{ labels: weeklyLabels, datasets: [{ data: weeklyAmounts.map(v => v || 0.01) }] }}
            width={CHART_W}
            height={170}
            chartConfig={barCfg('#EF4444', colors.card)}
            style={styles.chart}
            yAxisLabel="৳"
            yAxisSuffix=""
            withInnerLines={false}
          />
        </View>
      )}

      {/* By Type — bars + chart */}
      {typeEntries.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeaderColored, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="shape-outline" size={15} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>By Type</Text>
          </View>
          {typeEntries.map(([type, amount], i) => {
            const icon = TYPE_ICONS[type] ?? DEFAULT_TYPE_ICON;
            const color = getColorForIndex(i);
            const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
            return (
              <View key={type} style={styles.barRow}>
                <View style={[styles.barIconWrap, { backgroundColor: color + '22' }]}>
                  <MaterialCommunityIcons name={icon} size={14} color={color} />
                </View>
                <View style={styles.barBody}>
                  <View style={styles.barTop}>
                    <Text style={[styles.barLabel, { color: colors.text }]}>{cap(type)}</Text>
                    <Text style={[styles.barAmount, { color: colors.text }]}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
          {hasTypeBars && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                <View style={[styles.trendDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Type Comparison</Text>
              </View>
              <BarChart
                data={{ labels: typeBarLabels, datasets: [{ data: typeBarData }] }}
                width={CHART_W}
                height={155}
                chartConfig={barCfg('#EF4444', colors.card)}
                style={styles.chart}
                yAxisLabel="৳"
                yAxisSuffix=""
                withInnerLines={false}
              />
            </>
          )}
        </View>
      )}

      {/* Top Categories */}
      {catEntries.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeaderColored, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="tag-multiple-outline" size={15} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Top Categories</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {catEntries.length}/{Object.keys(catTotals).length}
            </Text>
          </View>
          {catEntries.map(([cat, amount], i) => {
            const icon = CATEGORY_ICONS[cat] ?? DEFAULT_CATEGORY_ICON;
            const color = getColorForIndex(i);
            const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
            return (
              <View key={cat} style={styles.barRow}>
                <View style={[styles.barIconWrap, { backgroundColor: color + '22' }]}>
                  <MaterialCommunityIcons name={icon} size={14} color={color} />
                </View>
                <View style={styles.barBody}>
                  <View style={styles.barTop}>
                    <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>{cat || 'Uncategorized'}</Text>
                    <Text style={[styles.barAmount, { color: colors.text }]}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
          {/* Category chart */}
          {catEntries.length > 1 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                <View style={[styles.trendDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Category Chart</Text>
              </View>
              <BarChart
                data={{
                  labels: catEntries.map(([c]) => (c || 'Other').slice(0, 5)),
                  datasets: [{ data: catEntries.map(([, v]) => v || 0.01) }],
                }}
                width={CHART_W}
                height={155}
                chartConfig={barCfg('#F59E0B', colors.card)}
                style={styles.chart}
                yAxisLabel="৳"
                yAxisSuffix=""
                withInnerLines={false}
              />
            </>
          )}
        </View>
      )}

      {/* Top 5 Biggest Expenses */}
      {top5Expenses.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeaderColored, { backgroundColor: colors.warning + '20' }]}>
            <MaterialCommunityIcons name="fire" size={15} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Biggest Expenses</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>top 5</Text>
          </View>
          {top5Expenses.map((exp, i) => {
            const icon = CATEGORY_ICONS[exp.category] ?? DEFAULT_CATEGORY_ICON;
            const color = getColorForIndex(i);
            return (
              <View key={exp.id} style={styles.rankRow}>
                <View style={[styles.rankBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.rankNum, { color }]}>#{i + 1}</Text>
                </View>
                <View style={[styles.rankIcon, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={icon} size={14} color={color} />
                </View>
                <View style={styles.rankBody}>
                  <Text style={[styles.rankTitle, { color: colors.text }]} numberOfLines={1}>{exp.title}</Text>
                  <Text style={[styles.rankMeta, { color: colors.textSecondary }]}>
                    {exp.category || cap(exp.type)} · {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
                <Text style={[styles.rankAmount, { color: colors.error }]}>{formatCurrency(exp.amount)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {totalExpenses === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="receipt" size={36} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses in this period</Text>
        </View>
      )}

      {/* ══ INCOME ══ */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.success }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Income</Text>
        <View style={[styles.sectionPill, { backgroundColor: colors.success + '22' }]}>
          <Text style={[styles.sectionPillText, { color: colors.success }]}>{formatCurrency(totalIncome)}</Text>
        </View>
      </View>

      {sourceEntries.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeaderColored, { backgroundColor: colors.success + '15' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={15} color={colors.success} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>By Source</Text>
          </View>
          {sourceEntries.map(([source, amount]) => {
            const icon = INCOME_SOURCE_ICONS[source] ?? DEFAULT_INCOME_ICON;
            const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
            return (
              <View key={source} style={styles.barRow}>
                <View style={[styles.barIconWrap, { backgroundColor: colors.success + '22' }]}>
                  <MaterialCommunityIcons name={icon} size={14} color={colors.success} />
                </View>
                <View style={styles.barBody}>
                  <View style={styles.barTop}>
                    <Text style={[styles.barLabel, { color: colors.text }]}>{cap(source)}</Text>
                    <Text style={[styles.barAmount, { color: colors.success }]}>+{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: colors.success }]} />
                  </View>
                  <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
          {hasSourceBars && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                <View style={[styles.trendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Source Chart</Text>
              </View>
              <BarChart
                data={{ labels: sourceBarLabels, datasets: [{ data: sourceBarData }] }}
                width={CHART_W}
                height={155}
                chartConfig={barCfg('#22C55E', colors.card)}
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
          <MaterialCommunityIcons name="cash-plus" size={36} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No income in this period</Text>
        </View>
      )}

      {/* ══ 6-MONTH TREND ══ */}
      {hasTrend && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>6-Month Trend</Text>
          </View>

          {/* Expenses chart */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { marginBottom: 8 }]}>
              <View style={[styles.trendDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Expenses</Text>
            </View>
            <BarChart
              data={{ labels: trendLabels, datasets: [{ data: trendExp.map(v => v || 0.01) }] }}
              width={CHART_W} height={160}
              chartConfig={barCfg('#EF4444', colors.card)}
              style={styles.chart} yAxisLabel="৳" yAxisSuffix="" withInnerLines={false}
            />
          </View>

          {/* Income chart */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { marginBottom: 8 }]}>
              <View style={[styles.trendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Income</Text>
            </View>
            <BarChart
              data={{ labels: trendLabels, datasets: [{ data: trendInc.map(v => v || 0.01) }] }}
              width={CHART_W} height={160}
              chartConfig={barCfg('#22C55E', colors.card)}
              style={styles.chart} yAxisLabel="৳" yAxisSuffix="" withInnerLines={false}
            />
          </View>

          {/* Net Savings chart */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { marginBottom: 8 }]}>
              <View style={[styles.trendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Net Savings</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>income − expenses</Text>
            </View>
            <BarChart
              data={{ labels: trendLabels, datasets: [{ data: trendNet.map(v => v || 0.01) }] }}
              width={CHART_W} height={160}
              chartConfig={barCfg('#4A90D9', colors.card)}
              style={styles.chart} yAxisLabel="৳" yAxisSuffix="" withInnerLines={false}
            />
            {/* Month-by-month net rows */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {trendLabels.map((lbl, i) => {
              const net = trendNet[i];
              return (
                <View key={lbl} style={styles.netRow}>
                  <View style={[styles.trendDot, { backgroundColor: net >= 0 ? colors.success : colors.error }]} />
                  <Text style={[styles.netLabel, { color: colors.text }]}>{lbl}</Text>
                  <View style={[styles.netBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.netFill, {
                      width: `${Math.min(Math.abs(net) / (Math.max(...trendInc, 1)) * 100, 100)}%`,
                      backgroundColor: net >= 0 ? colors.success : colors.error,
                    }]} />
                  </View>
                  <Text style={[styles.netAmount, { color: net >= 0 ? colors.success : colors.error }]}>
                    {net < 0 ? '-' : '+'}{formatCurrency(Math.abs(net))}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Export CTA ── */}
      <TouchableOpacity
        style={[styles.exportCta, { backgroundColor: theme.dark ? '#1E3A5F' : colors.primaryDark }]}
        onPress={() => navigation.navigate('PDFExport', { source: 'both' })}
        activeOpacity={0.85}>
        <View style={styles.exportCtaLeft}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color="rgba(255,255,255,0.9)" />
          <View>
            <Text style={styles.exportCtaTitle}>Export Full Report</Text>
            <Text style={styles.exportCtaSub}>Download a detailed PDF of your expenses</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  exportBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  periodScroll: { marginBottom: 14 },
  periodContent: { gap: 8, paddingRight: 4 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10 },
  dateBtnText: { fontSize: 12 },

  // Overview
  overviewCard: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  overviewPeriodLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  overviewMetrics: { flexDirection: 'row', gap: 8 },
  overviewMetric: { flex: 1, alignItems: 'center', gap: 6, borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 4 },
  overviewIconBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  overviewMetricLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  overviewMetricValue: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  overviewSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4, alignSelf: 'stretch' },

  // Ratio bar
  ratioSection: { marginTop: 14 },
  ratioBar: { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  ratioInc: { height: 10, backgroundColor: '#4ADE80' },
  ratioExp: { height: 10, backgroundColor: '#F87171' },
  ratioLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 6 },
  ratioLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratioLegendDot: { width: 8, height: 8, borderRadius: 4 },
  ratioLegendText: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },

  // Savings bar
  savingsBar: { marginTop: 12, gap: 6 },
  savingsRateTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  savingsRateFill: { height: 6, borderRadius: 3 },
  savingsRateLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  savingsText: { fontSize: 12, fontWeight: '600' },

  // Quick stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statChip: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6 },
  statValue: { fontSize: 12, fontWeight: '800' },
  statLabel: { fontSize: 9, textAlign: 'center' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  sectionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  sectionPillText: { fontSize: 13, fontWeight: '700' },

  // Cards
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardHeaderColored: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16, paddingVertical: 12, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  cardMeta: { fontSize: 11 },

  // Bar rows
  barRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  barIconWrap: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  barBody: { flex: 1 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  barLabel: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  barAmount: { fontSize: 13, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { fontSize: 10, marginTop: 3 },

  // Rank rows (top 5 expenses)
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankNum: { fontSize: 11, fontWeight: '800' },
  rankIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankBody: { flex: 1 },
  rankTitle: { fontSize: 13, fontWeight: '600' },
  rankMeta: { fontSize: 11, marginTop: 1 },
  rankAmount: { fontSize: 13, fontWeight: '800' },

  // Net savings rows
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  netLabel: { fontSize: 12, fontWeight: '600', width: 28 },
  netBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  netFill: { height: 6, borderRadius: 3 },
  netAmount: { fontSize: 12, fontWeight: '700', width: 72, textAlign: 'right' },

  // Misc
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  trendDot: { width: 10, height: 10, borderRadius: 5 },
  chart: { borderRadius: 8, marginVertical: 4, alignSelf: 'center' },

  emptyCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 36, marginBottom: 12, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14 },

  exportCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 18, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  exportCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  exportCtaTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  exportCtaSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
});

export default ReportsScreen;
