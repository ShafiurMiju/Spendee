import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, AlertModal } from '../../components/common';
import { TenantListItem, RentCostListItem } from '../../components/rent';
import { onTenantsSnapshot } from '../../services/tenantService';
import { onPaymentsSnapshot, onCostsSnapshot, addRentPayment } from '../../services/rentService';
import { Tenant, RentPayment, RentCost, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';
import { formatCurrency, toMonthKey } from '../../utils/formatting';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const RentDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  // Theme-aware card palette
  const cCardBg = theme.dark ? '#1E3A5F' : colors.card;
  const cBorder = theme.dark ? 'transparent' : colors.border;
  const cText   = theme.dark ? '#fff' : colors.text;
  const cSub    = theme.dark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
  const cFaint  = theme.dark ? 'rgba(255,255,255,0.1)' : colors.border;

  const [selectedMonth, setSelectedMonth] = useState(toMonthKey(Date.now()));
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [costs, setCosts] = useState<RentCost[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    const unsubscribe = onTenantsSnapshot(setTenants);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubPayments = onPaymentsSnapshot(selectedMonth, setPayments);
    const unsubCosts = onCostsSnapshot(selectedMonth, setCosts);
    return () => {
      unsubPayments();
      unsubCosts();
    };
  }, [selectedMonth]);

  const navigateMonth = (dir: -1 | 1) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(toMonthKey(d.getTime()));
  };

  const getMonthLabel = (): string => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const totalExpected = tenants.reduce((sum, tenant) => sum + tenant.rentAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
  const netIncome = totalCollected - totalCosts;
  const paidCount = tenants.filter(tenant =>
    payments.some(p => p.tenantId === tenant.id),
  ).length;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const handleMarkPaid = useCallback(
    (tenant: Tenant) => {
      setAlertConfig({
        visible: true,
        title: t('rent.markAsPaid'),
        message: t('rent.markAsPaidConfirm', {
          amount: formatCurrency(tenant.rentAmount),
          name: tenant.name,
        }),
        type: 'confirm',
        onConfirm: async () => {
          try {
            await addRentPayment({
              tenantId: tenant.id,
              month: selectedMonth,
              amount: tenant.rentAmount,
              paymentDate: Date.now(),
              note: '',
            });
            setAlertConfig({
              visible: true,
              title: t('common.success'),
              message: t('rent.paymentRecorded'),
              type: 'success',
              onConfirm: () => setAlertConfig(null),
            });
          } catch (e: any) {
            setAlertConfig({
              visible: true,
              title: t('common.error'),
              message: e.message,
              type: 'error',
              onConfirm: () => setAlertConfig(null),
            });
          }
        },
        onCancel: () => setAlertConfig(null),
      });
    },
    [selectedMonth, t],
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}>

      {/* ── Header Row ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Rent Collection</Text>
          <Text style={[styles.headerMonth, { color: colors.text }]}>{getMonthLabel()}</Text>
        </View>
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={[styles.monthNavBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigateMonth(-1)}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monthNavBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigateMonth(1)}>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ Summary Card ══ */}
      <View style={[styles.summaryCard, { backgroundColor: cCardBg, borderColor: cBorder, borderWidth: 1 }]}>
        <View style={styles.summaryGlow1} />
        <View style={styles.summaryGlow2} />

        {/* Net Income */}
        <View style={styles.netIncomeRow}>
          <View>
            <Text style={[styles.netIncomeLabel, { color: cSub }]}>{t('rent.netIncome')}</Text>
            <Text style={[styles.netIncomeValue, { color: netIncome >= 0 ? '#4ADE80' : '#F87171' }]}>
              {netIncome < 0 ? '-' : ''}{formatCurrency(Math.abs(netIncome))}
            </Text>
          </View>
          <View style={[styles.collectionBadge, { backgroundColor: collectionRate >= 100 ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)' }]}>
            <MaterialCommunityIcons
              name={collectionRate >= 100 ? 'check-circle' : 'clock-outline'}
              size={14}
              color={collectionRate >= 100 ? '#4ADE80' : '#FBBF24'} />
            <Text style={[styles.collectionBadgeText, { color: collectionRate >= 100 ? '#4ADE80' : '#FBBF24' }]}>
              {collectionRate}%
            </Text>
          </View>
        </View>

        {/* Metric tiles */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricTile, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)' }]}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name="cash-check" size={16} color="#4ADE80" />
              <Text style={[styles.metricLabel, { color: cSub }]}>{t('rent.totalCollected')}</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#4ADE80' }]}>{formatCurrency(totalCollected)}</Text>
          </View>
          <View style={[styles.metricTile, { backgroundColor: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.3)' }]}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name="cash-minus" size={16} color="#F87171" />
              <Text style={[styles.metricLabel, { color: cSub }]}>{t('rent.totalCosts')}</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#F87171' }]}>{formatCurrency(totalCosts)}</Text>
          </View>
        </View>

        {/* Expected & Paid row */}
        <View style={[styles.statsRow, { borderTopColor: cFaint }]}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={14} color="#FBBF24" />
            <Text style={[styles.statLabel, { color: cSub }]}>{t('rent.totalExpected')}</Text>
            <Text style={[styles.statValue, { color: cText }]}>{formatCurrency(totalExpected)}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: cFaint }]} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-check" size={14} color={theme.dark ? '#7BB3E8' : colors.primary} />
            <Text style={[styles.statLabel, { color: cSub }]}>{t('rent.paid')}</Text>
            <Text style={[styles.statValue, { color: cText }]}>{paidCount}/{tenants.length}</Text>
          </View>
        </View>

        {/* Collection progress bar */}
        {totalExpected > 0 && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: cFaint }]}>
              <View style={[styles.progressFill, { width: `${Math.min(collectionRate, 100)}%`, backgroundColor: collectionRate >= 100 ? '#4ADE80' : '#FBBF24' }]} />
            </View>
          </View>
        )}
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('AddTenant')}
          activeOpacity={0.7}>
          <View style={[styles.quickIcon, { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>{t('rent.addTenant')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('AddRentCost')}
          activeOpacity={0.7}>
          <View style={[styles.quickIcon, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="cash-minus" size={20} color={colors.error} />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>{t('rent.addCost')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('RentReport')}
          activeOpacity={0.7}>
          <View style={[styles.quickIcon, { backgroundColor: colors.warning + '15' }]}>
            <MaterialCommunityIcons name="chart-bar" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tenants Section ── */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('rent.tenants')}</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{paidCount}/{tenants.length}</Text>
        </View>
      </View>

      {tenants.length === 0 ? (
        <EmptyState
          icon="account-group-outline"
          message={t('rent.noTenants')}
        />
      ) : (
        <View style={styles.listPadding}>
          {tenants.map(tenant => {
            const isPaid = payments.some(p => p.tenantId === tenant.id);
            return (
              <TenantListItem
                key={tenant.id}
                tenant={tenant}
                isPaid={isPaid}
                onPress={() =>
                  navigation.navigate('TenantDetails', { tenantId: tenant.id })
                }
                onMarkPaid={() => handleMarkPaid(tenant)}
              />
            );
          })}
        </View>
      )}

      {/* ── Costs Section ── */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.error }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('rent.costs')}</Text>
        {costs.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.error + '18' }]}>
            <Text style={[styles.countText, { color: colors.error }]}>{costs.length}</Text>
          </View>
        )}
      </View>

      {costs.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <MaterialCommunityIcons name="cash-remove" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('rent.noCosts')}</Text>
        </View>
      ) : (
        <View style={styles.listPadding}>
          {costs.map(cost => (
            <RentCostListItem
              key={cost.id}
              cost={cost}
              onPress={() => navigation.navigate('AddRentCost', { cost })}
            />
          ))}
        </View>
      )}

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header row (matches Dashboard greeting+avatar pattern)
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  headerLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  headerMonth: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  monthNav: { flexDirection: 'row', gap: 8 },
  monthNavBtn: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },

  // Summary card
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryGlow1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(74,222,128,0.06)',
    top: -60,
    right: -30,
  },
  summaryGlow2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(248,113,113,0.06)',
    bottom: -40,
    left: -20,
  },
  netIncomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  netIncomeLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  netIncomeValue: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  collectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  collectionBadgeText: { fontSize: 12, fontWeight: '700' },

  // Metric tiles
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontSize: 11, fontWeight: '500' },
  metricValue: { fontSize: 18, fontWeight: '800' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statValue: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },
  statDivider: { width: 1, height: 20, marginHorizontal: 10 },

  // Progress bar
  progressWrap: { marginTop: 14 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: { fontSize: 12, fontWeight: '600' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: { fontSize: 12, fontWeight: '700' },

  // List padding
  listPadding: { paddingHorizontal: 16 },

  // Empty costs card
  emptyCard: {
    borderRadius: 14,
    padding: 28,
    marginHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 14 },
});

export default RentDashboardScreen;
