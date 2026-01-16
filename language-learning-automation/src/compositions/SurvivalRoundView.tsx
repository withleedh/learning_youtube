/**
 * SurvivalRoundView Component
 *
 * Renders a complete survival quiz round with all phases:
 * - Phase 1: Situation display
 * - Phase 2: Dog answer
 * - Phase 3: Cat answer
 * - Phase 4: Reveal delay (tension)
 * - Phase 5: Floor drop for loser
 * - Phase 6: Explanation
 *
 * Requirements: 6.1, 10.1, 10.4
 */

import React from 'react';
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { SurvivalRound, SurvivalCharacter, CHARACTER_INFO } from '../survival/types';
import { SurvivalTimingConfig, DEFAULT_SURVIVAL_TIMING } from '../survival/timing';
import { HPBar } from './HPBar';
import { FloorDrop } from './FloorDrop';
import { RoundCounter } from './RoundCounter';

// =============================================================================
// Types
// =============================================================================

export interface SurvivalRoundViewProps {
  /** Round data */
  round: SurvivalRound;
  /** Current round number (1-50) */
  roundNumber: number;
  /** Cat's current HP */
  catHP: number;
  /** Dog's current HP */
  dogHP: number;
  /** Cat's HP before this round */
  previousCatHP: number;
  /** Dog's HP before this round */
  previousDogHP: number;
  /** Audio file paths for this round */
  audioFiles?: {
    situation?: string;
    dogAnswer?: string;
    catAnswer?: string;
    floorDrop?: string;
    hpDecrease?: string;
    explanation?: string;
  };
  /** Timing configuration */
  timingConfig?: SurvivalTimingConfig;
  /** Total rounds (default: 50) */
  totalRounds?: number;
  /** Frames per second */
  fps?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FPS = 30;

// =============================================================================
// Helper Functions
// =============================================================================

function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Situation Phase - Shows the situation/question
 */
const SituationPhase: React.FC<{
  situation: string;
  situationEnglish: string;
}> = ({ situation, situationEnglish }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 15], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* Korean situation */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          maxWidth: 800,
        }}
      >
        {situation}
      </div>

      {/* English situation */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: '#FFD700',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          maxWidth: 800,
        }}
      >
        "{situationEnglish}"
      </div>
    </div>
  );
};

/**
 * Answer Phase - Shows a character's answer
 */
