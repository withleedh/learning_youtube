// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkbenchService } from './service';
import { WorkbenchStore } from './store';
import { WorkbenchWorker, type WorkbenchWorkerAdapters } from './worker';

describe('WorkbenchWorker', () => {
  let dataRoot: string;
  let store: WorkbenchStore;
  let service: WorkbenchService;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(os.tmpdir(), 'workbench-worker-'));
    store = new WorkbenchStore(dataRoot);
    service = new WorkbenchService(store);
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it('processes a queued topic generation job and stores review candidates', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      payload: { category: 'conversation', candidateCount: 3 },
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        topicBundle: {
          category: 'conversation',
          candidates: ['Coffee date?', 'Missed the train', 'New coworker'],
          recommendedTopic: 'Missed the train',
        },
      })
    );

    const processed = await worker.runUntilEmpty();

    expect(processed).toBe(1);

    const refreshed = await service.getEpisode('english', episode.id);
    const jobs = await service.listJobs('english', episode.id);
    const candidates = await store.readStageArtifactJson<{
      category: string;
      candidates: string[];
      recommendedTopic: string;
    }>('english', episode.id, 'topic', 1, 'candidates.json');

    expect(refreshed.stageStates.topic.reviewStatus).toBe('pending_review');
    expect(jobs[0].status).toBe('completed');
    expect(candidates.recommendedTopic).toBe('Missed the train');
    expect(candidates.candidates).toHaveLength(3);
  });

  it('processes a queued script generation job with an explicit topic', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      payload: { category: 'conversation', topic: 'Coffee date', usePipeline: true },
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        script: {
          channelId: 'english',
          date: '2026-03-07',
          category: 'conversation',
          metadata: {
            topic: 'Coffee date',
            style: 'casual',
            title: {
              target: 'Coffee Date Chat',
              native: '커피 데이트 대화',
            },
            characters: [
              {
                id: 'M',
                name: 'James',
                gender: 'male',
                ethnicity: 'American',
                role: 'friend',
              },
              {
                id: 'F',
                name: 'Soo-jin',
                gender: 'female',
                ethnicity: 'Korean',
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
        },
      })
    );

    const processed = await worker.runUntilEmpty();

    expect(processed).toBe(1);

    const refreshed = await service.getEpisode('english', episode.id);
    const jobs = await service.listJobs('english', episode.id);
    const script = await store.readStageArtifactJson<{ metadata: { topic: string } }>(
      'english',
      episode.id,
      'script',
      1,
      'generated-script.json'
    );

    expect(refreshed.stageStates.script.reviewStatus).toBe('pending_review');
    expect(refreshed.title).toBe('커피 데이트 대화');
    expect(refreshed.titleSource).toBe('script_auto');
    expect(jobs[0].status).toBe('completed');
    expect(script.metadata.topic).toBe('Coffee date');
  });

  it('processes a queued script generation job using the approved topic artifact', async () => {
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

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      payload: { usePipeline: true },
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        script: {
          channelId: 'english',
          date: '2026-03-07',
          category: 'conversation',
          metadata: {
            topic: 'Missed the train',
            style: 'casual',
            title: {
              target: 'Missed The Train',
              native: '지하철을 놓쳤어요',
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
              native: '오늘 아침 지하철을 놓쳤어.',
              words: [{ word: 'train', meaning: '기차, 지하철' }],
            },
          ],
        },
      })
    );

    const processed = await worker.runUntilEmpty();
    const script = await store.readStageArtifactJson<{ metadata: { topic: string } }>(
      'english',
      episode.id,
      'script',
      1,
      'generated-script.json'
    );

    expect(processed).toBe(1);
    expect(script.metadata.topic).toBe('Missed the train');
  });

  it('processes a queued image generation job using the approved script artifact', async () => {
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
          target: 'Coffee Date Chat',
          native: '커피 데이트 대화',
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
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      payload: { styleId: 'pixar_3d' },
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        imageManifest: {
          generatedAt: '2026-03-07T00:00:00.000Z',
          mode: 'background',
          backgroundImagePath: '/tmp/background.png',
          sceneImagePaths: [],
          styleId: 'pixar_3d',
        },
      })
    );

    const processed = await worker.runUntilEmpty();
    const manifest = await store.readStageArtifactJson<{
      mode: string;
      backgroundImagePath?: string;
      styleId?: string;
    }>('english', episode.id, 'image', 1, 'manifest.json');
    const refreshed = await service.getEpisode('english', episode.id);

    expect(processed).toBe(1);
    expect(manifest.mode).toBe('background');
    expect(manifest.styleId).toBe('pixar_3d');
    expect(refreshed.stageStates.image.reviewStatus).toBe('pending_review');
  });

  it('processes a queued tts generation job using the approved script artifact', async () => {
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
          target: 'Coffee Date Chat',
          native: '커피 데이트 대화',
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
    });

    await service.updateStageReviewStatus({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'script',
      version: scriptVersion.version,
      reviewStatus: 'approved',
    });

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'tts',
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        ttsManifest: {
          generatedAt: '2026-03-07T00:00:00.000Z',
          outputDir: '/tmp/workbench/audio',
          audioFiles: [
            {
              sentenceId: 1,
              speaker: 'M',
              speed: '1.0x',
              path: '/tmp/workbench/audio/sentence_01_M_10x.mp3',
              duration: 2.8,
            },
          ],
        },
      })
    );

    const processed = await worker.runUntilEmpty();
    const manifest = await store.readStageArtifactJson<{
      outputDir: string;
      audioFiles: Array<{ sentenceId: number; speed: string; path: string }>;
    }>('english', episode.id, 'tts', 1, 'manifest.json');
    const refreshed = await service.getEpisode('english', episode.id);

    expect(processed).toBe(1);
    expect(manifest.outputDir).toBe('/tmp/workbench/audio');
    expect(manifest.audioFiles).toHaveLength(1);
    expect(manifest.audioFiles[0].sentenceId).toBe(1);
    expect(refreshed.stageStates.tts.reviewStatus).toBe('pending_review');
  });

  it('reuses the current tts version for sentence-level regeneration', async () => {
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
          target: 'Coffee Date Chat',
          native: '커피 데이트 대화',
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
        {
          id: 2,
          speaker: 'M',
          target: 'Let us meet at the cafe.',
          targetBlank: 'Let us meet at the ______.',
          blankAnswer: 'cafe',
          native: '카페에서 만나자.',
          words: [{ word: 'cafe', meaning: '카페' }],
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
      outputDir: `${dataRoot}/tts/audio`,
      audioFiles: [
        {
          sentenceId: 1,
          speaker: 'M',
          speed: '1.0x',
          path: `${dataRoot}/tts/audio/sentence_01_M_10x.mp3`,
          duration: 2.8,
        },
        {
          sentenceId: 2,
          speaker: 'M',
          speed: '1.0x',
          path: `${dataRoot}/tts/audio/sentence_02_M_10x.mp3`,
          duration: 2.8,
        },
      ],
    });

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'tts',
      payload: { targetVersion: ttsVersion.version, sentenceIds: [2] },
    });

    let capturedInput:
      | Parameters<WorkbenchWorkerAdapters['generateTts']>[0]
      | undefined;

    const baseAdapters = createFakeAdapters({});
    const worker = new WorkbenchWorker(service, store, {
      ...baseAdapters,
      async generateTts(input) {
        capturedInput = input;
        return {
          generatedAt: '2026-03-07T00:00:00.000Z',
          outputDir: input.outputDir,
          audioFiles: [
            ...(input.existingManifest?.audioFiles.filter((audioFile) => audioFile.sentenceId !== 2) ?? []),
            {
              sentenceId: 2,
              speaker: 'M',
              speed: '1.0x',
              path: `${input.outputDir}/sentence_02_M_10x.regen.mp3`,
              duration: 3.2,
            },
          ],
        };
      },
    });

    const processed = await worker.runUntilEmpty();
    const manifest = await store.readStageArtifactJson<{
      audioFiles: Array<{ sentenceId: number; path: string }>;
    }>('english', episode.id, 'tts', 1, 'manifest.json');

    expect(processed).toBe(1);
    expect(capturedInput?.sentenceIds).toEqual([2]);
    expect(capturedInput?.existingManifest?.audioFiles).toHaveLength(2);
    expect(manifest.audioFiles).toHaveLength(2);
    expect(manifest.audioFiles[1].path).toContain('regen');
  });

  it('reuses the current image version for scene-level regeneration', async () => {
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
          target: 'Coffee Date Chat',
          native: '커피 데이트 대화',
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
            characterActions: 'James smiles at the counter',
            cameraDirection: 'Medium shot',
          },
          {
            sentenceRange: [2, 2],
            setting: 'cafe entrance',
            mood: 'friendly',
            characterActions: 'James points at the menu',
            cameraDirection: 'Wide shot',
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
        {
          id: 2,
          speaker: 'M',
          target: 'Let us meet at the cafe.',
          targetBlank: 'Let us meet at the ______.',
          blankAnswer: 'cafe',
          native: '카페에서 만나자.',
          words: [{ word: 'cafe', meaning: '카페' }],
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
      backgroundImagePath: `${dataRoot}/image/scene_1.png`,
      sceneImagePaths: [`${dataRoot}/image/scene_1.png`, `${dataRoot}/image/scene_2.png`],
      styleId: 'pixar_3d',
    });

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'image',
      payload: { targetVersion: imageVersion.version, sceneIndices: [2] },
    });

    let capturedInput:
      | Parameters<WorkbenchWorkerAdapters['generateImages']>[0]
      | undefined;

    const baseAdapters = createFakeAdapters({});
    const worker = new WorkbenchWorker(service, store, {
      ...baseAdapters,
      async generateImages(input) {
        capturedInput = input;
        return {
          generatedAt: '2026-03-07T00:00:00.000Z',
          mode: 'scene',
          backgroundImagePath: input.existingManifest?.backgroundImagePath,
          sceneImagePaths: [
            input.existingManifest?.sceneImagePaths[0] ?? `${input.outputDir}/scene_1.png`,
            `${input.outputDir}/scene_2.regen.png`,
          ],
          styleId: input.styleId ?? input.existingManifest?.styleId,
        };
      },
    });

    const processed = await worker.runUntilEmpty();
    const manifest = await store.readStageArtifactJson<{
      sceneImagePaths: string[];
    }>('english', episode.id, 'image', 1, 'manifest.json');

    expect(processed).toBe(1);
    expect(capturedInput?.sceneIndices).toEqual([2]);
    expect(capturedInput?.existingManifest?.sceneImagePaths).toHaveLength(2);
    expect(manifest.sceneImagePaths[1]).toContain('regen');
  });

  it('processes a queued render generation job using approved image and tts artifacts', async () => {
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
          target: 'Coffee Date Chat',
          native: '커피 데이트 대화',
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
      outputDir: '/tmp/workbench/audio',
      audioFiles: [
        {
          sentenceId: 1,
          speaker: 'M',
          speed: '1.0x',
          path: '/tmp/workbench/audio/sentence_01_M_10x.mp3',
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

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'render',
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        renderManifest: {
          generatedAt: '2026-03-07T00:00:00.000Z',
          compositionId: 'Main',
          videoPath: '/tmp/workbench/render/video.mp4',
          durationInFrames: 900,
          audioFileCount: 1,
          imageMode: 'background',
        },
      })
    );

    const processed = await worker.runUntilEmpty();
    const manifest = await store.readStageArtifactJson<{
      compositionId: string;
      videoPath: string;
      audioFileCount: number;
      imageMode: string;
    }>('english', episode.id, 'render', 1, 'manifest.json');
    const refreshed = await service.getEpisode('english', episode.id);

    expect(processed).toBe(1);
    expect(manifest.compositionId).toBe('Main');
    expect(manifest.audioFileCount).toBe(1);
    expect(manifest.imageMode).toBe('background');
    expect(refreshed.stageStates.render.reviewStatus).toBe('pending_review');
  });

  it('processes a queued shorts generation job using approved render and media artifacts', async () => {
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
          target: 'Coffee Date Chat',
          native: '커피 데이트 대화',
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
      outputDir: '/tmp/workbench/audio',
      audioFiles: [
        {
          sentenceId: 1,
          speaker: 'M',
          speed: '1.0x',
          path: '/tmp/workbench/audio/sentence_01_M_10x.mp3',
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
      videoPath: '/tmp/workbench/render/video.mp4',
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

    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'shorts',
    });

    const worker = new WorkbenchWorker(
      service,
      store,
      createFakeAdapters({
        shortsManifest: {
          generatedAt: '2026-03-07T00:00:00.000Z',
          compositionId: 'ListeningQuizShort',
          outputDir: '/tmp/workbench/shorts/quiz-shorts',
          sourceRenderVideoPath: '/tmp/workbench/render/video.mp4',
          outputs: [
            {
              sentenceId: 1,
              compositionId: 'ListeningQuizShort',
              outputPath: '/tmp/workbench/shorts/quiz-shorts/quiz_01.mp4',
              backgroundImage: 'background.png',
            },
          ],
        },
      })
    );

    const processed = await worker.runUntilEmpty();
    const manifest = await store.readStageArtifactJson<{
      compositionId: string;
      sourceRenderVideoPath: string;
      outputs: Array<{ sentenceId: number; outputPath: string }>;
    }>('english', episode.id, 'shorts', 1, 'manifest.json');
    const refreshed = await service.getEpisode('english', episode.id);

    expect(processed).toBe(1);
    expect(manifest.compositionId).toBe('ListeningQuizShort');
    expect(manifest.sourceRenderVideoPath).toBe('/tmp/workbench/render/video.mp4');
    expect(manifest.outputs).toHaveLength(1);
    expect(manifest.outputs[0].sentenceId).toBe(1);
    expect(refreshed.stageStates.shorts.reviewStatus).toBe('pending_review');
  });
});

