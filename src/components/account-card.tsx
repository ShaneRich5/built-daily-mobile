import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { signOut } from '@/services/auth';

export function AccountCard() {
  const { user } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.details}>
        <ThemedText type="label">{user?.displayName || 'Signed in'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user?.email}
        </ThemedText>
      </View>

      <Pressable
        onPress={handleSignOut}
        disabled={isSigningOut}
        accessibilityRole="button"
        style={isSigningOut && styles.disabled}>
        <ThemedText type="link">
          Sign out
        </ThemedText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  details: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  disabled: {
    opacity: 0.5,
  },
});
