import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/formatting';
import Card from '../common/Card';

interface Props {
  totalExpected: number;
  totalCollected: number;
  totalCosts: number;
  paidCount: number;
  totalTenants: number;
}

const RentSummaryCard: React.FC<Props> = ({
  totalExpected,
  totalCollected,
  totalCosts,
  paidCount,
  totalTenants,
}) => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const netIncome = totalCollected - totalCosts;

  return (
    <Card title={t('rent.summary')} iconName="home-city-outline">
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('rent.netIncome')}
      </Text>
      <Text style={[styles.bigNumber, { color: colors.text }]}>
        {formatCurrency(netIncome)}
      </Text>

      <View style={[styles.row, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <MaterialCommunityIcons
            name="cash-check"
            size={16}
            color={colors.success}
            style={styles.statIcon}
          />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('rent.totalCollected')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(totalCollected)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <MaterialCommunityIcons
            name="account-check"
            size={16}
            color={colors.primary}
            style={styles.statIcon}
          />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('rent.paid')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {paidCount}/{totalTenants}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.stat}>
          <MaterialCommunityIcons
            name="cash-minus"
            size={16}
            color={colors.error}
            style={styles.statIcon}
          />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('rent.totalCosts')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(totalCosts)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <MaterialCommunityIcons
            name="cash"
            size={16}
            color={colors.warning}
            style={styles.statIcon}
          />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('rent.totalExpected')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(totalExpected)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statIcon: {
    marginRight: 4,
  },
  statLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
});

export default RentSummaryCard;
