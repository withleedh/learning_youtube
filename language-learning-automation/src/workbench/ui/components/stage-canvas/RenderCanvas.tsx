import { isRenderManifest, toFileProxyUrl } from '../../helpers';

export function RenderCanvas(props: { currentArtifact: unknown }) {
  const { currentArtifact } = props;

  if (!isRenderManifest(currentArtifact)) {
    return <div className="empty-state">No render preview available yet.</div>;
  }

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Render Review</p>
          <h2>Playback desk</h2>
          <p className="queue-meta">
            Watch the full cut, pause on weak transitions, and log timestamped issues from the decision panel.
          </p>
        </div>
      </div>

      <div className="render-player-shell">
        <video controls preload="metadata" src={toFileProxyUrl(currentArtifact.videoPath)} />
        <div className="render-meta-grid">
          <div className="queue-pill">frames {currentArtifact.durationInFrames}</div>
          <div className="queue-pill">audio files {currentArtifact.audioFileCount}</div>
          <div className="queue-pill">{currentArtifact.imageMode}</div>
        </div>
      </div>
    </section>
  );
}
