import { randomUUID } from 'node:crypto';
import { listChannels, loadConfig } from '../config/loader';
import { scriptSchema, type Script } from '../script/types';
import { WorkbenchStore } from './store';
import {
  approvedTopicArtifactSchema,
  createInitialStageStates,
  episodeStageOrder,
  getDownstreamStages,
  imageStageManifestSchema,
  packageManifestSchema,
  renderStageManifestSchema,
  reviewCommentSchema,
  scriptPoolArtifactSchema,
  shortsStageManifestSchema,
  ttsStageManifestSchema,
  topicCandidatesArtifactSchema,
  type PackageManifest,
  type EpisodeRecord,
  type EpisodeStage,
  type ReviewAnchor,
  type ReviewComment,
  type ReviewStatus,
  type ReviewWorkspace,
  type ApprovedTopicArtifact,
  type ImageStageManifest,
  type RenderStageManifest,
  type ScriptPoolArtifact,
  type ShortsStageManifest,
  type StageGenerationPayload,
  type StageVersion,
  type TopicCandidatesArtifact,
  type TtsStageManifest,
  type WorkbenchJob,
  type WorkbenchRecordKind,
} from './types';

export interface CreateEpisodeInput {
  channelId: string;
  title?: string;
  threadId?: string;
  parentRecordId?: string;
  originCandidateId?: string;
}

export interface CreateTopicCandidateBatchInput {
  channelId: string;
  count: number;
  category?: StageGenerationPayload['category'];
}

export interface CreateScriptCandidateBatchInput {
  channelId: string;
  sourceCandidateId: string;
  count: number;
  category?: StageGenerationPayload['category'];
  usePipeline?: boolean;
  approvedTopic?: string;
}

export interface PromoteCandidateToEpisodeInput {
  channelId: string;
  candidateId: string;
}

export interface BulkCandidateReviewInput {
  items: Array<{
    channelId: string;
    candidateId: string;
  }>;
  reviewStatus: Extract<ReviewStatus, 'approved' | 'pending_review' | 'changes_requested'>;
}

export interface BulkCandidateReviewResult {
  processed: Array<{
    channelId: string;
    candidateId: string;
    stage: EpisodeStage;
    version: number;
    reviewStatus: ReviewStatus;
  }>;
  skipped: Array<{
    channelId: string;
    candidateId: string;
    reason: string;
  }>;
}

export interface CreateStageVersionInput {
  channelId: string;
  episodeId: string;
  stage: EpisodeStage;
  reviewStatus?: ReviewStatus;
  sourceVersionIds?: string[];
  notes?: string;
}

export interface UpdateStageReviewStatusInput {
  channelId: string;
  episodeId: string;
  stage: EpisodeStage;
  version: number;
  reviewStatus: ReviewStatus;
  approvedTopic?: string;
}

export interface CreateJobInput {
  channelId: string;
  episodeId: string;
  stage: EpisodeStage;
  version: number;
  payload?: StageGenerationPayload;
}

export interface EnqueueStageGenerationInput {
  channelId: string;
  episodeId: string;
  stage: EpisodeStage;
  payload?: StageGenerationPayload;
  notes?: string;
}

export interface ScriptImpactSummary {
  changedSentenceIds: number[];
  affectedSceneIndices: number[];
}

export interface SaveScriptDraftInput {
  channelId: string;
  episodeId: string;
  script: unknown;
}

export interface SaveScriptDraftResult {
  episode: EpisodeRecord;
  version: StageVersion;
  artifact: Script;
  impact: ScriptImpactSummary;
}

export interface StageWorkflowSummary {
  stage: EpisodeStage;
  currentVersion: number;
  approvedVersion: number | null;
  reviewStatus: ReviewStatus;
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

export interface EpisodeWorkflowSummary {
  episode: EpisodeRecord;
  stages: StageWorkflowSummary[];
  jobs: WorkbenchJob[];
}

export interface WorkbenchChannelOption {
  id: string;
  name: string;
  targetLanguage: string;
  nativeLanguage: string;
}

export interface WorkbenchRecordSummary extends EpisodeRecord {
  previewText?: string;
  previewMeta?: string;
  nextAction?: string;
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
  lineageLabel?: string;
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

export type ApprovedStageArtifact =
  | ApprovedTopicArtifact
  | Script
  | ImageStageManifest
  | TtsStageManifest
  | RenderStageManifest
  | ShortsStageManifest
  | PackageManifest;

export type StageVersionArtifact =
  | TopicCandidatesArtifact
  | Script
  | ScriptPoolArtifact
  | ImageStageManifest
  | TtsStageManifest
  | RenderStageManifest
  | ShortsStageManifest
  | PackageManifest;

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
  workflowStatus: EpisodeRecord['workflowStatus'];
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  nextAction: string;
  issueCounts: NonNullable<WorkbenchRecordSummary['issueCounts']>;
  reviewTaskCounts: NonNullable<WorkbenchRecordSummary['reviewTaskCounts']>;
  lineageLabel: string;
}

export interface ThreadSummary {
  threadId: string;
  records: WorkbenchRecordSummary[];
}

export interface StageReviewContext {
  episode: WorkbenchRecordSummary;
  thread: ThreadSummary;
  stage: EpisodeStage;
  stageSummary: StageWorkflowSummary;
  currentArtifact: StageVersionArtifact | null;
  approvedArtifact: ApprovedStageArtifact | null;
  versions: StageVersion[];
  comments: ReviewComment[];
  downstream: Array<{
    stage: EpisodeStage;
    reviewStatus: ReviewStatus;
    staleReasons: string[];
    currentVersion: number;
    approvedVersion: number | null;
  }>;
}

export interface CreateReviewCommentInput {
  channelId: string;
  recordId: string;
  stage: EpisodeStage;
  version?: number;
  text: string;
  kind?: ReviewComment['kind'];
  status?: ReviewComment['status'];
  anchor?: ReviewAnchor;
}

export interface SavePackageDraftInput {
  channelId: string;
  episodeId: string;
  manifest: unknown;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createEpisodeId(): string {
  return `ep_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function createStageVersionId(stage: EpisodeStage, version: number): string {
  return `${stage}_v${version.toString().padStart(3, '0')}_${randomUUID().slice(0, 8)}`;
}

function createJobId(stage: EpisodeStage): string {
  return `job_${stage}_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

function createThreadId(): string {
  return `thread_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export class WorkbenchService {
  constructor(private readonly store: WorkbenchStore = new WorkbenchStore()) {}

  public getDataRoot(): string {
    return this.store.getDataRoot();
  }

  public async listEpisodes(channelId?: string): Promise<WorkbenchRecordSummary[]> {
    await this.store.ensureBaseDirs();
    const records = (await this.store.listEpisodes()).filter(
      (record) =>
        getRecordKind(record) === 'episode' &&
        record.workflowStatus !== 'archived' &&
        (!channelId || record.channelId === channelId)
    );
    return Promise.all(records.map((record) => this.toRecordSummary(record)));
  }

  public async listCandidates(channelId?: string): Promise<WorkbenchRecordSummary[]> {
    await this.store.ensureBaseDirs();
    const records = (await this.store.listEpisodes()).filter(
      (record) =>
        getRecordKind(record) !== 'episode' &&
        record.workflowStatus !== 'archived' &&
        (!channelId || record.channelId === channelId)
    );
    const summaries = await Promise.all(records.map((record) => this.toRecordSummary(record)));
    return filterContainerSummaries(summaries);
  }

  public async listReviewQueue(channelId?: string): Promise<ReviewQueueItem[]> {
    await this.store.ensureBaseDirs();
    const records = (await this.store.listEpisodes()).filter(
      (record) => record.workflowStatus !== 'archived' && (!channelId || record.channelId === channelId)
    );
    const summaries = filterContainerSummaries(
      await Promise.all(records.map((record) => this.toRecordSummary(record)))
    );

    return summaries
      .filter((summary) => isReviewQueueRecordKind(summary.kind))
      .map((summary) => ({
        id: `${summary.channelId}/${summary.id}`,
        workspace: getWorkspaceForSummary(summary),
        channelId: summary.channelId,
        recordId: summary.id,
        threadId: summary.threadId ?? summary.id,
        kind: getRecordKind(summary),
        title: summary.title ?? summary.previewText ?? summary.id,
        previewText: summary.previewText,
        previewMeta: summary.previewMeta,
        stage: summary.currentStage,
        workflowStatus: summary.workflowStatus,
        reviewStatus: summary.stageStates[summary.currentStage].reviewStatus,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        nextAction: summary.nextAction ?? getNextActionLabel(summary),
        issueCounts: summary.issueCounts ?? { open: 0, stale: 0, comments: 0 },
        reviewTaskCounts: summary.reviewTaskCounts ?? { reviewable: 0, blocked: 0, stale: 0 },
        lineageLabel: summary.lineageLabel ?? getLineageLabel(summary),
      }))
      .sort(compareReviewQueueItems);
  }

  public async getThreadSummary(threadId: string): Promise<ThreadSummary> {
    await this.store.ensureBaseDirs();
    const records = (await this.store.listEpisodes()).filter(
      (record) => (record.threadId ?? record.id) === threadId
    );
    const summaries = await Promise.all(records.map((record) => this.toRecordSummary(record)));

    return {
      threadId,
      records: summaries.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    };
  }

  public async listComments(channelId: string, recordId: string): Promise<ReviewComment[]> {
    return this.store.listComments(channelId, recordId);
  }

  public async createComment(input: CreateReviewCommentInput): Promise<ReviewComment> {
    const timestamp = nowIso();
    const comment = reviewCommentSchema.parse({
      id: `comment_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      channelId: input.channelId,
      recordId: input.recordId,
      stage: input.stage,
      version: input.version,
      kind: input.kind ?? 'issue',
      status: input.status ?? 'open',
      text: input.text,
      anchor: input.anchor,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const comments = await this.store.listComments(input.channelId, input.recordId);
    comments.unshift(comment);
    await this.store.saveComments(input.channelId, input.recordId, comments);

    const episode = await this.store.getEpisode(input.channelId, input.recordId);
    episode.lastHumanActionAt = timestamp;
    episode.updatedAt = timestamp;
    await this.store.saveEpisode(episode);

    return comment;
  }

  public async getStageReviewContext(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<StageReviewContext> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const summary = await this.toRecordSummary(episode);
    const workflow = await this.getEpisodeWorkflow(channelId, episodeId);
    const stageSummary = workflow.stages.find((candidate) => candidate.stage === stage);
    if (!stageSummary) {
      throw new Error(`Stage ${stage} is not available for record ${episodeId}`);
    }

    const [currentArtifact, approvedArtifact, versions, comments, thread] = await Promise.all([
      this.tryGetCurrentStageArtifact(channelId, episodeId, stage),
      this.tryGetApprovedStageArtifact(channelId, episodeId, stage),
      this.listStageVersions(channelId, episodeId, stage),
      this.listComments(channelId, episodeId),
      this.getThreadSummary(summary.threadId ?? summary.id),
    ]);

    return {
      episode: summary,
      thread,
      stage,
      stageSummary,
      currentArtifact,
      approvedArtifact,
      versions,
      comments: comments.filter((comment) => comment.stage === stage),
      downstream: getDownstreamStagesForRecord(episode, stage).map((downstreamStage) => {
        const downstreamState = episode.stageStates[downstreamStage];
        return {
          stage: downstreamStage,
          reviewStatus: normalizeReviewStatus(downstreamState.reviewStatus),
          staleReasons: downstreamState.staleReasons ?? [],
          currentVersion: downstreamState.currentVersion,
          approvedVersion: downstreamState.approvedVersion,
        };
      }),
    };
  }

  public async listChannelOptions(): Promise<WorkbenchChannelOption[]> {
    const channelIds = await listChannels();
    const options = await Promise.all(
      channelIds.map(async (channelId) => {
        try {
          const config = await loadConfig(channelId);
          return {
            id: config.channelId,
            name: config.meta.name,
            targetLanguage: config.meta.targetLanguage,
            nativeLanguage: config.meta.nativeLanguage,
          } satisfies WorkbenchChannelOption;
        } catch {
          return null;
        }
      })
    );

    return options
      .filter((option): option is WorkbenchChannelOption => option !== null)
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name, 'ko') || left.id.localeCompare(right.id)
      );
  }

