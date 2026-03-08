import { isApprovedTopicArtifact, isTopicCandidatesArtifact } from '../../helpers';

function scoreTopic(topic: string) {
  const wordCount = topic.trim().split(/\s+/).filter(Boolean).length;
  const difficulty = wordCount <= 3 ? 'Easy' : wordCount <= 6 ? 'Balanced' : 'Advanced';
  const channelFit = wordCount <= 6 ? 'High fit' : 'Needs review';
  return { difficulty, channelFit };
}

export function TopicCanvas(props: {
  currentArtifact: unknown;
  approvedArtifact: unknown;
  approvalText: string;
  isBusy: boolean;
  onSelectTopic(topic: string): void;
}) {
  const { currentArtifact, approvedArtifact, approvalText, isBusy, onSelectTopic } = props;

  if (!isTopicCandidatesArtifact(currentArtifact)) {
    return <div className="empty-state">No topic candidates available yet.</div>;
  }

  const approvedTopic = isApprovedTopicArtifact(approvedArtifact)
    ? approvedArtifact.approvedTopic
    : null;
  const selectedTopic = approvalText.trim() || approvedTopic || currentArtifact.recommendedTopic;

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Topic Inbox</p>
          <h2>{currentArtifact.recommendedTopic}</h2>
          <p className="queue-meta">
            {currentArtifact.category} · {currentArtifact.candidates.length} candidates
          </p>
          <p className="queue-meta">Selected topic: {selectedTopic}</p>
        </div>
        {approvedTopic ? <span className="status-chip status-approved">Approved topic saved</span> : null}
      </div>

      <div className="topic-card-grid">
        {currentArtifact.candidates.map((candidate, index) => {
          const metrics = scoreTopic(candidate);
          const isRecommended = candidate === currentArtifact.recommendedTopic;
          const isSelected = candidate === selectedTopic;
          const isApproved = candidate === approvedTopic;
          return (
            <button
              key={`${candidate}-${index}`}
              type="button"
              className={`topic-review-card ${isRecommended ? 'recommended' : ''} ${isSelected ? 'selected' : ''}`}
              disabled={isBusy}
              onClick={() => {
                onSelectTopic(candidate);
              }}
            >
              <div className="queue-card-head">
                <span className={`status-badge ${isRecommended ? 'status-pending_review' : 'status-draft'}`}>
                  {isRecommended ? 'recommended' : 'candidate'}
                </span>
                {isSelected ? <span className="queue-pill">selected</span> : null}
                {isApproved ? <span className="queue-pill">approved</span> : null}
              </div>
              <strong>{candidate}</strong>
              <div className="queue-pill-row">
                <span className="queue-pill">{metrics.difficulty}</span>
                <span className="queue-pill">{metrics.channelFit}</span>
                <span className="queue-pill">#{index + 1}</span>
              </div>
              <div className="queue-pill-row">
                <span className={`queue-pill ${isSelected ? 'queue-pill-selected' : ''}`}>
                  {isSelected ? 'Selected' : 'Click card to select'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
