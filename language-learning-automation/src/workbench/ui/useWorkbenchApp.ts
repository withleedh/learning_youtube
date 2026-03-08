import type { DragEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  applySceneRangesForInsertion,
  applySceneRangesForRemoval,
  canRegenerateCurrentVersion,
  createDraftSentence,
  defaultPayloads,
  emptyImpact,
  fetchJson,
  formatIdList,
  getEditableScriptFromArtifact,
  getDropPosition,
  getParsedScriptDraft,
  getScriptImpactSummary,
  isScriptArtifact,
  isScriptPoolArtifact,
  isTopicCandidatesArtifact,
  normalizeScriptDraftStructure,
  parseHash,
  setHash,
  setValueAtPath,
  stageLabels,
  transformScriptFieldValue,
  tryFetchJson,
} from './helpers';
import type {
  ChannelOption,
  EpisodeStage,
  EpisodeSummary,
  EpisodeWorkflow,
  HighlightState,
  ScriptArtifact,
  StageWorkflowSummary,
  StageVersionRecord,
  WorkbenchLiveStatus,
} from './types';

type DragPosition = 'before' | 'after' | null;
type LoadCollectionsOptions = {
  preserveLocalScriptDraft?: boolean;
};

const POLL_INTERVAL_MS = 2500;

