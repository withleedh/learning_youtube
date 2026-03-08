import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type {
  ApiRequestLogEntry,
  ChannelOption,
  EpisodeSummary,
  EpisodeWorkflow,
  PackageManifest,
  ReviewQueueItem,
  StageReviewContext,
  StageVersionRecord,
  StageWorkflowSummary,
  WorkbenchLiveStatus,
} from './types';

const channels: ChannelOption[] = [
  {
    id: 'english',
    name: 'English Studio',
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
  },
  {
    id: 'japanese',
    name: 'Japanese Studio',
    targetLanguage: 'Japanese',
    nativeLanguage: 'Korean',
  },
];

const liveStatus: WorkbenchLiveStatus = {
  queuedJobs: 1,
  runningJobs: 0,
  failedJobs: 0,
  completedJobs: 0,
  activeJobCount: 1,
  activeRecordCount: 1,
  lastUpdatedAt: null,
};

const scriptRecord: EpisodeSummary = {
  id: 'ep-002',
  channelId: 'english',
  kind: 'candidate',
  threadId: 'thread-001',
  parentRecordId: 'ep-001',
  title: 'Coffee Date',
  previewText: 'Coffee Date',
  previewMeta: 'conversation · coffee shop',
  nextAction: 'Review and decide',
  lineageLabel: 'Script branch from ep-001',
  workflowStatus: 'awaiting_review',
  currentStage: 'script',
  createdAt: '2026-03-07T00:00:00.000Z',
  updatedAt: '2026-03-07T01:00:00.000Z',
  stageStates: {
    topic: { currentVersion: 1, approvedVersion: 1, reviewStatus: 'approved', staleReasons: [] },
    script: {
      currentVersion: 1,
      approvedVersion: null,
      reviewStatus: 'pending_review',
      staleReasons: [],
    },
    image: { currentVersion: 1, approvedVersion: 1, reviewStatus: 'stale', staleReasons: ['Image is stale because Script changed in the candidate funnel.'] },
    tts: { currentVersion: 1, approvedVersion: 1, reviewStatus: 'stale', staleReasons: ['Tts is stale because Script changed in the candidate funnel.'] },
    render: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    shorts: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    package: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
  },
};

const packageRecord: EpisodeSummary = {
  ...scriptRecord,
  id: 'ep-003',
  kind: 'episode',
  title: 'Delivery Ready Episode',
  workflowStatus: 'awaiting_review',
  currentStage: 'package',
  lineageLabel: 'Production episode from ep-002',
};

function createStage(stage: StageWorkflowSummary['stage'], reviewStatus: string): StageWorkflowSummary {
  return {
    stage,
    currentVersion: 1,
    approvedVersion: reviewStatus === 'approved' ? 1 : null,
    reviewStatus,
    blockedBy: [],
    staleReasons: reviewStatus === 'stale' ? [`${stage} needs refresh`] : [],
    isBlocked: false,
    latestJob: null,
    queuedJobCount: 0,
    runningJobCount: 0,
    failedJobCount: 0,
    completedJobCount: 0,
    canGenerate: true,
    canApprove: true,
    canRequestChanges: true,
  };
}

const scriptWorkflow: EpisodeWorkflow = {
  episode: scriptRecord,
  stages: [
    createStage('topic', 'approved'),
    createStage('script', 'pending_review'),
    createStage('image', 'stale'),
    createStage('tts', 'stale'),
    createStage('render', 'draft'),
    createStage('shorts', 'draft'),
    createStage('package', 'draft'),
  ],
  jobs: [],
};

const packageWorkflow: EpisodeWorkflow = {
  episode: packageRecord,
  stages: [
    createStage('topic', 'approved'),
    createStage('script', 'approved'),
    createStage('image', 'approved'),
    createStage('tts', 'approved'),
    createStage('render', 'approved'),
    createStage('shorts', 'approved'),
    createStage('package', 'pending_review'),
  ],
  jobs: [],
};

const topicRecord: EpisodeSummary = {
  ...scriptRecord,
  id: 'ep-006',
  kind: 'topic_pool',
  title: 'Fresh Topic Pool',
  previewText: 'Coffee Date',
  previewMeta: 'conversation · 2 candidates',
  workflowStatus: 'awaiting_review',
  currentStage: 'topic',
  stageStates: {
    topic: {
      currentVersion: 1,
      approvedVersion: null,
      reviewStatus: 'pending_review',
      staleReasons: [],
    },
    script: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    image: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    tts: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    render: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    shorts: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
    package: { currentVersion: 0, approvedVersion: null, reviewStatus: 'draft', staleReasons: [] },
  },
};

