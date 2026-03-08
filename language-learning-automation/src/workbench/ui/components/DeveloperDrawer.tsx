import { useEffect, useRef } from 'react';
import { formatDate } from '../helpers';
import type { ApiRequestLogEntry } from '../types';

export function DeveloperDrawer(props: {
  isOpen: boolean;
  onToggle(): void;
  currentArtifact: unknown;
  approvedArtifact: unknown;
  apiLogs: ApiRequestLogEntry[];
  apiLogsError?: string;
  onRefreshLogs(): void | Promise<void>;
}) {
  const { isOpen, onToggle, currentArtifact, approvedArtifact, apiLogs, apiLogsError, onRefreshLogs } =
    props;
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (drawerRef.current?.contains(target)) {
        return;
      }

      onToggle();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={drawerRef} className={`developer-drawer ${isOpen ? 'open' : ''}`}>
      <button type="button" className="ghost-button developer-toggle" onClick={onToggle}>
        {isOpen ? 'Hide Developer Drawer' : 'Show Developer Drawer'}
      </button>
      {isOpen ? (
        <div className="developer-grid">
          <section>
            <h3>Current Artifact</h3>
            <pre className="json-view">{JSON.stringify(currentArtifact, null, 2)}</pre>
          </section>
          <section>
            <h3>Approved Artifact</h3>
            <pre className="json-view">{JSON.stringify(approvedArtifact, null, 2)}</pre>
          </section>
          <section>
            <div className="developer-section-head">
              <h3>Recent API Logs</h3>
              <button type="button" className="ghost-button" onClick={() => void onRefreshLogs()}>
                Refresh Logs
              </button>
            </div>
            {apiLogsError ? <div className="studio-alert studio-alert-error">{apiLogsError}</div> : null}
            {apiLogs.length === 0 ? (
              <div className="empty-state">No API logs captured yet.</div>
            ) : (
              <div className="developer-log-list">
                {apiLogs.map((entry, index) => (
                  <article
                    key={`${entry.timestamp}-${entry.method}-${entry.pathname}-${index}`}
                    className="developer-log-card"
                  >
                    <div className="developer-log-head">
                      <span className={`queue-pill status-${entry.statusCode >= 400 ? 'changes_requested' : 'approved'}`}>
                        {entry.method}
                      </span>
                      <span className="queue-meta">
                        {formatDate(entry.timestamp)} · {entry.statusCode} · {entry.durationMs}ms
                      </span>
                    </div>
                    <strong className="developer-log-path">{entry.pathname}</strong>
                    {Object.keys(entry.query).length > 0 ? (
                      <p className="queue-meta">query: {JSON.stringify(entry.query)}</p>
                    ) : null}
                    {entry.requestBody !== undefined ? (
                      <pre className="json-view">{JSON.stringify(entry.requestBody, null, 2)}</pre>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
