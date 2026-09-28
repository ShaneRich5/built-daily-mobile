import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authErrorMessage } from '@/services/auth-errors';
import { signUp } from '@/services/auth';

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
  const theme = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await signUp(email, password, displayName);
    } catch (e) {
      setError(authErrorMessage(e));
      setIsSubmitting(false);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.form}>
          <ThemedText type="subtitle">Create account</ThemedText>

          <TextInput
            style={inputStyle}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!isSubmitting}
          />

          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!isSubmitting}
          />

          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder={`Password (${MIN_PASSWORD_LENGTH}+ characters)`}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            textContentType="newPassword"
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
          />

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            style={[styles.button, { backgroundColor: theme.tint }, !canSubmit && styles.disabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button">
            {isSubmitting ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Create account
              </ThemedText>
            )}
          </Pressable>

          <Link href="/sign-in" style={styles.link}>
            <ThemedText type="link" themeColor="tint">
              Already have an account? Sign in
            </ThemedText>
          </Link>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    borderRadius: 10,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  disabled: {
    opacity: 0.5,
  },
  link: {
    alignSelf: 'center',
  },
});
