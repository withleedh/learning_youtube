import type { DragEvent } from 'react';
import { ArtifactBlock } from './ArtifactBlock';
import { GenerationPayloadForm } from './GenerationPayloadForm';
import { ScriptReviewPanel } from './ScriptReviewPanel';
import { ScriptDraftEditor } from './ScriptDraftEditor';
import { TopicCandidateReview } from './TopicCandidateReview';
import {
  canRegenerateCurrentVersion,
  formatDate,
  isImageManifest,
  isScriptArtifact,
  isScriptPoolArtifact,
  isTopicCandidatesArtifact,
  isTtsManifest,
  stageLabels,
} from '../helpers';
import type {
  EpisodeStage,
  EpisodeWorkflow,
  HighlightState,
  ScriptArtifact,
  ScriptImpactSummary,
  StageVersionRecord,
  StageWorkflowSummary,
} from '../types';

type DragPosition = 'before' | 'after' | null;
const categoryOptions = [
  { value: '', label: 'Auto category' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'news', label: 'News' },
  { value: 'travel_business', label: 'Travel & Business' },
] as const;

export function InspectorPanel(props: {
  workflow: EpisodeWorkflow | null;
  selectedStage: EpisodeStage | null;
  selectedStageInfo: StageWorkflowSummary | null;
  artifactError: string;
  currentArtifact: unknown;
  approvedArtifact: unknown;
  stageVersions: StageVersionRecord[];
  selectedVersionNumber: number | null;
  selectedVersionArtifact: unknown;
  selectedVersionArtifactError: string;
  hasScriptDraftRemoteUpdate: boolean;
  isScriptDraftDirty: boolean;
  payloadText: string;
  topicApprovalText: string;
  scriptDraftText: string;
  scriptEditorMode: 'cards' | 'json';
  parsedScriptDraft: ScriptArtifact | null;
  scriptImpact: ScriptImpactSummary;
  highlightState: HighlightState | null;
  draggingSentenceIndex: number | null;
  dragOverIndex: number | null;
  dragOverPosition: DragPosition;
  scriptBatchCount: number;
  scriptBatchCategory: string;
  scriptBatchUsePipeline: boolean;
  isBusy: boolean;
  onPayloadChange(value: string): void;
  onTopicApprovalTextChange(value: string): void;
  onGenerateStage(): void;
  onApproveStage(): void;
  onRequestChanges(): void;
  onRefreshArtifacts(): void;
  onReloadScriptDraft(): void;
  onSelectStageVersion(version: number): void;
  onScriptEditorModeChange(mode: 'cards' | 'json'): void;
  onRawScriptDraftChange(value: string): void;
  onScriptFieldChange(
    path: string,
    rawValue: string,
    transform?: 'csv' | 'words',
    scriptType?: 'number'
  ): void;
  onSentenceAction(action: string, index: number): void;
  onSentenceDragStart(index: number): void;
  onSentenceDragEnd(): void;
  onSentenceDragOver(event: DragEvent<HTMLElement>, index: number): void;
  onSentenceDragLeave(event: DragEvent<HTMLElement>, index: number): void;
  onSentenceDrop(event: DragEvent<HTMLElement>, index: number): void;
  onHighlightChange(value: HighlightState | null): void;
  onScriptBatchCountChange(value: number): void;
  onScriptBatchCategoryChange(value: string): void;
  onScriptBatchUsePipelineChange(value: boolean): void;
  onSpawnScriptCandidates(): void;
  onPromoteCandidate(): void;
  onSaveScriptDraft(): void;
  onRegenerateImpactedTts(): void;
  onRegenerateImpactedScenes(): void;
  onRegenerateScene(sceneIndex: number): void;
  onRegenerateSentence(sentenceId: number): void;
}) {
  const {
    workflow,
    selectedStage,
    selectedStageInfo,
    artifactError,
    currentArtifact,
    approvedArtifact,
    stageVersions,
    selectedVersionNumber,
    selectedVersionArtifact,
    selectedVersionArtifactError,
    hasScriptDraftRemoteUpdate,
    isScriptDraftDirty,
    payloadText,
    topicApprovalText,
    scriptDraftText,
    scriptEditorMode,
    parsedScriptDraft,
    scriptImpact,
    highlightState,
    draggingSentenceIndex,
    dragOverIndex,
    dragOverPosition,
    scriptBatchCount,
    scriptBatchCategory,
    scriptBatchUsePipeline,
    isBusy,
    onPayloadChange,
    onTopicApprovalTextChange,
    onGenerateStage,
    onApproveStage,
    onRequestChanges,
    onRefreshArtifacts,
    onReloadScriptDraft,
    onSelectStageVersion,
    onScriptEditorModeChange,
    onRawScriptDraftChange,
    onScriptFieldChange,
    onSentenceAction,
    onSentenceDragStart,
    onSentenceDragEnd,
    onSentenceDragOver,
    onSentenceDragLeave,
    onSentenceDrop,
    onHighlightChange,
    onScriptBatchCountChange,
    onScriptBatchCategoryChange,
    onScriptBatchUsePipelineChange,
    onSpawnScriptCandidates,
    onPromoteCandidate,
    onSaveScriptDraft,
    onRegenerateImpactedTts,
    onRegenerateImpactedScenes,
    onRegenerateScene,
    onRegenerateSentence,
  } = props;
  const isTopicPool = workflow?.episode.kind === 'topic_pool';
  const isScriptPool = workflow?.episode.kind === 'script_pool';
  const isPool = isTopicPool || isScriptPool;
  const topicStageSummary = workflow?.stages.find((stage) => stage.stage === 'topic') ?? null;
  const scriptStageSummary = workflow?.stages.find((stage) => stage.stage === 'script') ?? null;
  const canSpawnScriptCandidates = Boolean(
    isTopicPool && topicStageSummary?.approvedVersion && !isBusy
  );
  const canPromoteCandidate = Boolean(
    isScriptPool && scriptStageSummary?.approvedVersion && !isBusy
  );

  return (
    <aside className="panel inspector-panel">
      <div className="panel-header">
        <h2>{selectedStage ? `${stageLabels[selectedStage]} Inspector` : 'Stage Inspector'}</h2>
      </div>
      <div className="inspector-content">
        {!workflow || !selectedStageInfo || !selectedStage ? (
          <div className="empty-state">stage를 선택하면 상세 내용이 여기에 표시됩니다.</div>
        ) : (
          <>
            <section className="inspector-section">
              <div className="inline-actions">
                <span className={`status-badge status-${selectedStageInfo.reviewStatus}`}>
                  {selectedStageInfo.reviewStatus}
                </span>
                <span className="code-pill">
                  current v{String(selectedStageInfo.currentVersion).padStart(3, '0')}
                </span>
                <span className="code-pill">
                  approved{' '}
                  {selectedStageInfo.approvedVersion
                    ? `v${String(selectedStageInfo.approvedVersion).padStart(3, '0')}`
                    : 'none'}
                </span>
              </div>
              <p className="panel-note">
                {selectedStageInfo.isBlocked
                  ? `Blocked by ${selectedStageInfo.blockedBy.join(', ')}`
                  : '이 stage는 생성과 검수가 가능합니다.'}
              </p>
              {artifactError ? <p className="panel-note">{artifactError}</p> : null}
            </section>

            <section className="inspector-section">
              <div className="section-header">
                <h3>Actions</h3>
              </div>
              <GenerationPayloadForm
                stage={selectedStage}
                payloadText={payloadText}
                onChange={onPayloadChange}
              />
              {selectedStage === 'topic' ? (
                <label className="inspector-form-field">
                  <span>Manual Approved Topic Override</span>
                  <input
                    value={topicApprovalText}
                    placeholder="optional topic override"
                    onChange={(event) => {
                      onTopicApprovalTextChange(event.target.value);
                    }}
                  />
                </label>
              ) : null}
              <div className="inspector-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!selectedStageInfo.canGenerate || isBusy}
                  onClick={onGenerateStage}
                >
                  Generate
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedStageInfo.canApprove || isBusy}
                  onClick={onApproveStage}
                >
                  Approve
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={!selectedStageInfo.canRequestChanges || isBusy}
                  onClick={onRequestChanges}
                >
                  Request Changes
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={isBusy}
                  onClick={onRefreshArtifacts}
                >
                  Refresh Artifacts
                </button>
              </div>
            </section>

            {selectedStage === 'topic' && isTopicCandidatesArtifact(currentArtifact) ? (
              <TopicCandidateReview
                artifact={currentArtifact}
                approvalText={topicApprovalText}
                isBusy={isBusy}
                onTopicApprovalTextChange={onTopicApprovalTextChange}
              />
            ) : null}

            {selectedStage === 'script' && isScriptArtifact(currentArtifact) ? (
              <ScriptReviewPanel artifact={currentArtifact} />
            ) : null}

            {selectedStage === 'script' && isScriptPoolArtifact(currentArtifact) ? (
              <ScriptReviewPanel artifact={currentArtifact.currentDraft} />
            ) : null}

            {isPool ? (
              <section className="inspector-section">
                <div className="section-header">
                  <h3>Pool Actions</h3>
                </div>
                <p className="panel-note">
                  {isTopicPool
                    ? '승인된 topic으로 script pool을 만들고, 그 안에서 가장 좋은 draft를 고른 뒤 다듬습니다.'
                    : '승인된 script pool draft만 production episode로 승격합니다.'}
                </p>
                {isTopicPool ? (
                  <div className="candidate-action-grid">
                    <label className="inspector-form-field">
                      <span>Scripts per pool</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={scriptBatchCount}
                        onChange={(event) => {
                          onScriptBatchCountChange(Number(event.target.value || 1));
                        }}
                      />
                    </label>
                    <label className="inspector-form-field">
                      <span>Script category override</span>
                      <select
                        value={scriptBatchCategory}
                        onChange={(event) => {
                          onScriptBatchCategoryChange(event.target.value);
                        }}
                      >
                        {categoryOptions.map((option) => (
                          <option key={option.value || 'auto'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={scriptBatchUsePipeline}
                        onChange={(event) => {
                          onScriptBatchUsePipelineChange(event.target.checked);
                        }}
                      />
                      <span>Use multi-step script pipeline</span>
                    </label>
                  </div>
                ) : null}
                <div className="inspector-actions">
                  {isTopicPool ? (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={!canSpawnScriptCandidates}
                      onClick={onSpawnScriptCandidates}
                    >
                      Create Script Pool
                    </button>
                  ) : null}
                  {isScriptPool ? (
                    <button
                      className="primary-button"
                      type="button"
                      disabled={!canPromoteCandidate}
                      onClick={onPromoteCandidate}
                    >
                      Promote To Episode
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {selectedStage === 'script' ? (
              <>
                <section className="inspector-section">
                  <div className="section-header">
                    <h3>Draft Sync</h3>
                  </div>
                  <div className="draft-sync-grid">
                    <div className={`draft-sync-card ${isScriptDraftDirty ? 'draft-sync-dirty' : ''}`}>
                      <strong>{isScriptDraftDirty ? 'Unsaved local edits' : 'Draft saved'}</strong>
                      <span>
                        {isScriptDraftDirty
                          ? '카드 편집기 변경사항이 아직 서버에 저장되지 않았습니다.'
                          : '현재 보이는 script draft가 서버 current version과 같습니다.'}
                      </span>
                    </div>
                    <div
                      className={`draft-sync-card ${hasScriptDraftRemoteUpdate ? 'draft-sync-warning' : ''}`}
                    >
                      <strong>
                        {hasScriptDraftRemoteUpdate
                          ? 'Server updated while you were editing'
                          : 'No remote updates waiting'}
                      </strong>
                      <span>
                        {hasScriptDraftRemoteUpdate
                          ? '자동 새로고침은 로컬 draft를 덮어쓰지 않았습니다. 저장하거나 서버 draft를 다시 불러오세요.'
                          : 'live sync가 켜져 있어도 편집 중 draft는 보호됩니다.'}
                      </span>
                    </div>
                  </div>
                  {hasScriptDraftRemoteUpdate ? (
                    <div className="inspector-actions">
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={isBusy}
                        onClick={onReloadScriptDraft}
                      >
                        Reload Server Draft
                      </button>
                    </div>
                  ) : null}
                </section>

                <ScriptDraftEditor
                  parsedScriptDraft={parsedScriptDraft}
                  scriptDraftText={scriptDraftText}
                  scriptEditorMode={scriptEditorMode}
                  scriptImpact={scriptImpact}
                  highlightState={highlightState}
                  draggingSentenceIndex={draggingSentenceIndex}
                  dragOverIndex={dragOverIndex}
                  dragOverPosition={dragOverPosition}
                  isBusy={isBusy}
                  isCurrentVersionApproved={
                    selectedStageInfo.approvedVersion === selectedStageInfo.currentVersion
                  }
                  canRegenerateTts={canRegenerateCurrentVersion(
                    workflow.stages.find((stage) => stage.stage === 'tts') ?? null
                  )}
                  canRegenerateImage={canRegenerateCurrentVersion(
                    workflow.stages.find((stage) => stage.stage === 'image') ?? null
                  )}
                  onScriptEditorModeChange={onScriptEditorModeChange}
                  onRawScriptDraftChange={onRawScriptDraftChange}
                  onScriptFieldChange={onScriptFieldChange}
                  onSentenceAction={onSentenceAction}
                  onSentenceDragStart={onSentenceDragStart}
                  onSentenceDragEnd={onSentenceDragEnd}
                  onSentenceDragOver={onSentenceDragOver}
                  onSentenceDragLeave={onSentenceDragLeave}
                  onSentenceDrop={onSentenceDrop}
                  onHighlightChange={onHighlightChange}
                  onSaveScriptDraft={onSaveScriptDraft}
                  onRegenerateImpactedTts={onRegenerateImpactedTts}
                  onRegenerateImpactedScenes={onRegenerateImpactedScenes}
                />
              </>
            ) : null}

            {selectedStage === 'image' &&
            isImageManifest(currentArtifact) &&
            currentArtifact.mode === 'scene' &&
            currentArtifact.sceneImagePaths.length > 0 ? (
              <section className="inspector-section">
                <div className="section-header">
                  <h3>Scene Regeneration</h3>
                </div>
                <div className="targeted-grid">
                  {currentArtifact.sceneImagePaths.map((_, index) => (
                    <button
                      key={`scene-regenerate-${index + 1}`}
                      type="button"
                      className="ghost-button fragment-button"
                      disabled={isBusy || !canRegenerateCurrentVersion(selectedStageInfo)}
                      onClick={() => {
                        onRegenerateScene(index + 1);
                      }}
                    >
                      Regenerate scene {index + 1}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedStage === 'tts' && isTtsManifest(currentArtifact) ? (
              <section className="inspector-section">
                <div className="section-header">
                  <h3>Sentence Regeneration</h3>
                </div>
                <div className="targeted-grid">
                  {[...new Set(currentArtifact.audioFiles.map((audioFile) => audioFile.sentenceId))]
                    .sort((left, right) => left - right)
                    .map((sentenceId) => (
                      <button
                        key={`tts-regenerate-${sentenceId}`}
                        type="button"
                        className="ghost-button fragment-button"
                        disabled={isBusy || !canRegenerateCurrentVersion(selectedStageInfo)}
                        onClick={() => {
                          onRegenerateSentence(sentenceId);
                        }}
                      >
                        Regenerate sentence {sentenceId}
                      </button>
                    ))}
                </div>
              </section>
            ) : null}

            <section className="inspector-section">
              <div className="section-header">
                <h3>Current Review Payload</h3>
              </div>
              <ArtifactBlock
                label="Current Artifact"
                stage={selectedStage}
                artifact={currentArtifact}
              />
            </section>

            <section className="inspector-section">
              <div className="section-header">
                <h3>Approved Payload</h3>
              </div>
              <ArtifactBlock
                label="Approved Artifact"
                stage={selectedStage}
                artifact={approvedArtifact}
              />
            </section>

            <section className="inspector-section">
              <div className="section-header">
                <h3>Version History</h3>
              </div>
              {stageVersions.length === 0 ? (
                <div className="empty-state">아직 저장된 version이 없습니다.</div>
              ) : (
                <>
                  <div className="job-list">
                    {stageVersions.map((version) => {
                      const isSelected = selectedVersionNumber === version.version;
                      return (
                        <button
                          key={version.id}
                          type="button"
                          className={`job-item ${isSelected ? 'stage-card selected' : ''}`.trim()}
                          onClick={() => {
                            onSelectStageVersion(version.version);
                          }}
                        >
                          <span className={`status-badge status-${version.reviewStatus}`}>
                            {version.reviewStatus}
                          </span>
                          <div className="job-item-meta">
                            <strong>v{String(version.version).padStart(3, '0')}</strong>
                            <span className="job-item-code">
                              {formatDate(version.updatedAt)}
                            </span>
                            {version.notes ? (
                              <span className="panel-note">{version.notes}</span>
                            ) : null}
                            {version.sourceVersionIds.length > 0 ? (
                              <span className="panel-note">
                                source {version.sourceVersionIds.join(', ')}
                              </span>
                            ) : null}
                          </div>
                          <span className="job-item-code">
                            {selectedStageInfo.currentVersion === version.version
                              ? 'current'
                              : selectedStageInfo.approvedVersion === version.version
                                ? 'approved'
                                : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedVersionArtifactError ? (
                    <p className="panel-note">{selectedVersionArtifactError}</p>
                  ) : null}
                  <ArtifactBlock
                    label={
                      selectedVersionNumber
                        ? `Selected Version v${String(selectedVersionNumber).padStart(3, '0')}`
                        : 'Selected Version'
                    }
                    stage={selectedStage}
                    artifact={selectedVersionArtifact}
                  />
                </>
              )}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
