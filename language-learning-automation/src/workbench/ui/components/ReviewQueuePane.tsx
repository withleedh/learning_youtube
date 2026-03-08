import { formatDate } from '../helpers';
import type { ReviewQueueItem, ReviewWorkspace } from '../types';

const workspaceLabels: Record<ReviewWorkspace, string> = {
  topic_inbox: 'Topic Inbox',
  script_lab: 'Script Lab',
  production_desk: 'Production Desk',
  delivery_pack: 'Delivery Pack',
};

export function ReviewQueuePane(props: {
  title: string;
  channelLabel?: string;
  items: ReviewQueueItem[];
  selectedId: string | null;
  currentWorkspace: ReviewWorkspace;
  workspaceCounts: Record<ReviewWorkspace, number>;
  loadError?: string;
  onSelect(item: ReviewQueueItem): void | Promise<void>;
}) {
  const {
    title,
    channelLabel,
    items,
    selectedId,
    currentWorkspace,
    workspaceCounts,
    loadError,
    onSelect,
  } = props;
  const totalCount = Object.values(workspaceCounts).reduce((sum, count) => sum + count, 0);
  const otherWorkspaceSummaries = Object.entries(workspaceCounts)
    .filter(([workspace, count]) => workspace !== currentWorkspace && count > 0)
    .map(([workspace, count]) => `${workspaceLabels[workspace as ReviewWorkspace]} ${count}`);

  return (
    <aside className="studio-panel queue-pane">
      <div className="studio-panel-header">
        <div>
          <p className="studio-kicker">Review Queue</p>
          <h2>{title}</h2>
        </div>
        <span className="studio-counter">{items.length}</span>
      </div>

      {loadError ? (
        <div className="studio-alert studio-alert-error">
          Review queue failed to load. {loadError}
        </div>
      ) : null}

      <div className="queue-list">
        {items.length === 0 ? (
          <div className="empty-state">
            {totalCount === 0
              ? `No review tasks for ${channelLabel || 'this channel'} yet.`
              : `No review tasks in ${title} for ${channelLabel || 'this channel'} right now.`}
            {otherWorkspaceSummaries.length > 0 ? (
              <p className="queue-meta">Other queues: {otherWorkspaceSummaries.join(' · ')}</p>
            ) : null}
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`queue-card ${selectedId === item.id ? 'active' : ''}`}
              onClick={() => {
                void onSelect(item);
              }}
            >
              <div className="queue-card-head">
                <span className={`status-badge status-${item.reviewStatus}`}>{item.reviewStatus}</span>
              </div>
              <strong>{item.title}</strong>
              <p className="queue-body-copy">{item.previewText || item.previewMeta || item.nextAction}</p>
              <p className="queue-meta">
                Created {formatDate(item.createdAt)} · Updated {formatDate(item.updatedAt)}
              </p>
              <p className="queue-meta">
                {channelLabel ? `${item.stage} · ${item.lineageLabel}` : `${item.channelId} · ${item.stage} · ${item.lineageLabel}`}
              </p>
              <div className="queue-pill-row">
                <span className="queue-pill">open {item.issueCounts.open}</span>
                <span className="queue-pill">stale {item.issueCounts.stale}</span>
                <span className="queue-pill">review {item.reviewTaskCounts.reviewable}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
