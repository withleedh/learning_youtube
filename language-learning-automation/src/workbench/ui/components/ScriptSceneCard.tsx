import type { FocusEvent, MouseEvent } from 'react';
import { getSceneLinkClass } from '../helpers';
import type { HighlightState, ScenePromptRecord } from '../types';
import { ScriptInputField, ScriptTextareaField } from './ScriptFields';

export function ScriptSceneCard(props: {
  scenePrompt: ScenePromptRecord;
  index: number;
  highlightState: HighlightState | null;
  onHighlightChange(value: HighlightState | null): void;
  onScriptFieldChange(
    path: string,
    rawValue: string,
    transform?: 'csv' | 'words',
    scriptType?: 'number'
  ): void;
}) {
  const { scenePrompt, index, highlightState, onHighlightChange, onScriptFieldChange } = props;
  const sceneClassName = getSceneLinkClass(index, scenePrompt, highlightState);

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
      className={`editor-card editor-card-wide scene-editor-card ${sceneClassName}`.trim()}
      tabIndex={0}
      onMouseEnter={() => {
        onHighlightChange({ kind: 'scene', value: index });
      }}
      onMouseLeave={() => {
        onHighlightChange(null);
      }}
      onFocus={() => {
        onHighlightChange({ kind: 'scene', value: index });
      }}
      onBlur={(event) => {
        handleHighlightExit(event, null);
      }}
    >
      <div className="editor-card-head">
        <h4>Scene {index + 1}</h4>
        <span className="code-pill">{scenePrompt.sentenceRange.join('-')}</span>
      </div>
      <div className="editor-card-grid">
        <ScriptInputField
          label="Range Start"
          type="number"
          value={scenePrompt.sentenceRange[0]}
          onChange={(value) => {
            onScriptFieldChange(
              `metadata.scenePrompts.${index}.sentenceRange.0`,
              value,
              undefined,
              'number'
            );
          }}
        />
        <ScriptInputField
          label="Range End"
          type="number"
          value={scenePrompt.sentenceRange[1]}
          onChange={(value) => {
            onScriptFieldChange(
              `metadata.scenePrompts.${index}.sentenceRange.1`,
              value,
              undefined,
              'number'
            );
          }}
        />
        <ScriptInputField
          label="Setting"
          value={scenePrompt.setting}
          onChange={(value) => {
            onScriptFieldChange(`metadata.scenePrompts.${index}.setting`, value);
          }}
        />
        <ScriptInputField
          label="Mood"
          value={scenePrompt.mood}
          onChange={(value) => {
            onScriptFieldChange(`metadata.scenePrompts.${index}.mood`, value);
          }}
        />
        <ScriptTextareaField
          label="Character Actions"
          value={scenePrompt.characterActions}
          onChange={(value) => {
            onScriptFieldChange(`metadata.scenePrompts.${index}.characterActions`, value);
          }}
        />
        <ScriptTextareaField
          label="Camera Direction"
          value={scenePrompt.cameraDirection}
          onChange={(value) => {
            onScriptFieldChange(`metadata.scenePrompts.${index}.cameraDirection`, value);
          }}
        />
        <ScriptInputField
          label="Lighting"
          value={scenePrompt.lighting ?? ''}
          onChange={(value) => {
            onScriptFieldChange(`metadata.scenePrompts.${index}.lighting`, value);
          }}
        />
        <ScriptInputField
          label="Transition"
          value={scenePrompt.transition ?? ''}
          onChange={(value) => {
            onScriptFieldChange(`metadata.scenePrompts.${index}.transition`, value);
          }}
        />
      </div>
    </article>
  );
}
