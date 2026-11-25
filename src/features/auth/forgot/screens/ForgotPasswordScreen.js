import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Same look as the Login screen.
import { styles } from '../../login/styles/login.styles';
import { useForgotPassword } from '../hooks/useForgotPassword';
import Button from '../../../../components/Button';
import Input from '../../../../components/Input';

const ForgotPasswordScreen = ({ navigation }) => {
  const f = useForgotPassword(navigation);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.titleContainer}>
          <Text style={styles.logoText}>🔑</Text>
          <Text style={styles.title}>{f.step === 'email' ? 'Forgot Password' : 'Reset Password'}</Text>
          <Text style={styles.subtitle}>
            {f.step === 'email'
              ? 'Enter your account email and we will send you a reset code.'
              : `Enter the 6-digit code sent to ${f.email.trim()} and choose a new password.`}
          </Text>
        </View>

        <View style={styles.form}>
          {f.step === 'email' ? (
            <>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={f.email}
                onChangeText={f.handleChangeEmail}
                keyboardType="email-address"
                error={f.errors.email}
              />
              <Button title="Send Reset Code" onPress={f.sendCode} isLoading={f.isLoading} style={styles.submitBtn} />
            </>
          ) : (
            <>
              <Input
                label="Reset Code"
                placeholder="6-digit code"
                value={f.code}
                onChangeText={f.handleChangeCode}
                keyboardType="number-pad"
                maxLength={6}
                error={f.errors.code}
              />
              <Input
                label="New Password"
                placeholder="Create a new password"
                value={f.password}
                onChangeText={f.handleChangePassword}
                secureTextEntry
                error={f.errors.password}
              />
              <Input
                label="Confirm New Password"
                placeholder="Confirm your new password"
                value={f.confirmPassword}
                onChangeText={f.handleChangeConfirmPassword}
                secureTextEntry
                error={f.errors.confirmPassword}
              />
              <Button title="Update Password" onPress={f.resetPassword} isLoading={f.isLoading} style={styles.submitBtn} />
              <Button
                title="Resend code / use another email"
                onPress={f.useDifferentEmail}
                variant="secondary"
                style={styles.sandboxBtn}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered it? </Text>
          <TouchableOpacity onPress={f.goBack} activeOpacity={0.7}>
            <Text style={styles.linkText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
