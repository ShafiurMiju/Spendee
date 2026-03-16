import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, AlertModal } from '../../components/common';
import { TenantListItem, RentCostListItem } from '../../components/rent';
import { onAllTenantsSnapshot } from '../../services/tenantService';
import { onPaymentsSnapshot, onCostsSnapshot, addRentPayment } from '../../services/rentService';
import { onFlatsSnapshot } from '../../services/flatService';
import { Tenant, RentPayment, RentCost, Flat, RootStackParamList } from '../../types';
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
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [costs, setCosts] = useState<RentCost[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentTenant, setPaymentTenant] = useState<Tenant | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    const unsubTenants = onAllTenantsSnapshot(setAllTenants);
    const unsubFlats = onFlatsSnapshot(setFlats);
    return () => {
      unsubTenants();
      unsubFlats();
    };
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

  // Derive month-aware current & past tenants
  const { tenants, pastTenants } = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd   = new Date(y, m, 0, 23, 59, 59, 999).getTime();

    const current: Tenant[] = [];
    const past: Tenant[] = [];

    for (const t of allTenants) {
      const movedIn = t.movedInAt ?? t.createdAt;
      if (movedIn > monthEnd) continue; // hasn't moved in yet

      // Active during this month: still active OR left during/after this month
      if (t.isActive || (t.leftAt && t.leftAt >= monthStart)) {
        current.push(t);
      } else if (t.leftAt && t.leftAt < monthStart) {
        // Left before this month began → past tenant
        past.push(t);
      }
    }

    current.sort((a, b) => a.name.localeCompare(b.name));
    past.sort((a, b) => (b.leftAt ?? b.createdAt) - (a.leftAt ?? a.createdAt));

    return { tenants: current, pastTenants: past };
  }, [allTenants, selectedMonth]);

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
      setPaymentTenant(tenant);
      setPaymentAmount(String(tenant.rentAmount));
      setPaymentModalVisible(true);
    },
    [],
  );

  const confirmPayment = useCallback(async () => {
    if (!paymentTenant) return;
    const amt = Number(paymentAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Please enter a valid amount',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }
    setPaymentModalVisible(false);
    try {
      const expected = paymentTenant.rentAmount;
      const due = expected - amt;
      await addRentPayment({
        tenantId: paymentTenant.id,
        month: selectedMonth,
        amount: amt,
        expectedAmount: expected,
        dueAmount: due > 0 ? due : 0,
        paymentDate: Date.now(),
        note: due > 0 ? `Partial payment. Due: ${formatCurrency(due)}` : '',
      });
      setAlertConfig({
        visible: true,
        title: t('common.success'),
        message: due > 0
          ? `${t('rent.paymentRecorded')} (Due: ${formatCurrency(due)})`
          : t('rent.paymentRecorded'),
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
    setPaymentTenant(null);
  }, [paymentTenant, paymentAmount, selectedMonth, t]);

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

      {/* ── Quick Actions Row 2 ── */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('ManageOwners')}
          activeOpacity={0.7}>
          <View style={[styles.quickIcon, { backgroundColor: '#60A5FA15' }]}>
            <MaterialCommunityIcons name="account-tie" size={20} color="#60A5FA" />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>{t('rent.owners')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('AddOwnerContribution')}
          activeOpacity={0.7}>
          <View style={[styles.quickIcon, { backgroundColor: '#A78BFA15' }]}>
            <MaterialCommunityIcons name="cash-plus" size={20} color="#A78BFA" />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>{t('rent.addMoney')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('ManageFlats')}
          activeOpacity={0.7}>
          <View style={[styles.quickIcon, { backgroundColor: '#34D39915' }]}>
            <MaterialCommunityIcons name="door" size={20} color="#34D399" />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>{t('rent.flats')}</Text>
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
                flats={flats}
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

      {/* ── Past Tenants Section (grouped by flat) ── */}
      {pastTenants.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={[styles.sectionAccent, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('rent.pastTenants')}</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.textSecondary + '18' }]}>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>{pastTenants.length}</Text>
            </View>
          </View>
          <View style={styles.listPadding}>
            {(() => {
              // Group past tenants by flat
              const grouped: Record<string, typeof pastTenants> = {};
              for (const pt of pastTenants) {
                const key = pt.flatId;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(pt);
              }
              return Object.entries(grouped).map(([fId, pts]) => {
                const flat = flats.find(f => f.id === fId);
                return (
                  <View key={fId} style={{ marginBottom: 16 }}>
                    {/* Flat header */}
                    <View style={[styles.pastFlatHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <MaterialCommunityIcons name="door" size={16} color={colors.primary} />
                      <Text style={[styles.pastFlatName, { color: colors.text }]}>
                        {flat?.flatNumber ?? t('rent.unknownFlat')}
                      </Text>
                      <View style={[styles.pastFlatBadge, { backgroundColor: colors.textSecondary + '18' }]}>
                        <Text style={[styles.pastFlatBadgeText, { color: colors.textSecondary }]}>{pts.length}</Text>
                      </View>
                    </View>
                    {/* Tenants under this flat */}
                    {pts.map(pt => (
                      <TouchableOpacity
                        key={pt.id}
                        style={[styles.pastTenantCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('TenantDetails', { tenantId: pt.id })}
                        activeOpacity={0.7}>
                        <View style={[styles.pastTenantIcon, { backgroundColor: colors.textSecondary + '18' }]}>
                          <MaterialCommunityIcons name="account-off-outline" size={18} color={colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pastTenantName, { color: colors.text }]}>{pt.name}</Text>
                          <Text style={[styles.pastTenantSub, { color: colors.textSecondary }]}>
                            {formatCurrency(pt.rentAmount)}
                            {pt.movedInAt ? ` · ${t('rent.movedIn')}: ${new Date(pt.movedInAt).toLocaleDateString()}` : ''}
                          </Text>
                          {pt.leftAt && (
                            <Text style={[styles.pastTenantSub, { color: colors.error }]}>
                              {t('rent.leftOn')}: {new Date(pt.leftAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              });
            })()}
          </View>
        </>
      )}

      {/* ── Payment Amount Modal ── */}
      {paymentModalVisible && paymentTenant && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('rent.collectRent')}</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {paymentTenant.name} · Flat {flats.find(f => f.id === paymentTenant.flatId)?.flatNumber ?? '—'}
            </Text>
            <Text style={[styles.modalExpected, { color: colors.textSecondary }]}>
              {t('rent.totalExpected')}: {formatCurrency(paymentTenant.rentAmount)}
            </Text>

            <View style={[styles.modalInputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="cash" size={20} color={colors.primary} />
              <TextInput
                style={[styles.modalInput, { color: colors.text }]}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="Enter amount paid"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            </View>

            {Number(paymentAmount) > 0 && Number(paymentAmount) < paymentTenant.rentAmount && (
              <Text style={[styles.modalDue, { color: '#FBBF24' }]}>
                Due: {formatCurrency(paymentTenant.rentAmount - Number(paymentAmount))}
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surface }]}
                onPress={() => { setPaymentModalVisible(false); setPaymentTenant(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={confirmPayment}>
                <Text style={[styles.modalBtnText, { color: colors.textInverse }]}>{t('rent.confirmPayment')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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

  // Past tenants
  pastTenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  pastTenantIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastTenantName: { fontSize: 15, fontWeight: '600' },
  pastTenantSub: { fontSize: 12, marginTop: 2 },
  pastFlatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pastFlatName: { flex: 1, fontSize: 14, fontWeight: '700' },
  pastFlatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pastFlatBadgeText: { fontSize: 11, fontWeight: '700' },

  // Payment modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalCard: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalExpected: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  modalDue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default RentDashboardScreen;
