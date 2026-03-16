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
import { addRentCost, updateRentCost } from '../../services/rentService';
import { getOwners } from '../../services/ownerService';
import { RentCostInput, RootStackParamList, Owner } from '../../types';
import { DEFAULT_RENT_COST_CATEGORIES, RENT_COST_CATEGORY_ICONS, DEFAULT_RENT_COST_ICON } from '../../constants/rent';
import { AlertModalConfig } from '../../components/common/AlertModal';
import { toMonthKey } from '../../utils/formatting';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddRentCost'>;
type RouteType = RouteProp<RootStackParamList, 'AddRentCost'>;

const AddRentCostScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const editingCost = route.params?.cost;
  const isEditing = !!editingCost;

  const [title, setTitle] = useState(editingCost?.title ?? '');
  const [amount, setAmount] = useState(
    editingCost ? String(editingCost.amount) : '',
  );
  const [category, setCategory] = useState(editingCost?.category ?? '');
  const [date, setDate] = useState(
    editingCost ? new Date(editingCost.date) : new Date(),
  );
  const [note, setNote] = useState(editingCost?.note ?? '');
  const [ownerOnly, setOwnerOnly] = useState(editingCost?.ownerOnly ?? '');
  const [owners, setOwners] = useState<Owner[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('rent.editCost') : t('rent.addCost'),
    });
    getOwners().then(setOwners);
  }, [navigation, isEditing, t]);

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
      const input: RentCostInput = {
        title: title.trim(),
        category,
        amount: Number(amount),
        date: date.getTime(),
        month: toMonthKey(date.getTime()),
        note: note.trim(),
        ownerOnly,
      };

      if (isEditing && editingCost) {
        await updateRentCost(editingCost.id, input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.costUpdateSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
        });
      } else {
        await addRentCost(input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.costAddSuccess'),
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      keyboardShouldPersistTaps="handled">
      <Input
        label={t('rent.costTitle')}
        leftIcon="format-title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Plumbing repair"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('rent.costCategory')}
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
        {DEFAULT_RENT_COST_CATEGORIES.map(cat => {
          const catIcon = RENT_COST_CATEGORY_ICONS[cat] || DEFAULT_RENT_COST_ICON;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    category === cat ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCategory(cat)}>
              <MaterialCommunityIcons
                name={catIcon}
                size={14}
                color={category === cat ? colors.textInverse : colors.text}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color:
                    category === cat ? colors.textInverse : colors.text,
                  fontSize: 13,
                }}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label={t('expense.amount')}
        leftIcon="cash"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('expense.date')}
      </Text>
      <TouchableOpacity
        style={[
          styles.dateBtn,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => setShowDatePicker(true)}>
        <MaterialCommunityIcons
          name="calendar"
          size={18}
          color={colors.primary}
          style={{ marginRight: 8 }}
        />
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

      {/* ── Owner-Only Expense ── */}
      {owners.length > 0 && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('rent.ownerOnlyExpense')}
          </Text>
          <View style={styles.categoryGrid}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: ownerOnly === '' ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setOwnerOnly('')}>
              <MaterialCommunityIcons
                name="account-group"
                size={14}
                color={ownerOnly === '' ? colors.textInverse : colors.text}
                style={{ marginRight: 4 }}
              />
              <Text style={{ color: ownerOnly === '' ? colors.textInverse : colors.text, fontSize: 13 }}>
                {t('rent.sharedByAll')}
              </Text>
            </TouchableOpacity>
            {owners.map(owner => (
              <TouchableOpacity
                key={owner.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: ownerOnly === owner.id ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setOwnerOnly(owner.id)}>
                <MaterialCommunityIcons
                  name="account-tie"
                  size={14}
                  color={ownerOnly === owner.id ? colors.textInverse : colors.text}
                  style={{ marginRight: 4 }}
                />
                <Text style={{ color: ownerOnly === owner.id ? colors.textInverse : colors.text, fontSize: 13 }}>
                  {owner.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Button
        title={isEditing ? t('common.save') : t('rent.addCost')}
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

export default AddRentCostScreen;
