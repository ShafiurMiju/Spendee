import { Platform } from 'react-native';
import mobileAds, {
  AppOpenAd,
  InterstitialAd,
  AdEventType,
  TestIds,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

const isDev = __DEV__;

export const AD_UNIT_IDS = {
  banner: isDev
    ? TestIds.BANNER
    : 'ca-app-pub-7264179067856018/9581321631',
  interstitial: isDev
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-7264179067856018/3265222502',
  appOpen: isDev
    ? TestIds.APP_OPEN
    : 'ca-app-pub-7264179067856018/4994219689',
} as const;

let initialized = false;

export async function initializeAds(): Promise<void> {
  if (initialized) return;
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
  await mobileAds().initialize();
  initialized = true;
  preloadInterstitial();
  preloadAppOpen();
}

// ── Interstitial ────────────────────────────────────────────────────────────
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let interstitialLoading = false;

function createInterstitial(): InterstitialAd {
  const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
    interstitialLoading = false;
  });
  ad.addAdEventListener(AdEventType.ERROR, err => {
    interstitialLoaded = false;
    interstitialLoading = false;
    console.warn('Interstitial error:', err);
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    preloadInterstitial();
  });
  return ad;
}

export function preloadInterstitial(): void {
  if (interstitialLoading || interstitialLoaded) return;
  interstitial = createInterstitial();
  interstitialLoading = true;
  interstitial.load();
}

export function showInterstitial(): boolean {
  if (interstitial && interstitialLoaded) {
    try {
      interstitial.show();
      return true;
    } catch (e) {
      console.warn('Interstitial show error:', e);
    }
  }
  preloadInterstitial();
  return false;
}

// ── App Open ────────────────────────────────────────────────────────────────
let appOpenAd: AppOpenAd | null = null;
let appOpenLoaded = false;
let appOpenLoading = false;
let appOpenLoadedAt = 0;
const APP_OPEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours, per Google guidance

function createAppOpen(): AppOpenAd {
  const ad = AppOpenAd.createForAdRequest(AD_UNIT_IDS.appOpen, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    appOpenLoaded = true;
    appOpenLoading = false;
    appOpenLoadedAt = Date.now();
  });
  ad.addAdEventListener(AdEventType.ERROR, err => {
    appOpenLoaded = false;
    appOpenLoading = false;
    console.warn('AppOpen error:', err);
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    appOpenLoaded = false;
    preloadAppOpen();
  });
  return ad;
}

export function preloadAppOpen(): void {
  if (appOpenLoading || appOpenLoaded) return;
  appOpenAd = createAppOpen();
  appOpenLoading = true;
  appOpenAd.load();
}

export function showAppOpenIfAvailable(): boolean {
  const fresh = Date.now() - appOpenLoadedAt < APP_OPEN_TTL_MS;
  if (appOpenAd && appOpenLoaded && fresh) {
    try {
      appOpenAd.show();
      return true;
    } catch (e) {
      console.warn('AppOpen show error:', e);
    }
  }
  if (!fresh) appOpenLoaded = false;
  preloadAppOpen();
  return false;
}

export const AdsPlatform = Platform.OS;
