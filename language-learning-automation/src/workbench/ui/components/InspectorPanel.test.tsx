import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InspectorPanel } from './InspectorPanel';
import type {
  EpisodeWorkflow,
  ImageManifest,
  ScriptArtifact,
  StageVersionRecord,
  StageWorkflowSummary,
  TtsManifest,
} from '../types';

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
        setting: 'cafe',
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
    approvedVersion: null,
    reviewStatus: 'pending_review',
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

function createWorkflow(stages?: StageWorkflowSummary[]): EpisodeWorkflow {
  return {
    episode: {
      id: 'ep-001',
      channelId: 'english',
      kind: 'episode',
      title: 'Coffee Date',
      workflowStatus: 'in_review',
      currentStage: 'topic',
      createdAt: '2026-03-07T00:00:00.000Z',
      updatedAt: '2026-03-07T01:00:00.000Z',
    },
    stages:
      stages ??
      [
        createStage('topic'),
        createStage('script'),
        createStage('image', { reviewStatus: 'stale', approvedVersion: 1 }),
        createStage('tts', { reviewStatus: 'changes_requested', approvedVersion: 1 }),
        createStage('render'),
        createStage('shorts'),
      ],
    jobs: [],
  };
}

function createBaseProps() {
  const stageVersions: StageVersionRecord[] = [
    {
      id: 'topic_v001',
      episodeId: 'ep-001',
      stage: 'topic',
      version: 1,
      reviewStatus: 'pending_review',
      createdAt: '2026-03-07T00:00:00.000Z',
      updatedAt: '2026-03-07T00:10:00.000Z',
      sourceVersionIds: [],
      notes: 'Initial candidate set',
    },
  ];

  return {
    workflow: createWorkflow(),
    selectedStage: 'topic' as const,
    selectedStageInfo: createStage('topic'),
    artifactError: '',
    currentArtifact: null,
    approvedArtifact: null,
    stageVersions,
    selectedVersionNumber: 1,
    selectedVersionArtifact: {
      generatedAt: '2026-03-07T00:00:00.000Z',
      category: 'conversation',
      candidates: ['Coffee date'],
      recommendedTopic: 'Coffee date',
    },
    selectedVersionArtifactError: '',
    payloadText: '{\n  "candidateCount": 3\n}',
    topicApprovalText: '',
    scriptDraftText: JSON.stringify(scriptArtifact, null, 2),
    scriptEditorMode: 'cards' as const,
    parsedScriptDraft: scriptArtifact,
    scriptImpact: {
      changedSentenceIds: [1],
      affectedSceneIndices: [1],
    },
    highlightState: null,
    draggingSentenceIndex: null,
    dragOverIndex: null,
    dragOverPosition: null as 'before' | 'after' | null,
    scriptBatchCount: 3,
    scriptBatchCategory: '',
    scriptBatchUsePipeline: true,
    isBusy: false,
    onPayloadChange: vi.fn(),
    onTopicApprovalTextChange: vi.fn(),
    onGenerateStage: vi.fn(),
    onApproveStage: vi.fn(),
    onRequestChanges: vi.fn(),
    onRefreshArtifacts: vi.fn(),
    onSelectStageVersion: vi.fn(),
    onScriptEditorModeChange: vi.fn(),
    onRawScriptDraftChange: vi.fn(),
    onScriptFieldChange: vi.fn(),
    onSentenceAction: vi.fn(),
    onSentenceDragStart: vi.fn(),
    onSentenceDragEnd: vi.fn(),
    onSentenceDragOver: vi.fn(),
    onSentenceDragLeave: vi.fn(),
    onSentenceDrop: vi.fn(),
    onHighlightChange: vi.fn(),
    onScriptBatchCountChange: vi.fn(),
    onScriptBatchCategoryChange: vi.fn(),
    onScriptBatchUsePipelineChange: vi.fn(),
    onSpawnScriptCandidates: vi.fn(),
    onPromoteCandidate: vi.fn(),
    onSaveScriptDraft: vi.fn(),
    onRegenerateImpactedTts: vi.fn(),
    onRegenerateImpactedScenes: vi.fn(),
    onRegenerateScene: vi.fn(),
    onRegenerateSentence: vi.fn(),
  };
}

