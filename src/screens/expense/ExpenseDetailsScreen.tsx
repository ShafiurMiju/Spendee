import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Button, Card, LoadingOverlay, AlertModal } from '../../components/common';
import { getExpense, deleteExpense } from '../../services/expenseService';
import { Expense, RootStackParamList } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatting';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ExpenseDetails'>;
type RouteType = RouteProp<RootStackParamList, 'ExpenseDetails'>;

const DETAIL_ICONS: Record<string, string> = {
  title: 'format-title',
  category: 'tag-outline',
  date: 'calendar',
  note: 'note-text-outline',
};

const ExpenseDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: t('expense.expenseDetails') });
    loadExpense();
  }, []);

  const loadExpense = async () => {
    try {
      const data = await getExpense(route.params.expenseId);
      setExpense(data);
    } catch (e) {
      console.warn('ExpenseDetails loadExpense error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setAlertConfig({
      visible: true,
      title: t('common.delete'),
      message: t('expense.deleteConfirm'),
      type: 'confirm',
      destructive: true,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deleteExpense(route.params.expenseId);
          setAlertConfig({
            visible: true,
            title: t('common.success'),
            message: t('expense.deleteSuccess'),
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
  if (!expense) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 48 }}>
          Expense not found
        </Text>
      </View>
    );
  }

  const typeColor =
    expense.type === 'household' ? colors.household : colors.personal;
  const catIcon = CATEGORY_ICONS[expense.category] || DEFAULT_CATEGORY_ICON;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Card>
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <MaterialCommunityIcons
              name={expense.type === 'household' ? 'home-outline' : 'account-outline'}
              size={14}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.typeText, { color: '#fff' }]}>
              {t(`expense.${expense.type}`)}
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatCurrency(expense.amount)}
          </Text>
        </View>

        <DetailRow icon={DETAIL_ICONS.title} label={t('expense.titleField')} value={expense.title} colors={colors} />
        <DetailRow icon={catIcon} label={t('expense.category')} value={expense.category || 'None'} colors={colors} />
        <DetailRow icon={DETAIL_ICONS.date} label={t('expense.date')} value={formatDate(expense.date)} colors={colors} />
        {expense.note ? (
          <DetailRow icon={DETAIL_ICONS.note} label={t('expense.note')} value={expense.note} colors={colors} />
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button
          title={t('common.edit')}
          iconName="pencil-outline"
          onPress={() =>
            navigation.navigate('AddExpense', { expense })
          }
          style={styles.actionBtn}
        />
        <Button
          title={t('common.delete')}
          iconName="trash-can-outline"
          variant="danger"
          onPress={handleDelete}
          style={styles.actionBtn}
        />
      </View>

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
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
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  amount: { fontSize: 28, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
});

export default ExpenseDetailsScreen;
