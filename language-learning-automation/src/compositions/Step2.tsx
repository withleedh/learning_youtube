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
import type { Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';
import { Subtitle } from '../components/Subtitle';

export interface Step2Props {
  backgroundImage?: string;
  sentences: Sentence[];
  audioFiles: AudioFile[];
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
  };
  dimOpacity?: number;
}

export const Step2: React.FC<Step2Props> = ({
  backgroundImage,
  sentences,
  audioFiles,
  colors,
  dimOpacity = 0.6,
}) => {
  // Filter to only 1.0x speed audio files
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');

  // Calculate sequences for each sentence
  let cumulativeFrame = 0;
  const sentenceSequences = sentences.map((sentence) => {
    const audio = normalSpeedAudios.find((af) => af.sentenceId === sentence.id);
    const startFrame = cumulativeFrame;
    const durationFrames = audio ? Math.ceil(audio.duration * 30) + 30 : 90; // Add buffer
    cumulativeFrame += durationFrames;
    return { sentence, audio, startFrame, durationFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background Image with Dim Overlay */}
      {backgroundImage && (
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
          padding: '12px 24px',
          borderRadius: 8,
          fontSize: 24,
          color: '#FFFFFF',
          fontWeight: 600,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          zIndex: 10,
        }}
      >
        Step 2: 문장별 듣기
      </div>

      {/* Sentence Sequences */}
      {sentenceSequences.map(({ sentence, audio, startFrame, durationFrames }, index) => (
        <Sequence key={index} from={startFrame} durationInFrames={durationFrames}>
          <SentenceDisplay sentence={sentence} audio={audio} colors={colors} />
        </Sequence>
      ))}
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
}> = ({ sentence, audio, colors }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, -30, -15], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        opacity,
      }}
    >
      {/* Audio */}
      {audio && <Audio src={audio.path} volume={1} />}

      {/* Target Language Sentence */}
      <Subtitle
        text={sentence.target}
        color={textColor}
        fontSize={48}
        fontWeight={600}
        marginBottom={30}
      />

      {/* Native Translation */}
      <Subtitle text={sentence.native} color={colors.nativeText} fontSize={36} fontWeight={400} />
    </AbsoluteFill>
  );
};

// Calculate total duration for Step 2
export function calculateStep2Duration(sentences: Sentence[], audioFiles: AudioFile[]): number {
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');
  let totalFrames = 0;

  sentences.forEach((sentence) => {
    const audio = normalSpeedAudios.find((af) => af.sentenceId === sentence.id);
    const durationFrames = audio ? Math.ceil(audio.duration * 30) + 30 : 90;
    totalFrames += durationFrames;
  });

  return totalFrames;
}
