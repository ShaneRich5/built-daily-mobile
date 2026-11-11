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
export { default as ActivityIcon } from 'lucide-react-native/icons/activity';
export { default as ArrowDownIcon } from 'lucide-react-native/icons/arrow-down';
export { default as ArrowDownUpIcon } from 'lucide-react-native/icons/arrow-down-up';
export { default as ArrowLeftIcon } from 'lucide-react-native/icons/arrow-left';
export { default as ArrowLeftRightIcon } from 'lucide-react-native/icons/arrow-left-right';
export { default as ArrowRightIcon } from 'lucide-react-native/icons/arrow-right';
export { default as ArrowUpIcon } from 'lucide-react-native/icons/arrow-up';
export { default as ArrowUpToLineIcon } from 'lucide-react-native/icons/arrow-up-to-line';
export { default as BanIcon } from 'lucide-react-native/icons/ban';
export { default as BookIcon } from 'lucide-react-native/icons/book';
export { default as CalendarCheckIcon } from 'lucide-react-native/icons/calendar-check';
export { default as CalendarIcon } from 'lucide-react-native/icons/calendar';
export { default as ChartLineIcon } from 'lucide-react-native/icons/chart-line';
export { default as CheckIcon } from 'lucide-react-native/icons/check';
export { default as ChevronDownIcon } from 'lucide-react-native/icons/chevron-down';
export { default as ChevronLeftIcon } from 'lucide-react-native/icons/chevron-left';
export { default as ChevronRightIcon } from 'lucide-react-native/icons/chevron-right';
export { default as CircleDashedIcon } from 'lucide-react-native/icons/circle-dashed';
export { default as CircleDotIcon } from 'lucide-react-native/icons/circle-dot';
export { default as CopyIcon } from 'lucide-react-native/icons/copy';
export { default as DumbbellIcon } from 'lucide-react-native/icons/dumbbell';
export { default as EllipsisIcon } from 'lucide-react-native/icons/ellipsis';
export { default as FlameIcon } from 'lucide-react-native/icons/flame';
export { default as GripVerticalIcon } from 'lucide-react-native/icons/grip-vertical';
export { default as HouseIcon } from 'lucide-react-native/icons/house';
export { default as InboxIcon } from 'lucide-react-native/icons/inbox';
export { default as ListChecksIcon } from 'lucide-react-native/icons/list-checks';
export { default as ListIcon } from 'lucide-react-native/icons/list';
export { default as LogOutIcon } from 'lucide-react-native/icons/log-out';
export { default as NotebookPenIcon } from 'lucide-react-native/icons/notebook-pen';
export { default as NotebookTextIcon } from 'lucide-react-native/icons/notebook-text';
export { default as PencilLineIcon } from 'lucide-react-native/icons/pencil-line';
export { default as PersonStandingIcon } from 'lucide-react-native/icons/person-standing';
export { default as PlayIcon } from 'lucide-react-native/icons/play';
export { default as PlusIcon } from 'lucide-react-native/icons/plus';
export { default as SearchIcon } from 'lucide-react-native/icons/search';
export { default as SettingsIcon } from 'lucide-react-native/icons/settings';
export { default as SlidersHorizontalIcon } from 'lucide-react-native/icons/sliders-horizontal';
export { default as Trash2Icon } from 'lucide-react-native/icons/trash-2';
export { default as XIcon } from 'lucide-react-native/icons/x';

export type { LucideIcon } from 'lucide-react-native';
