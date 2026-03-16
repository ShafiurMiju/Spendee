import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, AlertModal } from '../../components/common';
import { addFlat, updateFlat } from '../../services/flatService';
import { onOwnersSnapshot } from '../../services/ownerService';
import { FlatInput, Owner, RentBillBreakdown, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddFlat'>;
type RouteType = RouteProp<RootStackParamList, 'AddFlat'>;

const AddFlatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const editingFlat = route.params?.flat;
  const isEditing = !!editingFlat;

  const [flatNumber, setFlatNumber] = useState(editingFlat?.flatNumber ?? '');
  const [ownerId, setOwnerId] = useState(editingFlat?.ownerId ?? '');
  const [owners, setOwners] = useState<Owner[]>([]);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Bill breakdown
  const [baseRent, setBaseRent] = useState(
    editingFlat?.billBreakdown?.baseRent ? String(editingFlat.billBreakdown.baseRent) : '',
  );
  const [gasBill, setGasBill] = useState(
    editingFlat?.billBreakdown?.gasBill ? String(editingFlat.billBreakdown.gasBill) : '0',
  );
  const [cleaningBill, setCleaningBill] = useState(
    editingFlat?.billBreakdown?.cleaningBill ? String(editingFlat.billBreakdown.cleaningBill) : '0',
  );
  const [waterBill, setWaterBill] = useState(
    editingFlat?.billBreakdown?.waterBill ? String(editingFlat.billBreakdown.waterBill) : '0',
  );
  const [otherBill, setOtherBill] = useState(
    editingFlat?.billBreakdown?.otherBill ? String(editingFlat.billBreakdown.otherBill) : '0',
  );

  const totalRent =
    (Number(baseRent) || 0) +
    (Number(gasBill) || 0) +
    (Number(cleaningBill) || 0) +
    (Number(waterBill) || 0) +
    (Number(otherBill) || 0);

  useEffect(() => {
    const unsub = onOwnersSnapshot(setOwners);
    return unsub;
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('rent.editFlat') : t('rent.addFlat'),
    });
  }, [navigation, isEditing, t]);

  const selectedOwner = owners.find(o => o.id === ownerId);

  const validate = (): boolean => {
    if (!flatNumber.trim()) {
      setAlertConfig({
        visible: true, title: t('common.error'),
        message: 'Flat number is required', type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    if (!ownerId) {
      setAlertConfig({
        visible: true, title: t('common.error'),
        message: 'Please select an owner', type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    if (!baseRent || isNaN(Number(baseRent)) || Number(baseRent) <= 0) {
      setAlertConfig({
        visible: true, title: t('common.error'),
        message: 'Valid base rent is required', type: 'error',
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
      const billBreakdown: RentBillBreakdown = {
        baseRent: Number(baseRent) || 0,
        gasBill: Number(gasBill) || 0,
        cleaningBill: Number(cleaningBill) || 0,
        waterBill: Number(waterBill) || 0,
        otherBill: Number(otherBill) || 0,
      };

      const input: FlatInput = {
        flatNumber: flatNumber.trim(),
        ownerId,
        rentAmount: totalRent,
        billBreakdown,
        isActive: true,
      };

      if (isEditing && editingFlat) {
        await updateFlat(editingFlat.id, input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.flatUpdateSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
        });
      } else {
        await addFlat(input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.flatAddSuccess'),
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
        label={t('rent.flatNumber')}
        leftIcon="door"
        value={flatNumber}
        onChangeText={setFlatNumber}
        placeholder="e.g. A-101"
      />

      {/* Owner Dropdown */}
      <Text style={[styles.dropdownLabel, { color: colors.text }]}>{t('rent.selectOwner')}</Text>
      <TouchableOpacity
        style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setDropdownOpen(!dropdownOpen)}
        activeOpacity={0.7}>
        <MaterialCommunityIcons name="account-tie-outline" size={20} color={colors.primary} />
        <Text style={[styles.dropdownText, { color: selectedOwner ? colors.text : colors.textSecondary }]}>
          {selectedOwner ? selectedOwner.name : t('rent.selectOwner')}
        </Text>
        <MaterialCommunityIcons
          name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {dropdownOpen && (
        <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {owners.length === 0 ? (
            <Text style={[styles.dropdownEmpty, { color: colors.textSecondary }]}>{t('rent.noOwners')}</Text>
          ) : (
            owners.map(owner => (
              <TouchableOpacity
                key={owner.id}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                  ownerId === owner.id && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => { setOwnerId(owner.id); setDropdownOpen(false); }}>
                <MaterialCommunityIcons
                  name="account-tie"
                  size={18}
                  color={ownerId === owner.id ? colors.primary : colors.textSecondary}
                />
                <View style={styles.dropdownItemInfo}>
                  <Text style={[styles.dropdownItemName, { color: colors.text }]}>{owner.name}</Text>
                  {owner.phone ? (
                    <Text style={[styles.dropdownItemSub, { color: colors.textSecondary }]}>{owner.phone}</Text>
                  ) : null}
                </View>
                {ownerId === owner.id && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* ── Bill Breakdown Section ── */}
      <View style={[styles.billSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.billHeader}>
          <MaterialCommunityIcons name="receipt" size={18} color={colors.primary} />
          <Text style={[styles.billTitle, { color: colors.text }]}>{t('rent.billBreakdown')}</Text>
        </View>

        <Input
          label={t('rent.baseRent')}
          leftIcon="home-outline"
          value={baseRent}
          onChangeText={setBaseRent}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label={t('rent.gasBill')}
          leftIcon="fire"
          value={gasBill}
          onChangeText={setGasBill}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label={t('rent.cleaningBill')}
          leftIcon="broom"
          value={cleaningBill}
          onChangeText={setCleaningBill}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label={t('rent.waterBill')}
          leftIcon="water-outline"
          value={waterBill}
          onChangeText={setWaterBill}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label={t('rent.otherBill')}
          leftIcon="dots-horizontal-circle-outline"
          value={otherBill}
          onChangeText={setOtherBill}
          placeholder="0"
          keyboardType="numeric"
        />

        {/* Total */}
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('rent.totalMonthlyRent')}</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>৳{totalRent.toLocaleString()}</Text>
        </View>
      </View>

      <Button
        title={isEditing ? t('common.save') : t('rent.addFlat')}
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
  saveBtn: { marginTop: 16 },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  dropdownText: { flex: 1, fontSize: 15 },
  dropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownEmpty: {
    padding: 14,
    fontSize: 14,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownItemInfo: { flex: 1 },
  dropdownItemName: { fontSize: 15, fontWeight: '500' },
  dropdownItemSub: { fontSize: 12, marginTop: 1 },
  billSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
});

export default AddFlatScreen;
