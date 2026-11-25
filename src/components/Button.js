import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style = {}
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[
        styles.button,
        isPrimary && styles.btnPrimary,
        isSecondary && styles.btnSecondary,
        isDanger && styles.btnDanger,
        isSuccess && styles.btnSuccess,
        disabled && styles.btnDisabled,
        style
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={isSecondary ? '#7C3AED' : '#FFFFFF'} size="small" />
      ) : (
        <Text style={[
          styles.text,
          isSecondary && styles.textSecondary,
          disabled && styles.textDisabled
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  btnPrimary: {
    backgroundColor: '#7C3AED',
  },
  btnSecondary: {
    backgroundColor: '#1E1E26',
    borderWidth: 1,
    borderColor: '#3F3F54',
  },
  btnDanger: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  btnSuccess: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  btnDisabled: {
    backgroundColor: '#2D2D3A',
    borderColor: '#1E1E26',
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  textSecondary: {
    color: '#9F7AEA',
  },
  textDisabled: {
    color: '#6B7280',
  }
});
