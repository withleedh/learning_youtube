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
  renderStageManifestSchema,
  shortsStageManifestSchema,
  ttsStageManifestSchema,
  topicCandidatesArtifactSchema,
  type EpisodeRecord,
  type EpisodeStage,
  type ReviewStatus,
  type ApprovedTopicArtifact,
  type ImageStageManifest,
  type RenderStageManifest,
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
}

export interface PromoteCandidateToEpisodeInput {
  channelId: string;
  candidateId: string;
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

export type ApprovedStageArtifact =
  | ApprovedTopicArtifact
  | Script
  | ImageStageManifest
  | TtsStageManifest
  | RenderStageManifest
  | ShortsStageManifest;

export type StageVersionArtifact =
  | TopicCandidatesArtifact
  | Script
  | ImageStageManifest
  | TtsStageManifest
  | RenderStageManifest
  | ShortsStageManifest;

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

export class WorkbenchService {
  constructor(private readonly store: WorkbenchStore = new WorkbenchStore()) {}

  public getDataRoot(): string {
    return this.store.getDataRoot();
  }

  public async listEpisodes(): Promise<EpisodeRecord[]> {
    await this.store.ensureBaseDirs();
    return (await this.store.listEpisodes()).filter((record) => getRecordKind(record) === 'episode');
  }

  public async listCandidates(): Promise<EpisodeRecord[]> {
    await this.store.ensureBaseDirs();
    return (await this.store.listEpisodes()).filter(
      (record) => getRecordKind(record) === 'candidate' && record.workflowStatus !== 'archived'
    );
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

  public async createTopicCandidateBatch(
    input: CreateTopicCandidateBatchInput
  ): Promise<{ candidates: EpisodeRecord[]; jobs: WorkbenchJob[] }> {
    const candidates: EpisodeRecord[] = [];
    const jobs: WorkbenchJob[] = [];

    for (let index = 0; index < input.count; index++) {
      const candidate = await this.createRecord('candidate', { channelId: input.channelId });
      const { job } = await this.enqueueStageGeneration({
        channelId: candidate.channelId,
        episodeId: candidate.id,
        stage: 'topic',
        payload: {
          category: input.category,
          candidateCount: 1,
        },
        notes: 'Topic pool candidate generation',
      });

      candidates.push(await this.getEpisode(candidate.channelId, candidate.id));
      jobs.push(job);
    }

    return { candidates, jobs };
  }

  public async createScriptCandidateBatch(
    input: CreateScriptCandidateBatchInput
  ): Promise<{ candidates: EpisodeRecord[]; jobs: WorkbenchJob[] }> {
    const sourceCandidate = await this.getEpisode(input.channelId, input.sourceCandidateId);
    assertCandidateRecord(sourceCandidate, input.sourceCandidateId);

    const approvedTopic = await this.getApprovedTopic(input.channelId, input.sourceCandidateId);
    const sourceTopicVersionNumber = sourceCandidate.stageStates.topic.approvedVersion;
    if (!sourceTopicVersionNumber) {
      throw new Error(`No approved topic version found for candidate ${input.sourceCandidateId}`);
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

    const candidates: EpisodeRecord[] = [];
    const jobs: WorkbenchJob[] = [];

    for (let index = 0; index < input.count; index++) {
      const candidate = await this.createRecord('candidate', { channelId: input.channelId });
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
        notes: `Cloned from candidate ${sourceCandidate.id}`,
      };

      candidate.stageStates.topic.currentVersion = 1;
      candidate.stageStates.topic.approvedVersion = 1;
      candidate.stageStates.topic.reviewStatus = 'approved';
      candidate.currentStage = 'script';
      candidate.workflowStatus = 'in_progress';
      candidate.title = approvedTopic.approvedTopic;
      candidate.titleSource = 'topic_auto';
      candidate.updatedAt = timestamp;

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

      const { job } = await this.enqueueStageGeneration({
        channelId: candidate.channelId,
        episodeId: candidate.id,
        stage: 'script',
        payload: {
          category: input.category,
          usePipeline: input.usePipeline ?? true,
        },
        notes: `Spawned from topic candidate ${sourceCandidate.id}`,
      });

      candidates.push(await this.getEpisode(candidate.channelId, candidate.id));
      jobs.push(job);
    }

    return { candidates, jobs };
  }

  public async promoteCandidateToEpisode(
    input: PromoteCandidateToEpisodeInput
  ): Promise<{ episode: EpisodeRecord }> {
    const candidate = await this.getEpisode(input.channelId, input.candidateId);
    assertCandidateRecord(candidate, input.candidateId);

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
      title: candidate.title ?? getPreferredEpisodeTitle(approvedScript),
    });
    const timestamp = nowIso();

    episode.currentStage = 'image';
    episode.workflowStatus = 'in_progress';
    episode.stageStates.topic.currentVersion = 1;
    episode.stageStates.topic.approvedVersion = 1;
    episode.stageStates.topic.reviewStatus = 'approved';
    episode.stageStates.script.currentVersion = 1;
    episode.stageStates.script.approvedVersion = 1;
    episode.stageStates.script.reviewStatus = 'approved';
    episode.updatedAt = timestamp;

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
    await this.store.saveEpisode(candidate);

    return { episode };
  }

  private async createRecord(
    kind: WorkbenchRecordKind,
    input: CreateEpisodeInput
  ): Promise<EpisodeRecord> {
    await this.store.ensureBaseDirs();
    const timestamp = nowIso();
    const record: EpisodeRecord = {
      id: createEpisodeId(),
      channelId: input.channelId,
      kind,
      title: input.title,
      titleSource: input.title ? 'manual' : undefined,
      workflowStatus: 'draft',
      currentStage: 'topic',
      createdAt: timestamp,
      updatedAt: timestamp,
      stageStates: createInitialStageStates(),
    };

    await this.store.saveEpisode(record);
    return record;
  }

