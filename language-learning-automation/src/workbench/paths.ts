import path from 'node:path';
import type { EpisodeStage } from './types';

export function formatStageVersion(version: number): string {
  return `v${version.toString().padStart(3, '0')}`;
}

export function getWorkbenchDataRoot(cwd: string = process.cwd()): string {
  return path.join(cwd, 'data');
}

export function getEpisodeRoot(dataRoot: string, channelId: string, episodeId: string): string {
  return path.join(dataRoot, 'episodes', channelId, episodeId);
}

export function getEpisodeMetaPath(dataRoot: string, channelId: string, episodeId: string): string {
  return path.join(getEpisodeRoot(dataRoot, channelId, episodeId), 'episode.json');
}

export function getStageRoot(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  stage: EpisodeStage
): string {
  return path.join(getEpisodeRoot(dataRoot, channelId, episodeId), 'stages', stage);
}

export function getStageVersionRoot(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  stage: EpisodeStage,
  version: number
): string {
  return path.join(getStageRoot(dataRoot, channelId, episodeId, stage), formatStageVersion(version));
}

export function getStageMetadataPath(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  stage: EpisodeStage,
  version: number
): string {
  return path.join(
    getStageVersionRoot(dataRoot, channelId, episodeId, stage, version),
    'metadata.json'
  );
}

export function getStageManifestPath(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  stage: EpisodeStage,
  version: number
): string {
  return path.join(
    getStageVersionRoot(dataRoot, channelId, episodeId, stage, version),
    'manifest.json'
  );
}

export function getStageAssetsDir(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  stage: EpisodeStage,
  version: number
): string {
  return path.join(getStageVersionRoot(dataRoot, channelId, episodeId, stage, version), 'assets');
}

export function getEpisodeReviewDir(dataRoot: string, channelId: string, episodeId: string): string {
  return path.join(getEpisodeRoot(dataRoot, channelId, episodeId), 'reviews');
}

export function getEpisodeCommentsPath(
  dataRoot: string,
  channelId: string,
  episodeId: string
): string {
  return path.join(getEpisodeReviewDir(dataRoot, channelId, episodeId), 'comments.json');
}

export function getEpisodeJobsDir(dataRoot: string, channelId: string, episodeId: string): string {
  return path.join(getEpisodeRoot(dataRoot, channelId, episodeId), 'jobs');
}

export function getEpisodeIndexPath(dataRoot: string): string {
  return path.join(dataRoot, 'episodes', 'index.json');
}

export function getWorkbenchLogsDir(dataRoot: string): string {
  return path.join(dataRoot, 'logs');
}

export function getWorkbenchApiLogPath(dataRoot: string): string {
  return path.join(getWorkbenchLogsDir(dataRoot), 'workbench-api.ndjson');
}

export function getJobPath(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  jobId: string
): string {
  return path.join(getEpisodeJobsDir(dataRoot, channelId, episodeId), `${jobId}.json`);
}

export function getStageArtifactPath(
  dataRoot: string,
  channelId: string,
  episodeId: string,
  stage: EpisodeStage,
  version: number,
  filename: string
): string {
  return path.join(getStageVersionRoot(dataRoot, channelId, episodeId, stage, version), filename);
}
