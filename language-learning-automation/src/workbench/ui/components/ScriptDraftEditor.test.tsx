import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptDraftEditor } from './ScriptDraftEditor';
import type { ScriptArtifact } from '../types';

const scriptDraft: ScriptArtifact = {
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
      {
        id: 'F',
        name: 'Mina',
        gender: 'female',
        ethnicity: 'Korean',
        role: 'friend',
      },
    ],
    scenePrompts: [
      {
        sentenceRange: [1, 2],
        setting: 'coffee shop',
        mood: 'warm',
        characterActions: 'They sit by the window.',
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
    {
      id: 2,
      speaker: 'F',
      target: 'Sure, that sounds great.',
      targetBlank: 'Sure, that sounds ______.',
      blankAnswer: 'great',
      native: '좋아, 그거 좋다.',
      words: [{ word: 'great', meaning: '좋은' }],
    },
  ],
};

function createProps(overrides?: Partial<ComponentProps<typeof ScriptDraftEditor>>) {
  return {
    parsedScriptDraft: scriptDraft,
    scriptDraftText: JSON.stringify(scriptDraft, null, 2),
    scriptEditorMode: 'cards' as const,
    scriptImpact: {
      changedSentenceIds: [1, 2],
      affectedSceneIndices: [1],
    },
    highlightState: null,
    draggingSentenceIndex: null,
    dragOverIndex: null,
    dragOverPosition: null,
    isBusy: false,
    isCurrentVersionApproved: true,
    canRegenerateTts: true,
    canRegenerateImage: false,
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
    onSaveScriptDraft: vi.fn(),
    onRegenerateImpactedTts: vi.fn(),
    onRegenerateImpactedScenes: vi.fn(),
    ...overrides,
  };
}

describe('ScriptDraftEditor', () => {
  it('renders card mode with impact badges and the correct regeneration button states', () => {
    render(<ScriptDraftEditor {...createProps()} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Sentence' })).toBeEnabled();
    expect(screen.getByText(/Changed sentences/i)).toHaveTextContent('Changed sentences 1, 2');
    expect(screen.getByText(/Affected scenes/i)).toHaveTextContent('Affected scenes 1');
    expect(screen.getByRole('button', { name: 'Regenerate Impacted TTS' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Regenerate Impacted Scenes' })).toBeDisabled();
  });

  it('switches to raw JSON mode and wires the raw editor callback', () => {
    const props = createProps({ scriptEditorMode: 'json' });
    render(<ScriptDraftEditor {...props} />);

    const textarea = screen.getByLabelText('Raw Script JSON');
    fireEvent.change(textarea, { target: { value: '{"broken": true}' } });

    expect(screen.queryByRole('button', { name: 'Add Sentence' })).toBeNull();
    expect(props.onRawScriptDraftChange).toHaveBeenCalledWith('{"broken": true}');
  });

  it('queues a sentence append from the footer action', () => {
    const props = createProps();
    render(<ScriptDraftEditor {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Sentence' }));

    expect(props.onSentenceAction).toHaveBeenCalledWith('add_end', 1);
  });
});
