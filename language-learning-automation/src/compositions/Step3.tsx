import React from 'react';
import { AbsoluteFill, Audio, Sequence, Img, staticFile } from 'remotion';
import type { Sentence, ScenePrompt } from '../script/types';
import type { AudioFile, SpeedVariant } from '../tts/types';
import {
  getSceneInfoForSentence,
  AnimatedSceneBackground,
  getCameraMotion,
  type PreviousCameraState,
} from '../components/CameraMotion';

export interface Step3Props {
  backgroundImage?: string;
  sceneImages?: string[];
  scenePrompts?: ScenePrompt[];
  sentences: Sentence[];
  audioFiles: AudioFile[];
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
    wordMeaning: string;
    background: string;
  };
  repeatCount: number;
  imageRatio?: number;
  uiLabels?: {
    step3PhaseTitle?: string;
    phaseIntro?: string;
    phaseTraining?: string;
    phaseChallenge?: string;
    phaseReview?: string;
  };
}

type Phase = 'intro' | 'training' | 'challenge' | 'review';

interface RepetitionConfig {
  speed: SpeedVariant;
  phase: Phase;
  showBlank: boolean;
  showAnswer: boolean;
}

const REPETITION_SEQUENCE: RepetitionConfig[] = [
  { speed: '0.8x', phase: 'intro', showBlank: false, showAnswer: false },
  { speed: '1.0x', phase: 'training', showBlank: true, showAnswer: false },
  { speed: '1.0x', phase: 'training', showBlank: true, showAnswer: false },
  { speed: '1.0x', phase: 'training', showBlank: true, showAnswer: false },
  { speed: '1.2x', phase: 'challenge', showBlank: false, showAnswer: true },
];

