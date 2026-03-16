import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Button, Card, AlertModal } from '../../components/common';
import { getExpenses } from '../../services/expenseService';
import { getIncomes } from '../../services/incomeService';
import { getTenants, getTenantsByMonth } from '../../services/tenantService';
import { getFlats } from '../../services/flatService';
import { getOwners, getContributionsByMonth, calculateOwnerSettlements } from '../../services/ownerService';
import { getPaymentsByMonth, getCostsByMonth } from '../../services/rentService';
import {
  generateExpensePDF,
  generateIncomePDF,
  generateRentPDF,
  generateCombinedPDF,
  sharePDF,
  openPDF,
} from '../../services/pdfService';
import { CategoryBreakdown, RootStackParamList } from '../../types';
import { getColorForIndex, toMonthKey } from '../../utils/formatting';
import { AlertModalConfig } from '../../components/common/AlertModal';

type ExportMode = 'expense' | 'income' | 'rent' | 'both';

const MODE_CONFIG: Record<ExportMode, { icon: string; label: string; color: string }> = {
  expense: { icon: 'receipt', label: 'Expense Report', color: '#EF4444' },
  income: { icon: 'cash-plus', label: 'Income Report', color: '#22C55E' },
  rent: { icon: 'home-city-outline', label: 'Rent Collection Report', color: '#4A90D9' },
  both: { icon: 'swap-vertical', label: 'Expense & Income Report', color: '#8B5CF6' },
};

const PDFExportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PDFExport'>>();

  const sourceParam = route.params?.source;

  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [endDate, setEndDate] = useState(now);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [selectedMode, setSelectedMode] = useState<ExportMode>(sourceParam || 'expense');

  const showModePicker = !sourceParam;
  const modeConfig = MODE_CONFIG[selectedMode];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let filePath: string;

      if (selectedMode === 'expense') {
        const expenses = await getExpenses({
          dateRange: {
            startDate: startDate.getTime(),
            endDate: endDate.getTime(),
          },
        });

        if (expenses.length === 0) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('expense.noExpenses'),
            type: 'warning',
            onConfirm: () => setAlertConfig(null),
          });
          return;
        }

        let householdTotal = 0;
        let personalTotal = 0;
        const catMap: Record<string, number> = {};

        expenses.forEach(e => {
          if (e.type === 'household') householdTotal += e.amount;
          else personalTotal += e.amount;
          catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });

        const totalAmount = householdTotal + personalTotal;
        const breakdowns: CategoryBreakdown[] = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, amt], i) => ({
            category: cat,
            amount: amt,
            percentage: totalAmount > 0 ? (amt / totalAmount) * 100 : 0,
            color: getColorForIndex(i),
          }));

        filePath = await generateExpensePDF({
          expenses,
          dateRange: { startDate: startDate.getTime(), endDate: endDate.getTime() },
          householdTotal,
          personalTotal,
          breakdowns,
          totalAmount,
        });
      } else if (selectedMode === 'income') {
        const incomes = await getIncomes({
          dateRange: {
            startDate: startDate.getTime(),
            endDate: endDate.getTime(),
          },
        });

        if (incomes.length === 0) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('income.noIncome'),
            type: 'warning',
            onConfirm: () => setAlertConfig(null),
          });
          return;
        }

        const totalAmount = incomes.reduce((s, i) => s + i.amount, 0);
        const sourceMap: Record<string, number> = {};
        incomes.forEach(i => {
          sourceMap[i.source] = (sourceMap[i.source] || 0) + i.amount;
        });

        const sourceBreakdowns: CategoryBreakdown[] = Object.entries(sourceMap)
          .sort((a, b) => b[1] - a[1])
          .map(([src, amt], i) => ({
            category: src,
            amount: amt,
            percentage: totalAmount > 0 ? (amt / totalAmount) * 100 : 0,
            color: getColorForIndex(i),
          }));

        filePath = await generateIncomePDF({
          incomes,
          dateRange: { startDate: startDate.getTime(), endDate: endDate.getTime() },
          totalAmount,
          sourceBreakdowns,
        });
      } else if (selectedMode === 'both') {
        const [expenses, incomes] = await Promise.all([
          getExpenses({
            dateRange: {
              startDate: startDate.getTime(),
              endDate: endDate.getTime(),
            },
          }),
          getIncomes({
            dateRange: {
              startDate: startDate.getTime(),
              endDate: endDate.getTime(),
            },
          }),
        ]);

        if (expenses.length === 0 && incomes.length === 0) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: 'No expense or income records found for this period.',
            type: 'warning',
            onConfirm: () => setAlertConfig(null),
          });
          return;
        }

        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);

        const catMap: Record<string, number> = {};
        expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
        const expenseBreakdowns: CategoryBreakdown[] = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, amt], i) => ({
            category: cat,
            amount: amt,
            percentage: totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0,
            color: getColorForIndex(i),
          }));

        const srcMap: Record<string, number> = {};
        incomes.forEach(i => { srcMap[i.source] = (srcMap[i.source] || 0) + i.amount; });
        const sourceBreakdowns: CategoryBreakdown[] = Object.entries(srcMap)
          .sort((a, b) => b[1] - a[1])
          .map(([src, amt], i) => ({
            category: src,
            amount: amt,
            percentage: totalIncome > 0 ? (amt / totalIncome) * 100 : 0,
            color: getColorForIndex(i),
          }));

        filePath = await generateCombinedPDF({
          expenses,
          incomes,
          dateRange: { startDate: startDate.getTime(), endDate: endDate.getTime() },
          totalExpenses,
          totalIncome,
          expenseBreakdowns,
          sourceBreakdowns,
        });
      } else {
        // rent mode — uses month key from selected dates
        const monthKey = toMonthKey(startDate.getTime());
        const [tenants, flats, payments, costs, owners, contributions] = await Promise.all([
          getTenantsByMonth(monthKey),
          getFlats(),
          getPaymentsByMonth(monthKey),
          getCostsByMonth(monthKey),
          getOwners(),
          getContributionsByMonth(toMonthKey(startDate.getTime())),
        ]);

        if (tenants.length === 0) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: 'No tenants found',
            type: 'warning',
            onConfirm: () => setAlertConfig(null),
          });
          return;
        }

        const ownerSettlements = calculateOwnerSettlements(owners, flats, tenants, payments, costs, contributions);
        const totalExpected = tenants.reduce((s, tn) => s + tn.rentAmount, 0);
        const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
        const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

        filePath = await generateRentPDF({
          month: monthKey,
          tenants,
          flats,
          owners,
          payments,
          costs,
          ownerSettlements,
          totalExpected,
          totalCollected,
          totalCosts,
          netIncome: totalCollected - totalCosts,
        });
      }

      setAlertConfig({
        visible: true,
        title: t('pdf.success'),
        message: 'Saved to Documents. You can also share or open the file.',
        type: 'success',
        confirmText: 'Share',
        extraText: 'Open',
        cancelText: t('common.ok'),
        onConfirm: () => {
          setAlertConfig(null);
          sharePDF(filePath);
        },
        onExtra: () => {
          setAlertConfig(null);
          openPDF(filePath);
        },
        onCancel: () => setAlertConfig(null),
      });
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

  const isRent = selectedMode === 'rent';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Export PDF</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {modeConfig.label}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}>

        {/* ── Mode Picker (only when from Settings) ── */}
        {showModePicker && (
          <Card title="Report Type" iconName="file-document-outline">
            <View style={styles.modeGrid}>
              {(Object.keys(MODE_CONFIG) as ExportMode[]).map(mode => {
                const cfg = MODE_CONFIG[mode];
                const active = selectedMode === mode;
                const label =
                  mode === 'expense' ? 'Expense' :
                  mode === 'income' ? 'Income' :
                  mode === 'rent' ? 'Rent' :
                  'Expense +\nIncome';
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: active ? cfg.color : colors.surface,
                        borderColor: active ? cfg.color : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedMode(mode)}>
                    <MaterialCommunityIcons
                      name={cfg.icon}
                      size={18}
                      color={active ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeChipText,
                        { color: active ? '#fff' : colors.text, textAlign: 'center' },
                      ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        <Card title={isRent ? 'Select Month' : t('pdf.selectRange')} iconName="file-export-outline">
          {isRent ? (
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                Month
              </Text>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: colors.border }]}
                onPress={() => setShowStartPicker(true)}>
                <MaterialCommunityIcons name="calendar" size={16} color={modeConfig.color} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.text }}>
                  {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                  {t('pdf.startDate')}
                </Text>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: colors.border }]}
                  onPress={() => setShowStartPicker(true)}>
                  <MaterialCommunityIcons name="calendar" size={16} color={modeConfig.color} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.text }}>
                    {startDate.toLocaleDateString('en-GB')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                  {t('pdf.endDate')}
                </Text>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: colors.border }]}
                  onPress={() => setShowEndPicker(true)}>
                  <MaterialCommunityIcons name="calendar" size={16} color={modeConfig.color} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.text }}>
                    {endDate.toLocaleDateString('en-GB')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (d) setStartDate(d);
              }}
            />
          )}
          {showEndPicker && !isRent && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (d) setEndDate(d);
              }}
            />
          )}
        </Card>

        <Button
          title={generating ? t('pdf.generating') : t('pdf.generate')}
          iconName="file-pdf-box"
          onPress={handleGenerate}
          loading={generating}
          style={styles.generateBtn}
        />

        {alertConfig && <AlertModal {...alertConfig} />}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  content: { padding: 16 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: {
    width: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeChipText: { fontSize: 13, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 13, marginBottom: 6 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  generateBtn: { marginTop: 24 },
});

export default PDFExportScreen;
