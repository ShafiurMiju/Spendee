import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, AlertModal, ScreenHeader } from '../../components/common';
import { addOwner, updateOwner } from '../../services/ownerService';
import { OwnerInput, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddOwner'>;
type RouteType = RouteProp<RootStackParamList, 'AddOwner'>;

const AddOwnerScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const editingOwner = route.params?.owner;
  const isEditing = !!editingOwner;

  const [name, setName] = useState(editingOwner?.name ?? '');
  const [phone, setPhone] = useState(editingOwner?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('rent.editOwner') : t('rent.addOwner'),
    });
  }, [navigation, isEditing, t]);

  const validate = (): boolean => {
    if (!name.trim()) {
      setAlertConfig({
        visible: true, title: t('common.error'),
        message: 'Owner name is required', type: 'error',
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
      const input: OwnerInput = {
        name: name.trim(),
        phone: phone.trim(),
        isActive: true,
      };

      if (isEditing && editingOwner) {
        await updateOwner(editingOwner.id, input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.ownerUpdateSuccess'),
          type: 'success',
          onConfirm: () => { setAlertConfig(null); navigation.goBack(); },
        });
      } else {
        await addOwner(input);
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('rent.ownerAddSuccess'),
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
      <ScreenHeader inline title={isEditing ? t('rent.editOwner') : t('rent.addOwner')} />

      <Input
        label={t('rent.ownerNameLabel')}
        leftIcon="account-tie-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mr. Rahman"
      />

      <Input
        label={t('rent.ownerPhone')}
        leftIcon="phone-outline"
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 01712345678"
        keyboardType="phone-pad"
      />

      <Button
        title={isEditing ? t('common.save') : t('rent.addOwner')}
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

export default AddOwnerScreen;
