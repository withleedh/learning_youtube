import type { DragEvent } from 'react';
import type {
  ApprovedTopicArtifact,
  EpisodeStage,
  HighlightState,
  ImageManifest,
  PackageManifest,
  RenderManifest,
  ScenePromptRecord,
  ScriptArtifact,
  ScriptPoolArtifact,
  ScriptImpactSummary,
  SentenceRecord,
  ShortsManifest,
  StageWorkflowSummary,
  TopicCandidatesArtifact,
  TtsManifest,
} from './types';
import type { Category } from '../../script/types';

export type ScriptFieldTransform = 'csv' | 'words';
export type ScriptFieldPrimitiveType = 'number';

export const stageLabels: Record<EpisodeStage, string> = {
  topic: 'Topic',
  script: 'Script',
  image: 'Image',
  tts: 'TTS',
  render: 'Render',
  shorts: 'Shorts',
  package: 'Package',
};

export const defaultPayloads: Record<EpisodeStage, string> = {
  topic: '{\n  "candidateCount": 3\n}',
  script: '{\n  "usePipeline": true\n}',
  image: '{}',
  tts: '{}',
  render: '{}',
  shorts: '{}',
  package: '{}',
};

export const workbenchCategoryOptions: Array<{ value: Category; label: string }> = [
  { value: 'story', label: 'Story' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'news', label: 'News' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'travel_business', label: 'Travel & Business' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'fairytale', label: 'Fairytale' },
];

export const emptyImpact: ScriptImpactSummary = {
  changedSentenceIds: [],
  affectedSceneIndices: [],
};

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return body as T;
}

export async function tryFetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return body as T;
}

export function parseHash(): { channelId: string; episodeId: string; stage?: EpisodeStage } | null {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) {
    return null;
  }

  const [channelId, episodeId, stage] = raw.split('/');
  if (!channelId || !episodeId) {
    return null;
  }

  return { channelId, episodeId, stage: stage as EpisodeStage | undefined };
}

export function setHash(channelId: string, episodeId: string, stage: EpisodeStage): void {
  const nextHash = `#${channelId}/${episodeId}/${stage}`;
  if (window.location.hash !== nextHash) {
    history.replaceState({}, '', nextHash);
  }
}

export function toFileProxyUrl(filePath: string): string {
  return `/api/workbench/file?path=${encodeURIComponent(filePath)}`;
}

export function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getCategoryLabel(category: string | null | undefined): string {
  return workbenchCategoryOptions.find((option) => option.value === category)?.label ?? String(category ?? '');
}

export function getAutoCategoryForDate(date: Date): Category {
  const dayOfWeek = date.getDay();
  const categoryMap: Record<number, Category> = {
    0: 'fairytale',
    1: 'story',
    2: 'conversation',
    3: 'news',
    4: 'announcement',
    5: 'travel_business',
    6: 'lesson',
  };
  return categoryMap[dayOfWeek];
}

export function getParsedScriptDraft(scriptDraftText: string): ScriptArtifact | null {
  try {
    return scriptDraftText.trim() ? (JSON.parse(scriptDraftText) as ScriptArtifact) : null;
  } catch {
    return null;
  }
}

export function transformScriptFieldValue(
  rawValue: string,
  transform?: ScriptFieldTransform,
  scriptType?: ScriptFieldPrimitiveType
): unknown {
  if (transform === 'csv') {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (transform === 'words') {
    return rawValue
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const pipeParts = line.split('|');
        if (pipeParts.length >= 2) {
          return {
            word: pipeParts[0].trim(),
            meaning: pipeParts.slice(1).join('|').trim(),
          };
        }

        const colonParts = line.split(':');
        return {
          word: colonParts[0]?.trim() ?? '',
          meaning: colonParts.slice(1).join(':').trim(),
        };
      })
      .filter((item) => item.word && item.meaning);
  }

  if (scriptType === 'number') {
    return Number(rawValue);
  }

  return rawValue;
}

export function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.');
  let cursor: unknown = target;

  for (let index = 0; index < segments.length - 1; index++) {
    const currentKey = toPathKey(segments[index]);
    const nextKey = toPathKey(segments[index + 1]);
    const container = cursor as Record<string | number, unknown>;

    if (container[currentKey] === undefined) {
      container[currentKey] = typeof nextKey === 'number' ? [] : {};
    }

    cursor = container[currentKey] as Record<string | number, unknown>;
  }

  const lastKey = toPathKey(segments[segments.length - 1]);
  (cursor as Record<string | number, unknown>)[lastKey] = value;
}

function toPathKey(segment: string): string | number {
  const asNumber = Number(segment);
  return Number.isInteger(asNumber) ? asNumber : segment;
}

