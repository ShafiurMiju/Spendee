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
  onExpenseTypesSnapshot,
  addExpenseType,
  deleteExpenseType,
  seedDefaultExpenseTypes,
} from '../../services/expenseTypeService';
import { ExpenseTypeItem, RootStackParamList } from '../../types';
import { TYPE_ICONS, DEFAULT_TYPE_ICON } from '../../constants/categories';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ManageTypesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [types, setTypes] = useState<ExpenseTypeItem[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    const unsub = onExpenseTypesSnapshot(
      fetched => {
        if (fetched.length === 0) {
          seedDefaultExpenseTypes().catch(console.warn);
        } else {
          setTypes(fetched);
        }
      },
      console.warn,
    );
    return () => unsub();
  }, []);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const handleAdd = async () => {
    const trimmed = newName.trim().toLowerCase();
    if (!trimmed) return;
    setAdding(true);
    try {
      await addExpenseType(trimmed, DEFAULT_TYPE_ICON);
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

  const handleDelete = (item: ExpenseTypeItem) => {
    if (item.isDefault) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('expenseType.cannotDeleteDefault'),
        type: 'warning',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }
    setAlertConfig({
      visible: true,
      title: t('common.delete'),
      message: t('expenseType.deleteConfirm'),
      type: 'confirm',
      destructive: true,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deleteExpenseType(item.id);
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
      <ScreenHeader title="Expense Types" subtitle={`${types.length} type${types.length !== 1 ? 's' : ''}`} />

      {/* ── Add Row ── */}
      <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="shape-plus" size={18} color={colors.primary} />
          <TextInput
            style={[styles.addInput, { color: colors.text }]}
            placeholder={t('expenseType.typeName')}
            placeholderTextColor={colors.placeholder}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleAdd}
            autoCapitalize="none"
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

      {/* ── Info Banner ── */}
      <View style={[styles.infoBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <MaterialCommunityIcons name="information-outline" size={14} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Types are used to group your expense categories
        </Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={types}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        renderItem={({ item }) => {
          const icon = TYPE_ICONS[item.name] ?? DEFAULT_TYPE_ICON;
          const isDefault = item.isDefault;
          return (
            <View style={[styles.typeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.typeLeft, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.typeBody}>
                <Text style={[styles.typeName, { color: colors.text }]}>{cap(item.name)}</Text>
                <View style={[styles.badge, {
                  backgroundColor: isDefault ? colors.textSecondary + '20' : colors.primary + '20',
                }]}>
                  <Text style={[styles.badgeText, { color: isDefault ? colors.textSecondary : colors.primary }]}>
                    {isDefault ? 'Default' : t('expenseType.custom')}
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
        ListEmptyComponent={<EmptyState icon="shape-outline" message={t('common.noData')} />}
      />

      {alertConfig && <AlertModal {...alertConfig} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    margin: 16,
    marginBottom: 8,
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

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoText: { fontSize: 12, flex: 1 },

  list: { paddingHorizontal: 16 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  typeLeft: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  typeBody: { flex: 1, gap: 4 },
  typeName: { fontSize: 15, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  lockIcon: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', opacity: 0.4 },
});

export default ManageTypesScreen;
