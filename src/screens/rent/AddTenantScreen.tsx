import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, AlertModal } from '../../components/common';
import { addTenant, updateTenant } from '../../services/tenantService';
import { TenantInput, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';

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
  const [flatNumber, setFlatNumber] = useState(editingTenant?.flatNumber ?? '');
  const [rentAmount, setRentAmount] = useState(
    editingTenant ? String(editingTenant.rentAmount) : '',
  );
  const [phone, setPhone] = useState(editingTenant?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('rent.editTenant') : t('rent.addTenant'),
    });
  }, [navigation, isEditing, t]);

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
    if (!flatNumber.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Flat number is required',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return false;
    }
    if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) <= 0) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Valid rent amount is required',
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
      const input: TenantInput = {
        name: name.trim(),
        flatNumber: flatNumber.trim(),
        rentAmount: Number(rentAmount),
        phone: phone.trim(),
        isActive: true,
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

      <Input
        label={t('rent.flatNumber')}
        leftIcon="door"
        value={flatNumber}
        onChangeText={setFlatNumber}
        placeholder="e.g. A-101"
      />

      <Input
        label={t('rent.rentAmount')}
        leftIcon="cash"
        value={rentAmount}
        onChangeText={setRentAmount}
        placeholder="0"
        keyboardType="numeric"
      />

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
});

export default AddTenantScreen;
