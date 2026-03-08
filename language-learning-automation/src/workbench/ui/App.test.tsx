import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type {
  ChannelOption,
  EpisodeSummary,
  EpisodeWorkflow,
  ImageManifest,
  ScriptArtifact,
  StageVersionRecord,
  StageWorkflowSummary,
  TtsManifest,
} from './types';

const episodes: EpisodeSummary[] = [
  {
    id: 'ep-001',
    channelId: 'english',
    kind: 'episode',
    title: 'First Episode',
    workflowStatus: 'draft',
    currentStage: 'topic',
    createdAt: '2026-03-07T00:00:00.000Z',
    updatedAt: '2026-03-07T01:00:00.000Z',
  },
  {
    id: 'ep-002',
    channelId: 'english',
    kind: 'episode',
    title: 'Coffee Date',
    workflowStatus: 'in_review',
    currentStage: 'topic',
    createdAt: '2026-03-07T00:00:00.000Z',
    updatedAt: '2026-03-07T01:00:00.000Z',
  },
];

const candidates: EpisodeSummary[] = [];

const channels: ChannelOption[] = [
  {
    id: 'english',
    name: '들려요! English!',
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
  },
  {
    id: 'japan_english',
    name: '聞こえる！English!',
    targetLanguage: 'English',
    nativeLanguage: 'Japanese',
  },
];

const scriptArtifact: ScriptArtifact = {
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
        characterActions: 'James smiles.',
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
};

function createStage(stage: StageWorkflowSummary['stage'], overrides?: Partial<StageWorkflowSummary>): StageWorkflowSummary {
  return {
    stage,
    currentVersion: 1,
    approvedVersion: stage === 'topic' ? 1 : null,
    reviewStatus: stage === 'topic' ? 'approved' : 'pending_review',
    blockedBy: [],
    isBlocked: false,
    latestJob: null,
    queuedJobCount: 0,
    runningJobCount: 0,
    failedJobCount: 0,
    completedJobCount: 0,
    canGenerate: true,
    canApprove: true,
    canRequestChanges: true,
    ...overrides,
  };
}

const workflow: EpisodeWorkflow = {
  episode: episodes[1],
  stages: [
    createStage('topic'),
    createStage('script'),
    createStage('image', { reviewStatus: 'stale', approvedVersion: 1 }),
    createStage('tts', { reviewStatus: 'stale', approvedVersion: 1 }),
    createStage('render'),
    createStage('shorts'),
  ],
  jobs: [],
};

const stageVersions: StageVersionRecord[] = [
  {
    id: 'script_v001',
    episodeId: 'ep-002',
    stage: 'script',
    version: 1,
    reviewStatus: 'pending_review',
    createdAt: '2026-03-07T00:00:00.000Z',
    updatedAt: '2026-03-07T00:10:00.000Z',
    sourceVersionIds: [],
    notes: 'Initial script draft',
  },
];

const ttsVersions: StageVersionRecord[] = [
  {
    id: 'tts_v001',
    episodeId: 'ep-002',
    stage: 'tts',
    version: 1,
    reviewStatus: 'stale',
    createdAt: '2026-03-07T00:00:00.000Z',
    updatedAt: '2026-03-07T00:10:00.000Z',
    sourceVersionIds: ['script_v001'],
    notes: 'From approved script',
  },
];

const ttsManifest: TtsManifest = {
  generatedAt: '2026-03-07T00:00:00.000Z',
  outputDir: '/tmp/audio',
  audioFiles: [
    {
      sentenceId: 1,
      speaker: 'M',
      speed: '1.0x',
      path: '/tmp/1.mp3',
      duration: 1.2,
    },
  ],
};

const imageManifest: ImageManifest = {
  generatedAt: '2026-03-07T00:00:00.000Z',
  mode: 'scene',
  sceneImagePaths: ['/tmp/scene-1.png'],
};

const jsonHeaders = { 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function notFoundResponse(): Response {
  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: jsonHeaders,
  });
}

