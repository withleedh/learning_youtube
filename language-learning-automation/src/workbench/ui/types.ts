export type EpisodeStage = 'topic' | 'script' | 'image' | 'tts' | 'render' | 'shorts' | 'package';
export type WorkbenchRecordKind = 'candidate' | 'topic_pool' | 'script_pool' | 'episode';
export type ReviewWorkspace =
  | 'topic_inbox'
  | 'script_lab'
  | 'production_desk'
  | 'delivery_pack';

export interface ChannelOption {
  id: string;
  name: string;
  targetLanguage: string;
  nativeLanguage: string;
}

export interface EpisodeSummary {
  id: string;
  channelId: string;
  kind: WorkbenchRecordKind;
  threadId?: string;
  parentRecordId?: string;
  originCandidateId?: string;
  title?: string;
  previewText?: string;
  previewMeta?: string;
  nextAction?: string;
  lineageLabel?: string;
  issueCounts?: {
    open: number;
    stale: number;
    comments: number;
  };
  reviewTaskCounts?: {
    reviewable: number;
    blocked: number;
    stale: number;
  };
  workflowStatus: string;
  currentStage: EpisodeStage;
  createdAt: string;
  updatedAt: string;
  lastHumanActionAt?: string;
  stageStates?: Partial<
    Record<
      EpisodeStage,
      {
        currentVersion: number;
        approvedVersion: number | null;
        reviewStatus: string;
        staleReasons?: string[];
      }
    >
  >;
}

export interface WorkbenchJob {
  id: string;
  stage: EpisodeStage;
  status: string;
  version: number;
  updatedAt: string;
  progress?: {
    current?: number;
    total?: number;
    phase?: string;
    label?: string;
  };
  error?: string;
}

export interface StageWorkflowSummary {
  stage: EpisodeStage;
  currentVersion: number;
  approvedVersion: number | null;
  reviewStatus: string;
  blockedBy: EpisodeStage[];
  staleReasons: string[];
  isBlocked: boolean;
  latestJob: WorkbenchJob | null;
  queuedJobCount: number;
  runningJobCount: number;
  failedJobCount: number;
  completedJobCount: number;
  canGenerate: boolean;
  canApprove: boolean;
  canRequestChanges: boolean;
}

export interface StageVersionRecord {
  id: string;
  episodeId: string;
  stage: EpisodeStage;
  version: number;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string;
  sourceVersionIds: string[];
  notes?: string;
}

export interface EpisodeWorkflow {
  episode: EpisodeSummary;
  stages: StageWorkflowSummary[];
  jobs: WorkbenchJob[];
}

export interface WorkbenchLiveStatus {
  queuedJobs: number;
  runningJobs: number;
  failedJobs: number;
  completedJobs: number;
  activeJobCount: number;
  activeRecordCount: number;
  lastUpdatedAt: string | null;
}

export interface ApiRequestLogEntry {
  timestamp: string;
  method: string;
  pathname: string;
  query: Record<string, string>;
  statusCode: number;
  durationMs: number;
  requestBody?: unknown;
}

export interface WordRecord {
  word: string;
  meaning: string;
}

export interface SentenceRecord {
  id: number;
  speaker: 'M' | 'F';
  target: string;
  targetPronunciation?: string;
  targetBlank: string;
  blankAnswer: string;
  native: string;
  words: WordRecord[];
  wrongWordChoices?: string[];
}

export interface CharacterRecord {
  id: 'M' | 'F';
  name: string;
  gender: 'male' | 'female';
  ethnicity: string;
  role: string;
}

export interface ScenePromptRecord {
  sentenceRange: [number, number];
  setting: string;
  mood: string;
  characterActions: string;
  cameraDirection: string;
  lighting?: string;
  transition?: string;
}

export interface ScriptArtifact {
  channelId: string;
  date: string;
  category: string;
  metadata: {
    topic: string;
    style?: string;
    title: {
      target: string;
      native: string;
    };
    characters: CharacterRecord[];
    scenePrompts?: ScenePromptRecord[];
  };
  sentences: SentenceRecord[];
}

export interface TopicCandidatesArtifact {
  generatedAt: string;
  category: string;
  candidates: string[];
  recommendedTopic: string;
}

