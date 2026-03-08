import type { DragEvent } from 'react';
import { ArtifactBlock } from './ArtifactBlock';
import { GenerationPayloadForm } from './GenerationPayloadForm';
import { ScriptDraftEditor } from './ScriptDraftEditor';
import {
  canRegenerateCurrentVersion,
  formatDate,
  isImageManifest,
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
  const isCandidate = workflow?.episode.kind === 'candidate';
  const topicStageSummary = workflow?.stages.find((stage) => stage.stage === 'topic') ?? null;
  const scriptStageSummary = workflow?.stages.find((stage) => stage.stage === 'script') ?? null;
  const canSpawnScriptCandidates = Boolean(
    isCandidate && topicStageSummary?.approvedVersion && !isBusy
  );
  const canPromoteCandidate = Boolean(
    isCandidate && scriptStageSummary?.approvedVersion && !isBusy
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

            {isCandidate ? (
              <section className="inspector-section">
                <div className="section-header">
                  <h3>Candidate Actions</h3>
                </div>
                <p className="panel-note">
                  topic pool에서 좋은 topic을 고른 뒤 script 후보를 여러 개 뽑고, 승인된 script만
                  production episode로 승격합니다.
                </p>
                <div className="candidate-action-grid">
                  <label className="inspector-form-field">
                    <span>Script candidate count</span>
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
                <div className="inspector-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!canSpawnScriptCandidates}
                    onClick={onSpawnScriptCandidates}
                  >
                    Spawn Script Candidates
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!canPromoteCandidate}
                    onClick={onPromoteCandidate}
                  >
                    Promote To Episode
                  </button>
                </div>
              </section>
            ) : null}

            {selectedStage === 'script' ? (
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
