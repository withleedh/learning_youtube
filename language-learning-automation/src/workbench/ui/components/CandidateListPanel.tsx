import { formatDate } from '../helpers';
import type { ChannelOption, EpisodeSummary } from '../types';

function getCurrentReviewStatus(record: EpisodeSummary): string {
  return record.stageStates?.[record.currentStage]?.reviewStatus ?? 'draft';
}

export function CandidateListPanel(props: {
  candidates: EpisodeSummary[];
  selectedRecordKey: string | null;
  selectedCandidateKeys: string[];
  availableChannels: ChannelOption[];
  searchQuery: string;
  channelFilter: string;
  stageFilter: 'all' | 'topic' | 'script';
  reviewFilter: 'all' | 'draft' | 'pending_review' | 'approved' | 'completed';
  sortMode: 'review_ready' | 'updated_desc' | 'title_asc' | 'stage';
  isBusy: boolean;
  areAllFilteredCandidatesSelected: boolean;
  bulkEligibleCandidateCount: number;
  onSearchQueryChange(value: string): void;
  onChannelFilterChange(value: string): void;
  onStageFilterChange(value: 'all' | 'topic' | 'script'): void;
  onReviewFilterChange(
    value: 'all' | 'draft' | 'pending_review' | 'approved' | 'completed'
  ): void;
  onSortModeChange(value: 'review_ready' | 'updated_desc' | 'title_asc' | 'stage'): void;
  onSelectRecord(channelId: string, episodeId: string): void;
  onToggleCandidateSelection(channelId: string, episodeId: string): void;
  onToggleSelectFilteredCandidates(): void;
  onBulkApprove(): void;
}) {
  const {
    candidates,
    selectedRecordKey,
    selectedCandidateKeys,
    availableChannels,
    searchQuery,
    channelFilter,
    stageFilter,
    reviewFilter,
    sortMode,
    isBusy,
    areAllFilteredCandidatesSelected,
    bulkEligibleCandidateCount,
    onSearchQueryChange,
    onChannelFilterChange,
    onStageFilterChange,
    onReviewFilterChange,
    onSortModeChange,
    onSelectRecord,
    onToggleCandidateSelection,
    onToggleSelectFilteredCandidates,
    onBulkApprove,
  } = props;

  return (
    <aside className="panel episode-panel">
      <div className="panel-header">
        <h2>Topic & Script Candidates</h2>
        <span className="counter-pill">{candidates.length}</span>
      </div>

      <div className="candidate-filter-grid">
        <label className="inspector-form-field">
          <span>Search</span>
          <input
            value={searchQuery}
            placeholder="topic, title, channel"
            onChange={(event) => {
              onSearchQueryChange(event.target.value);
            }}
          />
        </label>
        <label className="inspector-form-field">
          <span>Channel</span>
          <select
            value={channelFilter}
            onChange={(event) => {
              onChannelFilterChange(event.target.value);
            }}
          >
            <option value="">All channels</option>
            {availableChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inspector-form-field">
          <span>Stage</span>
          <select
            value={stageFilter}
            onChange={(event) => {
              onStageFilterChange(event.target.value as 'all' | 'topic' | 'script');
            }}
          >
            <option value="all">All stages</option>
            <option value="topic">Topic</option>
            <option value="script">Script</option>
          </select>
        </label>
        <label className="inspector-form-field">
          <span>Review</span>
          <select
            value={reviewFilter}
            onChange={(event) => {
              onReviewFilterChange(
                event.target.value as
                  | 'all'
                  | 'draft'
                  | 'pending_review'
                  | 'approved'
                  | 'completed'
              );
            }}
          >
            <option value="all">All states</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="inspector-form-field">
          <span>Rank</span>
          <select
            value={sortMode}
            onChange={(event) => {
              onSortModeChange(
                event.target.value as 'review_ready' | 'updated_desc' | 'title_asc' | 'stage'
              );
            }}
          >
            <option value="review_ready">Review Ready First</option>
            <option value="updated_desc">Latest Update</option>
            <option value="title_asc">Title A-Z</option>
            <option value="stage">Stage</option>
          </select>
        </label>
      </div>

      <div className="candidate-bulk-bar">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={areAllFilteredCandidatesSelected}
            disabled={bulkEligibleCandidateCount === 0 || isBusy}
            onChange={() => {
              onToggleSelectFilteredCandidates();
            }}
          />
          <span>Select filtered ({bulkEligibleCandidateCount})</span>
        </label>
        <div className="inline-actions">
          <span className="panel-note">{selectedCandidateKeys.length} selected</span>
          <button
            type="button"
            className="secondary-button"
            disabled={selectedCandidateKeys.length === 0 || isBusy}
            onClick={onBulkApprove}
          >
            Bulk Approve
          </button>
        </div>
      </div>

      <div className="episode-list">
        {candidates.length === 0 ? (
          <div className="empty-state">
            아직 candidate가 없습니다. 상단에서 topic batch를 먼저 생성하세요.
          </div>
        ) : (
          candidates.map((candidate) => {
            const key = `${candidate.channelId}/${candidate.id}`;
            const isActive = key === selectedRecordKey;
            const isChecked = selectedCandidateKeys.includes(key);
            const reviewStatus = getCurrentReviewStatus(candidate);
            return (
              <div
                key={key}
                className={`candidate-row ${isActive ? 'active' : ''}`}
              >
                <label className="candidate-checkbox">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      onToggleCandidateSelection(candidate.channelId, candidate.id);
                    }}
                  />
                </label>
                <button
                  className={`episode-item ${isActive ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    onSelectRecord(candidate.channelId, candidate.id);
                  }}
                >
                  <div className="candidate-item-head">
                    <p className="episode-item-title">
                      {candidate.previewText || candidate.title || candidate.id}
                    </p>
                    <span className={`status-badge status-${reviewStatus}`}>{reviewStatus}</span>
                  </div>
                  {candidate.previewMeta ? (
                    <p className="candidate-preview-meta">{candidate.previewMeta}</p>
                  ) : null}
                  <p className="episode-item-meta">
                    {candidate.channelId} · {candidate.currentStage} · {candidate.workflowStatus}
                  </p>
                  <p className="episode-item-meta">Updated {formatDate(candidate.updatedAt)}</p>
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