export function useWorkbenchApp() {
  const [availableChannels, setAvailableChannels] = useState<ChannelOption[]>([]);
  const [activeChannelId, setActiveChannelId] = useState('');
  const [topicBatchCount, setTopicBatchCount] = useState(20);
  const [topicBatchCategory, setTopicBatchCategory] = useState('');
  const [scriptBatchCount, setScriptBatchCount] = useState(5);
  const [scriptBatchCategory, setScriptBatchCategory] = useState('');
  const [scriptBatchUsePipeline, setScriptBatchUsePipeline] = useState(true);
  const [candidates, setCandidates] = useState<EpisodeSummary[]>([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateChannelFilter, setCandidateChannelFilter] = useState('');
  const [candidateStageFilter, setCandidateStageFilter] = useState<'all' | 'topic' | 'script'>(
    'all'
  );
  const [candidateReviewFilter, setCandidateReviewFilter] = useState<
    'all' | 'draft' | 'pending_review' | 'approved' | 'completed'
  >('all');
  const [candidateSortMode, setCandidateSortMode] = useState<
    'review_ready' | 'updated_desc' | 'title_asc' | 'stage'
  >('review_ready');
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<string[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [workflow, setWorkflow] = useState<EpisodeWorkflow | null>(null);
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<EpisodeStage | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<unknown>(null);
  const [approvedArtifact, setApprovedArtifact] = useState<unknown>(null);
  const [stageVersions, setStageVersions] = useState<StageVersionRecord[]>([]);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [selectedVersionArtifact, setSelectedVersionArtifact] = useState<unknown>(null);
  const [selectedVersionArtifactError, setSelectedVersionArtifactError] = useState('');
  const [artifactError, setArtifactError] = useState('');
  const [notice, setNotice] = useState('');
  const [payloads, setPayloads] = useState<Record<EpisodeStage, string>>(defaultPayloads);
  const [topicApprovalText, setTopicApprovalText] = useState('');
  const [scriptDraftText, setScriptDraftText] = useState('');
  const [scriptDraftServerText, setScriptDraftServerText] = useState('');
  const [scriptEditorMode, setScriptEditorMode] = useState<'cards' | 'json'>('cards');
  const [hasScriptDraftRemoteUpdate, setHasScriptDraftRemoteUpdate] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [liveStatus, setLiveStatus] = useState<WorkbenchLiveStatus | null>(null);
  const [lastLiveSyncAt, setLastLiveSyncAt] = useState<string | null>(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  );
  const [draggingSentenceIndex, setDraggingSentenceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DragPosition>(null);
  const [highlightState, setHighlightState] = useState<HighlightState | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const loadChannelsRef = useRef<() => Promise<string>>(async () => '');
  const loadCollectionsRef = useRef<
    (
      respectHash?: boolean,
      options?: LoadCollectionsOptions,
      channelIdOverride?: string
    ) => Promise<void>
  >(async () => {});
  const loadLiveStatusRef = useRef<(showErrors?: boolean) => Promise<WorkbenchLiveStatus | null>>(
    async () => null
  );
  const pollLiveDataRef = useRef<() => Promise<void>>(async () => {});
  const isPollingRef = useRef(false);
  const selectedRecordKeyRef = useRef<string | null>(null);
  const selectedStageRef = useRef<EpisodeStage | null>(null);
  const scriptDraftDirtyRef = useRef(false);
  const scriptDraftServerTextRef = useRef('');
  const liveStatusRef = useRef<WorkbenchLiveStatus | null>(null);
  const activeChannelIdRef = useRef('');

  const selectedStageInfo = workflow?.stages.find((stage) => stage.stage === selectedStage) ?? null;
  const selectedChannel = availableChannels.find((channel) => channel.id === activeChannelId) ?? null;
  const parsedScriptDraft = getParsedScriptDraft(scriptDraftText);
  const currentScriptPoolArtifact = isScriptPoolArtifact(currentArtifact) ? currentArtifact : null;
  const approvedScriptArtifact = isScriptArtifact(approvedArtifact) ? approvedArtifact : null;
  const isScriptDraftDirty =
    selectedStage === 'script' &&
    scriptDraftText.trim().length > 0 &&
    scriptDraftText !== scriptDraftServerText;
  const scriptImpact =
    selectedStage === 'script'
      ? getScriptImpactSummary(parsedScriptDraft, approvedScriptArtifact)
      : emptyImpact;
  const filteredCandidates = candidates
    .filter((candidate) => {
      const title = (candidate.previewText || candidate.title || candidate.id).toLowerCase();
      const query = candidateSearchQuery.trim().toLowerCase();
      if (query && !title.includes(query) && !candidate.channelId.toLowerCase().includes(query)) {
        return false;
      }

      if (activeChannelId && candidate.channelId !== activeChannelId) {
        return false;
      }

      if (candidateChannelFilter && candidate.channelId !== candidateChannelFilter) {
        return false;
      }

      return true;
    })
    .sort((left, right) => compareCandidates(left, right, candidateSortMode));
  const bulkEligibleFilteredCandidates = filteredCandidates.filter(isBulkReviewableCandidate);
  const areAllFilteredCandidatesSelected =
    bulkEligibleFilteredCandidates.length > 0 &&
    bulkEligibleFilteredCandidates.every((candidate) =>
      selectedCandidateKeys.includes(getRecordKey(candidate))
    );
  selectedRecordKeyRef.current = selectedRecordKey;
  selectedStageRef.current = selectedStage;
  scriptDraftDirtyRef.current = isScriptDraftDirty;
  scriptDraftServerTextRef.current = scriptDraftServerText;
  liveStatusRef.current = liveStatus;
  activeChannelIdRef.current = activeChannelId;
  loadChannelsRef.current = loadChannels;
  loadCollectionsRef.current = loadCollections;
  loadLiveStatusRef.current = loadLiveStatus;
  pollLiveDataRef.current = pollLiveData;

  useEffect(() => {
    void (async () => {
      try {
        const initialChannelId = await loadChannelsRef.current();
        await loadCollectionsRef.current(true, {}, initialChannelId);
      } catch (error) {
        showNotice(error instanceof Error ? error.message : String(error));
      }
    })();
    void loadLiveStatusRef.current(false).catch(() => {});

    const onHashChange = () => {
      void loadCollectionsRef.current(true).catch((error) => {
        showNotice(error instanceof Error ? error.message : String(error));
      });
    };
    const onVisibilityChange = () => {
      const nextVisible = document.visibilityState !== 'hidden';
      setIsDocumentVisible(nextVisible);
      if (nextVisible) {
        void pollLiveDataRef.current();
      }
    };

    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void pollLiveDataRef.current();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function loadChannels(): Promise<string> {
    try {
      const response = await fetchJson<{ channels: ChannelOption[] }>('/api/workbench/channels');
      const nextChannels = response.channels ?? [];
      const hashSelection = parseHash();
      const nextActiveChannelId =
        (activeChannelIdRef.current &&
        nextChannels.some((channel) => channel.id === activeChannelIdRef.current)
          ? activeChannelIdRef.current
          : '') ||
        (hashSelection?.channelId &&
        nextChannels.some((channel) => channel.id === hashSelection.channelId)
          ? hashSelection.channelId
          : '') ||
        nextChannels[0]?.id ||
        '';

      setAvailableChannels(nextChannels);
      setActiveChannelId(nextActiveChannelId);
      setCandidateChannelFilter(nextActiveChannelId);
      activeChannelIdRef.current = nextActiveChannelId;
      return nextActiveChannelId;
    } catch (error) {
      setAvailableChannels([]);
      setActiveChannelId('');
      setCandidateChannelFilter('');
      activeChannelIdRef.current = '';
      showNotice(error instanceof Error ? error.message : String(error));
      return '';
    }
  }

  async function loadLiveStatus(showErrors = true): Promise<WorkbenchLiveStatus | null> {
    try {
      const response = await fetchJson<{ status: WorkbenchLiveStatus }>('/api/workbench/live-status');
      setLiveStatus(response.status);
      return response.status;
    } catch (error) {
      if (showErrors) {
        showNotice(error instanceof Error ? error.message : String(error));
      }
      return null;
    }
  }

  async function pollLiveData(): Promise<void> {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    if (isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    try {
      const previousStatus = liveStatusRef.current;
      const nextStatus = await loadLiveStatus(false);
      if (!nextStatus) {
        return;
      }

      const hadActiveJobs = (previousStatus?.activeJobCount ?? 0) > 0;
      const hasActiveJobs = nextStatus.activeJobCount > 0;
      const didStatusChange =
        nextStatus.lastUpdatedAt !== previousStatus?.lastUpdatedAt ||
        nextStatus.activeJobCount !== previousStatus?.activeJobCount ||
        nextStatus.runningJobs !== previousStatus?.runningJobs ||
        nextStatus.queuedJobs !== previousStatus?.queuedJobs;

      if (!hasActiveJobs && !hadActiveJobs && !didStatusChange) {
        return;
      }

      await loadCollectionsRef.current(true, { preserveLocalScriptDraft: true });
      setLastLiveSyncAt(new Date().toISOString());
    } catch {
      // Polling is best-effort. Manual actions still surface errors explicitly.
    } finally {
      isPollingRef.current = false;
    }
  }

  async function loadCollections(
    respectHash = false,
    options: LoadCollectionsOptions = {},
    channelIdOverride = activeChannelIdRef.current
  ): Promise<void> {
    const channelQuery = channelIdOverride ? `?channelId=${encodeURIComponent(channelIdOverride)}` : '';
    const [candidatesResponse, episodesResponse] = await Promise.all([
      fetchJson<{ candidates: EpisodeSummary[] }>(`/api/workbench/candidates${channelQuery}`),
      fetchJson<{ episodes: EpisodeSummary[] }>(`/api/workbench/episodes${channelQuery}`),
    ]);
    const nextCandidates = (candidatesResponse.candidates ?? []).filter(
      (candidate) => !channelIdOverride || candidate.channelId === channelIdOverride
    );
    const nextEpisodes = (episodesResponse.episodes ?? []).filter(
      (episode) => !channelIdOverride || episode.channelId === channelIdOverride
    );
    setCandidates(nextCandidates);
    setSelectedCandidateKeys((current) =>
      current.filter((key) => nextCandidates.some((candidate) => getRecordKey(candidate) === key))
    );
    setEpisodes(nextEpisodes);
    await syncSelectionFromHash(nextCandidates, nextEpisodes, respectHash, options, channelIdOverride);
  }

  async function syncSelectionFromHash(
    nextCandidates: EpisodeSummary[],
    nextEpisodes: EpisodeSummary[],
    respectHash: boolean,
    options: LoadCollectionsOptions = {},
    channelIdOverride = activeChannelIdRef.current
  ): Promise<void> {
    const nextRecords = [...nextCandidates, ...nextEpisodes];
    if (nextRecords.length === 0) {
      resetSelectionState();
      return;
    }

    const hashSelection = parseHash();
    const currentSelection = selectedRecordKeyRef.current
      ? nextRecords.find(
          (record) => `${record.channelId}/${record.id}` === selectedRecordKeyRef.current
        ) ?? null
      : null;
    const hashSelectionKey = hashSelection
      ? `${hashSelection.channelId}/${hashSelection.episodeId}`
      : null;
    const shouldHonorHashSelection =
      respectHash &&
      hashSelection &&
      (!channelIdOverride || hashSelection.channelId === channelIdOverride) &&
      hashSelectionKey !== selectedRecordKeyRef.current;

    if (currentSelection && !shouldHonorHashSelection) {
      const selectedStageStillValid =
        !selectedStageRef.current ||
        workflow?.stages.some((stage) => stage.stage === selectedStageRef.current);
      const needsSelectedRecordRefresh =
        workflow?.episode.id !== currentSelection.id ||
        workflow?.episode.updatedAt !== currentSelection.updatedAt ||
        !selectedStageStillValid;

      if (needsSelectedRecordRefresh) {
        await selectRecord(
          currentSelection.channelId,
          currentSelection.id,
          selectedStageRef.current,
          options
        );
      }
      return;
    }

    const fallbackRecord = nextCandidates[0] ?? nextEpisodes[0];
    const selection =
      shouldHonorHashSelection
        ? nextRecords.find(
            (record) =>
              record.channelId === hashSelection.channelId &&
              record.id === hashSelection.episodeId
          ) ?? null
        : null;
    const record = selection ?? fallbackRecord;
    const preferredStage =
      respectHash && hashSelection?.stage && stageLabels[hashSelection.stage]
        ? hashSelection.stage
        : null;

    if (!record) {
      return;
    }

    await selectRecord(record.channelId, record.id, preferredStage, options);
  }

  async function selectRecord(
    channelId: string,
    episodeId: string,
    preferredStage: EpisodeStage | null = null,
    options: LoadCollectionsOptions = {}
  ): Promise<void> {
    const nextRecordKey = `${channelId}/${episodeId}`;
    const isChangingRecord = selectedRecordKeyRef.current !== nextRecordKey;
    if (isChangingRecord) {
      setCurrentArtifact(null);
      setApprovedArtifact(null);
      setArtifactError('');
      setTopicApprovalText('');
      setScriptDraftText('');
      setScriptDraftServerText('');
      setHasScriptDraftRemoteUpdate(false);
      setStageVersions([]);
      setSelectedVersionNumber(null);
      setSelectedVersionArtifact(null);
      setSelectedVersionArtifactError('');
    }

    const nextWorkflow = await fetchJson<EpisodeWorkflow>(
      `/api/workbench/episodes/${channelId}/${episodeId}/workflow`
    );
    const nextSelectedStage =
      preferredStage && nextWorkflow.stages.some((stage) => stage.stage === preferredStage)
        ? preferredStage
        : nextWorkflow.episode.currentStage;
    const isSameSelection =
      selectedRecordKeyRef.current === nextRecordKey && selectedStageRef.current === nextSelectedStage;

    if (!isSameSelection || nextSelectedStage !== 'topic') {
      setTopicApprovalText('');
    }

    setSelectedRecordKey(nextRecordKey);
    setWorkflow(nextWorkflow);
    setSelectedStage(nextSelectedStage);
    setHash(channelId, episodeId, nextSelectedStage);
    await loadStageArtifacts(
      channelId,
      episodeId,
      nextSelectedStage,
      nextWorkflow.stages.find((stage) => stage.stage === nextSelectedStage) ?? null,
      options
    );
  }

  async function loadStageArtifacts(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage,
    stageSummary: StageWorkflowSummary | null = null,
    options: LoadCollectionsOptions = {}
  ): Promise<void> {
    setArtifactError('');

    try {
      const shouldFetchCurrentArtifact = (stageSummary?.currentVersion ?? 1) > 0;
      const shouldFetchApprovedArtifact = stageSummary?.approvedVersion != null;
      const [currentArtifactResponse, approvedArtifactResponse] = await Promise.all([
        shouldFetchCurrentArtifact
          ? tryFetchJson<{ artifact: unknown }>(
              `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stage}/current-artifact`
            )
          : Promise.resolve(null),
        shouldFetchApprovedArtifact
          ? tryFetchJson<{ artifact: unknown }>(
              `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stage}/approved-artifact`
            )
          : Promise.resolve(null),
      ]);

      const nextCurrentArtifact = currentArtifactResponse?.artifact ?? null;
      const nextApprovedArtifact = approvedArtifactResponse?.artifact ?? null;
      setCurrentArtifact(nextCurrentArtifact);
      setApprovedArtifact(nextApprovedArtifact);
      await loadStageVersions(channelId, episodeId, stage);

      const nextEditableScript =
        stage === 'script' ? getEditableScriptFromArtifact(nextCurrentArtifact) : null;

      if (stage === 'script' && nextEditableScript) {
        const nextServerDraftText = JSON.stringify(nextEditableScript, null, 2);
        const isSameSelectedRecord =
          selectedRecordKeyRef.current === `${channelId}/${episodeId}` &&
          selectedStageRef.current === 'script';
        const shouldPreserveLocalDraft =
          options.preserveLocalScriptDraft && isSameSelectedRecord && scriptDraftDirtyRef.current;

        setScriptDraftServerText(nextServerDraftText);
        if (shouldPreserveLocalDraft) {
          setHasScriptDraftRemoteUpdate(nextServerDraftText !== scriptDraftServerTextRef.current);
        } else {
          setScriptDraftText(nextServerDraftText);
          setHasScriptDraftRemoteUpdate(false);
        }
      }
    } catch (error) {
      setCurrentArtifact(null);
      setApprovedArtifact(null);
      if (stage === 'script') {
        setScriptDraftServerText('');
        setHasScriptDraftRemoteUpdate(false);
      }
      setStageVersions([]);
      setSelectedVersionNumber(null);
      setSelectedVersionArtifact(null);
      setSelectedVersionArtifactError('');
      setArtifactError(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadStageVersions(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<void> {
    const response = await tryFetchJson<{ versions: StageVersionRecord[] }>(
      `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stage}/versions`
    );
    const versions = response?.versions ?? [];
    setStageVersions(versions);

    if (versions.length === 0) {
      setSelectedVersionNumber(null);
      setSelectedVersionArtifact(null);
      setSelectedVersionArtifactError('');
      return;
    }

    await loadSelectedStageVersionArtifact(channelId, episodeId, stage, versions[0].version);
  }

  async function loadSelectedStageVersionArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage,
    version: number
  ): Promise<void> {
    setSelectedVersionNumber(version);
    setSelectedVersionArtifactError('');

    try {
      const response = await fetchJson<{ artifact: unknown }>(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stage}/versions/${version}/artifact`
      );
      setSelectedVersionArtifact(response.artifact ?? null);
    } catch (error) {
      setSelectedVersionArtifact(null);
      setSelectedVersionArtifactError(error instanceof Error ? error.message : String(error));
    }
  }

  async function refreshSelectedRecord(options?: {
    reloadCollections?: boolean;
    preserveLocalScriptDraft?: boolean;
  }): Promise<void> {
    if (!selectedRecordKey) {
      await loadCollections(true, { preserveLocalScriptDraft: options?.preserveLocalScriptDraft });
      return;
    }

    if (options?.reloadCollections) {
      await loadCollections(true, { preserveLocalScriptDraft: options.preserveLocalScriptDraft });
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await selectRecord(channelId, episodeId, selectedStage, {
      preserveLocalScriptDraft: options?.preserveLocalScriptDraft,
    });
  }

  function resetSelectionState(clearCollections = false): void {
    if (clearCollections) {
      setCandidates([]);
      setEpisodes([]);
    }
    setWorkflow(null);
    setSelectedRecordKey(null);
    setSelectedStage(null);
    setCurrentArtifact(null);
    setApprovedArtifact(null);
    setArtifactError('');
    setTopicApprovalText('');
    setScriptDraftText('');
    setScriptDraftServerText('');
    setHasScriptDraftRemoteUpdate(false);
    setStageVersions([]);
    setSelectedVersionNumber(null);
    setSelectedVersionArtifact(null);
    setSelectedVersionArtifactError('');
  }

  function showNotice(message: string): void {
    setNotice(message);

    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
    }

    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice('');
      noticeTimeoutRef.current = null;
    }, 4200);
  }

  async function withBusy(task: () => Promise<void>): Promise<void> {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateTopicCandidateBatch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!activeChannelId) {
      showNotice('먼저 채널을 선택하세요.');
      return;
    }

    await withBusy(async () => {
      const response = await fetchJson<{ candidates: EpisodeSummary[] }>(
        '/api/workbench/candidates/topic-batch',
        {
          method: 'POST',
          body: JSON.stringify({
            channelId: activeChannelId,
            count: topicBatchCount,
            category: topicBatchCategory || undefined,
          }),
        }
      );

      const firstCandidate = response.candidates[0] ?? null;
      showNotice(`Queued generation for ${Math.max(1, Math.min(200, topicBatchCount))} topics.`);
      await loadCollections(false);
      await loadLiveStatus(false);
      if (firstCandidate) {
        await selectRecord(firstCandidate.channelId, firstCandidate.id);
      }
    });
  }

  async function handleGenerateStage(): Promise<void> {
    if (!selectedStage || !selectedRecordKey) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    const payloadText = payloads[selectedStage] ?? '{}';
    let payload: Record<string, unknown> = {};

    try {
      payload = payloadText.trim() ? (JSON.parse(payloadText) as Record<string, unknown>) : {};
    } catch {
      showNotice('Generation payload must be valid JSON.');
      return;
    }

    await withBusy(async () => {
      await fetchJson(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/${selectedStage}/generate`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      showNotice(`${stageLabels[selectedStage]} generation queued.`);
      await refreshSelectedRecord({ reloadCollections: true });
      await loadLiveStatus(false);
    });
  }

  async function handleApproveStage(options: { followCurrentStage?: boolean } = {}): Promise<void> {
    if (!selectedStage || !selectedRecordKey || !selectedStageInfo) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      await fetchJson(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/${selectedStage}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({
            version: selectedStageInfo.currentVersion,
            approvedTopic:
              selectedStage === 'topic' && topicApprovalText.trim()
                ? topicApprovalText.trim()
                : undefined,
          }),
        }
      );

      setTopicApprovalText('');
      showNotice(`${stageLabels[selectedStage]} approved.`);
      if (options.followCurrentStage) {
        await loadCollections(false);
        await selectRecord(channelId, episodeId, null);
      } else {
        await refreshSelectedRecord({ reloadCollections: true });
      }
      await loadLiveStatus(false);
    });
  }

  async function handleRequestChanges(): Promise<void> {
    if (!selectedStage || !selectedRecordKey || !selectedStageInfo) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      await fetchJson(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/${selectedStage}/request-changes`,
        {
          method: 'POST',
          body: JSON.stringify({ version: selectedStageInfo.currentVersion }),
        }
      );

      showNotice(`${stageLabels[selectedStage]} marked as changes requested.`);
      await refreshSelectedRecord({ reloadCollections: true });
      await loadLiveStatus(false);
    });
  }

  async function handleArchiveRecord(): Promise<void> {
    if (!selectedRecordKey) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      await fetchJson(`/api/workbench/episodes/${channelId}/${episodeId}/archive`, {
        method: 'POST',
      });

      showNotice('Record discarded.');
      await loadCollections(true);
      await loadLiveStatus(false);
    });
  }

  async function handleStageTargetedGeneration(
    stageName: EpisodeStage,
    targetedPayload: Record<string, unknown>,
    label: string
  ): Promise<void> {
    const stageInfo = workflow?.stages.find((stage) => stage.stage === stageName) ?? null;
    if (!stageInfo || !selectedRecordKey) {
      return;
    }

    if (!canRegenerateCurrentVersion(stageInfo)) {
      showNotice(`${stageLabels[stageName]} stage는 지금 부분 재생성할 수 없습니다.`);
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      await fetchJson(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stageName}/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            targetVersion: stageInfo.currentVersion,
            ...targetedPayload,
          }),
        }
      );

      showNotice(
        `${label} regeneration queued on ${stageLabels[stageName]} v${String(stageInfo.currentVersion).padStart(3, '0')}.`
      );
      await refreshSelectedRecord({ reloadCollections: true });
      await loadLiveStatus(false);
    });
  }

  async function handleSaveScriptDraft(): Promise<void> {
    if (!selectedRecordKey || selectedStage !== 'script') {
      return;
    }

    const scriptDraft = getParsedScriptDraft(scriptDraftText);
    if (!scriptDraft) {
      showNotice('Script draft JSON must be valid.');
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      await fetchJson(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/script/current-artifact`,
        {
          method: 'PUT',
          body: JSON.stringify(scriptDraft),
        }
      );

      showNotice('Script draft saved. Downstream stages were marked stale where needed.');
      await refreshSelectedRecord({ reloadCollections: true });
      await loadLiveStatus(false);
    });
  }

  function handleLoadScriptPoolCandidate(index: number): void {
    const candidate = currentScriptPoolArtifact?.candidates[index];
    if (!candidate) {
      return;
    }

    setScriptDraftText(JSON.stringify(candidate, null, 2));
    setHasScriptDraftRemoteUpdate(false);
    showNotice(`Loaded script candidate ${index + 1} into the editor.`);
  }

  async function handleSpawnScriptCandidates(): Promise<void> {
    if (!selectedRecordKey) {
      return;
    }

    const [channelId, candidateId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      const latestWorkflow = await fetchJson<EpisodeWorkflow>(
        `/api/workbench/episodes/${channelId}/${candidateId}/workflow`
      );
      if (
        latestWorkflow.episode.kind !== 'topic_pool' &&
        latestWorkflow.episode.kind !== 'topic_candidate'
      ) {
        showNotice('Topic candidate에서만 script candidates를 만들 수 있습니다.');
        return;
      }

      const topicStage = latestWorkflow.stages.find((stage) => stage.stage === 'topic') ?? null;
      const hasUsableTopicVersion =
        latestWorkflow.episode.kind === 'topic_candidate'
          ? Boolean(topicStage?.approvedVersion)
          : Boolean(topicStage?.currentVersion);
      if (!hasUsableTopicVersion) {
        showNotice('먼저 topic candidates를 생성해야 script candidates를 만들 수 있습니다.');
        return;
      }

      const selectedTopic =
        topicApprovalText.trim() ||
        (isTopicCandidatesArtifact(currentArtifact) ? currentArtifact.recommendedTopic : '');
      if (!selectedTopic) {
        showNotice('먼저 topic 후보를 선택하세요.');
        return;
      }

      const response = await fetchJson<{ candidates: EpisodeSummary[] }>(
        `/api/workbench/candidates/${channelId}/${candidateId}/script-batch`,
        {
          method: 'POST',
          body: JSON.stringify({
            count: Math.max(1, Math.min(50, scriptBatchCount)),
            category: scriptBatchCategory || undefined,
            usePipeline: scriptBatchUsePipeline,
            approvedTopic: selectedTopic,
          }),
        }
      );

      const firstCandidate = response.candidates[0] ?? null;
      showNotice(
        firstCandidate
          ? `Script batch queued from "${selectedTopic}" with ${Math.max(1, Math.min(50, scriptBatchCount))} candidates.`
          : `Script batch queued from "${selectedTopic}".`
      );
      await loadCollections(false);
      await loadLiveStatus(false);
      if (firstCandidate) {
        await selectRecord(firstCandidate.channelId, firstCandidate.id);
      }
    });
  }

  async function handlePromoteCandidate(): Promise<void> {
    if (!selectedRecordKey) {
      return;
    }

    const [channelId, candidateId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      const latestWorkflow = await fetchJson<EpisodeWorkflow>(
        `/api/workbench/episodes/${channelId}/${candidateId}/workflow`
      );
      if (
        latestWorkflow.episode.kind !== 'script_pool' &&
        latestWorkflow.episode.kind !== 'script_candidate'
      ) {
        showNotice('Script candidate만 episode로 승격할 수 있습니다.');
        return;
      }

      const scriptStage = latestWorkflow.stages.find((stage) => stage.stage === 'script') ?? null;
      if (!scriptStage?.approvedVersion) {
        showNotice('승인된 script candidate만 episode로 승격할 수 있습니다.');
        return;
      }

      const response = await fetchJson<{ episode: EpisodeSummary }>(
        `/api/workbench/candidates/${channelId}/${candidateId}/promote`,
        {
          method: 'POST',
        }
      );

      showNotice(`Episode ${response.episode.id} created from candidate ${candidateId}.`);
      await loadCollections(false);
      await loadLiveStatus(false);
      await selectRecord(response.episode.channelId, response.episode.id);
    });
  }

  async function handleApproveTopicCandidate(
    channelId: string,
    episodeId: string
  ): Promise<boolean> {
    let didSucceed = false;

    await withBusy(async () => {
      const latestWorkflow = await fetchJson<EpisodeWorkflow>(
        `/api/workbench/episodes/${channelId}/${episodeId}/workflow`
      );
      if (
        latestWorkflow.episode.kind !== 'topic_pool' &&
        latestWorkflow.episode.kind !== 'topic_candidate'
      ) {
        showNotice('Topic candidate만 승인할 수 있습니다.');
        return;
      }

      const topicStage = latestWorkflow.stages.find((stage) => stage.stage === 'topic') ?? null;
      if (!topicStage?.currentVersion || topicStage.reviewStatus !== 'pending_review') {
        showNotice('승인 가능한 topic candidate가 아닙니다.');
        return;
      }

      const currentArtifactResponse = await tryFetchJson<{ artifact: unknown }>(
        `/api/workbench/episodes/${channelId}/${episodeId}/stages/topic/current-artifact`
      );
      const artifact = currentArtifactResponse?.artifact ?? null;
      const approvedTopic =
        topicApprovalText.trim() ||
        (isTopicCandidatesArtifact(artifact) ? artifact.recommendedTopic : '') ||
        latestWorkflow.episode.title ||
        latestWorkflow.episode.previewText ||
        '';

      if (!approvedTopic) {
        showNotice('승인할 topic을 찾지 못했습니다.');
        return;
      }

      await fetchJson(`/api/workbench/episodes/${channelId}/${episodeId}/stages/topic/approve`, {
        method: 'POST',
        body: JSON.stringify({
          version: topicStage.currentVersion,
          approvedTopic,
        }),
      });

      const response = await fetchJson<{ candidates: EpisodeSummary[] }>(
        `/api/workbench/candidates/${channelId}/${episodeId}/script-batch`,
        {
          method: 'POST',
          body: JSON.stringify({
            count: Math.max(1, Math.min(50, scriptBatchCount)),
            category: scriptBatchCategory || undefined,
            usePipeline: scriptBatchUsePipeline,
            approvedTopic,
          }),
        }
      );

      const firstCandidate = response.candidates[0] ?? null;
      setTopicApprovalText('');
      showNotice(
        firstCandidate
          ? `"${approvedTopic}" topic approved. Script generation started.`
          : `"${approvedTopic}" topic approved.`
      );
      await loadCollections(false);
      await loadLiveStatus(false);
      if (firstCandidate) {
        await selectRecord(firstCandidate.channelId, firstCandidate.id);
      }
      didSucceed = true;
    });

    return didSucceed;
  }

  async function handleBulkCandidateReview(reviewStatus: 'approved' | 'pending_review'): Promise<void> {
    const selectedItems = candidates
      .filter((candidate) => selectedCandidateKeys.includes(getRecordKey(candidate)))
      .map((candidate) => ({
        channelId: candidate.channelId,
        candidateId: candidate.id,
      }));
    if (selectedItems.length === 0) {
      showNotice('먼저 bulk action을 적용할 candidate를 선택하세요.');
      return;
    }

    await withBusy(async () => {
      const result = await fetchJson<{
        processed: Array<{ candidateId: string }>;
        skipped: Array<{ candidateId: string; reason: string }>;
      }>('/api/workbench/candidates/bulk-review', {
        method: 'POST',
        body: JSON.stringify({
          items: selectedItems,
          reviewStatus,
        }),
      });

      showNotice(
        `${result.processed.length} candidates marked ${reviewStatus}.${result.skipped.length > 0 ? ` ${result.skipped.length} skipped.` : ''}`
      );
      await refreshSelectedRecord({ reloadCollections: true });
      await loadLiveStatus(false);
    });
  }

  function handleToggleCandidateSelection(channelId: string, candidateId: string): void {
    const key = `${channelId}/${candidateId}`;
    setSelectedCandidateKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function handleToggleSelectFilteredCandidates(): void {
    const filteredKeys = bulkEligibleFilteredCandidates.map(getRecordKey);
    if (filteredKeys.length === 0) {
      return;
    }

    setSelectedCandidateKeys((current) => {
      const currentSet = new Set(current);
      const allSelected = filteredKeys.every((key) => currentSet.has(key));

      if (allSelected) {
        return current.filter((key) => !filteredKeys.includes(key));
      }

      for (const key of filteredKeys) {
        currentSet.add(key);
      }

      return [...currentSet];
    });
  }

  function updateScriptDraft(mutator: (draft: ScriptArtifact) => void): void {
    const nextDraft = getParsedScriptDraft(scriptDraftText);
    if (!nextDraft) {
      showNotice('Script draft JSON을 먼저 고쳐야 카드 편집을 할 수 있습니다.');
      return;
    }

    mutator(nextDraft);
    normalizeScriptDraftStructure(nextDraft);
    setScriptDraftText(JSON.stringify(nextDraft, null, 2));
  }

  function reloadScriptDraftFromServer(): void {
    if (!scriptDraftServerText) {
      showNotice('현재 불러올 수 있는 서버 script draft가 없습니다.');
      return;
    }

    setScriptDraftText(scriptDraftServerText);
    setHasScriptDraftRemoteUpdate(false);
    showNotice('Server script draft로 다시 맞췄습니다.');
  }

  function handleScriptFieldChange(
    path: string,
    rawValue: string,
    transform?: 'csv' | 'words',
    scriptType?: 'number'
  ): void {
    updateScriptDraft((draft) => {
      setValueAtPath(
        draft as unknown as Record<string, unknown>,
        path,
        transformScriptFieldValue(rawValue, transform, scriptType)
      );
    });
  }

  function handleSentenceAction(action: string, index: number): void {
    updateScriptDraft((draft) => {
      const sentences = draft.sentences ?? [];

      switch (action) {
        case 'add_end': {
          const referenceSentence = sentences[sentences.length - 1] ?? null;
          draft.sentences.push(createDraftSentence(referenceSentence));
          applySceneRangesForInsertion(draft, sentences.length);
          break;
        }
        case 'add_after': {
          if (index < 0 || index >= sentences.length) {
            return;
          }

          const referenceSentence = sentences[index];
          draft.sentences.splice(index + 1, 0, createDraftSentence(referenceSentence));
          applySceneRangesForInsertion(draft, index + 2);
          break;
        }
        case 'remove': {
          if (sentences.length <= 1) {
            showNotice('최소 한 개의 sentence는 유지해야 합니다.');
            return;
          }

          draft.sentences.splice(index, 1);
          applySceneRangesForRemoval(draft, index + 1);
          break;
        }
        case 'move_up': {
          if (index <= 0 || index >= sentences.length) {
            return;
          }

          [draft.sentences[index - 1], draft.sentences[index]] = [
            draft.sentences[index],
            draft.sentences[index - 1],
          ];
          break;
        }
        case 'move_down': {
          if (index < 0 || index >= sentences.length - 1) {
            return;
          }

          [draft.sentences[index], draft.sentences[index + 1]] = [
            draft.sentences[index + 1],
            draft.sentences[index],
          ];
          break;
        }
        default:
          break;
      }
    });
  }

  function handleSentenceDragStart(index: number): void {
    setDraggingSentenceIndex(index);
    setDragOverIndex(null);
    setDragOverPosition(null);
  }

  function handleSentenceDragEnd(): void {
    setDraggingSentenceIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  }

  function handleSentenceDragOver(event: DragEvent<HTMLElement>, index: number): void {
    if (draggingSentenceIndex === null) {
      return;
    }

    event.preventDefault();
    setDragOverIndex(index);
    setDragOverPosition(getDropPosition(event));
  }

  function handleSentenceDrop(event: DragEvent<HTMLElement>, index: number): void {
    if (draggingSentenceIndex === null) {
      return;
    }

    event.preventDefault();
    const position = getDropPosition(event);
    const insertIndex = position === 'before' ? index : index + 1;

    updateScriptDraft((draft) => {
      const sentences = [...draft.sentences];
      const [movedSentence] = sentences.splice(draggingSentenceIndex, 1);
      if (!movedSentence) {
        return;
      }

      const normalizedInsertIndex =
        draggingSentenceIndex < insertIndex ? insertIndex - 1 : insertIndex;
      sentences.splice(normalizedInsertIndex, 0, movedSentence);
      draft.sentences = sentences;
    });

    setDraggingSentenceIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  }

  function handleSentenceDragLeave(event: DragEvent<HTMLElement>, index: number): void {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    if (dragOverIndex === index) {
      setDragOverIndex(null);
      setDragOverPosition(null);
    }
  }

  async function handleRefreshClick(): Promise<void> {
    try {
      await Promise.all([
        loadChannels(),
        refreshSelectedRecord({ reloadCollections: true, preserveLocalScriptDraft: true }),
        loadLiveStatus(false),
      ]);
      setLastLiveSyncAt(new Date().toISOString());
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleRefreshArtifacts(): Promise<void> {
    if (!selectedRecordKey || !selectedStage) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    const stageSummary = workflow?.stages.find((entry) => entry.stage === selectedStage) ?? null;
    try {
      await Promise.all([
        loadStageArtifacts(channelId, episodeId, selectedStage, stageSummary, {
          preserveLocalScriptDraft: true,
        }),
        loadLiveStatus(false),
      ]);
      setLastLiveSyncAt(new Date().toISOString());
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectStageVersion(version: number): Promise<void> {
    if (!selectedRecordKey || !selectedStage) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    try {
      await loadSelectedStageVersionArtifact(channelId, episodeId, selectedStage, version);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }

  function handleSelectStage(stage: EpisodeStage): void {
    setSelectedStage(stage);
    if (stage !== 'topic') {
      setTopicApprovalText('');
    }
    if (!selectedRecordKey) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    setHash(channelId, episodeId, stage);
    const stageSummary = workflow?.stages.find((entry) => entry.stage === stage) ?? null;
    void loadStageArtifacts(channelId, episodeId, stage, stageSummary).catch((error) => {
      showNotice(error instanceof Error ? error.message : String(error));
    });
  }

  async function handleSetActiveChannelId(nextChannelId: string): Promise<void> {
    if (!nextChannelId || nextChannelId === activeChannelIdRef.current) {
      return;
    }

    activeChannelIdRef.current = nextChannelId;
    setActiveChannelId(nextChannelId);
    setCandidateChannelFilter(nextChannelId);
    setSelectedCandidateKeys([]);
    resetSelectionState(true);
    if (window.location.hash) {
      history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }

    try {
      await Promise.all([
        loadCollections(false, {}, nextChannelId),
        loadLiveStatus(false),
      ]);
      setLastLiveSyncAt(new Date().toISOString());
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    activeChannelId,
    availableChannels,
    areAllFilteredCandidatesSelected,
    artifactError,
    approvedArtifact,
    candidates,
    candidateChannelFilter,
    candidateReviewFilter,
    candidateSearchQuery,
    candidateSortMode,
    candidateStageFilter,
    createChannelId: activeChannelId,
    currentArtifact,
    currentScriptPoolArtifact,
    dragOverIndex,
    dragOverPosition,
    draggingSentenceIndex,
    episodes,
    handleApproveStage,
    handleArchiveRecord,
    handleBulkApproveCandidates() {
      void handleBulkCandidateReview('approved');
    },
    handleCreateTopicCandidateBatch,
    handleGenerateStage,
    handleLoadScriptPoolCandidate,
    handleApproveTopicCandidate,
    handlePromoteCandidate,
    handleRefreshArtifacts,
    handleRefreshClick,
    handleReloadScriptDraft: reloadScriptDraftFromServer,
    handleRequestChanges,
    handleSaveScriptDraft,
    handleSetActiveChannelId,
    handleSetCandidateChannelFilter: setCandidateChannelFilter,
    handleSetCandidateReviewFilter: setCandidateReviewFilter,
    handleSetCandidateSearchQuery: setCandidateSearchQuery,
    handleSetCandidateSortMode: setCandidateSortMode,
    handleSetCandidateStageFilter: setCandidateStageFilter,
    handleSetCreateChannelId: handleSetActiveChannelId,
    handleSetScriptBatchCategory: setScriptBatchCategory,
    handleSetScriptBatchCount(value: number) {
      setScriptBatchCount(Math.max(1, Math.min(50, Math.trunc(value || 1))));
    },
    handleSetScriptBatchUsePipeline: setScriptBatchUsePipeline,
    handleSetTopicBatchCategory: setTopicBatchCategory,
    handleSetTopicBatchCount(value: number) {
      setTopicBatchCount(Math.max(1, Math.min(200, Math.trunc(value || 1))));
    },
    handleScriptFieldChange,
    handleSelectRecord: selectRecord,
    handleSelectStage,
    handleSentenceAction,
    handleSentenceDragEnd,
    handleSentenceDragLeave,
    handleSentenceDragOver,
    handleSentenceDragStart,
    handleSentenceDrop,
    handleSetPayloadText(value: string) {
      if (!selectedStage) {
        return;
      }

      setPayloads((prev) => ({
        ...prev,
        [selectedStage]: value,
      }));
    },
    handleSetTopicApprovalText: setTopicApprovalText,
    handleSetScriptDraftText: setScriptDraftText,
    handleSetScriptEditorMode: setScriptEditorMode,
    handleSetHighlightState: setHighlightState,
    handleSpawnScriptCandidates,
    handleToggleCandidateSelection,
    handleToggleSelectFilteredCandidates,
    filteredCandidates,
    handleRegenerateImpactedScenes() {
      void handleStageTargetedGeneration(
        'image',
        { sceneIndices: scriptImpact.affectedSceneIndices },
        `Scenes ${formatIdList(scriptImpact.affectedSceneIndices)}`
      );
    },
    handleRegenerateImpactedTts() {
      void handleStageTargetedGeneration(
        'tts',
        { sentenceIds: scriptImpact.changedSentenceIds },
        `Sentences ${formatIdList(scriptImpact.changedSentenceIds)}`
      );
    },
    handleRegenerateScene(sceneIndex: number) {
      void handleStageTargetedGeneration(
        'image',
        { sceneIndices: [sceneIndex] },
        `Scene ${sceneIndex}`
      );
    },
    handleRegenerateSentence(sentenceId: number) {
      void handleStageTargetedGeneration(
        'tts',
        { sentenceIds: [sentenceId] },
        `Sentence ${sentenceId}`
      );
    },
    handleSelectStageVersion,
    hasScriptDraftRemoteUpdate,
    isDocumentVisible,
    isBusy,
    isScriptDraftDirty,
    lastLiveSyncAt,
    liveStatus,
    notice,
    parsedScriptDraft,
    payloadText: selectedStage ? payloads[selectedStage] : '{}',
    selectedCandidateKeys,
    scriptBatchCategory,
    scriptBatchCount,
    scriptBatchUsePipeline,
    scriptDraftText,
    scriptEditorMode,
    scriptImpact,
    selectedVersionArtifact,
    selectedVersionArtifactError,
    selectedVersionNumber,
    selectedRecordKey,
    selectedChannel,
    selectedStage,
    selectedStageInfo,
    stageVersions,
    topicBatchCategory,
    topicBatchCount,
    topicApprovalText,
    workflow,
    highlightState,
    bulkEligibleCandidateCount: bulkEligibleFilteredCandidates.length,
  };
}

function getRecordKey(record: EpisodeSummary): string {
  return `${record.channelId}/${record.id}`;
}

function getRecordCurrentReviewStatus(record: EpisodeSummary): string {
  return record.stageStates?.[record.currentStage]?.reviewStatus ?? 'draft';
}

function isBulkReviewableCandidate(record: EpisodeSummary): boolean {
  if (record.kind === 'episode') {
    return false;
  }

  if (record.currentStage !== 'topic' && record.currentStage !== 'script') {
    return false;
  }

  return (record.stageStates?.[record.currentStage]?.currentVersion ?? 0) > 0;
}

function getCandidateReviewRank(reviewStatus: string): number {
  switch (reviewStatus) {
    case 'pending_review':
      return 0;
    case 'approved':
      return 1;
    case 'draft':
      return 2;
    default:
      return 3;
  }
}

function compareCandidates(
  left: EpisodeSummary,
  right: EpisodeSummary,
  sortMode: 'review_ready' | 'updated_desc' | 'title_asc' | 'stage'
): number {
  if (sortMode === 'updated_desc') {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  if (sortMode === 'title_asc') {
    return (
      (left.title || left.id).localeCompare(right.title || right.id, 'ko') ||
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  if (sortMode === 'stage') {
    return (
      left.currentStage.localeCompare(right.currentStage) ||
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  return (
    getCandidateReviewRank(getRecordCurrentReviewStatus(left)) -
      getCandidateReviewRank(getRecordCurrentReviewStatus(right)) ||
    right.updatedAt.localeCompare(left.updatedAt)
  );
}
