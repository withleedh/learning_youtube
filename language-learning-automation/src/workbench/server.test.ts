// @vitest-environment node

import type http from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getWorkbenchApiLogPath } from './paths';
import { WorkbenchService } from './service';
import { createWorkbenchServer } from './server';
import { WorkbenchStore } from './store';

describe('WorkbenchServer', () => {
  let dataRoot: string;
  let store: WorkbenchStore;
  let service: WorkbenchService;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(os.tmpdir(), 'workbench-server-'));
    store = new WorkbenchStore(dataRoot);
    service = new WorkbenchService(store);
    server = await createWorkbenchServer(service);
    baseUrl = await listen(server);
  });

  afterEach(async () => {
    await closeServer(server);
    await rm(dataRoot, { recursive: true, force: true });
  });

  it('returns workflow summary for an episode', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    await service.enqueueStageGeneration({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      payload: { category: 'conversation', candidateCount: 3 },
    });

    const response = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/workflow`
    );
    const body = (await response.json()) as {
      episode: { id: string };
      stages: Array<{ stage: string; queuedJobCount: number; isBlocked: boolean }>;
      jobs: Array<{ stage: string; status: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.episode.id).toBe(episode.id);
    expect(body.jobs).toHaveLength(1);
    expect(body.stages.find((stage) => stage.stage === 'topic')?.queuedJobCount).toBe(1);
    expect(body.stages.find((stage) => stage.stage === 'script')?.isBlocked).toBe(true);
  });

  it('creates and lists topic candidates through the candidate pool endpoints', async () => {
    const createResponse = await fetch(`${baseUrl}/api/workbench/candidates/topic-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: 'english',
        count: 2,
        category: 'conversation',
      }),
    });
    const createBody = (await createResponse.json()) as {
      candidates: Array<{ id: string; kind: string }>;
    };

    const listResponse = await fetch(`${baseUrl}/api/workbench/candidates`);
    const listBody = (await listResponse.json()) as {
      candidates: Array<{ id: string; kind: string }>;
    };

    expect(createResponse.status).toBe(201);
    expect(createBody.candidates).toHaveLength(1);
    expect(createBody.candidates.every((candidate) => candidate.kind === 'topic_pool')).toBe(true);
    expect(listResponse.status).toBe(200);
    expect(listBody.candidates).toHaveLength(1);
  });

  it('writes mutation API calls to the workbench api log', async () => {
    const response = await fetch(`${baseUrl}/api/workbench/candidates/topic-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: 'english',
        count: 2,
        category: 'conversation',
      }),
    });

    const logPath = getWorkbenchApiLogPath(dataRoot);
    const rawLog = await readFileWithRetry(logPath);
    const entries = rawLog
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as {
        method: string;
        pathname: string;
        statusCode: number;
        requestBody?: { channelId?: string; count?: number; category?: string };
      });

    expect(response.status).toBe(201);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.method).toBe('POST');
    expect(entries[0]?.pathname).toBe('/api/workbench/candidates/topic-batch');
    expect(entries[0]?.statusCode).toBe(201);
    expect(entries[0]?.requestBody).toMatchObject({
      channelId: 'english',
      count: 2,
      category: 'conversation',
    });
  });

  it('returns recent api log entries in reverse chronological order', async () => {
    await fetch(`${baseUrl}/api/workbench/candidates/topic-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: 'english',
        count: 2,
        category: 'conversation',
      }),
    });

    await readFileWithRetry(getWorkbenchApiLogPath(dataRoot));

    const response = await fetch(`${baseUrl}/api/workbench/logs/api?limit=10`);
    const body = (await response.json()) as {
      entries: Array<{
        method: string;
        pathname: string;
        statusCode: number;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.entries.length).toBeGreaterThan(0);
    expect(body.entries[0]?.method).toBe('POST');
    expect(body.entries[0]?.pathname).toBe('/api/workbench/candidates/topic-batch');
    expect(body.entries[0]?.statusCode).toBe(201);
  });

  it('bulk reviews selected candidates through the candidate pool endpoint', async () => {
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
    const candidates = [firstBatch.candidates[0]!, secondBatch.candidates[0]!];

    for (const candidate of candidates) {
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

    const response = await fetch(`${baseUrl}/api/workbench/candidates/bulk-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: candidates.map((candidate) => ({
          channelId: candidate.channelId,
          candidateId: candidate.id,
        })),
        reviewStatus: 'approved',
      }),
    });
    const body = (await response.json()) as {
      processed: Array<{ candidateId: string; reviewStatus: string }>;
      skipped: Array<{ candidateId: string; reason: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.processed).toHaveLength(2);
    expect(body.skipped).toHaveLength(0);
    expect(body.processed.every((item) => item.reviewStatus === 'approved')).toBe(true);
  });

  it('returns available workbench channels', async () => {
    const response = await fetch(`${baseUrl}/api/workbench/channels`);
    const body = (await response.json()) as {
      channels: Array<{ id: string; name: string; targetLanguage: string; nativeLanguage: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.channels.length).toBeGreaterThan(0);
    expect(body.channels.some((channel) => channel.id === 'english')).toBe(true);
    expect(body.channels.find((channel) => channel.id === 'english')?.name).toContain('English');
  });

  it('returns live job status for the workbench', async () => {
    const batch = await service.createTopicCandidateBatch({
      channelId: 'english',
      count: 2,
      category: 'conversation',
    });
    const runningJob = batch.jobs[0];
    await service.updateJob({
      ...runningJob,
      status: 'running',
      updatedAt: '2026-03-08T12:00:00.000Z',
    });

    const response = await fetch(`${baseUrl}/api/workbench/live-status`);
    const body = (await response.json()) as {
      status: {
        queuedJobs: number;
        runningJobs: number;
        activeJobCount: number;
        activeRecordCount: number;
        lastUpdatedAt: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.status.queuedJobs).toBe(0);
    expect(body.status.runningJobs).toBe(1);
    expect(body.status.activeJobCount).toBe(1);
    expect(body.status.activeRecordCount).toBe(1);
    expect(body.status.lastUpdatedAt).toBe('2026-03-08T12:00:00.000Z');
  });

  it('serves the workbench UI shell and current stage artifacts', async () => {
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

    const htmlResponse = await fetch(`${baseUrl}/workbench`);
    const html = await htmlResponse.text();

    const artifactResponse = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/topic/current-artifact`
    );
    const artifactBody = (await artifactResponse.json()) as {
      stage: string;
      artifact: { candidates: string[]; recommendedTopic: string };
    };

    expect(htmlResponse.status).toBe(200);
    expect(html).toContain('Channel Workbench');
    expect(artifactResponse.status).toBe(200);
    expect(artifactBody.stage).toBe('topic');
    expect(artifactBody.artifact.candidates).toHaveLength(2);
  });

  it('returns stage version history and a specific stage version artifact', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });
    const firstVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'draft',
      notes: 'Initial scout pass',
    });
    const secondVersion = await service.createStageVersion({
      channelId: 'english',
      episodeId: episode.id,
      stage: 'topic',
      reviewStatus: 'pending_review',
      sourceVersionIds: [firstVersion.id],
      notes: 'Refined shortlist',
    });

    await store.saveStageArtifactJson('english', episode.id, 'topic', secondVersion.version, 'candidates.json', {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date', 'Missed the train'],
      recommendedTopic: 'Missed the train',
    });

    const versionsResponse = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/topic/versions`
    );
    const versionsBody = (await versionsResponse.json()) as {
      stage: string;
      versions: Array<{ version: number; notes?: string; sourceVersionIds: string[] }>;
    };

    const artifactResponse = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/topic/versions/${secondVersion.version}/artifact`
    );
    const artifactBody = (await artifactResponse.json()) as {
      stage: string;
      version: number;
      artifact: { recommendedTopic: string; candidates: string[] };
    };

    expect(versionsResponse.status).toBe(200);
    expect(versionsBody.stage).toBe('topic');
    expect(versionsBody.versions.map((version) => version.version)).toEqual([2, 1]);
    expect(versionsBody.versions[0].notes).toBe('Refined shortlist');
    expect(versionsBody.versions[0].sourceVersionIds).toEqual([firstVersion.id]);
    expect(artifactResponse.status).toBe(200);
    expect(artifactBody.stage).toBe('topic');
    expect(artifactBody.version).toBe(2);
    expect(artifactBody.artifact.recommendedTopic).toBe('Missed the train');
  });

  it('approves a stage through the action endpoint and returns the approved artifact', async () => {
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

    const approveResponse = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/topic/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: topicVersion.version }),
      }
    );

    const artifactResponse = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/topic/approved-artifact`
    );
    const artifactBody = (await artifactResponse.json()) as {
      stage: string;
      artifact: { approvedTopic: string; source: string };
    };

    expect(approveResponse.status).toBe(200);
    expect(artifactResponse.status).toBe(200);
    expect(artifactBody.stage).toBe('topic');
    expect(artifactBody.artifact.approvedTopic).toBe('Missed the train');
    expect(artifactBody.artifact.source).toBe('recommended');
  });

  it('returns 404 for approved-artifact when the stage has not been approved yet', async () => {
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

    const response = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/topic/approved-artifact`
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toContain('No approved topic found');
  });

  it('marks a stage as changes requested through the action endpoint', async () => {
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

    const response = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/script/request-changes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: scriptVersion.version }),
      }
    );
    const body = (await response.json()) as {
      episode: { stageStates: { script: { reviewStatus: string } } };
      version: { reviewStatus: string };
    };

    expect(response.status).toBe(200);
    expect(body.version.reviewStatus).toBe('changes_requested');
    expect(body.episode.stageStates.script.reviewStatus).toBe('changes_requested');
  });

  it('saves a script draft through the current artifact endpoint', async () => {
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

    const response = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/script/current-artifact`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
                characterActions: 'James greets the barista with a smile',
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
        }),
      }
    );
    const body = (await response.json()) as {
      version: { version: number; reviewStatus: string };
      artifact: { sentences: Array<{ target: string }> };
      impact: { changedSentenceIds: number[]; affectedSceneIndices: number[] };
    };

    expect(response.status).toBe(200);
    expect(body.version.version).toBe(1);
    expect(body.version.reviewStatus).toBe('pending_review');
    expect(body.artifact.sentences[0].target).toContain('grab coffee later');
    expect(body.impact.changedSentenceIds).toEqual([1]);
    expect(body.impact.affectedSceneIndices).toEqual([1]);
  });

  it('returns the review queue and thread lineage for spawned script candidates', async () => {
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
    await service.createScriptCandidateBatch({
      channelId: 'english',
      sourceCandidateId: sourceCandidate.id,
      count: 1,
      category: 'conversation',
      usePipeline: true,
    });

    const queueResponse = await fetch(`${baseUrl}/api/workbench/review-queue`);
    const queueBody = (await queueResponse.json()) as {
      items: Array<{ workspace: string; threadId: string; lineageLabel: string }>;
    };

    const threadResponse = await fetch(
      `${baseUrl}/api/workbench/threads/${sourceCandidate.threadId}`
    );
    const threadBody = (await threadResponse.json()) as {
      thread: { threadId: string; records: Array<{ id: string; kind: string }> };
    };

    expect(queueResponse.status).toBe(200);
    expect(queueBody.items.some((item) => item.workspace === 'script_lab')).toBe(true);
    expect(queueBody.items.every((item) => item.threadId === sourceCandidate.threadId)).toBe(true);
    expect(queueBody.items.some((item) => item.lineageLabel.includes(sourceCandidate.id))).toBe(true);
    expect(threadResponse.status).toBe(200);
    expect(threadBody.thread.threadId).toBe(sourceCandidate.threadId);
    expect(threadBody.thread.records).toHaveLength(2);
  });

  it('stores review comments and returns them in the stage review context', async () => {
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

    const commentResponse = await fetch(
      `${baseUrl}/api/workbench/records/english/${episode.id}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'script',
          version: scriptVersion.version,
          text: 'Sentence 1 needs more energy.',
          kind: 'issue',
          anchor: {
            kind: 'sentence',
            sentenceId: 1,
            label: 'Sentence 1',
          },
        }),
      }
    );
    const commentBody = (await commentResponse.json()) as {
      comment: { text: string; anchor?: { kind: string } };
    };

    const contextResponse = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/script/review-context`
    );
    const contextBody = (await contextResponse.json()) as {
      context: { comments: Array<{ text: string; anchor?: { kind: string } }> };
    };

    expect(commentResponse.status).toBe(201);
    expect(commentBody.comment.text).toBe('Sentence 1 needs more energy.');
    expect(commentBody.comment.anchor?.kind).toBe('sentence');
    expect(contextResponse.status).toBe(200);
    expect(contextBody.context.comments).toHaveLength(1);
    expect(contextBody.context.comments[0]?.text).toBe('Sentence 1 needs more energy.');
  });

  it('saves package drafts through the current artifact endpoint', async () => {
    const episode = await service.createEpisode({ channelId: 'english' });

    const response = await fetch(
      `${baseUrl}/api/workbench/episodes/english/${episode.id}/stages/package/current-artifact`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatedAt: '2026-03-08T00:00:00.000Z',
          titleCandidates: [
            { id: 'title-1', value: 'Coffee Date English Practice', source: 'manual' },
          ],
          selectedTitle: 'Coffee Date English Practice',
          description: 'Practice a cafe conversation in English.',
          pinnedComment: 'Tell us your favorite coffee order.',
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
        }),
      }
    );
    const body = (await response.json()) as {
      version: { version: number; reviewStatus: string };
      artifact: { selectedTitle: string; selectedThumbnailPath: string };
    };

    expect(response.status).toBe(200);
    expect(body.version.version).toBe(1);
    expect(body.version.reviewStatus).toBe('pending_review');
    expect(body.artifact.selectedTitle).toBe('Coffee Date English Practice');
    expect(body.artifact.selectedThumbnailPath).toBe('/tmp/thumb-1.png');
  });

  it('streams files inside the allowed workbench roots', async () => {
    const previewPath = path.join(dataRoot, 'preview.txt');
    await writeFile(previewPath, 'preview-content', 'utf-8');

    const response = await fetch(
      `${baseUrl}/api/workbench/file?path=${encodeURIComponent(previewPath)}`
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toBe('preview-content');
  });
});

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine server address');
  }

  return `http://127.0.0.1:${address.port}`;
}

async function readFileWithRetry(filePath: string, attempts = 10): Promise<string> {
  let lastError: unknown;

  for (let index = 0; index < attempts; index++) {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  throw lastError;
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
