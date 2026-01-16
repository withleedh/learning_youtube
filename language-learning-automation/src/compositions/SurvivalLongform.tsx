/**
 * SurvivalLongform Component
 *
 * Main composition for the survival quiz longform video:
 * - Intro → Rounds → Ending structure
 * - Dynamic timing based on audio duration
 * - Audio integration
 *
 * Requirements: 6.1, 6.5
 */

import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { SurvivalScript, SurvivalCharacter, AudioDurations } from '../survival/types';
import {
  SurvivalTimingConfig,
  DEFAULT_SURVIVAL_TIMING,
  calculateRoundDuration,
} from '../survival/timing';
import { HPSystem, DEFAULT_HP_CONFIG, HPSystemConfig } from '../survival/hp-system';
import { SurvivalAudioFiles } from '../survival/audio';
import { SurvivalIntro } from './SurvivalIntro';
import { SurvivalRoundView } from './SurvivalRoundView';
import { SurvivalEnding } from './SurvivalEnding';

// =============================================================================
// Types
// =============================================================================

export interface SurvivalLongformProps {
  /** Complete survival script */
  script: SurvivalScript;
  /** Audio files for the video */
  audioFiles?: SurvivalAudioFiles;
  /** Background image URL (optional) */
  backgroundImage?: string;
  /** Channel logo URL (optional) */
  channelLogo?: string;
  /** Timing configuration (used as minimum/fallback) */
  timingConfig?: SurvivalTimingConfig;
  /** Frames per second */
  fps?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FPS = 30;
const DEFAULT_INTRO_DURATION = 8; // seconds
const DEFAULT_ENDING_DURATION = 15; // seconds
/** Buffer time added to each phase to prevent audio cutoff (seconds) */
const PHASE_BUFFER = 0.2;

// =============================================================================
// Helper Functions
// =============================================================================

function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Calculate dynamic timing for a round based on audio durations
 * Uses audio duration + buffer, or falls back to default timing
 */
function calculateDynamicTiming(
  audioDurations: AudioDurations | undefined,
  defaultTiming: SurvivalTimingConfig
): SurvivalTimingConfig {
  return {
    situationDuration: Math.max(
      defaultTiming.situationDuration,
      (audioDurations?.situation ?? 0) + PHASE_BUFFER
    ),
    dogAnswerDuration: Math.max(
      defaultTiming.dogAnswerDuration,
      (audioDurations?.dogAnswer ?? 0) + PHASE_BUFFER
    ),
    catAnswerDuration: Math.max(
      defaultTiming.catAnswerDuration,
      (audioDurations?.catAnswer ?? 0) + PHASE_BUFFER
    ),
    explanationDuration: Math.max(
      defaultTiming.explanationDuration,
      (audioDurations?.explanation ?? 0) + PHASE_BUFFER
    ),
    // These don't have audio, keep defaults
    revealDelay: defaultTiming.revealDelay,
    floorDropDuration: defaultTiming.floorDropDuration,
    transitionDuration: defaultTiming.transitionDuration,
  };
}

/**
 * Calculate HP states for all rounds
 */
function calculateHPStates(rounds: SurvivalScript['rounds']): Array<{
  catHP: number;
  dogHP: number;
  previousCatHP: number;
  previousDogHP: number;
  catWins: number;
  dogWins: number;
}> {
  // Use actual round count for dynamic damage calculation
  const hpConfig: HPSystemConfig = {
    ...DEFAULT_HP_CONFIG,
    totalRounds: rounds.length,
  };
  const hpSystem = new HPSystem(hpConfig);
  const states: Array<{
    catHP: number;
    dogHP: number;
    previousCatHP: number;
    previousDogHP: number;
    catWins: number;
    dogWins: number;
  }> = [];

  let catWins = 0;
  let dogWins = 0;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const loser: SurvivalCharacter = round.winner === 'cat' ? 'dog' : 'cat';

    // Count wins
    if (round.winner === 'cat') {
      catWins++;
    } else {
      dogWins++;
    }

    // Get HP before this round
    const beforeState = hpSystem.getHPState();
    const previousCatHP = beforeState.cat.currentHP;
    const previousDogHP = beforeState.dog.currentHP;

    // Apply round result
    hpSystem.applyRoundResult(loser, i + 1);

    // Get HP after this round
    const afterState = hpSystem.getHPState();

    states.push({
      catHP: afterState.cat.currentHP,
      dogHP: afterState.dog.currentHP,
      previousCatHP,
      previousDogHP,
      catWins,
      dogWins,
    });
  }

