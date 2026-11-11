import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CalendarIcon, ChartLineIcon, HouseIcon, type LucideIcon } from '@/components/ui/icons';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The tab bar on web, where there is no native one to hand off to. Drawn the
 * way the canvas draws it: a white bar with a top hairline, a Lucide icon over
 * an 11px label, the current tab in the text colour and the rest in grey.
 *
 * Keep the triggers in step with `app-tabs.tsx`, the native version.
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList
        style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton icon={HouseIcon}>Home</TabButton>
        </TabTrigger>
        <TabTrigger name="planner" href="/planner" asChild>
          <TabButton icon={CalendarIcon}>Planner</TabButton>
        </TabTrigger>
        <TabTrigger name="progress" href="/progress" asChild>
          <TabButton icon={ChartLineIcon}>Progress</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  icon: Icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: LucideIcon }) {
  const theme = useTheme();
  const color = isFocused ? theme.text : theme.textSecondary;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Icon size={22} color={color} strokeWidth={2} />
      <ThemedText
        style={[
          styles.label,
          { color, fontFamily: isFocused ? FontFamily.semibold : FontFamily.medium },
        ]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bar: {
    alignSelf: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    maxWidth: MaxContentWidth,
    paddingBottom: 18,
    paddingHorizontal: 8,
    paddingTop: 6,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
