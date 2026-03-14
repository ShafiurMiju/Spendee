import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../contexts/ThemeContext';

type AlertType = 'success' | 'error' | 'warning' | 'confirm';

export interface AlertModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  extraText?: string;
  extra2Text?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onExtra?: () => void;
  onExtra2?: () => void;
  destructive?: boolean;
}

const ICON_MAP: Record<AlertType, string> = {
  success: 'check-circle-outline',
  error:   'close-circle-outline',
  warning: 'alert-circle-outline',
  confirm: 'help-circle-outline',
};

const AlertModal: React.FC<AlertModalConfig> = ({
  visible,
  title,
  message,
  type = 'error',
  confirmText = 'OK',
  cancelText = 'Cancel',
  extraText,
  extra2Text,
  onConfirm,
  onCancel,
  onExtra,
  onExtra2,
  destructive = false,
}) => {
  const { theme } = useAppTheme();
  const { colors } = theme;

  const scaleAnim   = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 5,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const typeColors: Record<AlertType, string> = {
    success: colors.success,
    error:   colors.error,
    warning: colors.warning,
    confirm: colors.primary,
  };

  const accentColor = destructive ? colors.error : typeColors[type];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: accentColor + '15' }]}>
            <MaterialCommunityIcons name={ICON_MAP[type]} size={34} color={accentColor} />
          </View>

          {/* Text */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
            {onExtra && extraText && (
              <Pressable
                style={[styles.extraBtn, { borderColor: accentColor }]}
                android_ripple={{ color: accentColor + '20' }}
                onPress={onExtra}>
                <Text style={[styles.extraText, { color: accentColor }]}>{extraText}</Text>
              </Pressable>
            )}
            {onExtra2 && extra2Text && (
              <Pressable
                style={[styles.extraBtn, { borderColor: colors.border }]}
                android_ripple={{ color: colors.border }}
                onPress={onExtra2}>
                <Text style={[styles.extraText, { color: colors.textSecondary }]}>{extra2Text}</Text>
              </Pressable>
            )}
            {onCancel && (
              <Pressable
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                android_ripple={{ color: colors.border }}
                onPress={onCancel}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{cancelText}</Text>
              </Pressable>
            )}
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 310,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  extraBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  extraText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AlertModal;
