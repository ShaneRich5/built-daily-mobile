import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarSyncIcon, ExternalLinkIcon, ShareIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { googleCalendarAddUrl, toWebcal } from '@/lib/calendar-feed';
import { confirm } from '@/services/confirm';

export type CalendarFeedCardProps = {
  isLoaded: boolean;
  /** The secret feed address, or null before one is made. */
  url: string | null;
  busy: boolean;
  error: string | null;
  /** Makes the link, or replaces it with a new one. */
  onCreate: () => void;
};

/**
 * Subscribe to the planner from Google Calendar, Apple Calendar or anything
 * that reads .ics — the same secret link the web's Settings makes, so one
 * link serves both apps.
 */
export function CalendarFeedCard({ isLoaded, url, busy, error, onCreate }: CalendarFeedCardProps) {
  const theme = useTheme();
  const [note, setNote] = useState<string | null>(null);

  const open = async (target: string) => {
    setNote(null);
    try {
      await Linking.openURL(target);
    } catch {
      setNote('Couldn’t open that here. Share the link and add it in your calendar app.');
    }
  };

  const share = async () => {
    if (!url) return;
    setNote(null);
    try {
      await Share.share({ message: url });
    } catch {
      setNote('Couldn’t open sharing. Try again.');
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Get a new link?',
      message: 'The old link stops working, so add the new one to your calendar again.',
      confirmLabel: 'Get a new link',
    });
    if (ok) onCreate();
  };

  return (
    <Card radius="xl" style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
          <CalendarSyncIcon size={18} color={theme.textBody} strokeWidth={2} />
        </View>
        <ThemedText type="labelStrong" accessibilityRole="header">
          Calendar
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textMuted">
        See your planned workouts in your calendar. Each one shows as an all-day event, and the
        calendar follows your planner as you add or move days.
      </ThemedText>

      {!isLoaded ? (
        <ActivityIndicator />
      ) : !url ? (
        <Button label="Make a calendar link" size="lg" busy={busy} onPress={onCreate} />
      ) : (
        <>
          <Button
            label="Add to Apple Calendar"
            icon={ExternalLinkIcon}
            size="lg"
            onPress={() => void open(toWebcal(url))}
          />
          <Button
            label="Add to Google Calendar"
            icon={ExternalLinkIcon}
            variant="secondary"
            size="lg"
            onPress={() => void open(googleCalendarAddUrl(url))}
          />
          <Button
            label="Share the link (Outlook and others)"
            icon={ShareIcon}
            variant="secondary"
            onPress={() => void share()}
          />
          <ThemedText type="caption" selectable numberOfLines={1}>
            {url.replace(/^https?:\/\//, '')}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Google Calendar checks for changes every few hours, so a day you just planned or moved
            can take a while to show up there.
          </ThemedText>
          <View style={[styles.reset, { borderTopColor: theme.borderSubtle }]}>
            <ThemedText type="caption" style={styles.flex}>
              Anyone with this link can see your planned workouts. If you shared it by mistake, get
              a new one.
            </ThemedText>
            <Button
              label="Get a new link"
              variant="ghost"
              size="sm"
              busy={busy}
              onPress={() => void reset()}
            />
          </View>
        </>
      )}

      {error || note ? (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error ?? note}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  reset: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  flex: {
    flex: 1,
  },
});
