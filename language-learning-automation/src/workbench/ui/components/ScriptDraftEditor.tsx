import type { DragEvent } from 'react';
import { formatIdList } from '../helpers';
import type {
  HighlightState,
  ScriptArtifact,
  ScriptImpactSummary,
} from '../types';
import { ScriptCharacterCard } from './ScriptCharacterCard';
import { ScriptOverviewCard } from './ScriptOverviewCard';
import { ScriptSceneCard } from './ScriptSceneCard';
import { ScriptSentenceCard } from './ScriptSentenceCard';

type DragPosition = 'before' | 'after' | null;

export function ScriptDraftEditor(props: {
  parsedScriptDraft: ScriptArtifact | null;
  scriptDraftText: string;
  scriptEditorMode: 'cards' | 'json';
  scriptImpact: ScriptImpactSummary;
  highlightState: HighlightState | null;
  draggingSentenceIndex: number | null;
  dragOverIndex: number | null;
  dragOverPosition: DragPosition;
  isBusy: boolean;
  isCurrentVersionApproved: boolean;
  canRegenerateTts: boolean;
  canRegenerateImage: boolean;
  onScriptEditorModeChange(mode: 'cards' | 'json'): void;
  onRawScriptDraftChange(value: string): void;
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
  onHighlightChange(value: HighlightState | null): void;
  onSaveScriptDraft(): void;
  onRegenerateImpactedTts(): void;
  onRegenerateImpactedScenes(): void;
}) {
  const {
    parsedScriptDraft,
    scriptDraftText,
    scriptEditorMode,
    scriptImpact,
    highlightState,
    draggingSentenceIndex,
    dragOverIndex,
    dragOverPosition,
    isBusy,
    isCurrentVersionApproved,
    canRegenerateTts,
    canRegenerateImage,
    onScriptEditorModeChange,
    onRawScriptDraftChange,
    onScriptFieldChange,
    onSentenceAction,
    onSentenceDragStart,
    onSentenceDragEnd,
    onSentenceDragOver,
    onSentenceDragLeave,
    onSentenceDrop,
    onHighlightChange,
    onSaveScriptDraft,
    onRegenerateImpactedTts,
    onRegenerateImpactedScenes,
  } = props;

  return (
    <section className="inspector-section">
      <div className="section-header">
        <h3>Script Draft</h3>
      </div>
      <div className="editor-mode-switch">
        <button
          type="button"
          className={
            scriptEditorMode === 'cards'
              ? 'secondary-button editor-mode-button'
              : 'ghost-button editor-mode-button'
          }
          disabled={isBusy}
          onClick={() => {
            onScriptEditorModeChange('cards');
          }}
        >
          Card Editor
        </button>
        <button
          type="button"
          className={
            scriptEditorMode === 'json'
              ? 'secondary-button editor-mode-button'
              : 'ghost-button editor-mode-button'
          }
          disabled={isBusy}
          onClick={() => {
            onScriptEditorModeChange('json');
          }}
        >
          Raw JSON
        </button>
      </div>

      {scriptEditorMode === 'json' || !parsedScriptDraft ? (
        <label className="inspector-form-field">
          <span>
            {parsedScriptDraft ? 'Raw Script JSON' : 'Script JSON (fix parsing errors here)'}
          </span>
          <textarea
            id="script-draft-editor"
            spellCheck={false}
            value={scriptDraftText}
            onChange={(event) => {
              onRawScriptDraftChange(event.target.value);
            }}
          />
        </label>
      ) : (
        <div className="script-editor-shell">
          <div className="script-editor-grid">
            <ScriptOverviewCard
              draft={parsedScriptDraft}
              onScriptFieldChange={onScriptFieldChange}
            />

            {parsedScriptDraft.metadata.characters.map((character, index) => (
              <ScriptCharacterCard
                key={`character-${index}`}
                character={character}
                index={index}
                onScriptFieldChange={onScriptFieldChange}
              />
            ))}

            {(parsedScriptDraft.metadata.scenePrompts ?? []).map((scenePrompt, index) => (
              <ScriptSceneCard
                key={`scene-${index}`}
                scenePrompt={scenePrompt}
                index={index}
                highlightState={highlightState}
                onHighlightChange={onHighlightChange}
                onScriptFieldChange={onScriptFieldChange}
              />
            ))}
          </div>

          <div className="sentence-section-head">
            <div>
              <h4>Sentences</h4>
              <p className="panel-note">
                문장 순서를 바꾸면 sentence id가 자동으로 다시 정렬됩니다.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button editor-action-button"
              disabled={isBusy}
              onClick={() => {
                onSentenceAction('add_end', parsedScriptDraft.sentences.length - 1);
              }}
            >
              Add Sentence
            </button>
          </div>

          <div className="sentence-card-list">
            {parsedScriptDraft.sentences.map((sentence, index) => (
              <ScriptSentenceCard
                key={`sentence-${sentence.id}-${index}`}
                sentence={sentence}
                index={index}
                totalSentences={parsedScriptDraft.sentences.length}
                scenePrompts={parsedScriptDraft.metadata.scenePrompts ?? []}
                highlightState={highlightState}
                draggingSentenceIndex={draggingSentenceIndex}
                dragOverIndex={dragOverIndex}
                dragOverPosition={dragOverPosition}
                isBusy={isBusy}
                onHighlightChange={onHighlightChange}
                onScriptFieldChange={onScriptFieldChange}
                onSentenceAction={onSentenceAction}
                onSentenceDragStart={onSentenceDragStart}
                onSentenceDragEnd={onSentenceDragEnd}
                onSentenceDragOver={onSentenceDragOver}
                onSentenceDragLeave={onSentenceDragLeave}
                onSentenceDrop={onSentenceDrop}
              />
            ))}
          </div>
        </div>
      )}

      <div className="inline-actions">
        <span className="code-pill">
          Changed sentences{' '}
          {scriptImpact.changedSentenceIds.length
            ? formatIdList(scriptImpact.changedSentenceIds)
            : 'none'}
        </span>
        <span className="code-pill">
          Affected scenes{' '}
          {scriptImpact.affectedSceneIndices.length
            ? formatIdList(scriptImpact.affectedSceneIndices)
            : 'none'}
        </span>
      </div>

      <div className="inspector-actions">
        <button
          className="primary-button"
          type="button"
          disabled={isBusy}
          onClick={onSaveScriptDraft}
        >
          Save Script Draft
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={scriptImpact.changedSentenceIds.length === 0 || !canRegenerateTts || isBusy}
          onClick={onRegenerateImpactedTts}
        >
          Regenerate Impacted TTS
        </button>
        <button
          className="ghost-button"
          type="button"
          disabled={scriptImpact.affectedSceneIndices.length === 0 || !canRegenerateImage || isBusy}
          onClick={onRegenerateImpactedScenes}
        >
          Regenerate Impacted Scenes
        </button>
      </div>

      {isCurrentVersionApproved ? (
        <p className="panel-note">
          현재 script가 approved version이면 저장 시 자동으로 새 draft version으로 fork됩니다.
        </p>
      ) : null}
      <p className="panel-note">
        {parsedScriptDraft
          ? '카드 편집은 draft JSON을 직접 갱신합니다. 고급 필드는 Raw JSON 모드에서 계속 수정할 수 있습니다.'
          : '현재 draft JSON이 유효하지 않아서 카드 편집기를 숨겼습니다. Raw JSON을 먼저 고치세요.'}
      </p>
    </section>
  );
}
