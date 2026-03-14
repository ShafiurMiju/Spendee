import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, AlertModal } from '../../components/common';
import { addExpense, updateExpense } from '../../services/expenseService';
import { getCategories, seedCategoriesForType } from '../../services/categoryService';
import { onExpenseTypesSnapshot, seedDefaultExpenseTypes } from '../../services/expenseTypeService';
import { ExpenseInput, RootStackParamList, Category, ExpenseType, ExpenseTypeItem } from '../../types';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, TYPE_ICONS, DEFAULT_TYPE_ICON } from '../../constants/categories';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;
type RouteType = RouteProp<RootStackParamList, 'AddExpense'>;

const AddExpenseScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const editingExpense = route.params?.expense;
  const isEditing = !!editingExpense;

  const [title, setTitle] = useState(editingExpense?.title ?? '');
  const [amount, setAmount] = useState(
    editingExpense ? String(editingExpense.amount) : '',
  );
  const [type, setType] = useState<ExpenseType>(
    editingExpense?.type ?? 'household',
  );
  const [category, setCategory] = useState(editingExpense?.category ?? '');
  const [date, setDate] = useState(
    editingExpense ? new Date(editingExpense.date) : new Date(),
  );
  const [note, setNote] = useState(editingExpense?.note ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeItem[]>([]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('expense.editExpense') : t('expense.addExpense'),
    });
  }, [navigation, isEditing, t]);

  useEffect(() => {
    const unsubscribe = onExpenseTypesSnapshot(
      types => {
        if (types.length === 0) {
          seedDefaultExpenseTypes().catch(console.warn);
        } else {
          setExpenseTypes(types);
          // Set default type only for new expenses
          if (!editingExpense) {
            setType(prev => (prev === 'household' ? types[0]?.name ?? 'household' : prev));
          }
        }
      },
      console.warn,
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        let cats = await getCategories(type);
        if (cats.length === 0) {
          await seedCategoriesForType(type);
          cats = await getCategories(type);
        }
        setCategories(cats);
      } catch (e) {
        console.warn('Failed to load categories:', e);
      }
    };
    loadCategories();
  }, [type]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Title is required',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Valid amount is required',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const input: ExpenseInput = {
        title: title.trim(),
        amount: Number(amount),
        type,
        category,
        date: date.getTime(),
        note: note.trim(),
      };

      if (isEditing && editingExpense) {
        await updateExpense(editingExpense.id, input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('expense.updateSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
        });
      } else {
        await addExpense(input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('expense.addSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
        });
      }
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: e.message,
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
    } finally {
      setSaving(false);
    }
  };

  const capitalizeType = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('expense.type')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeScrollView}
        contentContainerStyle={styles.typeScrollContent}>
        {expenseTypes.map(et => {
          const icon = TYPE_ICONS[et.name] ?? DEFAULT_TYPE_ICON;
          const isSelected = type === et.name;
          return (
            <TouchableOpacity
              key={et.id}
              style={[
                styles.typeChip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                setType(et.name);
                setCategory('');
              }}>
              <MaterialCommunityIcons
                name={icon}
                size={16}
                color={isSelected ? colors.textInverse : colors.text}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: isSelected ? colors.textInverse : colors.text,
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                {capitalizeType(et.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Input
        label={t('expense.titleField')}
        leftIcon="format-title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Monthly rent"
      />

      <Input
        label={t('expense.amount')}
        leftIcon="cash"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('expense.category')}
      </Text>
      <View style={styles.categoryGrid}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            {
              backgroundColor:
                category === '' ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setCategory('')}>
          <MaterialCommunityIcons
            name="close-circle-outline"
            size={14}
            color={category === '' ? colors.textInverse : colors.text}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              color: category === '' ? colors.textInverse : colors.text,
              fontSize: 13,
            }}>
            None
          </Text>
        </TouchableOpacity>
        {categories.map(cat => {
          const catIcon = CATEGORY_ICONS[cat.name] || DEFAULT_CATEGORY_ICON;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    category === cat.name ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCategory(cat.name)}>
              <MaterialCommunityIcons
                name={catIcon}
                size={14}
                color={category === cat.name ? colors.textInverse : colors.text}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color:
                    category === cat.name ? colors.textInverse : colors.text,
                  fontSize: 13,
                }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('expense.date')}
      </Text>
      <TouchableOpacity
        style={[
          styles.dateBtn,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => setShowDatePicker(true)}>
        <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={{ color: colors.text }}>
          {date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <Input
        label={t('expense.note')}
        leftIcon="note-text-outline"
        value={note}
        onChangeText={setNote}
        placeholder="Optional note..."
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={isEditing ? t('common.save') : t('expense.addExpense')}
        iconName={isEditing ? 'content-save' : 'plus'}
        onPress={handleSave}
        loading={saving}
        style={styles.saveBtn}
      />

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  typeScrollView: { marginBottom: 20 },
  typeScrollContent: { gap: 8, paddingRight: 8 },
  typeChip: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  saveBtn: { marginTop: 8 },
});

export default AddExpenseScreen;
