import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RentCost } from '../../types';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/formatting';
import { RENT_COST_CATEGORY_ICONS, DEFAULT_RENT_COST_ICON } from '../../constants/rent';
import AnimatedPressable from '../common/AnimatedPressable';

interface Props {
  cost: RentCost;
  onPress: (cost: RentCost) => void;
}

const RentCostListItem: React.FC<Props> = ({ cost, onPress }) => {
  const { theme } = useAppTheme();
  const { colors, borderRadius: br } = theme;
  const iconName = RENT_COST_CATEGORY_ICONS[cost.category] || DEFAULT_RENT_COST_ICON;

  return (
    <AnimatedPressable
      onPress={() => onPress(cost)}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderRadius: br.lg },
      ]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.error + '18' }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={colors.error} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {cost.title}
        </Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {cost.category}
        </Text>
      </View>

      <Text style={[styles.amount, { color: colors.text }]}>
        {formatCurrency(cost.amount)}
      </Text>
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
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  category: {
    fontSize: 13,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    marginRight: 4,
  },
});

export default RentCostListItem;
