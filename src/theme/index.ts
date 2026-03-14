export interface AppColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  household: string;
  personal: string;
  disabled: string;
  placeholder: string;
  shadow: string;
  overlay: string;
}

export interface AppTheme {
  dark: boolean;
  colors: AppColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
}

// ─── Shared tokens ──────────────────────────────────────────────────────────
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
} as const;

// ─── Light palette ──────────────────────────────────────────────────────────
const lightColors: AppColors = {
  primary: '#4A90D9',
  primaryDark: '#357ABD',
  primaryLight: '#7BB3E8',
  accent: '#FF6B6B',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  household: '#4A90D9',
  personal: '#FF6B6B',
  disabled: '#D1D5DB',
  placeholder: '#9CA3AF',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
};

// ─── Dark palette ───────────────────────────────────────────────────────────
const darkColors: AppColors = {
  primary: '#7BB3E8',
  primaryDark: '#4A90D9',
  primaryLight: '#A8CFEF',
  accent: '#FF8A8A',
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textInverse: '#0F172A',
  border: '#334155',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  household: '#7BB3E8',
  personal: '#FF8A8A',
  disabled: '#475569',
  placeholder: '#64748B',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
};

// ─── Theme objects ──────────────────────────────────────────────────────────
export const LightTheme: AppTheme = {
  dark: false,
  colors: lightColors,
  spacing,
  borderRadius,
  typography,
};

export const DarkTheme: AppTheme = {
  dark: true,
  colors: darkColors,
  spacing,
  borderRadius,
  typography,
};
