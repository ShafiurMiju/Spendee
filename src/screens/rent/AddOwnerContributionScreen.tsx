import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, AlertModal } from '../../components/common';
import { getOwners, addOwnerContribution } from '../../services/ownerService';
import { Owner, OwnerContributionInput, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';
import { toMonthKey } from '../../utils/formatting';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const AddOwnerContributionScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: t('rent.addContribution') });
    getOwners().then(setOwners);
  }, []);

  const validate = (): boolean => {
    if (!selectedOwnerId) {
      setAlertConfig({
        visible: true, title: t('common.error'),
        message: 'Please select an owner', type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setAlertConfig({
        visible: true, title: t('common.error'),
        message: 'Valid amount is required', type: 'error',
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
      const input: OwnerContributionInput = {
        ownerId: selectedOwnerId,
        amount: Number(amount),
        month: toMonthKey(date.getTime()),
        note: note.trim(),
        date: date.getTime(),
      };
      await addOwnerContribution(input);
      setAlertConfig({
        visible: true,
        title: t('common.success'),
        message: t('rent.contributionAddSuccess'),
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      keyboardShouldPersistTaps="handled">

      {/* Owner Selection */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('rent.selectOwner')}</Text>
      <View style={styles.ownerGrid}>
        {owners.map(owner => (
          <TouchableOpacity
            key={owner.id}
            style={[
              styles.ownerChip,
              {
                backgroundColor: selectedOwnerId === owner.id ? colors.primary : colors.surface,
                borderColor: selectedOwnerId === owner.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedOwnerId(owner.id)}>
            <MaterialCommunityIcons
              name="account-tie"
              size={14}
              color={selectedOwnerId === owner.id ? colors.textInverse : colors.text}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: selectedOwnerId === owner.id ? colors.textInverse : colors.text, fontSize: 13 }}>
              {owner.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label={t('rent.contributionAmount')}
        leftIcon="cash-plus"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('expense.date')}</Text>
      <TouchableOpacity
        style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDatePicker(true)}>
        <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={{ color: colors.text }}>
          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
        title={t('rent.addContribution')}
        iconName="plus"
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
  ownerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  ownerChip: {
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

export default AddOwnerContributionScreen;
