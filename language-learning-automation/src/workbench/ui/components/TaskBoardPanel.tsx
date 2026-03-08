import { formatDate, stageLabels } from '../helpers';
import type { ChannelOption, EpisodeSummary } from '../types';

type CandidateSortMode = 'review_ready' | 'updated_desc' | 'title_asc' | 'stage';

type BoardColumn = {
  id: string;
  title: string;
  subtitle: string;
  items: EpisodeSummary[];
  kind: 'candidate' | 'episode';
};

function getCurrentReviewStatus(record: EpisodeSummary): string {
  return record.stageStates?.[record.currentStage]?.reviewStatus ?? 'draft';
}

function getCardTitle(record: EpisodeSummary): string {
  return record.previewText || record.title || record.id;
}

function filterEpisodes(
  episodes: EpisodeSummary[],
  searchQuery: string,
  channelFilter: string
): EpisodeSummary[] {
  const query = searchQuery.trim().toLowerCase();

  return episodes.filter((episode) => {
    const title = getCardTitle(episode).toLowerCase();
    const haystack = `${title} ${episode.channelId}`.toLowerCase();

    if (query && !haystack.includes(query)) {
      return false;
    }

    if (channelFilter && episode.channelId !== channelFilter) {
      return false;
    }

    return true;
  });
}

export function TaskBoardPanel(props: {
  candidates: EpisodeSummary[];
  episodes: EpisodeSummary[];
  selectedRecordKey: string | null;
  selectedCandidateKeys: string[];
  availableChannels: ChannelOption[];
  searchQuery: string;
  channelFilter: string;
  sortMode: CandidateSortMode;
  isBusy: boolean;
  areAllFilteredCandidatesSelected: boolean;
  bulkEligibleCandidateCount: number;
  onSearchQueryChange(value: string): void;
  onChannelFilterChange(value: string): void;
  onSortModeChange(value: CandidateSortMode): void;
  onSelectRecord(channelId: string, episodeId: string): void;
  onToggleCandidateSelection(channelId: string, episodeId: string): void;
  onToggleSelectFilteredCandidates(): void;
  onBulkApprove(): void;
}) {
  const {
    candidates,
    episodes,
    selectedRecordKey,
    selectedCandidateKeys,
    availableChannels,
    searchQuery,
    channelFilter,
    sortMode,
    isBusy,
    areAllFilteredCandidatesSelected,
    bulkEligibleCandidateCount,
    onSearchQueryChange,
    onChannelFilterChange,
    onSortModeChange,
    onSelectRecord,
    onToggleCandidateSelection,
    onToggleSelectFilteredCandidates,
    onBulkApprove,
  } = props;

  const filteredEpisodes = filterEpisodes(episodes, searchQuery, channelFilter);
  const columns: BoardColumn[] = [
    {
      id: 'generating',
      title: 'Generating',
      subtitle: '생성 중이거나 아직 읽을 수 없는 초안',
      kind: 'candidate',
      items: candidates.filter(
        (candidate) =>
          (candidate.currentStage === 'topic' || candidate.currentStage === 'script') &&
          getCurrentReviewStatus(candidate) === 'draft'
      ),
    },
    {
      id: 'review-queue',
      title: 'Review Queue',
      subtitle: 'topic과 script 검수 대기',
      kind: 'candidate',
      items: candidates.filter(
        (candidate) =>
          (candidate.currentStage === 'topic' || candidate.currentStage === 'script') &&
          getCurrentReviewStatus(candidate) === 'pending_review'
      ),
    },
    {
      id: 'ready-to-produce',
      title: 'Ready To Produce',
      subtitle: '승격 대기 중인 최종 script',
      kind: 'candidate',
      items: candidates.filter(
        (candidate) =>
          candidate.currentStage === 'script' &&
          (getCurrentReviewStatus(candidate) === 'approved' ||
            candidate.workflowStatus === 'completed')
      ),
    },
    {
      id: 'production',
      title: 'Production',
      subtitle: '이미지, TTS, 렌더 진행',
      kind: 'episode',
      items: filteredEpisodes.filter((episode) => episode.workflowStatus !== 'completed'),
    },
    {
      id: 'done',
      title: 'Done',
      subtitle: '제작 완료',
      kind: 'episode',
      items: filteredEpisodes.filter((episode) => episode.workflowStatus === 'completed'),
    },
  ];

  return (
    <section className="panel board-panel">
      <div className="panel-header panel-header-spread">
        <div>
          <h2>Task Board</h2>
          <p className="panel-note">
            사용자가 실제로 처리해야 하는 단계 기준으로 topic, script, production을 나눠서 봅니다.
          </p>
        </div>
        <span className="counter-pill">{columns.reduce((total, column) => total + column.items.length, 0)}</span>
      </div>

      <div className="candidate-filter-grid board-filter-grid">
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
          <span>Rank</span>
          <select
            value={sortMode}
            onChange={(event) => {
              onSortModeChange(event.target.value as CandidateSortMode);
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

      <div className="kanban-board">
        {columns.map((column) => (
          <section key={column.id} className="kanban-column">
            <div className="kanban-column-head">
              <div>
                <h3>{column.title}</h3>
                <p className="panel-note">{column.subtitle}</p>
              </div>
              <span className="counter-pill">{column.items.length}</span>
            </div>
            <div className="kanban-card-list">
              {column.items.length === 0 ? (
                <div className="empty-state board-empty-state">No cards</div>
              ) : (
                column.items.map((record) => {
                  const key = `${record.channelId}/${record.id}`;
                  const isSelected = selectedRecordKey === key;
                  const reviewStatus = getCurrentReviewStatus(record);
                  const isCandidate = record.kind === 'candidate';

                  return (
                    <article
                      key={key}
                      className={`board-card ${isSelected ? 'selected' : ''}`.trim()}
                    >
                      <div className="board-card-head">
                        {isCandidate ? (
                          <label className="candidate-checkbox board-card-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedCandidateKeys.includes(key)}
                              onChange={() => {
                                onToggleCandidateSelection(record.channelId, record.id);
                              }}
                            />
                          </label>
                        ) : null}
                        <button
                          type="button"
                          className="board-card-button"
                          onClick={() => {
                            onSelectRecord(record.channelId, record.id);
                          }}
                        >
                          <div className="board-card-topline">
                            <span className="code-pill">{stageLabels[record.currentStage]}</span>
                            <span className={`status-badge status-${reviewStatus}`}>
                              {reviewStatus}
                            </span>
                          </div>
                          <h4>{getCardTitle(record)}</h4>
                          {record.previewMeta ? (
                            <p className="candidate-preview-meta">{record.previewMeta}</p>
                          ) : null}
                          <p className="board-card-meta">
                            {record.channelId} · {record.kind} · {record.workflowStatus}
                          </p>
                          <p className="board-card-meta">Updated {formatDate(record.updatedAt)}</p>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
