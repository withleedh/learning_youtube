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
  getDropPosition,
  getParsedScriptDraft,
  getScriptImpactSummary,
  isScriptArtifact,
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
  StageVersionRecord,
} from './types';

type DragPosition = 'before' | 'after' | null;

export function useWorkbenchApp() {
  const [availableChannels, setAvailableChannels] = useState<ChannelOption[]>([]);
  const [createChannelId, setCreateChannelId] = useState('');
  const [topicBatchCount, setTopicBatchCount] = useState(20);
  const [topicBatchCategory, setTopicBatchCategory] = useState('');
  const [scriptBatchCount, setScriptBatchCount] = useState(5);
  const [scriptBatchCategory, setScriptBatchCategory] = useState('');
  const [scriptBatchUsePipeline, setScriptBatchUsePipeline] = useState(true);
  const [candidates, setCandidates] = useState<EpisodeSummary[]>([]);
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
  const [scriptEditorMode, setScriptEditorMode] = useState<'cards' | 'json'>('cards');
  const [isBusy, setIsBusy] = useState(false);
  const [draggingSentenceIndex, setDraggingSentenceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DragPosition>(null);
  const [highlightState, setHighlightState] = useState<HighlightState | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const loadChannelsRef = useRef<() => Promise<void>>(async () => {});
  const loadCollectionsRef = useRef<(respectHash?: boolean) => Promise<void>>(async () => {});

  const selectedStageInfo = workflow?.stages.find((stage) => stage.stage === selectedStage) ?? null;
  const parsedScriptDraft = getParsedScriptDraft(scriptDraftText);
  const approvedScriptArtifact = isScriptArtifact(approvedArtifact) ? approvedArtifact : null;
  const scriptImpact =
    selectedStage === 'script'
      ? getScriptImpactSummary(parsedScriptDraft, approvedScriptArtifact)
      : emptyImpact;
  loadChannelsRef.current = loadChannels;
  loadCollectionsRef.current = loadCollections;

  useEffect(() => {
    void loadChannelsRef.current();
    void loadCollectionsRef.current(true);

    const onHashChange = () => {
      void loadCollectionsRef.current(true);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  async function loadChannels(): Promise<void> {
    try {
      const response = await fetchJson<{ channels: ChannelOption[] }>('/api/workbench/channels');
      const nextChannels = response.channels ?? [];
      setAvailableChannels(nextChannels);
      setCreateChannelId((current) => {
        if (current && nextChannels.some((channel) => channel.id === current)) {
          return current;
        }

        return nextChannels[0]?.id ?? '';
      });
    } catch (error) {
      setAvailableChannels([]);
      setCreateChannelId('');
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadCollections(respectHash = false): Promise<void> {
    const [candidatesResponse, episodesResponse] = await Promise.all([
      fetchJson<{ candidates: EpisodeSummary[] }>('/api/workbench/candidates'),
      fetchJson<{ episodes: EpisodeSummary[] }>('/api/workbench/episodes'),
    ]);
    const nextCandidates = candidatesResponse.candidates ?? [];
    const nextEpisodes = episodesResponse.episodes ?? [];
    setCandidates(nextCandidates);
    setEpisodes(nextEpisodes);
    await syncSelectionFromHash(nextCandidates, nextEpisodes, respectHash);
  }

  async function syncSelectionFromHash(
    nextCandidates: EpisodeSummary[],
    nextEpisodes: EpisodeSummary[],
    respectHash: boolean
  ): Promise<void> {
    const nextRecords = [...nextCandidates, ...nextEpisodes];
    if (nextRecords.length === 0) {
      setWorkflow(null);
      setSelectedRecordKey(null);
      setSelectedStage(null);
      setCurrentArtifact(null);
      setApprovedArtifact(null);
      setStageVersions([]);
      setSelectedVersionNumber(null);
      setSelectedVersionArtifact(null);
      setSelectedVersionArtifactError('');
      return;
    }

    const hashSelection = parseHash();
    const fallbackRecord = nextCandidates[0] ?? nextEpisodes[0];
    const selection =
      respectHash && hashSelection
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

    await selectRecord(record.channelId, record.id, preferredStage);
  }

  async function selectRecord(
    channelId: string,
    episodeId: string,
    preferredStage: EpisodeStage | null = null
  ): Promise<void> {
    const nextWorkflow = await fetchJson<EpisodeWorkflow>(
      `/api/workbench/episodes/${channelId}/${episodeId}/workflow`
    );
    const nextSelectedStage =
      preferredStage && nextWorkflow.stages.some((stage) => stage.stage === preferredStage)
        ? preferredStage
        : nextWorkflow.episode.currentStage;

    setSelectedRecordKey(`${channelId}/${episodeId}`);
    setWorkflow(nextWorkflow);
    setSelectedStage(nextSelectedStage);
    setHash(channelId, episodeId, nextSelectedStage);
    await loadStageArtifacts(channelId, episodeId, nextSelectedStage);
  }

  async function loadStageArtifacts(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<void> {
    setArtifactError('');

    try {
      const [currentArtifactResponse, approvedArtifactResponse] = await Promise.all([
        tryFetchJson<{ artifact: unknown }>(
          `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stage}/current-artifact`
        ),
        tryFetchJson<{ artifact: unknown }>(
          `/api/workbench/episodes/${channelId}/${episodeId}/stages/${stage}/approved-artifact`
        ),
      ]);

      const nextCurrentArtifact = currentArtifactResponse?.artifact ?? null;
      const nextApprovedArtifact = approvedArtifactResponse?.artifact ?? null;
      setCurrentArtifact(nextCurrentArtifact);
      setApprovedArtifact(nextApprovedArtifact);
      await loadStageVersions(channelId, episodeId, stage);

      if (stage === 'script' && isScriptArtifact(nextCurrentArtifact)) {
        setScriptDraftText(JSON.stringify(nextCurrentArtifact, null, 2));
      }
    } catch (error) {
      setCurrentArtifact(null);
      setApprovedArtifact(null);
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

  async function refreshSelectedRecord(options?: { reloadCollections?: boolean }): Promise<void> {
    if (!selectedRecordKey) {
      await loadCollections(true);
      return;
    }

    if (options?.reloadCollections) {
      await loadCollections(true);
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await selectRecord(channelId, episodeId, selectedStage);
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

    if (!createChannelId) {
      showNotice('먼저 채널을 선택하세요.');
      return;
    }

    await withBusy(async () => {
      const response = await fetchJson<{ candidates: EpisodeSummary[] }>(
        '/api/workbench/candidates/topic-batch',
        {
          method: 'POST',
          body: JSON.stringify({
            channelId: createChannelId,
            count: topicBatchCount,
            category: topicBatchCategory || undefined,
          }),
        }
      );

      const firstCandidate = response.candidates[0] ?? null;
      showNotice(`${response.candidates.length} topic candidates queued.`);
      await loadCollections(false);
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
    });
  }

  async function handleApproveStage(): Promise<void> {
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
      await refreshSelectedRecord({ reloadCollections: true });
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
    });
  }

  async function handleSpawnScriptCandidates(): Promise<void> {
    if (!selectedRecordKey || workflow?.episode.kind !== 'candidate') {
      return;
    }

    const topicStage = workflow.stages.find((stage) => stage.stage === 'topic') ?? null;
    if (!topicStage?.approvedVersion) {
      showNotice('먼저 topic을 승인해야 script candidates를 만들 수 있습니다.');
      return;
    }

    const [channelId, candidateId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      const response = await fetchJson<{ candidates: EpisodeSummary[] }>(
        `/api/workbench/candidates/${channelId}/${candidateId}/script-batch`,
        {
          method: 'POST',
          body: JSON.stringify({
            count: Math.max(1, Math.min(50, scriptBatchCount)),
            category: scriptBatchCategory || undefined,
            usePipeline: scriptBatchUsePipeline,
          }),
        }
      );

      const firstCandidate = response.candidates[0] ?? null;
      showNotice(`${response.candidates.length} script candidates queued.`);
      await loadCollections(false);
      if (firstCandidate) {
        await selectRecord(firstCandidate.channelId, firstCandidate.id);
      }
    });
  }

  async function handlePromoteCandidate(): Promise<void> {
    if (!selectedRecordKey || workflow?.episode.kind !== 'candidate') {
      return;
    }

    const scriptStage = workflow.stages.find((stage) => stage.stage === 'script') ?? null;
    if (!scriptStage?.approvedVersion) {
      showNotice('승인된 script candidate만 episode로 승격할 수 있습니다.');
      return;
    }

    const [channelId, candidateId] = selectedRecordKey.split('/');
    await withBusy(async () => {
      const response = await fetchJson<{ episode: EpisodeSummary }>(
        `/api/workbench/candidates/${channelId}/${candidateId}/promote`,
        {
          method: 'POST',
        }
      );

      showNotice(`Episode ${response.episode.id} created from candidate ${candidateId}.`);
      await loadCollections(false);
      await selectRecord(response.episode.channelId, response.episode.id);
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
    await Promise.all([loadChannels(), refreshSelectedRecord({ reloadCollections: true })]);
  }

  async function handleRefreshArtifacts(): Promise<void> {
    if (!selectedRecordKey || !selectedStage) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await loadStageArtifacts(channelId, episodeId, selectedStage);
  }

  async function handleSelectStageVersion(version: number): Promise<void> {
    if (!selectedRecordKey || !selectedStage) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    await loadSelectedStageVersionArtifact(channelId, episodeId, selectedStage, version);
  }

  function handleSelectStage(stage: EpisodeStage): void {
    setSelectedStage(stage);
    if (!selectedRecordKey) {
      return;
    }

    const [channelId, episodeId] = selectedRecordKey.split('/');
    setHash(channelId, episodeId, stage);
    void loadStageArtifacts(channelId, episodeId, stage);
  }

  return {
    availableChannels,
    artifactError,
    approvedArtifact,
    candidates,
    createChannelId,
    currentArtifact,
    dragOverIndex,
    dragOverPosition,
    draggingSentenceIndex,
    episodes,
    handleApproveStage,
    handleCreateTopicCandidateBatch,
    handleGenerateStage,
    handlePromoteCandidate,
    handleRefreshArtifacts,
    handleRefreshClick,
    handleRequestChanges,
    handleSaveScriptDraft,
    handleSetCreateChannelId: setCreateChannelId,
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
    isBusy,
    notice,
    parsedScriptDraft,
    payloadText: selectedStage ? payloads[selectedStage] : '{}',
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
    selectedStage,
    selectedStageInfo,
    stageVersions,
    topicBatchCategory,
    topicBatchCount,
    topicApprovalText,
    workflow,
    highlightState,
  };
}
