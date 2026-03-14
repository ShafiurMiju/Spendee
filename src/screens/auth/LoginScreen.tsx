import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Button, Input, SpendeeLogo } from '../../components/common';

type Tab = 'signin' | 'register';

const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, signInWithEmail, signUpWithEmail } = useAuth();
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    resetForm();
  };

  const handleEmailAuth = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (tab === 'register') {
      if (!name.trim()) { setError('Please enter your name.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }
    setLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } catch (e: any) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signIn();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <SpendeeLogo size={80} color={colors.primary} showText />
        </View>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Track your household & personal expenses
        </Text>

        <View style={[styles.tabRow, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.tab, tab === 'signin' && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange('signin')}>
            <MaterialCommunityIcons
              name="login"
              size={16}
              color={tab === 'signin' ? '#fff' : colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, { color: tab === 'signin' ? '#fff' : colors.textSecondary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'register' && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange('register')}>
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={16}
              color={tab === 'register' ? '#fff' : colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, { color: tab === 'register' ? '#fff' : colors.textSecondary }]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {tab === 'register' && (
            <Input label="Full Name" leftIcon="account-outline" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
          )}
          <Input label="Email" leftIcon="email-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" leftIcon="lock-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          {tab === 'register' && (
            <Input label="Confirm Password" leftIcon="lock-check-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" secureTextEntry />
          )}

          {error ? (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={tab === 'signin' ? 'Sign In' : 'Create Account'}
            iconName={tab === 'signin' ? 'login' : 'account-plus'}
            onPress={handleEmailAuth}
            loading={loading}
            style={styles.btn}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Button
          title={googleLoading ? 'Signing in...' : 'Continue with Google'}
          onPress={handleGoogle}
          loading={googleLoading}
          variant="outline"
          icon={<MaterialCommunityIcons name="google" size={20} color={colors.primary} />}
          style={styles.btn}
        />

        <View style={styles.footerRow}>
          <MaterialCommunityIcons name="shield-lock-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            Your data is securely stored with Firebase
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/email-already-in-use': return 'An account already exists with this email.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    default: return 'Something went wrong. Please try again.';
  }
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 8 },
  tagline: { fontSize: 14, marginTop: 8, textAlign: 'center', marginBottom: 40 },
  tabRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { marginRight: 6 },
  tabText: { fontWeight: '600', fontSize: 15 },
  form: { gap: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4 },
  errorText: { fontSize: 13 },
  btn: { marginTop: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32 },
  footer: { fontSize: 12 },
});

export default LoginScreen;
