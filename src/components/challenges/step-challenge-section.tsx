import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LogStepsPanel } from '@/components/challenges/log-steps-panel';
import { StartChallengePanel } from '@/components/challenges/start-challenge-panel';
import { StepChallengeCard } from '@/components/challenges/step-challenge-card';
import { ThemedText } from '@/components/themed-text';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import type { StepChallengeData } from '@/hooks/use-step-challenge';
import { DEFAULT_CHALLENGE_RULE } from '@/types/challenge';

type Panel = 'start' | 'edit' | { logKey: string } | null;

/** Home's step challenge: the card, and the start / edit / log sheets behind it. */
export function StepChallengeSection({
  todayKey,
  challenge,
}: {
  todayKey: string;
  challenge: StepChallengeData;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const { view } = challenge;

  // Avoids flashing "Start a step challenge" before a running one loads.
  if (!challenge.isLoaded) return null;

  const close = () => setPanel(null);
  const logKey = panel !== null && typeof panel === 'object' ? panel.logKey : null;

  return (
    <View style={styles.section}>
      <SectionLabel>Step challenge</SectionLabel>
      <StepChallengeCard
        view={view}
        onStart={() => setPanel('start')}
        // A challenge that's over starts a fresh one; otherwise edit the running one.
        onEdit={() => setPanel(view?.state === 'ended' ? 'start' : 'edit')}
        onRepeat={challenge.repeat}
        onLogDay={(dateKey) => setPanel({ logKey: dateKey })}
      />
      {challenge.error ? (
        <ThemedText type="small" themeColor="danger">
          {challenge.error}
        </ThemedText>
      ) : null}

      <SheetHost visible={panel !== null} onClose={close} size="tall">
        {panel === 'start' || panel === 'edit' ? (
          <StartChallengePanel
            key={panel}
            mode={panel}
            todayKey={todayKey}
            initialRule={view?.rule ?? DEFAULT_CHALLENGE_RULE}
            initialPeriod={view?.period ?? 'week'}
            onSubmit={(rule, period) => {
              if (panel === 'edit') challenge.editRule(rule);
              else challenge.start(rule, period);
              close();
            }}
          />
        ) : null}

        {logKey && view ? (
          <LogStepsPanel
            period={view.period}
            days={view.days}
            day={challenge.logDay(logKey)}
            onPickDay={(dateKey) => setPanel({ logKey: dateKey })}
            onSave={(dateKey, steps) => {
              challenge.setSteps(dateKey, steps);
              close();
            }}
            onUseSynced={(dateKey) => {
              challenge.setSteps(dateKey, null);
              close();
            }}
          />
        ) : null}
      </SheetHost>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
});
