import { formatDate, getAutoCategoryForDate, getCategoryLabel, workbenchCategoryOptions } from '../helpers';
import { useWorkbenchApp } from '../useWorkbenchApp';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type WorkbenchAppState = ReturnType<typeof useWorkbenchApp>;
type StudioState = ReturnType<typeof useWorkbenchStudio>;

function getTopicCategoryLabel(previewMeta?: string): string {
  const rawCategory = previewMeta?.split('·')[0]?.trim();
  if (!rawCategory) {
    return 'Unknown';
  }

  const matchingOption = workbenchCategoryOptions.find((option) => option.value === rawCategory);
  return matchingOption?.label ?? rawCategory;
}

function getTopicRowTitle(title?: string, previewText?: string, fallbackId?: string): string {
  return title || previewText || fallbackId || 'Untitled topic';
}

export function TopicInboxPage(props: {
  app: WorkbenchAppState;
  studio: StudioState;
  items: StudioState['reviewQueue'];
}) {
  const { app, studio, items } = props;
  const selectedChannel = app.selectedChannel;
  const resolvedTopicCategory = app.topicBatchCategory || getAutoCategoryForDate(new Date());
  const generatedTopicKeys = new Set(items.map((item) => `${item.channelId}/${item.recordId}`));
  const generatingItems = app.candidates.filter((candidate) => {
    const candidateKey = `${candidate.channelId}/${candidate.id}`;
    const topicReviewStatus = candidate.stageStates?.topic?.reviewStatus;
    const isTopicRecord = candidate.kind === 'topic_pool' || candidate.kind === 'topic_candidate';
    const isGenerating =
      candidate.workflowStatus === 'in_progress' ||
      candidate.workflowStatus === 'draft' ||
      topicReviewStatus === 'draft';

    return isTopicRecord && candidate.currentStage === 'topic' && isGenerating && !generatedTopicKeys.has(candidateKey);
  });

  return (
    <>
      <section className="workspace-toolbar">
        <form
          className="workspace-create-form"
          onSubmit={(event) => void app.handleCreateTopicCandidateBatch(event)}
        >
          <label>
            <span>Topics to generate</span>
            <input
              type="number"
              min={1}
              max={200}
              value={app.topicBatchCount}
              onChange={(event) => {
                app.handleSetTopicBatchCount(Number(event.target.value || 1));
              }}
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={app.topicBatchCategory}
              onChange={(event) => {
                app.handleSetTopicBatchCategory(event.target.value);
              }}
            >
              <option value="">Auto category</option>
              {workbenchCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary-button" disabled={app.isBusy}>
            Generate Topics
          </button>
        </form>
        {selectedChannel ? (
          <div>
            <p className="queue-meta">
              {selectedChannel.targetLanguage} {'->'} {selectedChannel.nativeLanguage}
            </p>
            <p className="queue-meta">
              {app.topicBatchCategory
                ? `Selected category: ${getCategoryLabel(resolvedTopicCategory)}`
                : `Auto category resolves to ${getCategoryLabel(resolvedTopicCategory)} today`}
            </p>
          </div>
        ) : null}
      </section>

      <section className="topic-list-shell studio-panel">
        <div className="topic-list-stack">
          {generatingItems.length > 0 ? (
            <section className="topic-list-section">
              <div className="studio-panel-header">
                <div>
                  <p className="studio-kicker">Topic Generation</p>
                  <h2>Generating Topics</h2>
                </div>
                <span className="studio-counter">{generatingItems.length}</span>
              </div>

              <div className="topic-table" role="table" aria-label="Generating Topics">
                <div className="topic-table-header" role="row">
                  <span>Topic</span>
                  <span>Category</span>
                  <span>Generated</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {generatingItems.map((item) => {
                  const itemKey = `${item.channelId}/${item.id}`;
                  const isSelected = app.selectedRecordKey === itemKey;
                  return (
                    <div
                      key={itemKey}
                      className={`topic-list-row ${isSelected ? 'active' : ''}`}
                      role="row"
                    >
                      <button
                        type="button"
                        className="topic-row-title"
                        onClick={() => {
                          void app.handleSelectRecord(item.channelId, item.id);
                          app.handleSelectStage('topic');
                        }}
                      >
                        <strong>{getTopicRowTitle(item.title, item.previewText, item.id)}</strong>
                        <span className="topic-row-subtitle">
                          {item.nextAction || item.previewText || 'Generating topic candidates...'}
                        </span>
                      </button>
                      <span>{getTopicCategoryLabel(item.previewMeta)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>
                        <span className={`status-badge status-${item.workflowStatus}`}>
                          {item.workflowStatus}
                        </span>
                      </span>
                      <span>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            void app.handleSelectRecord(item.channelId, item.id);
                            app.handleSelectStage('topic');
                          }}
                        >
                          Inspect
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="topic-list-section">
            <div className="studio-panel-header">
              <div>
                <p className="studio-kicker">Topic Candidates</p>
                <h2>Generated Topics</h2>
              </div>
              <span className="studio-counter">{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div className="empty-state">No generated topics yet. Generate topics to start reviewing.</div>
            ) : (
              <div className="topic-table" role="table" aria-label="Generated Topics">
                <div className="topic-table-header" role="row">
                  <span>Topic</span>
                  <span>Category</span>
                  <span>Generated</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {items.map((item) => {
                  const itemKey = `${item.channelId}/${item.recordId}`;
                  const isSelected = app.selectedRecordKey === itemKey;
                  return (
                    <div
                      key={item.id}
                      className={`topic-list-row ${isSelected ? 'active' : ''}`}
                      role="row"
                    >
                      <button
                        type="button"
                        className="topic-row-title"
                        onClick={() => {
                          void studio.selectQueueItem(item);
                        }}
                      >
                        <strong>{getTopicRowTitle(item.title, item.previewText, item.recordId)}</strong>
                        <span className="topic-row-subtitle">{item.previewText || item.nextAction || ''}</span>
                      </button>
                      <span>{getTopicCategoryLabel(item.previewMeta)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>
                        <span className={`status-badge status-${item.reviewStatus}`}>{item.reviewStatus}</span>
                      </span>
                      <button
                        type="button"
                        className="primary-button topic-row-action"
                        disabled={app.isBusy || studio.isStudioBusy || item.reviewStatus !== 'pending_review'}
                        onClick={() => {
                          void (async () => {
                            const didApprove = await app.handleApproveTopicCandidate(
                              item.channelId,
                              item.recordId
                            );
                            if (didApprove) {
                              studio.setWorkspace('script_lab');
                            }
                          })();
                        }}
                      >
                        Approve
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