  return states;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SurvivalLongform - Main composition for survival quiz video
 *
 * Structure:
 * [0:00-0:08] Survival Intro
 * [0:08-...] Quiz Rounds (dynamic duration based on audio)
 * [...-end] Survival Ending
 */
export const SurvivalLongform: React.FC<SurvivalLongformProps> = ({
  script,
  audioFiles,
  backgroundImage,
  channelLogo,
  timingConfig = DEFAULT_SURVIVAL_TIMING,
  fps = DEFAULT_FPS,
}) => {
  // Calculate frame durations
  const introFrames = secondsToFrames(DEFAULT_INTRO_DURATION, fps);
  const endingFrames = secondsToFrames(DEFAULT_ENDING_DURATION, fps);

  // Calculate HP states for all rounds
  const hpStates = useMemo(() => calculateHPStates(script.rounds), [script.rounds]);

  // Calculate dynamic timing for each round based on audio durations
  const roundTimings = useMemo(() => {
    return script.rounds.map((round) => calculateDynamicTiming(round.audioDurations, timingConfig));
  }, [script.rounds, timingConfig]);

  // Calculate start frames for each section
  let currentFrame = 0;

  const introStart = currentFrame;
  currentFrame += introFrames;

  const roundStarts: number[] = [];
  const roundFramesList: number[] = [];
  for (let i = 0; i < script.rounds.length; i++) {
    roundStarts.push(currentFrame);
    const roundTiming = roundTimings[i];
    const roundDurationSeconds = calculateRoundDuration(roundTiming);
    const roundFrames = secondsToFrames(roundDurationSeconds, fps);
    roundFramesList.push(roundFrames);
    currentFrame += roundFrames;
  }

  const endingStart = currentFrame;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1A1A2E',
      }}
    >
      {/* Background image (if provided) */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt="Background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.3,
          }}
        />
      )}

      {/* Intro */}
      <Sequence from={introStart} durationInFrames={introFrames}>
        <SurvivalIntro
          title={script.intro.title}
          subtitle={script.intro.subtitle}
          durationInFrames={introFrames}
        />
      </Sequence>

      {/* Rounds */}
      {script.rounds.map((round, index) => {
        const hpState = hpStates[index];
        const roundAudio = audioFiles?.rounds[index];
        const roundTiming = roundTimings[index];
        const roundFrames = roundFramesList[index];

        return (
          <Sequence key={round.id} from={roundStarts[index]} durationInFrames={roundFrames}>
            <SurvivalRoundView
              round={round}
              roundNumber={index + 1}
              catHP={hpState.catHP}
              dogHP={hpState.dogHP}
              previousCatHP={hpState.previousCatHP}
              previousDogHP={hpState.previousDogHP}
              catWins={hpState.catWins}
              dogWins={hpState.dogWins}
              audioFiles={
                roundAudio
                  ? {
                      situation: roundAudio.situation,
                      dogAnswer: roundAudio.dogAnswer,
                      catAnswer: roundAudio.catAnswer,
                      explanation: roundAudio.explanation,
                      floorDrop: audioFiles?.sfx.floorDrop,
                      hpDecrease: audioFiles?.sfx.hpDecrease,
                    }
                  : undefined
              }
              timingConfig={roundTiming}
              totalRounds={script.rounds.length}
              fps={fps}
            />
          </Sequence>
        );
      })}

      {/* Ending */}
      <Sequence from={endingStart} durationInFrames={endingFrames}>
        <SurvivalEnding
          winner={script.ending.winner}
          catFinalHP={script.ending.catFinalHP}
          dogFinalHP={script.ending.dogFinalHP}
          catWins={script.ending.catWins}
          dogWins={script.ending.dogWins}
          ctaQuestion={script.ending.ctaQuestion}
          durationInFrames={endingFrames}
          channelLogo={channelLogo}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export default SurvivalLongform;

/**
 * Calculate total duration of the survival longform video in frames
 * Uses dynamic timing based on audio durations if available
 */
export function calculateSurvivalLongformDuration(
  roundCount: number,
  timingConfig: SurvivalTimingConfig = DEFAULT_SURVIVAL_TIMING,
  fps: number = DEFAULT_FPS,
  audioDurations?: Array<AudioDurations | undefined>
): number {
  const introFrames = secondsToFrames(DEFAULT_INTRO_DURATION, fps);
  const endingFrames = secondsToFrames(DEFAULT_ENDING_DURATION, fps);

  let totalRoundFrames = 0;
  for (let i = 0; i < roundCount; i++) {
    const roundTiming = calculateDynamicTiming(audioDurations?.[i], timingConfig);
    const roundDurationSeconds = calculateRoundDuration(roundTiming);
    totalRoundFrames += secondsToFrames(roundDurationSeconds, fps);
  }

  return introFrames + totalRoundFrames + endingFrames;
}