export function createDraftSentence(referenceSentence: SentenceRecord | null): SentenceRecord {
  const speaker = referenceSentence?.speaker ?? 'M';
  const blankAnswer = referenceSentence?.blankAnswer || 'line';
  const referenceWord = referenceSentence?.words?.[0] ?? { word: blankAnswer, meaning: '단어' };

  return {
    id: 0,
    speaker,
    target: 'New sentence',
    targetBlank: 'New ______',
    blankAnswer,
    native: '새 문장',
    words: [
      {
        word: referenceWord.word || 'line',
        meaning: referenceWord.meaning || '단어',
      },
    ],
    wrongWordChoices: referenceSentence?.wrongWordChoices
      ? [...referenceSentence.wrongWordChoices]
      : undefined,
  };
}

export function normalizeScriptDraftStructure(draft: ScriptArtifact): void {
  draft.sentences = (draft.sentences ?? []).map((sentence, index) => ({
    ...sentence,
    id: index + 1,
    words:
      Array.isArray(sentence.words) && sentence.words.length > 0
        ? sentence.words
        : [{ word: 'line', meaning: '단어' }],
  }));

  const maxSentenceId = draft.sentences.length;
  if (!Array.isArray(draft.metadata?.scenePrompts) || maxSentenceId <= 0) {
    return;
  }

  draft.metadata.scenePrompts = draft.metadata.scenePrompts
    .map((scenePrompt) => {
      const start = clampNumber(scenePrompt.sentenceRange[0], 1, maxSentenceId);
      const end = clampNumber(scenePrompt.sentenceRange[1], 1, maxSentenceId);
      return {
        ...scenePrompt,
        sentenceRange: [Math.min(start, end), Math.max(start, end)] as [number, number],
      };
    })
    .filter((scenePrompt) => scenePrompt.sentenceRange[0] <= scenePrompt.sentenceRange[1]);
}

export function applySceneRangesForInsertion(
  draft: ScriptArtifact,
  insertedPosition: number
): void {
  const scenePrompts = draft.metadata?.scenePrompts;
  if (!Array.isArray(scenePrompts) || scenePrompts.length === 0) {
    return;
  }

  const anchorPosition = Math.max(1, insertedPosition - 1);
  let anchorSceneIndex = -1;

  scenePrompts.forEach((scenePrompt, index) => {
    const [start, end] = scenePrompt.sentenceRange;

    if (anchorPosition >= start && anchorPosition <= end) {
      anchorSceneIndex = index;
    }

    if (start >= insertedPosition) {
      scenePrompt.sentenceRange = [start + 1, end + 1];
      return;
    }

    if (end >= insertedPosition) {
      scenePrompt.sentenceRange = [start, end + 1];
    }
  });

  if (anchorSceneIndex >= 0) {
    const scenePrompt = scenePrompts[anchorSceneIndex];
    scenePrompt.sentenceRange = [
      Math.min(scenePrompt.sentenceRange[0], insertedPosition),
      Math.max(scenePrompt.sentenceRange[1], insertedPosition),
    ];
  }
}

