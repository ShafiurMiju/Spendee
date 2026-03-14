import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../contexts/ThemeContext';

interface Props {
  message?: string;
  icon?: string;
  style?: ViewStyle;
}

const EmptyState: React.FC<Props> = ({
  message = 'No data available',
  icon = 'inbox-outline',
  style,
}) => {
  const { theme } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }, style]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.primary + '12' },
        ]}>
        <MaterialCommunityIcons
          name={icon}
          size={48}
          color={theme.colors.primary}
        />
      </View>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
  },
});

export default EmptyState;
