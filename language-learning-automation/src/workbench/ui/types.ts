export type EpisodeStage = 'topic' | 'script' | 'image' | 'tts' | 'render' | 'shorts';
export type WorkbenchRecordKind = 'candidate' | 'episode';

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
  title?: string;
  workflowStatus: string;
  currentStage: EpisodeStage;
  createdAt: string;
  updatedAt: string;
}

export interface WorkbenchJob {
  id: string;
  stage: EpisodeStage;
  status: string;
  version: number;
  updatedAt: string;
  error?: string;
}

export interface StageWorkflowSummary {
  stage: EpisodeStage;
  currentVersion: number;
  approvedVersion: number | null;
  reviewStatus: string;
  blockedBy: EpisodeStage[];
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

export interface ScriptImpactSummary {
  changedSentenceIds: number[];
  affectedSceneIndices: number[];
}

export interface HighlightState {
  kind: 'scene' | 'sentence';
  value: number;
}
