import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import AnimatedPressable from '../../components/common/AnimatedPressable';
import { ExpenseListItem } from '../../components/expense';
import { getExpenses } from '../../services/expenseService';
import { getIncomesByMonth } from '../../services/incomeService';
import { Expense, Income, RootStackParamList } from '../../types';
import { formatCurrency, formatDate, getMonthRange, getColorForIndex } from '../../utils/formatting';
import { TYPE_ICONS, DEFAULT_TYPE_ICON, INCOME_SOURCE_ICONS, DEFAULT_INCOME_ICON, MONTHS } from '../../constants/categories';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  // Theme-aware card palette (white in light, navy in dark)
  const cCardBg = theme.dark ? '#1E3A5F' : colors.card;
  const cBorder = theme.dark ? 'transparent' : colors.border;
  const cText   = theme.dark ? '#fff' : colors.text;
  const cSub    = theme.dark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
  const cFaint  = theme.dark ? 'rgba(255,255,255,0.1)' : colors.border;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [typeTotals, setTypeTotals] = useState<Record<string, number>>({});

  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t('dashboard.goodMorning')
    : hour < 18 ? t('dashboard.goodAfternoon')
    : t('dashboard.goodEvening');

  const loadData = useCallback(async () => {
    const d = new Date();
    const { startDate, endDate } = getMonthRange(d.getFullYear(), d.getMonth());
    try {
      const data = await getExpenses({ dateRange: { startDate, endDate } });
      setExpenses(data);
      const totals: Record<string, number> = {};
      let grandTotal = 0;
      data.forEach(e => { totals[e.type] = (totals[e.type] || 0) + e.amount; grandTotal += e.amount; });
      setTypeTotals(totals);
      setMonthlyTotal(grandTotal);
      const incomeData = await getIncomesByMonth(d.getFullYear(), d.getMonth());
      setIncomes(incomeData);
      setTotalIncome(incomeData.reduce((s, i) => s + i.amount, 0));
    } catch (e) { console.warn('Dashboard loadData error:', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const recentExpenses = expenses.slice(0, 5);
  const recentIncomes = incomes.slice(0, 5);
  const balance = totalIncome - monthlyTotal;
  const typeEntries = Object.entries(typeTotals);

  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : null;
  const ratioTotal = totalIncome + monthlyTotal;
  const incRatio = ratioTotal > 0 ? (totalIncome / ratioTotal) * 100 : 50;
  const expRatio = ratioTotal > 0 ? (monthlyTotal / ratioTotal) * 100 : 50;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || ''}</Text>
        </View>
        {user?.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
      </View>

      {/* ══ Balance Card ══ */}
      <View style={[styles.balanceCard, { backgroundColor: cCardBg, borderColor: cBorder, borderWidth: 1 }]}>
        {/* decorative circles */}
        <View style={styles.glow1} />
        <View style={styles.glow2} />

        <View style={styles.balanceTop}>
          <View>
            <Text style={[styles.balanceMonth, { color: cSub }]}>{currentMonth} {now.getFullYear()}</Text>
            <Text style={[styles.balanceLabel, { color: cSub }]}>{t('dashboard.balance')}</Text>
          </View>
          <View style={[styles.balanceBadge, { backgroundColor: balance >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }]}>
            <MaterialCommunityIcons
              name={balance >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={balance >= 0 ? '#4ADE80' : '#F87171'} />
            {savingsRate !== null && (
              <Text style={[styles.balanceBadgeText, { color: balance >= 0 ? '#4ADE80' : '#F87171' }]}>
                {Math.abs(savingsRate)}%
              </Text>
            )}
          </View>
        </View>

        <Text style={[styles.balanceValue, { color: balance >= 0 ? cText : '#F87171' }]}>
          {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance))}
        </Text>

        {/* Income / Expense tiles */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricTile, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)' }]}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color="#4ADE80" />
              <Text style={[styles.metricLabel, { color: cSub }]}>{t('dashboard.totalIncome')}</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#4ADE80' }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={[styles.metricTile, { backgroundColor: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.3)' }]}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name="arrow-up-circle-outline" size={16} color="#F87171" />
              <Text style={[styles.metricLabel, { color: cSub }]}>{t('dashboard.totalExpenses')}</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#F87171' }]}>{formatCurrency(monthlyTotal)}</Text>
          </View>
        </View>

        {/* Ratio bar */}
        {ratioTotal > 0 && (
          <View style={styles.ratioWrap}>
            <View style={[styles.ratioBar, { backgroundColor: cFaint }]}>
              <View style={[styles.ratioInc, { width: `${incRatio}%` }]} />
              <View style={[styles.ratioExp, { width: `${expRatio}%` }]} />
            </View>
            <View style={styles.ratioLegend}>
              <View style={styles.ratioItem}>
                <View style={[styles.ratioDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={[styles.ratioText, { color: cSub }]}>Income {incRatio.toFixed(0)}%</Text>
              </View>
              <View style={styles.ratioItem}>
                <View style={[styles.ratioDot, { backgroundColor: '#F87171' }]} />
                <Text style={[styles.ratioText, { color: cSub }]}>Expenses {expRatio.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActions}>
        <AnimatedPressable
          onPress={() => navigation.navigate('VoiceEntry')}
          style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.actionAccent, { backgroundColor: colors.primary }]} />
          <View style={[styles.actionRowIcon, { backgroundColor: colors.primary + '18' }]}> 
            <MaterialCommunityIcons name="microphone-message" size={20} color={colors.primary} />
          </View>
          <View style={styles.actionRowBody}>
            <Text style={[styles.actionRowLabel, { color: colors.text }]}>AI Voice Entry</Text>
            <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Speak income and expenses</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} style={styles.actionRowChev} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => navigation.navigate('AddIncome' as any)}
          style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.actionAccent, { backgroundColor: colors.success }]} />
          <View style={[styles.actionRowIcon, { backgroundColor: colors.success + '18' }]}>
            <MaterialCommunityIcons name="cash-plus" size={20} color={colors.success} />
          </View>
          <View style={styles.actionRowBody}>
            <Text style={[styles.actionRowLabel, { color: colors.text }]}>{t('dashboard.addIncome')}</Text>
            <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Record earnings</Text>
          </View>
          <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.success} style={styles.actionRowChev} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => navigation.navigate('AddExpense' as any)}
          style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.actionAccent, { backgroundColor: colors.error }]} />
          <View style={[styles.actionRowIcon, { backgroundColor: colors.error + '18' }]}>
            <MaterialCommunityIcons name="cash-minus" size={20} color={colors.error} />
          </View>
          <View style={styles.actionRowBody}>
            <Text style={[styles.actionRowLabel, { color: colors.text }]}>{t('dashboard.addExpense')}</Text>
            <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Track spending</Text>
          </View>
          <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.error} style={styles.actionRowChev} />
        </AnimatedPressable>
      </View>

      {/* ── Spending Breakdown ── */}
      {typeEntries.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { backgroundColor: colors.error + '12', borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: colors.error }]} />
            <MaterialCommunityIcons name="chart-donut" size={15} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('reports.spendingByType')}</Text>
            <Text style={[styles.cardPill, { backgroundColor: colors.error + '18', color: colors.error }]}>
              {formatCurrency(monthlyTotal)}
            </Text>
          </View>
          {typeEntries.map(([typeName, amount], i) => {
            const icon = TYPE_ICONS[typeName] ?? DEFAULT_TYPE_ICON;
            const color = getColorForIndex(i);
            const pct = monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0;
            return (
              <View key={typeName} style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={icon} size={15} color={color} />
                </View>
                <View style={styles.breakdownBody}>
                  <View style={styles.breakdownTop}>
                    <Text style={[styles.breakdownName, { color: colors.text }]}>
                      {typeName.charAt(0).toUpperCase() + typeName.slice(1)}
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: colors.text }]}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                  <Text style={[styles.breakdownPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Recent Expenses ── */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.error }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.recentExpenses')}</Text>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Main', { screen: 'Expenses' } as any)}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{t('dashboard.viewAll')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {recentExpenses.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="receipt-text-clock-outline" size={36} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('dashboard.noExpenses')}</Text>
        </View>
      ) : (
        recentExpenses.map(expense => (
          <ExpenseListItem
            key={expense.id}
            expense={expense}
            onPress={() => navigation.navigate('ExpenseDetails', { expenseId: expense.id })}
          />
        ))
      )}

      {/* ── Recent Income ── */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.success }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.recentIncome')}</Text>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Main', { screen: 'Income' } as any)}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{t('dashboard.viewAll')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {recentIncomes.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="cash-plus" size={36} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('dashboard.noIncome')}</Text>
        </View>
      ) : (
        recentIncomes.map(income => {
          const iconName = INCOME_SOURCE_ICONS[income.source] ?? DEFAULT_INCOME_ICON;
          return (
            <AnimatedPressable
              key={income.id}
              onPress={() => navigation.navigate('AddIncome', { income })}
              style={[styles.incomeItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.incomeAccent, { backgroundColor: colors.success }]} />
              <View style={[styles.incomeIcon, { backgroundColor: colors.success + '18' }]}>
                <MaterialCommunityIcons name={iconName} size={20} color={colors.success} />
              </View>
              <View style={styles.incomeBody}>
                <Text style={[styles.incomeTitle, { color: colors.text }]} numberOfLines={1}>{income.title}</Text>
                <Text style={[styles.incomeMeta, { color: colors.textSecondary }]}>
                  {income.source.charAt(0).toUpperCase() + income.source.slice(1)} · {formatDate(income.date)}
                </Text>
              </View>
              <Text style={[styles.incomeAmount, { color: colors.success }]}>+{formatCurrency(income.amount)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.border} />
            </AnimatedPressable>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Balance card
  balanceCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  glow1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)', top: -70, right: -50 },
  glow2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(74,222,128,0.06)', bottom: -30, left: -20 },

  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  balanceMonth: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  balanceLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  balanceBadgeText: { fontSize: 12, fontWeight: '700' },
  balanceValue: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },

  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricTile: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 6 },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', flex: 1 },
  metricValue: { fontSize: 16, fontWeight: '800' },

  ratioWrap: { gap: 6 },
  ratioBar: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  ratioInc: { height: 8, backgroundColor: '#4ADE80' },
  ratioExp: { height: 8, backgroundColor: '#F87171' },
  ratioLegend: { flexDirection: 'row', gap: 16 },
  ratioItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratioDot: { width: 7, height: 7, borderRadius: 3.5 },
  ratioText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  // Quick actions
  quickActions: { gap: 10, marginBottom: 20 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionAccent: { width: 4, alignSelf: 'stretch' },
  actionRowIcon: { width: 44, height: 44, margin: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionRowBody: { flex: 1, paddingVertical: 14 },
  actionRowLabel: { fontSize: 15, fontWeight: '700' },
  actionRowSub: { fontSize: 12, marginTop: 2 },
  actionRowChev: { marginRight: 16 },

  // Spending breakdown card
  card: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardAccent: { width: 3, height: 16, borderRadius: 2 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  cardPill: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },

  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
  breakdownIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  breakdownBody: { flex: 1 },
  breakdownTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  breakdownName: { fontSize: 13, fontWeight: '600' },
  breakdownAmount: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4 },
  breakdownPct: { fontSize: 10, marginTop: 3, marginBottom: 2 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAll: { fontSize: 12, fontWeight: '600' },

  emptyCard: { alignItems: 'center', paddingVertical: 32, borderRadius: 14, borderWidth: 1, gap: 10, marginBottom: 8 },
  emptyText: { fontSize: 14 },

  // Income items
  incomeItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  incomeAccent: { width: 4, alignSelf: 'stretch' },
  incomeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginRight: 10, marginVertical: 12 },
  incomeBody: { flex: 1 },
  incomeTitle: { fontSize: 14, fontWeight: '600' },
  incomeMeta: { fontSize: 12, marginTop: 2 },
  incomeAmount: { fontSize: 15, fontWeight: '800', marginRight: 4 },
});

export default DashboardScreen;
