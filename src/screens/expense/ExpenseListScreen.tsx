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
import { EmptyState } from '../../components/common';
import AnimatedPressable from '../../components/common/AnimatedPressable';
import { getExpenses, ExpenseFilter } from '../../services/expenseService';
import { getCategories } from '../../services/categoryService';
import { Expense, RootStackParamList, Category, ExpenseType, ExpenseTypeItem } from '../../types';
import { getExpenseTypes } from '../../services/expenseTypeService';
import { MONTHS, CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { formatCurrency, formatDate, getMonthRange } from '../../utils/formatting';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ExpenseListScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ExpenseType | null>(null);
  const [allTypes, setAllTypes] = useState<ExpenseTypeItem[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const filter: ExpenseFilter = {};
      if (filterType) filter.type = filterType;
      if (filterCategory) filter.category = filterCategory;
      if (filterMonth !== null) {
        const year = new Date().getFullYear();
        const { startDate, endDate } = getMonthRange(year, filterMonth);
        filter.dateRange = { startDate, endDate };
      }
      const data = await getExpenses(filter);
      setExpenses(data);
    } catch (e) {
      console.warn('ExpenseList loadExpenses error:', e);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterCategory, filterType]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      console.warn('ExpenseList loadCategories error:', e);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, [loadExpenses, loadCategories]);

  useEffect(() => {
    getExpenseTypes()
      .then(types => setAllTypes(types))
      .catch(console.warn);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { loadExpenses(); });
    return unsub;
  }, [navigation, loadExpenses]);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const clearFilters = () => {
    setFilterMonth(null);
    setFilterCategory(null);
    setFilterType(null);
  };

  const hasActiveFilter = filterMonth !== null || filterCategory !== null || filterType !== null;
  const totalFiltered = expenses.reduce((sum, e) => sum + e.amount, 0);

  const renderItem = ({ item }: { item: Expense }) => {
    const icon = CATEGORY_ICONS[item.category] ?? DEFAULT_CATEGORY_ICON;
    const typeColor = item.type === 'household' ? colors.household : colors.personal;
    return (
      <AnimatedPressable
        onPress={() => navigation.navigate('ExpenseDetails', { expenseId: item.id })}
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.itemAccent, { backgroundColor: typeColor }]} />
        <View style={[styles.itemIcon, { backgroundColor: typeColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={20} color={typeColor} />
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
            {item.category ? `${cap(item.category)} · ` : ''}{formatDate(item.date)}
          </Text>
        </View>
        <Text style={[styles.itemAmount, { color: colors.text }]}>
          {formatCurrency(item.amount)}
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
          {t('expense.expenses')}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: colors.error + '18',
                borderColor: colors.error + '40',
              },
            ]}
            onPress={() => navigation.navigate('PDFExport', { source: 'expense' })}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={18}
              color={colors.error}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: hasActiveFilter ? colors.primary : colors.surface,
                borderColor: hasActiveFilter ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={18}
              color={hasActiveFilter ? colors.textInverse : colors.primary}
            />
            {hasActiveFilter && (
              <View style={[styles.filterDot, { backgroundColor: colors.error }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Summary Card ── */}
      <View style={[styles.summaryCard, { backgroundColor: colors.error + '0E', borderColor: colors.error + '35' }]}>
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryLabel, { color: colors.error + 'AA' }]}>
            {hasActiveFilter ? t('common.total') : t('dashboard.totalExpenses')}
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(totalFiltered)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {expenses.length} records{hasActiveFilter ? ' · filtered' : ''}
          </Text>
        </View>
        <View style={[styles.summaryIconWrap, { backgroundColor: colors.error + '18' }]}>
          <MaterialCommunityIcons name="receipt-text-outline" size={28} color={colors.error} />
        </View>
      </View>

      {/* ── Active Filter Chips ── */}
      {hasActiveFilter && (
        <View style={styles.activeFilterRow}>
          {filterType && (
            <View style={[styles.activeChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.activeChipText, { color: colors.primary }]}>{cap(filterType)}</Text>
              <TouchableOpacity onPress={() => setFilterType(null)}>
                <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {filterCategory && (
            <View style={[styles.activeChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.activeChipText, { color: colors.primary }]}>{cap(filterCategory)}</Text>
              <TouchableOpacity onPress={() => setFilterCategory(null)}>
                <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {filterMonth !== null && (
            <View style={[styles.activeChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.activeChipText, { color: colors.primary }]}>{MONTHS[filterMonth].slice(0, 3)}</Text>
              <TouchableOpacity onPress={() => setFilterMonth(null)}>
                <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
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
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="receipt-text-outline" message={t('expense.noExpenses')} />
          ) : null
        }
      />

      {/* ── Extended FAB ── */}
      <AnimatedPressable
        scaleValue={0.95}
        onPress={() => navigation.navigate('AddExpense')}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}>
        <MaterialCommunityIcons name="plus" size={20} color={colors.textInverse} />
        <Text style={[styles.fabText, { color: colors.textInverse }]}>
          {t('expense.addExpense')}
        </Text>
      </AnimatedPressable>

      <AnimatedPressable
        scaleValue={0.95}
        onPress={() => navigation.navigate('VoiceEntry', { defaultKind: 'expense' })}
        style={[styles.voiceFab, { backgroundColor: colors.surface, borderColor: colors.border, bottom: insets.bottom + 92 }]}>
        <MaterialCommunityIcons name="microphone-message" size={20} color={colors.primary} />
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
                <MaterialCommunityIcons name="filter-variant" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('expense.applyFilter')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
              {t('expense.type')}
            </Text>
            <View style={styles.chipRow}>
              {allTypes.map(et => (
                <TouchableOpacity
                  key={et.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filterType === et.name ? colors.primary : colors.background,
                      borderColor: filterType === et.name ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterType(prev => (prev === et.name ? null : et.name))}>
                  <Text style={{ color: filterType === et.name ? colors.textInverse : colors.text, fontSize: 13, fontWeight: '500' }}>
                    {cap(et.name)}
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
                      backgroundColor: filterMonth === i ? colors.primary : colors.background,
                      borderColor: filterMonth === i ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterMonth(filterMonth === i ? null : i)}>
                  <Text style={{ color: filterMonth === i ? colors.textInverse : colors.text, fontSize: 12 }}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
              {t('expense.filterByCategory')}
            </Text>
            <View style={styles.chipRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filterCategory === cat.name ? colors.primary : colors.background,
                      borderColor: filterCategory === cat.name ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}>
                  <Text style={{ color: filterCategory === cat.name ? colors.textInverse : colors.text, fontSize: 12 }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setShowFilterModal(false); loadExpenses(); }}>
                <MaterialCommunityIcons name="check" size={18} color={colors.textInverse} />
                <Text style={{ color: colors.textInverse, fontWeight: '600' }}>
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
  fabText: { fontSize: 15, fontWeight: '700' },
  voiceFab: {
    position: 'absolute',
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },

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

export default ExpenseListScreen;
