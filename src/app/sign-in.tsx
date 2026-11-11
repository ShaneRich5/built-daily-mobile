import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { authErrorMessage } from '@/services/auth-errors';
import { signIn } from '@/services/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      // No navigation needed — the root layout's guard swaps to (app) once the
      // auth state listener fires.
    } catch (e) {
      setError(authErrorMessage(e));
      setIsSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.heading}>
        <ThemedText type="overline">Built Daily</ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          Sign in
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Use the same account you created on the website.
        </ThemedText>
      </View>

      <View style={styles.fields}>
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isSubmitting}
        />

        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          textContentType="password"
          editable={!isSubmitting}
          onSubmitEditing={handleSubmit}
        />
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button
        label="Sign in"
        size="lg"
        onPress={handleSubmit}
        disabled={!canSubmit}
        busy={isSubmitting}
      />

      <Link href="/sign-up" style={styles.link}>
        <ThemedText type="link">Don&apos;t have an account? Sign up</ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    gap: 4,
  },
  fields: {
    gap: 12,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
});
