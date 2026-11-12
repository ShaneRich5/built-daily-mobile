import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { EllipsisIcon, type LucideIcon, PlusIcon } from '@/components/ui/icons';
import { useTheme } from '@/hooks/use-theme';

type SessionActionBarProps = {
  /** The one thing this screen is for: "Finish workout", "Save changes", "Edit workout". */
  primaryLabel: string;
  primaryIcon?: LucideIcon;
  /** Emerald for moving a workout forward; dark for stepping into an edit. */
  primaryVariant?: 'primary' | 'dark';
  onPrimary: () => void;
  primaryBusy?: boolean;
  primaryDisabled?: boolean;
  onMore: () => void;
  /** Omitted where there is nothing to add to (the read view). */
  onAdd?: () => void;
  addDisabled?: boolean;
};

/** Pinned to the bottom of a workout screen: more, add, and the main action. */
export function SessionActionBar({
  primaryLabel,
  primaryIcon,
  primaryVariant = 'primary',
  onPrimary,
  primaryBusy = false,
  primaryDisabled = false,
  onMore,
  onAdd,
  addDisabled = false,
}: SessionActionBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
      <IconButton icon={EllipsisIcon} accessibilityLabel="More actions" onPress={onMore} />
      {onAdd ? (
        <IconButton
          icon={PlusIcon}
          accessibilityLabel="Add exercise"
          onPress={onAdd}
          disabled={addDisabled}
        />
      ) : null}
      <Button
        label={primaryLabel}
        icon={primaryIcon}
        variant={primaryVariant}
        onPress={onPrimary}
        busy={primaryBusy}
        disabled={primaryDisabled}
        style={styles.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  primary: {
    flex: 1,
  },
});