describe('Workbench App', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '#english/ep-002/script');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('respects the hash selection and loads the selected script stage on mount', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.url;

      switch (url) {
        case '/api/workbench/channels':
          return jsonResponse({ channels });
        case '/api/workbench/candidates':
          return jsonResponse({ candidates });
        case '/api/workbench/episodes':
          return jsonResponse({ episodes });
        case '/api/workbench/episodes/english/ep-002/workflow':
          return jsonResponse(workflow);
        case '/api/workbench/episodes/english/ep-002/stages/script/current-artifact':
          return jsonResponse({ artifact: scriptArtifact });
        case '/api/workbench/episodes/english/ep-002/stages/script/approved-artifact':
          return jsonResponse({ artifact: scriptArtifact });
        case '/api/workbench/episodes/english/ep-002/stages/script/versions':
          return jsonResponse({ versions: stageVersions });
        case '/api/workbench/episodes/english/ep-002/stages/script/versions/1/artifact':
          return jsonResponse({ artifact: scriptArtifact });
        default:
          return notFoundResponse();
      }
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Script Inspector' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Channel' })).toHaveValue('english');
    expect(screen.getByRole('heading', { name: 'Coffee Date' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#english/ep-002/script');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workbench/episodes',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('updates the selected stage and hash when a workflow stage card is clicked', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.url;

      switch (url) {
        case '/api/workbench/channels':
          return jsonResponse({ channels });
        case '/api/workbench/candidates':
          return jsonResponse({ candidates });
        case '/api/workbench/episodes':
          return jsonResponse({ episodes });
        case '/api/workbench/episodes/english/ep-002/workflow':
          return jsonResponse(workflow);
        case '/api/workbench/episodes/english/ep-002/stages/script/current-artifact':
          return jsonResponse({ artifact: scriptArtifact });
        case '/api/workbench/episodes/english/ep-002/stages/script/approved-artifact':
          return jsonResponse({ artifact: scriptArtifact });
        case '/api/workbench/episodes/english/ep-002/stages/script/versions':
          return jsonResponse({ versions: stageVersions });
        case '/api/workbench/episodes/english/ep-002/stages/script/versions/1/artifact':
          return jsonResponse({ artifact: scriptArtifact });
        case '/api/workbench/episodes/english/ep-002/stages/tts/current-artifact':
          return jsonResponse({ artifact: ttsManifest });
        case '/api/workbench/episodes/english/ep-002/stages/tts/approved-artifact':
          return jsonResponse({ artifact: ttsManifest });
        case '/api/workbench/episodes/english/ep-002/stages/tts/versions':
          return jsonResponse({ versions: ttsVersions });
        case '/api/workbench/episodes/english/ep-002/stages/tts/versions/1/artifact':
          return jsonResponse({ artifact: ttsManifest });
        case '/api/workbench/episodes/english/ep-002/stages/image/current-artifact':
          return jsonResponse({ artifact: imageManifest });
        case '/api/workbench/episodes/english/ep-002/stages/image/approved-artifact':
          return jsonResponse({ artifact: imageManifest });
        case '/api/workbench/episodes/english/ep-002/stages/image/versions':
          return jsonResponse({ versions: [] });
        default:
          return notFoundResponse();
      }
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Script Inspector' });

    const ttsStageButton = screen
      .getByText('TTS')
      .closest('button');
    if (!ttsStageButton) {
      throw new Error('TTS stage button not found');
    }

    fireEvent.click(ttsStageButton);

    expect(await screen.findByRole('heading', { name: 'TTS Inspector' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Regenerate sentence 1' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe('#english/ep-002/tts');
    });
  });

  it('creates topic candidates without crashing when the batch form is submitted', async () => {
    const createdCandidate: EpisodeSummary = {
      id: 'ep-003',
      channelId: 'english',
      kind: 'candidate',
      workflowStatus: 'draft',
      currentStage: 'topic',
      createdAt: '2026-03-08T00:00:00.000Z',
      updatedAt: '2026-03-08T00:00:00.000Z',
    };
    let candidateListCalls = 0;

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;

      switch (url) {
        case '/api/workbench/channels':
          return jsonResponse({ channels });
        case '/api/workbench/candidates':
          if (init?.method === 'POST') {
            return jsonResponse({ candidates: [createdCandidate] }, 201);
          }

          candidateListCalls += 1;
          return jsonResponse({
            candidates: candidateListCalls === 1 ? [] : [createdCandidate],
          });
        case '/api/workbench/episodes':
          return jsonResponse({ episodes: [] });
        case '/api/workbench/candidates/topic-batch':
          return jsonResponse({ candidates: [createdCandidate] }, 201);
        case '/api/workbench/episodes/english/ep-003/workflow':
          return jsonResponse({
            episode: createdCandidate,
            stages: [
              createStage('topic', {
                currentVersion: 0,
                approvedVersion: null,
                reviewStatus: 'draft',
              }),
              createStage('script', {
                currentVersion: 0,
                approvedVersion: null,
                reviewStatus: 'draft',
                isBlocked: true,
                blockedBy: ['topic'],
              }),
            ],
            jobs: [],
          } satisfies EpisodeWorkflow);
        case '/api/workbench/episodes/english/ep-003/stages/topic/current-artifact':
          return notFoundResponse();
        case '/api/workbench/episodes/english/ep-003/stages/topic/approved-artifact':
          return notFoundResponse();
        case '/api/workbench/episodes/english/ep-003/stages/topic/versions':
          return jsonResponse({ versions: [] });
        default:
          return notFoundResponse();
      }
    });

    render(<App />);

    expect(await screen.findByRole('combobox', { name: 'Channel' })).toHaveValue('english');

    fireEvent.click(screen.getByRole('button', { name: 'Generate Topic Candidates' }));

    expect(await screen.findByText('1 topic candidates queued.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'ep-003' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#english/ep-003/topic');
  });
});
