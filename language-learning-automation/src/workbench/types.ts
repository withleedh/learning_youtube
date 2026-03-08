import { z } from 'zod';
import { categorySchema } from '../script/types';
import { audioFileSchema } from '../tts/types';

export const episodeStageOrder = [
  'topic',
  'script',
  'image',
  'tts',
  'render',
  'shorts',
] as const;

export const episodeStageSchema = z.enum(episodeStageOrder);
export type EpisodeStage = z.infer<typeof episodeStageSchema>;

export const reviewStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'changes_requested',
  'stale',
]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const jobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'canceled']);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const workbenchJobKindSchema = z.enum(['generate_stage']);
export type WorkbenchJobKind = z.infer<typeof workbenchJobKindSchema>;

export const stageGenerationPayloadSchema = z.object({
  category: categorySchema.optional(),
  topic: z.string().min(1).optional(),
  candidateCount: z.number().int().positive().max(10).optional(),
  usePipeline: z.boolean().optional(),
  styleId: z.string().min(1).optional(),
  targetVersion: z.number().int().positive().optional(),
  sentenceIds: z.array(z.number().int().positive()).min(1).optional(),
  sceneIndices: z.array(z.number().int().positive()).min(1).optional(),
});
export type StageGenerationPayload = z.infer<typeof stageGenerationPayloadSchema>;

export const topicCandidatesArtifactSchema = z.object({
  generatedAt: z.string().datetime(),
  category: categorySchema,
  candidates: z.array(z.string().min(1)).min(1),
  recommendedTopic: z.string().min(1),
});
export type TopicCandidatesArtifact = z.infer<typeof topicCandidatesArtifactSchema>;

export const approvedTopicArtifactSchema = z.object({
  approvedAt: z.string().datetime(),
  category: categorySchema,
  approvedTopic: z.string().min(1),
  sourceVersion: z.number().int().positive(),
  source: z.enum(['manual', 'recommended']),
});
export type ApprovedTopicArtifact = z.infer<typeof approvedTopicArtifactSchema>;

export const imageStageManifestSchema = z.object({
  generatedAt: z.string().datetime(),
  mode: z.enum(['background', 'scene']),
  backgroundImagePath: z.string().min(1).optional(),
  sceneImagePaths: z.array(z.string().min(1)).default([]),
  styleId: z.string().min(1).optional(),
});
export type ImageStageManifest = z.infer<typeof imageStageManifestSchema>;

export const episodeVoicesSchema = z.object({
  maleVoice: z.string().min(1),
  femaleVoice: z.string().min(1),
  malePitch: z.number(),
  femalePitch: z.number(),
});
export type WorkbenchEpisodeVoices = z.infer<typeof episodeVoicesSchema>;

export const ttsStageManifestSchema = z.object({
  generatedAt: z.string().datetime(),
  outputDir: z.string().min(1),
  audioFiles: z.array(audioFileSchema),
  episodeVoices: episodeVoicesSchema.optional(),
});
export type TtsStageManifest = z.infer<typeof ttsStageManifestSchema>;

export const renderStageManifestSchema = z.object({
  generatedAt: z.string().datetime(),
  compositionId: z.string().min(1),
  videoPath: z.string().min(1),
  durationInFrames: z.number().int().positive(),
  audioFileCount: z.number().int().nonnegative(),
  imageMode: z.enum(['background', 'scene']),
});
export type RenderStageManifest = z.infer<typeof renderStageManifestSchema>;

export const shortsOutputSchema = z.object({
  sentenceId: z.number().int().positive(),
  compositionId: z.string().min(1),
  outputPath: z.string().min(1),
  backgroundImage: z.string().min(1).optional(),
});
export type ShortsOutput = z.infer<typeof shortsOutputSchema>;

export const shortsStageManifestSchema = z.object({
  generatedAt: z.string().datetime(),
  compositionId: z.string().min(1),
  outputDir: z.string().min(1),
  sourceRenderVideoPath: z.string().min(1),
  outputs: z.array(shortsOutputSchema),
});
export type ShortsStageManifest = z.infer<typeof shortsStageManifestSchema>;

