import { ScriptDraftEditor } from '../ScriptDraftEditor';
import { canRegenerateCurrentVersion } from '../../helpers';
import { useWorkbenchApp } from '../../useWorkbenchApp';

type WorkbenchAppState = ReturnType<typeof useWorkbenchApp>;

export function ScriptCanvas(props: {
  app: WorkbenchAppState;
}) {
  const { app } = props;
  const scriptPool = app.currentScriptPoolArtifact;

  if (app.selectedStage !== 'script') {
    return <div className="empty-state">Select a script review task.</div>;
  }

  return (
    <section className="canvas-shell">
      <div className="canvas-header">
        <div>
          <p className="studio-kicker">Script Lab</p>
          <h2>{app.workflow?.episode.title || app.workflow?.episode.id || 'Script candidate'}</h2>
          <p className="queue-meta">
            Move fast in cards, keep JSON hidden in the developer drawer, and only regenerate impacted assets.
          </p>
        </div>
      </div>

      {scriptPool ? (
        <section className="studio-subpanel">
          <div className="subpanel-header">
            <h3>Script Pool</h3>
            <p className="queue-meta">
              {scriptPool.candidates.length} candidates · recommended #{scriptPool.recommendedCandidateIndex + 1}
            </p>
          </div>
          <div className="compare-grid">
            {scriptPool.candidates.map((candidate, index) => {
              const isRecommended = index === scriptPool.recommendedCandidateIndex;
              const isSelected = index === scriptPool.selectedCandidateIndex;
              return (
                <article key={`${candidate.metadata.title.target}-${index}`} className="compare-card">
                  <div className="queue-card-head">
                    <span
                      className={`status-badge ${
                        isRecommended ? 'status-pending_review' : 'status-draft'
                      }`}
                    >
                      {isRecommended ? 'recommended' : `candidate ${index + 1}`}
                    </span>
                    {isSelected ? <span className="queue-pill">current draft</span> : null}
                  </div>
                  <strong>{candidate.metadata.title.native || candidate.metadata.title.target}</strong>
                  <p className="queue-body-copy">{candidate.metadata.topic}</p>
                  <p className="queue-meta">
                    {candidate.sentences.length} lines · {candidate.metadata.characters.length} characters
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      app.handleLoadScriptPoolCandidate(index);
                    }}
                    disabled={app.isBusy}
                  >
                    Load Into Editor
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <ScriptDraftEditor
        parsedScriptDraft={app.parsedScriptDraft}
        scriptDraftText={app.scriptDraftText}
        scriptEditorMode={app.scriptEditorMode}
        scriptImpact={app.scriptImpact}
        highlightState={app.highlightState}
        draggingSentenceIndex={app.draggingSentenceIndex}
        dragOverIndex={app.dragOverIndex}
        dragOverPosition={app.dragOverPosition}
        isBusy={app.isBusy}
        isCurrentVersionApproved={
          app.selectedStageInfo?.approvedVersion === app.selectedStageInfo?.currentVersion
        }
        canRegenerateTts={canRegenerateCurrentVersion(
          app.workflow?.stages.find((stage) => stage.stage === 'tts') ?? null
        )}
        canRegenerateImage={canRegenerateCurrentVersion(
          app.workflow?.stages.find((stage) => stage.stage === 'image') ?? null
        )}
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
        onSaveScriptDraft={() => {
          void app.handleSaveScriptDraft();
        }}
        onRegenerateImpactedTts={app.handleRegenerateImpactedTts}
        onRegenerateImpactedScenes={app.handleRegenerateImpactedScenes}
      />
    </section>
  );
}
