import { toFileProxyUrl } from '../../helpers';
import type { PackageManifest } from '../../types';

export function PackageCanvas(props: {
  draft: PackageManifest | null;
  onFieldChange<K extends keyof PackageManifest>(key: K, value: PackageManifest[K]): void;
  onSave(): void;
}) {
  const { draft, onFieldChange, onSave } = props;

  if (!draft) {
    return <div className="empty-state">Generate a package draft to review title, description, and thumbnail.</div>;
  }

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Delivery Pack</p>
          <h2>{draft.selectedTitle}</h2>
          <p className="queue-meta">Pick the final title and thumbnail, then polish description and pinned comment.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onSave}>
          Save Package Draft
        </button>
      </div>

      <div className="package-layout">
        <section className="package-card">
          <h3>Title candidates</h3>
          <div className="title-candidate-list">
            {draft.titleCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={`title-candidate ${draft.selectedTitle === candidate.value ? 'selected' : ''}`}
                onClick={() => {
                  onFieldChange('selectedTitle', candidate.value);
                }}
              >
                <strong>{candidate.value}</strong>
                <span className="queue-meta">{candidate.source}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="package-card">
          <h3>Thumbnail gallery</h3>
          <div className="thumbnail-gallery">
            {draft.thumbnailCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={`thumbnail-option ${draft.selectedThumbnailPath === candidate.path ? 'selected' : ''}`}
                onClick={() => {
                  onFieldChange('selectedThumbnailPath', candidate.path);
                }}
              >
                <img src={toFileProxyUrl(candidate.path)} alt={candidate.label} />
                <span>{candidate.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="package-card">
          <h3>Description</h3>
          <textarea
            value={draft.description}
            onChange={(event) => {
              onFieldChange('description', event.target.value);
            }}
          />
        </section>

        <section className="package-card">
          <h3>Pinned comment</h3>
          <textarea
            value={draft.pinnedComment}
            onChange={(event) => {
              onFieldChange('pinnedComment', event.target.value);
            }}
          />
        </section>

        <section className="package-card package-card-wide">
          <h3>Export bundle</h3>
          <div className="export-list">
            {draft.exportItems.map((item) => (
              <div key={item.id} className="export-item">
                <strong>{item.label}</strong>
                <span className="queue-meta">{item.path}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
