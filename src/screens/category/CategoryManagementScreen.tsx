import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, AlertModal, ScreenHeader } from '../../components/common';
import {
  addCategory,
  deleteCategory,
  onCategoriesSnapshot,
} from '../../services/categoryService';
import { Category, ExpenseTypeItem, RootStackParamList } from '../../types';
import { onExpenseTypesSnapshot, seedDefaultExpenseTypes } from '../../services/expenseTypeService';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CategoryManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<string>('household');
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeItem[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    const unsub = onCategoriesSnapshot(cats => setCategories(cats));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onExpenseTypesSnapshot(
      types => {
        if (types.length === 0) {
          seedDefaultExpenseTypes().catch(console.warn);
        } else {
          setExpenseTypes(types);
        }
      },
      console.warn,
    );
    return () => unsub();
  }, []);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const filtered = categories.filter(c => c.type === activeTab);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await addCategory(trimmed, activeTab);
      setNewName('');
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: e.message,
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (cat: Category) => {
    if (cat.isDefault) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('category.cannotDeleteDefault'),
        type: 'warning',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }
    setAlertConfig({
      visible: true,
      title: t('common.delete'),
      message: t('category.deleteConfirm'),
      type: 'confirm',
      destructive: true,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deleteCategory(cat.id);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <ScreenHeader title="Categories" subtitle={`${filtered.length} in ${cap(activeTab)}`} />

      {/* ── Type Tabs ── */}
      <FlatList
        horizontal
        data={expenseTypes}
        keyExtractor={et => et.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContent}
        style={styles.tabScroll}
        renderItem={({ item: et }) => {
          const isActive = activeTab === et.name;
          return (
            <TouchableOpacity
              style={[styles.tab, {
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
              }]}
              onPress={() => setActiveTab(et.name)}>
              <Text style={{ color: isActive ? colors.textInverse : colors.text, fontSize: 13, fontWeight: '600' }}>
                {cap(et.name)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Add Row ── */}
      <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="tag-plus-outline" size={18} color={colors.primary} />
          <TextInput
            style={[styles.addInput, { color: colors.text }]}
            placeholder={t('category.categoryName')}
            placeholderTextColor={colors.placeholder}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleAdd}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: adding ? colors.primary + '80' : colors.primary, opacity: adding ? 0.7 : 1 }]}
          onPress={handleAdd}
          disabled={adding}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        renderItem={({ item }) => {
          const catIcon = CATEGORY_ICONS[item.name] || DEFAULT_CATEGORY_ICON;
          const isDefault = item.isDefault;
          return (
            <View style={[styles.catRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.catLeft, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name={catIcon} size={20} color={colors.primary} />
              </View>
              <View style={styles.catBody}>
                <Text style={[styles.catName, { color: colors.text }]}>{item.name}</Text>
                <View style={[styles.badge, {
                  backgroundColor: isDefault ? colors.textSecondary + '20' : colors.primary + '20',
                }]}>
                  <Text style={[styles.badgeText, { color: isDefault ? colors.textSecondary : colors.primary }]}>
                    {isDefault ? 'Default' : t('category.custom')}
                  </Text>
                </View>
              </View>
              {!isDefault ? (
                <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]} onPress={() => handleDelete(item)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              ) : (
                <View style={styles.lockIcon}>
                  <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textSecondary} />
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="tag-outline" message={t('common.noData')} />}
      />

      {alertConfig && <AlertModal {...alertConfig} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  tabScroll: { maxHeight: 52, marginVertical: 12 },
  tabContent: { paddingHorizontal: 16, gap: 8 },
  tab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addInput: { flex: 1, fontSize: 14, padding: 0 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingTop: 4 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  catLeft: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  catBody: { flex: 1, gap: 4 },
  catName: { fontSize: 15, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  lockIcon: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', opacity: 0.4 },
});

export default CategoryManagementScreen;
