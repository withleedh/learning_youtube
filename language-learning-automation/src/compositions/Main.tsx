import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { ChannelConfig } from '../config/types';
import type { Script, Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';
import { Intro, INTRO_DURATION_FRAMES } from './Intro';
import { Step1, calculateStep1Duration } from './Step1';
import { Step2, calculateStep2Duration } from './Step2';
import { Step3, calculateStep3Duration } from './Step3';
import { Step4, calculateStep4Duration } from './Step4';

export interface MainProps {
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
  backgroundImage?: string;
}

export const Main: React.FC<MainProps> = ({ config, script, audioFiles, backgroundImage }) => {
  const { sentences } = script;
  const { colors, content, theme } = config;

  // Calculate durations for each step
  const step1Duration = calculateStep1Duration(audioFiles);
  const step2Duration = calculateStep2Duration(sentences, audioFiles);
  const step3Duration = calculateStep3Duration(sentences, audioFiles, content.repeatCount);
  const step4Duration = calculateStep4Duration(audioFiles);

  // Calculate cumulative start frames
  let currentFrame = 0;

  const introStart = currentFrame;
  currentFrame += INTRO_DURATION_FRAMES;

  const step1Start = currentFrame;
  currentFrame += step1Duration;

  const step2Start = currentFrame;
  currentFrame += step2Duration;

  const step3Start = currentFrame;
  currentFrame += step3Duration;

  const step4Start = currentFrame;
  currentFrame += step4Duration;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Intro: Logo + 4 Steps Preview */}
      <Sequence from={introStart} durationInFrames={INTRO_DURATION_FRAMES}>
        <Intro
          channelName={config.meta.name}
          logoPath={theme.logo}
          introSoundPath={theme.introSound}
          primaryColor={theme.primaryColor}
        />
      </Sequence>

      {/* Step 1: 자막 없이 듣기 */}
      <Sequence from={step1Start} durationInFrames={step1Duration}>
        <Step1
          backgroundImage={backgroundImage}
          audioFiles={audioFiles}
          title={script.metadata.title.target}
        />
      </Sequence>

      {/* Step 2: 문장별 듣기 */}
      <Sequence from={step2Start} durationInFrames={step2Duration}>
        <Step2
          backgroundImage={backgroundImage}
          sentences={sentences}
          audioFiles={audioFiles}
          colors={{
            maleText: colors.maleText,
            femaleText: colors.femaleText,
            nativeText: colors.nativeText,
          }}
        />
      </Sequence>

      {/* Step 3: 10번씩 반복 듣기 (Interval Training) */}
      <Sequence from={step3Start} durationInFrames={step3Duration}>
        <Step3
          backgroundImage={backgroundImage}
          sentences={sentences}
          audioFiles={audioFiles}
          colors={colors}
          repeatCount={content.repeatCount}
          imageRatio={config.layout.step3ImageRatio}
        />
      </Sequence>

      {/* Step 4: 다시 자막 없이 듣기 */}
      <Sequence from={step4Start} durationInFrames={step4Duration}>
        <Step4
          backgroundImage={backgroundImage}
          audioFiles={audioFiles}
          title={script.metadata.title.target}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// Calculate total video duration
export function calculateTotalDuration(
  sentences: Sentence[],
  audioFiles: AudioFile[],
  repeatCount: number
): number {
  return (
    INTRO_DURATION_FRAMES +
    calculateStep1Duration(audioFiles) +
    calculateStep2Duration(sentences, audioFiles) +
    calculateStep3Duration(sentences, audioFiles, repeatCount) +
    calculateStep4Duration(audioFiles)
  );
}