const topicWorkflow: EpisodeWorkflow = {
  episode: topicRecord,
  stages: [
    createStage('topic', 'pending_review'),
    { ...createStage('script', 'draft'), currentVersion: 0, canApprove: false },
    { ...createStage('image', 'draft'), currentVersion: 0, canApprove: false },
    { ...createStage('tts', 'draft'), currentVersion: 0, canApprove: false },
    { ...createStage('render', 'draft'), currentVersion: 0, canApprove: false },
    { ...createStage('shorts', 'draft'), currentVersion: 0, canApprove: false },
    { ...createStage('package', 'draft'), currentVersion: 0, canApprove: false },
  ],
  jobs: [],
};

const topicArtifact = {
  generatedAt: '2026-03-08T00:00:00.000Z',
  category: 'conversation',
  candidates: ['Coffee date', 'Missed the train'],
  recommendedTopic: 'Missed the train',
};

const scriptArtifact = {
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

const packageArtifact: PackageManifest = {
  generatedAt: '2026-03-08T00:00:00.000Z',
  titleCandidates: [
    { id: 't1', value: '영어 회화 - 커피 데이트 ✨💬🎯', source: 'competitor_style' },
    { id: 't2', value: '커피 데이트', source: 'native' },
  ],
  selectedTitle: '영어 회화 - 커피 데이트 ✨💬🎯',
  description: 'Package description',
  pinnedComment: 'Pinned comment',
  thumbnailCandidates: [
    {
      id: 'thumb-1',
      path: '/tmp/thumb-1.png',
      label: 'Primary title overlay',
      source: 'scene',
    },
  ],
  selectedThumbnailPath: '/tmp/thumb-1.png',
  uploadInfoPath: '/tmp/upload_info.txt',
  uploadInfoText: 'upload info',
  exportItems: [{ id: 'video', label: 'Rendered video', path: '/tmp/video.mp4' }],
};

const scriptVersions: StageVersionRecord[] = [
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

const packageVersions: StageVersionRecord[] = [
  {
    id: 'package_v001',
    episodeId: 'ep-003',
    stage: 'package',
    version: 1,
    reviewStatus: 'pending_review',
    createdAt: '2026-03-08T00:00:00.000Z',
    updatedAt: '2026-03-08T00:10:00.000Z',
    sourceVersionIds: [],
    notes: 'Initial package draft',
  },
];

const reviewQueue: ReviewQueueItem[] = [
  {
    id: 'english/ep-002',
    workspace: 'script_lab',
    channelId: 'english',
    recordId: 'ep-002',
    threadId: 'thread-001',
    kind: 'candidate',
    title: 'Coffee Date',
    previewText: 'Coffee Date',
    previewMeta: 'conversation',
    stage: 'script',
    workflowStatus: 'awaiting_review',
    reviewStatus: 'pending_review',
    createdAt: '2026-03-07T00:00:00.000Z',
    updatedAt: '2026-03-07T01:00:00.000Z',
    nextAction: 'Review and decide',
    issueCounts: { open: 1, stale: 2, comments: 1 },
    reviewTaskCounts: { reviewable: 1, blocked: 0, stale: 2 },
    lineageLabel: 'Script branch from ep-001',
  },
  {
    id: 'english/ep-003',
    workspace: 'delivery_pack',
    channelId: 'english',
    recordId: 'ep-003',
    threadId: 'thread-001',
    kind: 'episode',
    title: 'Delivery Ready Episode',
    previewText: 'Ready for packaging',
    previewMeta: 'package',
    stage: 'package',
    workflowStatus: 'awaiting_review',
    reviewStatus: 'pending_review',
    createdAt: '2026-03-08T00:00:00.000Z',
    updatedAt: '2026-03-08T01:00:00.000Z',
    nextAction: 'Review and decide',
    issueCounts: { open: 0, stale: 0, comments: 0 },
    reviewTaskCounts: { reviewable: 1, blocked: 0, stale: 0 },
    lineageLabel: 'Production episode from ep-002',
  },
];

const apiLogs: ApiRequestLogEntry[] = [
  {
    timestamp: '2026-03-08T02:00:00.000Z',
    method: 'POST',
    pathname: '/api/workbench/candidates/topic-batch',
    query: {},
    statusCode: 201,
    durationMs: 812,
    requestBody: {
      channelId: 'english',
      count: 20,
      category: 'conversation',
    },
  },
];

const runningTopicQueueItem: ReviewQueueItem = {
  id: 'english/ep-004',
  workspace: 'topic_inbox',
  channelId: 'english',
  recordId: 'ep-004',
  threadId: 'thread-004',
  kind: 'topic_pool',
  title: 'Running Topic Pool',
  previewText: 'Generating fresh topics',
  previewMeta: 'conversation',
  stage: 'topic',
  workflowStatus: 'in_progress',
  reviewStatus: 'draft',
  createdAt: '2026-03-08T01:00:00.000Z',
  updatedAt: '2026-03-08T01:05:00.000Z',
  nextAction: 'Generating',
  issueCounts: { open: 0, stale: 0, comments: 0 },
  reviewTaskCounts: { reviewable: 0, blocked: 0, stale: 0 },
  lineageLabel: 'Topic pool',
};

const reviewReadyTopicQueueItem: ReviewQueueItem = {
  id: 'english/ep-005',
  workspace: 'topic_inbox',
  channelId: 'english',
  recordId: 'ep-005',
  threadId: 'thread-005',
  kind: 'topic_pool',
  title: 'Review Topic Pool',
  previewText: 'Coffee Date',
  previewMeta: 'conversation',
  stage: 'topic',
  workflowStatus: 'awaiting_review',
  reviewStatus: 'pending_review',
  createdAt: '2026-03-08T01:00:00.000Z',
  updatedAt: '2026-03-08T01:10:00.000Z',
  nextAction: 'Review and decide',
  issueCounts: { open: 0, stale: 0, comments: 0 },
  reviewTaskCounts: { reviewable: 1, blocked: 0, stale: 0 },
  lineageLabel: 'Topic pool',
};

const generatingScriptQueueItem: ReviewQueueItem = {
  id: 'english/ep-007',
  workspace: 'script_lab',
  channelId: 'english',
  recordId: 'ep-007',
  threadId: 'thread-007',
  kind: 'script_pool',
  title: 'School Friends Script Pool',
  previewText: 'Generating script candidates',
  previewMeta: 'conversation',
  stage: 'script',
  workflowStatus: 'in_progress',
  reviewStatus: 'draft',
  createdAt: '2026-03-08T01:20:00.000Z',
  updatedAt: '2026-03-08T01:21:00.000Z',
  nextAction: 'Generating',
  issueCounts: { open: 0, stale: 0, comments: 0 },
  reviewTaskCounts: { reviewable: 0, blocked: 0, stale: 0 },
  lineageLabel: 'Script pool from ep-006',
};

const scriptContext: StageReviewContext = {
  episode: scriptRecord,
  thread: {
    threadId: 'thread-001',
    records: [scriptRecord],
  },
  stage: 'script',
  stageSummary: createStage('script', 'pending_review'),
  currentArtifact: scriptArtifact,
  approvedArtifact: scriptArtifact,
  versions: scriptVersions,
  comments: [
    {
      id: 'comment-1',
      channelId: 'english',
      recordId: 'ep-002',
      stage: 'script',
      kind: 'issue',
      status: 'open',
      text: 'Sentence 1 feels too flat.',
      createdAt: '2026-03-08T00:00:00.000Z',
      updatedAt: '2026-03-08T00:10:00.000Z',
      anchor: { kind: 'sentence', sentenceId: 1, label: 'Sentence 1' },
    },
  ],
  downstream: [
    {
      stage: 'image',
      reviewStatus: 'stale',
      staleReasons: ['Image is stale because Script changed in the candidate funnel.'],
      currentVersion: 1,
      approvedVersion: 1,
    },
  ],
};

const packageContext: StageReviewContext = {
  episode: packageRecord,
  thread: {
    threadId: 'thread-001',
    records: [scriptRecord, packageRecord],
  },
  stage: 'package',
  stageSummary: createStage('package', 'pending_review'),
  currentArtifact: packageArtifact,
  approvedArtifact: packageArtifact,
  versions: packageVersions,
  comments: [],
  downstream: [],
};

const jsonHeaders = { 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function notFoundResponse(): Response {
  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: jsonHeaders,
  });
}

function buildFetchMock(options?: { reviewQueueItems?: ReviewQueueItem[] }): typeof fetch {
  const reviewQueueItems = options?.reviewQueueItems ?? reviewQueue;
  return vi.fn(async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const pathname = url.split('?')[0];

    switch (pathname) {
      case '/api/workbench/channels':
        return jsonResponse({ channels });
      case '/api/workbench/live-status':
        return jsonResponse({ status: liveStatus });
      case '/api/workbench/candidates':
        return jsonResponse({ candidates: [scriptRecord] });
      case '/api/workbench/episodes':
        return jsonResponse({ episodes: [packageRecord] });
      case '/api/workbench/review-queue':
        return jsonResponse({ items: reviewQueueItems });
      case '/api/workbench/logs/api':
        return jsonResponse({ entries: apiLogs });
      case '/api/workbench/episodes/english/ep-002/workflow':
        return jsonResponse(scriptWorkflow);
      case '/api/workbench/episodes/english/ep-003/workflow':
        return jsonResponse(packageWorkflow);
      case '/api/workbench/episodes/english/ep-002/stages/script/current-artifact':
        return jsonResponse({ artifact: scriptArtifact });
      case '/api/workbench/episodes/english/ep-002/stages/script/approved-artifact':
        return jsonResponse({ artifact: scriptArtifact });
      case '/api/workbench/episodes/english/ep-002/stages/script/versions':
        return jsonResponse({ versions: scriptVersions });
      case '/api/workbench/episodes/english/ep-002/stages/script/versions/1/artifact':
        return jsonResponse({ artifact: scriptArtifact });
      case '/api/workbench/episodes/english/ep-002/stages/script/review-context':
        return jsonResponse({ context: scriptContext });
      case '/api/workbench/episodes/english/ep-003/stages/package/current-artifact':
        if (init?.method === 'PUT') {
          return jsonResponse({ artifact: packageArtifact });
        }
        return jsonResponse({ artifact: packageArtifact });
      case '/api/workbench/episodes/english/ep-003/stages/package/approved-artifact':
        return jsonResponse({ artifact: packageArtifact });
      case '/api/workbench/episodes/english/ep-003/stages/package/versions':
        return jsonResponse({ versions: packageVersions });
      case '/api/workbench/episodes/english/ep-003/stages/package/versions/1/artifact':
        return jsonResponse({ artifact: packageArtifact });
      case '/api/workbench/episodes/english/ep-003/stages/package/review-context':
        return jsonResponse({ context: packageContext });
      case '/api/workbench/records/english/ep-002/comments':
        return jsonResponse({ comment: scriptContext.comments[0] }, 201);
      default:
        return notFoundResponse();
    }
  }) as unknown as typeof fetch;
}

