import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

const logo = require('../../assets/images/logo.png');

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.Text
        style={[styles.subtitle, { color: colors.text, opacity: fadeAnim }]}>
        Smart Expense Tracker
      </Animated.Text>
      <ActivityIndicator
        size="large"
        color={colors.primary}
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
  logo: {
    width: 160,
    height: 160,
    borderRadius: 32,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 16,
  },
  loader: {
    marginTop: 48,
  },
});

export default SplashScreen;
