import type { ScriptArtifact } from '../types';

export function ScriptReviewPanel(props: { artifact: ScriptArtifact }) {
  const { artifact } = props;

  return (
    <section className="inspector-section">
      <div className="section-header">
        <h3>Script Review</h3>
      </div>
      <div className="script-review-summary">
        <div className="script-review-hero">
          <strong>{artifact.metadata.title.target}</strong>
          <span>{artifact.metadata.title.native}</span>
          <p className="panel-note">
            {artifact.category} · {artifact.metadata.topic} · {artifact.sentences.length} sentences
          </p>
        </div>
        <div className="review-stat-row">
          {(artifact.metadata.characters ?? []).map((character) => (
            <span key={character.id} className="code-pill">
              {character.id} · {character.name} · {character.role}
            </span>
          ))}
        </div>
      </div>
      <div className="script-review-sentences">
        {artifact.sentences.map((sentence) => (
          <article key={`review-sentence-${sentence.id}`} className="script-review-sentence-card">
            <div className="script-review-sentence-head">
              <strong>
                {sentence.id}. {sentence.target}
              </strong>
              <span className="code-pill">{sentence.speaker}</span>
            </div>
            <p className="script-review-native">{sentence.native}</p>
            <p className="panel-note">
              Blank: {sentence.targetBlank} · Answer: {sentence.blankAnswer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
