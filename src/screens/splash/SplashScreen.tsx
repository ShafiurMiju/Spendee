import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { SpendeeLogo } from '../../components/common';

const SplashScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim, fadeAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <SpendeeLogo size={120} color={colors.textInverse} showText textColor={colors.textInverse} />
      </Animated.View>
      <Animated.Text
        style={[styles.subtitle, { color: colors.textInverse, opacity: fadeAnim }]}>
        Smart Expense Tracker
      </Animated.Text>
      <ActivityIndicator
        size="large"
        color={colors.textInverse}
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
  },
  loader: {
    marginTop: 48,
  },
});

export default SplashScreen;
