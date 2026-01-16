/**
 * SurvivalRoot - Survival Quiz Longform 전용 Remotion Root
 *
 * 사용법:
 *   npx remotion studio src/SurvivalRoot.tsx
 *
 * 기존 Root.tsx와 분리하여 SurvivalScript만 로드합니다.
 */

import React from 'react';
import { Composition, registerRoot, staticFile } from 'remotion';
import { SurvivalLongform } from './compositions/SurvivalLongform';
import { SurvivalRoundView } from './compositions/SurvivalRoundView';
import { SurvivalIntro } from './compositions/SurvivalIntro';
import { SurvivalEnding } from './compositions/SurvivalEnding';
import { TekkenHPBar } from './compositions/TekkenHPBar';
import { FloorDrop } from './compositions/FloorDrop';
import { DEFAULT_SURVIVAL_TIMING, calculateRoundDuration } from './survival/timing';
import type { SurvivalScript, SurvivalCharacter } from './survival/types';
import type { SurvivalAudioFiles } from './survival/audio';

// =============================================================================
// Constants
// =============================================================================

const FPS = 30;
const DEFAULT_ROUND_COUNT = 50;

// =============================================================================
// Sample Data for Preview
// =============================================================================

function createSampleSurvivalScript(roundCount: number = DEFAULT_ROUND_COUNT): SurvivalScript {
  const categories = ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'] as const;

  const rounds = Array.from({ length: roundCount }, (_, i) => {
    const winner: SurvivalCharacter = Math.random() > 0.5 ? 'cat' : 'dog';
    const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';
    const category = categories[i % categories.length];

    return {
      id: i + 1,
      category,
      situation: `상황 ${i + 1}: 친구에게 인사할 때`,
      situationEnglish: 'When greeting a friend',
      konglishAnswer: {
        text: 'Hello, nice to meet you!',
        character: loser,
      },
      nativeAnswer: {
        text: "What's up?",
        character: winner,
      },
      explanation: winner === 'cat' ? '캐주얼한 표현이 더 자연스러워요!' : '이 표현이 더 적절해요!',
      winner,
    };
  });

  // Calculate final HP and wins
  let catHP = 100;
  let dogHP = 100;
  let catWins = 0;
  let dogWins = 0;

  for (const round of rounds) {
    if (round.winner === 'cat') {
      catWins++;
      dogHP = Math.max(0, dogHP - 2);
    } else {
      dogWins++;
      catHP = Math.max(0, catHP - 2);
    }
  }

  const finalWinner: SurvivalCharacter = catHP > dogHP ? 'cat' : dogHP > catHP ? 'dog' : 'cat';
  const today = new Date().toISOString().split('T')[0];

  return {
    channelId: 'survival-preview',
    date: today,
    title: {
      korean: '고양이 vs 강아지 50라운드 서바이벌',
      english: 'Cat vs Dog 50-Round Survival',
    },
    intro: {
      title: '🐱 vs 🐶 영어 서바이벌!',
      subtitle: '50라운드 생존 퀴즈',
    },
    rounds,
    ending: {
      winner: finalWinner,
      catFinalHP: catHP,
      dogFinalHP: dogHP,
      catWins,
      dogWins,
      ctaQuestion: '다음 대결에서 누가 이길까요?',
    },
  };
}

// =============================================================================
// Dynamic Loading from public/ folder
// =============================================================================

let dynamicSurvivalScript: SurvivalScript | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rawScript = require('../public/survival-script.json');
  if (rawScript.rounds && rawScript.rounds[0]?.konglishAnswer) {
    dynamicSurvivalScript = rawScript as SurvivalScript;
    console.log('✅ Loaded SurvivalScript from public/survival-script.json');
    console.log(`   - ${rawScript.rounds.length} rounds`);
    console.log(`   - Winner: ${rawScript.ending?.winner}`);
  } else {
    console.log('ℹ️ public/survival-script.json is not a SurvivalScript, using sample data');
  }
} catch {
  console.log('ℹ️ No survival-script.json found, using sample data');
}

const activeScript = dynamicSurvivalScript ?? createSampleSurvivalScript(DEFAULT_ROUND_COUNT);

// =============================================================================
// Audio Files Configuration
// =============================================================================

/**
 * Build audio files object from public/survival-audio folder
 */
function buildAudioFiles(roundCount: number): SurvivalAudioFiles {
  const rounds = Array.from({ length: roundCount }, (_, i) => {
    const roundNum = (i + 1).toString().padStart(2, '0');
    return {
      situation: staticFile(`survival-audio/round_${roundNum}_situation.mp3`),
      dogAnswer: staticFile(`survival-audio/round_${roundNum}_dogAnswer.mp3`),
      catAnswer: staticFile(`survival-audio/round_${roundNum}_catAnswer.mp3`),
      explanation: staticFile(`survival-audio/round_${roundNum}_explanation.mp3`),
    };
  });

  return {
    rounds,
    sfx: {
      floorDrop: staticFile('sfx/floor_drop.mp3'),
      hpDecrease: staticFile('sfx/hp_decrease.mp3'),
      victory: staticFile('sfx/victory.mp3'),
      roundStart: staticFile('sfx/round_start.mp3'),
    },
  };
}

// Build audio files for the active script
const activeAudioFiles = buildAudioFiles(activeScript.rounds.length);

// =============================================================================
// Duration Calculations
// =============================================================================

const roundDurationSeconds = calculateRoundDuration(DEFAULT_SURVIVAL_TIMING);
const roundDurationFrames = Math.round(roundDurationSeconds * FPS);

/**
 * Calculate dynamic duration based on audio durations in script
 */