export function applySceneRangesForRemoval(draft: ScriptArtifact, removedPosition: number): void {
  const scenePrompts = draft.metadata?.scenePrompts;
  if (!Array.isArray(scenePrompts) || scenePrompts.length === 0) {
    return;
  }

  draft.metadata.scenePrompts = scenePrompts
    .map((scenePrompt) => {
      const [start, end] = scenePrompt.sentenceRange;

      if (end < removedPosition) {
        return scenePrompt;
      }

      if (start > removedPosition) {
        return {
          ...scenePrompt,
          sentenceRange: [start - 1, end - 1] as [number, number],
        };
      }

      if (start === end && start === removedPosition) {
        return null;
      }

      return {
        ...scenePrompt,
        sentenceRange: [start, end - 1] as [number, number],
      };
    })
    .filter((scenePrompt): scenePrompt is ScenePromptRecord => scenePrompt !== null);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getScriptImpactSummary(
  draftArtifact: ScriptArtifact | null,
  baselineArtifact: ScriptArtifact | null
): ScriptImpactSummary {
  if (!draftArtifact?.sentences) {
    return emptyImpact;
  }

  const currentSentences = new Map(
    draftArtifact.sentences.map((sentence) => [sentence.id, JSON.stringify(sentence)] as const)
  );
  const baselineSentences = new Map(
    (baselineArtifact?.sentences ?? []).map(
      (sentence) => [sentence.id, JSON.stringify(sentence)] as const
    )
  );

  const changedSentenceIds = [...new Set([...currentSentences.keys(), ...baselineSentences.keys()])]
    .filter((sentenceId) => currentSentences.get(sentenceId) !== baselineSentences.get(sentenceId))
    .sort((left, right) => left - right);

  const currentScenePrompts = draftArtifact.metadata?.scenePrompts ?? [];
  const baselineScenePrompts = baselineArtifact?.metadata?.scenePrompts ?? [];
  const scenePromptsChanged =
    JSON.stringify(currentScenePrompts) !== JSON.stringify(baselineScenePrompts);

  const affectedSceneIndices = scenePromptsChanged
    ? currentScenePrompts.map((_, index) => index + 1)
    : currentScenePrompts
        .map((scenePrompt, index) =>
          changedSentenceIds.some(
            (sentenceId) =>
              sentenceId >= scenePrompt.sentenceRange[0] &&
              sentenceId <= scenePrompt.sentenceRange[1]
          )
            ? index + 1
            : null
        )
        .filter((sceneIndex): sceneIndex is number => sceneIndex !== null);

  return {
    changedSentenceIds,
    affectedSceneIndices,
  };
}

export function getSceneLinkClass(
  sceneIndex: number,
  scenePrompt: ScenePromptRecord,
  highlightState: HighlightState | null
): string {
  if (!highlightState) {
    return '';
  }

  if (highlightState.kind === 'scene') {
    return highlightState.value === sceneIndex ? 'linked-active' : '';
  }

  return highlightState.value >= scenePrompt.sentenceRange[0] &&
    highlightState.value <= scenePrompt.sentenceRange[1]
    ? 'linked-target'
    : '';
}

export function getSentenceLinkClass(
  sentence: SentenceRecord,
  scenePrompts: ScenePromptRecord[],
  highlightState: HighlightState | null
): string {
  if (!highlightState) {
    return '';
  }

  if (highlightState.kind === 'sentence') {
    return highlightState.value === sentence.id ? 'linked-active' : '';
  }

  const scenePrompt = scenePrompts[highlightState.value];
  if (!scenePrompt) {
    return '';
  }

  return sentence.id >= scenePrompt.sentenceRange[0] &&
    sentence.id <= scenePrompt.sentenceRange[1]
    ? 'linked-target'
    : '';
}

export function getDropPosition(event: DragEvent<HTMLElement>): 'before' | 'after' {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
}

export function canRegenerateCurrentVersion(stageInfo: StageWorkflowSummary | null): boolean {
  return Boolean(
    stageInfo &&
      !stageInfo.isBlocked &&
      stageInfo.currentVersion > 0 &&
      (stageInfo.approvedVersion !== stageInfo.currentVersion ||
        stageInfo.reviewStatus === 'stale')
  );
}

export function formatIdList(values: number[]): string {
  return values.join(', ');
}

export function formatWordsList(words: SentenceRecord['words']): string {
  return (words ?? []).map((word) => `${word.word} | ${word.meaning}`).join('\n');
}

export function formatCsvList(values?: string[]): string {
  return (values ?? []).join(', ');
}

export function isScriptArtifact(value: unknown): value is ScriptArtifact {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as ScriptArtifact).sentences) &&
      (value as ScriptArtifact).metadata?.title?.target
  );
}

export function isScriptPoolArtifact(value: unknown): value is ScriptPoolArtifact {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as ScriptPoolArtifact).candidates) &&
      isScriptArtifact((value as ScriptPoolArtifact).currentDraft)
  );
}

export function getEditableScriptFromArtifact(value: unknown): ScriptArtifact | null {
  if (isScriptArtifact(value)) {
    return value;
  }

  if (isScriptPoolArtifact(value)) {
    return value.currentDraft;
  }

  return null;
}

export function isTopicCandidatesArtifact(value: unknown): value is TopicCandidatesArtifact {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as TopicCandidatesArtifact).candidates)
  );
}

export function isApprovedTopicArtifact(value: unknown): value is ApprovedTopicArtifact {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as ApprovedTopicArtifact).approvedTopic === 'string'
  );
}

export function isImageManifest(value: unknown): value is ImageManifest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as ImageManifest).sceneImagePaths) &&
      typeof (value as ImageManifest).mode === 'string'
  );
}

export function isPackageManifest(value: unknown): value is PackageManifest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as PackageManifest).titleCandidates) &&
      Array.isArray((value as PackageManifest).thumbnailCandidates) &&
      typeof (value as PackageManifest).selectedTitle === 'string'
  );
}

export function isTtsManifest(value: unknown): value is TtsManifest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as TtsManifest).audioFiles)
  );
}

export function isRenderManifest(value: unknown): value is RenderManifest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as RenderManifest).videoPath === 'string'
  );
}

export function isShortsManifest(value: unknown): value is ShortsManifest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as ShortsManifest).outputs)
  );
}
