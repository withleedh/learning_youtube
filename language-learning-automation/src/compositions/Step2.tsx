import React from 'react';
import { AbsoluteFill, Audio, Sequence, Img, staticFile } from 'remotion';
import type { Sentence, ScenePrompt } from '../script/types';
import type { AudioFile } from '../tts/types';

export interface Step2Props {
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
  };
  dimOpacity?: number;
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

export const Step2: React.FC<Step2Props> = ({
  backgroundImage,
  sceneImages,
  scenePrompts,
  sentences,
  audioFiles,
  colors,
  dimOpacity = 0.6,
  stepLabel = '자막으로 내용 이해 하기',
}) => {
  // Filter to only 1.0x speed audio files
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');

  // Calculate sequences for each sentence
  let cumulativeFrame = 0;
  const sentenceSequences = sentences.map((sentence) => {
    const audio = normalSpeedAudios.find((af) => af.sentenceId === sentence.id);
    const startFrame = cumulativeFrame;
    const durationFrames = audio ? Math.ceil(audio.duration * 30) + 90 : 150; // Add 3 second buffer
    // 🆕 Get scene image for this sentence
    const sceneImage = getSceneImageForSentence(sentence.id, sceneImages, scenePrompts);
    cumulativeFrame += durationFrames;
    return { sentence, audio, startFrame, durationFrames, sceneImage };
  });

  // Use sceneImages if available, otherwise fall back to backgroundImage
  const hasSceneImages = sceneImages && sceneImages.length > 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background Image - only show if no scene images */}
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
          {/* Dim overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
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
        Step 2: {stepLabel}
      </div>

      {/* Sentence Sequences */}
      {sentenceSequences.map(
        ({ sentence, audio, startFrame, durationFrames, sceneImage }, index) => (
          <Sequence key={index} from={startFrame} durationInFrames={durationFrames}>
            <SentenceDisplay
              sentence={sentence}
              audio={audio}
              colors={colors}
              sceneImage={sceneImage}
              dimOpacity={dimOpacity}
            />
          </Sequence>
        )
      )}
    </AbsoluteFill>
  );
};

// Individual sentence display component
const SentenceDisplay: React.FC<{
  sentence: Sentence;
  audio?: AudioFile;
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
  };
  sceneImage?: string;
  dimOpacity?: number;
}> = ({ sentence, audio, colors, sceneImage, dimOpacity = 0.6 }) => {
  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* 🆕 Scene-specific background image - rendered first (behind text) */}
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
          {/* Dim overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Audio */}
      {audio && audio.path && <Audio src={staticFile(audio.path)} volume={1} />}

      {/* Text Content Layer - rendered after background */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 60px 180px 60px',
        }}
      >
        {/* Target Language Sentence */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.25,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            maxWidth: '92%',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            marginBottom: 24,
          }}
        >
          {sentence.target}
        </div>

        {/* Pronunciation Guide (발음 표기) */}
        {sentence.targetPronunciation && (
          <div
            style={{
              fontSize: 48,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              maxWidth: '92%',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            {sentence.targetPronunciation}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Calculate total duration for Step 2
export function calculateStep2Duration(sentences: Sentence[], audioFiles: AudioFile[]): number {
  if (!sentences || !audioFiles) {
    return 0;
  }
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');
  let totalFrames = 0;

  sentences.forEach((sentence) => {
    const audio = normalSpeedAudios.find((af) => af.sentenceId === sentence.id);
    const durationFrames = audio ? Math.ceil(audio.duration * 30) + 90 : 150; // Add 3 second buffer
    totalFrames += durationFrames;
  });

  return totalFrames;
}
