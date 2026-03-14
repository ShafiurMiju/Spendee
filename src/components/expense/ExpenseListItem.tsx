import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Expense } from '../../types';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/formatting';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import AnimatedPressable from '../common/AnimatedPressable';

interface Props {
  expense: Expense;
  onPress: (expense: Expense) => void;
}

const ExpenseListItem: React.FC<Props> = ({ expense, onPress }) => {
  const { theme } = useAppTheme();
  const { colors, borderRadius: br } = theme;
  const typeColor =
    expense.type === 'household' ? colors.household : colors.personal;
  const iconName = CATEGORY_ICONS[expense.category] || DEFAULT_CATEGORY_ICON;

  return (
    <AnimatedPressable
      onPress={() => onPress(expense)}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderRadius: br.lg },
      ]}>
      <View style={[styles.iconCircle, { backgroundColor: typeColor + '18' }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={typeColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {expense.title}
        </Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {expense.category ? `${expense.category} · ` : ''}{formatDate(expense.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>
        {formatCurrency(expense.amount)}
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

export default ExpenseListItem;
