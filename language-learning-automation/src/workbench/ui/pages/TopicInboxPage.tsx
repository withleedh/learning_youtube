import { ReviewQueuePane } from '../components/ReviewQueuePane';
import { DecisionPanel } from '../components/DecisionPanel';
import { IssueList } from '../components/IssueList';
import { LineagePanel } from '../components/LineagePanel';
import { StageCanvas } from '../components/stage-canvas/StageCanvas';
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
  const selectedChannel =
    app.availableChannels.find((channel) => channel.id === app.createChannelId) ?? null;

  return (
    <>
      <section className="workspace-toolbar">
        <form
          className="workspace-create-form"
          onSubmit={(event) => void app.handleCreateTopicCandidateBatch(event)}
        >
          <label>
            <span>Channel</span>
            <select
              value={app.createChannelId}
              onChange={(event) => {
                app.handleSetCreateChannelId(event.target.value);
              }}
            >
              {app.availableChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
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
              <option value="conversation">Conversation</option>
              <option value="news">News</option>
              <option value="travel_business">Travel & Business</option>
            </select>
          </label>
          <button type="submit" className="primary-button" disabled={app.isBusy}>
            Generate Topic Pool
          </button>
        </form>
        {selectedChannel ? (
          <p className="queue-meta">
            {selectedChannel.targetLanguage} {'->'} {selectedChannel.nativeLanguage}
          </p>
        ) : null}
      </section>

      <section className="workspace-layout">
      <ReviewQueuePane
        title="Topic Inbox"
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
          onCommentTextChange={studio.setCommentText}
          onRenderTimestampMsChange={studio.setRenderTimestampMs}
          onGenerate={() => {
            void app.handleGenerateStage();
          }}
          onApprove={() => {
            void app.handleApproveStage();
          }}
          onRequestChanges={() => {
            void app.handleRequestChanges();
          }}
          onApproveAndNext={() => {
            void studio.handleApproveAndNext();
          }}
          onAddComment={() => {
            void studio.addStageComment('decision');
          }}
          extraActions={
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                void app.handleSpawnScriptCandidates();
              }}
              disabled={app.isBusy}
            >
              Approve & Create Script Pool
            </button>
          }
        />
      </section>
    </>
  );
}