export const assetKindSchema = z.enum([
  'topic_candidates',
  'approved_topic',
  'script_candidates',
  'approved_script',
  'scene_image',
  'audio_manifest',
  'audio_file',
  'render_preview',
  'render_final',
  'shorts_output',
  'thumbnail',
  'metadata',
]);
export type AssetKind = z.infer<typeof assetKindSchema>;

export const workflowStatusSchema = z.enum([
  'draft',
  'in_progress',
  'awaiting_review',
  'ready_for_render',
  'completed',
  'archived',
]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

export const episodeTitleSourceSchema = z.enum(['manual', 'topic_auto', 'script_auto']);
export type EpisodeTitleSource = z.infer<typeof episodeTitleSourceSchema>;

export const workbenchRecordKindSchema = z.enum(['candidate', 'episode']);
export type WorkbenchRecordKind = z.infer<typeof workbenchRecordKindSchema>;

export const stageVersionSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  stage: episodeStageSchema,
  version: z.number().int().positive(),
  reviewStatus: reviewStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sourceVersionIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type StageVersion = z.infer<typeof stageVersionSchema>;

export const assetRecordSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  stage: episodeStageSchema,
  version: z.number().int().positive(),
  kind: assetKindSchema,
  path: z.string().min(1),
  label: z.string().min(1),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});
export type AssetRecord = z.infer<typeof assetRecordSchema>;

export const stageStateSchema = z.object({
  currentVersion: z.number().int().nonnegative().default(0),
  approvedVersion: z.number().int().nonnegative().nullable().default(null),
  reviewStatus: reviewStatusSchema,
  blockedBy: z.array(episodeStageSchema).default([]),
});
export type StageState = z.infer<typeof stageStateSchema>;

export const episodeStageStatesSchema = z.object({
  topic: stageStateSchema,
  script: stageStateSchema,
  image: stageStateSchema,
  tts: stageStateSchema,
  render: stageStateSchema,
  shorts: stageStateSchema,
});
export type EpisodeStageStates = z.infer<typeof episodeStageStatesSchema>;

export const episodeRecordSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().min(1),
  kind: workbenchRecordKindSchema.default('episode'),
  title: z.string().optional(),
  titleSource: episodeTitleSourceSchema.optional(),
  workflowStatus: workflowStatusSchema,
  currentStage: episodeStageSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  stageStates: episodeStageStatesSchema,
});
export type EpisodeRecord = z.infer<typeof episodeRecordSchema>;

export const workbenchJobSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().min(1),
  episodeId: z.string().min(1),
  kind: workbenchJobKindSchema,
  stage: episodeStageSchema,
  version: z.number().int().positive(),
  status: jobStatusSchema,
  payload: stageGenerationPayloadSchema.default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});
export type WorkbenchJob = z.infer<typeof workbenchJobSchema>;

export function getNextStage(stage: EpisodeStage): EpisodeStage | null {
  const index = episodeStageOrder.indexOf(stage);
  if (index === -1 || index === episodeStageOrder.length - 1) {
    return null;
  }

  return episodeStageOrder[index + 1];
}

export function getDownstreamStages(stage: EpisodeStage): EpisodeStage[] {
  const index = episodeStageOrder.indexOf(stage);
  if (index === -1 || index === episodeStageOrder.length - 1) {
    return [];
  }

  return [...episodeStageOrder.slice(index + 1)];
}

export function createInitialStageStates(): EpisodeStageStates {
  return {
    topic: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', blockedBy: [] },
    script: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', blockedBy: ['topic'] },
    image: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', blockedBy: ['script'] },
    tts: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', blockedBy: ['script'] },
    render: {
      currentVersion: 0,
      approvedVersion: null,
      reviewStatus: 'draft',
      blockedBy: ['image', 'tts'],
    },
    shorts: {
      currentVersion: 0,
      approvedVersion: null,
      reviewStatus: 'draft',
      blockedBy: ['render'],
    },
  };
}
