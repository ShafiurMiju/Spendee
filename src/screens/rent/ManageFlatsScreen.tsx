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
import { onFlatsSnapshot, deactivateFlat } from '../../services/flatService';
import { onOwnersSnapshot } from '../../services/ownerService';
import { Flat, Owner, RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';
import AnimatedPressable from '../../components/common/AnimatedPressable';
import { formatCurrency } from '../../utils/formatting';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ManageFlatsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [flats, setFlats] = useState<Flat[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  useEffect(() => {
    const unsubFlats = onFlatsSnapshot(setFlats);
    const unsubOwners = onOwnersSnapshot(setOwners);
    return () => { unsubFlats(); unsubOwners(); };
  }, []);

  const getOwnerName = (ownerId: string) => {
    const owner = owners.find(o => o.id === ownerId);
    return owner?.name ?? '—';
  };

  const handleDeactivate = (flat: Flat) => {
    setAlertConfig({
      visible: true,
      title: t('rent.deactivateFlat'),
      message: `${t('rent.deactivateFlatConfirm')} ${flat.flatNumber}?`,
      type: 'confirm',
      destructive: true,
      onConfirm: async () => {
        setAlertConfig(null);
        try {
          await deactivateFlat(flat.id);
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
      <ScreenHeader inline title={t('rent.manageFlats')} />

      {/* Flat List */}
      {flats.length === 0 ? (
        <EmptyState
          icon="door"
          message={t('rent.noFlats')}
        />
      ) : (
        <View style={styles.list}>
          {flats.map(flat => (
            <AnimatedPressable
              key={flat.id}
              onPress={() => navigation.navigate('AddFlat', { flat })}
              style={[styles.flatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.flatIcon, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="door" size={24} color={colors.primary} />
              </View>
              <View style={styles.flatInfo}>
                <Text style={[styles.flatNumber, { color: colors.text }]}>{flat.flatNumber}</Text>
                <Text style={[styles.flatOwner, { color: colors.textSecondary }]}>
                  {t('rent.ownerName')}: {getOwnerName(flat.ownerId)}
                </Text>
                <Text style={[styles.flatRent, { color: colors.primary }]}>
                  {formatCurrency(flat.rentAmount)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeactivate(flat)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.deleteBtn, { backgroundColor: colors.error + '15' }]}>
                <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </AnimatedPressable>
          ))}
        </View>
      )}

      {/* Add Button */}
      <View style={styles.addBtnWrap}>
        <Button
          title={t('rent.addFlat')}
          iconName="door-open"
          onPress={() => navigation.navigate('AddFlat')}
        />
      </View>

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  list: { paddingHorizontal: 16 },
  flatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  flatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flatInfo: { flex: 1 },
  flatNumber: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  flatOwner: { fontSize: 13 },
  flatRent: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnWrap: { paddingHorizontal: 16, marginTop: 16 },
});

export default ManageFlatsScreen;
