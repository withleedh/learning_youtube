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
import type { AudioFile } from '../tts/types';
import type { ScenePrompt } from '../script/types';

// Ken Burns 효과 타입
type KenBurnsDirection = 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight';

export interface Step4Props {
  backgroundImage?: string;
  /** 🆕 Multi-scene images for character consistency */
  sceneImages?: string[];
  /** 🆕 Scene prompts with sentence ranges */
  scenePrompts?: ScenePrompt[];
  audioFiles: AudioFile[];
  title?: string;
  /** Step indicator label */
  stepLabel?: string;
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

export const Step4: React.FC<Step4Props> = ({
  backgroundImage,
  sceneImages,
  scenePrompts,
  audioFiles,
  title,
  stepLabel = '기적의 순간 (다시 자막 없이 듣기)',
}) => {
  // Filter to only 1.0x speed audio files for Step 4
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');

  // Calculate cumulative start times for each audio with scene image
  const GAP_FRAMES = 60; // 2 second gap between sentences
  let cumulativeFrame = 0;
  const audioSequences = normalSpeedAudios.map((audio, index) => {
    const startFrame = cumulativeFrame;
    const audioDurationFrames = Math.ceil(audio.duration * 30); // 30fps
    const isLastSentence = index === normalSpeedAudios.length - 1;
    // Include gap in sequence duration so image stays visible during gap
    const durationFrames = isLastSentence ? audioDurationFrames : audioDurationFrames + GAP_FRAMES;
    // Get scene image for this sentence
    const sceneImage = getSceneImageForSentence(audio.sentenceId, sceneImages, scenePrompts);
    // Ken Burns 방향: 문장마다 번갈아가며 적용 (Step1과 다른 순서로 시작)
    const kenBurnsDirection: KenBurnsDirection =
      index % 4 === 0
        ? 'zoomOut'
        : index % 4 === 1
          ? 'panLeft'
          : index % 4 === 2
            ? 'zoomIn'
            : 'panRight';
    cumulativeFrame += audioDurationFrames + GAP_FRAMES; // Move to next sentence start
    return {
      audio,
      startFrame,
      durationFrames,
      audioDurationFrames,
      sceneImage,
      kenBurnsDirection,
    };
  });

  // Use sceneImages if available, otherwise fall back to backgroundImage
  const hasSceneImages = sceneImages && sceneImages.length > 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background Image - only show if no scene images (fallback) */}
      {!hasSceneImages && backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
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
        Step 4: {stepLabel}
      </div>

      {/* Audio Sequences with Scene Images */}
      {audioSequences.map(
        (
          { audio, startFrame, durationFrames, audioDurationFrames, sceneImage, kenBurnsDirection },
          idx
        ) => (
          <Sequence key={idx} from={startFrame} durationInFrames={durationFrames}>
            <SentenceDisplay
              audio={audio}
              sceneImage={sceneImage}
              title={title}
              durationFrames={durationFrames}
              audioDurationFrames={audioDurationFrames}
              kenBurnsDirection={kenBurnsDirection}
            />
          </Sequence>
        )
      )}
    </AbsoluteFill>
  );
};

// Individual sentence display component for Step4
const SentenceDisplay: React.FC<{
  audio: AudioFile;
  sceneImage?: string;
  title?: string;
  durationFrames: number;
  audioDurationFrames: number;
  kenBurnsDirection: KenBurnsDirection;
}> = ({
  audio,
  sceneImage,
  title,
  durationFrames: _durationFrames,
  audioDurationFrames,
  kenBurnsDirection,
}) => {
  const frame = useCurrentFrame();

  // Ken Burns 효과 계산 (Step4: 1.0 → 1.05, 은은하게) - 오디오 길이 동안만 애니메이션
  const getKenBurnsTransform = () => {
    // Use audio duration for animation, clamp at end for gap period
    const progress = Math.min(frame / audioDurationFrames, 1);

    switch (kenBurnsDirection) {
      case 'zoomIn':
        // 1.0 → 1.05 확대 (Step1보다 약하게)
        const scaleIn = interpolate(progress, [0, 1], [1, 1.05], { extrapolateRight: 'clamp' });
        return `scale(${scaleIn})`;
      case 'zoomOut':
        // 1.05 → 1.0 축소
        const scaleOut = interpolate(progress, [0, 1], [1.05, 1], { extrapolateRight: 'clamp' });
        return `scale(${scaleOut})`;
      case 'panLeft':
        // 오른쪽에서 왼쪽으로 패닝 + 약간 확대
        const panLeftX = interpolate(progress, [0, 1], [2, -2], { extrapolateRight: 'clamp' });
        return `scale(1.03) translateX(${panLeftX}%)`;
      case 'panRight':
        // 왼쪽에서 오른쪽으로 패닝 + 약간 확대
        const panRightX = interpolate(progress, [0, 1], [-2, 2], { extrapolateRight: 'clamp' });
        return `scale(1.03) translateX(${panRightX}%)`;
      default:
        return 'scale(1)';
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Scene-specific background image with Ken Burns effect */}
      {sceneImage && (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={staticFile(sceneImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: getKenBurnsTransform(),
              transformOrigin: 'center center',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Audio */}
      {audio.path && <Audio src={staticFile(audio.path)} volume={1} />}

      {/* Title Overlay */}
      {title && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 72,
            fontWeight: 600,
            color: '#FFFFFF',
            textShadow:
              '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 10px rgba(0,0,0,0.8)',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {title}
        </div>
      )}
    </AbsoluteFill>
  );
};

// Calculate total duration for Step 4
export function calculateStep4Duration(audioFiles: AudioFile[]): number {
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');
  const totalDuration = normalSpeedAudios.reduce((sum, af) => sum + af.duration, 0);
  const gaps = (normalSpeedAudios.length - 1) * 2; // 2 second gaps
  return Math.ceil((totalDuration + gaps) * 30); // Convert to frames at 30fps
}
