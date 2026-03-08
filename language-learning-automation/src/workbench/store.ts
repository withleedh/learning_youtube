import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  episodeRecordSchema,
  stageVersionSchema,
  workbenchJobSchema,
  type EpisodeRecord,
  type StageVersion,
  type WorkbenchJob,
} from './types';
import {
  getEpisodeIndexPath,
  getEpisodeMetaPath,
  getJobPath,
  getWorkbenchDataRoot,
  getEpisodeJobsDir,
  getStageRoot,
  getStageMetadataPath,
  getStageArtifactPath,
} from './paths';

export class WorkbenchStore {
  constructor(private readonly dataRoot: string = getWorkbenchDataRoot()) {}

  public getDataRoot(): string {
    return this.dataRoot;
  }

  public getStageVersionRoot(
    channelId: string,
    episodeId: string,
    stage: StageVersion['stage'],
    version: number
  ): string {
    return getStageArtifactPath(this.dataRoot, channelId, episodeId, stage, version, '.')
      .replace(/[\\/]?\.$/, '');
  }

  public async ensureBaseDirs(): Promise<void> {
    await fs.mkdir(path.join(this.dataRoot, 'episodes'), { recursive: true });
  }

  public async listEpisodes(): Promise<EpisodeRecord[]> {
    const index = await this.readIndex();
    const episodes = await Promise.all(
      index.map((entry) => this.getEpisode(entry.channelId, entry.episodeId))
    );

    return episodes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public async getEpisode(channelId: string, episodeId: string): Promise<EpisodeRecord> {
    const episodePath = getEpisodeMetaPath(this.dataRoot, channelId, episodeId);
    const raw = JSON.parse(await fs.readFile(episodePath, 'utf-8')) as unknown;
    return episodeRecordSchema.parse(raw);
  }

  public async saveEpisode(record: EpisodeRecord): Promise<void> {
    const episodePath = getEpisodeMetaPath(this.dataRoot, record.channelId, record.id);
    await fs.mkdir(path.dirname(episodePath), { recursive: true });
    await fs.writeFile(episodePath, JSON.stringify(record, null, 2), 'utf-8');
    await this.upsertEpisodeIndex(record.channelId, record.id);
  }

  public async saveStageVersion(
    channelId: string,
    episodeId: string,
    version: StageVersion
  ): Promise<void> {
    const metadataPath = getStageMetadataPath(
      this.dataRoot,
      channelId,
      episodeId,
      version.stage,
      version.version
    );
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(version, null, 2), 'utf-8');
  }

  public async getStageVersion(
    channelId: string,
    episodeId: string,
    stage: StageVersion['stage'],
    version: number
  ): Promise<StageVersion> {
    const metadataPath = getStageMetadataPath(this.dataRoot, channelId, episodeId, stage, version);
    const raw = JSON.parse(await fs.readFile(metadataPath, 'utf-8')) as unknown;
    return stageVersionSchema.parse(raw);
  }

  public async listStageVersions(
    channelId: string,
    episodeId: string,
    stage: StageVersion['stage']
  ): Promise<StageVersion[]> {
    const stageRoot = getStageRoot(this.dataRoot, channelId, episodeId, stage);

    try {
      const entries = await fs.readdir(stageRoot, { withFileTypes: true });
      const versions = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
          .map(async (entry) => {
            const metadataPath = getStageMetadataPath(
              this.dataRoot,
              channelId,
              episodeId,
              stage,
              Number.parseInt(entry.name.replace(/^v/, ''), 10)
            );
            const raw = JSON.parse(await fs.readFile(metadataPath, 'utf-8')) as unknown;
            return stageVersionSchema.parse(raw);
          })
      );

      return versions.sort((left, right) => right.version - left.version);
    } catch {
      return [];
    }
  }

  public async saveJob(channelId: string, episodeId: string, job: WorkbenchJob): Promise<void> {
    const jobPath = getJobPath(this.dataRoot, channelId, episodeId, job.id);
    await fs.mkdir(path.dirname(jobPath), { recursive: true });
    await fs.writeFile(jobPath, JSON.stringify(job, null, 2), 'utf-8');
  }

  public async listJobs(channelId: string, episodeId: string): Promise<WorkbenchJob[]> {
    const jobsDir = getEpisodeJobsDir(this.dataRoot, channelId, episodeId);

    try {
      const entries = await fs.readdir(jobsDir);
      const jobs = await Promise.all(
        entries
          .filter((entry) => entry.endsWith('.json'))
          .map(async (entry) => {
            const raw = JSON.parse(await fs.readFile(path.join(jobsDir, entry), 'utf-8')) as unknown;
            return workbenchJobSchema.parse(raw);
          })
      );

      return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  public async listQueuedJobs(): Promise<WorkbenchJob[]> {
    const jobs = await Promise.all(
      (await this.readIndex()).map(async (entry) => this.listJobs(entry.channelId, entry.episodeId))
    );

    return jobs
      .flat()
      .filter((job) => job.status === 'queued')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public async saveStageArtifactJson(
    channelId: string,
    episodeId: string,
    stage: StageVersion['stage'],
    version: number,
    filename: string,
    data: unknown
  ): Promise<void> {
    const artifactPath = getStageArtifactPath(
      this.dataRoot,
      channelId,
      episodeId,
      stage,
      version,
      filename
    );
    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    await fs.writeFile(artifactPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  public async readStageArtifactJson<T>(
    channelId: string,
    episodeId: string,
    stage: StageVersion['stage'],
    version: number,
    filename: string
  ): Promise<T> {
    const artifactPath = getStageArtifactPath(
      this.dataRoot,
      channelId,
      episodeId,
      stage,
      version,
      filename
    );
    return JSON.parse(await fs.readFile(artifactPath, 'utf-8')) as T;
  }

  private async readIndex(): Promise<Array<{ channelId: string; episodeId: string }>> {
    const indexPath = getEpisodeIndexPath(this.dataRoot);
    try {
      const raw = JSON.parse(await fs.readFile(indexPath, 'utf-8')) as unknown;
      if (!Array.isArray(raw)) {
        return [];
      }

      return raw
        .filter(
          (entry): entry is { channelId: string; episodeId: string } =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as { channelId?: string }).channelId === 'string' &&
            typeof (entry as { episodeId?: string }).episodeId === 'string'
        )
        .map((entry) => ({ channelId: entry.channelId, episodeId: entry.episodeId }));
    } catch {
      return [];
    }
  }

  private async upsertEpisodeIndex(channelId: string, episodeId: string): Promise<void> {
    const indexPath = getEpisodeIndexPath(this.dataRoot);
    await fs.mkdir(path.dirname(indexPath), { recursive: true });

    const current = await this.readIndex();
    const exists = current.some((entry) => entry.channelId === channelId && entry.episodeId === episodeId);
    const next = exists ? current : [...current, { channelId, episodeId }];
    await fs.writeFile(indexPath, JSON.stringify(next, null, 2), 'utf-8');
  }
}
