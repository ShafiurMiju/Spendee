import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../contexts/ThemeContext';

interface Props {
  children: React.ReactNode;
  title?: string;
  iconName?: string;
  style?: ViewStyle;
}

const Card: React.FC<Props> = ({ children, title, iconName, style }) => {
  const { theme } = useAppTheme();
  const { colors, borderRadius: br, spacing } = theme;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: br.lg,
          padding: spacing.md,
          shadowColor: colors.shadow,
        },
        style,
      ]}>
      {title ? (
        <View style={styles.titleRow}>
          {iconName && (
            <MaterialCommunityIcons
              name={iconName}
              size={20}
              color={colors.primary}
              style={styles.titleIcon}
            />
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Card;
