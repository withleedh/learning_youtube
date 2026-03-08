import type { TopicCandidatesArtifact } from '../types';

export function TopicCandidateReview(props: {
  artifact: TopicCandidatesArtifact;
  approvalText: string;
  isBusy: boolean;
  onTopicApprovalTextChange(value: string): void;
}) {
  const { artifact, approvalText, isBusy, onTopicApprovalTextChange } = props;
  const selectedTopic = approvalText.trim() || artifact.recommendedTopic;

  return (
    <section className="inspector-section">
      <div className="section-header">
        <h3>Topic Review</h3>
      </div>
      <p className="panel-note">
        후보를 바로 읽고 선택할 수 있습니다. 선택하지 않으면 recommended topic이 승인됩니다.
      </p>
      <div className="review-stat-row">
        <span className="code-pill">{artifact.category}</span>
        <span className="code-pill">{artifact.candidates.length} candidates</span>
        <span className="code-pill">Selected: {selectedTopic}</span>
      </div>
      <div className="topic-review-grid">
        {artifact.candidates.map((candidate) => {
          const isRecommended = candidate === artifact.recommendedTopic;
          const isSelected = candidate === selectedTopic;

          return (
            <article
              key={candidate}
              className={`topic-review-card ${isRecommended ? 'recommended' : ''} ${isSelected ? 'selected' : ''}`.trim()}
            >
              <div className="topic-review-card-head">
                <div className="inline-actions">
                  {isRecommended ? <span className="status-badge status-approved">recommended</span> : null}
                  {isSelected ? <span className="status-badge status-pending_review">selected</span> : null}
                </div>
              </div>
              <p className="topic-review-title">{candidate}</p>
              <div className="inspector-actions">
                <button
                  type="button"
                  className={isSelected ? 'secondary-button' : 'ghost-button'}
                  disabled={isBusy}
                  onClick={() => {
                    onTopicApprovalTextChange(candidate);
                  }}
                >
                  Use This Topic
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
