import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UsersIcon } from '@/components/ui/icons';
import { useTheme } from '@/hooks/use-theme';
import type { TogetherToday } from '@/lib/groups-model';

type TogetherCardProps = {
  together: TogetherToday;
  busy: boolean;
  onOpen: () => void;
  onStart: () => void;
};

/** G9: on a day with a plan together, Home leads with it. */
export function TogetherCard({ together, busy, onOpen, onStart }: TogetherCardProps) {
  const theme = useTheme();

  return (
    <Card radius="xl" style={[styles.card, { borderColor: theme.tint }]}>
      <View style={styles.overline}>
        <UsersIcon size={14} color={theme.tintText} strokeWidth={2} />
        <ThemedText type="overline" style={{ color: theme.tintText }}>
          Training with someone today
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[together.label, together.meta, together.going].filter(Boolean).join(', ')}
        accessibilityHint="Opens the plan"
        onPress={onOpen}
        style={({ pressed }) => [styles.copy, pressed && styles.pressed]}>
        <ThemedText type="heading" numberOfLines={1}>
          {together.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textBody" numberOfLines={1}>
          {together.meta}
        </ThemedText>
        {together.going ? <ThemedText type="caption">{together.going}</ThemedText> : null}
      </Pressable>

      <Button label="Start" size="lg" busy={busy} onPress={onStart} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    gap: 12,
    padding: 16,
  },
  overline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  copy: {
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
