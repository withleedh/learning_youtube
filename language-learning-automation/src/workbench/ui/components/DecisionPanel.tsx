import type { ReactNode } from 'react';
import type { StageReviewContext } from '../types';

export function DecisionPanel(props: {
  context: StageReviewContext | null;
  notice?: string;
  isBusy: boolean;
  commentText: string;
  renderTimestampMs: string;
  onCommentTextChange(value: string): void;
  onRenderTimestampMsChange(value: string): void;
  onGenerate(): void;
  onApprove(): void;
  onRequestChanges(): void;
  onApproveAndNext(): void;
  onAddComment(): void;
  extraActions?: ReactNode;
}) {
  const {
    context,
    notice,
    isBusy,
    commentText,
    renderTimestampMs,
    onCommentTextChange,
    onRenderTimestampMsChange,
    onGenerate,
    onApprove,
    onRequestChanges,
    onApproveAndNext,
    onAddComment,
    extraActions,
  } = props;

  return (
    <aside className="studio-panel decision-pane">
      <div className="studio-panel-header">
        <div>
          <p className="studio-kicker">Decision Panel</p>
          <h2>{context ? `${context.stage} review` : 'No selection'}</h2>
        </div>
      </div>

      {notice ? <p className="notice-banner">{notice}</p> : null}
      {!context ? (
        <div className="empty-state">Choose a review task to start.</div>
      ) : (
        <>
          <section className="decision-block">
            <span className={`status-chip status-${context.stageSummary.reviewStatus}`}>
              {context.stageSummary.reviewStatus}
            </span>
            <p className="queue-meta">
              v{String(context.stageSummary.currentVersion).padStart(3, '0')} · approved{' '}
              {context.stageSummary.approvedVersion
                ? `v${String(context.stageSummary.approvedVersion).padStart(3, '0')}`
                : 'none'}
            </p>
            {context.stageSummary.staleReasons.length > 0 ? (
              <div className="alert-list">
                {context.stageSummary.staleReasons.map((reason) => (
                  <p key={reason} className="alert-item">
                    {reason}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <section className="decision-block">
            <div className="decision-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onGenerate}
                disabled={isBusy || !context.stageSummary.canGenerate}
              >
                Regenerate Selected
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={onApprove}
                disabled={isBusy || !context.stageSummary.canApprove}
              >
                Approve
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={onRequestChanges}
                disabled={isBusy || !context.stageSummary.canRequestChanges}
              >
                Request Changes
              </button>
              <button type="button" className="ghost-button" onClick={onApproveAndNext} disabled={isBusy}>
                Approve & Next
              </button>
            </div>
            {extraActions}
          </section>

          <section className="decision-block">
            <div className="subpanel-header">
              <h3>Quick Comment</h3>
            </div>
            {context.stage === 'render' ? (
              <label className="inspector-form-field">
                <span>Timestamp (ms)</span>
                <input
                  value={renderTimestampMs}
                  onChange={(event) => {
                    onRenderTimestampMsChange(event.target.value);
                  }}
                />
              </label>
            ) : null}
            <label className="inspector-form-field">
              <span>Issue or note</span>
              <textarea
                value={commentText}
                onChange={(event) => {
                  onCommentTextChange(event.target.value);
                }}
              />
            </label>
            <button type="button" className="secondary-button" onClick={onAddComment} disabled={isBusy}>
              Save Comment
            </button>
          </section>

          <section className="decision-block">
            <div className="subpanel-header">
              <h3>Downstream Impact</h3>
            </div>
            <div className="impact-list">
              {context.downstream.length === 0 ? (
                <div className="empty-state">No downstream stages.</div>
              ) : (
                context.downstream.map((item) => (
                  <article key={item.stage} className="impact-card">
                    <strong>{item.stage}</strong>
                    <p className="queue-meta">{item.reviewStatus}</p>
                    {item.staleReasons.map((reason) => (
                      <p key={reason} className="queue-body-copy">
                        {reason}
                      </p>
                    ))}
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
