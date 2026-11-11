import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { authErrorMessage } from '@/services/auth-errors';
import { signUp } from '@/services/auth';

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
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

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.heading}>
        <ThemedText type="overline">Built Daily</ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          Create account
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          One account for the app and the website.
        </ThemedText>
      </View>

      <View style={styles.fields}>
        <FormField
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          editable={!isSubmitting}
        />

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
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          textContentType="newPassword"
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
        label="Create account"
        size="lg"
        onPress={handleSubmit}
        disabled={!canSubmit}
        busy={isSubmitting}
      />

      <Link href="/sign-in" style={styles.link}>
        <ThemedText type="link">Already have an account? Sign in</ThemedText>
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