export interface ApprovedTopicArtifact {
  approvedAt: string;
  category: string;
  approvedTopic: string;
  sourceVersion: number;
  source: string;
}

export interface ScriptPoolArtifact {
  generatedAt: string;
  category: string;
  topic: string;
  recommendedCandidateIndex: number;
  selectedCandidateIndex: number | null;
  candidates: ScriptArtifact[];
  currentDraft: ScriptArtifact;
}

export interface ImageManifest {
  generatedAt: string;
  mode: 'background' | 'scene';
  backgroundImagePath?: string;
  sceneImagePaths: string[];
  styleId?: string;
}

export interface AudioFileRecord {
  sentenceId: number;
  speaker: 'M' | 'F';
  speed: '0.8x' | '1.0x' | '1.2x';
  path: string;
  duration: number;
}

export interface TtsManifest {
  generatedAt: string;
  outputDir: string;
  audioFiles: AudioFileRecord[];
}

export interface RenderManifest {
  generatedAt: string;
  compositionId: string;
  videoPath: string;
  durationInFrames: number;
  audioFileCount: number;
  imageMode: 'background' | 'scene';
}

export interface ShortsOutput {
  sentenceId: number;
  compositionId: string;
  outputPath: string;
  backgroundImage?: string;
}

export interface ShortsManifest {
  generatedAt: string;
  compositionId: string;
  outputDir: string;
  sourceRenderVideoPath: string;
  outputs: ShortsOutput[];
}

export interface PackageTitleCandidate {
  id: string;
  value: string;
  source: 'native' | 'target' | 'competitor_style' | 'manual';
}

export interface PackageThumbnailCandidate {
  id: string;
  path: string;
  label: string;
  source: 'scene' | 'background' | 'render_frame' | 'manual';
}

export interface PackageManifest {
  generatedAt: string;
  titleCandidates: PackageTitleCandidate[];
  selectedTitle: string;
  description: string;
  pinnedComment: string;
  thumbnailCandidates: PackageThumbnailCandidate[];
  selectedThumbnailPath: string;
  uploadInfoPath: string;
  uploadInfoText: string;
  exportItems: Array<{
    id: string;
    label: string;
    path: string;
  }>;
}

export interface ReviewAnchor {
  kind: 'sentence' | 'scene' | 'timestamp' | 'thumbnail' | 'title' | 'stage';
  label?: string;
  sentenceId?: number;
  sceneIndex?: number;
  timestampMs?: number;
  target?: string;
}

export interface ReviewComment {
  id: string;
  channelId: string;
  recordId: string;
  stage: EpisodeStage;
  version?: number;
  kind: 'issue' | 'note' | 'decision';
  status: 'open' | 'resolved';
  text: string;
  anchor?: ReviewAnchor;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewQueueItem {
  id: string;
  workspace: ReviewWorkspace;
  channelId: string;
  recordId: string;
  threadId: string;
  kind: WorkbenchRecordKind;
  title: string;
  previewText?: string;
  previewMeta?: string;
  stage: EpisodeStage;
  workflowStatus: string;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string;
  nextAction: string;
  issueCounts: {
    open: number;
    stale: number;
    comments: number;
  };
  reviewTaskCounts: {
    reviewable: number;
    blocked: number;
    stale: number;
  };
  lineageLabel: string;
}

export interface ThreadSummary {
  threadId: string;
  records: EpisodeSummary[];
}

export interface StageReviewContext {
  episode: EpisodeSummary;
  thread: ThreadSummary;
  stage: EpisodeStage;
  stageSummary: StageWorkflowSummary;
  currentArtifact: unknown | null;
  approvedArtifact: unknown | null;
  versions: StageVersionRecord[];
  comments: ReviewComment[];
  downstream: Array<{
    stage: EpisodeStage;
    reviewStatus: string;
    staleReasons: string[];
    currentVersion: number;
    approvedVersion: number | null;
  }>;
}

export interface ScriptImpactSummary {
  changedSentenceIds: number[];
  affectedSceneIndices: number[];
}

export interface HighlightState {
  kind: 'scene' | 'sentence';
  value: number;
}
