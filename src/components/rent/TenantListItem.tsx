import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Tenant } from '../../types';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/formatting';
import AnimatedPressable from '../common/AnimatedPressable';

interface Props {
  tenant: Tenant;
  isPaid: boolean;
  onPress: (tenant: Tenant) => void;
  onMarkPaid?: (tenant: Tenant) => void;
}

const TenantListItem: React.FC<Props> = ({
  tenant,
  isPaid,
  onPress,
  onMarkPaid,
}) => {
  const { theme } = useAppTheme();
  const { colors, borderRadius: br } = theme;
  const statusColor = isPaid ? colors.success : colors.warning;

  return (
    <AnimatedPressable
      onPress={() => onPress(tenant)}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderRadius: br.lg },
      ]}>
      <View style={[styles.iconCircle, { backgroundColor: statusColor + '18' }]}>
        <MaterialCommunityIcons
          name="account-outline"
          size={20}
          color={statusColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {tenant.name}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Flat {tenant.flatNumber}
        </Text>
      </View>

      <Text style={[styles.amount, { color: colors.text }]}>
        {formatCurrency(tenant.rentAmount)}
      </Text>

      <MaterialCommunityIcons
        name={isPaid ? 'check-circle' : 'clock-outline'}
        size={16}
        color={statusColor}
        style={styles.statusIcon}
      />

      {onMarkPaid && !isPaid && (
        <TouchableOpacity
          onPress={() => onMarkPaid(tenant)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.markPaidBtn, { backgroundColor: colors.success + '18' }]}>
          <MaterialCommunityIcons
            name="cash-check"
            size={18}
            color={colors.success}
          />
        </TouchableOpacity>
      )}

      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.textSecondary}
      />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    marginRight: 4,
  },
  statusIcon: {
    marginHorizontal: 4,
  },
  markPaidBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
});

export default TenantListItem;
