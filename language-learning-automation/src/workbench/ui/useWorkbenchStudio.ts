import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchJson, isPackageManifest, parseHash } from './helpers';
import type {
  ApiRequestLogEntry,
  PackageManifest,
  ReviewComment,
  ReviewQueueItem,
  ReviewWorkspace,
  StageReviewContext,
} from './types';
import { useWorkbenchApp } from './useWorkbenchApp';

type WorkbenchAppState = ReturnType<typeof useWorkbenchApp>;

const actionableStatusesByWorkspace: Record<ReviewWorkspace, Set<ReviewQueueItem['reviewStatus']>> = {
  topic_inbox: new Set(['pending_review']),
  script_lab: new Set(['draft', 'pending_review', 'approved']),
  production_desk: new Set(['pending_review']),
  delivery_pack: new Set(['pending_review']),
};

function filterActionableReviewQueue(items: ReviewQueueItem[]): ReviewQueueItem[] {
  return items.filter((item) => actionableStatusesByWorkspace[item.workspace].has(item.reviewStatus));
}

export function useWorkbenchStudio(app: WorkbenchAppState) {
  const [workspace, setWorkspace] = useState<ReviewWorkspace>('topic_inbox');
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [reviewContext, setReviewContext] = useState<StageReviewContext | null>(null);
  const [queueLoadError, setQueueLoadError] = useState('');
  const [isStudioBusy, setIsStudioBusy] = useState(false);
  const [developerDrawerOpen, setDeveloperDrawerOpen] = useState(false);
  const [apiLogs, setApiLogs] = useState<ApiRequestLogEntry[]>([]);
  const [apiLogsError, setApiLogsError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [renderTimestampMs, setRenderTimestampMs] = useState('42000');
  const [packageDraft, setPackageDraft] = useState<PackageManifest | null>(null);
  const lastSyncedSelectionKeyRef = useRef<string | null>(null);
  const reviewContextRequestIdRef = useRef(0);
  const selectedQueueItem = useMemo(() => {
    if (!app.selectedRecordKey) {
      return null;
    }

    return (
      reviewQueue.find(
        (item) =>
          item.id === app.selectedRecordKey &&
          (app.selectedStage ? item.stage === app.selectedStage : true)
      ) ??
      reviewQueue.find((item) => item.id === app.selectedRecordKey) ??
      null
    );
  }, [app.selectedRecordKey, app.selectedStage, reviewQueue]);

  const currentWorkspaceItems = useMemo(
    () => reviewQueue.filter((item) => item.workspace === workspace),
    [reviewQueue, workspace]
  );
  const workspaceCounts = useMemo(
    () =>
      reviewQueue.reduce<Record<ReviewWorkspace, number>>(
        (counts, item) => {
          counts[item.workspace] += 1;
          return counts;
        },
        {
          topic_inbox: 0,
          script_lab: 0,
          production_desk: 0,
          delivery_pack: 0,
        }
      ),
    [reviewQueue]
  );

  const loadReviewQueue = useCallback(async (): Promise<void> => {
    try {
      const channelQuery = app.activeChannelId
        ? `?channelId=${encodeURIComponent(app.activeChannelId)}`
        : '';
      const response = await fetchJson<{ items: ReviewQueueItem[] }>(
        `/api/workbench/review-queue${channelQuery}`
      );
      const filteredItems = filterActionableReviewQueue(response.items ?? []).filter(
        (item) => !app.activeChannelId || item.channelId === app.activeChannelId
      );
      setReviewQueue(filteredItems);
      setQueueLoadError('');
    } catch (error) {
      setReviewQueue([]);
      setQueueLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [app.activeChannelId]);

  const loadApiLogs = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchJson<{ entries: ApiRequestLogEntry[] }>(
        '/api/workbench/logs/api?limit=50'
      );
      setApiLogs(response.entries ?? []);
      setApiLogsError('');
    } catch (error) {
      setApiLogs([]);
      setApiLogsError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const loadReviewContext = useCallback(async (
    recordKey: string,
    stage: NonNullable<WorkbenchAppState['selectedStage']>
  ) => {
    const [channelId, recordId] = recordKey.split('/');
    const requestId = ++reviewContextRequestIdRef.current;
    setReviewContext(null);
    try {
      const response = await fetchJson<{ context: StageReviewContext }>(
        `/api/workbench/episodes/${channelId}/${recordId}/stages/${stage}/review-context`
      );
      if (reviewContextRequestIdRef.current !== requestId) {
        return;
      }
      setReviewContext(response.context);
    } catch {
      if (reviewContextRequestIdRef.current !== requestId) {
        return;
      }
      setReviewContext(null);
    }
  }, []);

  useEffect(() => {
    void loadReviewQueue();
  }, [app.activeChannelId, app.candidates, app.episodes, loadReviewQueue]);

  useEffect(() => {
    if (!app.selectedRecordKey || !app.selectedStage) {
      reviewContextRequestIdRef.current += 1;
      setReviewContext(null);
      setPackageDraft(null);
      return;
    }

    void loadReviewContext(app.selectedRecordKey, app.selectedStage);
  }, [app.selectedRecordKey, app.selectedStage, app.workflow?.episode.updatedAt, loadReviewContext]);

  useEffect(() => {
    if (!selectedQueueItem) {
      return;
    }

    const nextSelectionKey = `${selectedQueueItem.id}:${selectedQueueItem.stage}`;
    if (lastSyncedSelectionKeyRef.current === nextSelectionKey) {
      return;
    }

    lastSyncedSelectionKeyRef.current = nextSelectionKey;
    setWorkspace(selectedQueueItem.workspace);
  }, [selectedQueueItem]);

  useEffect(() => {
    if (reviewContext && isPackageManifest(reviewContext.currentArtifact)) {
      setPackageDraft(reviewContext.currentArtifact);
      return;
    }

    setPackageDraft(null);
  }, [reviewContext]);

  useEffect(() => {
    if (!developerDrawerOpen) {
      return;
    }

    void loadApiLogs();
  }, [developerDrawerOpen, loadApiLogs]);

  const selectQueueItem = useCallback(
    async (item: ReviewQueueItem): Promise<void> => {
      reviewContextRequestIdRef.current += 1;
      setReviewContext(null);
      setPackageDraft(null);
      setWorkspace(item.workspace);
      await app.handleSelectRecord(item.channelId, item.recordId);
      app.handleSelectStage(item.stage);
    },
    [app]
  );

  const selectRelativeQueueItem = useCallback(
    async (offset: number): Promise<void> => {
      if (currentWorkspaceItems.length === 0) {
        return;
      }

      const index = selectedQueueItem
        ? currentWorkspaceItems.findIndex((item) => item.id === selectedQueueItem.id)
        : 0;
      const nextIndex =
        index < 0
          ? 0
          : (index + offset + currentWorkspaceItems.length) % currentWorkspaceItems.length;
      const nextItem = currentWorkspaceItems[nextIndex];
      if (nextItem) {
        await selectQueueItem(nextItem);
      }
    },
    [currentWorkspaceItems, selectedQueueItem, selectQueueItem]
  );

  useEffect(() => {
    if (reviewQueue.length === 0 || selectedQueueItem || app.selectedRecordKey) {
      return;
    }

    const hashSelection = parseHash();
    if (!app.selectedRecordKey && hashSelection) {
      const hashRecordKey = `${hashSelection.channelId}/${hashSelection.episodeId}`;
      const hashItem =
        reviewQueue.find(
          (item) => item.id === hashRecordKey && (!hashSelection.stage || item.stage === hashSelection.stage)
        ) ?? reviewQueue.find((item) => item.id === hashRecordKey);
      if (hashItem) {
        setWorkspace(hashItem.workspace);
      }
      return;
    }

    const preferredItem =
      (app.selectedRecordKey
        ? reviewQueue.find(
            (item) =>
              item.id === app.selectedRecordKey &&
              (app.selectedStage ? item.stage === app.selectedStage : true)
          ) ??
          reviewQueue.find((item) => item.id === app.selectedRecordKey)
        : null) ??
      reviewQueue.find((item) => item.workspace === workspace) ??
      reviewQueue[0];

    if (!preferredItem) {
      return;
    }

    const preferredRecordKey = `${preferredItem.channelId}/${preferredItem.recordId}`;
    const preferredSelectionKey = `${preferredItem.id}:${preferredItem.stage}`;

    if (app.selectedRecordKey === preferredRecordKey && app.selectedStage === preferredItem.stage) {
      lastSyncedSelectionKeyRef.current = preferredSelectionKey;
      setWorkspace(preferredItem.workspace);
      return;
    }

    void selectQueueItem(preferredItem);
  }, [app.selectedRecordKey, app.selectedStage, reviewQueue, selectedQueueItem, workspace, selectQueueItem]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'j' || event.key === 'J') {
        event.preventDefault();
        void selectRelativeQueueItem(1);
        return;
      }

      if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        void selectRelativeQueueItem(-1);
        return;
      }

      if (event.key === ' ') {
        const media = document.querySelector<HTMLMediaElement>('video, audio');
        if (media) {
          event.preventDefault();
          if (media.paused) {
            void media.play();
          } else {
            media.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [app, selectRelativeQueueItem]);

  async function refreshStudio(): Promise<void> {
    await app.handleRefreshClick();
    await loadReviewQueue();
    if (developerDrawerOpen) {
      await loadApiLogs();
    }
    if (app.selectedRecordKey && app.selectedStage) {
      await loadReviewContext(app.selectedRecordKey, app.selectedStage);
    }
  }

  async function handleApproveAndNext(): Promise<void> {
    if (!selectedQueueItem) {
      return;
    }

    setIsStudioBusy(true);
    try {
      if (selectedQueueItem.workspace === 'topic_inbox') {
        if (reviewContext?.stageSummary.reviewStatus === 'pending_review') {
          await app.handleApproveStage();
        }
        await app.handleSpawnScriptCandidates();
        setWorkspace('script_lab');
      } else if (selectedQueueItem.workspace === 'script_lab') {
        if (reviewContext?.stageSummary.reviewStatus === 'pending_review') {
          await app.handleApproveStage();
        }
        await app.handlePromoteCandidate();
        setWorkspace('production_desk');
      } else {
        await app.handleApproveStage({ followCurrentStage: true });
      }
      await refreshStudio();
    } finally {
      setIsStudioBusy(false);
    }
  }

  async function addStageComment(kind: ReviewComment['kind'] = 'issue'): Promise<void> {
    if (!commentText.trim() || !app.selectedRecordKey || !app.selectedStage) {
      return;
    }

    const [channelId, recordId] = app.selectedRecordKey.split('/');
    setIsStudioBusy(true);
    try {
      await fetchJson(`/api/workbench/records/${channelId}/${recordId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          stage: app.selectedStage,
          version: reviewContext?.stageSummary.currentVersion,
          kind,
          text: commentText.trim(),
          ...(app.selectedStage === 'render'
            ? {
                anchor: {
                  kind: 'timestamp',
                  timestampMs: Number(renderTimestampMs || 0),
                  label: `Issue @ ${renderTimestampMs}ms`,
                },
              }
            : {}),
        }),
      });
      setCommentText('');
      await refreshStudio();
    } finally {
      setIsStudioBusy(false);
    }
  }

  function updatePackageField<K extends keyof PackageManifest>(key: K, value: PackageManifest[K]): void {
    setPackageDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function savePackageDraft(): Promise<void> {
    if (!packageDraft || !app.selectedRecordKey || app.selectedStage !== 'package') {
      return;
    }

    const [channelId, recordId] = app.selectedRecordKey.split('/');
    setIsStudioBusy(true);
    try {
      await fetchJson(`/api/workbench/episodes/${channelId}/${recordId}/stages/package/current-artifact`, {
        method: 'PUT',
        body: JSON.stringify(packageDraft),
      });
      await refreshStudio();
    } finally {
      setIsStudioBusy(false);
    }
  }

  return {
    workspace,
    setWorkspace,
    reviewQueue,
    reviewContext,
    queueLoadError,
    selectedQueueItem,
    currentWorkspaceItems,
    workspaceCounts,
    developerDrawerOpen,
    setDeveloperDrawerOpen,
    apiLogs,
    apiLogsError,
    refreshApiLogs: loadApiLogs,
    commentText,
    setCommentText,
    renderTimestampMs,
    setRenderTimestampMs,
    packageDraft,
    updatePackageField,
    savePackageDraft,
    addStageComment,
    isStudioBusy,
    refreshStudio,
    selectQueueItem,
    handleApproveAndNext,
  };
}
