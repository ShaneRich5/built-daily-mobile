import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The bottom tab bar, drawn by the platform (UITabBar / Material bottom
 * navigation) rather than in JS, with the design's colours applied where each
 * platform lets them be.
 *
 * Icons are platform symbols — SF Symbols on iOS, Material Symbols on Android —
 * chosen to match the Lucide icons the canvas draws.
 *
 * The redesign's bar is Home / Planner / Groups / Progress. Those destinations
 * arrive one phase at a time; until each exists, the tabs that already work
 * stay, so the bar never has a dead tab. The exercise catalog has moved off the
 * bar and into Home's account menu.
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      iconColor={{ default: theme.textSecondary, selected: theme.text }}
      // Android's pill behind the selected icon.
      indicatorColor={theme.backgroundElement}
      labelStyle={{
        default: { color: theme.textSecondary, fontFamily: FontFamily.medium, fontSize: 11 },
        selected: { color: theme.text, fontFamily: FontFamily.semibold, fontSize: 11 },
      }}
      tintColor={theme.text}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="planner">
        <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="trending_up" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
