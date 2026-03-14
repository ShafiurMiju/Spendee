import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../contexts/ThemeContext';
import { AlertModal, Button, Input } from '../../components/common';
import { RootStackParamList, ExpenseTypeItem, Category, ExpenseInput, IncomeInput } from '../../types';
import { getExpenseTypes, seedDefaultExpenseTypes } from '../../services/expenseTypeService';
import { getCategories } from '../../services/categoryService';
import { DEFAULT_INCOME_SOURCES } from '../../constants/categories';
import { addExpense } from '../../services/expenseService';
import { addIncome } from '../../services/incomeService';
import { parseVoiceTransactions, transcribeAudio, VoiceEntryType } from '../../services/voiceEntryService';
import { AlertModalConfig } from '../../components/common/AlertModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'VoiceEntry'>;
type RouteType = RouteProp<RootStackParamList, 'VoiceEntry'>;

interface VoiceDraftItem {
  id: string;
  entryType: VoiceEntryType;
  title: string;
  amount: string;
  dateISO: string;
  expenseType: string;
  category: string;
  source: string;
  note: string;
}

const DEFAULT_EXPENSE_TYPE = 'household';
const DEFAULT_INCOME_SOURCE = DEFAULT_INCOME_SOURCES[0]?.name ?? 'salary';

const VoiceEntryScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { t } = useTranslation();

  const defaultKind = route.params?.defaultKind;

  const recorderRef = useRef<AudioRecorderPlayer>(new AudioRecorderPlayer());
  const [inputMode, setInputMode] = useState<'voice' | 'prompt'>('voice');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draftItems, setDraftItems] = useState<VoiceDraftItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  const incomeSources = useMemo(
    () => DEFAULT_INCOME_SOURCES.map(item => item.name),
    [],
  );

  const categoriesByType = useMemo(() => {
    const byType: Record<string, string[]> = {};
    categories.forEach(cat => {
      if (!byType[cat.type]) {
        byType[cat.type] = [];
      }
      byType[cat.type].push(cat.name);
    });
    Object.keys(byType).forEach(type => {
      byType[type].sort((a, b) => a.localeCompare(b));
    });
    return byType;
  }, [categories]);

  useEffect(() => {
    navigation.setOptions({
      title: 'AI Voice Entry',
    });
  }, [navigation]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        let types = await getExpenseTypes();
        if (types.length === 0) {
          await seedDefaultExpenseTypes();
          types = await getExpenseTypes();
        }

        setExpenseTypes(types);
        const allCategories = await getCategories();
        setCategories(allCategories);
      } catch (error: any) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: error.message ?? 'Failed to load metadata for voice entry',
          type: 'error',
          onConfirm: () => setAlertConfig(null),
        });
      }
    };

    loadMeta();
  }, [t]);

  // Stop recorder on unmount
  useEffect(() => {
    const recorder = recorderRef.current;
    return () => {
      recorder.stopRecorder().catch(() => {});
    };
  }, []);

  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') { return true; }
    const current = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (current) { return true; }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone permission',
        message: 'Spendee needs microphone access to record voice transactions.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const startRecording = useCallback(async () => {
    const ok = await ensureMicPermission();
    if (!ok) {
      setAlertConfig({ visible: true, title: t('common.error'), message: 'Microphone permission required.', type: 'error', onConfirm: () => setAlertConfig(null) });
      return;
    }
    try {
      setRecordSecs(0);
      await recorderRef.current.startRecorder(undefined, undefined, true);
      recorderRef.current.addRecordBackListener(e => {
        setRecordSecs(Math.floor(e.currentPosition / 1000));
      });
      setIsRecording(true);
    } catch (err: any) {
      setAlertConfig({ visible: true, title: t('common.error'), message: err.message ?? 'Could not start recording', type: 'error', onConfirm: () => setAlertConfig(null) });
    }
  }, [ensureMicPermission, t]);

  const parseTranscriptToDrafts = useCallback(async (transcriptText: string) => {
    if (!transcriptText.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Please speak or type transactions first.',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parseVoiceTransactions({
        transcript: transcriptText,
        expenseTypes: expenseTypes.map(et => et.name),
        categoriesByType,
        incomeSources,
      });

      if (parsed.length === 0) {
        setAlertConfig({
          visible: true,
          title: 'No transactions found',
          message: 'AI could not detect valid income/expense items from your text.',
          type: 'warning',
          onConfirm: () => setAlertConfig(null),
        });
        return;
      }

      const fallbackType = expenseTypes[0]?.name ?? DEFAULT_EXPENSE_TYPE;
      const fallbackSource = incomeSources[0] ?? DEFAULT_INCOME_SOURCE;

      const drafts: VoiceDraftItem[] = parsed
        .filter(item => (defaultKind ? item.entryType === defaultKind : true))
        .map(item => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          entryType: item.entryType,
          title: item.title,
          amount: String(item.amount),
          dateISO: item.dateISO,
          expenseType: item.expenseType || fallbackType,
          category: item.category,
          source: item.source || fallbackSource,
          note: item.note,
        }));

      if (drafts.length === 0) {
        setAlertConfig({
          visible: true,
          title: 'No matching items',
          message:
            defaultKind === 'expense'
              ? 'AI found only income items. Speak expense items to continue.'
              : 'AI found only expense items. Speak income items to continue.',
          type: 'warning',
          onConfirm: () => setAlertConfig(null),
        });
        return;
      }

      setDraftItems(drafts);
      setExpandedItems(new Set());
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: error.message ?? 'Failed to parse transcript with Groq',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
    } finally {
      setIsParsing(false);
    }
  }, [expenseTypes, categoriesByType, incomeSources, defaultKind, t]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    try {
      const path = await recorderRef.current.stopRecorder();
      recorderRef.current.removeRecordBackListener();
      setIsRecording(false);
      setIsTranscribing(true);
      const text = await transcribeAudio(path);
      const combinedTranscript = transcript.trim() ? `${transcript.trim()} ${text}` : text;
      setTranscript(combinedTranscript);
      setIsTranscribing(false);
      await parseTranscriptToDrafts(combinedTranscript);
    } catch (err: any) {
      setAlertConfig({ visible: true, title: t('common.error'), message: err.message ?? 'Transcription failed', type: 'error', onConfirm: () => setAlertConfig(null) });
    } finally {
      setIsTranscribing(false);
    }
  }, [parseTranscriptToDrafts, t, transcript]);

  const handleParseTranscript = useCallback(async () => {
    await parseTranscriptToDrafts(transcript);
  }, [parseTranscriptToDrafts, transcript]);

  const updateDraftItem = useCallback((id: string, updates: Partial<VoiceDraftItem>) => {
    setDraftItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const removeDraftItem = useCallback((id: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
    setExpandedItems(prev => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const toTimestamp = (dateISO: string): number => {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateISO)
      ? dateISO
      : new Date().toISOString().slice(0, 10);
    const date = new Date(`${normalized}T12:00:00`);
    return isNaN(date.getTime()) ? Date.now() : date.getTime();
  };

  const persistDraftItems = useCallback(async () => {
    if (draftItems.length === 0) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'There is nothing to save.',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }

    setIsSaving(true);
    try {
      let successCount = 0;
      const errors: string[] = [];
      const fallbackType = expenseTypes[0]?.name ?? DEFAULT_EXPENSE_TYPE;
      const fallbackSource = incomeSources[0] ?? DEFAULT_INCOME_SOURCE;

      for (const item of draftItems) {
        const amount = Number(item.amount);
        if (!item.title.trim() || isNaN(amount) || amount <= 0) {
          errors.push(`Invalid item: ${item.title || 'Untitled'}`);
          continue;
        }

        const date = toTimestamp(item.dateISO);

        if (item.entryType === 'expense') {
          const expenseInput: ExpenseInput = {
            title: item.title.trim(),
            amount,
            type: item.expenseType || fallbackType,
            category: item.category.trim(),
            date,
            note: item.note.trim(),
          };
          await addExpense(expenseInput);
        } else {
          const incomeInput: IncomeInput = {
            title: item.title.trim(),
            amount,
            source: item.source || fallbackSource,
            date,
            note: item.note.trim(),
          };
          await addIncome(incomeInput);
        }

        successCount += 1;
      }

      if (errors.length > 0) {
        setAlertConfig({
          visible: true,
          title: 'Saved with warnings',
          message: `${successCount} saved. ${errors.length} skipped due to validation issues.`,
          type: 'warning',
          onConfirm: () => setAlertConfig(null),
        });
      } else {
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: `${successCount} transaction(s) saved successfully.`,
          type: 'success',
          onConfirm: () => {
            setAlertConfig(null);
            navigation.goBack();
          },
        });
      }
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: error.message ?? 'Failed to save parsed transactions',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
    } finally {
      setIsSaving(false);
    }
  }, [draftItems, expenseTypes, incomeSources, navigation, t]);

  const confirmSave = useCallback(() => {
    if (draftItems.length === 0) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: 'Please parse and review items first.',
        type: 'error',
        onConfirm: () => setAlertConfig(null),
      });
      return;
    }

    setAlertConfig({
      visible: true,
      title: 'Confirm Save',
      message: `Save ${draftItems.length} item(s) to your account? You can still edit or remove items now.`,
      type: 'confirm',
      confirmText: 'Save All',
      cancelText: t('common.cancel'),
      onConfirm: () => {
        setAlertConfig(null);
        persistDraftItems();
      },
      onCancel: () => setAlertConfig(null),
    });
  }, [draftItems.length, persistDraftItems, t]);

  const renderExpenseTypeChips = (item: VoiceDraftItem) => {
    const types = expenseTypes.length > 0 ? expenseTypes : [{ id: 'default', name: DEFAULT_EXPENSE_TYPE } as ExpenseTypeItem];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {types.map(type => {
          const selected = item.expenseType === type.name;
          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => updateDraftItem(item.id, { expenseType: type.name })}>
              <Text style={{ color: selected ? colors.textInverse : colors.text, fontWeight: '600', fontSize: 12 }}>
                {type.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderCategoryChips = (item: VoiceDraftItem) => {
    const available = categoriesByType[item.expenseType] ?? [];
    if (available.length === 0) {
      return null;
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {available.map(cat => {
          const selected = item.category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.success : colors.surface,
                  borderColor: selected ? colors.success : colors.border,
                },
              ]}
              onPress={() => updateDraftItem(item.id, { category: cat })}>
              <Text style={{ color: selected ? colors.textInverse : colors.text, fontWeight: '600', fontSize: 12 }}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderSourceChips = (item: VoiceDraftItem) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {incomeSources.map(src => {
        const selected = item.source === src;
        return (
          <TouchableOpacity
            key={src}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.success : colors.surface,
                borderColor: selected ? colors.success : colors.border,
              },
            ]}
            onPress={() => updateDraftItem(item.id, { source: src })}>
            <Text style={{ color: selected ? colors.textInverse : colors.text, fontWeight: '600', fontSize: 12 }}>
              {src}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const handleSwitchMode = (mode: 'voice' | 'prompt') => {
    if (mode === inputMode) { return; }
    if (isRecording) {
      recorderRef.current.stopRecorder().catch(() => {});
      recorderRef.current.removeRecordBackListener();
      setIsRecording(false);
    }
    setInputMode(mode);
    setTranscript('');
    setDraftItems([]);
    setExpandedItems(new Set());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled">

        {/* Mode selector */}
        <View style={[styles.modeSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              inputMode === 'voice' && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleSwitchMode('voice')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons
              name="microphone"
              size={18}
              color={inputMode === 'voice' ? colors.textInverse : colors.textSecondary}
            />
            <Text style={[styles.modeTabText, { color: inputMode === 'voice' ? colors.textInverse : colors.textSecondary }]}>
              Voice
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTab,
              inputMode === 'prompt' && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleSwitchMode('prompt')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons
              name="keyboard-outline"
              size={18}
              color={inputMode === 'prompt' ? colors.textInverse : colors.textSecondary}
            />
            <Text style={[styles.modeTabText, { color: inputMode === 'prompt' ? colors.textInverse : colors.textSecondary }]}>
              Prompt
            </Text>
          </TouchableOpacity>
        </View>

        {inputMode === 'voice' ? (
          /* Voice mode: record → Groq Whisper → transcript */
          <View style={[styles.voiceArea, { backgroundColor: colors.surface, borderColor: isRecording ? colors.error : isTranscribing ? colors.primary : colors.border }]}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { backgroundColor: isRecording ? colors.error : isTranscribing ? colors.primary + '33' : colors.primary + '22' },
              ]}
              onPress={isRecording ? stopRecordingAndTranscribe : startRecording}
              disabled={isTranscribing || isParsing}
              activeOpacity={0.75}>
              <MaterialCommunityIcons
                name={isRecording ? 'stop-circle' : isTranscribing ? 'loading' : 'microphone-outline'}
                size={36}
                color={isRecording ? colors.textInverse : isTranscribing ? colors.primary : colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.voiceStatusText, { color: isRecording ? colors.error : isTranscribing ? colors.primary : colors.textSecondary }]}>
              {isRecording ? `Recording… ${recordSecs}s` : isTranscribing || isParsing ? 'Processing…' : 'Tap to record'}
            </Text>
            {isRecording ? (
              <Text style={[styles.partialText, { color: colors.textSecondary }]}>
                Tap stop when done speaking
              </Text>
            ) : null}
            {transcript ? (
              <View style={[styles.transcriptBox, { borderTopColor: colors.border }]}>
                <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>Transcript</Text>
                <Text style={[styles.transcriptValue, { color: colors.text }]}>{transcript}</Text>
                <TouchableOpacity
                  onPress={() => setTranscript('')}
                  style={styles.clearTranscriptBtn}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          /* Prompt mode */
          <View style={[styles.textAreaWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              placeholder={'Describe your transactions...\nExample: spent 500 on fuel, earned 20000 salary'}
              placeholderTextColor={colors.placeholder}
              multiline
              style={[styles.textArea, { color: colors.text }]}
              autoFocus
            />
          </View>
        )}

        <Button
          title="Parse with Groq AI"
          iconName="robot-outline"
          onPress={handleParseTranscript}
          loading={isParsing}
          style={styles.parseBtn}
        />

        {draftItems.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Review ({draftItems.length})</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Tap an item to expand and edit</Text>
          </>
        )}

        {draftItems.map((item, index) => {
          const isExpense = item.entryType === 'expense';
          const typeColor = isExpense ? colors.error : colors.success;
          const typeBg = isExpense ? colors.error + '18' : colors.success + '18';
          const isExpanded = expandedItems.has(item.id);

          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                { backgroundColor: colors.surface, borderColor: isExpanded ? colors.primary : colors.border },
              ]}>
              {/* Collapsed header — always visible */}
              <TouchableOpacity
                style={styles.itemHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}>
                <View style={[styles.typeIndicator, { backgroundColor: typeBg }]}>
                  <MaterialCommunityIcons
                    name={isExpense ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                    size={16}
                    color={typeColor}
                  />
                </View>
                <View style={styles.itemHeaderCenter}>
                  <Text style={[styles.itemTitleText, { color: colors.text }]} numberOfLines={1}>
                    {item.title || `Item ${index + 1}`}
                  </Text>
                  <Text style={[styles.itemAmountText, { color: typeColor }]}>
                    ৳ {item.amount || '0'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <TouchableOpacity
                  onPress={() => removeDraftItem(item.id)}
                  style={styles.removeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Expanded body */}
              {isExpanded && (
                <View style={[styles.itemBody, { borderTopColor: colors.border }]}>
                  <View style={styles.entryTypeRow}>
                    <TouchableOpacity
                      style={[
                        styles.entryTypeChip,
                        {
                          backgroundColor: item.entryType === 'expense' ? colors.error : colors.surface,
                          borderColor: item.entryType === 'expense' ? colors.error : colors.border,
                        },
                      ]}
                      onPress={() => updateDraftItem(item.id, { entryType: 'expense' })}>
                      <Text style={{ color: item.entryType === 'expense' ? colors.textInverse : colors.text, fontWeight: '600' }}>
                        Expense
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.entryTypeChip,
                        {
                          backgroundColor: item.entryType === 'income' ? colors.success : colors.surface,
                          borderColor: item.entryType === 'income' ? colors.success : colors.border,
                        },
                      ]}
                      onPress={() => updateDraftItem(item.id, { entryType: 'income' })}>
                      <Text style={{ color: item.entryType === 'income' ? colors.textInverse : colors.text, fontWeight: '600' }}>
                        Income
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label="Title"
                    leftIcon="format-title"
                    value={item.title}
                    onChangeText={text => updateDraftItem(item.id, { title: text })}
                    placeholder="Transaction title"
                  />
                  <Input
                    label="Amount"
                    leftIcon="cash"
                    value={item.amount}
                    keyboardType="numeric"
                    onChangeText={text => updateDraftItem(item.id, { amount: text })}
                    placeholder="0"
                  />
                  <Input
                    label="Date (YYYY-MM-DD)"
                    leftIcon="calendar"
                    value={item.dateISO}
                    onChangeText={text => updateDraftItem(item.id, { dateISO: text })}
                    placeholder="2026-03-15"
                  />

                  {item.entryType === 'expense' ? (
                    <>
                      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Expense Type</Text>
                      {renderExpenseTypeChips(item)}
                      <Input
                        label="Category"
                        leftIcon="shape-outline"
                        value={item.category}
                        onChangeText={text => updateDraftItem(item.id, { category: text })}
                        placeholder="Fuel, Grocery, House Rent..."
                      />
                      {renderCategoryChips(item)}
                    </>
                  ) : (
                    <>
                      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Income Source</Text>
                      {renderSourceChips(item)}
                    </>
                  )}

                  <Input
                    label="Note"
                    leftIcon="note-text-outline"
                    value={item.note}
                    onChangeText={text => updateDraftItem(item.id, { note: text })}
                    placeholder="Optional"
                    multiline
                    numberOfLines={2}
                    style={{ height: 64, textAlignVertical: 'top' }}
                  />
                </View>
              )}
            </View>
          );
        })}

        <Button
          title="Confirm and Save All"
          iconName="content-save-all-outline"
          onPress={confirmSave}
          loading={isSaving}
          disabled={draftItems.length === 0}
          style={styles.saveBtn}
        />
      </ScrollView>

      {alertConfig && <AlertModal {...alertConfig} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  voiceArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceStatusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  partialText: {
    fontSize: 13,
    textAlign: 'center',
  },
  transcriptBox: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  transcriptValue: {
    fontSize: 14,
    lineHeight: 20,
    paddingRight: 20,
  },
  clearTranscriptBtn: {
    position: 'absolute',
    top: 10,
    right: 0,
  },
  textAreaWrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  parseBtn: {
    marginBottom: 4,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemHeaderCenter: {
    flex: 1,
    gap: 2,
  },
  itemTitleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemAmountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    borderTopWidth: 1,
    padding: 12,
    paddingTop: 10,
    gap: 4,
  },
  entryTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  entryTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipRow: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  saveBtn: {
    marginTop: 16,
  },
});

export default VoiceEntryScreen;