  public async createStageVersion(input: CreateStageVersionInput): Promise<StageVersion> {
    const episode = await this.store.getEpisode(input.channelId, input.episodeId);
    assertStageSupported(episode, input.stage);
    const stageState = episode.stageStates[input.stage];
    const nextVersion = stageState.currentVersion + 1;
    const timestamp = nowIso();

    const versionRecord: StageVersion = {
      id: createStageVersionId(input.stage, nextVersion),
      episodeId: episode.id,
      stage: input.stage,
      version: nextVersion,
      reviewStatus: input.reviewStatus ?? 'draft',
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceVersionIds: input.sourceVersionIds ?? [],
      notes: input.notes,
    };

    stageState.currentVersion = nextVersion;
    stageState.reviewStatus = versionRecord.reviewStatus;
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

    version.reviewStatus = input.reviewStatus;
    version.updatedAt = timestamp;

    const stageState = episode.stageStates[input.stage];
    stageState.reviewStatus = input.reviewStatus;

    if (input.reviewStatus === 'approved') {
      if (input.stage === 'topic') {
        const artifact = await this.persistApprovedTopicArtifact(
          input.channelId,
          input.episodeId,
          input.version,
          input.approvedTopic
        );
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

      for (const downstreamStage of getDownstreamStagesForRecord(episode, input.stage)) {
        const downstreamState = episode.stageStates[downstreamStage];
        if (downstreamState.currentVersion > 0 || downstreamState.approvedVersion !== null) {
          downstreamState.reviewStatus = 'stale';
        }
      }

      const nextStage = getNextAvailableStage(episode);
      episode.currentStage = nextStage;
      episode.workflowStatus = getWorkflowStatusAfterApproval(episode, nextStage);
    } else if (input.reviewStatus === 'pending_review') {
      episode.workflowStatus = 'awaiting_review';
      episode.currentStage = input.stage;
    } else {
      episode.workflowStatus = 'in_progress';
      episode.currentStage = input.stage;
    }

    episode.updatedAt = timestamp;

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
    return this.store.listStageVersions(channelId, episodeId, stage);
  }

  public async listQueuedJobs(): Promise<WorkbenchJob[]> {
    return this.store.listQueuedJobs();
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
        reviewStatus: stageState.reviewStatus,
        blockedBy: stageState.blockedBy,
        isBlocked,
        latestJob,
        queuedJobCount,
        runningJobCount,
        failedJobCount,
        completedJobCount,
        canGenerate: !isBlocked,
        canApprove:
          stageState.currentVersion > 0 && stageState.reviewStatus === 'pending_review',
        canRequestChanges:
          stageState.currentVersion > 0 &&
          (stageState.reviewStatus === 'pending_review' || stageState.reviewStatus === 'approved'),
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
    let targetVersion: StageVersion;
    let previousScript: Script | null = null;

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
      previousScript = scriptSchema.parse(forked.sourceArtifact);
      episode = await this.store.getEpisode(input.channelId, input.episodeId);
    } else {
      targetVersion = await this.store.getStageVersion(
        input.channelId,
        input.episodeId,
        'script',
        episode.stageStates.script.currentVersion
      );
      previousScript = scriptSchema.parse(
        await this.getStageVersionArtifact(
          input.channelId,
          input.episodeId,
          'script',
          targetVersion.version
        )
      );
    }

    const timestamp = nowIso();
    const impact = calculateScriptImpact(previousScript, nextScript);

    targetVersion.reviewStatus = 'pending_review';
    targetVersion.updatedAt = timestamp;
    episode.stageStates.script.reviewStatus = 'pending_review';
    episode.currentStage = 'script';
    episode.workflowStatus = 'awaiting_review';
    this.applyAutoScriptTitle(episode, nextScript);
    episode.updatedAt = timestamp;
    this.markExistingDownstreamStagesStale(episode, 'script');

    await this.store.saveStageArtifactJson(
      input.channelId,
      input.episodeId,
      'script',
      targetVersion.version,
      'generated-script.json',
      nextScript
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
    const rawScript = await this.store.readStageArtifactJson<unknown>(
      channelId,
      episodeId,
      'script',
      version,
      'generated-script.json'
    );
    const approvedScript = scriptSchema.parse(rawScript);

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

  return visibleStages[visibleStages.length - 1] ?? 'shorts';
}

function getPreferredEpisodeTitle(script: Script): string {
  return (
    script.metadata.title.native?.trim() ||
    script.metadata.title.target?.trim() ||
    script.metadata.topic.trim()
  );
}

function getRecordKind(record: EpisodeRecord): WorkbenchRecordKind {
  return record.kind ?? 'episode';
}

function getVisibleStagesForRecord(record: EpisodeRecord): EpisodeStage[] {
  return getRecordKind(record) === 'candidate'
    ? ['topic', 'script']
    : [...episodeStageOrder];
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
  if (getRecordKind(episode) === 'candidate' && nextStage === 'script') {
    const scriptState = episode.stageStates.script;
    if (scriptState.approvedVersion !== null && scriptState.reviewStatus === 'approved') {
      return 'completed';
    }
  }

  return nextStage === 'render' ? 'ready_for_render' : 'in_progress';
}

function assertCandidateRecord(record: EpisodeRecord, recordId: string): void {
  if (getRecordKind(record) !== 'candidate') {
    throw new Error(`Record ${recordId} is not a candidate`);
  }
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
      return 'manifest.json';
  }
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
