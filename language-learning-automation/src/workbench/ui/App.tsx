import { DeveloperDrawer } from './components/DeveloperDrawer';
import { useDeliveryPackPage } from './hooks/useDeliveryPackPage';
import { useProductionDeskPage } from './hooks/useProductionDeskPage';
import { useScriptLabPage } from './hooks/useScriptLabPage';
import { useTopicInboxPage } from './hooks/useTopicInboxPage';
import { DeliveryPackPage } from './pages/DeliveryPackPage';
import { ProductionDeskPage } from './pages/ProductionDeskPage';
import { ScriptLabPage } from './pages/ScriptLabPage';
import { TopicInboxPage } from './pages/TopicInboxPage';
import { useWorkbenchApp } from './useWorkbenchApp';
import { useWorkbenchStudio } from './useWorkbenchStudio';

const workspaceLabels = {
  topic_inbox: 'Topic Inbox',
  script_lab: 'Script Lab',
  production_desk: 'Production Desk',
  delivery_pack: 'Delivery Pack',
} as const;

export function App() {
  const app = useWorkbenchApp();
  const studio = useWorkbenchStudio(app);
  const topicInbox = useTopicInboxPage(studio);
  const scriptLab = useScriptLabPage(studio);
  const productionDesk = useProductionDeskPage(studio);
  const deliveryPack = useDeliveryPackPage(studio);

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div>
          <p className="studio-kicker">Review-First Editorial Studio</p>
          <h1>Workbench Studio</h1>
          <p className="studio-subtitle">
            Review candidates fast, select the best script, refine production stage by stage, and package
            the final upload bundle without leaving the workbench.
          </p>
        </div>
        <div className="studio-topbar-actions">
          <label className="studio-channel-picker">
            <span>Channel Workspace</span>
            <select
              aria-label="Channel Workspace"
              value={app.activeChannelId}
              onChange={(event) => {
                void app.handleSetActiveChannelId(event.target.value);
              }}
            >
              {app.availableChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
            <small>
              {app.selectedChannel
                ? `${app.selectedChannel.targetLanguage} -> ${app.selectedChannel.nativeLanguage}`
                : 'Select a channel to isolate its workbench queue.'}
            </small>
          </label>
          <div className="live-chip">
            Jobs {app.liveStatus?.queuedJobs ?? 0} queued / {app.liveStatus?.runningJobs ?? 0} running
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void studio.refreshStudio();
            }}
            disabled={app.isBusy || studio.isStudioBusy}
          >
            Refresh Studio
          </button>
        </div>
      </header>

      <nav className="workspace-nav">
        {Object.entries(workspaceLabels).map(([workspace, label]) => (
          <button
            key={workspace}
            type="button"
            className={`workspace-tab ${studio.workspace === workspace ? 'active' : ''}`}
            onClick={() => {
              studio.setWorkspace(workspace as keyof typeof workspaceLabels);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {studio.workspace === 'topic_inbox' ? (
        <TopicInboxPage app={app} studio={studio} items={topicInbox.items} />
      ) : null}

      {studio.workspace === 'script_lab' ? (
        <ScriptLabPage app={app} studio={studio} items={scriptLab.items} packageDraft={studio.packageDraft} />
      ) : null}

      {studio.workspace === 'production_desk' ? (
        <ProductionDeskPage
          app={app}
          studio={studio}
          items={productionDesk.items}
          packageDraft={studio.packageDraft}
        />
      ) : null}

      {studio.workspace === 'delivery_pack' ? (
        <DeliveryPackPage
          app={app}
          studio={studio}
          items={deliveryPack.items}
          packageDraft={studio.packageDraft}
        />
      ) : null}

      <DeveloperDrawer
        isOpen={studio.developerDrawerOpen}
        onToggle={() => {
          studio.setDeveloperDrawerOpen(!studio.developerDrawerOpen);
        }}
        currentArtifact={studio.reviewContext?.currentArtifact ?? app.currentArtifact}
        approvedArtifact={studio.reviewContext?.approvedArtifact ?? app.approvedArtifact}
        apiLogs={studio.apiLogs}
        apiLogsError={studio.apiLogsError}
        onRefreshLogs={() => {
          void studio.refreshApiLogs();
        }}
      />
    </div>
  );
}
