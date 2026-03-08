import { EpisodeListPanel } from './components/EpisodeListPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { WorkflowPanel } from './components/WorkflowPanel';
import { useWorkbenchApp } from './useWorkbenchApp';

export function App() {
  const app = useWorkbenchApp();
  const selectedChannel =
    app.availableChannels.find((channel) => channel.id === app.createChannelId) ?? null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Approval-First Control Plane</p>
          <h1>Channel Workbench</h1>
          <p className="subtitle">
            topic pool에서 대량 탐색하고, 승인된 script만 production episode로 승격합니다.
          </p>
        </div>
        <div className="topbar-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={app.isBusy}
            onClick={() => {
              void app.handleRefreshClick();
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="create-panel">
        <form
          className="create-form"
          onSubmit={(event) => void app.handleCreateTopicCandidateBatch(event)}
        >
          <label>
            <span>Channel</span>
            <select
              name="channelId"
              value={app.createChannelId}
              disabled={app.isBusy || app.availableChannels.length === 0}
              onChange={(event) => {
                app.handleSetCreateChannelId(event.target.value);
              }}
              required
            >
              {app.availableChannels.length === 0 ? (
                <option value="">No channels available</option>
              ) : (
                app.availableChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.id})
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            <span>Topic candidate count</span>
            <input
              type="number"
              min={1}
              max={200}
              value={app.topicBatchCount}
              disabled={app.isBusy || app.availableChannels.length === 0}
              onChange={(event) => {
                app.handleSetTopicBatchCount(Number(event.target.value || 1));
              }}
              required
            />
          </label>
          <label>
            <span>Topic category</span>
            <select
              value={app.topicBatchCategory}
              disabled={app.isBusy || app.availableChannels.length === 0}
              onChange={(event) => {
                app.handleSetTopicBatchCategory(event.target.value);
              }}
            >
              <option value="">Auto category</option>
              <option value="conversation">Conversation</option>
              <option value="news">News</option>
              <option value="travel_business">Travel &amp; Business</option>
            </select>
          </label>
          <div className="panel-note create-form-note">
            episode는 여기서 직접 만들지 않습니다. 좋은 topic/script candidate만 episode로 승격됩니다.
          </div>
          <button
            type="submit"
            className="primary-button"
            disabled={app.isBusy || app.availableChannels.length === 0}
          >
            Generate Topic Candidates
          </button>
        </form>
        {selectedChannel ? (
          <p className="panel-hint">
            {selectedChannel.targetLanguage} {'->'} {selectedChannel.nativeLanguage}
          </p>
        ) : null}
        {app.notice ? <p className="notice-banner">{app.notice}</p> : null}
      </section>

      <main className="layout">
        <section className="sidebar-stack">
          <EpisodeListPanel
            title="Topic & Script Candidates"
            records={app.candidates}
            selectedRecordKey={app.selectedRecordKey}
            emptyMessage="아직 candidate가 없습니다. 상단에서 topic batch를 먼저 생성하세요."
            onSelectRecord={(channelId, episodeId) => {
              void app.handleSelectRecord(channelId, episodeId);
            }}
          />
          <EpisodeListPanel
            title="Production Episodes"
            records={app.episodes}
            selectedRecordKey={app.selectedRecordKey}
            emptyMessage="승격된 production episode가 아직 없습니다."
            onSelectRecord={(channelId, episodeId) => {
              void app.handleSelectRecord(channelId, episodeId);
            }}
          />
        </section>

        <WorkflowPanel
          workflow={app.workflow}
          selectedStage={app.selectedStage}
          onSelectStage={app.handleSelectStage}
        />

        <InspectorPanel
          workflow={app.workflow}
          selectedStage={app.selectedStage}
          selectedStageInfo={app.selectedStageInfo}
          artifactError={app.artifactError}
          currentArtifact={app.currentArtifact}
          approvedArtifact={app.approvedArtifact}
          stageVersions={app.stageVersions}
          selectedVersionNumber={app.selectedVersionNumber}
          selectedVersionArtifact={app.selectedVersionArtifact}
          selectedVersionArtifactError={app.selectedVersionArtifactError}
          payloadText={app.payloadText}
          topicApprovalText={app.topicApprovalText}
          scriptDraftText={app.scriptDraftText}
          scriptEditorMode={app.scriptEditorMode}
          parsedScriptDraft={app.parsedScriptDraft}
          scriptImpact={app.scriptImpact}
          highlightState={app.highlightState}
          draggingSentenceIndex={app.draggingSentenceIndex}
          dragOverIndex={app.dragOverIndex}
          dragOverPosition={app.dragOverPosition}
          scriptBatchCount={app.scriptBatchCount}
          scriptBatchCategory={app.scriptBatchCategory}
          scriptBatchUsePipeline={app.scriptBatchUsePipeline}
          isBusy={app.isBusy}
          onPayloadChange={app.handleSetPayloadText}
          onTopicApprovalTextChange={app.handleSetTopicApprovalText}
          onGenerateStage={() => {
            void app.handleGenerateStage();
          }}
          onApproveStage={() => {
            void app.handleApproveStage();
          }}
          onRequestChanges={() => {
            void app.handleRequestChanges();
          }}
          onRefreshArtifacts={() => {
            void app.handleRefreshArtifacts();
          }}
          onSelectStageVersion={(version) => {
            void app.handleSelectStageVersion(version);
          }}
          onScriptEditorModeChange={app.handleSetScriptEditorMode}
          onRawScriptDraftChange={app.handleSetScriptDraftText}
          onScriptFieldChange={app.handleScriptFieldChange}
          onSentenceAction={app.handleSentenceAction}
          onSentenceDragStart={app.handleSentenceDragStart}
          onSentenceDragEnd={app.handleSentenceDragEnd}
          onSentenceDragOver={app.handleSentenceDragOver}
          onSentenceDragLeave={app.handleSentenceDragLeave}
          onSentenceDrop={app.handleSentenceDrop}
          onHighlightChange={app.handleSetHighlightState}
          onScriptBatchCountChange={app.handleSetScriptBatchCount}
          onScriptBatchCategoryChange={app.handleSetScriptBatchCategory}
          onScriptBatchUsePipelineChange={app.handleSetScriptBatchUsePipeline}
          onSpawnScriptCandidates={() => {
            void app.handleSpawnScriptCandidates();
          }}
          onPromoteCandidate={() => {
            void app.handlePromoteCandidate();
          }}
          onSaveScriptDraft={() => {
            void app.handleSaveScriptDraft();
          }}
          onRegenerateImpactedTts={app.handleRegenerateImpactedTts}
          onRegenerateImpactedScenes={app.handleRegenerateImpactedScenes}
          onRegenerateScene={app.handleRegenerateScene}
          onRegenerateSentence={app.handleRegenerateSentence}
        />
      </main>
    </div>
  );
}