  public async getEpisode(channelId: string, episodeId: string): Promise<EpisodeRecord> {
    return this.store.getEpisode(channelId, episodeId);
  }

  public async createEpisode(input: CreateEpisodeInput): Promise<EpisodeRecord> {
    return this.createRecord('episode', input);
  }

  public async archiveRecord(channelId: string, episodeId: string): Promise<EpisodeRecord> {
    const record = await this.store.getEpisode(channelId, episodeId);
    if (record.workflowStatus === 'archived') {
      return record;
    }

    const timestamp = nowIso();
    record.workflowStatus = 'archived';
    record.updatedAt = timestamp;
    record.lastHumanActionAt = timestamp;
    await this.store.saveEpisode(record);
    return record;
  }

  public async createTopicCandidateBatch(
    input: CreateTopicCandidateBatchInput
  ): Promise<{ candidates: EpisodeRecord[]; jobs: WorkbenchJob[] }> {
    const pool = await this.createRecord('topic_pool', { channelId: input.channelId });
    const { job } = await this.enqueueStageGeneration({
      channelId: pool.channelId,
      episodeId: pool.id,
      stage: 'topic',
      payload: {
        category: input.category,
        candidateCount: input.count,
      },
      notes: `Topic pool generation (${input.count} candidates)`,
    });

    return {
      candidates: [await this.getEpisode(pool.channelId, pool.id)],
      jobs: [job],
    };
  }

  public async createScriptCandidateBatch(
    input: CreateScriptCandidateBatchInput
  ): Promise<{ candidates: EpisodeRecord[]; jobs: WorkbenchJob[] }> {
    const sourceCandidate = await this.getEpisode(input.channelId, input.sourceCandidateId);
    assertTopicReviewSourceRecord(sourceCandidate, input.sourceCandidateId);

    const sourceTopicVersionNumber =
      sourceCandidate.stageStates.topic.approvedVersion ?? sourceCandidate.stageStates.topic.currentVersion;
    if (!sourceTopicVersionNumber) {
      throw new Error(`No generated topic version found for candidate ${input.sourceCandidateId}`);
    }

    const sourceTopicVersion = await this.store.getStageVersion(
      input.channelId,
      input.sourceCandidateId,
      'topic',
      sourceTopicVersionNumber
    );
    const topicCandidatesArtifact = await this.store.readStageArtifactJson<unknown>(
      input.channelId,
      input.sourceCandidateId,
      'topic',
      sourceTopicVersionNumber,
      'candidates.json'
    );
    const approvedTopic =
      sourceCandidate.stageStates.topic.approvedVersion !== null
        ? await this.getApprovedTopic(input.channelId, input.sourceCandidateId)
        : await this.persistApprovedTopicArtifact(
            input.channelId,
            input.sourceCandidateId,
            sourceTopicVersionNumber,
            input.approvedTopic
          );

    if (sourceCandidate.stageStates.topic.approvedVersion === null) {
      const { recordApprovedTopic } = await import('../script/topic-selector');
      await recordApprovedTopic(approvedTopic.approvedTopic, approvedTopic.category);
    }

    const candidate = await this.createRecord('script_pool', {
      channelId: input.channelId,
      threadId: sourceCandidate.id,
      parentRecordId: sourceCandidate.id,
      originCandidateId: sourceCandidate.originCandidateId ?? sourceCandidate.id,
    });
    const timestamp = nowIso();
    const clonedTopicVersion: StageVersion = {
      id: createStageVersionId('topic', 1),
      episodeId: candidate.id,
      stage: 'topic',
      version: 1,
      reviewStatus: 'approved',
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceVersionIds: [sourceTopicVersion.id],
      notes: `Cloned from topic pool ${sourceCandidate.id}`,
    };

    candidate.stageStates.topic.currentVersion = 1;
    candidate.stageStates.topic.approvedVersion = 1;
    candidate.stageStates.topic.reviewStatus = 'approved';
    candidate.stageStates.topic.staleReasons = [];
    candidate.currentStage = 'script';
    candidate.workflowStatus = 'in_progress';
    candidate.title = approvedTopic.approvedTopic;
    candidate.titleSource = 'topic_auto';
    candidate.updatedAt = timestamp;
    candidate.lastHumanActionAt = timestamp;

    await this.store.saveStageVersion(candidate.channelId, candidate.id, clonedTopicVersion);
    await this.store.saveStageArtifactJson(
      candidate.channelId,
      candidate.id,
      'topic',
      1,
      'candidates.json',
      topicCandidatesArtifact
    );
    await this.store.saveStageArtifactJson(
      candidate.channelId,
      candidate.id,
      'topic',
      1,
      'approved.json',
      approvedTopic
    );
    await this.store.saveEpisode(candidate);

    sourceCandidate.updatedAt = timestamp;
    sourceCandidate.lastHumanActionAt = timestamp;
    await this.store.saveEpisode(sourceCandidate);

    const { job } = await this.enqueueStageGeneration({
      channelId: candidate.channelId,
      episodeId: candidate.id,
      stage: 'script',
      payload: {
        category: input.category,
        usePipeline: input.usePipeline ?? true,
        candidateCount: input.count,
      },
      notes: `Script pool generation (${input.count} candidates) from topic batch ${sourceCandidate.id}`,
    });

    return {
      candidates: [await this.getEpisode(candidate.channelId, candidate.id)],
      jobs: [job],
    };
  }

