import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, MuscleChartColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { muscleActivation } from '@/lib/muscle-activation';
import { muscleLabel, type MuscleSlug } from '@/lib/muscle-map';
import type { SessionLine } from '@/types/workout';

type BodySide = 'front' | 'back';

const SIDES: readonly BodySide[] = ['front', 'back'];

/** `<Svg>` inside the library is `200 * scale` wide by `400 * scale` tall. */
const BODY_WIDTH_AT_SCALE_1 = 200;
/** The screen's own gutter plus this card's padding, both sides of each. */
const HORIZONTAL_PADDING = Spacing.three * 4;
const MIN_SCALE = 0.9;
/** Caps the height near 480pt so the chart shares a screen with the set list. */
const MAX_SCALE = 1.2;

/** How many muscles the caption names before it stops listing them. */
const CAPTION_LIMIT = 3;

/**
 * Every region the four body assets draw, muscle or not.
 *
 * The library's `defaultFill` prop cannot colour these: each asset part carries
 * its own hardcoded `color: "#3f3f3f"`, and the fill it picks prefers that over
 * `defaultFill`. Passing a part explicitly is the way through, since a `styles.fill`
 * on the data outranks both. Slugs absent from the side on screen are ignored.
 */
const BODY_REGIONS: readonly Slug[] = [
  'abs',
  'adductors',
  'ankles',
  'biceps',
  'calves',
  'chest',
  'deltoids',
  'feet',
  'forearm',
  'gluteal',
  'hair',
  'hamstring',
  'hands',
  'head',
  'knees',
  'lower-back',
  'neck',
  'obliques',
  'quadriceps',
  'tibialis',
  'trapezius',
  'triceps',
  'upper-back',
];

/**
 * A body diagram shading the muscles a workout worked, front and back.
 *
 * The anatomy lives in `@/lib/muscle-map`, which speaks the same slugs this
 * library draws — the cast-free assignment below is what keeps the two in step.
 */
export function MuscleChart({
  lines,
  gender = 'male',
}: {
  lines: readonly SessionLine[];
  gender?: 'male' | 'female';
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width } = useWindowDimensions();
  const [side, setSide] = useState<BodySide>('front');
  const [selected, setSelected] = useState<MuscleSlug | null>(null);

  const activation = useMemo(() => muscleActivation(lines), [lines]);

  const { rest, ramp } = MuscleChartColors[scheme === 'dark' ? 'dark' : 'light'];

  // Worked muscles carry an intensity for the ramp; everything else is handed
  // the resting fill, because the library will not apply one on its own.
  // `MuscleSlug` being a subset of `Slug` is what makes this cast-free.
  const data: ExtendedBodyPart[] = useMemo(() => {
    const worked = new Map(activation.map(({ slug, intensity }) => [slug as Slug, intensity]));

    return BODY_REGIONS.map((slug) => {
      const intensity = worked.get(slug);
      return intensity ? { slug, intensity } : { slug, styles: { fill: rest } };
    });
  }, [activation, rest]);

  const available = Math.min(width, MaxContentWidth) - HORIZONTAL_PADDING;
  const scale = Math.min(Math.max(available / BODY_WIDTH_AT_SCALE_1, MIN_SCALE), MAX_SCALE);

  const worked = activation.slice(0, CAPTION_LIMIT).map(({ slug }) => muscleLabel(slug));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold">Muscles worked</ThemedText>

        <View style={styles.toggle}>
          {SIDES.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: side === option }}
              onPress={() => setSide(option)}
              style={[
                styles.toggleButton,
                {
                  backgroundColor:
                    side === option ? theme.backgroundSelected : theme.backgroundElement,
                },
              ]}
            >
              <ThemedText
                type="small"
                themeColor={side === option ? 'text' : 'textSecondary'}
                style={styles.toggleLabel}
              >
                {option === 'front' ? 'Front' : 'Back'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <Body
          data={data}
          side={side}
          gender={gender}
          scale={scale}
          colors={ramp}
          border={theme.textSecondary}
          defaultFill={rest}
          // The chart is tappable everywhere, including the head and the parts
          // this workout never touched. Only a muscle actually shaded has a
          // name worth showing, so anything else puts the summary back.
          onBodyPartPress={(part) =>
            setSelected(activation.find((entry) => entry.slug === part.slug)?.slug ?? null)
          }
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {captionFor(selected, worked)}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * A tap names the muscle it landed on; otherwise the caption names the muscles
 * the workout leaned on hardest, since the shading alone does not say which is
 * which.
 */
function captionFor(selected: MuscleSlug | null, worked: readonly string[]): string {
  if (selected) return muscleLabel(selected);
  if (worked.length === 0) return 'No muscles charted for this workout.';
  return `Worked hardest: ${worked.join(', ')}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggle: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  toggleButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  toggleLabel: {
    textAlign: 'center',
  },
  body: {
    alignItems: 'center',
  },
});
