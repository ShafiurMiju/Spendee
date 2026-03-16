import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../contexts/ThemeContext';

interface BackButtonProps {
  onPress?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { colors } = theme;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress ?? (() => navigation.goBack())}>
      <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BackButton;