  public async materializeTopicBatchCandidates(
    channelId: string,
    batchId: string,
    version: number,
    artifact: TopicCandidatesArtifact
  ): Promise<EpisodeRecord[]> {
    const batch = await this.getEpisode(channelId, batchId);
    assertTopicPoolRecord(batch, batchId);
    const sourceVersion = await this.store.getStageVersion(channelId, batchId, 'topic', version);

    await this.archiveChildCandidates(batch.channelId, batch.id, ['topic_candidate']);

    const created: EpisodeRecord[] = [];
    for (const [index, topic] of artifact.candidates.entries()) {
      const candidate = await this.createRecord('topic_candidate', {
        channelId: batch.channelId,
        threadId: batch.id,
        parentRecordId: batch.id,
        title: topic,
      });
      candidate.originCandidateId = candidate.id;
      await this.store.saveEpisode(candidate);

      const topicVersion = await this.createStageVersion({
        channelId: candidate.channelId,
        episodeId: candidate.id,
        stage: 'topic',
        reviewStatus: 'pending_review',
        sourceVersionIds: [sourceVersion.id],
        notes: `Derived from topic batch ${batch.id} candidate #${index + 1}`,
      });

      await this.store.saveStageArtifactJson(
        candidate.channelId,
        candidate.id,
        'topic',
        topicVersion.version,
        'candidates.json',
        {
          generatedAt: artifact.generatedAt,
          category: artifact.category,
          candidates: [topic],
          recommendedTopic: topic,
        } satisfies TopicCandidatesArtifact
      );

      created.push(await this.getEpisode(candidate.channelId, candidate.id));
    }

    batch.updatedAt = nowIso();
    await this.store.saveEpisode(batch);
    return created;
  }

  public async materializeScriptBatchCandidates(
    channelId: string,
    batchId: string,
    version: number,
    artifact: ScriptPoolArtifact
  ): Promise<EpisodeRecord[]> {
    const batch = await this.getEpisode(channelId, batchId);
    assertScriptPoolRecord(batch, batchId);

    const sourceScriptVersion = await this.store.getStageVersion(channelId, batchId, 'script', version);
    const sourceTopicVersionNumber = batch.stageStates.topic.approvedVersion ?? batch.stageStates.topic.currentVersion;
    if (!sourceTopicVersionNumber) {
      throw new Error(`Script batch ${batchId} has no source topic version`);
    }

    const sourceTopicVersion = await this.store.getStageVersion(
      channelId,
      batchId,
      'topic',
      sourceTopicVersionNumber
    );
    const topicCandidatesArtifact = await this.store.readStageArtifactJson<unknown>(
      channelId,
      batchId,
      'topic',
      sourceTopicVersionNumber,
      'candidates.json'
    );
    const approvedTopicArtifact = await this.getApprovedTopic(channelId, batchId);

    await this.archiveChildCandidates(batch.channelId, batch.id, ['script_candidate']);

    const created: EpisodeRecord[] = [];
    for (const [index, script] of artifact.candidates.entries()) {
      const candidate = await this.createRecord('script_candidate', {
        channelId: batch.channelId,
        threadId: batch.threadId ?? batch.id,
        parentRecordId: batch.id,
        originCandidateId: batch.originCandidateId ?? batch.parentRecordId ?? batch.id,
        title: getPreferredEpisodeTitle(script),
      });
      await this.store.saveEpisode(candidate);

      const topicVersion = await this.createStageVersion({
        channelId: candidate.channelId,
        episodeId: candidate.id,
        stage: 'topic',
        reviewStatus: 'approved',
        sourceVersionIds: [sourceTopicVersion.id],
        notes: `Cloned from script batch ${batch.id}`,
      });
      await this.store.saveStageArtifactJson(
        candidate.channelId,
        candidate.id,
        'topic',
        topicVersion.version,
        'candidates.json',
        topicCandidatesArtifact
      );
      await this.store.saveStageArtifactJson(
        candidate.channelId,
        candidate.id,
        'topic',
        topicVersion.version,
        'approved.json',
        approvedTopicArtifact
      );
      await this.updateStageReviewStatus({
        channelId: candidate.channelId,
        episodeId: candidate.id,
        stage: 'topic',
        version: topicVersion.version,
        reviewStatus: 'approved',
        approvedTopic: approvedTopicArtifact.approvedTopic,
      });

      const scriptVersion = await this.createStageVersion({
        channelId: candidate.channelId,
        episodeId: candidate.id,
        stage: 'script',
        reviewStatus: 'pending_review',
        sourceVersionIds: [sourceScriptVersion.id],
        notes: `Derived from script batch ${batch.id} candidate #${index + 1}`,
      });
      await this.store.saveStageArtifactJson(
        candidate.channelId,
        candidate.id,
        'script',
        scriptVersion.version,
        'generated-script.json',
        {
          generatedAt: artifact.generatedAt,
          category: artifact.category,
          topic: artifact.topic,
          recommendedCandidateIndex: 0,
          selectedCandidateIndex: 0,
          candidates: [script],
          currentDraft: script,
        } satisfies ScriptPoolArtifact
      );
      await this.syncEpisodeTitleFromScript(candidate.channelId, candidate.id, script);

      created.push(await this.getEpisode(candidate.channelId, candidate.id));
    }

    batch.updatedAt = nowIso();
    await this.store.saveEpisode(batch);
    return created;
  }

  public async promoteCandidateToEpisode(
    input: PromoteCandidateToEpisodeInput
  ): Promise<{ episode: EpisodeRecord }> {
    const candidate = await this.getEpisode(input.channelId, input.candidateId);
    assertScriptReviewSourceRecord(candidate, input.candidateId);

    const approvedTopic = await this.getApprovedTopic(input.channelId, input.candidateId);
    const approvedScript = await this.getApprovedScript(input.channelId, input.candidateId);
    const sourceTopicVersionNumber = candidate.stageStates.topic.approvedVersion;
    const sourceScriptVersionNumber = candidate.stageStates.script.approvedVersion;
    if (!sourceTopicVersionNumber || !sourceScriptVersionNumber) {
      throw new Error(`Candidate ${input.candidateId} must have approved topic and script`);
    }

    const sourceTopicVersion = await this.store.getStageVersion(
      input.channelId,
      input.candidateId,
      'topic',
      sourceTopicVersionNumber
    );
    const sourceScriptVersion = await this.store.getStageVersion(
      input.channelId,
      input.candidateId,
      'script',
      sourceScriptVersionNumber
    );
    const topicCandidatesArtifact = await this.store.readStageArtifactJson<unknown>(
      input.channelId,
      input.candidateId,
      'topic',
      sourceTopicVersionNumber,
      'candidates.json'
    );

    const episode = await this.createRecord('episode', {
      channelId: input.channelId,
      threadId: candidate.threadId ?? candidate.id,
      parentRecordId: candidate.id,
      originCandidateId: candidate.originCandidateId ?? candidate.id,
      title: candidate.title ?? getPreferredEpisodeTitle(approvedScript),
    });
    const timestamp = nowIso();

    episode.currentStage = 'image';
    episode.workflowStatus = 'in_progress';
    episode.stageStates.topic.currentVersion = 1;
    episode.stageStates.topic.approvedVersion = 1;
    episode.stageStates.topic.reviewStatus = 'approved';
    episode.stageStates.topic.staleReasons = [];
    episode.stageStates.script.currentVersion = 1;
    episode.stageStates.script.approvedVersion = 1;
    episode.stageStates.script.reviewStatus = 'approved';
    episode.stageStates.script.staleReasons = [];
    episode.updatedAt = timestamp;
    episode.lastHumanActionAt = timestamp;

    const topicVersion: StageVersion = {
      id: createStageVersionId('topic', 1),
      episodeId: episode.id,
      stage: 'topic',
      version: 1,
      reviewStatus: 'approved',
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceVersionIds: [sourceTopicVersion.id],
      notes: `Promoted from candidate ${candidate.id}`,
    };
    const scriptVersion: StageVersion = {
      id: createStageVersionId('script', 1),
      episodeId: episode.id,
      stage: 'script',
      version: 1,
      reviewStatus: 'approved',
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceVersionIds: [sourceScriptVersion.id],
      notes: `Promoted from candidate ${candidate.id}`,
    };

    await this.store.saveStageVersion(episode.channelId, episode.id, topicVersion);
    await this.store.saveStageVersion(episode.channelId, episode.id, scriptVersion);
    await this.store.saveStageArtifactJson(
      episode.channelId,
      episode.id,
      'topic',
      1,
      'candidates.json',
      topicCandidatesArtifact
    );
    await this.store.saveStageArtifactJson(
      episode.channelId,
      episode.id,
      'topic',
      1,
      'approved.json',
      approvedTopic
    );
    await this.store.saveStageArtifactJson(
      episode.channelId,
      episode.id,
      'script',
      1,
      'generated-script.json',
      approvedScript
    );
    await this.store.saveStageArtifactJson(
      episode.channelId,
      episode.id,
      'script',
      1,
      'approved-script.json',
      approvedScript
    );
    await this.store.saveEpisode(episode);

    candidate.workflowStatus = 'archived';
    candidate.updatedAt = timestamp;
    candidate.lastHumanActionAt = timestamp;
    await this.store.saveEpisode(candidate);

    return { episode };
  }

