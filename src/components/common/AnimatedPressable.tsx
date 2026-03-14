import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface Props {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  disabled?: boolean;
}

const AnimatedPressable: React.FC<Props> = ({
  children,
  onPress,
  onLongPress,
  style,
  scaleValue = 0.97,
  disabled = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default AnimatedPressable;
