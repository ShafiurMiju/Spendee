import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, LoadingOverlay, AlertModal, EmptyState } from '../../components/common';
import { getTenant, deactivateTenant } from '../../services/tenantService';
import { getPaymentsByTenant } from '../../services/rentService';
import { getFlats } from '../../services/flatService';
import { getOwners } from '../../services/ownerService';
import { Tenant, RentPayment, RootStackParamList, Flat, Owner } from '../../types';
import { formatCurrency, formatDate, toMonthKey } from '../../utils/formatting';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TenantDetails'>;
type RouteType = RouteProp<RootStackParamList, 'TenantDetails'>;

const TenantDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [flat, setFlat] = useState<Flat | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: t('rent.tenantDetails') });
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tenantData, paymentData, flatsData, ownersData] = await Promise.all([
        getTenant(route.params.tenantId),
        getPaymentsByTenant(route.params.tenantId),
        getFlats(),
        getOwners(),
      ]);
      setTenant(tenantData);
      setPayments(paymentData);
      if (tenantData) {
        const f = flatsData.find(fl => fl.id === tenantData.flatId) ?? null;
        setFlat(f);
        if (f) {
          setOwner(ownersData.find(o => o.id === f.ownerId) ?? null);
        }
      }
    } catch (e) {
      console.warn('TenantDetails loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    setAlertConfig({
      visible: true,
      title: t('rent.deactivate'),
      message: t('rent.deactivateConfirm'),
      type: 'confirm',
      destructive: true,
      confirmText: t('rent.deactivate'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deactivateTenant(route.params.tenantId);
          setAlertConfig({
            visible: true,
            title: t('common.success'),
            message: t('rent.deactivateSuccess'),
            type: 'success',
            onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
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
  };

  if (loading) return <LoadingOverlay />;
  if (!tenant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 48 }}>
          Tenant not found
        </Text>
      </View>
    );
  }

  const renderPayment = ({ item }: { item: RentPayment }) => (
    <View style={[styles.paymentRow, { borderBottomColor: colors.border }]}>
      <View>
        <Text style={[styles.paymentMonth, { color: colors.text }]}>{item.month}</Text>
        {item.dueAmount > 0 && (
          <Text style={[styles.paymentDue, { color: colors.error }]}>
            {t('rent.dueAmount')}: {formatCurrency(item.dueAmount)}
          </Text>
        )}
      </View>
      <View style={styles.paymentRight}>
        <Text style={[styles.paymentAmount, { color: item.dueAmount > 0 ? '#FBBF24' : colors.success }]}>
          {formatCurrency(item.amount)}
        </Text>
        <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
          {formatDate(item.paymentDate)}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      data={payments}
      keyExtractor={item => item.id}
      renderItem={renderPayment}
      ListHeaderComponent={
        <>
          <Card>
            <DetailRow icon="account-outline" label={t('rent.name')} value={tenant.name} colors={colors} />
            <DetailRow icon="door" label={t('rent.flatNumber')} value={flat?.flatNumber ?? '—'} colors={colors} />
            <DetailRow icon="account-tie-outline" label={t('rent.ownerName')} value={owner?.name ?? '—'} colors={colors} />
            <DetailRow icon="cash" label={t('rent.rentAmount')} value={formatCurrency(tenant.rentAmount)} colors={colors} />
            {flat?.billBreakdown && (
              <>
                <DetailRow icon="home-outline" label={t('rent.baseRent')} value={formatCurrency(flat.billBreakdown.baseRent)} colors={colors} />
                <DetailRow icon="fire" label={t('rent.gasBill')} value={formatCurrency(flat.billBreakdown.gasBill)} colors={colors} />
                <DetailRow icon="broom" label={t('rent.cleaningBill')} value={formatCurrency(flat.billBreakdown.cleaningBill)} colors={colors} />
                <DetailRow icon="water" label={t('rent.waterBill')} value={formatCurrency(flat.billBreakdown.waterBill)} colors={colors} />
                <DetailRow icon="dots-horizontal" label={t('rent.otherBill')} value={formatCurrency(flat.billBreakdown.otherBill)} colors={colors} />
              </>
            )}
            <DetailRow icon="phone-outline" label={t('rent.phone')} value={tenant.phone} colors={colors} />
            <DetailRow
              icon="calendar-month-outline"
              label={t('rent.joinMonth')}
              value={tenant.joinMonth ?? toMonthKey(tenant.movedInAt)}
              colors={colors}
            />
            <DetailRow
              icon="circle-outline"
              label={t('common.status')}
              value={tenant.isActive ? t('rent.active') : t('rent.inactive')}
              colors={colors}
            />
            {!tenant.isActive && tenant.leftAt && (
              <DetailRow
                icon="calendar-remove-outline"
                label="Left On"
                value={new Date(tenant.leftAt).toLocaleDateString()}
                colors={colors}
              />
            )}
          </Card>

          {tenant.isActive && (
            <View style={styles.actions}>
              <Button
                title={t('common.edit')}
                iconName="pencil-outline"
                onPress={() =>
                  navigation.navigate('AddTenant', { tenant })
                }
                style={styles.actionBtn}
              />
              <Button
                title={t('rent.deactivate')}
                iconName="account-off-outline"
                variant="danger"
                onPress={handleDeactivate}
                style={styles.actionBtn}
              />
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('rent.paymentHistory')}
          </Text>
        </>
      }
      ListEmptyComponent={
        <EmptyState icon="cash-clock" message={t('rent.noPayments')} />
      }
    />
  );
};

const DetailRow: React.FC<{
  icon: string;
  label: string;
  value: string;
  colors: any;
}> = ({ icon, label, value, colors }) => (
  <View style={[detailStyles.row, { borderBottomColor: colors.border }]}>
    <View style={detailStyles.labelRow}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
      <Text style={[detailStyles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
    <Text style={[detailStyles.value, { color: colors.text }]}>{value}</Text>
  </View>
);

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymentMonth: { fontSize: 14, fontWeight: '600' },
  paymentDue: { fontSize: 11, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: 14, fontWeight: '500' },
  paymentDate: { fontSize: 12, marginTop: 2 },
});

export default TenantDetailsScreen;
