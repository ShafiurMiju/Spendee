import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, AlertModal, ScreenHeader } from '../../components/common';
import { onOwnersSnapshot, deactivateOwner } from '../../services/ownerService';
import { Owner, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';
import AnimatedPressable from '../../components/common/AnimatedPressable';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ManageOwnersScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [owners, setOwners] = useState<Owner[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    const unsub = onOwnersSnapshot(setOwners);
    return unsub;
  }, []);

  const handleDeactivate = (owner: Owner) => {
    setAlertConfig({
      visible: true,
      title: t('rent.deactivateOwner'),
      message: `${t('rent.deactivateOwnerConfirm')} ${owner.name}?`,
      type: 'confirm',
      destructive: true,
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deactivateOwner(owner.id);
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}>

      {/* Header */}
      <ScreenHeader inline title={t('rent.manageOwners')} />

      {/* Owner List */}
      {owners.length === 0 ? (
        <EmptyState
          icon="account-group-outline"
          message={t('rent.noOwners')}
        />
      ) : (
        <View style={styles.list}>
          {owners.map(owner => (
            <AnimatedPressable
              key={owner.id}
              onPress={() => navigation.navigate('AddOwner', { owner })}
              style={[styles.ownerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.ownerIcon, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="account-tie" size={24} color={colors.primary} />
              </View>
              <View style={styles.ownerInfo}>
                <Text style={[styles.ownerName, { color: colors.text }]}>{owner.name}</Text>
                {owner.phone ? (
                  <Text style={[styles.ownerPhone, { color: colors.textSecondary }]}>{owner.phone}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleDeactivate(owner)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.deleteBtn, { backgroundColor: colors.error + '15' }]}>
                <MaterialCommunityIcons name="account-off-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </AnimatedPressable>
          ))}
        </View>
      )}

      {/* Add Button */}
      <View style={styles.addBtnWrap}>
        <Button
          title={t('rent.addOwner')}
          iconName="account-plus-outline"
          onPress={() => navigation.navigate('AddOwner')}
        />
      </View>

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  list: { paddingHorizontal: 16 },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  ownerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerInfo: { flex: 1 },
  ownerName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  ownerPhone: { fontSize: 12 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnWrap: { paddingHorizontal: 16, marginTop: 16 },
});

export default ManageOwnersScreen;