  public async bulkReviewCandidates(
    input: BulkCandidateReviewInput
  ): Promise<BulkCandidateReviewResult> {
    const processed: BulkCandidateReviewResult['processed'] = [];
    const skipped: BulkCandidateReviewResult['skipped'] = [];

    for (const item of input.items) {
      try {
        const candidate = await this.getEpisode(item.channelId, item.candidateId);
        if (getRecordKind(candidate) === 'episode') {
          throw new Error(`Record ${item.candidateId} is not a review pool`);
        }

        const stage = candidate.currentStage;
        if (!isCandidateReviewStage(stage)) {
          skipped.push({
            channelId: item.channelId,
            candidateId: item.candidateId,
            reason: `Current stage ${stage} is not reviewable in the candidate funnel`,
          });
          continue;
        }

        const stageState = candidate.stageStates[stage];
        if (stageState.currentVersion <= 0) {
          skipped.push({
            channelId: item.channelId,
            candidateId: item.candidateId,
            reason: `Stage ${stage} has no generated version`,
          });
          continue;
        }

        const canApply =
          input.reviewStatus === 'approved'
            ? stageState.reviewStatus === 'pending_review'
            : stageState.reviewStatus === 'pending_review' ||
              stageState.reviewStatus === 'approved';
        if (!canApply) {
          skipped.push({
            channelId: item.channelId,
            candidateId: item.candidateId,
            reason: `Stage ${stage} is ${stageState.reviewStatus} and cannot be marked ${input.reviewStatus}`,
          });
          continue;
        }

        const result = await this.updateStageReviewStatus({
          channelId: item.channelId,
          episodeId: item.candidateId,
          stage,
          version: stageState.currentVersion,
          reviewStatus: input.reviewStatus,
        });

        processed.push({
          channelId: item.channelId,
          candidateId: item.candidateId,
          stage,
          version: result.version.version,
          reviewStatus: result.version.reviewStatus,
        });
      } catch (error) {
        skipped.push({
          channelId: item.channelId,
          candidateId: item.candidateId,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      processed,
      skipped,
    };
  }

  private async archiveChildCandidates(
    channelId: string,
    parentRecordId: string,
    kinds: WorkbenchRecordKind[]
  ): Promise<void> {
    const records = (await this.store.listEpisodes()).filter(
      (record) =>
        record.channelId === channelId &&
        record.parentRecordId === parentRecordId &&
        kinds.includes(getRecordKind(record)) &&
        record.workflowStatus !== 'archived'
    );

    if (records.length === 0) {
      return;
    }

    const timestamp = nowIso();
    for (const record of records) {
      record.workflowStatus = 'archived';
      record.updatedAt = timestamp;
      await this.store.saveEpisode(record);
    }
  }

  private async createRecord(
    kind: WorkbenchRecordKind,
    input: CreateEpisodeInput
  ): Promise<EpisodeRecord> {
    await this.store.ensureBaseDirs();
    const timestamp = nowIso();
    const threadId = input.threadId ?? createThreadId();
    const record: EpisodeRecord = {
      id: createEpisodeId(),
      channelId: input.channelId,
      kind,
      threadId,
      parentRecordId: input.parentRecordId,
      originCandidateId: input.originCandidateId,
      title: input.title,
      titleSource: input.title ? 'manual' : undefined,
      workflowStatus: 'draft',
      currentStage: 'topic',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastHumanActionAt: timestamp,
      stageStates: createInitialStageStates(),
    };

    await this.store.saveEpisode(record);
    return record;
  }

  private async toRecordSummary(record: EpisodeRecord): Promise<WorkbenchRecordSummary> {
    const normalizedRecord = normalizeRecordReviewStatuses(record);
    const summary: WorkbenchRecordSummary = {
      ...normalizedRecord,
      kind: getRecordKind(normalizedRecord),
    };
    const stage = normalizedRecord.currentStage;
    const version = normalizedRecord.stageStates[stage].currentVersion;
    const comments = await this.store.listComments(record.channelId, record.id);

    summary.nextAction = getNextActionLabel(normalizedRecord);
    summary.issueCounts = {
      open: comments.filter((comment) => comment.status === 'open').length,
      stale: getVisibleStagesForRecord(normalizedRecord).filter(
        (candidateStage) => normalizedRecord.stageStates[candidateStage].reviewStatus === 'stale'
      ).length,
      comments: comments.length,
    };
    summary.reviewTaskCounts = {
      reviewable: getVisibleStagesForRecord(normalizedRecord).filter((candidateStage) => {
        const state = normalizedRecord.stageStates[candidateStage];
        return state.currentVersion > 0 && state.reviewStatus === 'pending_review';
      }).length,
      blocked: getVisibleStagesForRecord(normalizedRecord).filter((candidateStage) =>
        normalizedRecord.stageStates[candidateStage].blockedBy.some(
          (dependency) => normalizedRecord.stageStates[dependency].approvedVersion === null
        )
      ).length,
      stale: getVisibleStagesForRecord(normalizedRecord).filter(
        (candidateStage) => normalizedRecord.stageStates[candidateStage].reviewStatus === 'stale'
      ).length,
    };
    summary.lineageLabel = getLineageLabel(normalizedRecord);

    if (version <= 0) {
      return summary;
    }

    try {
      if (stage === 'topic') {
        const artifact = topicCandidatesArtifactSchema.parse(
          await this.store.readStageArtifactJson<unknown>(
            record.channelId,
            record.id,
            'topic',
            version,
            'candidates.json'
          )
        );
        summary.previewText = artifact.recommendedTopic;
        summary.previewMeta = `${artifact.category} · ${artifact.candidates.length} candidates`;
        return summary;
      }

      if (stage === 'script') {
        const artifact = await this.getStageVersionArtifact(record.channelId, record.id, 'script', version);
        const currentScript = getEditableScriptFromStageArtifact(artifact);
        summary.previewText = getPreferredEpisodeTitle(currentScript);
        summary.previewMeta =
          'candidates' in artifact
            ? `${currentScript.category} · ${currentScript.metadata.topic} · ${artifact.candidates.length} candidates`
            : `${currentScript.category} · ${currentScript.metadata.topic}`;
      }
    } catch {
      return summary;
    }

    return summary;
  }

  public async createStageVersion(input: CreateStageVersionInput): Promise<StageVersion> {
    const episode = await this.store.getEpisode(input.channelId, input.episodeId);
    assertStageSupported(episode, input.stage);
    const stageState = episode.stageStates[input.stage];
    const nextVersion = stageState.currentVersion + 1;
    const timestamp = nowIso();

    const normalizedReviewStatus = normalizeReviewStatus(input.reviewStatus ?? 'draft');
    const versionRecord: StageVersion = {
      id: createStageVersionId(input.stage, nextVersion),
      episodeId: episode.id,
      stage: input.stage,
      version: nextVersion,
      reviewStatus: normalizedReviewStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceVersionIds: input.sourceVersionIds ?? [],
      notes: input.notes,
    };

    stageState.currentVersion = nextVersion;
    stageState.reviewStatus = versionRecord.reviewStatus;
    stageState.staleReasons = [];
    episode.currentStage = input.stage;
    episode.workflowStatus =
      versionRecord.reviewStatus === 'pending_review' ? 'awaiting_review' : 'in_progress';
    episode.updatedAt = timestamp;

    await this.store.saveStageVersion(input.channelId, input.episodeId, versionRecord);
    await this.store.saveEpisode(episode);
    return versionRecord;
  }

  public async updateStageReviewStatus(
    input: UpdateStageReviewStatusInput
  ): Promise<{ episode: EpisodeRecord; version: StageVersion }> {
    const episode = await this.store.getEpisode(input.channelId, input.episodeId);
    assertStageSupported(episode, input.stage);
    const version = await this.store.getStageVersion(
      input.channelId,
      input.episodeId,
      input.stage,
      input.version
    );
    const timestamp = nowIso();
    const normalizedReviewStatus = normalizeReviewStatus(input.reviewStatus);

    version.reviewStatus = normalizedReviewStatus;
    version.updatedAt = timestamp;

    const stageState = episode.stageStates[input.stage];
    stageState.reviewStatus = normalizedReviewStatus;
    stageState.staleReasons = [];

    if (normalizedReviewStatus === 'approved') {
      if (input.stage === 'topic') {
        const artifact = await this.persistApprovedTopicArtifact(
          input.channelId,
          input.episodeId,
          input.version,
          input.approvedTopic
        );
        const { recordApprovedTopic } = await import('../script/topic-selector');
        await recordApprovedTopic(artifact.approvedTopic, artifact.category);
        this.applyAutoTopicTitle(episode, artifact.approvedTopic);
      } else if (input.stage === 'script') {
        const approvedScript = await this.persistApprovedScriptArtifact(
          input.channelId,
          input.episodeId,
          input.version
        );
        this.applyAutoScriptTitle(episode, approvedScript);
      }

      stageState.approvedVersion = input.version;

      this.markExistingDownstreamStagesStale(episode, input.stage);

      const nextStage = getNextAvailableStage(episode);
      episode.currentStage = nextStage;
      episode.workflowStatus = getWorkflowStatusAfterApproval(episode, nextStage);
    } else if (normalizedReviewStatus === 'pending_review') {
      episode.workflowStatus = 'awaiting_review';
      episode.currentStage = input.stage;
    } else {
      episode.workflowStatus = 'in_progress';
      episode.currentStage = input.stage;
    }

    episode.updatedAt = timestamp;
    episode.lastHumanActionAt = timestamp;

    await this.store.saveStageVersion(input.channelId, input.episodeId, version);
    await this.store.saveEpisode(episode);
    return { episode, version };
  }

  public async createJob(input: CreateJobInput): Promise<WorkbenchJob> {
    const timestamp = nowIso();
    const job: WorkbenchJob = {
      id: createJobId(input.stage),
      channelId: input.channelId,
      episodeId: input.episodeId,
      kind: 'generate_stage',
      stage: input.stage,
      version: input.version,
      status: 'queued',
      payload: input.payload ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.store.saveJob(input.channelId, input.episodeId, job);
    return job;
  }

  public async listJobs(channelId: string, episodeId: string): Promise<WorkbenchJob[]> {
    return this.store.listJobs(channelId, episodeId);
  }

  public async listStageVersions(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<StageVersion[]> {
    const versions = await this.store.listStageVersions(channelId, episodeId, stage);
    return versions.map((version) => ({
      ...version,
      reviewStatus: normalizeReviewStatus(version.reviewStatus),
    }));
  }

  public async listQueuedJobs(): Promise<WorkbenchJob[]> {
    return this.store.listQueuedJobs();
  }

  public async getLiveStatus(): Promise<WorkbenchLiveStatus> {
    const jobs = await this.store.listAllJobs();
    const activeJobs = jobs.filter((job) => job.status === 'queued' || job.status === 'running');

    return {
      queuedJobs: jobs.filter((job) => job.status === 'queued').length,
      runningJobs: jobs.filter((job) => job.status === 'running').length,
      failedJobs: jobs.filter((job) => job.status === 'failed').length,
      completedJobs: jobs.filter((job) => job.status === 'completed').length,
      activeJobCount: activeJobs.length,
      activeRecordCount: new Set(activeJobs.map((job) => `${job.channelId}/${job.episodeId}`))
        .size,
      lastUpdatedAt: jobs[0]?.updatedAt ?? null,
    };
  }

  public async getEpisodeWorkflow(
    channelId: string,
    episodeId: string
  ): Promise<EpisodeWorkflowSummary> {
    const episode = await this.getEpisode(channelId, episodeId);
    const jobs = await this.listJobs(channelId, episodeId);
    const visibleStages = getVisibleStagesForRecord(episode);

    const stages = visibleStages.map((stage) => {
      const stageState = episode.stageStates[stage];
      const reviewStatus = normalizeReviewStatus(stageState.reviewStatus);
      const stageJobs = jobs.filter((job) => job.stage === stage);
      const latestJob = stageJobs[0] ?? null;
      const queuedJobCount = stageJobs.filter((job) => job.status === 'queued').length;
      const runningJobCount = stageJobs.filter((job) => job.status === 'running').length;
      const failedJobCount = stageJobs.filter((job) => job.status === 'failed').length;
      const completedJobCount = stageJobs.filter((job) => job.status === 'completed').length;
      const isBlocked = stageState.blockedBy.some(
        (dependencyStage) => episode.stageStates[dependencyStage].approvedVersion === null
      );

      return {
        stage,
        currentVersion: stageState.currentVersion,
        approvedVersion: stageState.approvedVersion,
        reviewStatus,
        blockedBy: stageState.blockedBy,
        staleReasons: stageState.staleReasons ?? [],
        isBlocked,
        latestJob,
        queuedJobCount,
        runningJobCount,
        failedJobCount,
        completedJobCount,
        canGenerate: !isBlocked,
        canApprove: stageState.currentVersion > 0 && reviewStatus === 'pending_review',
        canRequestChanges: false,
      } satisfies StageWorkflowSummary;
    });

    return {
      episode,
      stages,
      jobs,
    };
  }

  public async updateJob(job: WorkbenchJob): Promise<void> {
    await this.store.saveJob(job.channelId, job.episodeId, job);
  }

  public async enqueueStageGeneration(
    input: EnqueueStageGenerationInput
  ): Promise<{ version: StageVersion; job: WorkbenchJob }> {
    const episode = await this.store.getEpisode(input.channelId, input.episodeId);
    assertStageSupported(episode, input.stage);

    if (input.payload?.targetVersion) {
      return this.enqueueStageRegeneration(input, input.payload.targetVersion);
    }

    const version = await this.createStageVersion({
      channelId: input.channelId,
      episodeId: input.episodeId,
      stage: input.stage,
      reviewStatus: 'draft',
      notes: input.notes,
    });

    const job = await this.createJob({
      channelId: input.channelId,
      episodeId: input.episodeId,
      stage: input.stage,
      version: version.version,
      payload: input.payload,
    });

    return { version, job };
  }

  public async saveScriptDraft(input: SaveScriptDraftInput): Promise<SaveScriptDraftResult> {
    const nextScript = scriptSchema.parse(input.script);
    let episode = await this.store.getEpisode(input.channelId, input.episodeId);
    const recordKind = getRecordKind(episode);
    let targetVersion: StageVersion;
    let previousScript: Script | null = null;
    let previousArtifact: StageVersionArtifact | null = null;

    if (episode.stageStates.script.currentVersion <= 0) {
      targetVersion = await this.createStageVersion({
        channelId: input.channelId,
        episodeId: input.episodeId,
        stage: 'script',
        reviewStatus: 'draft',
        notes: 'Manual script draft',
      });
      episode = await this.store.getEpisode(input.channelId, input.episodeId);
    } else if (episode.stageStates.script.currentVersion === episode.stageStates.script.approvedVersion) {
      const forked = await this.forkCurrentStageVersion({
        channelId: input.channelId,
        episodeId: input.episodeId,
        stage: 'script',
        reviewStatus: 'draft',
        notes: 'Forked for manual script edits',
      });
      targetVersion = forked.version;
      previousArtifact = forked.sourceArtifact;
      previousScript = getEditableScriptFromStageArtifact(forked.sourceArtifact);
      episode = await this.store.getEpisode(input.channelId, input.episodeId);
    } else {
      targetVersion = await this.store.getStageVersion(
        input.channelId,
        input.episodeId,
        'script',
        episode.stageStates.script.currentVersion
      );
      previousArtifact = await this.getStageVersionArtifact(
        input.channelId,
        input.episodeId,
        'script',
        targetVersion.version
      );
      previousScript = getEditableScriptFromStageArtifact(previousArtifact);
    }

    const timestamp = nowIso();
    const impact = calculateScriptImpact(previousScript, nextScript);

    targetVersion.reviewStatus = 'pending_review';
    targetVersion.updatedAt = timestamp;
    episode.stageStates.script.reviewStatus = 'pending_review';
    episode.stageStates.script.staleReasons = [];
    episode.currentStage = 'script';
    episode.workflowStatus = 'awaiting_review';
    this.applyAutoScriptTitle(episode, nextScript);
    episode.updatedAt = timestamp;
    episode.lastHumanActionAt = timestamp;
    this.markExistingDownstreamStagesStale(episode, 'script');

    await this.store.saveStageArtifactJson(
      input.channelId,
      input.episodeId,
      'script',
      targetVersion.version,
      'generated-script.json',
      recordKind === 'script_pool'
        ? buildScriptPoolArtifact(previousArtifact, nextScript)
        : nextScript
    );
    await this.store.saveStageVersion(input.channelId, input.episodeId, targetVersion);
    await this.store.saveEpisode(episode);

    return {
      episode,
      version: targetVersion,
      artifact: nextScript,
      impact,
    };
  }

  public async savePackageDraft(input: SavePackageDraftInput): Promise<{
    episode: EpisodeRecord;
    version: StageVersion;
    artifact: PackageManifest;
  }> {
    const nextManifest = packageManifestSchema.parse(input.manifest);
    let episode = await this.store.getEpisode(input.channelId, input.episodeId);
    let targetVersion: StageVersion;

    if (episode.stageStates.package.currentVersion <= 0) {
      targetVersion = await this.createStageVersion({
        channelId: input.channelId,
        episodeId: input.episodeId,
        stage: 'package',
        reviewStatus: 'draft',
        notes: 'Manual package draft',
      });
      episode = await this.store.getEpisode(input.channelId, input.episodeId);
    } else if (
      episode.stageStates.package.currentVersion === episode.stageStates.package.approvedVersion
    ) {
      const forked = await this.forkCurrentStageVersion({
        channelId: input.channelId,
        episodeId: input.episodeId,
        stage: 'package',
        reviewStatus: 'draft',
        notes: 'Forked for manual package edits',
      });
      targetVersion = forked.version;
      episode = await this.store.getEpisode(input.channelId, input.episodeId);
    } else {
      targetVersion = await this.store.getStageVersion(
        input.channelId,
        input.episodeId,
        'package',
        episode.stageStates.package.currentVersion
      );
    }

    const timestamp = nowIso();
    targetVersion.reviewStatus = 'pending_review';
    targetVersion.updatedAt = timestamp;
    episode.stageStates.package.reviewStatus = 'pending_review';
    episode.stageStates.package.staleReasons = [];
    episode.currentStage = 'package';
    episode.workflowStatus = 'awaiting_review';
    episode.updatedAt = timestamp;
    episode.lastHumanActionAt = timestamp;

    await this.store.saveStageArtifactJson(
      input.channelId,
      input.episodeId,
      'package',
      targetVersion.version,
      'manifest.json',
      nextManifest
    );
    await this.store.saveStageVersion(input.channelId, input.episodeId, targetVersion);
    await this.store.saveEpisode(episode);

    return {
      episode,
      version: targetVersion,
      artifact: nextManifest,
    };
  }

  public async syncEpisodeTitleFromScript(
    channelId: string,
    episodeId: string,
    script: Script
  ): Promise<EpisodeRecord> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const didChange = this.applyAutoScriptTitle(episode, script);

    if (!didChange) {
      return episode;
    }

    episode.updatedAt = nowIso();
    await this.store.saveEpisode(episode);
    return episode;
  }

  private async enqueueStageRegeneration(
    input: EnqueueStageGenerationInput,
    targetVersion: number
  ): Promise<{ version: StageVersion; job: WorkbenchJob }> {
    const episode = await this.store.getEpisode(input.channelId, input.episodeId);
    assertStageSupported(episode, input.stage);
    const stageState = episode.stageStates[input.stage];

    if (stageState.currentVersion !== targetVersion) {
      throw new Error(
        `Stage ${input.stage} can only regenerate the current version v${String(stageState.currentVersion).padStart(3, '0')}`
      );
    }

    if (stageState.approvedVersion === targetVersion) {
      if (stageState.reviewStatus !== 'stale') {
        throw new Error(
          `Stage ${input.stage} v${String(targetVersion).padStart(3, '0')} is approved. Create a new version instead of mutating it.`
        );
      }

      const forked = await this.forkCurrentStageVersion({
        channelId: input.channelId,
        episodeId: input.episodeId,
        stage: input.stage,
        reviewStatus: 'draft',
        notes: input.notes ?? 'Forked for targeted regeneration',
      });
      const job = await this.createJob({
        channelId: input.channelId,
        episodeId: input.episodeId,
        stage: input.stage,
        version: forked.version.version,
        payload: {
          ...input.payload,
          targetVersion: forked.version.version,
        },
      });

      return { version: forked.version, job };
    }

    const version = await this.store.getStageVersion(
      input.channelId,
      input.episodeId,
      input.stage,
      targetVersion
    );
    const timestamp = nowIso();

    version.reviewStatus = 'draft';
    version.updatedAt = timestamp;
    stageState.reviewStatus = 'draft';
    stageState.staleReasons = [];
    episode.currentStage = input.stage;
    episode.workflowStatus = 'in_progress';
    episode.updatedAt = timestamp;

    await this.store.saveStageVersion(input.channelId, input.episodeId, version);
    await this.store.saveEpisode(episode);

    const job = await this.createJob({
      channelId: input.channelId,
      episodeId: input.episodeId,
      stage: input.stage,
      version: targetVersion,
      payload: input.payload,
    });

    return { version, job };
  }

  public async getApprovedTopic(
    channelId: string,
    episodeId: string
  ): Promise<ApprovedTopicArtifact> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.topic.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved topic found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'topic',
      approvedVersion,
      'approved.json'
    );

    return approvedTopicArtifactSchema.parse(raw);
  }

  public async getApprovedScript(channelId: string, episodeId: string): Promise<Script> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.script.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved script found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'script',
      approvedVersion,
      'approved-script.json'
    );

    return scriptSchema.parse(raw);
  }

