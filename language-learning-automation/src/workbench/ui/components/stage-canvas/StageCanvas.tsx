import type { ReactNode } from 'react';
import { TopicCanvas } from './TopicCanvas';
import { ScriptCanvas } from './ScriptCanvas';
import { ImageCanvas } from './ImageCanvas';
import { TtsCanvas } from './TtsCanvas';
import { RenderCanvas } from './RenderCanvas';
import { ShortsCanvas } from './ShortsCanvas';
import { PackageCanvas } from './PackageCanvas';
import { useWorkbenchApp } from '../../useWorkbenchApp';
import type { PackageManifest } from '../../types';

type WorkbenchAppState = ReturnType<typeof useWorkbenchApp>;

export function StageCanvas(props: {
  app: WorkbenchAppState;
  packageDraft: PackageManifest | null;
  topicHeaderActions?: ReactNode;
  onUpdatePackageField<K extends keyof PackageManifest>(key: K, value: PackageManifest[K]): void;
  onSavePackageDraft(): void;
}) {
  const { app, packageDraft, topicHeaderActions, onUpdatePackageField, onSavePackageDraft } = props;

  switch (app.selectedStage) {
    case 'topic':
      return (
        <TopicCanvas
          currentArtifact={app.currentArtifact}
          approvedArtifact={app.approvedArtifact}
          approvalText={app.topicApprovalText}
          headerActions={topicHeaderActions}
          isBusy={app.isBusy}
          onSelectTopic={app.handleSetTopicApprovalText}
        />
      );
    case 'script':
      return <ScriptCanvas app={app} />;
    case 'image':
      return (
        <ImageCanvas
          currentArtifact={app.currentArtifact}
          onRegenerateScene={(sceneIndex) => {
            app.handleRegenerateScene(sceneIndex);
          }}
        />
      );
    case 'tts':
      return (
        <TtsCanvas
          currentArtifact={app.currentArtifact}
          onRegenerateSentence={(sentenceId) => {
            app.handleRegenerateSentence(sentenceId);
          }}
        />
      );
    case 'render':
      return <RenderCanvas currentArtifact={app.currentArtifact} />;
    case 'shorts':
      return <ShortsCanvas currentArtifact={app.currentArtifact} />;
    case 'package':
      return (
        <PackageCanvas
          draft={packageDraft}
          onFieldChange={onUpdatePackageField}
          onSave={onSavePackageDraft}
        />
      );
    default:
      return <div className="empty-state">Choose a review task to start.</div>;
  }
}
