import type { ScriptArtifact } from '../types';
import { ScriptInputField } from './ScriptFields';

export function ScriptOverviewCard(props: {
  draft: ScriptArtifact;
  onScriptFieldChange(path: string, rawValue: string): void;
}) {
  const { draft, onScriptFieldChange } = props;

  return (
    <article className="editor-card editor-card-wide">
      <div className="editor-card-head">
        <h4>Overview</h4>
        <span className="code-pill">{draft.category}</span>
      </div>
      <div className="editor-card-grid">
        <ScriptInputField
          label="Topic"
          value={draft.metadata.topic}
          onChange={(value) => {
            onScriptFieldChange('metadata.topic', value);
          }}
        />
        <ScriptInputField
          label="Style"
          value={draft.metadata.style ?? ''}
          onChange={(value) => {
            onScriptFieldChange('metadata.style', value);
          }}
        />
        <ScriptInputField
          label="Target Title"
          value={draft.metadata.title.target}
          onChange={(value) => {
            onScriptFieldChange('metadata.title.target', value);
          }}
        />
        <ScriptInputField
          label="Native Title"
          value={draft.metadata.title.native}
          onChange={(value) => {
            onScriptFieldChange('metadata.title.native', value);
          }}
        />
      </div>
    </article>
  );
}
