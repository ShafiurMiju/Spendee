import { getGroqApiKey, GROQ_API_URL, GROQ_MODEL, GROQ_STT_LANGUAGE } from '../config/groq';

// ---------------------------------------------------------------------------
// Groq Whisper transcription — record audio file → text
// ---------------------------------------------------------------------------
export async function transcribeAudio(filePath: string): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY. Add it to your .env file.');
  }

  const localPath = filePath.replace(/^file:\/\//, '');

  const buildFormData = (withTranslationPrompt: boolean): FormData => {
    const formData = new FormData();
    formData.append('file', {
      uri: `file://${localPath}`,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'text');
    if (GROQ_STT_LANGUAGE && GROQ_STT_LANGUAGE !== 'auto') {
      formData.append('language', GROQ_STT_LANGUAGE);
    }
    if (withTranslationPrompt) {
      formData.append(
        'prompt',
        'Return the final transcript in English. If the speech is Bangla, translate it to natural English. If already English, keep it as English transcript.',
      );
    }
    return formData;
  };

  const callWhisper = async (endpoint: string, withTranslationPrompt: boolean): Promise<Response> => {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: buildFormData(withTranslationPrompt),
    });
  };

  // Prefer dedicated translation endpoint to force English output.
  let response = await callWhisper('https://api.groq.com/openai/v1/audio/translations', false);

  // Fallback for providers/models that do not expose translations endpoint.
  if (!response.ok) {
    response = await callWhisper('https://api.groq.com/openai/v1/audio/transcriptions', true);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${err}`);
  }

  return (await response.text()).trim();
}

export type VoiceEntryType = 'expense' | 'income';

export interface ParsedVoiceTransaction {
  entryType: VoiceEntryType;
  title: string;
  amount: number;
  dateISO: string;
  expenseType: string;
  category: string;
  source: string;
  note: string;
}

interface GroqContent {
  content?: string;
}

interface GroqChoice {
  message?: GroqContent;
}

interface GroqResponse {
  choices?: GroqChoice[];
}

export interface ParseVoiceTransactionsInput {
  transcript: string;
  expenseTypes: string[];
  categoriesByType: Record<string, string[]>;
  incomeSources: string[];
  now?: Date;
}

interface ParsedPayload {
  items?: Array<Record<string, unknown>>;
}

function toDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedDigits = value.replace(/[০-৯]/g, digit => {
      const banglaDigits = '০১২৩৪৫৬৭৮৯';
      const index = banglaDigits.indexOf(digit);
      return index >= 0 ? String(index) : digit;
    });
    const normalized = normalizedDigits.replace(/[^\d.-]/g, '');
    const n = Number(normalized);
    return isFinite(n) ? n : 0;
  }

  return 0;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeDateISO(rawDate: unknown, fallback: string): string {
  if (typeof rawDate === 'number' && isFinite(rawDate)) {
    return toDateISO(new Date(rawDate));
  }

  if (typeof rawDate !== 'string') {
    return fallback;
  }

  const trimmed = rawDate.trim();
  if (!trimmed) {
    return fallback;
  }

  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return toDateISO(direct);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }

  return raw.trim();
}

function pickBestMatch(candidate: string, options: string[], fallback: string): string {
  if (!candidate) {
    return fallback;
  }

  const c = candidate.toLowerCase();
  for (const option of options) {
    if (option.toLowerCase() === c) {
      return option;
    }
  }

  for (const option of options) {
    const low = option.toLowerCase();
    if (c.indexOf(low) >= 0 || low.indexOf(c) >= 0) {
      return option;
    }
  }

  return fallback;
}

export async function parseVoiceTransactions(
  input: ParseVoiceTransactionsInput,
): Promise<ParsedVoiceTransaction[]> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY. Set it in src/config/groq.ts or process.env.GROQ_API_KEY');
  }

  const now = input.now ?? new Date();
  const todayISO = toDateISO(now);
  const fallbackExpenseType = input.expenseTypes[0] ?? 'household';
  const fallbackIncomeSource = input.incomeSources[0] ?? 'other';

  const systemPrompt = [
    'You are a financial transaction parser.',
    'The transcript can be in Bangla (Bengali), English, or mixed Bangla-English.',
    'Extract one or more records from user speech and return strict JSON only.',
    'Return shape: {"items":[{...}]}.',
    'For each item include:',
    '- entryType: "expense" or "income"',
    '- title: short label',
    '- amount: number only',
    '- dateISO: YYYY-MM-DD',
    '- expenseType: one of allowed expense types when entryType is expense',
    '- category: category text for expenses (can be empty)',
    '- source: one of allowed income sources when entryType is income',
    '- note: optional short note',
    'Rules:',
    '- If date is omitted, use today.',
    '- Convert Bangla numerals (০১২৩৪৫৬৭৮৯) and Bengali amount words into numeric amount.',
    '- Convert currency words like taka to numeric amount.',
    '- Split combined sentences into multiple items.',
    '- Never include explanation text; output JSON only.',
  ].join('\n');

  const userPrompt = JSON.stringify(
    {
      transcript: input.transcript,
      todayISO,
      allowedExpenseTypes: input.expenseTypes,
      allowedCategoriesByExpenseType: input.categoriesByType,
      allowedIncomeSources: input.incomeSources,
    },
    null,
    2,
  );

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      top_p: 1,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as GroqResponse;
  const rawContent = payload.choices?.[0]?.message?.content ?? '';
  if (!rawContent.trim()) {
    throw new Error('Groq returned empty content');
  }

  let parsed: ParsedPayload;
  try {
    const jsonText = extractJson(rawContent);
    parsed = JSON.parse(jsonText) as ParsedPayload;
  } catch {
    throw new Error('Failed to parse AI response into JSON');
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return items
    .map((item): ParsedVoiceTransaction | null => {
      const rawType = toText(item.entryType ?? item.type).toLowerCase();
      const entryType: VoiceEntryType = rawType === 'income' ? 'income' : 'expense';

      const title =
        toText(item.title) ||
        (entryType === 'income' ? 'Income' : 'Expense');
      const amount = toNumber(item.amount);
      const dateISO = safeDateISO(item.dateISO ?? item.date ?? item.timestamp, todayISO);
      const note = toText(item.note);

      if (amount <= 0) {
        return null;
      }

      if (entryType === 'expense') {
        const expenseType = pickBestMatch(
          toText(item.expenseType),
          input.expenseTypes,
          fallbackExpenseType,
        );

        const allowedCategories = input.categoriesByType[expenseType] ?? [];
        const category = pickBestMatch(
          toText(item.category),
          allowedCategories,
          toText(item.category),
        );

        return {
          entryType,
          title,
          amount,
          dateISO,
          expenseType,
          category,
          source: '',
          note,
        };
      }

      const source = pickBestMatch(
        toText(item.source),
        input.incomeSources,
        fallbackIncomeSource,
      );

      return {
        entryType,
        title,
        amount,
        dateISO,
        expenseType: fallbackExpenseType,
        category: '',
        source,
        note,
      };
    })
    .filter((item): item is ParsedVoiceTransaction => item !== null);
}
