import { SurvivalCharacter } from './types';

/**
 * Represents a winner decision for a single round
 */
export interface WinnerDecision {
  roundId: number;
  winner: SurvivalCharacter;
  loser: SurvivalCharacter;
}

/**
 * Simple seeded random number generator (Mulberry32)
 * Provides reproducible random sequences when seed is provided
 */
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pre-determine all round winners using randomization
 * Ensures approximately 50/50 distribution with some variance
 *
 * @param totalRounds - Number of rounds to generate (default: 50)
 * @param seed - Optional seed for reproducibility
 * @returns Array of WinnerDecision for each round
 *
 * Validates: Requirements 4.1, 4.3
 */
export function generateRoundWinners(totalRounds: number = 50, seed?: number): WinnerDecision[] {
  // Use seeded random if seed provided, otherwise use Math.random
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  const decisions: WinnerDecision[] = [];

  for (let i = 1; i <= totalRounds; i++) {
    // Approximately 50/50 probability
    const catWins = random() > 0.5;
    const winner: SurvivalCharacter = catWins ? 'cat' : 'dog';
    const loser: SurvivalCharacter = catWins ? 'dog' : 'cat';

    decisions.push({
      roundId: i,
      winner,
      loser,
    });
  }

  return decisions;
}

/**
 * Assign expressions to characters based on winner decision
 * Winner gets the native (correct) answer, loser gets the konglish (wrong) answer
 *
 * @param konglishText - The Konglish (incorrect) expression
 * @param nativeText - The native (correct) expression
 * @param winner - The character who wins this round
 * @returns Object with konglishAnswer and nativeAnswer assigned to characters
 *
 * Validates: Requirements 4.2
 */
export function assignExpressionsToCharacters(
  konglishText: string,
  nativeText: string,
  winner: SurvivalCharacter
): {
  konglishAnswer: { text: string; character: SurvivalCharacter };
  nativeAnswer: { text: string; character: SurvivalCharacter };
} {
  const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';

  return {
    konglishAnswer: {
      text: konglishText,
      character: loser, // Loser gives the wrong (Konglish) answer
    },
    nativeAnswer: {
      text: nativeText,
      character: winner, // Winner gives the correct (native) answer
    },
  };
}

/**
 * Calculate final winner based on round wins
 * The character with more round wins is the final winner
 * In case of a tie, cat wins (deterministic tie-breaker)
 *
 * @param roundWinners - Array of WinnerDecision from all rounds
 * @returns The final winner character
 *
 * Validates: Requirements 4.3, 4.5
 */
export function determineFinalWinner(roundWinners: WinnerDecision[]): SurvivalCharacter {
  let catWins = 0;
  let dogWins = 0;

  for (const decision of roundWinners) {
    if (decision.winner === 'cat') {
      catWins++;
    } else {
      dogWins++;
    }
  }

  // Character with more wins is the final winner
  // In case of tie, cat wins (deterministic)
  return catWins >= dogWins ? 'cat' : 'dog';
}

/**
 * Count wins for each character from round winners
 *
 * @param roundWinners - Array of WinnerDecision from all rounds
 * @returns Object with catWins and dogWins counts
 */
export function countWins(roundWinners: WinnerDecision[]): {
  catWins: number;
  dogWins: number;
} {
  let catWins = 0;
  let dogWins = 0;

  for (const decision of roundWinners) {
    if (decision.winner === 'cat') {
      catWins++;
    } else {
      dogWins++;
    }
  }

  return { catWins, dogWins };
}
