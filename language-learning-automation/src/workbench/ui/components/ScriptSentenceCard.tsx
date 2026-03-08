import type { DragEvent, FocusEvent, MouseEvent } from 'react';
import {
  formatCsvList,
  formatWordsList,
  getSentenceLinkClass,
} from '../helpers';
import type {
  HighlightState,
  ScenePromptRecord,
  SentenceRecord,
} from '../types';
import {
  ScriptInputField,
  ScriptSelectField,
  ScriptTextareaField,
} from './ScriptFields';

type DragPosition = 'before' | 'after' | null;

export function ScriptSentenceCard(props: {
  sentence: SentenceRecord;
  index: number;
  totalSentences: number;
  scenePrompts: ScenePromptRecord[];
  highlightState: HighlightState | null;
  draggingSentenceIndex: number | null;
  dragOverIndex: number | null;
  dragOverPosition: DragPosition;
  isBusy: boolean;
  onHighlightChange(value: HighlightState | null): void;
  onScriptFieldChange(
    path: string,
    rawValue: string,
    transform?: 'csv' | 'words',
    scriptType?: 'number'
  ): void;
  onSentenceAction(action: string, index: number): void;
  onSentenceDragStart(index: number): void;
  onSentenceDragEnd(): void;
  onSentenceDragOver(event: DragEvent<HTMLElement>, index: number): void;
  onSentenceDragLeave(event: DragEvent<HTMLElement>, index: number): void;
  onSentenceDrop(event: DragEvent<HTMLElement>, index: number): void;
}) {
  const {
    sentence,
    index,
    totalSentences,
    scenePrompts,
    highlightState,
    draggingSentenceIndex,
    dragOverIndex,
    dragOverPosition,
    isBusy,
    onHighlightChange,
    onScriptFieldChange,
    onSentenceAction,
    onSentenceDragStart,
    onSentenceDragEnd,
    onSentenceDragOver,
    onSentenceDragLeave,
    onSentenceDrop,
  } = props;
  const sentenceClassName = getSentenceLinkClass(sentence, scenePrompts, highlightState);
  const dragClassName =
    dragOverIndex === index
      ? dragOverPosition === 'before'
        ? 'drag-over-before'
        : 'drag-over-after'
      : '';

  function handleHighlightExit(
    event: FocusEvent<HTMLElement> | MouseEvent<HTMLElement>,
    value: HighlightState | null
  ): void {
    if ('relatedTarget' in event) {
      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
        return;
      }
    }

    onHighlightChange(value);
  }

  return (
    <article
      className={`sentence-editor-card ${sentenceClassName} ${dragClassName} ${draggingSentenceIndex === index ? 'dragging-origin' : ''}`.trim()}
      tabIndex={0}
      onMouseEnter={() => {
        onHighlightChange({ kind: 'sentence', value: sentence.id });
      }}
      onMouseLeave={() => {
        onHighlightChange(null);
      }}
      onFocus={() => {
        onHighlightChange({ kind: 'sentence', value: sentence.id });
      }}
      onBlur={(event) => {
        handleHighlightExit(event, null);
      }}
      onDragOver={(event) => {
        onSentenceDragOver(event, index);
      }}
      onDragLeave={(event) => {
        onSentenceDragLeave(event, index);
      }}
      onDrop={(event) => {
        onSentenceDrop(event, index);
      }}
    >
      <div className="editor-card-head">
        <div>
          <h4>Sentence {sentence.id}</h4>
          <p className="panel-note">
            Order {index + 1} of {totalSentences}
          </p>
        </div>
        <div className="sentence-card-toolbar">
          <button
            type="button"
            className="ghost-button sentence-drag-handle"
            draggable={!isBusy}
            disabled={isBusy}
            onDragStart={() => {
              onSentenceDragStart(index);
            }}
            onDragEnd={onSentenceDragEnd}
            title="Drag to reorder"
          >
            Drag
          </button>
          <span className="code-pill">{sentence.speaker}</span>
          <button
            type="button"
            className="ghost-button sentence-action-button"
            disabled={index === 0 || isBusy}
            onClick={() => {
              onSentenceAction('move_up', index);
            }}
          >
            Up
          </button>
          <button
            type="button"
            className="ghost-button sentence-action-button"
            disabled={index === totalSentences - 1 || isBusy}
            onClick={() => {
              onSentenceAction('move_down', index);
            }}
          >
            Down
          </button>
          <button
            type="button"
            className="secondary-button sentence-action-button"
            disabled={isBusy}
            onClick={() => {
              onSentenceAction('add_after', index);
            }}
          >
            Add After
          </button>
          <button
            type="button"
            className="danger-button sentence-action-button"
            disabled={totalSentences === 1 || isBusy}
            onClick={() => {
              onSentenceAction('remove', index);
            }}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="editor-card-grid">
        <ScriptSelectField
          label="Speaker"
          value={sentence.speaker}
          options={['M', 'F']}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.speaker`, value);
          }}
        />
        <ScriptInputField
          label="ID"
          type="number"
          value={sentence.id}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.id`, value, undefined, 'number');
          }}
        />
        <ScriptTextareaField
          label="Target"
          value={sentence.target}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.target`, value);
          }}
        />
        <ScriptInputField
          label="Pronunciation"
          value={sentence.targetPronunciation ?? ''}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.targetPronunciation`, value);
          }}
        />
        <ScriptTextareaField
          label="Target Blank"
          value={sentence.targetBlank}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.targetBlank`, value);
          }}
        />
        <ScriptInputField
          label="Blank Answer"
          value={sentence.blankAnswer}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.blankAnswer`, value);
          }}
        />
        <ScriptTextareaField
          label="Native"
          value={sentence.native}
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.native`, value);
          }}
        />
        <ScriptInputField
          label="Wrong Word Choices"
          value={formatCsvList(sentence.wrongWordChoices)}
          placeholder="comma,separated,choices"
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.wrongWordChoices`, value, 'csv');
          }}
        />
        <ScriptTextareaField
          label="Words"
          value={formatWordsList(sentence.words)}
          placeholder="word | meaning"
          onChange={(value) => {
            onScriptFieldChange(`sentences.${index}.words`, value, 'words');
          }}
        />
      </div>
    </article>
  );
}
