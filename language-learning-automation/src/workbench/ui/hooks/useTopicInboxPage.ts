import { useMemo } from 'react';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type StudioState = ReturnType<typeof useWorkbenchStudio>;

export function useTopicInboxPage(studio: StudioState) {
  return useMemo(
    () => ({
      items: studio.reviewQueue.filter((item) => item.workspace === 'topic_inbox'),
      selectedItem:
        studio.selectedQueueItem?.workspace === 'topic_inbox' ? studio.selectedQueueItem : null,
    }),
    [studio.reviewQueue, studio.selectedQueueItem]
  );
}
