// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recordApprovedTopicMock = vi.fn();

vi.mock('../script/topic-selector', async () => {
  const actual = await vi.importActual<typeof import('../script/topic-selector')>(
    '../script/topic-selector'
  );

  return {
    ...actual,
    recordApprovedTopic: recordApprovedTopicMock,
  };
});

import { WorkbenchService } from './service';
import { WorkbenchStore } from './store';

describe('WorkbenchService', () => {
  let dataRoot: string;
  let store: WorkbenchStore;
  let service: WorkbenchService;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(os.tmpdir(), 'workbench-service-'));
    store = new WorkbenchStore(dataRoot);
    service = new WorkbenchService(store);
    recordApprovedTopicMock.mockReset();
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it('creates and lists episodes', async () => {
    const episode = await service.createEpisode({
      channelId: 'english',
      title: 'Coffee Shop',
    });

    const episodes = await service.listEpisodes();

    expect(episodes).toHaveLength(1);
    expect(episodes[0].id).toBe(episode.id);
    expect(episodes[0].titleSource).toBe('manual');
    expect(episodes[0].stageStates.topic.reviewStatus).toBe('draft');
  });

  it('creates topic candidates without polluting the production episode list', async () => {
    const result = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 3,
      category: 'conversation',
    });

    const candidates = await service.listCandidates();
    const episodes = await service.listEpisodes();
    const candidateWorkflow = await service.getEpisodeWorkflow('english', result.candidates[0].id);

    expect(result.candidates).toHaveLength(1);
    expect(result.jobs).toHaveLength(1);
    expect(candidates).toHaveLength(1);
    expect(episodes).toHaveLength(0);
    expect(candidateWorkflow.episode.kind).toBe('topic_pool');
    expect(candidateWorkflow.stages.map((stage) => stage.stage)).toEqual(['topic']);
  });

  it('records approved topics into shared history flow when a topic pool is approved', async () => {
    const { candidates } = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 3,
      category: 'conversation',
    });
    const candidate = candidates[0];

    await store.saveStageArtifactJson('english', candidate.id, 'topic', 1, 'candidates.json', {
      generatedAt: '2026-03-08T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Missed the train', 'Coffee date', 'New coworker'],
      recommendedTopic: 'Coffee date',
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: candidate.id,
      stage: 'topic',
      version: 1,
      reviewStatus: 'approved',
    });

    expect(recordApprovedTopicMock).toHaveBeenCalledWith('Coffee date', 'conversation');
  });

  it('summarizes live job activity across candidates and episodes', async () => {
    const candidateBatch = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 2,
      category: 'conversation',
    });
    const episode = await service.createEpisode({ channelId: 'english' });
    const episodeJob = await service.createJob({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: 1,
    });

    await service.updateJob({
      ...episodeJob,
      status: 'running',
      updatedAt: '2026-03-08T12:00:00.000Z',
    });

    const status = await service.getLiveStatus();

    expect(status.queuedJobs).toBe(1);
    expect(status.runningJobs).toBe(1);
    expect(status.activeJobCount).toBe(2);
    expect(status.activeRecordCount).toBe(2);
    expect(status.lastUpdatedAt).toBe('2026-03-08T12:00:00.000Z');
    expect(candidateBatch.jobs).toHaveLength(1);
  });

  it('promotes an approved script candidate into a production episode and archives the source candidate', async () => {
    const topicBatch = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 1,
      category: 'conversation',
    });
    const topicPool = topicBatch.candidates[0];

    await store.saveStageArtifactJson('english', topicPool.id, 'topic', 1, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date'],
      recommendedTopic: 'Coffee date',
    });
    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: topicPool.id,
      stage: 'topic',
      version: 1,
      reviewStatus: 'approved',
    });

    const scriptPoolBatch = await service.createScriptCandidateBatch({
      channelId: 'english',
      sourceCandidateId: topicPool.id,
      count: 3,
      category: 'conversation',
      usePipeline: true,
    });
    const candidate = scriptPoolBatch.candidates[0];

    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: candidate.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });
    await store.saveStageArtifactJson(
      'english',
      candidate.id,
      'script',
      scriptVersion.version,
      'generated-script.json',
      {
        channelId: 'english',
        date: '2026-03-07',
        category: 'conversation',
        metadata: {
          topic: 'Coffee date',
          style: 'casual',
          title: {
            target: 'Coffee Date',
            native: '커피 데이트',
          },
          characters: [
            {
              id: 'M',
              name: 'James',
              gender: 'male',
              ethnicity: 'American',
              role: 'friend',
            },
          ],
        },
        sentences: [
          {
            id: 1,
            speaker: 'M',
            target: 'Do you want coffee?',
            targetBlank: 'Do you want ______?',
            blankAnswer: 'coffee',
            native: '커피 마실래?',
            words: [{ word: 'coffee', meaning: '커피' }],
          },
        ],
      }
    );
    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: candidate.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    const result = await service.promoteCandidateToEpisode({
      channelId: 'english',
      candidateId: candidate.id,
    });
    const remainingCandidates = await service.listCandidates();
    const episodes = await service.listEpisodes();
    const promotedWorkflow = await service.getEpisodeWorkflow('english', result.episode.id);
    const archivedCandidate = await service.getEpisode('english', candidate.id);

    expect(remainingCandidates).toHaveLength(1);
    expect(remainingCandidates[0]?.id).toBe(topicPool.id);
    expect(episodes).toHaveLength(1);
    expect(promotedWorkflow.episode.kind).toBe('episode');
    expect(promotedWorkflow.stages.map((stage) => stage.stage)).toEqual([
      'topic',
      'script',
      'image',
      'tts',
      'render',
      'shorts',
      'package',
    ]);
    expect(result.episode.currentStage).toBe('image');
    expect(result.episode.threadId).toBe(topicPool.threadId);
    expect(result.episode.parentRecordId).toBe(candidate.id);
    expect(result.episode.originCandidateId).toBe(topicPool.id);
    expect(archivedCandidate.workflowStatus).toBe('archived');
  });

  it('builds a shared thread and review queue across topic and script candidates', async () => {
    const topicBatch = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 1,
      category: 'conversation',
    });
    const sourceCandidate = topicBatch.candidates[0];

    await store.saveStageArtifactJson('english', sourceCandidate.id, 'topic', 1, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date'],
      recommendedTopic: 'Coffee date',
    });
    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: sourceCandidate.id,
      stage: 'topic',
      version: 1,
      reviewStatus: 'approved',
    });

    const firstScriptBatch = await service.createScriptCandidateBatch({
      channelId: 'english',
      sourceCandidateId: sourceCandidate.id,
      count: 2,
      category: 'conversation',
      usePipeline: true,
    });
    const secondScriptBatch = await service.createScriptCandidateBatch({
      channelId: 'english',
      sourceCandidateId: sourceCandidate.id,
      count: 3,
      category: 'conversation',
      usePipeline: true,
    });

    const queue = await service.listReviewQueue();
    const thread = await service.getThreadSummary(sourceCandidate.threadId ?? sourceCandidate.id);
    const scriptItems = queue.filter((item) => item.workspace === 'script_lab');

    expect(scriptItems).toHaveLength(2);
    expect(new Set(scriptItems.map((item) => item.threadId))).toEqual(
      new Set([sourceCandidate.threadId])
    );
    expect(scriptItems.every((item) => item.lineageLabel.includes(sourceCandidate.id))).toBe(true);
    expect(thread.records).toHaveLength(3);
    expect(thread.records.map((record) => record.id)).toContain(sourceCandidate.id);
    expect(thread.records.filter((record) => record.kind === 'script_pool')).toHaveLength(2);
    expect(firstScriptBatch.candidates[0]?.parentRecordId).toBe(sourceCandidate.id);
    expect(secondScriptBatch.candidates[0]?.parentRecordId).toBe(sourceCandidate.id);
  });

  it('bulk-approves and bulk-rejects candidate review stages while skipping invalid records', async () => {
    const firstBatch = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 1,
      category: 'conversation',
    });
    const secondBatch = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 1,
      category: 'conversation',
    });
    const firstCandidate = firstBatch.candidates[0]!;
    const secondCandidate = secondBatch.candidates[0]!;

    for (const candidate of [firstCandidate, secondCandidate]) {
      await store.saveStageArtifactJson('english', candidate.id, 'topic', 1, 'candidates.json', {
        generatedAt: '2026-03-07T00:00:00.000Z',
        category: 'conversation',
        candidates: ['Coffee date'],
        recommendedTopic: 'Coffee date',
      });
      await service.updateStageReviewStatus({
        channelId: 'english',
        episodeId: candidate.id,
        stage: 'topic',
        version: 1,
        reviewStatus: 'pending_review',
      });
    }

    const approveResult = await service.bulkReviewCandidates({
      items: [{ channelId: 'english', candidateId: firstCandidate.id }],
      reviewStatus: 'approved',
    });

    expect(approveResult.processed).toHaveLength(1);

    const refreshedFirst = await service.getEpisode('english', firstCandidate.id);
    expect(refreshedFirst.currentStage).toBe('topic');
    expect(refreshedFirst.workflowStatus).toBe('completed');

    const rejectResult = await service.bulkReviewCandidates({
      items: [
        { channelId: 'english', candidateId: firstCandidate.id },
        { channelId: 'english', candidateId: secondCandidate.id },
      ],
      reviewStatus: 'changes_requested',
    });

    expect(rejectResult.processed).toHaveLength(2);
    expect(rejectResult.skipped).toHaveLength(0);

    const refreshedFirstAfterReject = await service.getEpisode('english', firstCandidate.id);
    expect(refreshedFirstAfterReject.stageStates.topic.reviewStatus).toBe('changes_requested');
    const refreshedSecond = await service.getEpisode('english', secondCandidate.id);
    expect(refreshedSecond.stageStates.topic.reviewStatus).toBe('changes_requested');
  });

  it('creates stage versions and updates episode state', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const version = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
      notes: 'generated by scout job',
    });

    const updated = await service.getEpisode('english', episode.id);

    expect(version.version).toBe(1);
    expect(updated.currentStage).toBe('topic');
    expect(updated.workflowStatus).toBe('awaiting_review');
    expect(updated.stageStates.topic.currentVersion).toBe(1);
    expect(updated.stageStates.topic.reviewStatus).toBe('pending_review');
  });

  it('lists stage versions in descending order for a stage', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const firstVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'draft',
      notes: 'first draft',
    });
    const secondVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
      sourceVersionIds: [firstVersion.id],
      notes: 'review draft',
    });

    const versions = await service.listStageVersions('english', episode.id, 'script');

    expect(versions).toHaveLength(2);
    expect(versions.map((version) => version.version)).toEqual([2, 1]);
    expect(versions[0].notes).toBe('review draft');
    expect(versions[0].sourceVersionIds).toEqual([firstVersion.id]);
    expect(versions[1].notes).toBe('first draft');
    expect(secondVersion.version).toBe(2);
  });

  it('marks downstream stages stale after approval', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const topicVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'topic', topicVersion.version, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date', 'Missed the train'],
      recommendedTopic: 'Missed the train',
    });

    const result = await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: topicVersion.version,
      reviewStatus: 'approved',
    });

    expect(result.episode.stageStates.topic.approvedVersion).toBe(1);
    expect(result.episode.stageStates.script.reviewStatus).toBe('draft');
    expect(result.episode.stageStates.render.reviewStatus).toBe('draft');
    expect(result.episode.currentStage).toBe('script');
  });

  it('persists approved topic artifact using the recommended topic by default', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    const topicVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'topic', topicVersion.version, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date', 'Missed the train'],
      recommendedTopic: 'Missed the train',
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: topicVersion.version,
      reviewStatus: 'approved',
    });

    const approved = await service.getApprovedTopic('english', episode.id);

    expect(approved.category).toBe('conversation');
    expect(approved.approvedTopic).toBe('Missed the train');
    expect(approved.source).toBe('recommended');
  });

  it('auto-syncs the episode title from approved topic and approved script', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    const topicVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'topic', topicVersion.version, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date', 'Missed the train'],
      recommendedTopic: 'Missed the train',
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: topicVersion.version,
      reviewStatus: 'approved',
    });

    let refreshed = await service.getEpisode('english', episode.id);
    expect(refreshed.title).toBe('Missed the train');
    expect(refreshed.titleSource).toBe('topic_auto');

    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });
    await store.saveStageArtifactJson('english', episode.id, 'script', scriptVersion.version, 'generated-script.json', {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Missed the train',
        style: 'casual',
        title: {
          target: 'Missed the Train',
          native: '기차를 놓쳤어요',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'I missed the train this morning.',
          targetBlank: 'I missed the ______ this morning.',
          blankAnswer: 'train',
          native: '오늘 아침에 기차를 놓쳤어.',
          words: [{ word: 'train', meaning: '기차' }],
        },
      ],
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    refreshed = await service.getEpisode('english', episode.id);
    expect(refreshed.title).toBe('기차를 놓쳤어요');
    expect(refreshed.titleSource).toBe('script_auto');
  });

  it('preserves a manual episode title during auto-sync', async () => {
    const episode = await service.createEpisode({
      channelId: 'english',
      title: 'Producer Locked Title',
    });
    const topicVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'topic', topicVersion.version, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date', 'Missed the train'],
      recommendedTopic: 'Missed the train',
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: topicVersion.version,
      reviewStatus: 'approved',
    });

    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });
    await store.saveStageArtifactJson('english', episode.id, 'script', scriptVersion.version, 'generated-script.json', {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Missed the train',
        style: 'casual',
        title: {
          target: 'Missed the Train',
          native: '기차를 놓쳤어요',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'I missed the train this morning.',
          targetBlank: 'I missed the ______ this morning.',
          blankAnswer: 'train',
          native: '오늘 아침에 기차를 놓쳤어.',
          words: [{ word: 'train', meaning: '기차' }],
        },
      ],
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    const refreshed = await service.getEpisode('english', episode.id);
    expect(refreshed.title).toBe('Producer Locked Title');
    expect(refreshed.titleSource).toBe('manual');
  });

  it('persists approved script artifact on script approval', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'script', scriptVersion.version, 'generated-script.json', {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Coffee date',
        style: 'casual',
        title: {
          target: 'Coffee Date',
          native: '커피 데이트',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'Do you want coffee?',
          targetBlank: 'Do you want ______?',
          blankAnswer: 'coffee',
          native: '커피 마실래?',
          words: [{ word: 'coffee', meaning: '커피' }],
        },
      ],
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    const approvedScript = await service.getApprovedScript('english', episode.id);

    expect(approvedScript.metadata.topic).toBe('Coffee date');
    expect(approvedScript.sentences).toHaveLength(1);
  });

  it('reads approved image, tts, and render manifests from approved stage versions', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const imageVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'image', imageVersion.version, 'manifest.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      mode: 'background',
      backgroundImagePath: '/tmp/background.png',
      sceneImagePaths: [],
      styleId: 'pixar_3d',
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      version: imageVersion.version,
      reviewStatus: 'approved',
    });

    const ttsVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'tts',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'tts', ttsVersion.version, 'manifest.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      outputDir: '/tmp/audio',
      audioFiles: [
        {
          sentenceId: 1,
          speaker: 'M',
          speed: '1.0x',
          path: '/tmp/audio/sentence_01_M_10x.mp3',
          duration: 2.8,
        },
      ],
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'tts',
      version: ttsVersion.version,
      reviewStatus: 'approved',
    });

    const renderVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'render',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'render', renderVersion.version, 'manifest.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      compositionId: 'Main',
      videoPath: '/tmp/render/video.mp4',
      durationInFrames: 900,
      audioFileCount: 1,
      imageMode: 'background',
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'render',
      version: renderVersion.version,
      reviewStatus: 'approved',
    });

    const imageManifest = await service.getApprovedImageManifest('english', episode.id);
    const ttsManifest = await service.getApprovedTtsManifest('english', episode.id);
    const renderManifest = await service.getApprovedRenderManifest('english', episode.id);

    expect(imageManifest.mode).toBe('background');
    expect(imageManifest.styleId).toBe('pixar_3d');
    expect(ttsManifest.audioFiles).toHaveLength(1);
    expect(ttsManifest.audioFiles[0].sentenceId).toBe(1);
    expect(renderManifest.videoPath).toBe('/tmp/render/video.mp4');
  });

  it('marks only existing downstream work as stale after upstream approval', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'script', scriptVersion.version, 'generated-script.json', {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Coffee date',
        style: 'casual',
        title: {
          target: 'Coffee Date',
          native: '커피 데이트',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'Do you want coffee?',
          targetBlank: 'Do you want ______?',
          blankAnswer: 'coffee',
          native: '커피 마실래?',
          words: [{ word: 'coffee', meaning: '커피' }],
        },
      ],
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      reviewStatus: 'pending_review',
    });

    const topicVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'topic', topicVersion.version, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date', 'Missed the train'],
      recommendedTopic: 'Missed the train',
    });

    const result = await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: topicVersion.version,
      reviewStatus: 'approved',
    });

    expect(result.episode.stageStates.image.reviewStatus).toBe('stale');
    expect(result.episode.stageStates.tts.reviewStatus).toBe('draft');
  });

  it('creates and lists jobs', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    await service.createJob({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      version: 1,
    });

    const jobs = await service.listJobs('english', episode.id);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].stage).toBe('topic');
    expect(jobs[0].status).toBe('queued');
  });

  it('reuses the current non-approved version for targeted regeneration jobs', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const imageVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      reviewStatus: 'pending_review',
    });

    const result = await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      payload: { targetVersion: imageVersion.version, sceneIndices: [2] },
    });

    const jobs = await service.listJobs('english', episode.id);
    const refreshed = await service.getEpisode('english', episode.id);

    expect(result.version.version).toBe(imageVersion.version);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].version).toBe(imageVersion.version);
    expect(refreshed.stageStates.image.currentVersion).toBe(1);
    expect(refreshed.stageStates.image.reviewStatus).toBe('draft');
  });

  it('forks the approved current script into a new draft when saving manual edits', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'script', scriptVersion.version, 'generated-script.json', {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Coffee date',
        style: 'casual',
        title: {
          target: 'Coffee Date',
          native: '커피 데이트',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
        scenePrompts: [
          {
            sentenceRange: [1, 1],
            setting: 'coffee shop',
            mood: 'warm',
            characterActions: 'James greets the barista',
            cameraDirection: 'Medium shot',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'Do you want coffee?',
          targetBlank: 'Do you want ______?',
          blankAnswer: 'coffee',
          native: '커피 마실래?',
          words: [{ word: 'coffee', meaning: '커피' }],
        },
      ],
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    const ttsVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'tts',
      reviewStatus: 'pending_review',
    });
    await store.saveStageArtifactJson('english', episode.id, 'tts', ttsVersion.version, 'manifest.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      outputDir: '/tmp/audio',
      audioFiles: [],
    });
    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'tts',
      version: ttsVersion.version,
      reviewStatus: 'approved',
    });

    const result = await service.saveScriptDraft({
      channelId: 'english',
      episodeId: episode.id,
      script: {
        channelId: 'english',
        date: '2026-03-07',
        category: 'conversation',
        metadata: {
          topic: 'Coffee date',
          style: 'casual',
          title: {
            target: 'Coffee Date',
            native: '커피 데이트',
          },
          characters: [
            {
              id: 'M',
              name: 'James',
              gender: 'male',
              ethnicity: 'American',
              role: 'friend',
            },
          ],
          scenePrompts: [
            {
              sentenceRange: [1, 1],
              setting: 'coffee shop',
              mood: 'warm',
              characterActions: 'James greets the barista with a wave',
              cameraDirection: 'Medium shot',
            },
          ],
        },
        sentences: [
          {
            id: 1,
            speaker: 'M',
            target: 'Do you want to grab coffee later?',
            targetBlank: 'Do you want to grab ______ later?',
            blankAnswer: 'coffee',
            native: '나중에 커피 마실래?',
            words: [{ word: 'coffee', meaning: '커피' }],
          },
        ],
      },
    });

    const refreshed = await service.getEpisode('english', episode.id);
    const currentScript = await store.readStageArtifactJson<{ sentences: Array<{ target: string }> }>(
      'english',
      episode.id,
      'script',
      2,
      'generated-script.json'
    );

    expect(result.version.version).toBe(2);
    expect(result.impact.changedSentenceIds).toEqual([1]);
    expect(result.impact.affectedSceneIndices).toEqual([1]);
    expect(currentScript.sentences[0].target).toContain('grab coffee later');
    expect(refreshed.stageStates.script.currentVersion).toBe(2);
    expect(refreshed.stageStates.script.approvedVersion).toBe(1);
    expect(refreshed.stageStates.tts.reviewStatus).toBe('stale');
  });

  it('forks stale approved media stages when targeted regeneration is queued', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });

    await store.saveStageArtifactJson('english', episode.id, 'script', scriptVersion.version, 'generated-script.json', {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Coffee date',
        style: 'casual',
        title: {
          target: 'Coffee Date',
          native: '커피 데이트',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'Do you want coffee?',
          targetBlank: 'Do you want ______?',
          blankAnswer: 'coffee',
          native: '커피 마실래?',
          words: [{ word: 'coffee', meaning: '커피' }],
        },
      ],
    });
    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    const imageVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      reviewStatus: 'pending_review',
    });
    await store.saveStageArtifactJson('english', episode.id, 'image', imageVersion.version, 'manifest.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      mode: 'scene',
      backgroundImagePath: '/tmp/image/scene_1.png',
      sceneImagePaths: ['/tmp/image/scene_1.png', '/tmp/image/scene_2.png'],
      styleId: 'pixar_3d',
    });
    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      version: imageVersion.version,
      reviewStatus: 'approved',
    });

    const updatedScript = {
      channelId: 'english',
      date: '2026-03-07',
      category: 'conversation',
      metadata: {
        topic: 'Coffee date',
        style: 'casual',
        title: {
          target: 'Coffee Date',
          native: '커피 데이트',
        },
        characters: [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'friend',
          },
        ],
      },
      sentences: [
        {
          id: 1,
          speaker: 'M',
          target: 'Do you want to grab coffee later?',
          targetBlank: 'Do you want to grab ______ later?',
          blankAnswer: 'coffee',
          native: '나중에 커피 마실래?',
          words: [{ word: 'coffee', meaning: '커피' }],
        },
      ],
    };
    await service.saveScriptDraft({
      channelId: 'english',
      episodeId: episode.id,
      script: updatedScript,
    });

    const result = await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      payload: { targetVersion: 1, sceneIndices: [2] },
    });

    const refreshed = await service.getEpisode('english', episode.id);
    const clonedManifest = await store.readStageArtifactJson<{ sceneImagePaths: string[] }>(
      'english',
      episode.id,
      'image',
      2,
      'manifest.json'
    );

    expect(result.version.version).toBe(2);
    expect(result.job.version).toBe(2);
    expect(clonedManifest.sceneImagePaths).toHaveLength(2);
    expect(refreshed.stageStates.image.currentVersion).toBe(2);
    expect(refreshed.stageStates.image.approvedVersion).toBe(1);
  });

  it('builds an episode workflow summary for admin screens', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      payload: { category: 'conversation', candidateCount: 3 },
    });

    const workflow = await service.getEpisodeWorkflow('english', episode.id);
    const topicStage = workflow.stages.find((stage) => stage.stage === 'topic');
    const scriptStage = workflow.stages.find((stage) => stage.stage === 'script');

    expect(workflow.episode.id).toBe(episode.id);
    expect(workflow.jobs).toHaveLength(1);
    expect(topicStage?.currentVersion).toBe(1);
    expect(topicStage?.queuedJobCount).toBe(1);
    expect(topicStage?.canApprove).toBe(false);
    expect(scriptStage?.isBlocked).toBe(true);
    expect(scriptStage?.canGenerate).toBe(false);
  });

  it('returns stage review context comments and saves package drafts', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const scriptVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      reviewStatus: 'pending_review',
    });
    await store.saveStageArtifactJson(
      'english',
      episode.id,
      'script',
      scriptVersion.version,
      'generated-script.json',
      {
        channelId: 'english',
        date: '2026-03-07',
        category: 'conversation',
        metadata: {
          topic: 'Coffee date',
          style: 'casual',
          title: {
            target: 'Coffee Date',
            native: '커피 데이트',
          },
          characters: [
            {
              id: 'M',
              name: 'James',
              gender: 'male',
              ethnicity: 'American',
              role: 'friend',
            },
          ],
        },
        sentences: [
          {
            id: 1,
            speaker: 'M',
            target: 'Do you want coffee?',
            targetBlank: 'Do you want ______?',
            blankAnswer: 'coffee',
            native: '커피 마실래?',
            words: [{ word: 'coffee', meaning: '커피' }],
          },
        ],
      }
    );
    await service.createComment({
      channelId: 'english',
      recordId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      text: 'Sentence 1 needs a stronger hook.',
      anchor: {
        kind: 'sentence',
        sentenceId: 1,
        label: 'Sentence 1',
      },
    });

    const scriptContext = await service.getStageReviewContext('english', episode.id, 'script');

    expect(scriptContext.stageSummary.reviewStatus).toBe('pending_review');
    expect(scriptContext.comments).toHaveLength(1);
    expect(scriptContext.comments[0]?.anchor?.kind).toBe('sentence');
    expect(scriptContext.thread.records[0]?.id).toBe(episode.id);

    const savedPackage = await service.savePackageDraft({
      channelId: 'english',
      episodeId: episode.id,
      manifest: {
        generatedAt: '2026-03-08T00:00:00.000Z',
        titleCandidates: [
          { id: 'title-1', value: 'Coffee Date English Practice', source: 'manual' },
        ],
        selectedTitle: 'Coffee Date English Practice',
        description: 'Practice a coffee shop conversation in English.',
        pinnedComment: 'Which cafe phrase do you use most often?',
        thumbnailCandidates: [
          {
            id: 'thumb-1',
            path: '/tmp/thumb-1.png',
            label: 'Primary thumbnail',
            source: 'manual',
          },
        ],
        selectedThumbnailPath: '/tmp/thumb-1.png',
        uploadInfoPath: '/tmp/upload_info.txt',
        uploadInfoText: 'Title: Coffee Date English Practice',
        exportItems: [{ id: 'render', label: 'Video', path: '/tmp/video.mp4' }],
      },
    });
    const packageContext = await service.getStageReviewContext('english', episode.id, 'package');

    expect(savedPackage.version.version).toBe(1);
    expect(savedPackage.episode.currentStage).toBe('package');
    expect(savedPackage.artifact.selectedTitle).toBe('Coffee Date English Practice');
    expect(packageContext.currentArtifact).toMatchObject({
      selectedTitle: 'Coffee Date English Practice',
      selectedThumbnailPath: '/tmp/thumb-1.png',
    });
  });
});
