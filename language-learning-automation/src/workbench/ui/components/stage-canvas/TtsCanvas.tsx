import { isTtsManifest, toFileProxyUrl } from '../../helpers';

export function TtsCanvas(props: {
  currentArtifact: unknown;
  onRegenerateSentence(sentenceId: number): void;
}) {
  const { currentArtifact, onRegenerateSentence } = props;

  if (!isTtsManifest(currentArtifact)) {
    return <div className="empty-state">No TTS manifest available yet.</div>;
  }

  const grouped = [...new Set(currentArtifact.audioFiles.map((file) => file.sentenceId))].map((sentenceId) => ({
    sentenceId,
    items: currentArtifact.audioFiles.filter((file) => file.sentenceId === sentenceId),
  }));

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Audio Review</p>
          <h2>Sentence waveform desk</h2>
          <p className="queue-meta">Check pronunciation, pace, and speaker consistency sentence by sentence.</p>
        </div>
      </div>

      <div className="audio-column">
        {grouped.map((entry) => (
          <article key={entry.sentenceId} className="audio-row">
            <div className="audio-row-head">
              <strong>Sentence {entry.sentenceId}</strong>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  onRegenerateSentence(entry.sentenceId);
                }}
              >
                Regenerate sentence
              </button>
            </div>
            <div className="audio-player-grid">
              {entry.items.map((audio) => (
                <div key={`${audio.path}-${audio.speed}`} className="audio-preview">
                  <p className="queue-meta">
                    {audio.speaker} · {audio.speed} · {audio.duration.toFixed(2)}s
                  </p>
                  <audio controls preload="metadata" src={toFileProxyUrl(audio.path)} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
