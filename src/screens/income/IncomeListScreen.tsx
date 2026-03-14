import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, AlertModal } from '../../components/common';
import AnimatedPressable from '../../components/common/AnimatedPressable';
import { getIncomes, deleteIncome, IncomeFilter } from '../../services/incomeService';
import { Income, RootStackParamList } from '../../types';
import { DEFAULT_INCOME_SOURCES, INCOME_SOURCE_ICONS, DEFAULT_INCOME_ICON, MONTHS } from '../../constants/categories';
import { formatCurrency, formatDate, getMonthRange } from '../../utils/formatting';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const IncomeListScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  const loadIncomes = useCallback(async () => {
    setLoading(true);
    try {
      const filter: IncomeFilter = {};
      if (filterSource) filter.source = filterSource;
      if (filterMonth !== null) {
        const year = new Date().getFullYear();
        const { startDate, endDate } = getMonthRange(year, filterMonth);
        filter.dateRange = { startDate, endDate };
      }
      const data = await getIncomes(filter);
      setIncomes(data);
    } catch (e) {
      console.warn('IncomeList load error:', e);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterSource]);

  useEffect(() => { loadIncomes(); }, [loadIncomes]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadIncomes);
    return unsub;
  }, [navigation, loadIncomes]);

  const handleDelete = (item: Income) => {
    setAlertConfig({
      visible: true,
      title: t('common.delete'),
      message: t('income.deleteConfirm'),
      type: 'confirm',
      destructive: true,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deleteIncome(item.id);
          loadIncomes();
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

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const clearFilters = () => {
    setFilterMonth(null);
    setFilterSource(null);
  };

  const hasActiveFilter = filterMonth !== null || filterSource !== null;
  const totalFiltered = incomes.reduce((sum, i) => sum + i.amount, 0);

  const renderItem = ({ item }: { item: Income }) => {
    const icon = INCOME_SOURCE_ICONS[item.source] ?? DEFAULT_INCOME_ICON;
    return (
      <AnimatedPressable
        onPress={() => navigation.navigate('AddIncome', { income: item })}
        onLongPress={() => handleDelete(item)}
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.itemAccent, { backgroundColor: colors.success }]} />
        <View style={[styles.itemIcon, { backgroundColor: colors.success + '18' }]}>
          <MaterialCommunityIcons name={icon} size={20} color={colors.success} />
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
            {cap(item.source)} · {formatDate(item.date)}
          </Text>
          {item.note ? (
            <Text style={[styles.itemNote, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.itemAmount, { color: colors.success }]}>
          +{formatCurrency(item.amount)}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.border} style={styles.itemChevron} />
      </AnimatedPressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          {t('income.title')}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: colors.success + '18',
                borderColor: colors.success + '40',
              },
            ]}
            onPress={() => navigation.navigate('PDFExport', { source: 'income' })}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={18}
              color={colors.success}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: hasActiveFilter ? colors.success : colors.surface,
                borderColor: hasActiveFilter ? colors.success : colors.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={18}
              color={hasActiveFilter ? '#fff' : colors.success}
            />
            {hasActiveFilter && (
              <View style={[styles.filterDot, { backgroundColor: colors.error }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Summary Card ── */}
      <View style={[styles.summaryCard, { backgroundColor: colors.success + '0E', borderColor: colors.success + '35' }]}>
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryLabel, { color: colors.success + 'AA' }]}>
            {hasActiveFilter ? t('common.total') : t('dashboard.totalIncome')}
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(totalFiltered)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {incomes.length} records{hasActiveFilter ? ' · filtered' : ''}
          </Text>
        </View>
        <View style={[styles.summaryIconWrap, { backgroundColor: colors.success + '18' }]}>
          <MaterialCommunityIcons name="cash-plus" size={28} color={colors.success} />
        </View>
      </View>

      {/* ── Active Filter Chips ── */}
      {hasActiveFilter && (
        <View style={styles.activeFilterRow}>
          {filterSource && (
            <View style={[styles.activeChip, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
              <Text style={[styles.activeChipText, { color: colors.success }]}>{cap(filterSource)}</Text>
              <TouchableOpacity onPress={() => setFilterSource(null)}>
                <MaterialCommunityIcons name="close" size={12} color={colors.success} />
              </TouchableOpacity>
            </View>
          )}
          {filterMonth !== null && (
            <View style={[styles.activeChip, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
              <Text style={[styles.activeChipText, { color: colors.success }]}>{MONTHS[filterMonth].slice(0, 3)}</Text>
              <TouchableOpacity onPress={() => setFilterMonth(null)}>
                <MaterialCommunityIcons name="close" size={12} color={colors.success} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={[styles.clearAllText, { color: colors.error }]}>{t('expense.clearFilter')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={incomes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="cash-plus" message={t('income.noIncome')} />
          ) : null
        }
      />

      {/* ── Extended FAB ── */}
      <AnimatedPressable
        scaleValue={0.95}
        onPress={() => navigation.navigate('AddIncome')}
        style={[styles.fab, { backgroundColor: colors.success, bottom: insets.bottom + 20 }]}>
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.fabText}>
          {t('income.addIncome')}
        </Text>
      </AnimatedPressable>

      {/* ── Filter Modal ── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="filter-variant" size={20} color={colors.success} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('expense.applyFilter')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
              {t('income.source')}
            </Text>
            <View style={styles.chipRow}>
              {DEFAULT_INCOME_SOURCES.map(src => (
                <TouchableOpacity
                  key={src.name}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filterSource === src.name ? colors.success : colors.background,
                      borderColor: filterSource === src.name ? colors.success : colors.border,
                    },
                  ]}
                  onPress={() => setFilterSource(prev => (prev === src.name ? null : src.name))}>
                  <Text style={{ color: filterSource === src.name ? '#fff' : colors.text, fontSize: 13, fontWeight: '500' }}>
                    {cap(src.name)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
              {t('expense.filterByMonth')}
            </Text>
            <View style={styles.chipRow}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filterMonth === i ? colors.success : colors.background,
                      borderColor: filterMonth === i ? colors.success : colors.border,
                    },
                  ]}
                  onPress={() => setFilterMonth(filterMonth === i ? null : i)}>
                  <Text style={{ color: filterMonth === i ? '#fff' : colors.text, fontSize: 12 }}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.success }]}
                onPress={() => setShowFilterModal(false)}>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {t('expense.applyFilter')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => { clearFilters(); setShowFilterModal(false); }}>
                <MaterialCommunityIcons name="filter-remove-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text }}>{t('expense.clearFilter')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {alertConfig && <AlertModal {...alertConfig} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  summaryLeft: { flex: 1 },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryAmount: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  summaryCount: { fontSize: 12, marginTop: 4 },
  summaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Active filter chips
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeChipText: { fontSize: 12, fontWeight: '600' },
  clearAllText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 4 },

  // Item card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 10,
  },
  itemAccent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBody: { flex: 1, marginLeft: 10 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemNote: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  itemAmount: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  itemChevron: { marginLeft: 2 },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
});

export default IncomeListScreen;