export const Step3: React.FC<Step3Props> = ({
  backgroundImage,
  sceneImages,
  scenePrompts,
  sentences,
  audioFiles,
  colors,
  uiLabels,
}) => {
  const labels = {
    step3Title: uiLabels?.step3PhaseTitle ?? 'STEP 3 · 반복 훈련',
    phaseIntro: uiLabels?.phaseIntro ?? '🎧 천천히 듣기',
    phaseTraining: uiLabels?.phaseTraining ?? '🧩 빈칸 퀴즈',
    phaseChallenge: uiLabels?.phaseChallenge ?? '⚡ 빠르게 듣기',
    phaseReview: uiLabels?.phaseReview ?? '✨ 마무리',
  };

  const hasSceneImages = sceneImages && sceneImages.length > 0;

  let cumulativeFrame = 0;
  let previousSceneIndex = -1;
  let previousSceneImage: string | undefined;
  let previousCameraState: PreviousCameraState | undefined;

  const allSequences: Array<{
    sentence: Sentence;
    config: RepetitionConfig;
    audio?: AudioFile;
    startFrame: number;
    durationFrames: number;
    audioDurationFrames: number;
    repetition: number;
    sceneImage?: string;
    cameraDirection?: string;
    isSceneChange: boolean;
    previousSceneImage?: string;
    isLastScene: boolean;
    previousCameraState?: PreviousCameraState;
  }> = [];

  sentences.forEach((sentence, sentenceIndex) => {
    const sceneInfo = getSceneInfoForSentence(sentence.id, sceneImages, scenePrompts);

    REPETITION_SEQUENCE.forEach((config, repIndex) => {
      const audio = audioFiles.find(
        (af) => af.sentenceId === sentence.id && af.speed === config.speed
      );
      const startFrame = cumulativeFrame;
      const baseDuration = audio ? audio.duration : 3;
      const durationFrames = Math.ceil((baseDuration + 3) * 30);
      const audioDurationFrames = Math.ceil(baseDuration * 30);

      // 씬 전환 체크 (첫 반복에서만)
      const isSceneChange = repIndex === 0 && sceneInfo.sceneIndex !== previousSceneIndex;
      const prevImage = isSceneChange ? previousSceneImage : undefined;
      const prevCameraState = isSceneChange ? undefined : previousCameraState;

      // 현재 카메라 끝 상태 계산
      const motion = getCameraMotion(sceneInfo.cameraDirection);
      const currentEndState: PreviousCameraState = {
        scale: motion.scaleEnd,
        panX: motion.panXEnd,
        panY: motion.panYEnd,
        rotate: motion.rotateEnd,
      };
      previousCameraState = currentEndState;

      const isLastScene =
        sentenceIndex === sentences.length - 1 && repIndex === REPETITION_SEQUENCE.length - 1;

      cumulativeFrame += durationFrames;

      allSequences.push({
        sentence,
        config,
        audio,
        startFrame,
        durationFrames,
        audioDurationFrames,
        repetition: repIndex + 1,
        sceneImage: sceneInfo.image,
        cameraDirection: sceneInfo.cameraDirection,
        isSceneChange,
        previousSceneImage: prevImage,
        isLastScene,
        previousCameraState: prevCameraState,
      });
    });

    previousSceneIndex = sceneInfo.sceneIndex;
    previousSceneImage = sceneInfo.image;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {!hasSceneImages && backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
            }}
          />
        </AbsoluteFill>
      )}

      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '16px 32px',
          borderRadius: 12,
          fontSize: 48,
          color: '#FFFFFF',
          fontWeight: 600,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          zIndex: 10,
        }}
      >
        Step 3: {labels.step3Title}
      </div>

      {allSequences.map((seq, index) => (
        <Sequence key={index} from={seq.startFrame} durationInFrames={seq.durationFrames}>
          <SentenceDisplay
            sentence={seq.sentence}
            config={seq.config}
            audio={seq.audio}
            colors={colors}
            repetition={seq.repetition}
            totalRepetitions={REPETITION_SEQUENCE.length}
            labels={labels}
            sceneImage={seq.sceneImage}
            previousSceneImage={seq.previousSceneImage}
            cameraDirection={seq.cameraDirection}
            durationFrames={seq.durationFrames}
            audioDurationFrames={seq.audioDurationFrames}
            isSceneChange={seq.isSceneChange}
            isLastScene={seq.isLastScene}
            previousCameraState={seq.previousCameraState}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SentenceDisplay: React.FC<{
  sentence: Sentence;
  config: RepetitionConfig;
  audio?: AudioFile;
  colors: { maleText: string; femaleText: string; nativeText: string; wordMeaning: string };
  repetition: number;
  totalRepetitions: number;
  labels: {
    phaseIntro: string;
    phaseTraining: string;
    phaseChallenge: string;
    phaseReview: string;
  };
  sceneImage?: string;
  previousSceneImage?: string;
  cameraDirection?: string;
  durationFrames: number;
  audioDurationFrames: number;
  isSceneChange?: boolean;
  isLastScene?: boolean;
  previousCameraState?: PreviousCameraState;
}> = ({
  sentence,
  config,
  audio,
  colors,
  repetition,
  totalRepetitions,
  labels,
  sceneImage,
  previousSceneImage,
  cameraDirection,
  durationFrames,
  audioDurationFrames,
  isSceneChange = false,
  isLastScene = false,
  previousCameraState,
}) => {
  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;
  const { phase, showBlank, showAnswer } = config;

  const renderTargetText = () => {
    if (showBlank) return sentence.targetBlank;
    if (showAnswer) {
      const parts = sentence.target.split(new RegExp(`(${sentence.blankAnswer})`, 'i'));
      return parts.map((part, i) =>
        part.toLowerCase() === sentence.blankAnswer.toLowerCase() ? (
          <span key={i} style={{ color: '#FFD700', fontWeight: 800 }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      );
    }
    return sentence.target;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <AnimatedSceneBackground
        sceneImage={sceneImage}
        previousSceneImage={previousSceneImage}
        cameraDirection={cameraDirection}
        durationFrames={durationFrames}
        audioDurationFrames={audioDurationFrames}
        isSceneChange={isSceneChange}
        isLastScene={isLastScene}
        dimOpacity={0.65}
        objectPosition="top"
        previousCameraState={previousCameraState}
      />

      {audio && audio.path ? (
        <Audio src={staticFile(audio.path)} volume={1} />
      ) : (
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'red', fontSize: 12 }}>
          Missing audio: sentence {sentence.id}, speed {config.speed}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 60px 180px 60px',
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.25,
            marginBottom: 48,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            maxWidth: '92%',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
          }}
        >
          {renderTargetText()}
        </div>

        <div
          style={{
            fontSize: 50,
            fontWeight: 500,
            color: colors.nativeText,
            textAlign: 'center',
            marginBottom: 48,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            opacity: 0.95,
            wordBreak: 'keep-all',
          }}
        >
          {sentence.native}
        </div>

        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: 20,
            padding: '24px 48px',
            maxWidth: '90%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px 40px',
              fontSize: 35,
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              lineHeight: 1.6,
            }}
          >
            {sentence.words.map((w, i) => (
              <span key={i} style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{w.word}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}> ({w.meaning})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <div
          style={{
            backgroundColor: getPhaseColor(phase),
            padding: '10px 24px',
            borderRadius: 30,
            fontSize: 22,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {getPhaseLabel(phase, labels)}
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {config.speed}
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {repetition} / {totalRepetitions}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function getPhaseLabel(
  phase: Phase,
  labels: { phaseIntro: string; phaseTraining: string; phaseChallenge: string; phaseReview: string }
): string {
  switch (phase) {
    case 'intro':
      return labels.phaseIntro;
    case 'training':
      return labels.phaseTraining;
    case 'challenge':
      return labels.phaseChallenge;
    case 'review':
      return labels.phaseReview;
  }
}

function getPhaseColor(phase: Phase): string {
  switch (phase) {
    case 'intro':
      return '#4CAF50';
    case 'training':
      return '#2196F3';
    case 'challenge':
      return '#FF5722';
    case 'review':
      return '#9C27B0';
  }
}

export function calculateStep3Duration(
  sentences: Sentence[],
  audioFiles: AudioFile[],
  _repeatCount: number
): number {
  if (!sentences || !audioFiles) return 0;
  let totalFrames = 0;

  sentences.forEach((sentence) => {
    REPETITION_SEQUENCE.forEach((config) => {
      const audio = audioFiles.find(
        (af) => af.sentenceId === sentence.id && af.speed === config.speed
      );
      const baseDuration = audio ? audio.duration : 3;
      totalFrames += Math.ceil((baseDuration + 3) * 30);
    });
  });

  return totalFrames;
}