  public async getApprovedImageManifest(
    channelId: string,
    episodeId: string
  ): Promise<ImageStageManifest> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.image.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved image manifest found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'image',
      approvedVersion,
      'manifest.json'
    );

    return imageStageManifestSchema.parse(raw);
  }

  public async getApprovedTtsManifest(
    channelId: string,
    episodeId: string
  ): Promise<TtsStageManifest> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.tts.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved tts manifest found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'tts',
      approvedVersion,
      'manifest.json'
    );

    return ttsStageManifestSchema.parse(raw);
  }

  public async getApprovedRenderManifest(
    channelId: string,
    episodeId: string
  ): Promise<RenderStageManifest> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.render.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved render manifest found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'render',
      approvedVersion,
      'manifest.json'
    );

    return renderStageManifestSchema.parse(raw);
  }

  public async getApprovedPackageManifest(
    channelId: string,
    episodeId: string
  ): Promise<PackageManifest> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.package.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved package manifest found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'package',
      approvedVersion,
      'manifest.json'
    );

    return packageManifestSchema.parse(raw);
  }

  public async getCurrentStageArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<StageVersionArtifact> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const currentVersion = episode.stageStates[stage].currentVersion;

    if (currentVersion <= 0) {
      throw new Error(`No current artifact found for stage ${stage} in episode ${episodeId}`);
    }

    return this.getStageVersionArtifact(channelId, episodeId, stage, currentVersion);
  }

  public async getStageVersionArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage,
    version: number
  ): Promise<StageVersionArtifact> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    switch (stage) {
      case 'topic': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'candidates.json'
        );
        return topicCandidatesArtifactSchema.parse(raw);
      }
      case 'script': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'generated-script.json'
        );
        if (getRecordKind(episode) === 'script_pool') {
          const poolArtifact = scriptPoolArtifactSchema.safeParse(raw);
          if (poolArtifact.success) {
            return poolArtifact.data;
          }
        }

        return scriptSchema.parse(raw);
      }
      case 'image': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'manifest.json'
        );
        return imageStageManifestSchema.parse(raw);
      }
      case 'tts': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'manifest.json'
        );
        return ttsStageManifestSchema.parse(raw);
      }
      case 'render': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'manifest.json'
        );
        return renderStageManifestSchema.parse(raw);
      }
      case 'shorts': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'manifest.json'
        );
        return shortsStageManifestSchema.parse(raw);
      }
      case 'package': {
        const raw = await this.store.readStageArtifactJson<unknown>(
          channelId,
          episodeId,
          stage,
          version,
          'manifest.json'
        );
        return packageManifestSchema.parse(raw);
      }
    }
  }

  public async tryGetStageVersionArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage,
    version: number
  ): Promise<StageVersionArtifact | null> {
    try {
      return await this.getStageVersionArtifact(channelId, episodeId, stage, version);
    } catch {
      return null;
    }
  }

  public async getApprovedShortsManifest(
    channelId: string,
    episodeId: string
  ): Promise<ShortsStageManifest> {
    const episode = await this.store.getEpisode(channelId, episodeId);
    const approvedVersion = episode.stageStates.shorts.approvedVersion;

    if (!approvedVersion) {
      throw new Error(`No approved shorts manifest found for episode ${episodeId}`);
    }

    const raw = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'shorts',
      approvedVersion,
      'manifest.json'
    );

    return shortsStageManifestSchema.parse(raw);
  }

  public async getApprovedStageArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<ApprovedStageArtifact> {
    switch (stage) {
      case 'topic':
        return this.getApprovedTopic(channelId, episodeId);
      case 'script':
        return this.getApprovedScript(channelId, episodeId);
      case 'image':
        return this.getApprovedImageManifest(channelId, episodeId);
      case 'tts':
        return this.getApprovedTtsManifest(channelId, episodeId);
      case 'render':
        return this.getApprovedRenderManifest(channelId, episodeId);
      case 'shorts':
        return this.getApprovedShortsManifest(channelId, episodeId);
      case 'package':
        return this.getApprovedPackageManifest(channelId, episodeId);
    }
  }

  public async tryGetCurrentStageArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<StageVersionArtifact | null> {
    try {
      return await this.getCurrentStageArtifact(channelId, episodeId, stage);
    } catch {
      return null;
    }
  }

  private async tryGetApprovedStageArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage
  ): Promise<ApprovedStageArtifact | null> {
    try {
      return await this.getApprovedStageArtifact(channelId, episodeId, stage);
    } catch {
      return null;
    }
  }

  private async persistApprovedTopicArtifact(
    channelId: string,
    episodeId: string,
    version: number,
    approvedTopic?: string
  ): Promise<ApprovedTopicArtifact> {
    const rawCandidates = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'topic',
      version,
      'candidates.json'
    );
    const candidatesArtifact = topicCandidatesArtifactSchema.parse(rawCandidates);
    const resolvedApprovedTopic = approvedTopic ?? candidatesArtifact.recommendedTopic;

    const artifact: ApprovedTopicArtifact = {
      approvedAt: nowIso(),
      category: candidatesArtifact.category,
      approvedTopic: resolvedApprovedTopic,
      sourceVersion: version,
      source: approvedTopic ? 'manual' : 'recommended',
    };

    await this.store.saveStageArtifactJson(channelId, episodeId, 'topic', version, 'approved.json', artifact);
    return artifact;
  }

  private async persistApprovedScriptArtifact(
    channelId: string,
    episodeId: string,
    version: number
  ): Promise<Script> {
    const approvedScript = getEditableScriptFromStageArtifact(
      await this.getStageVersionArtifact(channelId, episodeId, 'script', version)
    );

    await this.store.saveStageArtifactJson(
      channelId,
      episodeId,
      'script',
      version,
      'approved-script.json',
      approvedScript
    );

    return approvedScript;
  }

  private applyAutoTopicTitle(episode: EpisodeRecord, approvedTopic: string): boolean {
    if (shouldPreserveManualTitle(episode) || episode.titleSource === 'script_auto') {
      return false;
    }

    const nextTitle = approvedTopic.trim();
    if (!nextTitle || episode.title === nextTitle) {
      if (episode.title === nextTitle && episode.titleSource !== 'topic_auto') {
        episode.titleSource = 'topic_auto';
        return true;
      }

      return false;
    }

    episode.title = nextTitle;
    episode.titleSource = 'topic_auto';
    return true;
  }

  private applyAutoScriptTitle(episode: EpisodeRecord, script: Script): boolean {
    if (shouldPreserveManualTitle(episode)) {
      return false;
    }

    const nextTitle = getPreferredEpisodeTitle(script);
    if (!nextTitle || episode.title === nextTitle) {
      if (episode.title === nextTitle && episode.titleSource !== 'script_auto') {
        episode.titleSource = 'script_auto';
        return true;
      }

      return false;
    }

    episode.title = nextTitle;
    episode.titleSource = 'script_auto';
    return true;
  }

  private async forkCurrentStageVersion(input: {
    channelId: string;
    episodeId: string;
    stage: EpisodeStage;
    reviewStatus: ReviewStatus;
    notes?: string;
  }): Promise<{ version: StageVersion; sourceArtifact: StageVersionArtifact }> {
    const episode = await this.store.getEpisode(input.channelId, input.episodeId);
    const currentVersion = episode.stageStates[input.stage].currentVersion;

    if (currentVersion <= 0) {
      throw new Error(`Cannot fork stage ${input.stage} without a current version`);
    }

    const sourceVersion = await this.store.getStageVersion(
      input.channelId,
      input.episodeId,
      input.stage,
      currentVersion
    );
    const sourceArtifact = await this.getStageVersionArtifact(
      input.channelId,
      input.episodeId,
      input.stage,
      currentVersion
    );
    const version = await this.createStageVersion({
      channelId: input.channelId,
      episodeId: input.episodeId,
      stage: input.stage,
      reviewStatus: input.reviewStatus,
      sourceVersionIds: [sourceVersion.id],
      notes: input.notes,
    });

    await this.saveStageVersionArtifact(
      input.channelId,
      input.episodeId,
      input.stage,
      version.version,
      sourceArtifact
    );

    return { version, sourceArtifact };
  }

  private async saveStageVersionArtifact(
    channelId: string,
    episodeId: string,
    stage: EpisodeStage,
    version: number,
    artifact: StageVersionArtifact
  ): Promise<void> {
    const filename = getStageArtifactFilename(stage);
    await this.store.saveStageArtifactJson(channelId, episodeId, stage, version, filename, artifact);
  }

  private markExistingDownstreamStagesStale(episode: EpisodeRecord, stage: EpisodeStage): void {
    for (const downstreamStage of getDownstreamStagesForRecord(episode, stage)) {
      const downstreamState = episode.stageStates[downstreamStage];
      if (downstreamState.currentVersion > 0 || downstreamState.approvedVersion !== null) {
        downstreamState.reviewStatus = 'stale';
        downstreamState.staleReasons = [
          buildStaleReason(stage, downstreamStage, getRecordKind(episode)),
        ];
      }
    }
  }
}

