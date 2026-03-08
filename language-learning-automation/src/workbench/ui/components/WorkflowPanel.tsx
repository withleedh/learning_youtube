import { formatDate, stageLabels } from '../helpers';
import type { EpisodeStage, EpisodeWorkflow } from '../types';

export function WorkflowPanel(props: {
  workflow: EpisodeWorkflow | null;
  selectedStage: EpisodeStage | null;
  onSelectStage(stage: EpisodeStage): void;
}) {
  const { workflow, selectedStage, onSelectStage } = props;

  return (
    <section className="panel workflow-panel">
      <div className="panel-header panel-header-spread">
        <div>
          <h2>{workflow?.episode.title || workflow?.episode.id || 'Workflow'}</h2>
          <p className="panel-note">
            {workflow
              ? `${workflow.episode.kind === 'candidate' ? 'candidate' : 'episode'} · ${workflow.episode.channelId} · current stage ${workflow.episode.currentStage} · created ${formatDate(workflow.episode.createdAt)}`
              : 'candidate 또는 episode를 선택하세요.'}
          </p>
        </div>
        <div className={`status-chip status-${workflow?.episode.workflowStatus ?? 'draft'}`}>
          {workflow?.episode.workflowStatus ?? 'draft'}
        </div>
      </div>

      <div className="stage-grid">
        {!workflow ? (
          <div className="empty-state">선택된 episode가 없습니다.</div>
        ) : (
          workflow.stages.map((stage) => (
            <button
              key={stage.stage}
              type="button"
              className={`stage-card ${selectedStage === stage.stage ? 'selected' : ''} ${stage.isBlocked ? 'blocked' : ''}`}
              onClick={() => {
                onSelectStage(stage.stage);
              }}
            >
              <div className="stage-card-head">
                <div>
                  <h3>{stageLabels[stage.stage]}</h3>
                  <p className="panel-note">
                    {stage.isBlocked
                      ? `Blocked by ${stage.blockedBy.join(', ')}`
                      : 'Ready for inspection'}
                  </p>
                </div>
                <span className={`status-badge status-${stage.reviewStatus}`}>
                  {stage.reviewStatus}
                </span>
              </div>

              <div className="stage-stat-grid">
                <div className="stage-stat">
                  <span className="stage-stat-label">Current</span>
                  <span className="stage-stat-value">
                    v{String(stage.currentVersion).padStart(3, '0')}
                  </span>
                </div>
                <div className="stage-stat">
                  <span className="stage-stat-label">Approved</span>
                  <span className="stage-stat-value">
                    {stage.approvedVersion
                      ? `v${String(stage.approvedVersion).padStart(3, '0')}`
                      : 'none'}
                  </span>
                </div>
                <div className="stage-stat">
                  <span className="stage-stat-label">Jobs</span>
                  <span className="stage-stat-value">
                    Q {stage.queuedJobCount} · R {stage.runningJobCount}
                  </span>
                </div>
                <div className="stage-stat">
                  <span className="stage-stat-label">Latest</span>
                  <span className="stage-stat-value">{stage.latestJob?.status ?? 'none'}</span>
                </div>
              </div>

              <div className="stage-card-footer">
                <span className="stage-pill">{stage.canGenerate ? 'generate' : 'blocked'}</span>
                <span className="stage-pill">{stage.canApprove ? 'approve' : 'review first'}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <section className="job-section">
        <div className="section-header">
          <h3>Recent Jobs</h3>
        </div>
        <div className="job-list">
          {!workflow || workflow.jobs.length === 0 ? (
            <div className="empty-state">아직 job이 없습니다.</div>
          ) : (
            workflow.jobs.slice(0, 12).map((job) => (
              <div key={job.id} className="job-item">
                <span className={`status-badge status-${job.status}`}>{job.status}</span>
                <div className="job-item-meta">
                  <strong>{stageLabels[job.stage]}</strong>
                  <span className="job-item-code">
                    {job.id} · v{String(job.version).padStart(3, '0')}
                  </span>
                  {job.error ? <span className="panel-note">{job.error}</span> : null}
                </div>
                <span className="job-item-code">{formatDate(job.updatedAt)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
