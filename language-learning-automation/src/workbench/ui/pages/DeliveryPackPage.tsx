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

export function DeliveryPackPage(props: {
  app: WorkbenchAppState;
  studio: StudioState;
  items: StudioState['reviewQueue'];
  packageDraft: PackageManifest | null;
}) {
  const { app, studio, items, packageDraft } = props;

  return (
    <section className="workspace-layout">
      <ReviewQueuePane
        title="Delivery Pack"
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
      />
    </section>
  );
}
