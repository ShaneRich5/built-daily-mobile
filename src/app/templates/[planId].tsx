import { useLocalSearchParams } from 'expo-router';

import { TemplateEditorScreen } from '@/components/templates/template-editor-screen';

/** A template to edit, or `/templates/new` to make one. */
export default function TemplateRoute() {
  const { planId } = useLocalSearchParams<{ planId: string }>();

  return <TemplateEditorScreen planId={planId ?? 'new'} />;
}
