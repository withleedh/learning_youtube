import { isShortsManifest, toFileProxyUrl } from '../../helpers';

export function ShortsCanvas(props: { currentArtifact: unknown }) {
  const { currentArtifact } = props;

  if (!isShortsManifest(currentArtifact)) {
    return <div className="empty-state">No shorts outputs available yet.</div>;
  }

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Shorts Review</p>
          <h2>Hook-by-hook gallery</h2>
          <p className="queue-meta">Review each short independently before packaging.</p>
        </div>
      </div>

      <div className="shorts-gallery">
        {currentArtifact.outputs.map((output) => (
          <article key={output.outputPath} className="short-review-card">
            <video controls preload="metadata" src={toFileProxyUrl(output.outputPath)} />
            <div className="media-card-footer">
              <strong>Sentence {output.sentenceId}</strong>
              <p className="queue-meta">{output.compositionId}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
