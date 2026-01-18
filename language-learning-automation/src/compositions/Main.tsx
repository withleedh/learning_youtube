import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { ChannelConfig } from '../config/types';
import type { Script, Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';
import { Intro, calculateIntroDuration } from './Intro';
import { Step1, calculateStep1Duration } from './Step1';
import { Step2, calculateStep2Duration } from './Step2';
import { Step3, calculateStep3Duration } from './Step3';
import { Step4, calculateStep4Duration } from './Step4';
import { StepTransition, STEP_TRANSITION_DURATION } from './StepTransition';
import { Ending, ENDING_DURATION } from './Ending';

export interface MainProps {
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
  backgroundImage?: string;
  /** 🆕 Multi-scene images for character consistency */
  sceneImages?: string[];
  /** 썸네일 이미지 경로 (인트로에서 사용) */
  thumbnailPath?: string;
  /** 바이럴 문구 나레이션 TTS 경로 */
  viralNarrationPath?: string;
  /** 바이럴 TTS 길이 (초) */
  viralNarrationDuration?: number;
  /** 가이드 나레이션 TTS 경로 */
  guideNarrationPath?: string;
  /** 가이드 TTS 길이 (초) */
  guideNarrationDuration?: number;
  /** 스텝별 TTS 경로 배열 (step1~4) */
  stepNarrationPaths?: string[];
  /** 스텝별 TTS 길이 배열 (초) */
  stepNarrationDurations?: number[];
  /** 마무리 TTS 경로 */
  closingNarrationPath?: string;
  /** 마무리 TTS 길이 (초) */
  closingNarrationDuration?: number;
  /** 스텝 전환 TTS 경로 배열 */
  stepTransitionTtsPaths?: string[];
  /** 스텝 전환 벨소리 경로 */
  stepTransitionBellPath?: string;
  /** 엔딩 배경 이미지 경로 */
  endingBackgroundPath?: string;
  /** 엔딩 TTS 경로 */
  endingNarrationPath?: string;
}

export const Main: React.FC<MainProps> = ({
  config,
  script,
  audioFiles,
  backgroundImage,
  sceneImages,
  thumbnailPath,
  viralNarrationPath,
  viralNarrationDuration,
  guideNarrationPath,
  guideNarrationDuration,
  stepNarrationPaths,
  stepNarrationDurations,
  closingNarrationPath,
  closingNarrationDuration,
  stepTransitionTtsPaths,
  stepTransitionBellPath,
  endingBackgroundPath,
  endingNarrationPath,
}) => {
  const { sentences } = script;
  const { colors, content, theme } = config;

  // Calculate intro duration based on TTS lengths
  const introDuration = calculateIntroDuration(
    viralNarrationDuration,
    guideNarrationDuration,
    stepNarrationDurations,
    closingNarrationDuration
  );

  // Calculate durations for each step
  const step1Duration = calculateStep1Duration(audioFiles);
  const step2Duration = calculateStep2Duration(sentences, audioFiles);
  const step3Duration = calculateStep3Duration(sentences, audioFiles, content.repeatCount);
  const step4Duration = calculateStep4Duration(audioFiles);

  // Calculate cumulative start frames (with transitions)
  let currentFrame = 0;

  const introStart = currentFrame;
  currentFrame += introDuration;

  // Transition 1 (before Step 1)
  const transition1Start = currentFrame;
  currentFrame += STEP_TRANSITION_DURATION;

  const step1Start = currentFrame;
  currentFrame += step1Duration;

  // Transition 2 (before Step 2)
  const transition2Start = currentFrame;
  currentFrame += STEP_TRANSITION_DURATION;

  const step2Start = currentFrame;
  currentFrame += step2Duration;

  // Transition 3 (before Step 3)
  const transition3Start = currentFrame;
  currentFrame += STEP_TRANSITION_DURATION;

  const step3Start = currentFrame;
  currentFrame += step3Duration;

  // Transition 4 (before Step 4)
  const transition4Start = currentFrame;
  currentFrame += STEP_TRANSITION_DURATION;

  const step4Start = currentFrame;
  currentFrame += step4Duration;

  // Ending
  const endingStart = currentFrame;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Intro: Logo + 4 Steps Preview */}
      <Sequence from={introStart} durationInFrames={introDuration}>
        <Intro
          channelName={config.meta.name}
          logoPath={theme.logo}
          introSoundPath={theme.introSound}
          primaryColor={theme.primaryColor}
          secondaryColor={theme.secondaryColor}
          introBackgroundPath={theme.introBackground}
          thumbnailPath={thumbnailPath}
          targetLanguage={config.meta.targetLanguage}
          nativeLanguage={config.meta.nativeLanguage}
          viralNarrationPath={viralNarrationPath}
          viralNarrationDuration={viralNarrationDuration}
          guideNarrationPath={guideNarrationPath}
          guideNarrationDuration={guideNarrationDuration}
          stepNarrationPaths={stepNarrationPaths}
          stepNarrationDurations={stepNarrationDurations}
          closingNarrationPath={closingNarrationPath}
          closingNarrationDuration={closingNarrationDuration}
          uiLabels={config.uiLabels}
        />
      </Sequence>

      {/* Step 1 Transition */}
      <Sequence from={transition1Start} durationInFrames={STEP_TRANSITION_DURATION}>
        <StepTransition
          stepNumber={1}
          ttsPath={stepTransitionTtsPaths?.[0]}
          bellSoundPath={stepTransitionBellPath}
          nativeLanguage={config.meta.nativeLanguage}
        />
      </Sequence>

      {/* Step 1: 전체 흐름 파악 (자막 없이 듣기) */}
      <Sequence from={step1Start} durationInFrames={step1Duration}>
        <Step1
          backgroundImage={backgroundImage}
          sceneImages={sceneImages}
          scenePrompts={script.metadata.scenePrompts}
          audioFiles={audioFiles}
          title={script.metadata.title.target}
          stepLabel={config.uiLabels?.step1Title}
        />
      </Sequence>

      {/* Step 2 Transition */}
      <Sequence from={transition2Start} durationInFrames={STEP_TRANSITION_DURATION}>
        <StepTransition
          stepNumber={2}
          ttsPath={stepTransitionTtsPaths?.[1]}
          bellSoundPath={stepTransitionBellPath}
          nativeLanguage={config.meta.nativeLanguage}
        />
      </Sequence>

      {/* Step 2: 문장별 듣기 */}
      <Sequence from={step2Start} durationInFrames={step2Duration}>
        <Step2
          backgroundImage={backgroundImage}
          sceneImages={sceneImages}
          scenePrompts={script.metadata.scenePrompts}
          sentences={sentences}
          audioFiles={audioFiles}
          colors={{
            maleText: colors.maleText,
            femaleText: colors.femaleText,
            nativeText: colors.nativeText,
          }}
          stepLabel={config.uiLabels?.step2Title}
        />
      </Sequence>

      {/* Step 3 Transition */}
      <Sequence from={transition3Start} durationInFrames={STEP_TRANSITION_DURATION}>
        <StepTransition
          stepNumber={3}
          ttsPath={stepTransitionTtsPaths?.[2]}
          bellSoundPath={stepTransitionBellPath}
          nativeLanguage={config.meta.nativeLanguage}
        />
      </Sequence>

      {/* Step 3: 10번씩 반복 듣기 (Interval Training) */}
      <Sequence from={step3Start} durationInFrames={step3Duration}>
        <Step3
          backgroundImage={backgroundImage}
          sceneImages={sceneImages}
          scenePrompts={script.metadata.scenePrompts}
          sentences={sentences}
          audioFiles={audioFiles}
          colors={colors}
          repeatCount={content.repeatCount}
          imageRatio={config.layout.step3ImageRatio}
          uiLabels={config.uiLabels}
        />
      </Sequence>

      {/* Step 4 Transition */}
      <Sequence from={transition4Start} durationInFrames={STEP_TRANSITION_DURATION}>
        <StepTransition
          stepNumber={4}
          ttsPath={stepTransitionTtsPaths?.[3]}
          bellSoundPath={stepTransitionBellPath}
          nativeLanguage={config.meta.nativeLanguage}
        />
      </Sequence>

      {/* Step 4: 다시 자막 없이 듣기 */}
      <Sequence from={step4Start} durationInFrames={step4Duration}>
        <Step4
          backgroundImage={backgroundImage}
          sceneImages={sceneImages}
          scenePrompts={script.metadata.scenePrompts}
          audioFiles={audioFiles}
          title={script.metadata.title.target}
          stepLabel={config.uiLabels?.step4Title}
        />
      </Sequence>

      {/* Ending: 마무리 화면 */}
      <Sequence from={endingStart} durationInFrames={ENDING_DURATION}>
        <Ending
          backgroundPath={endingBackgroundPath || theme.introBackground}
          targetLanguage={config.meta.targetLanguage}
          nativeLanguage={config.meta.nativeLanguage}
          narrationPath={endingNarrationPath}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// Calculate total video duration (with dynamic intro, transitions, and ending)
export function calculateTotalDuration(
  sentences: Sentence[],
  audioFiles: AudioFile[],
  repeatCount: number,
  viralNarrationDuration?: number,
  guideNarrationDuration?: number,
  stepNarrationDurations?: number[],
  closingNarrationDuration?: number
): number {
  const introDuration = calculateIntroDuration(
    viralNarrationDuration,
    guideNarrationDuration,
    stepNarrationDurations,
    closingNarrationDuration
  );
  // 4개의 스텝 전환 화면 추가 (각 3초 = 90프레임)
  const totalTransitionDuration = STEP_TRANSITION_DURATION * 4;
  return (
    introDuration +
    totalTransitionDuration +
    calculateStep1Duration(audioFiles) +
    calculateStep2Duration(sentences, audioFiles) +
    calculateStep3Duration(sentences, audioFiles, repeatCount) +
    calculateStep4Duration(audioFiles) +
    ENDING_DURATION
  );
}
