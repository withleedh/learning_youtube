import { formatDate } from '../helpers';
import type { ReviewComment } from '../types';

export function IssueList(props: { comments: ReviewComment[] }) {
  const { comments } = props;

  return (
    <section className="studio-subpanel">
      <div className="subpanel-header">
        <h3>Issues & Notes</h3>
      </div>
      <div className="issue-list">
        {comments.length === 0 ? (
          <div className="empty-state">No comments on this stage yet.</div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="issue-card">
              <div className="issue-card-head">
                <span className={`status-badge status-${comment.status}`}>{comment.status}</span>
                <span className="queue-meta">{comment.kind}</span>
              </div>
              <p>{comment.text}</p>
              {comment.anchor ? (
                <p className="queue-meta">
                  {comment.anchor.label ||
                    comment.anchor.target ||
                    (comment.anchor.sentenceId ? `Sentence ${comment.anchor.sentenceId}` : '') ||
                    (comment.anchor.sceneIndex ? `Scene ${comment.anchor.sceneIndex}` : '') ||
                    (comment.anchor.timestampMs !== undefined
                      ? `${comment.anchor.timestampMs}ms`
                      : comment.anchor.kind)}
                </p>
              ) : null}
              <p className="queue-meta">{formatDate(comment.updatedAt)}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
