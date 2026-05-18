import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../services/adsService';

interface Props {
  style?: ViewStyle;
  size?: BannerAdSize;
}

const AdBanner: React.FC<Props> = ({ style, size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }) => {
  return (
    <View style={[styles.wrap, style]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={err => console.warn('Banner failed:', err)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

export default AdBanner;
