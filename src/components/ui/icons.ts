/**
 * The Lucide icons this app draws, the same set the web app uses.
 *
 * Imported one file at a time rather than from the package root: the root is a
 * barrel of every icon Lucide ships, and Metro does not tree-shake, so one
 * `import { Plus } from 'lucide-react-native'` would bundle all of them (and
 * make Jest transform all of them). Add an icon here when a screen needs it.
 *
 * Lucide draws with `react-native-svg`, which Expo Go includes.
 */
export { default as ArrowDownUpIcon } from 'lucide-react-native/icons/arrow-down-up';
export { default as ArrowLeftIcon } from 'lucide-react-native/icons/arrow-left';
export { default as CalendarIcon } from 'lucide-react-native/icons/calendar';
export { default as ChartLineIcon } from 'lucide-react-native/icons/chart-line';
export { default as CheckIcon } from 'lucide-react-native/icons/check';
export { default as ChevronDownIcon } from 'lucide-react-native/icons/chevron-down';
export { default as ChevronRightIcon } from 'lucide-react-native/icons/chevron-right';
export { default as DumbbellIcon } from 'lucide-react-native/icons/dumbbell';
export { default as EllipsisIcon } from 'lucide-react-native/icons/ellipsis';
export { default as HouseIcon } from 'lucide-react-native/icons/house';
export { default as ListChecksIcon } from 'lucide-react-native/icons/list-checks';
export { default as PlusIcon } from 'lucide-react-native/icons/plus';
export { default as SearchIcon } from 'lucide-react-native/icons/search';
export { default as XIcon } from 'lucide-react-native/icons/x';

export type { LucideIcon } from 'lucide-react-native';
