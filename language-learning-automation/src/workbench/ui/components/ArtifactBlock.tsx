import type { EpisodeStage } from '../types';
import {
  isApprovedTopicArtifact,
  isImageManifest,
  isRenderManifest,
  isScriptArtifact,
  isShortsManifest,
  isTopicCandidatesArtifact,
  isTtsManifest,
  toFileProxyUrl,
} from '../helpers';

export function ArtifactBlock(props: {
  label: string;
  stage: EpisodeStage | null;
  artifact: unknown;
}) {
  if (!props.stage || props.artifact === null || props.artifact === undefined) {
    return <div className="empty-state">artifact가 아직 없습니다.</div>;
  }

  return (
    <div>
      <p className="artifact-label">{props.label}</p>
      <ArtifactPreview stage={props.stage} artifact={props.artifact} />
      <details className="artifact-raw-details">
        <summary>Raw JSON</summary>
        <pre className="json-view">{JSON.stringify(props.artifact, null, 2)}</pre>
      </details>
    </div>
  );
}

function ArtifactPreview(props: { stage: EpisodeStage; artifact: unknown }) {
  const { stage, artifact } = props;

  switch (stage) {
    case 'topic':
      if (isTopicCandidatesArtifact(artifact)) {
        return (
          <>
            <div className="review-stat-row">
              <span className="code-pill">{artifact.category}</span>
              <span className="code-pill">{artifact.candidates.length} candidates</span>
              <span className="status-badge status-approved">recommended</span>
            </div>
            <div className="artifact-preview-grid">
              {artifact.candidates.map((candidate) => (
                <article
                  key={candidate}
                  className={`artifact-preview topic-preview-card ${candidate === artifact.recommendedTopic ? 'recommended' : ''}`.trim()}
                >
                  <p className="topic-review-title">{candidate}</p>
                </article>
              ))}
            </div>
          </>
        );
      }

      if (isApprovedTopicArtifact(artifact)) {
        return (
          <div className="artifact-preview">
            <strong>{artifact.approvedTopic}</strong>
            <p className="panel-note">
              {artifact.category} · {artifact.source}
            </p>
          </div>
        );
      }

      return <div className="empty-state">주제 artifact를 읽을 수 없습니다.</div>;
    case 'script':
      if (!isScriptArtifact(artifact)) {
        return <div className="empty-state">스크립트 artifact를 읽을 수 없습니다.</div>;
      }

      return (
        <div className="artifact-preview">
          <strong>{artifact.metadata.title.target}</strong>
          <p className="panel-note">
            {artifact.metadata.title.native} · {artifact.metadata.topic}
          </p>
          <div className="stage-script-list">
            {artifact.sentences.slice(0, 8).map((sentence) => (
              <div key={sentence.id} className="stage-script-line">
                <strong>{sentence.target}</strong>
                <span className="panel-note">{sentence.native}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'image':
      if (!isImageManifest(artifact)) {
        return <div className="empty-state">이미지 manifest를 읽을 수 없습니다.</div>;
      }

      return artifact.backgroundImagePath || artifact.sceneImagePaths.length > 0 ? (
        <div className="artifact-preview-grid">
          {artifact.backgroundImagePath ? (
            <div className="artifact-preview">
              <p className="artifact-label">Background</p>
              <img src={toFileProxyUrl(artifact.backgroundImagePath)} alt="Background preview" />
            </div>
          ) : null}
          {artifact.sceneImagePaths.map((imagePath, index) => (
            <div key={`${imagePath}-${index}`} className="artifact-preview">
              <p className="artifact-label">Scene {index + 1}</p>
              <img src={toFileProxyUrl(imagePath)} alt={`Scene ${index + 1}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">이미지 파일이 없습니다.</div>
      );
    case 'tts':
      if (!isTtsManifest(artifact)) {
        return <div className="empty-state">오디오 manifest를 읽을 수 없습니다.</div>;
      }

      return artifact.audioFiles.length > 0 ? (
        <div className="artifact-audio-grid">
          {artifact.audioFiles.slice(0, 6).map((audioFile) => (
            <div key={`${audioFile.path}-${audioFile.speed}`} className="audio-preview">
              <p className="artifact-label">
                Sentence {audioFile.sentenceId} · {audioFile.speed}
              </p>
              <audio controls preload="metadata" src={toFileProxyUrl(audioFile.path)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">오디오 파일이 없습니다.</div>
      );
    case 'render':
      if (!isRenderManifest(artifact)) {
        return <div className="empty-state">렌더 manifest를 읽을 수 없습니다.</div>;
      }

      return (
        <div className="artifact-preview">
          <p className="artifact-label">Rendered Video</p>
          <video controls preload="metadata" src={toFileProxyUrl(artifact.videoPath)} />
        </div>
      );
    case 'shorts':
      if (!isShortsManifest(artifact)) {
        return <div className="empty-state">쇼츠 manifest를 읽을 수 없습니다.</div>;
      }

      return artifact.outputs.length > 0 ? (
        <div className="shorts-grid">
          {artifact.outputs.slice(0, 6).map((output) => (
            <div key={`${output.outputPath}-${output.sentenceId}`} className="short-video-card">
              <p className="artifact-label">Sentence {output.sentenceId}</p>
              <video controls preload="metadata" src={toFileProxyUrl(output.outputPath)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">쇼츠 결과 파일이 없습니다.</div>
      );
  }
}
