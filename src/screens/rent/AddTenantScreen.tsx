import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, AlertModal } from '../../components/common';
import { addTenant, updateTenant, getActiveTenantForFlat, deactivateTenant } from '../../services/tenantService';
import { onFlatsSnapshot } from '../../services/flatService';
import { onOwnersSnapshot } from '../../services/ownerService';
import { TenantInput, RootStackParamList, Flat, Owner } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddTenant'>;
type RouteType = RouteProp<RootStackParamList, 'AddTenant'>;

const AddTenantScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const editingTenant = route.params?.tenant;
  const isEditing = !!editingTenant;

  const [name, setName] = useState(editingTenant?.name ?? '');
  const [flatId, setFlatId] = useState(editingTenant?.flatId ?? '');
  const [phone, setPhone] = useState(editingTenant?.phone ?? '');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [flatDropdownOpen, setFlatDropdownOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [existingTenant, setExistingTenant] = useState<import('../../types').Tenant | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  const selectedFlat = flats.find(f => f.id === flatId);
  const selectedOwner = selectedFlat ? owners.find(o => o.id === selectedFlat.ownerId) : null;

  useEffect(() => {
    const unsubFlats = onFlatsSnapshot(setFlats);
    const unsubOwners = onOwnersSnapshot(setOwners);
    return () => { unsubFlats(); unsubOwners(); };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('rent.editTenant') : t('rent.addTenant'),
    });
  }, [navigation, isEditing, t]);

  // Check if selected flat already has an active tenant
  useEffect(() => {
    if (!flatId || isEditing) {
      setExistingTenant(null);
      return;
    }
    getActiveTenantForFlat(flatId).then(t => setExistingTenant(t)).catch(() => setExistingTenant(null));
  }, [flatId, isEditing]);

  const validate = (): boolean => {
    if (!name.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Name is required',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    if (!flatId) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Please select a flat',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    return true;
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const input: TenantInput = {
        name: name.trim(),
        flatId,
        rentAmount: selectedFlat?.rentAmount ?? 0,
        phone: phone.trim(),
        isActive: true,
        movedInAt: Date.now(),
      };

      if (isEditing && editingTenant) {
        await updateTenant(editingTenant.id, input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.updateSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
        });
      } else {
        // If flat already has a tenant, deactivate them first
        if (existingTenant) {
          await deactivateTenant(existingTenant.id);
        }
        await addTenant(input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.addSuccess'),
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

  const handleSave = async () => {
    if (!validate()) return;
    // Warn if flat already has an active tenant
    if (!isEditing && existingTenant) {
      setAlertConfig({
        visible: true,
        title: t('rent.flatOccupiedTitle'),
        message: t('rent.flatOccupiedMsg', { name: existingTenant.name, flat: selectedFlat?.flatNumber ?? '' }),
        type: 'warning',
        confirmText: t('common.yes'),
        cancelText: t('common.cancel'),
        onConfirm: () => { setAlertConfig(null); doSave(); },
        onCancel: () => setAlertConfig(null),
      });
      return;
    }
    doSave();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      keyboardShouldPersistTaps="handled">
      <Input
        label={t('rent.name')}
        leftIcon="account-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. John Doe"
      />

      {/* Flat Dropdown */}
      <Text style={[styles.dropdownLabel, { color: colors.text }]}>{t('rent.selectFlat')}</Text>
      <TouchableOpacity
        style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setFlatDropdownOpen(!flatDropdownOpen)}
        activeOpacity={0.7}>
        <MaterialCommunityIcons name="door" size={20} color={colors.primary} />
        <Text style={[styles.dropdownText, { color: selectedFlat ? colors.text : colors.textSecondary }]}>
          {selectedFlat
            ? `${selectedFlat.flatNumber} (${selectedOwner?.name ?? '—'})`
            : t('rent.selectFlat')}
        </Text>
        <MaterialCommunityIcons
          name={flatDropdownOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {flatDropdownOpen && (
        <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {flats.length === 0 ? (
            <Text style={[styles.dropdownEmpty, { color: colors.textSecondary }]}>{t('rent.noFlats')}</Text>
          ) : (
            flats.map(flat => {
              const owner = owners.find(o => o.id === flat.ownerId);
              return (
                <TouchableOpacity
                  key={flat.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.border },
                    flatId === flat.id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => { setFlatId(flat.id); setFlatDropdownOpen(false); }}>
                  <MaterialCommunityIcons
                    name="door"
                    size={18}
                    color={flatId === flat.id ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.dropdownItemInfo}>
                    <Text style={[styles.dropdownItemName, { color: colors.text }]}>{flat.flatNumber}</Text>
                    <Text style={[styles.dropdownItemSub, { color: colors.textSecondary }]}>
                      {t('rent.ownerName')}: {owner?.name ?? '—'}
                    </Text>
                  </View>
                  {flatId === flat.id && (
                    <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* Warning: flat already has a tenant */}
      {!isEditing && existingTenant && selectedFlat && (
        <View style={[styles.occupiedWarning, { backgroundColor: '#FBBF2418', borderColor: '#FBBF24' }]}>
          <MaterialCommunityIcons name="alert-outline" size={18} color="#FBBF24" />
          <Text style={styles.occupiedText}>
            {t('rent.flatOccupiedHint', { name: existingTenant.name })}
          </Text>
        </View>
      )}

      {/* Show rent from selected flat */}
      {selectedFlat && (
        <View style={[styles.rentInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="cash" size={18} color={colors.primary} />
          <Text style={[styles.rentInfoLabel, { color: colors.textSecondary }]}>{t('rent.totalMonthlyRent')}</Text>
          <Text style={[styles.rentInfoValue, { color: colors.primary }]}>৳{selectedFlat.rentAmount.toLocaleString()}</Text>
        </View>
      )}

      <Input
        label={t('rent.phone')}
        leftIcon="phone-outline"
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 9876543210"
        keyboardType="phone-pad"
      />

      <Button
        title={isEditing ? t('common.save') : t('rent.addTenant')}
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
  saveBtn: { marginTop: 8 },
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
  rentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  rentInfoLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  rentInfoValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  occupiedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  occupiedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#FBBF24',
  },
});

export default AddTenantScreen;
