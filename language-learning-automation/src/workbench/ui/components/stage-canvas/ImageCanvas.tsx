import { isImageManifest, toFileProxyUrl } from '../../helpers';

export function ImageCanvas(props: {
  currentArtifact: unknown;
  onRegenerateScene(sceneIndex: number): void;
}) {
  const { currentArtifact, onRegenerateScene } = props;

  if (!isImageManifest(currentArtifact)) {
    return <div className="empty-state">No scene images available yet.</div>;
  }

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Image Review</p>
          <h2>Scene grid</h2>
          <p className="queue-meta">
            Review composition, consistency, and scene coverage. Regenerate only the broken scene.
          </p>
        </div>
      </div>

      <div className="media-grid">
        {currentArtifact.sceneImagePaths.length > 0
          ? currentArtifact.sceneImagePaths.map((imagePath, index) => (
              <article key={`${imagePath}-${index}`} className="media-card">
                <img src={toFileProxyUrl(imagePath)} alt={`Scene ${index + 1}`} />
                <div className="media-card-footer">
                  <strong>Scene {index + 1}</strong>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      onRegenerateScene(index + 1);
                    }}
                  >
                    Regenerate scene
                  </button>
                </div>
              </article>
            ))
          : currentArtifact.backgroundImagePath && (
              <article className="media-card">
                <img src={toFileProxyUrl(currentArtifact.backgroundImagePath)} alt="Background" />
              </article>
            )}
      </div>
    </section>
  );
}
