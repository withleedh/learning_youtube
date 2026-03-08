import { formatDate } from '../helpers';
import type { ThreadSummary } from '../types';

export function LineagePanel(props: {
  thread: ThreadSummary | null;
  selectedRecordId: string | null;
}) {
  const { thread, selectedRecordId } = props;

  return (
    <section className="studio-subpanel">
      <div className="subpanel-header">
        <h3>Lineage</h3>
      </div>
      {!thread ? (
        <div className="empty-state">No thread selected.</div>
      ) : (
        <div className="lineage-list">
          {thread.records.map((record) => (
            <div
              key={`${record.channelId}/${record.id}`}
              className={`lineage-item ${selectedRecordId === `${record.channelId}/${record.id}` ? 'active' : ''}`}
            >
              <strong>{record.title || record.previewText || record.id}</strong>
              <p className="queue-meta">
                {record.kind} · {record.currentStage} · {record.lineageLabel}
              </p>
              <p className="queue-meta">{formatDate(record.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