function calculateDynamicDuration(script: SurvivalScript): number {
  const INTRO_FRAMES = 8 * FPS;
  const ENDING_FRAMES = 15 * FPS;
  const PHASE_BUFFER = 0.2; // seconds

  let totalRoundFrames = 0;

  for (const round of script.rounds) {
    const audioDurations = round.audioDurations;

    // Calculate each phase duration: max(default, audio + buffer)
    const situationDuration = Math.max(
      DEFAULT_SURVIVAL_TIMING.situationDuration,
      (audioDurations?.situation ?? 0) + PHASE_BUFFER
    );
    const dogAnswerDuration = Math.max(
      DEFAULT_SURVIVAL_TIMING.dogAnswerDuration,
      (audioDurations?.dogAnswer ?? 0) + PHASE_BUFFER
    );
    const catAnswerDuration = Math.max(
      DEFAULT_SURVIVAL_TIMING.catAnswerDuration,
      (audioDurations?.catAnswer ?? 0) + PHASE_BUFFER
    );
    const explanationDuration = Math.max(
      DEFAULT_SURVIVAL_TIMING.explanationDuration,
      (audioDurations?.explanation ?? 0) + PHASE_BUFFER
    );

    const roundDuration =
      situationDuration +
      dogAnswerDuration +
      catAnswerDuration +
      DEFAULT_SURVIVAL_TIMING.revealDelay +
      DEFAULT_SURVIVAL_TIMING.floorDropDuration +
      explanationDuration +
      DEFAULT_SURVIVAL_TIMING.transitionDuration;

    totalRoundFrames += Math.round(roundDuration * FPS);
  }

  return INTRO_FRAMES + totalRoundFrames + ENDING_FRAMES;
}

// =============================================================================
// Root Component
// =============================================================================

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* SurvivalLongform - Full survival video */}
      <Composition
        id="SurvivalLongform"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SurvivalLongform as any}
        durationInFrames={calculateDynamicDuration(activeScript)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          script: activeScript,
          audioFiles: activeAudioFiles,
          timingConfig: DEFAULT_SURVIVAL_TIMING,
          fps: FPS,
        }}
      />

      {/* SurvivalLongform - 10 rounds preview */}
      <Composition
        id="SurvivalLongform-10Rounds"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SurvivalLongform as any}
        durationInFrames={calculateDynamicDuration({
          ...activeScript,
          rounds: activeScript.rounds.slice(0, 10),
        })}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          script: {
            ...activeScript,
            rounds: activeScript.rounds.slice(0, 10),
          },
          audioFiles: {
            ...activeAudioFiles,
            rounds: activeAudioFiles.rounds.slice(0, 10),
          },
          timingConfig: DEFAULT_SURVIVAL_TIMING,
          fps: FPS,
        }}
      />

      {/* SurvivalRoundView - Single round preview */}
      <Composition
        id="SurvivalRoundView"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SurvivalRoundView as any}
        durationInFrames={roundDurationFrames}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          round: activeScript.rounds[0],
          roundNumber: 1,
          catHP: 100,
          dogHP: 98,
          previousCatHP: 100,
          previousDogHP: 100,
          timingConfig: DEFAULT_SURVIVAL_TIMING,
          totalRounds: DEFAULT_ROUND_COUNT,
          fps: FPS,
        }}
      />

      {/* SurvivalIntro - Intro preview */}
      <Composition
        id="SurvivalIntro"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SurvivalIntro as any}
        durationInFrames={8 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          title: activeScript.intro.title,
          subtitle: activeScript.intro.subtitle,
          durationInFrames: 8 * FPS,
        }}
      />

      {/* SurvivalEnding - Ending preview */}
      <Composition
        id="SurvivalEnding"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SurvivalEnding as any}
        durationInFrames={15 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          winner: activeScript.ending.winner,
          catFinalHP: activeScript.ending.catFinalHP,
          dogFinalHP: activeScript.ending.dogFinalHP,
          catWins: activeScript.ending.catWins,
          dogWins: activeScript.ending.dogWins,
          ctaQuestion: activeScript.ending.ctaQuestion,
          durationInFrames: 15 * FPS,
        }}
      />

      {/* TekkenHPBar - Tekken style HP bar preview */}
      <Composition
        id="TekkenHPBar"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={TekkenHPBar as any}
        durationInFrames={3 * FPS}
        fps={FPS}
        width={1920}
        height={200}
        defaultProps={{
          catHP: 75,
          dogHP: 85,
          previousCatHP: 100,
          previousDogHP: 100,
          currentRound: 25,
          totalRounds: 50,
          catWins: 12,
          dogWins: 13,
        }}
      />

      {/* FloorDrop - Floor drop animation preview */}
      <Composition
        id="FloorDrop"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={FloorDrop as any}
        durationInFrames={2 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          loser: 'dog' as SurvivalCharacter,
          durationInFrames: 2 * FPS,
        }}
      />

      {/* Individual round previews (first 5) */}
      {activeScript.rounds.slice(0, 5).map((round, index) => (
        <Composition
          key={`Round-${index + 1}`}
          id={`Round-${index + 1}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component={SurvivalRoundView as any}
          durationInFrames={roundDurationFrames}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            round,
            roundNumber: index + 1,
            catHP: Math.max(0, 100 - index * 2),
            dogHP: Math.max(0, 100 - index * 2),
            previousCatHP: Math.max(0, 100 - (index - 1) * 2),
            previousDogHP: Math.max(0, 100 - (index - 1) * 2),
            timingConfig: DEFAULT_SURVIVAL_TIMING,
            totalRounds: DEFAULT_ROUND_COUNT,
            fps: FPS,
          }}
        />
      ))}
    </>
  );
};

registerRoot(RemotionRoot);
