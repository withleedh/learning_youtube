import type { CharacterRecord } from '../types';
import { ScriptInputField, ScriptSelectField } from './ScriptFields';

export function ScriptCharacterCard(props: {
  character: CharacterRecord;
  index: number;
  onScriptFieldChange(path: string, rawValue: string): void;
}) {
  const { character, index, onScriptFieldChange } = props;

  return (
    <article className="editor-card">
      <div className="editor-card-head">
        <h4>Character {index + 1}</h4>
        <span className="code-pill">{character.id}</span>
      </div>
      <div className="editor-card-grid">
        <ScriptInputField
          label="Name"
          value={character.name}
          onChange={(value) => {
            onScriptFieldChange(`metadata.characters.${index}.name`, value);
          }}
        />
        <ScriptInputField
          label="Role"
          value={character.role}
          onChange={(value) => {
            onScriptFieldChange(`metadata.characters.${index}.role`, value);
          }}
        />
        <ScriptSelectField
          label="Gender"
          value={character.gender}
          options={['male', 'female']}
          onChange={(value) => {
            onScriptFieldChange(`metadata.characters.${index}.gender`, value);
          }}
        />
        <ScriptInputField
          label="Ethnicity"
          value={character.ethnicity}
          onChange={(value) => {
            onScriptFieldChange(`metadata.characters.${index}.ethnicity`, value);
          }}
        />
      </div>
    </article>
  );
}
