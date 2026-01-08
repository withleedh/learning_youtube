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
import type { AudioFile, SpeedVariant } from '../tts/types';
import { Subtitle, BlankSubtitle } from '../components/Subtitle';
import { WordMeaning } from '../components/WordMeaning';

export interface Step3Props {
  backgroundImage?: string;
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
}

// Speed sequence for interval training: slow -> normal (blank) -> fast
const SPEED_SEQUENCE: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];

export const Step3: React.FC<Step3Props> = ({
  backgroundImage,
  sentences,
  audioFiles,
  colors,
  repeatCount,
  imageRatio = 0.4,
}) => {
  // Build sequences for all sentences with all repetitions
  let cumulativeFrame = 0;
  const allSequences: Array<{
    sentence: Sentence;
    speed: SpeedVariant;
    audio?: AudioFile;
    startFrame: number;
    durationFrames: number;
    repetition: number;
  }> = [];

  sentences.forEach((sentence) => {
    // Repeat the 3-speed cycle repeatCount times
    for (let rep = 0; rep < repeatCount; rep++) {
      SPEED_SEQUENCE.forEach((speed) => {
        const audio = audioFiles.find((af) => af.sentenceId === sentence.id && af.speed === speed);
        const startFrame = cumulativeFrame;
        const baseDuration = audio ? audio.duration : 3;
        // Add pause after each audio
        const durationFrames = Math.ceil(baseDuration * 30) + 15;
        cumulativeFrame += durationFrames;

        allSequences.push({
          sentence,
          speed,
          audio,
          startFrame,
          durationFrames,
          repetition: rep + 1,
        });
      });
    }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Step Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 20,
          color: '#FFFFFF',
          fontWeight: 600,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          zIndex: 10,
        }}
      >
        Step 3: 10번씩 반복 듣기
      </div>

      {/* Background Image (top portion) */}
      {backgroundImage && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${imageRatio * 100}%`,
            overflow: 'hidden',
          }}
        >
          <Img
            src={staticFile(backgroundImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {/* Sentence Display Sequences */}
      {allSequences.map((seq, index) => (
        <Sequence key={index} from={seq.startFrame} durationInFrames={seq.durationFrames}>
          <SentenceRepeatDisplay
            sentence={seq.sentence}
            speed={seq.speed}
            audio={seq.audio}
            colors={colors}
            imageRatio={imageRatio}
            repetition={seq.repetition}
            totalRepetitions={repeatCount}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Individual sentence repeat display
const SentenceRepeatDisplay: React.FC<{
  sentence: Sentence;
  speed: SpeedVariant;
  audio?: AudioFile;
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
    wordMeaning: string;
  };
  imageRatio: number;
  repetition: number;
  totalRepetitions: number;
}> = ({ sentence, speed, audio, colors, imageRatio, repetition, totalRepetitions }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;
  const isBlankMode = speed === '1.0x'; // Show blank during normal speed

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Audio */}
      {audio && <Audio src={audio.path} volume={1} />}

      {/* Text Content Area (below image) */}
      <div
        style={{
          position: 'absolute',
          top: `${imageRatio * 100}%`,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}
      >
        {/* Repetition Counter */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 40,
            fontSize: 24,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {repetition}/{totalRepetitions}
        </div>

        {/* Speed Indicator */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 40,
            fontSize: 20,
            color: getSpeedColor(speed),
            fontWeight: 600,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {getSpeedLabel(speed)}
        </div>

        {/* Target Language Sentence */}
        {isBlankMode ? (
          <BlankSubtitle
            text={sentence.targetBlank}
            color={textColor}
            blankColor="#FFD700"
            fontSize={44}
            fontWeight={600}
            marginBottom={24}
          />
        ) : (
          <Subtitle
            text={sentence.target}
            color={textColor}
            fontSize={44}
            fontWeight={600}
            marginBottom={24}
          />
        )}

        {/* Highlight answer on fast speed */}
        {speed === '1.2x' && (
          <div
            style={{
              fontSize: 28,
              color: '#FFD700',
              fontWeight: 700,
              marginBottom: 16,
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            정답: {sentence.blankAnswer}
          </div>
        )}

        {/* Native Translation */}
        <Subtitle
          text={sentence.native}
          color={colors.nativeText}
          fontSize={32}
          fontWeight={400}
          marginBottom={24}
        />

        {/* Word Meanings */}
        <WordMeaning words={sentence.words} color={colors.wordMeaning} fontSize={24} />
      </div>
    </AbsoluteFill>
  );
};

// Helper functions
function getSpeedLabel(speed: SpeedVariant): string {
  switch (speed) {
    case '0.8x':
      return '🐢 느리게';
    case '1.0x':
      return '▶️ 정상 (빈칸)';
    case '1.2x':
      return '🐇 빠르게';
  }
}

function getSpeedColor(speed: SpeedVariant): string {
  switch (speed) {
    case '0.8x':
      return '#4CAF50'; // Green
    case '1.0x':
      return '#FFD700'; // Gold
    case '1.2x':
      return '#FF5722'; // Orange
  }
}

// Calculate total duration for Step 3
export function calculateStep3Duration(
  sentences: Sentence[],
  audioFiles: AudioFile[],
  repeatCount: number
): number {
  let totalFrames = 0;

  sentences.forEach((sentence) => {
    for (let rep = 0; rep < repeatCount; rep++) {
      SPEED_SEQUENCE.forEach((speed) => {
        const audio = audioFiles.find((af) => af.sentenceId === sentence.id && af.speed === speed);
        const baseDuration = audio ? audio.duration : 3;
        totalFrames += Math.ceil(baseDuration * 30) + 15;
      });
    }
  });

  return totalFrames;
}
