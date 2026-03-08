// @vitest-environment node

import type http from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
    expect(createBody.candidates).toHaveLength(2);
    expect(createBody.candidates.every((candidate) => candidate.kind === 'candidate')).toBe(true);
    expect(listResponse.status).toBe(200);
    expect(listBody.candidates).toHaveLength(2);
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
