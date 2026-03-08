import { ReviewQueuePane } from '../components/ReviewQueuePane';
import { DecisionPanel } from '../components/DecisionPanel';
import { IssueList } from '../components/IssueList';
import { LineagePanel } from '../components/LineagePanel';
import { StageCanvas } from '../components/stage-canvas/StageCanvas';
import { stageLabels } from '../helpers';
import type { PackageManifest } from '../types';
import { useWorkbenchApp } from '../useWorkbenchApp';
import { useWorkbenchStudio } from '../useWorkbenchStudio';

type WorkbenchAppState = ReturnType<typeof useWorkbenchApp>;
type StudioState = ReturnType<typeof useWorkbenchStudio>;

export function ProductionDeskPage(props: {
  app: WorkbenchAppState;
  studio: StudioState;
  items: StudioState['reviewQueue'];
  packageDraft: PackageManifest | null;
}) {
  const { app, studio, items, packageDraft } = props;
  const visibleStages =
    app.workflow?.stages.filter((stage) => stage.stage !== 'topic' && stage.stage !== 'package') ?? [];

  return (
    <section className="workspace-layout">
      <ReviewQueuePane
        title="Production Desk"
        channelLabel={app.selectedChannel?.name ?? app.activeChannelId}
        items={items}
        selectedId={studio.selectedQueueItem?.id ?? null}
        currentWorkspace={studio.workspace}
        workspaceCounts={studio.workspaceCounts}
        loadError={studio.queueLoadError}
        onSelect={studio.selectQueueItem}
      />

      <main className="canvas-column">
        <section className="stage-rail">
          {visibleStages.map((stage) => (
            <button
              key={stage.stage}
              type="button"
              className={`stage-rail-chip ${app.selectedStage === stage.stage ? 'active' : ''}`}
              onClick={() => {
                app.handleSelectStage(stage.stage);
              }}
            >
              <span>{stageLabels[stage.stage]}</span>
              <small>{stage.reviewStatus}</small>
            </button>
          ))}
        </section>

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
          void studio.handleApproveAndNext();
        }}
        onDiscard={() => {
          void app.handleArchiveRecord();
        }}
        onAddComment={() => {
          void studio.addStageComment('issue');
        }}
      />
    </section>
  );
}
