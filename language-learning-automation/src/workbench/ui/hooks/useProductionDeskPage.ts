import { useMemo } from 'react';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type StudioState = ReturnType<typeof useWorkbenchStudio>;

export function useProductionDeskPage(studio: StudioState) {
  return useMemo(
    () => ({
      items: studio.reviewQueue.filter((item) => item.workspace === 'production_desk'),
      selectedItem:
        studio.selectedQueueItem?.workspace === 'production_desk' ? studio.selectedQueueItem : null,
    }),
    [studio.reviewQueue, studio.selectedQueueItem]
  );
}
