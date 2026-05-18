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
import { Input, Button, AlertModal, ScreenHeader } from '../../components/common';
import { addIncome, updateIncome } from '../../services/incomeService';
import { showInterstitial } from '../../services/adsService';
import { IncomeInput, RootStackParamList } from '../../types';
import { DEFAULT_INCOME_SOURCES, INCOME_SOURCE_ICONS, DEFAULT_INCOME_ICON } from '../../constants/categories';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddIncome'>;
type RouteType = RouteProp<RootStackParamList, 'AddIncome'>;

const AddIncomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const editingIncome = route.params?.income;
  const isEditing = !!editingIncome;

  const [title, setTitle] = useState(editingIncome?.title ?? '');
  const [amount, setAmount] = useState(
    editingIncome ? String(editingIncome.amount) : '',
  );
  const [source, setSource] = useState(editingIncome?.source ?? 'salary');
  const [date, setDate] = useState(
    editingIncome ? new Date(editingIncome.date) : new Date(),
  );
  const [note, setNote] = useState(editingIncome?.note ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('income.editIncome') : t('income.addIncome'),
    });
  }, [navigation, isEditing, t]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: `${t('income.titleField')} is required`,
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
      const input: IncomeInput = {
        title: title.trim(),
        amount: Number(amount),
        source,
        date: date.getTime(),
        note: note.trim(),
      };

      if (isEditing && editingIncome) {
        await updateIncome(editingIncome.id, input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('income.updateSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); showInterstitial(); navigation.goBack(); },
        });
      } else {
        await addIncome(input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('income.addSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); showInterstitial(); navigation.goBack(); },
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

  const capitalizeSource = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      keyboardShouldPersistTaps="handled">
      <ScreenHeader inline title={isEditing ? t('income.editIncome') : t('income.addIncome')} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('income.source')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sourceScrollView}
        contentContainerStyle={styles.sourceScrollContent}>
        {DEFAULT_INCOME_SOURCES.map(src => {
          const icon = INCOME_SOURCE_ICONS[src.name] ?? DEFAULT_INCOME_ICON;
          const isSelected = source === src.name;
          return (
            <TouchableOpacity
              key={src.name}
              style={[
                styles.sourceChip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSource(src.name)}>
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
                {t(`income.${src.name}` as any) || capitalizeSource(src.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Input
        label={t('income.titleField')}
        leftIcon="format-title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. March Salary"
      />

      <Input
        label={t('income.amount')}
        leftIcon="cash"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('income.date')}
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
        label={t('income.note')}
        leftIcon="note-text-outline"
        value={note}
        onChangeText={setNote}
        placeholder="Optional note..."
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={isEditing ? t('common.save') : t('income.addIncome')}
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
  sourceScrollView: { marginBottom: 20 },
  sourceScrollContent: { gap: 8, paddingRight: 8 },
  sourceChip: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
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

export default AddIncomeScreen;
