import { useMemo } from 'react';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type StudioState = ReturnType<typeof useWorkbenchStudio>;

export function useScriptLabPage(studio: StudioState) {
  return useMemo(
    () => ({
      items: studio.reviewQueue.filter((item) => item.workspace === 'script_lab'),
      selectedItem:
        studio.selectedQueueItem?.workspace === 'script_lab' ? studio.selectedQueueItem : null,
    }),
    [studio.reviewQueue, studio.selectedQueueItem]
  );
}
