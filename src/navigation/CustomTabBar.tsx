import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../contexts/ThemeContext';

const SHORT_LABELS: Record<string, string> = {
  Dashboard: 'Home',
  Expenses:  'Expenses',
  Income:    'Income',
  Reports:   'Reports',
  Rent:      'Rent',
  Settings:  'Settings',
};

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'view-dashboard-outline',
  Expenses:  'file-document-outline',
  Income:    'cash-plus',
  Reports:   'chart-bar',
  Rent:      'home-city-outline',
  Settings:  'cog-outline',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const BAR_WIDTH  = SCREEN_WIDTH - H_PADDING * 2;

// ── Single tab button ────────────────────────────────────────────────────────
const TabButton: React.FC<{
  route: any;
  isFocused: boolean;
  tabWidth: number;
  primaryColor: string;
  mutedColor: string;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ route, isFocused, tabWidth, primaryColor, mutedColor, label, onPress, onLongPress }) => {
  const circleScale = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pressScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(circleScale, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  }, [isFocused, circleScale]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 25, bounciness: 10 }),
    ]).start();
    onPress();
  };

  const iconName = TAB_ICONS[route.name] ?? 'circle-outline';

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={{ width: tabWidth, alignItems: 'center', paddingVertical: 10 }}
      hitSlop={4}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: pressScale }] }}>
        {/* Icon + active circle */}
        <View style={styles.iconWrap}>
          <Animated.View
            style={[
              styles.activeCircle,
              {
                backgroundColor: primaryColor,
                transform: [{ scale: circleScale }],
              },
            ]}
          />
          <MaterialCommunityIcons
            name={iconName}
            size={22}
            color={isFocused ? '#fff' : mutedColor}
          />
        </View>
        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: isFocused ? primaryColor : mutedColor,
              fontWeight: isFocused ? '700' : '500',
              opacity: isFocused ? 1 : 0.6,
            },
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ── Custom tab bar ───────────────────────────────────────────────────────────
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const tabWidth = BAR_WIDTH / state.routes.length;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.dark ? '#1C1C2E' : '#FFFFFF',
            shadowColor: theme.dark ? '#000' : '#64748B',
            borderColor: theme.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          },
        ]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = SHORT_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              tabWidth={tabWidth}
              primaryColor={colors.primary}
              mutedColor={colors.textSecondary}
              label={label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});

export default CustomTabBar;
