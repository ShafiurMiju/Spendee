import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import BackButton from './BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  /** When true, skips safe-area top padding and bottom border (for use inside ScrollViews that already handle insets). */
  inline?: boolean;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onBack, rightElement, inline }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { colors } = theme;

  return (
    <View style={[
      styles.header,
      inline
        ? { marginBottom: 12 }
        : { paddingTop: insets.top + 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.background },
    ]}>
      <BackButton onPress={onBack} />
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {rightElement ?? <View style={{ width: 38 }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
});

export default ScreenHeader;
