import { ReviewQueuePane } from '../components/ReviewQueuePane';
import { DecisionPanel } from '../components/DecisionPanel';
import { IssueList } from '../components/IssueList';
import { LineagePanel } from '../components/LineagePanel';
import { StageCanvas } from '../components/stage-canvas/StageCanvas';
import {
  getAutoCategoryForDate,
  getCategoryLabel,
  workbenchCategoryOptions,
} from '../helpers';
import type { PackageManifest } from '../types';
import { useWorkbenchApp } from '../useWorkbenchApp';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type WorkbenchAppState = ReturnType<typeof useWorkbenchApp>;
type StudioState = ReturnType<typeof useWorkbenchStudio>;

export function TopicInboxPage(props: {
  app: WorkbenchAppState;
  studio: StudioState;
  items: StudioState['reviewQueue'];
  packageDraft: PackageManifest | null;
}) {
  const { app, studio, items, packageDraft } = props;
  const selectedChannel = app.selectedChannel;
  const resolvedTopicCategory = app.topicBatchCategory || getAutoCategoryForDate(new Date());
  const topicDecisionContext = studio.reviewContext?.stage === 'topic' ? studio.reviewContext : null;
  const topicDecisionBusy = app.isBusy || studio.isStudioBusy;
  const topicHeaderActions = (
    <div className="canvas-header-actions">
      {topicDecisionContext ? (
        <span className={`status-badge status-${topicDecisionContext.stageSummary.reviewStatus}`}>
          {topicDecisionContext.stageSummary.reviewStatus}
        </span>
      ) : null}
      <button
        type="button"
        className="danger-button"
        onClick={() => {
          void app.handleArchiveRecord();
        }}
        disabled={!topicDecisionContext || topicDecisionBusy}
      >
        Discard
      </button>
      <button
        type="button"
        className="primary-button"
        onClick={() => {
          void studio.handleApproveAndNext();
        }}
        disabled={
          !topicDecisionContext ||
          topicDecisionBusy ||
          !topicDecisionContext.stageSummary.canApprove
        }
      >
        Approve
      </button>
    </div>
  );

  return (
    <>
      <section className="workspace-toolbar">
        <form
          className="workspace-create-form"
          onSubmit={(event) => void app.handleCreateTopicCandidateBatch(event)}
        >
          <label>
            <span>Topics per pool</span>
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
            Generate Topic Pool
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

      <section className="workspace-layout">
        <ReviewQueuePane
          title="Topic Inbox"
          channelLabel={selectedChannel?.name ?? app.activeChannelId}
          items={items}
          selectedId={studio.selectedQueueItem?.id ?? null}
          currentWorkspace={studio.workspace}
          workspaceCounts={studio.workspaceCounts}
          loadError={studio.queueLoadError}
          onSelect={studio.selectQueueItem}
        />

        <main className="canvas-column">
          <StageCanvas
            app={app}
            packageDraft={packageDraft}
            topicHeaderActions={topicHeaderActions}
            onUpdatePackageField={studio.updatePackageField}
            onSavePackageDraft={() => {
              void studio.savePackageDraft();
            }}
          />
          <LineagePanel
            thread={studio.reviewContext?.thread ?? null}
            selectedRecordId={app.selectedRecordKey}
          />
          <IssueList comments={studio.reviewContext?.comments ?? []} />
        </main>

        <DecisionPanel
          context={studio.reviewContext}
          notice={app.notice}
          isBusy={app.isBusy || studio.isStudioBusy}
          commentText={studio.commentText}
          renderTimestampMs={studio.renderTimestampMs}
          showApproveDiscardActions={false}
          onCommentTextChange={studio.setCommentText}
          onRenderTimestampMsChange={studio.setRenderTimestampMs}
          onGenerate={() => {
            void app.handleGenerateStage();
          }}
          onApprove={() => {
            void studio.handleApproveAndNext();
          }}
          onDiscard={() => {
            void app.handleArchiveRecord();
          }}
          onAddComment={() => {
            void studio.addStageComment('decision');
          }}
        />
      </section>
    </>
  );
}
