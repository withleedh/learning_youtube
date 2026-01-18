import React from 'react';
import { AbsoluteFill, Audio, Sequence, Img, staticFile } from 'remotion';
import type { AudioFile } from '../tts/types';
import type { ScenePrompt } from '../script/types';

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
  let cumulativeFrame = 0;
  const audioSequences = normalSpeedAudios.map((audio) => {
    const startFrame = cumulativeFrame;
    const durationFrames = Math.ceil(audio.duration * 30); // 30fps
    // Get scene image for this sentence
    const sceneImage = getSceneImageForSentence(audio.sentenceId, sceneImages, scenePrompts);
    cumulativeFrame += durationFrames + 60; // Add 2 second gap between sentences
    return { audio, startFrame, durationFrames, sceneImage };
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
      {audioSequences.map(({ audio, startFrame, durationFrames, sceneImage }, idx) => (
        <Sequence key={idx} from={startFrame} durationInFrames={durationFrames}>
          <SentenceDisplay audio={audio} sceneImage={sceneImage} title={title} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Individual sentence display component for Step4
const SentenceDisplay: React.FC<{
  audio: AudioFile;
  sceneImage?: string;
  title?: string;
}> = ({ audio, sceneImage, title }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Scene-specific background image */}
      {sceneImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(sceneImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
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
