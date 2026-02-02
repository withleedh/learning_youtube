import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
} from 'remotion';
import type { Sentence, ScenePrompt } from '../script/types';
import type { AudioFile, SpeedVariant } from '../tts/types';

// Ken Burns 효과 타입
type KenBurnsDirection = 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight';

export interface Step3Props {
  backgroundImage?: string;
  /** 🆕 Multi-scene images for character consistency */
  sceneImages?: string[];
  /** 🆕 Scene prompts with sentence ranges */
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

/**
 * Get the appropriate scene image for a given sentence ID
 */
function getSceneImageForSentence(
  sentenceId: number,
  sceneImages?: string[],
  scenePrompts?: ScenePrompt[]
): string | undefined {
  if (!sceneImages || sceneImages.length === 0) return undefined;
  if (!scenePrompts || scenePrompts.length === 0) return sceneImages[0];

  // Find which scene this sentence belongs to
  for (let i = 0; i < scenePrompts.length; i++) {
    const [start, end] = scenePrompts[i].sentenceRange;
    if (sentenceId >= start && sentenceId <= end) {
      return sceneImages[i] || sceneImages[0];
    }
  }

  // Default to last scene if sentence is beyond all ranges
  return sceneImages[sceneImages.length - 1];
}

// Phase configuration for 5 repetitions
// ① 도입: 0.8x × 1회 (워밍업) - 전체 자막 + 해석
// ② 훈련: 1.0x × 3회 (퀴즈 & 리듬 체화) - 빈칸 자막
// ③ 챌린지: 1.2x × 1회 (청각 근육 단련) - 정답 강조 자막
type Phase = 'intro' | 'training' | 'challenge' | 'review';

interface RepetitionConfig {
  speed: SpeedVariant;
  phase: Phase;
  showBlank: boolean;
  showAnswer: boolean;
}

const REPETITION_SEQUENCE: RepetitionConfig[] = [
  // ① 도입 (0.8x × 1)
  { speed: '0.8x', phase: 'intro', showBlank: false, showAnswer: false },
  // ② 훈련 (1.0x × 3)
  { speed: '1.0x', phase: 'training', showBlank: true, showAnswer: false },
  { speed: '1.0x', phase: 'training', showBlank: true, showAnswer: false },
  { speed: '1.0x', phase: 'training', showBlank: true, showAnswer: false },
  // ③ 챌린지 (1.2x × 1)
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
  // Default UI labels
  const labels = {
    step3Title: uiLabels?.step3PhaseTitle ?? 'STEP 3 · 반복 훈련',
    phaseIntro: uiLabels?.phaseIntro ?? '🎧 천천히 듣기',
    phaseTraining: uiLabels?.phaseTraining ?? '🧩 빈칸 퀴즈',
    phaseChallenge: uiLabels?.phaseChallenge ?? '⚡ 빠르게 듣기',
    phaseReview: uiLabels?.phaseReview ?? '✨ 마무리',
  };

  // Check if we have scene images
  const hasSceneImages = sceneImages && sceneImages.length > 0;

  // Build sequences for all sentences with all repetitions
  let cumulativeFrame = 0;
  let sequenceIndex = 0;
  const allSequences: Array<{
    sentence: Sentence;
    config: RepetitionConfig;
    audio?: AudioFile;
    startFrame: number;
    durationFrames: number;
    audioDurationFrames: number;
    repetition: number;
    sceneImage?: string;
    kenBurnsDirection: KenBurnsDirection;
  }> = [];

  sentences.forEach((sentence) => {
    // 🆕 Get scene image for this sentence
    const sceneImage = getSceneImageForSentence(sentence.id, sceneImages, scenePrompts);

    REPETITION_SEQUENCE.forEach((config, repIndex) => {
      const audio = audioFiles.find(
        (af) => af.sentenceId === sentence.id && af.speed === config.speed
      );
      const startFrame = cumulativeFrame;
      const baseDuration = audio ? audio.duration : 3;
      // 오디오 길이 + 3초 여유 (읽고 생각할 시간)
      const durationFrames = Math.ceil((baseDuration + 3) * 30);
      const audioDurationFrames = Math.ceil(baseDuration * 30);
      // Ken Burns 방향: 시퀀스마다 번갈아가며 적용
      const kenBurnsDirection: KenBurnsDirection =
        sequenceIndex % 4 === 0
          ? 'zoomOut'
          : sequenceIndex % 4 === 1
            ? 'panLeft'
            : sequenceIndex % 4 === 2
              ? 'zoomIn'
              : 'panRight';
      cumulativeFrame += durationFrames;
      sequenceIndex++;

      allSequences.push({
        sentence,
        config,
        audio,
        startFrame,
        durationFrames,
        audioDurationFrames,
        repetition: repIndex + 1,
        sceneImage,
        kenBurnsDirection,
      });
    });
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Background Image - only show if no scene images */}
      {!hasSceneImages && backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top', // 상단부터 보여주기
            }}
          />
          {/* Dark overlay for text readability */}
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

      {/* Step Indicator */}
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
      {/* Sentence Display Sequences */}
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
            durationFrames={seq.durationFrames}
            audioDurationFrames={seq.audioDurationFrames}
            kenBurnsDirection={seq.kenBurnsDirection}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Individual sentence display
const SentenceDisplay: React.FC<{
  sentence: Sentence;
  config: RepetitionConfig;
  audio?: AudioFile;
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
    wordMeaning: string;
  };
  repetition: number;
  totalRepetitions: number;
  labels: {
    phaseIntro: string;
    phaseTraining: string;
    phaseChallenge: string;
    phaseReview: string;
  };
  sceneImage?: string;
  durationFrames: number;
  audioDurationFrames: number;
  kenBurnsDirection: KenBurnsDirection;
}> = ({
  sentence,
  config,
  audio,
  colors,
  repetition,
  totalRepetitions,
  labels,
  sceneImage,
  durationFrames: _durationFrames,
  audioDurationFrames,
  kenBurnsDirection,
}) => {
  const frame = useCurrentFrame();
  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;
  const { phase, showBlank, showAnswer } = config;

  // Ken Burns 효과 계산 (Step3: 1.0 → 1.04, 은은하게)
  const getKenBurnsTransform = () => {
    const progress = Math.min(frame / audioDurationFrames, 1);

    if (kenBurnsDirection === 'zoomIn') {
      const scaleIn = interpolate(progress, [0, 1], [1, 1.04], { extrapolateRight: 'clamp' });
      return `scale(${scaleIn})`;
    }
    if (kenBurnsDirection === 'zoomOut') {
      const scaleOut = interpolate(progress, [0, 1], [1.04, 1], { extrapolateRight: 'clamp' });
      return `scale(${scaleOut})`;
    }
    if (kenBurnsDirection === 'panLeft') {
      const panLeftX = interpolate(progress, [0, 1], [2, -2], { extrapolateRight: 'clamp' });
      return `scale(1.03) translateX(${panLeftX}%)`;
    }
    if (kenBurnsDirection === 'panRight') {
      const panRightX = interpolate(progress, [0, 1], [-2, 2], { extrapolateRight: 'clamp' });
      return `scale(1.03) translateX(${panRightX}%)`;
    }
    return 'scale(1)';
  };

  // Highlight the answer word in challenge phase
  const renderTargetText = () => {
    if (showBlank) {
      // 빈칸 모드: _______ 표시
      return sentence.targetBlank;
    }
    if (showAnswer) {
      // 정답 강조 모드: 정답 단어를 노란색으로 강조
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
      {/* 🆕 Scene-specific background image */}
      {sceneImage && (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={staticFile(sceneImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              transform: getKenBurnsTransform(),
              transformOrigin: 'center center',
            }}
          />
          {/* Dark overlay for text readability */}
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

      {/* Audio */}
      {audio && audio.path ? (
        <Audio src={staticFile(audio.path)} volume={1} />
      ) : (
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'red', fontSize: 12 }}>
          Missing audio: sentence {sentence.id}, speed {config.speed}
        </div>
      )}

      {/* Main Content - 모바일 가독성 최적화 */}
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
          padding: '60px 60px 180px 60px', // 하단 여백 180px (유튜브 세이프존)
        }}
      >
        {/* 영어 문장 - 모바일에서 시원하게 */}
        <div
          style={{
            fontSize: 80, // 72 → 80px (화면 높이 ~12%)
            fontWeight: 700,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.25,
            marginBottom: 48, // 간격 줄임
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            maxWidth: '92%',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
          }}
        >
          {renderTargetText()}
        </div>

        {/* 한글 해석 - 영어 바로 밑에 */}
        <div
          style={{
            fontSize: 50, // 44 → 50px
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

        {/* 단어 풀이 - 2단 그리드, 큰 글씨, 진한 배경 */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)', // 더 진한 배경
            borderRadius: 20,
            padding: '24px 48px',
            maxWidth: '90%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap', // 자동 줄바꿈 허용
              justifyContent: 'center',
              gap: '16px 40px', // 세로 16px, 가로 40px 간격
              fontSize: 35, // 26 → 35px (대폭 확대)
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

      {/* 하단 컨트롤 바 - 유튜브 세이프존 위 (bottom 50px) */}
      <div
        style={{
          position: 'absolute',
          bottom: 50, // 30 → 50px (유튜브 재생바 위)
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32, // 40 → 32px
        }}
      >
        {/* Phase Badge */}
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

        {/* Speed Indicator */}
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

        {/* Repetition Counter */}
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

// Helper functions
function getPhaseLabel(
  phase: Phase,
  labels: {
    phaseIntro: string;
    phaseTraining: string;
    phaseChallenge: string;
    phaseReview: string;
  }
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
      return '#4CAF50'; // Green
    case 'training':
      return '#2196F3'; // Blue
    case 'challenge':
      return '#FF5722'; // Orange
    case 'review':
      return '#9C27B0'; // Purple
  }
}

// Calculate total duration for Step 3
export function calculateStep3Duration(
  sentences: Sentence[],
  audioFiles: AudioFile[],
  _repeatCount: number // ignored, using fixed 10 repetitions
): number {
  if (!sentences || !audioFiles) {
    return 0;
  }
  let totalFrames = 0;

  sentences.forEach((sentence) => {
    REPETITION_SEQUENCE.forEach((config) => {
      const audio = audioFiles.find(
        (af) => af.sentenceId === sentence.id && af.speed === config.speed
      );
      const baseDuration = audio ? audio.duration : 3;
      // 오디오 길이 + 3초 여유 (읽고 생각할 시간)
      totalFrames += Math.ceil((baseDuration + 3) * 30);
    });
  });

  return totalFrames;
}
