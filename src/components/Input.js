import React from 'react'
import { View, TextInput, Text, StyleSheet } from 'react-native'

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error = '',
}) => {
  const inputStyles = [
    styles.inputContainer,
    error ? styles.inputErrorBorder : null,
  ];

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : <View style={styles.errorPlaceholder} />}
        </View>
      ) : null}
      <View style={inputStyles}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.textInput}
        />
      </View>
    </View>
  )
}

export default Input

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  inputContainer: {
    height: 52,
    backgroundColor: '#1E1E26',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2D2D3A',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    height: '100%',
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginLeft: 8,
    textAlign: 'right',
  },
  errorPlaceholder: {
    width: 1,
  },
})
