import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertModal } from '../../components/common';
import { updateUserPreferences } from '../../services/authService';
import { RootStackParamList } from '../../types';
import { AlertModalConfig } from '../../components/common/AlertModal';
import i18n from '../../i18n';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ── Reusable row ────────────────────────────────────────────────────────────
const NavRow: React.FC<{
  label: string;
  sub?: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  colors: any;
  last?: boolean;
}> = ({ label, sub, iconName, iconBg, iconColor, onPress, colors, last }) => (
  <TouchableOpacity
    style={[styles.navRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.7}>
    <View style={[styles.navIcon, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
    </View>
    <View style={styles.navBody}>
      <Text style={[styles.navLabel, { color: colors.text }]}>{label}</Text>
      {sub && <Text style={[styles.navSub, { color: colors.textSecondary }]}>{sub}</Text>}
    </View>
    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.border} />
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme, preference, setPreference } = useAppTheme();
  const { user, signOut, refreshProfile } = useAuth();
  const navigation = useNavigation<NavProp>();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const currentLang = i18n.language;
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  // Theme-aware card colours
  const cCardBg = theme.dark ? '#1E3A5F' : colors.card;
  const cBorder = theme.dark ? 'transparent' : colors.border;
  const cText   = theme.dark ? '#fff' : colors.text;
  const cSub    = theme.dark ? 'rgba(255,255,255,0.65)' : colors.textSecondary;

  const handleLanguageChange = async (lang: 'en' | 'bn') => {
    await i18n.changeLanguage(lang);
    try { await updateUserPreferences({ language: lang }); await refreshProfile(); } catch {}
  };

  const handleThemeChange = async (val: 'default' | 'light' | 'dark') => {
    await setPreference(val);
    try { await updateUserPreferences({ theme: val }); } catch {}
  };

  const handleSignOut = () => {
    setAlertConfig({
      visible: true,
      title: t('auth.signOut'),
      message: t('auth.signOutConfirm'),
      type: 'confirm',
      destructive: true,
      confirmText: t('auth.signOut'),
      cancelText: t('common.cancel'),
      onConfirm: async () => { setAlertConfig(null); await signOut(); },
      onCancel: () => setAlertConfig(null),
    });
  };

  const THEMES = [
    { key: 'default', label: t('settings.default'), icon: 'cellphone' },
    { key: 'light',   label: t('settings.light'),   icon: 'white-balance-sunny' },
    { key: 'dark',    label: t('settings.dark'),     icon: 'moon-waning-crescent' },
  ] as const;

  const LANGS = [
    { key: 'en', label: t('settings.english'),  flag: '🇬🇧' },
    { key: 'bn', label: t('settings.bengali'),   flag: '🇧🇩' },
  ] as const;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}>

      {/* ── Page title ── */}
      <Text style={[styles.pageTitle, { color: colors.text, paddingHorizontal: 20 }]}>Settings</Text>

      {/* ── Profile Banner ── */}
      <View style={[styles.profileBanner, { backgroundColor: cCardBg, borderColor: cBorder, borderWidth: 1, marginHorizontal: 16 }]}>
        <View style={styles.profileBannerGlow} />
        {user?.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.15)' : colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.dark ? '#fff' : colors.primary }]}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: cText }]} numberOfLines={1}>{user?.name || 'User'}</Text>
          <Text style={[styles.profileEmail, { color: cSub }]} numberOfLines={1}>{user?.email}</Text>
        </View>
        <View style={[styles.profileBadge, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.12)' : colors.primary + '15' }]}>
          <MaterialCommunityIcons name="google" size={13} color={theme.dark ? 'rgba(255,255,255,0.8)' : colors.primary} />
          <Text style={[styles.profileBadgeText, { color: theme.dark ? 'rgba(255,255,255,0.8)' : colors.primary }]}>Google</Text>
        </View>
      </View>

      {/* ── Appearance ── */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20 }]}>APPEARANCE</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        {/* Theme */}
        <View style={styles.preferenceRow}>
          <View style={[styles.prefIcon, { backgroundColor: colors.primary + '18' }]}>
            <MaterialCommunityIcons name="palette-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.prefLabel, { color: colors.text }]}>{t('settings.theme')}</Text>
        </View>
        <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {THEMES.map(opt => {
            const active = preference === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segment, active && { backgroundColor: colors.primary, borderRadius: 8 }]}
                onPress={() => handleThemeChange(opt.key)}>
                <MaterialCommunityIcons name={opt.icon} size={15} color={active ? '#fff' : colors.textSecondary} />
                <Text style={[styles.segmentText, { color: active ? '#fff' : colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        {/* Language */}
        <View style={styles.preferenceRow}>
          <View style={[styles.prefIcon, { backgroundColor: colors.success + '18' }]}>
            <MaterialCommunityIcons name="translate" size={18} color={colors.success} />
          </View>
          <Text style={[styles.prefLabel, { color: colors.text }]}>{t('settings.language')}</Text>
        </View>
        <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {LANGS.map(opt => {
            const active = currentLang === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segment, active && { backgroundColor: colors.primary, borderRadius: 8 }]}
                onPress={() => handleLanguageChange(opt.key)}>
                <Text style={styles.segmentFlag}>{opt.flag}</Text>
                <Text style={[styles.segmentText, { color: active ? '#fff' : colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Data & Tools ── */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20 }]}>DATA & TOOLS</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        <NavRow
          label={t('settings.manageTypes')}
          sub="Add or remove expense types"
          iconName="shape-plus-outline"
          iconBg={colors.primary + '18'}
          iconColor={colors.primary}
          onPress={() => navigation.navigate('ManageTypes')}
          colors={colors}
        />
        <NavRow
          label={t('settings.categories')}
          sub="Organise categories by type"
          iconName="tag-multiple-outline"
          iconBg={colors.warning + '18'}
          iconColor={colors.warning}
          onPress={() => navigation.navigate('CategoryManagement')}
          colors={colors}
        />
        <NavRow
          label={t('settings.exportPdf')}
          sub="Export expense, income or rent report"
          iconName="file-pdf-box"
          iconBg={colors.error + '18'}
          iconColor={colors.error}
          onPress={() => navigation.navigate('PDFExport')}
          colors={colors}
          last
        />
      </View>

      {/* ── Account ── */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20 }]}>ACCOUNT</Text>

      <TouchableOpacity
        style={[styles.signOutRow, { backgroundColor: colors.error + '0F', borderColor: colors.error + '35', marginHorizontal: 16 }]}
        onPress={handleSignOut}
        activeOpacity={0.75}>
        <View style={[styles.signOutIcon, { backgroundColor: colors.error + '18' }]}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
        </View>
        <Text style={[styles.signOutText, { color: colors.error }]}>{t('auth.signOut')}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.error + '80'} />
      </TouchableOpacity>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerLogoRow}>
          <MaterialCommunityIcons name="cash-multiple" size={16} color={colors.primary} />
          <Text style={[styles.footerApp, { color: colors.text }]}>Spendee</Text>
        </View>
        <Text style={[styles.footerVersion, { color: colors.textSecondary }]}>{t('settings.version')} 1.0.0</Text>
      </View>

      {alertConfig && <AlertModal {...alertConfig} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  pageTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20 },

  // Profile banner
  profileBanner: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  profileBannerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -30,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  profileEmail: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },

  // Card
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, gap: 12 },
  cardDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  // Preference rows
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prefIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  prefLabel: { fontSize: 15, fontWeight: '600' },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 7,
  },
  segmentText: { fontSize: 12, fontWeight: '600' },
  segmentFlag: { fontSize: 14 },

  // Nav rows
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  navIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navBody: { flex: 1 },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navSub: { fontSize: 12, marginTop: 1 },

  // Sign out
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  signOutIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  signOutText: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Footer
  footer: { alignItems: 'center', gap: 4 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerApp: { fontSize: 15, fontWeight: '700' },
  footerVersion: { fontSize: 12 },
});

export default SettingsScreen;