describe('Workbench App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '#english/ep-002/script');
    vi.stubGlobal('fetch', buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('renders the script lab workspace and script draft canvas for a selected script review', async () => {
    render(<App />);

    expect(await screen.findByText('Sibling Candidates', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Script Draft' })).toBeInTheDocument();
    expect(screen.getByText(/Created .* Updated /)).toBeInTheDocument();
  });

  it('opens the developer drawer and shows artifact json', async () => {
    render(<App />);

    const drawerButton = await screen.findByRole('button', { name: 'Show Developer Drawer' });
    fireEvent.click(drawerButton);

    expect(await screen.findByText('Current Artifact')).toBeInTheDocument();
    expect(screen.getAllByText(/Coffee Date/).length).toBeGreaterThan(0);
    expect(screen.getByText('Recent API Logs')).toBeInTheDocument();
    expect(screen.getByText('/api/workbench/candidates/topic-batch')).toBeInTheDocument();
  });

  it('closes the developer drawer when clicking outside the drawer', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Show Developer Drawer' }));
    expect(await screen.findByText('Recent API Logs')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Workbench Studio' }));

    expect(screen.queryByText('Recent API Logs')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Developer Drawer' })).toBeInTheDocument();
  });

  it('shows the delivery pack canvas for package review items', async () => {
    window.history.replaceState({}, '', '#english/ep-003/package');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<App />);

    expect(await screen.findByText('Title candidates')).toBeInTheDocument();
    expect(screen.getByText('Thumbnail gallery')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Package description')).toBeInTheDocument();
  });

  it('hides running topic pools from the topic inbox review queue', async () => {
    window.history.replaceState({}, '', '#english/ep-002/script');
    vi.stubGlobal(
      'fetch',
      buildFetchMock({
        reviewQueueItems: [runningTopicQueueItem, reviewReadyTopicQueueItem, ...reviewQueue],
      })
    );

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Topic Inbox' }));

    expect(await screen.findByText('Review Topic Pool')).toBeInTheDocument();
    expect(screen.queryByText('Running Topic Pool')).not.toBeInTheDocument();
  });

  it('keeps a selected running topic batch focused in the generating topics section instead of jumping to another review item', async () => {
    window.history.replaceState({}, '', '#english/ep-004/topic');
    const runningTopicRecord: EpisodeSummary = {
      ...topicRecord,
      id: 'ep-004',
      title: 'Running Topic Pool',
      previewText: 'Generating fresh topics',
      workflowStatus: 'in_progress',
      updatedAt: '2026-03-08T01:05:00.000Z',
    };
    const runningTopicWorkflow: EpisodeWorkflow = {
      ...topicWorkflow,
      episode: runningTopicRecord,
      stages: [{ ...createStage('topic', 'draft'), canApprove: false }],
    };
    let reviewReadyWorkflowHits = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        const pathname = url.split('?')[0];

        switch (pathname) {
          case '/api/workbench/channels':
            return jsonResponse({ channels });
          case '/api/workbench/live-status':
            return jsonResponse({ status: liveStatus });
          case '/api/workbench/candidates':
            return jsonResponse({ candidates: [runningTopicRecord, topicRecord] });
          case '/api/workbench/episodes':
            return jsonResponse({ episodes: [] });
          case '/api/workbench/review-queue':
            return jsonResponse({ items: [reviewReadyTopicQueueItem] });
          case '/api/workbench/logs/api':
            return jsonResponse({ entries: apiLogs });
          case '/api/workbench/episodes/english/ep-004/workflow':
            return jsonResponse(runningTopicWorkflow);
          case '/api/workbench/episodes/english/ep-004/stages/topic/current-artifact':
            return jsonResponse({ artifact: null });
          case '/api/workbench/episodes/english/ep-004/stages/topic/versions':
            return jsonResponse({ versions: [] });
          case '/api/workbench/episodes/english/ep-004/stages/topic/review-context':
            return jsonResponse({
              context: {
                episode: runningTopicRecord,
                thread: { threadId: 'thread-004', records: [runningTopicRecord] },
                stage: 'topic',
                stageSummary: { ...createStage('topic', 'draft'), canApprove: false },
                currentArtifact: null,
                approvedArtifact: null,
                versions: [],
                comments: [],
                downstream: [],
              },
            });
          case '/api/workbench/episodes/english/ep-005/workflow':
            reviewReadyWorkflowHits += 1;
            return jsonResponse(topicWorkflow);
          default:
            return notFoundResponse();
        }
      }) as unknown as typeof fetch
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Generating Topics' })).toBeInTheDocument();
    expect(screen.getByText('Running Topic Pool')).toBeInTheDocument();
    expect(screen.getByText('Review Topic Pool')).toBeInTheDocument();
    expect(reviewReadyWorkflowHits).toBe(0);
  });

  it('does not fetch approved-artifact for a topic stage before approval exists', async () => {
    window.history.replaceState({}, '', '#english/ep-006/topic');
    let approvedArtifactHits = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        const pathname = url.split('?')[0];

        switch (pathname) {
          case '/api/workbench/channels':
            return jsonResponse({ channels });
          case '/api/workbench/live-status':
            return jsonResponse({ status: liveStatus });
          case '/api/workbench/candidates':
            return jsonResponse({ candidates: [topicRecord] });
          case '/api/workbench/episodes':
            return jsonResponse({ episodes: [] });
          case '/api/workbench/review-queue':
            return jsonResponse({ items: [] });
          case '/api/workbench/logs/api':
            return jsonResponse({ entries: apiLogs });
          case '/api/workbench/episodes/english/ep-006/workflow':
            return jsonResponse(topicWorkflow);
          case '/api/workbench/episodes/english/ep-006/stages/topic/current-artifact':
            return jsonResponse({ artifact: topicArtifact });
          case '/api/workbench/episodes/english/ep-006/stages/topic/versions':
            return jsonResponse({ versions: [] });
          default:
            if (url === '/api/workbench/episodes/english/ep-006/stages/topic/approved-artifact') {
              approvedArtifactHits += 1;
              return jsonResponse({ error: 'should not be called' }, 500);
            }

            return notFoundResponse();
        }
      }) as unknown as typeof fetch
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Generated Topics' })).toBeInTheDocument();
    expect(screen.getByText('No generated topics yet. Generate topics to start reviewing.')).toBeInTheDocument();
    await waitFor(() => {
      expect(approvedArtifactHits).toBe(0);
    });
  });

  it('shows a per-topic approve action without the legacy decision panel controls', async () => {
    window.history.replaceState({}, '', '#english/ep-006/topic');
    const selectedTopicQueueItem: ReviewQueueItem = {
      ...reviewReadyTopicQueueItem,
      id: 'english/ep-006',
      recordId: 'ep-006',
      title: 'Fresh Topic Pool',
      previewText: 'Missed the train',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        const pathname = url.split('?')[0];

        switch (pathname) {
          case '/api/workbench/channels':
            return jsonResponse({ channels });
          case '/api/workbench/live-status':
            return jsonResponse({ status: liveStatus });
          case '/api/workbench/candidates':
            return jsonResponse({ candidates: [topicRecord] });
          case '/api/workbench/episodes':
            return jsonResponse({ episodes: [] });
          case '/api/workbench/review-queue':
            return jsonResponse({ items: [selectedTopicQueueItem] });
          case '/api/workbench/logs/api':
            return jsonResponse({ entries: apiLogs });
          case '/api/workbench/episodes/english/ep-006/workflow':
            return jsonResponse(topicWorkflow);
          case '/api/workbench/episodes/english/ep-006/stages/topic/current-artifact':
            return jsonResponse({ artifact: topicArtifact });
          case '/api/workbench/episodes/english/ep-006/stages/topic/versions':
            return jsonResponse({ versions: [] });
          case '/api/workbench/episodes/english/ep-006/stages/topic/review-context':
            return jsonResponse({
              context: {
                episode: topicRecord,
                thread: { threadId: 'thread-006', records: [topicRecord] },
                stage: 'topic',
                stageSummary: createStage('topic', 'pending_review'),
                currentArtifact: topicArtifact,
                approvedArtifact: null,
                versions: [],
                comments: [],
                downstream: [],
              },
            });
          default:
            return notFoundResponse();
        }
      }) as unknown as typeof fetch
    );

    render(<App />);

    expect(await screen.findByText('Fresh Topic Pool')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve & Next' })).not.toBeInTheDocument();
  });

  it('approves a topic and moves into script lab', async () => {
    window.history.replaceState({}, '', '#english/ep-006/topic');
    let scriptPoolQueued = false;
    const selectedTopicQueueItem: ReviewQueueItem = {
      ...reviewReadyTopicQueueItem,
      id: 'english/ep-006',
      recordId: 'ep-006',
      title: 'Fresh Topic Pool',
      previewText: 'Missed the train',
    };

    const fetchMock = vi.fn(async (input, _init) => {
      const url = typeof input === 'string' ? input : input.url;
      const pathname = url.split('?')[0];

      switch (pathname) {
        case '/api/workbench/channels':
          return jsonResponse({ channels });
        case '/api/workbench/live-status':
          return jsonResponse({ status: liveStatus });
        case '/api/workbench/candidates':
          return jsonResponse({
            candidates: scriptPoolQueued ? [topicRecord, { ...scriptRecord, id: 'ep-007', kind: 'script_pool' }] : [topicRecord],
          });
        case '/api/workbench/episodes':
          return jsonResponse({ episodes: [] });
        case '/api/workbench/logs/api':
          return jsonResponse({ entries: apiLogs });
        case '/api/workbench/review-queue':
          return jsonResponse({
            items: scriptPoolQueued ? [generatingScriptQueueItem] : [selectedTopicQueueItem],
          });
        case '/api/workbench/episodes/english/ep-006/workflow':
          return jsonResponse({
            ...topicWorkflow,
            stages: [topicWorkflow.stages[0]],
          });
        case '/api/workbench/episodes/english/ep-006/stages/topic/current-artifact':
          return jsonResponse({ artifact: topicArtifact });
        case '/api/workbench/episodes/english/ep-006/stages/topic/versions':
          return jsonResponse({ versions: [] });
        case '/api/workbench/episodes/english/ep-006/stages/topic/review-context':
          return jsonResponse({
            context: {
              episode: topicRecord,
              thread: { threadId: 'thread-006', records: [topicRecord] },
              stage: 'topic',
              stageSummary: createStage('topic', 'pending_review'),
              currentArtifact: topicArtifact,
              approvedArtifact: null,
              versions: [],
              comments: [],
              downstream: [],
            },
          });
        case '/api/workbench/episodes/english/ep-006/stages/topic/approve':
          return jsonResponse({
            stage: {
              ...createStage('topic', 'approved'),
              approvedVersion: 1,
            },
          });
        case '/api/workbench/episodes/english/ep-007/workflow':
          return jsonResponse({
            ...scriptWorkflow,
            episode: { ...scriptRecord, id: 'ep-007', kind: 'script_pool', title: 'School Friends Script Pool' },
            stages: [
              createStage('topic', 'approved'),
              { ...createStage('script', 'draft'), currentVersion: 1, canApprove: false },
            ],
            jobs: [],
          });
        case '/api/workbench/episodes/english/ep-007/stages/script/current-artifact':
          return notFoundResponse();
        case '/api/workbench/episodes/english/ep-007/stages/script/versions':
          return jsonResponse({ versions: [] });
        case '/api/workbench/episodes/english/ep-007/stages/script/review-context':
          return jsonResponse({
            context: {
              episode: { ...scriptRecord, id: 'ep-007', kind: 'script_pool', title: 'School Friends Script Pool' },
              thread: { threadId: 'thread-007', records: [{ ...scriptRecord, id: 'ep-007', kind: 'script_pool' }] },
              stage: 'script',
              stageSummary: { ...createStage('script', 'draft'), currentVersion: 1, canApprove: false },
              currentArtifact: null,
              approvedArtifact: null,
              versions: [],
              comments: [],
              downstream: [],
            },
          });
        case '/api/workbench/candidates/english/ep-006/script-batch':
          scriptPoolQueued = true;
          return jsonResponse({
            candidates: [{ ...scriptRecord, id: 'ep-007', kind: 'script_pool', title: 'School Friends Script Pool' }],
          });
        default:
          return notFoundResponse();
      }
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Fresh Topic Pool')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workbench/candidates/english/ep-006/script-batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            count: 5,
            usePipeline: true,
            approvedTopic: 'Missed the train',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Script Lab' })).toHaveClass('workspace-tab active');
    });
  });

  it('switches the selected topic card immediately when clicking another topic', async () => {
    window.history.replaceState({}, '', '#english/ep-006/topic');
    const selectedTopicQueueItem: ReviewQueueItem = {
      ...reviewReadyTopicQueueItem,
      id: 'english/ep-006',
      recordId: 'ep-006',
      title: 'Fresh Topic Pool',
      previewText: 'Missed the train',
    };
    const secondTopicRecord: EpisodeSummary = {
      ...topicRecord,
      id: 'ep-008',
      threadId: 'thread-008',
      title: 'Station Topic Pool',
      previewText: 'Late for class',
      updatedAt: '2026-03-08T02:00:00.000Z',
    };
    const secondTopicQueueItem: ReviewQueueItem = {
      ...selectedTopicQueueItem,
      id: 'english/ep-008',
      recordId: 'ep-008',
      threadId: 'thread-008',
      title: 'Station Topic Pool',
      previewText: 'Late for class',
      updatedAt: '2026-03-08T02:00:00.000Z',
    };
    const secondTopicWorkflow: EpisodeWorkflow = {
      ...topicWorkflow,
      episode: secondTopicRecord,
    };
    const secondTopicArtifact = {
      ...topicArtifact,
      candidates: ['Late for class', 'Forgot homework'],
      recommendedTopic: 'Late for class',
    };

    let resolveSecondReviewContext: ((value: Response) => void) | null = null;

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = typeof input === 'string' ? input : input.url;
        const pathname = url.split('?')[0];

        switch (pathname) {
          case '/api/workbench/channels':
            return Promise.resolve(jsonResponse({ channels }));
          case '/api/workbench/live-status':
            return Promise.resolve(jsonResponse({ status: liveStatus }));
          case '/api/workbench/candidates':
            return Promise.resolve({ ok: true, json: async () => ({ candidates: [topicRecord, secondTopicRecord] }) } as Response);
          case '/api/workbench/episodes':
            return Promise.resolve(jsonResponse({ episodes: [] }));
          case '/api/workbench/review-queue':
            return Promise.resolve(jsonResponse({ items: [selectedTopicQueueItem, secondTopicQueueItem] }));
          case '/api/workbench/logs/api':
            return Promise.resolve(jsonResponse({ entries: apiLogs }));
          case '/api/workbench/episodes/english/ep-006/workflow':
            return Promise.resolve(jsonResponse(topicWorkflow));
          case '/api/workbench/episodes/english/ep-006/stages/topic/current-artifact':
            return Promise.resolve(jsonResponse({ artifact: topicArtifact }));
          case '/api/workbench/episodes/english/ep-006/stages/topic/versions':
            return Promise.resolve(jsonResponse({ versions: [] }));
          case '/api/workbench/episodes/english/ep-006/stages/topic/review-context':
            return Promise.resolve(
              jsonResponse({
                context: {
                  episode: topicRecord,
                  thread: { threadId: 'thread-006', records: [topicRecord] },
                  stage: 'topic',
                  stageSummary: createStage('topic', 'pending_review'),
                  currentArtifact: topicArtifact,
                  approvedArtifact: null,
                  versions: [],
                  comments: [],
                  downstream: [],
                },
              })
            );
          case '/api/workbench/episodes/english/ep-008/workflow':
            return Promise.resolve(jsonResponse(secondTopicWorkflow));
          case '/api/workbench/episodes/english/ep-008/stages/topic/current-artifact':
            return Promise.resolve(jsonResponse({ artifact: secondTopicArtifact }));
          case '/api/workbench/episodes/english/ep-008/stages/topic/versions':
            return Promise.resolve(jsonResponse({ versions: [] }));
          case '/api/workbench/episodes/english/ep-008/stages/topic/review-context':
            return new Promise<Response>((resolve) => {
              resolveSecondReviewContext = resolve;
            });
          default:
            return Promise.resolve(notFoundResponse());
        }
      }) as unknown as typeof fetch
    );

    render(<App />);

    expect(await screen.findByText('Fresh Topic Pool')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Station Topic Pool/i }));

    const firstCard = screen.getByText('Fresh Topic Pool').closest('.topic-list-row');
    const secondCard = screen.getByText('Station Topic Pool').closest('.topic-list-row');

    await waitFor(() => {
      expect(firstCard).not.toHaveClass('active');
      expect(secondCard).toHaveClass('active');
    });

    resolveSecondReviewContext?.(
      jsonResponse({
        context: {
          episode: secondTopicRecord,
          thread: { threadId: 'thread-008', records: [secondTopicRecord] },
          stage: 'topic',
          stageSummary: createStage('topic', 'pending_review'),
          currentArtifact: secondTopicArtifact,
          approvedArtifact: null,
          versions: [],
          comments: [],
          downstream: [],
        },
      })
    );

    await waitFor(() => {
      expect(secondCard).toHaveClass('active');
    });
    expect(screen.getAllByText('Station Topic Pool').length).toBeGreaterThan(0);
  });

  it('switches the studio channel context and clears records from other channels', async () => {
    render(<App />);

    expect(await screen.findByText('Sibling Candidates', {}, { timeout: 4000 })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Channel Workspace' }), {
      target: { value: 'japanese' },
    });

    await waitFor(() => {
      expect(screen.getByText('No review tasks for Japanese Studio yet.')).toBeInTheDocument();
    });
    expect(screen.getByText('Japanese -> Korean')).toBeInTheDocument();
    expect(screen.queryByText('Coffee Date')).not.toBeInTheDocument();
  });

  it('does not trigger request changes when the browser refresh shortcut is pressed', async () => {
    const fetchMock = buildFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Sibling Candidates', {}, { timeout: 4000 })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'r', metaKey: true });

    await waitFor(() => {
      const requestChangesCalls = fetchMock.mock.calls.filter(([input, init]) => {
        const url = typeof input === 'string' ? input : input.url;
        return (
          url.includes('/stages/script/request-changes') &&
          (init?.method ?? 'GET') === 'POST'
        );
      });
      expect(requestChangesCalls).toHaveLength(0);
    });
  });
});
