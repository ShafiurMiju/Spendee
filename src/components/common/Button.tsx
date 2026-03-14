import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../contexts/ThemeContext';
import AnimatedPressable from './AnimatedPressable';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconName?: string;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconName,
  iconPosition = 'left',
}) => {
  const { theme } = useAppTheme();
  const { colors, borderRadius: br } = theme;

  const bgColor = {
    primary: colors.primary,
    secondary: colors.surface,
    danger: colors.error,
    outline: 'transparent',
  }[variant];

  const txtColor = {
    primary: colors.textInverse,
    secondary: colors.text,
    danger: colors.textInverse,
    outline: colors.primary,
  }[variant];

  const borderColor = variant === 'outline' ? colors.primary : bgColor;

  const resolvedIcon = icon ?? (iconName ? (
    <MaterialCommunityIcons
      name={iconName}
      size={20}
      color={disabled ? colors.placeholder : txtColor}
    />
  ) : null);

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        {
          backgroundColor: disabled ? colors.disabled : bgColor,
          borderColor,
          borderRadius: br.lg,
          flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={txtColor} size="small" />
      ) : (
        <>
          {resolvedIcon}
          <Text
            style={[
              styles.text,
              { color: disabled ? colors.placeholder : txtColor },
              textStyle,
            ]}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
