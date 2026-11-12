import React from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { styles } from '../styles/register.styles'
import { useRegister } from '../hooks/useRegister'
import Button from '../../../../components/Button'
import Input from '../../../../components/Input'

const RegisterScreen = ({ navigation }) => {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    errors,
    isLoading,
    handleChangeFullName,
    handleChangeEmail,
    handleChangePassword,
    handleChangeConfirmPassword,
    handleRegister,
    handleGoToLogin,
  } = useRegister(navigation)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.logoText}>⚡</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up and start tracking your posture journey.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            autoCapitalize="words"
            value={fullName}
            onChangeText={handleChangeFullName}
            error={errors.fullName}
          />

          <Input
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChangeText={handleChangeEmail}
            keyboardType="email-address"
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={handleChangePassword}
            secureTextEntry
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={handleChangeConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Register"
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.submitBtn}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleGoToLogin} activeOpacity={0.7}>
              <Text style={styles.linkText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default RegisterScreen
