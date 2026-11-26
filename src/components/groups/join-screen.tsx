import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { failureMessage } from '@/components/groups/group-panels';
import { DayTile, PrivacyNote } from '@/components/groups/group-ui';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { MaxContentWidth } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useTheme } from '@/hooks/use-theme';
import { joinCopy } from '@/lib/groups-model';
import { joinSharedPlan } from '@/services/firestore/group-plan-repository';
import { getInvitePreview, joinGroupByCode } from '@/services/firestore/group-repository';
import type { InvitePreview } from '@/types/group';

type Loaded = { code: string; preview: InvitePreview | null };

/**
 * G6 in the app: the invite a link points at, and one button to join. With a
 * plan in the link, joining also says "I'm in" to it and opens that plan — as
 * the web's join page does.
 */
export function JoinScreen({ code, planId }: { code: string; planId: string | null }) {
  const theme = useTheme();
  const { user } = useSession();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvitePreview(code)
      .catch(() => null)
      .then((preview) => {
        if (!cancelled) setLoaded({ code, preview });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/groups'));

  if (!loaded || loaded.code !== code) {
    return (
      <SafeAreaView style={[styles.root, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const copy = joinCopy(loaded.preview, planId);

  const join = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const groupId = await joinGroupByCode(user, code);
      if (planId) {
        const joinedPlan = await joinSharedPlan(user, groupId, planId).then(
          () => true,
          () => false,
        );
        if (joinedPlan) {
          router.replace({
            pathname: '/groups/[groupId]/plans/[planId]',
            params: { groupId, planId },
          });
          return;
        }
      }
      router.replace({ pathname: '/groups/[groupId]', params: { groupId } });
    } catch (failure) {
      setError(
        failureMessage(failure, 'Couldn’t join. The link may have been reset, or it’s full.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <IconButton
          icon={ArrowLeftIcon}
          accessibilityLabel="Back"
          variant="plain"
          onPress={back}
          style={styles.back}
        />
        <ThemedText type="title" accessibilityRole="header">
          {copy.headline}
        </ThemedText>
        {copy.blurb ? (
          <ThemedText type="default" themeColor="textBody">
            {copy.blurb}
          </ThemedText>
        ) : null}

        {copy.plan ? (
          <Card style={styles.plan}>
            <DayTile weekday={copy.plan.weekday} day={copy.plan.dayOfMonth} tone="green" />
            <View style={styles.flex}>
              <ThemedText type="labelStrong" numberOfLines={1}>
                {copy.plan.label}
              </ThemedText>
              {copy.plan.meta ? <ThemedText type="caption">{copy.plan.meta}</ThemedText> : null}
              {copy.plan.going ? (
                <ThemedText type="caption" themeColor="tintText">
                  {copy.plan.going}
                </ThemedText>
              ) : null}
            </View>
          </Card>
        ) : null}

        {error ? (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {error}
          </ThemedText>
        ) : null}

        <Button label={copy.joinLabel} size="lg" busy={busy} onPress={() => void join()} />
        <PrivacyNote />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: MaxContentWidth,
    padding: 16,
    width: '100%',
  },
  back: {
    marginLeft: -10,
  },
  plan: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
});
