import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  showText?: boolean;
  textColor?: string;
}

const SpendeeLogo: React.FC<Props> = ({
  size = 80,
  color = '#4A90D9',
  showText = false,
  textColor,
}) => {
  const iconSize = size;
  const halfSize = iconSize / 2;
  const resolvedTextColor = textColor ?? color;

  return (
    <View style={styles.container}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
        {/* Background circle */}
        <Circle cx="50" cy="50" r="48" fill={color} opacity={0.12} />
        <Circle cx="50" cy="50" r="44" fill={color} opacity={0.08} />

        <G>
          {/* Wallet body */}
          <Path
            d="M22 35 C22 30, 27 26, 32 26 L68 26 C73 26, 78 30, 78 35 L78 68 C78 73, 73 77, 68 77 L32 77 C27 77, 22 73, 22 68 Z"
            fill={color}
            opacity={0.9}
          />

          {/* Wallet flap */}
          <Path
            d="M22 35 L78 35 L78 45 L22 45 Z"
            fill={color}
            opacity={0.7}
          />

          {/* Card slot */}
          <Path
            d="M56 52 L74 52 C76 52, 78 54, 78 56 L78 62 C78 64, 76 66, 74 66 L56 66 C54 66, 52 64, 52 62 L52 56 C52 54, 54 52, 56 52 Z"
            fill="white"
            opacity={0.95}
          />

          {/* Coin circle */}
          <Circle cx="63" cy="59" r="5" fill={color} />

          {/* Taka symbol in coin */}
          <Path
            d="M61 57 L65 57 M63 55 L63 63"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {showText && (
        <Text
          style={[
            styles.text,
            {
              color: resolvedTextColor,
              fontSize: halfSize * 0.55,
            },
          ]}>
          Spendee
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
  },
});

export default SpendeeLogo;