function getNextAvailableStage(episode: EpisodeRecord): EpisodeStage {
  const visibleStages = getVisibleStagesForRecord(episode);

  for (const stage of visibleStages) {
    const state = episode.stageStates[stage];
    if (state.approvedVersion === null || state.reviewStatus === 'stale') {
      return stage;
    }
  }

  return visibleStages[visibleStages.length - 1] ?? 'package';
}

function getPreferredEpisodeTitle(script: Script): string {
  return (
    script.metadata.title.native?.trim() ||
    script.metadata.title.target?.trim() ||
    script.metadata.topic.trim()
  );
}

function getRecordKind(record: EpisodeRecord): WorkbenchRecordKind {
  if (
    record.kind === 'episode' ||
    record.kind === 'topic_pool' ||
    record.kind === 'script_pool' ||
    record.kind === 'topic_candidate' ||
    record.kind === 'script_candidate'
  ) {
    return record.kind;
  }

  if (record.kind === 'candidate') {
    return isLegacyScriptPoolRecord(record) ? 'script_pool' : 'topic_pool';
  }

  return 'episode';
}

function isCandidateReviewStage(stage: EpisodeStage): stage is 'topic' | 'script' {
  return stage === 'topic' || stage === 'script';
}

function getVisibleStagesForRecord(record: EpisodeRecord): EpisodeStage[] {
  if (record.kind === 'candidate') {
    return ['topic', 'script'];
  }

  switch (getRecordKind(record)) {
    case 'topic_pool':
    case 'topic_candidate':
      return ['topic'];
    case 'script_pool':
    case 'script_candidate':
      return ['topic', 'script'];
    case 'episode':
      return [...episodeStageOrder];
    default:
      return ['topic'];
  }
}

