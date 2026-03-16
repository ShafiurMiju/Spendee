import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertModal } from '../../components/common';
import { AlertModalConfig } from '../../components/common/AlertModal';
import { getTenantsByMonth } from '../../services/tenantService';
import { getFlats } from '../../services/flatService';
import { getPaymentsByMonth, getCostsByMonth } from '../../services/rentService';
import { generateMultiMonthRentPDF, sharePDF } from '../../services/pdfService';
import { RentPayment, RentCost, RootStackParamList } from '../../types';
import { toMonthKey } from '../../utils/formatting';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const RentPDFExportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const now = new Date();
  const currentMonth = toMonthKey(now.getTime());

  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [generating, setGenerating] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const navigateMonth = (current: string, dir: -1 | 1): string => {
    const [y, m] = current.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    return toMonthKey(d.getTime());
  };

  const getMonthsBetween = (start: string, end: string): string[] => {
    const months: string[] = [];
    let [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    while (sy < ey || (sy === ey && sm <= em)) {
      months.push(`${sy}-${String(sm).padStart(2, '0')}`);
      sm++;
      if (sm > 12) { sm = 1; sy++; }
    }
    return months;
  };

  const handleGenerate = async () => {
    if (startMonth > endMonth) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Start month must be before or equal to end month',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }

    setGenerating(true);
    try {
      const months = getMonthsBetween(startMonth, endMonth);
      const flats = await getFlats();

      const paymentsByMonth: Record<string, RentPayment[]> = {};
      const costsByMonth: Record<string, RentCost[]> = {};
      const tenantsByMonth: Record<string, import('../../types').Tenant[]> = {};

      for (const m of months) {
        const [payments, costs, monthTenants] = await Promise.all([
          getPaymentsByMonth(m),
          getCostsByMonth(m),
          getTenantsByMonth(m),
        ]);
        paymentsByMonth[m] = payments;
        costsByMonth[m] = costs;
        tenantsByMonth[m] = monthTenants;
      }

      const filePath = await generateMultiMonthRentPDF({
        months,
        tenantsByMonth,
        flats,
        paymentsByMonth,
        costsByMonth,
      });

      await sharePDF(filePath);
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: e.message,
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('rent.multiMonthPdf')}</Text>
      </View>

      {/* Icon Card */}
      <View style={[styles.iconCard, { backgroundColor: colors.primary + '12' }]}>
        <MaterialCommunityIcons name="file-pdf-box" size={48} color={colors.primary} />
        <Text style={[styles.iconCardText, { color: colors.textSecondary }]}>
          Generate a combined rent report for multiple months
        </Text>
      </View>

      {/* Start Month */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('rent.startMonth')}</Text>
      <View style={[styles.monthSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setStartMonth(navigateMonth(startMonth, -1))} style={styles.monthArrow}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>{formatMonthLabel(startMonth)}</Text>
        <TouchableOpacity onPress={() => setStartMonth(navigateMonth(startMonth, 1))} style={styles.monthArrow}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* End Month */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('rent.endMonth')}</Text>
      <View style={[styles.monthSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setEndMonth(navigateMonth(endMonth, -1))} style={styles.monthArrow}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>{formatMonthLabel(endMonth)}</Text>
        <TouchableOpacity onPress={() => setEndMonth(navigateMonth(endMonth, 1))} style={styles.monthArrow}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Month count */}
      {startMonth <= endMonth && (
        <View style={[styles.infoRow, { backgroundColor: colors.primary + '10' }]}>
          <MaterialCommunityIcons name="calendar-range" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {getMonthsBetween(startMonth, endMonth).length} month(s) selected
          </Text>
        </View>
      )}

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateBtn, { backgroundColor: colors.primary, opacity: generating ? 0.7 : 1 }]}
        onPress={handleGenerate}
        disabled={generating}
        activeOpacity={0.8}>
        {generating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <MaterialCommunityIcons name="file-pdf-box" size={22} color="#fff" />
        )}
        <Text style={styles.generateBtnText}>
          {generating ? t('pdf.generating') : t('rent.generatePdf')}
        </Text>
      </TouchableOpacity>

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  iconCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  iconCardText: { fontSize: 14, textAlign: 'center' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  monthArrow: { padding: 8 },
  monthText: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: { fontSize: 14, fontWeight: '600' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RentPDFExportScreen;