function createFakeAdapters(overrides: {
  topicBundle?: {
    category: string;
    candidates: string[];
    recommendedTopic: string;
  };
  script?: unknown;
  imageManifest?: {
    generatedAt: string;
    mode: 'background' | 'scene';
    backgroundImagePath?: string;
    sceneImagePaths: string[];
    styleId?: string;
  };
  ttsManifest?: {
    generatedAt: string;
    outputDir: string;
    audioFiles: Array<{
      sentenceId: number;
      speaker: 'M' | 'F';
      speed: '0.8x' | '1.0x' | '1.2x';
      path: string;
      duration: number;
    }>;
  };
  renderManifest?: {
    generatedAt: string;
    compositionId: string;
    videoPath: string;
    durationInFrames: number;
    audioFileCount: number;
    imageMode: 'background' | 'scene';
  };
  shortsManifest?: {
    generatedAt: string;
    compositionId: string;
    outputDir: string;
    sourceRenderVideoPath: string;
    outputs: Array<{
      sentenceId: number;
      compositionId: string;
      outputPath: string;
      backgroundImage?: string;
    }>;
  };
}): WorkbenchWorkerAdapters {
  return {
    async generateTopicBundle(input) {
      return (
        overrides.topicBundle ?? {
          category: input.category,
          candidates: ['Topic A', 'Topic B', 'Topic C'],
          recommendedTopic: 'Topic A',
        }
      );
    },
    async generateScript(input) {
      return (
        overrides.script ?? {
          channelId: input.channelId,
          date: '2026-03-07',
          category: input.category,
          metadata: {
            topic: input.topic,
            style: 'casual',
            title: {
              target: 'Generated Script',
              native: '생성된 스크립트',
            },
            characters: [
              {
                id: 'M',
                name: 'Alex',
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
              target: 'Hello there.',
              targetBlank: 'Hello ______.',
              blankAnswer: 'there',
              native: '안녕.',
              words: [{ word: 'hello', meaning: '안녕' }],
            },
          ],
        }
      );
    },
    async generateImages(input) {
      return (
        overrides.imageManifest ?? {
          generatedAt: '2026-03-07T00:00:00.000Z',
          mode: 'background',
          backgroundImagePath: `${input.outputDir}/background.png`,
          sceneImagePaths: [],
          styleId: input.styleId,
        }
      );
    },
    async generateTts(input) {
      return (
        overrides.ttsManifest ?? {
          generatedAt: '2026-03-07T00:00:00.000Z',
          outputDir: input.outputDir,
          audioFiles: [
            {
              sentenceId: 1,
              speaker: 'M',
              speed: '1.0x',
              path: `${input.outputDir}/sentence_01_M_10x.mp3`,
              duration: 3,
            },
          ],
        }
      );
    },
    async generateRender(input) {
      return (
        overrides.renderManifest ?? {
          generatedAt: '2026-03-07T00:00:00.000Z',
          compositionId: 'Main',
          videoPath: `${input.outputDir}/video.mp4`,
          durationInFrames: 900,
          audioFileCount: input.ttsManifest.audioFiles.length,
          imageMode: input.imageManifest.mode,
        }
      );
    },
    async generateShorts(input) {
      return (
        overrides.shortsManifest ?? {
          generatedAt: '2026-03-07T00:00:00.000Z',
          compositionId: 'ListeningQuizShort',
          outputDir: `${input.outputDir}/quiz-shorts`,
          sourceRenderVideoPath: input.renderManifest.videoPath,
          outputs: input.ttsManifest.audioFiles
            .filter((audioFile) => audioFile.speed === '1.0x')
            .map((audioFile, index) => ({
              sentenceId: audioFile.sentenceId,
              compositionId: 'ListeningQuizShort',
              outputPath: `${input.outputDir}/quiz-shorts/quiz_${String(index + 1).padStart(2, '0')}.mp4`,
              backgroundImage: input.imageManifest.backgroundImagePath,
            })),
        }
      );
    },
  };
}