function getDownstreamStagesForRecord(record: EpisodeRecord, stage: EpisodeStage): EpisodeStage[] {
  return getDownstreamStages(stage).filter((candidateStage) =>
    getVisibleStagesForRecord(record).includes(candidateStage)
  );
}

function assertStageSupported(record: EpisodeRecord, stage: EpisodeStage): void {
  if (!getVisibleStagesForRecord(record).includes(stage)) {
    throw new Error(
      `Stage ${stage} is not available for ${getRecordKind(record)} ${record.id}`
    );
  }
}

function getWorkflowStatusAfterApproval(
  episode: EpisodeRecord,
  nextStage: EpisodeStage
): EpisodeRecord['workflowStatus'] {
  const visibleStages = getVisibleStagesForRecord(episode);
  const allApproved = visibleStages.every((stage) => {
    const state = episode.stageStates[stage];
    return state.approvedVersion !== null && state.reviewStatus === 'approved';
  });

  if (allApproved) {
    return 'completed';
  }

  return nextStage === 'render' ? 'ready_for_render' : 'in_progress';
}

function normalizeReviewStatus(reviewStatus: ReviewStatus): ReviewStatus {
  return reviewStatus === 'changes_requested' ? 'pending_review' : reviewStatus;
}

function normalizeRecordReviewStatuses(record: EpisodeRecord): EpisodeRecord {
  return {
    ...record,
    stageStates: Object.fromEntries(
      Object.entries(record.stageStates).map(([stage, state]) => [
        stage,
        {
          ...state,
          reviewStatus: normalizeReviewStatus(state.reviewStatus),
        },
      ])
    ) as EpisodeRecord['stageStates'],
  };
}