describe('InspectorPanel', () => {
  it('wires topic action callbacks and manual topic override input', () => {
    const props = createBaseProps();
    render(<InspectorPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Topic candidate count'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('Topic category'), {
      target: { value: 'news' },
    });
    fireEvent.change(screen.getByLabelText('Manual Approved Topic Override'), {
      target: { value: 'Airport pickup' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Artifacts' }));

    expect(props.onPayloadChange).toHaveBeenCalledWith('{"candidateCount":5}');
    expect(props.onPayloadChange).toHaveBeenCalledWith('{"candidateCount":3,"category":"news"}');
    expect(props.onTopicApprovalTextChange).toHaveBeenCalledWith('Airport pickup');
    expect(props.onGenerateStage).toHaveBeenCalled();
    expect(props.onApproveStage).toHaveBeenCalled();
    expect(props.onRequestChanges).toHaveBeenCalled();
    expect(props.onRefreshArtifacts).toHaveBeenCalled();
  });

  it('renders script payload fields instead of raw json', () => {
    const props = {
      ...createBaseProps(),
      selectedStage: 'script' as const,
      selectedStageInfo: createStage('script'),
      payloadText: '{"usePipeline":true}',
    };
    render(<InspectorPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Script topic override'), {
      target: { value: 'Airport pickup' },
    });
    fireEvent.click(screen.getByLabelText('Use script pipeline'));

    expect(screen.getByLabelText('Script category')).toBeInTheDocument();
    expect(props.onPayloadChange).toHaveBeenCalledWith(
      '{"usePipeline":true,"topic":"Airport pickup"}'
    );
    expect(props.onPayloadChange).toHaveBeenCalledWith('{"usePipeline":false}');
  });

  it('shows stage version history and allows selecting a version to inspect', () => {
    const props = createBaseProps();
    render(<InspectorPanel {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /v001/i }));

    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('Initial candidate set')).toBeInTheDocument();
    expect(props.onSelectStageVersion).toHaveBeenCalledWith(1);
  });

  it('shows candidate funnel actions when a candidate record is selected', () => {
    const props = {
      ...createBaseProps(),
      workflow: createWorkflow([
        createStage('topic', { approvedVersion: 1, reviewStatus: 'approved' }),
        createStage('script', { approvedVersion: 1, reviewStatus: 'approved' }),
      ]),
    };
    props.workflow.episode.kind = 'candidate';

    render(<InspectorPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Script candidate count'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Script category override'), {
      target: { value: 'news' },
    });
    fireEvent.click(screen.getByLabelText('Use multi-step script pipeline'));
    fireEvent.click(screen.getByRole('button', { name: 'Spawn Script Candidates' }));
    fireEvent.click(screen.getByRole('button', { name: 'Promote To Episode' }));

    expect(props.onScriptBatchCountChange).toHaveBeenCalledWith(7);
    expect(props.onScriptBatchCategoryChange).toHaveBeenCalledWith('news');
    expect(props.onScriptBatchUsePipelineChange).toHaveBeenCalledWith(false);
    expect(props.onSpawnScriptCandidates).toHaveBeenCalled();
    expect(props.onPromoteCandidate).toHaveBeenCalled();
  });

  it('renders targeted regeneration controls for image and tts stages', () => {
    const imageManifest: ImageManifest = {
      generatedAt: '2026-03-07T00:00:00.000Z',
      mode: 'scene',
      sceneImagePaths: ['/tmp/scene-1.png', '/tmp/scene-2.png'],
    };
    const imageProps = {
      ...createBaseProps(),
      selectedStage: 'image' as const,
      selectedStageInfo: createStage('image', { reviewStatus: 'stale', approvedVersion: 1 }),
      currentArtifact: imageManifest,
    };
    const { rerender } = render(<InspectorPanel {...imageProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate scene 2' }));
    expect(imageProps.onRegenerateScene).toHaveBeenCalledWith(2);

    const ttsManifest: TtsManifest = {
      generatedAt: '2026-03-07T00:00:00.000Z',
      outputDir: '/tmp/audio',
      audioFiles: [
        { sentenceId: 2, speaker: 'F', speed: '1.0x', path: '/tmp/2.mp3', duration: 1.1 },
        { sentenceId: 1, speaker: 'M', speed: '1.0x', path: '/tmp/1.mp3', duration: 1.2 },
        { sentenceId: 2, speaker: 'F', speed: '0.8x', path: '/tmp/2-slow.mp3', duration: 1.4 },
      ],
    };
    const ttsProps = {
      ...createBaseProps(),
      selectedStage: 'tts' as const,
      selectedStageInfo: createStage('tts', { reviewStatus: 'stale', approvedVersion: 1 }),
      currentArtifact: ttsManifest,
    };

    rerender(<InspectorPanel {...ttsProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate sentence 2' }));

    expect(ttsProps.onRegenerateSentence).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: 'Regenerate sentence 1' })).toBeInTheDocument();
  });
});
