import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptSentenceCard } from './ScriptSentenceCard';
import type { ScenePromptRecord, SentenceRecord } from '../types';

const sentence: SentenceRecord = {
  id: 2,
  speaker: 'F',
  target: 'How was your day?',
  targetPronunciation: 'How was your day?',
  targetBlank: 'How was your ______?',
  blankAnswer: 'day',
  native: '오늘 하루 어땠어?',
  words: [{ word: 'day', meaning: '하루' }],
  wrongWordChoices: ['night', 'week'],
};

const scenePrompts: ScenePromptRecord[] = [
  {
    sentenceRange: [1, 2],
    setting: 'cafe',
    mood: 'warm',
    characterActions: 'She smiles.',
    cameraDirection: 'Medium shot',
  },
];

function renderSentenceCard() {
  const props = {
    sentence,
    index: 1,
    totalSentences: 3,
    scenePrompts,
    highlightState: { kind: 'scene', value: 0 } as const,
    draggingSentenceIndex: null,
    dragOverIndex: 1,
    dragOverPosition: 'before' as const,
    isBusy: false,
    onHighlightChange: vi.fn(),
    onScriptFieldChange: vi.fn(),
    onSentenceAction: vi.fn(),
    onSentenceDragStart: vi.fn(),
    onSentenceDragEnd: vi.fn(),
    onSentenceDragOver: vi.fn(),
    onSentenceDragLeave: vi.fn(),
    onSentenceDrop: vi.fn(),
  };

  render(<ScriptSentenceCard {...props} />);
  return props;
}

describe('ScriptSentenceCard', () => {
  it('applies highlight and drag state classes for the active sentence card', () => {
    renderSentenceCard();

    const card = screen.getByText('Sentence 2').closest('article');
    if (!card) {
      throw new Error('Sentence card not found');
    }

    expect(card).toHaveClass('linked-target');
    expect(card).toHaveClass('drag-over-before');
  });

  it('fires highlight, action, and drag callbacks from the sentence card controls', () => {
    const props = renderSentenceCard();
    const card = screen.getByText('Sentence 2').closest('article');

    if (!card) {
      throw new Error('Sentence card not found');
    }

    fireEvent.mouseEnter(card);
    fireEvent.click(screen.getByRole('button', { name: 'Add After' }));
    fireEvent.dragStart(screen.getByRole('button', { name: 'Drag' }));
    fireEvent.dragOver(card);
    fireEvent.drop(card);

    expect(props.onHighlightChange).toHaveBeenCalledWith({ kind: 'sentence', value: 2 });
    expect(props.onSentenceAction).toHaveBeenCalledWith('add_after', 1);
    expect(props.onSentenceDragStart).toHaveBeenCalledWith(1);
    expect(props.onSentenceDragOver).toHaveBeenCalledWith(expect.any(Object), 1);
    expect(props.onSentenceDrop).toHaveBeenCalledWith(expect.any(Object), 1);
  });
});
