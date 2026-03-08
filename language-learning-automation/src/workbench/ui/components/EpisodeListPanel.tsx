import { formatDate } from '../helpers';
import type { EpisodeSummary } from '../types';

export function EpisodeListPanel(props: {
  title: string;
  records: EpisodeSummary[];
  selectedRecordKey: string | null;
  emptyMessage: string;
  onSelectRecord(channelId: string, episodeId: string): void;
}) {
  const { title, records, selectedRecordKey, emptyMessage, onSelectRecord } = props;

  return (
    <aside className="panel episode-panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <span className="counter-pill">{records.length}</span>
      </div>
      <div className="episode-list">
        {records.length === 0 ? (
          <div className="empty-state">{emptyMessage}</div>
        ) : (
          records.map((record) => {
            const key = `${record.channelId}/${record.id}`;
            const isActive = key === selectedRecordKey;
            return (
              <button
                key={key}
                className={`episode-item ${isActive ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onSelectRecord(record.channelId, record.id);
                }}
              >
                <p className="episode-item-title">{record.title || record.id}</p>
                <p className="episode-item-meta">
                  {record.channelId} · {record.currentStage}
                </p>
                <p className="episode-item-meta">Updated {formatDate(record.updatedAt)}</p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
