import { describe, expect, it } from 'vitest';
import {
  createInitialStageStates,
  episodeRecordSchema,
  getDownstreamStages,
  getNextStage,
} from './types';
import {
  formatStageVersion,
  getEpisodeJobsDir,
  getEpisodeMetaPath,
  getEpisodeReviewDir,
  getEpisodeRoot,
  getStageAssetsDir,
  getStageManifestPath,
  getStageMetadataPath,
  getStageVersionRoot,
} from './paths';

describe('workbench workflow model', () => {
  it('creates the expected initial stage blocking rules', () => {
    const stageStates = createInitialStageStates();

    expect(stageStates.topic.blockedBy).toEqual([]);
    expect(stageStates.script.blockedBy).toEqual(['topic']);
    expect(stageStates.image.blockedBy).toEqual(['script']);
    expect(stageStates.tts.blockedBy).toEqual(['script']);
    expect(stageStates.render.blockedBy).toEqual(['image', 'tts']);
    expect(stageStates.shorts.blockedBy).toEqual(['render']);
    expect(stageStates.package.blockedBy).toEqual(['shorts']);
  });

  it('returns next and downstream stages in the correct order', () => {
    expect(getNextStage('topic')).toBe('script');
    expect(getNextStage('shorts')).toBe('package');
    expect(getNextStage('package')).toBeNull();
    expect(getDownstreamStages('script')).toEqual(['image', 'tts', 'render', 'shorts', 'package']);
    expect(getDownstreamStages('shorts')).toEqual(['package']);
    expect(getDownstreamStages('package')).toEqual([]);
  });

  it('validates an episode record shape', () => {
    const now = '2026-03-07T00:00:00.000Z';
    const parsed = episodeRecordSchema.parse({
      id: 'ep_001',
      channelId: 'english',
      title: 'Coffee Shop',
      titleSource: 'manual',
      workflowStatus: 'in_progress',
      currentStage: 'script',
      createdAt: now,
      updatedAt: now,
      stageStates: createInitialStageStates(),
    });

    expect(parsed.id).toBe('ep_001');
    expect(parsed.stageStates.render.reviewStatus).toBe('draft');
  });
});

describe('workbench storage paths', () => {
  const dataRoot = '/tmp/workbench';
  const channelId = 'english';
  const episodeId = 'ep_001';

  it('formats stage versions consistently', () => {
    expect(formatStageVersion(1)).toBe('v001');
    expect(formatStageVersion(12)).toBe('v012');
    expect(formatStageVersion(123)).toBe('v123');
  });

  it('builds stable episode and stage paths', () => {
    expect(getEpisodeRoot(dataRoot, channelId, episodeId)).toBe(
      '/tmp/workbench/episodes/english/ep_001'
    );
    expect(getEpisodeMetaPath(dataRoot, channelId, episodeId)).toBe(
      '/tmp/workbench/episodes/english/ep_001/episode.json'
    );
    expect(getStageVersionRoot(dataRoot, channelId, episodeId, 'script', 2)).toBe(
      '/tmp/workbench/episodes/english/ep_001/stages/script/v002'
    );
    expect(getStageMetadataPath(dataRoot, channelId, episodeId, 'tts', 3)).toBe(
      '/tmp/workbench/episodes/english/ep_001/stages/tts/v003/metadata.json'
    );
    expect(getStageManifestPath(dataRoot, channelId, episodeId, 'image', 1)).toBe(
      '/tmp/workbench/episodes/english/ep_001/stages/image/v001/manifest.json'
    );
    expect(getStageAssetsDir(dataRoot, channelId, episodeId, 'render', 4)).toBe(
      '/tmp/workbench/episodes/english/ep_001/stages/render/v004/assets'
    );
    expect(getEpisodeReviewDir(dataRoot, channelId, episodeId)).toBe(
      '/tmp/workbench/episodes/english/ep_001/reviews'
    );
    expect(getEpisodeJobsDir(dataRoot, channelId, episodeId)).toBe(
      '/tmp/workbench/episodes/english/ep_001/jobs'
    );
  });
});
