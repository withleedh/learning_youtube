import { useMemo } from 'react';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type StudioState = ReturnType<typeof useWorkbenchStudio>;

export function useDeliveryPackPage(studio: StudioState) {
  return useMemo(
    () => ({
      items: studio.reviewQueue.filter((item) => item.workspace === 'delivery_pack'),
      selectedItem:
        studio.selectedQueueItem?.workspace === 'delivery_pack' ? studio.selectedQueueItem : null,
    }),
    [studio.reviewQueue, studio.selectedQueueItem]
  );
}