const AnswerPhase: React.FC<{
  character: SurvivalCharacter;
  answerText: string;
  isWinner?: boolean;
}> = ({ character, answerText, isWinner }) => {
  const frame = useCurrentFrame();
  const info = CHARACTER_INFO[character];

  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const slideX = interpolate(frame, [0, 12], [character === 'cat' ? -50 : 50, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15,
        opacity,
        transform: `translateX(${slideX}px)`,
      }}
    >
      {/* Character emoji */}
      <div
        style={{
          fontSize: 80,
          textShadow: `0 4px 20px ${info.color}66`,
        }}
      >
        {info.emoji}
      </div>

      {/* Character name */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: info.color,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {info.nameKorean}
      </div>

      {/* Answer text */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          padding: '15px 30px',
          backgroundColor: `${info.color}33`,
          borderRadius: 16,
          border: `3px solid ${info.color}`,
          maxWidth: 500,
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        "{answerText}"
      </div>
    </div>
  );
};

/**
 * Explanation Phase - Shows the explanation
 */
const ExplanationPhase: React.FC<{
  explanation: string;
  winner: SurvivalCharacter;
}> = ({ explanation, winner }) => {
  const frame = useCurrentFrame();
  const winnerInfo = CHARACTER_INFO[winner];

  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const slideY = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        opacity,
        transform: `translateY(${slideY}px)`,
      }}
    >
      {/* Winner announcement */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 15,
          fontSize: 36,
          fontWeight: 700,
          color: winnerInfo.color,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: `0 0 20px ${winnerInfo.color}66`,
        }}
      >
        <span>{winnerInfo.emoji}</span>
        <span>정답!</span>
      </div>

      {/* Explanation text */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          padding: '15px 30px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: 12,
          maxWidth: 600,
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        {explanation}
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * SurvivalRoundView - Renders a complete survival quiz round
 *
 * Phase sequence:
 * 1. Situation display (1.5s)
 * 2. Dog answer (1.5s)
 * 3. Cat answer (1.5s)
 * 4. Reveal delay (0.5s)
 * 5. Floor drop for loser (1.5s)
 * 6. Explanation (1.5s)
 */
export const SurvivalRoundView: React.FC<SurvivalRoundViewProps> = ({
  round,
  roundNumber,
  catHP,
  dogHP,
  previousCatHP,
  previousDogHP,
  audioFiles,
  timingConfig = DEFAULT_SURVIVAL_TIMING,
  totalRounds = 50,
  fps = DEFAULT_FPS,
}) => {
  const frame = useCurrentFrame();

  // Calculate frame positions for each phase
  const situationFrames = secondsToFrames(timingConfig.situationDuration, fps);
  const dogAnswerFrames = secondsToFrames(timingConfig.dogAnswerDuration, fps);
  const catAnswerFrames = secondsToFrames(timingConfig.catAnswerDuration, fps);
  const revealDelayFrames = secondsToFrames(timingConfig.revealDelay, fps);
  const floorDropFrames = secondsToFrames(timingConfig.floorDropDuration, fps);
  const explanationFrames = secondsToFrames(timingConfig.explanationDuration, fps);

  // Calculate start frames for each phase
  let currentFrameCalc = 0;
  const situationStart = currentFrameCalc;
  currentFrameCalc += situationFrames;

  const dogAnswerStart = currentFrameCalc;
  currentFrameCalc += dogAnswerFrames;

  const catAnswerStart = currentFrameCalc;
  currentFrameCalc += catAnswerFrames;

  const revealDelayStart = currentFrameCalc;
  currentFrameCalc += revealDelayFrames;

  const floorDropStart = currentFrameCalc;
  currentFrameCalc += floorDropFrames;

  const explanationStart = currentFrameCalc;

  // Determine loser
  const loser: SurvivalCharacter = round.winner === 'cat' ? 'dog' : 'cat';

  // Get answer texts for each character
  const dogAnswerText =
    round.konglishAnswer.character === 'dog' ? round.konglishAnswer.text : round.nativeAnswer.text;
  const catAnswerText =
    round.konglishAnswer.character === 'cat' ? round.konglishAnswer.text : round.nativeAnswer.text;

  // Determine if in final stretch
  const isFinalStretch = roundNumber >= 45;

  // HP should only change after FloorDrop starts
  // Before FloorDrop: show previousHP
  // After FloorDrop: animate to currentHP

  // Calculate displayed HP based on current frame
  // HP decreases during FloorDrop phase with animation
  const hpAnimationProgress =
    frame >= floorDropStart
      ? Math.min(1, (frame - floorDropStart) / (floorDropFrames * 0.5)) // Animate over first half of FloorDrop
      : 0;

  const displayedCatHP = Math.round(
    interpolate(hpAnimationProgress, [0, 1], [previousCatHP, catHP], { extrapolateRight: 'clamp' })
  );
  const displayedDogHP = Math.round(
    interpolate(hpAnimationProgress, [0, 1], [previousDogHP, dogHP], { extrapolateRight: 'clamp' })
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1A1A2E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Round Counter - Top center */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
        }}
      >
        <RoundCounter
          currentRound={roundNumber}
          totalRounds={totalRounds}
          isFinalStretch={isFinalStretch}
        />
      </div>

      {/* HP Bars - Top corners */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          zIndex: 100,
        }}
      >
        <HPBar
          character="cat"
          currentHP={displayedCatHP}
          previousHP={previousCatHP}
          position="left"
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          zIndex: 100,
        }}
      >
        <HPBar
          character="dog"
          currentHP={displayedDogHP}
          previousHP={previousDogHP}
          position="right"
        />
      </div>

      {/* Phase 1: Situation */}
      <Sequence from={situationStart} durationInFrames={situationFrames}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SituationPhase situation={round.situation} situationEnglish={round.situationEnglish} />
          {audioFiles?.situation && <Audio src={audioFiles.situation} />}
        </AbsoluteFill>
      </Sequence>

      {/* Phase 2: Dog Answer */}
      <Sequence from={dogAnswerStart} durationInFrames={dogAnswerFrames}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnswerPhase
            character="dog"
            answerText={dogAnswerText}
            isWinner={round.winner === 'dog'}
          />
          {audioFiles?.dogAnswer && <Audio src={audioFiles.dogAnswer} />}
        </AbsoluteFill>
      </Sequence>

      {/* Phase 3: Cat Answer */}
      <Sequence from={catAnswerStart} durationInFrames={catAnswerFrames}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnswerPhase
            character="cat"
            answerText={catAnswerText}
            isWinner={round.winner === 'cat'}
          />
          {audioFiles?.catAnswer && <Audio src={audioFiles.catAnswer} />}
        </AbsoluteFill>
      </Sequence>

      {/* Phase 4: Reveal Delay (tension build-up) */}
      <Sequence from={revealDelayStart} durationInFrames={revealDelayFrames}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Both answers visible during tension */}
          <div
            style={{
              display: 'flex',
              gap: 100,
              alignItems: 'center',
            }}
          >
            <AnswerPhase character="cat" answerText={catAnswerText} />
            <div style={{ fontSize: 48, color: '#FFD700' }}>VS</div>
            <AnswerPhase character="dog" answerText={dogAnswerText} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Phase 5: Floor Drop */}
      <Sequence from={floorDropStart} durationInFrames={floorDropFrames}>
        <AbsoluteFill>
          <FloorDrop character={loser} durationInFrames={floorDropFrames} />
          {audioFiles?.floorDrop && <Audio src={audioFiles.floorDrop} />}
          {audioFiles?.hpDecrease && (
            <Audio src={audioFiles.hpDecrease} startFrom={floorDropFrames / 2} />
          )}
        </AbsoluteFill>
      </Sequence>

      {/* Phase 6: Explanation */}
      <Sequence from={explanationStart} durationInFrames={explanationFrames}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ExplanationPhase explanation={round.explanation} winner={round.winner} />
          {audioFiles?.explanation && <Audio src={audioFiles.explanation} />}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export default SurvivalRoundView;