function getNextActionLabel(record: EpisodeRecord): string {
  const state = record.stageStates[record.currentStage];
  const reviewStatus = normalizeReviewStatus(state.reviewStatus);
  switch (state.reviewStatus) {
    case 'pending_review':
      return 'Review and decide';
    case 'approved':
      return isTopicReviewSourceKind(getRecordKind(record)) && record.currentStage === 'topic'
        ? 'Create script pool'
        : isScriptReviewSourceKind(getRecordKind(record)) && record.currentStage === 'script'
          ? 'Promote to episode'
          : 'Continue to next stage';
    case 'stale':
      return 'Refresh stale stage';
    default:
      if (reviewStatus === 'pending_review') {
        return 'Review and decide';
      }
      return state.currentVersion > 0 ? 'Inspect draft' : 'Generate first draft';
  }
}

function getLineageLabel(record: Pick<
  EpisodeRecord,
  'kind' | 'parentRecordId' | 'originCandidateId' | 'threadId' | 'id'
>): string {
  const derivedKind = getRecordKind(record as EpisodeRecord);
  if (derivedKind === 'topic_pool') {
    return 'Topic pool';
  }

  if (derivedKind === 'topic_candidate') {
    return `Topic candidate from ${record.parentRecordId ?? record.threadId ?? record.id}`;
  }

  if (derivedKind === 'script_pool') {
    return `Script pool from ${record.parentRecordId ?? record.threadId ?? record.id}`;
  }

  if (derivedKind === 'script_candidate') {
    return `Script candidate from ${record.parentRecordId ?? record.threadId ?? record.id}`;
  }

  if (record.parentRecordId) {
    return `Production episode from ${record.parentRecordId}`;
  }

  return `Standalone thread ${record.threadId ?? record.id}`;
}

function getWorkspaceForSummary(record: WorkbenchRecordSummary): ReviewWorkspace {
  if (record.kind === 'topic_pool' || record.kind === 'topic_candidate') {
    return record.currentStage === 'script' ? 'script_lab' : 'topic_inbox';
  }

  if (record.kind === 'script_pool' || record.kind === 'script_candidate') {
    return 'script_lab';
  }

  return record.currentStage === 'package' ? 'delivery_pack' : 'production_desk';
}

function compareReviewQueueItems(left: ReviewQueueItem, right: ReviewQueueItem): number {
  const leftRank = getReviewQueueRank(left.reviewStatus);
  const rightRank = getReviewQueueRank(right.reviewStatus);
  return leftRank - rightRank || right.updatedAt.localeCompare(left.updatedAt);
}

function getReviewQueueRank(reviewStatus: ReviewStatus): number {
  switch (normalizeReviewStatus(reviewStatus)) {
    case 'pending_review':
      return 0;
    case 'stale':
      return 1;
    case 'draft':
      return 2;
    case 'approved':
      return 3;
  }
}

function buildStaleReason(
  sourceStage: EpisodeStage,
  staleStage: EpisodeStage,
  recordKind: WorkbenchRecordKind
): string {
  const scope = recordKind === 'episode' ? 'production flow' : 'review funnel';
  return `${capitalizeStageLabel(staleStage)} is stale because ${capitalizeStageLabel(sourceStage)} changed in the ${scope}.`;
}

function isTopicReviewSourceKind(kind: WorkbenchRecordKind): boolean {
  return kind === 'topic_pool' || kind === 'topic_candidate';
}

function isScriptReviewSourceKind(kind: WorkbenchRecordKind): boolean {
  return kind === 'script_pool' || kind === 'script_candidate';
}

function isReviewQueueRecordKind(kind: WorkbenchRecordKind): boolean {
  return (
    kind === 'episode' ||
    kind === 'topic_pool' ||
    kind === 'script_pool' ||
    kind === 'topic_candidate' ||
    kind === 'script_candidate'
  );
}

function filterContainerSummaries(records: WorkbenchRecordSummary[]): WorkbenchRecordSummary[] {
  const parentIdsWithChildren = new Set(
    records
      .filter((record) => record.kind === 'topic_candidate' || record.kind === 'script_candidate')
      .map((record) => record.parentRecordId)
      .filter((parentRecordId): parentRecordId is string => Boolean(parentRecordId))
  );

  return records.filter((record) => {
    if (record.kind === 'topic_pool' || record.kind === 'script_pool') {
      return !parentIdsWithChildren.has(record.id);
    }

    return true;
  });
}

function capitalizeStageLabel(stage: EpisodeStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function assertTopicPoolRecord(record: EpisodeRecord, recordId: string): void {
  if (getRecordKind(record) !== 'topic_pool') {
    throw new Error(`Record ${recordId} is not a topic pool`);
  }
}

function assertScriptPoolRecord(record: EpisodeRecord, recordId: string): void {
  if (getRecordKind(record) !== 'script_pool') {
    throw new Error(`Record ${recordId} is not a script pool`);
  }
}

function assertTopicReviewSourceRecord(record: EpisodeRecord, recordId: string): void {
  if (!isTopicReviewSourceKind(getRecordKind(record))) {
    throw new Error(`Record ${recordId} is not a topic candidate`);
  }
}

function assertScriptReviewSourceRecord(record: EpisodeRecord, recordId: string): void {
  if (!isScriptReviewSourceKind(getRecordKind(record))) {
    throw new Error(`Record ${recordId} is not a script candidate`);
  }
}

function isLegacyScriptPoolRecord(record: Pick<
  EpisodeRecord,
  'kind' | 'parentRecordId' | 'currentStage' | 'stageStates'
>): boolean {
  return (
    record.kind === 'candidate' &&
    Boolean(
      record.parentRecordId ||
        record.stageStates.script.currentVersion > 0 ||
        record.stageStates.script.approvedVersion !== null
    )
  );
}

function shouldPreserveManualTitle(episode: EpisodeRecord): boolean {
  return (
    episode.titleSource === 'manual' ||
    (episode.titleSource === undefined && typeof episode.title === 'string' && episode.title.trim().length > 0)
  );
}

function getStageArtifactFilename(stage: EpisodeStage): string {
  switch (stage) {
    case 'topic':
      return 'candidates.json';
    case 'script':
      return 'generated-script.json';
    case 'image':
    case 'tts':
    case 'render':
    case 'shorts':
    case 'package':
      return 'manifest.json';
  }
}

function getEditableScriptFromStageArtifact(artifact: StageVersionArtifact): Script {
  return 'currentDraft' in artifact ? artifact.currentDraft : scriptSchema.parse(artifact);
}

function buildScriptPoolArtifact(
  previousArtifact: StageVersionArtifact | null,
  nextScript: Script
): ScriptPoolArtifact {
  if (previousArtifact && 'currentDraft' in previousArtifact) {
    const selectedCandidateIndex = previousArtifact.candidates.findIndex(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(nextScript)
    );

    return {
      ...previousArtifact,
      currentDraft: nextScript,
      selectedCandidateIndex: selectedCandidateIndex >= 0 ? selectedCandidateIndex : null,
    };
  }

  return {
    generatedAt: nowIso(),
    category: nextScript.category,
    topic: nextScript.metadata.topic,
    recommendedCandidateIndex: 0,
    selectedCandidateIndex: 0,
    candidates: [nextScript],
    currentDraft: nextScript,
  };
}

function calculateScriptImpact(previousScript: Script | null, nextScript: Script): ScriptImpactSummary {
  if (!previousScript) {
    return {
      changedSentenceIds: nextScript.sentences.map((sentence) => sentence.id),
      affectedSceneIndices: nextScript.metadata.scenePrompts
        ? nextScript.metadata.scenePrompts.map((_, index) => index + 1)
        : [],
    };
  }

  const previousSentences = new Map(
    previousScript.sentences.map((sentence) => [sentence.id, JSON.stringify(sentence)] as const)
  );
  const nextSentences = new Map(
    nextScript.sentences.map((sentence) => [sentence.id, JSON.stringify(sentence)] as const)
  );
  const changedSentenceIds = [...new Set([...previousSentences.keys(), ...nextSentences.keys()])]
    .filter((sentenceId) => previousSentences.get(sentenceId) !== nextSentences.get(sentenceId))
    .sort((left, right) => left - right);

  const scenePromptsChanged =
    JSON.stringify(previousScript.metadata.scenePrompts ?? []) !==
    JSON.stringify(nextScript.metadata.scenePrompts ?? []);
  const affectedSceneIndices = scenePromptsChanged
    ? (nextScript.metadata.scenePrompts ?? []).map((_, index) => index + 1)
    : (nextScript.metadata.scenePrompts ?? [])
        .map((scenePrompt, index) =>
          changedSentenceIds.some(
            (sentenceId) =>
              sentenceId >= scenePrompt.sentenceRange[0] && sentenceId <= scenePrompt.sentenceRange[1]
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
