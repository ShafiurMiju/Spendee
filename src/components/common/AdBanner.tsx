import React, { useState } from 'react';
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

const AdBanner: React.FC<Props> = ({ style, size = BannerAdSize.BANNER }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.wrap, !loaded && styles.placeholder, style]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => {
          setLoaded(true);
          console.log('[AdBanner] loaded');
        }}
        onAdFailedToLoad={err => {
          setLoaded(false);
          console.warn('[AdBanner] failed:', err?.message ?? err);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  placeholder: { minHeight: 50 },
});

export default AdBanner;
