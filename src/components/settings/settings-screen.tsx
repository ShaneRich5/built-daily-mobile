import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarFeedCard } from '@/components/settings/calendar-feed-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ArrowLeftIcon, LogOutIcon } from '@/components/ui/icons';
import { MaxContentWidth } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useCalendarFeed } from '@/hooks/use-calendar-feed';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/services/auth';

/** Settings: the account, and the planner's calendar link. */
export function SettingsScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const calendar = useCalendarFeed();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <IconButton
            icon={ArrowLeftIcon}
            accessibilityLabel="Back"
            variant="plain"
            onPress={back}
            style={styles.back}
          />
        </View>
        <ThemedText type="title" accessibilityRole="header">
          Settings
        </ThemedText>

        <CalendarFeedCard
          isLoaded={calendar.isLoaded}
          url={calendar.url}
          busy={calendar.busy}
          error={calendar.error}
          onCreate={() => void calendar.create()}
        />

        <Card radius="xl" style={styles.card}>
          <ThemedText type="labelStrong" accessibilityRole="header">
            Account
          </ThemedText>
          {user?.email ? (
            <ThemedText type="small" themeColor="textMuted">
              {`Signed in as ${user.email}`}
            </ThemedText>
          ) : null}
          <Button
            label="Sign out"
            icon={LogOutIcon}
            variant="danger"
            onPress={() => void signOut()}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: MaxContentWidth,
    padding: 16,
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
  },
  back: {
    marginLeft: -10,
  },
  card: {
    gap: 12,
    padding: 16,
  },
});
