import { SurvivalCharacter, HPState } from './types';

/**
 * Configuration for the HP system
 */
export interface HPSystemConfig {
  initialHP: number; // 100
  totalRounds: number; // 50
  minHPDecrease: number; // 최소 HP 감소량
  maxHPDecrease: number; // 최대 HP 감소량
}

/**
 * Default HP system configuration
 */
export const DEFAULT_HP_CONFIG: HPSystemConfig = {
  initialHP: 100,
  totalRounds: 50,
  minHPDecrease: 2,
  maxHPDecrease: 5,
};

/**
 * Result of applying a round result
 */
export interface RoundResultOutput {
  catHP: number;
  dogHP: number;
  hpDecrease: number;
}

/**
 * Final results of the survival game
 */
export interface FinalResults {
  winner: SurvivalCharacter;
  catFinalHP: number;
  dogFinalHP: number;
  catWins: number;
  dogWins: number;
}

/**
 * HP System for tracking and calculating HP in the survival quiz game.
 *
 * Requirements:
 * - 3.1: Initialize both characters with HP 100 at video start
 * - 3.2: Decrease loser's HP by calculated amount when wrong answer
 * - 3.4: Calculate HP decrease based on remaining rounds
 * - 3.6: Ensure HP never goes below 0
 */
export class HPSystem {
  private catHP: number;
  private dogHP: number;
  private catLosses: number = 0;
  private dogLosses: number = 0;
  private config: HPSystemConfig;

  /**
   * Creates a new HP system instance.
   * Both characters start with initialHP (default: 100).
   *
   * @param config - Configuration for the HP system
   */
  constructor(config: HPSystemConfig = DEFAULT_HP_CONFIG) {
    this.config = config;
    // Requirement 3.1: Initialize both characters with HP 100
    this.catHP = config.initialHP;
    this.dogHP = config.initialHP;
  }

  /**
   * Calculate HP decrease for a round.
   *
   * HP decreases are calculated to ensure:
   * 1. Loser reaches near 0 HP by round 50
   * 2. Winner maintains some HP
   * 3. Variance in decrease amounts for drama
   *
   * Base decrease: 100 HP / ~25 losses = ~4 HP per loss
   * Add variance: 2-5 HP per loss
   *
   * @param roundNumber - Current round number (1-50)
   * @param loserTotalLosses - Total losses for the loser so far
   * @returns HP decrease amount (clamped between minHPDecrease and maxHPDecrease)
   */
  calculateHPDecrease(roundNumber: number, loserTotalLosses: number): number {
    const { totalRounds, minHPDecrease, maxHPDecrease, initialHP } = this.config;

    // Base decrease: 100 HP / ~25 losses = ~4 HP per loss
    // Assuming approximately half the rounds are lost by each character
    const expectedLosses = totalRounds / 2;
    const baseDecrease = initialHP / expectedLosses;

    // Add variance: -1 to +1
    const variance = Math.random() * 2 - 1;

    // Adjust decrease based on round progression
    // Later rounds can have slightly higher stakes for drama
    const roundProgressionFactor = 1 + (roundNumber / totalRounds) * 0.1;

    // Adjust based on how many losses the loser already has
    // If they've lost many rounds, decrease might be slightly less to keep tension
    const lossAdjustment = loserTotalLosses > expectedLosses ? 0.9 : 1.0;

    // Calculate raw decrease with all factors
    const rawDecrease = (baseDecrease + variance) * roundProgressionFactor * lossAdjustment;

    // Clamp between min and max, then round
    const clampedDecrease = Math.max(minHPDecrease, Math.min(maxHPDecrease, rawDecrease));

    return Math.round(clampedDecrease);
  }

  /**
   * Apply round result - decrease HP for the losing character.
   *
   * Requirement 3.2: Decrease loser's HP when wrong answer
   * Requirement 3.4: Calculate HP decrease based on remaining rounds
   * Requirement 3.6: HP never goes below 0
   *
   * @param loser - The character who lost this round
   * @param roundNumber - Current round number (1-50)
   * @returns Object containing updated HP values and the decrease amount
   */
  applyRoundResult(loser: SurvivalCharacter, roundNumber: number): RoundResultOutput {
    // Get current losses for the loser before incrementing
    const loserTotalLosses = loser === 'cat' ? this.catLosses : this.dogLosses;

    // Calculate HP decrease
    const hpDecrease = this.calculateHPDecrease(roundNumber, loserTotalLosses);

    // Apply HP decrease to the loser
    if (loser === 'cat') {
      this.catLosses++;
      // Requirement 3.6: HP never goes below 0
      this.catHP = Math.max(0, this.catHP - hpDecrease);
    } else {
      this.dogLosses++;
      // Requirement 3.6: HP never goes below 0
      this.dogHP = Math.max(0, this.dogHP - hpDecrease);
    }

    return {
      catHP: this.catHP,
      dogHP: this.dogHP,
      hpDecrease,
    };
  }

  /**
   * Get current HP state for both characters.
   *
   * @returns Object containing HP state for cat and dog
   */
  getHPState(): { cat: HPState; dog: HPState } {
    return {
      cat: {
        character: 'cat',
        currentHP: this.catHP,
        roundsLost: this.catLosses,
      },
      dog: {
        character: 'dog',
        currentHP: this.dogHP,
        roundsLost: this.dogLosses,
      },
    };
  }

  /**
   * Get final results of the survival game.
   * Winner is determined by who has more HP remaining,
   * or equivalently, who has fewer losses (more wins).
   *
   * @returns Final results including winner, HP values, and win counts
   */
  getFinalResults(): FinalResults {
    // Calculate wins (wins = total rounds - losses for each character)
    // Since one character wins each round, catWins = dogLosses and dogWins = catLosses
    const catWins = this.dogLosses;
    const dogWins = this.catLosses;

    // Winner is the character with more wins
    // In case of tie, the one with more HP wins (which should correlate with wins)
    let winner: SurvivalCharacter;
    if (catWins > dogWins) {
      winner = 'cat';
    } else if (dogWins > catWins) {
      winner = 'dog';
    } else {
      // Tie-breaker: character with more HP wins
      winner = this.catHP >= this.dogHP ? 'cat' : 'dog';
    }

    return {
      winner,
      catFinalHP: this.catHP,
      dogFinalHP: this.dogHP,
      catWins,
      dogWins,
    };
  }

  /**
   * Reset the HP system to initial state.
   * Useful for testing or starting a new game.
   */
  reset(): void {
    this.catHP = this.config.initialHP;
    this.dogHP = this.config.initialHP;
    this.catLosses = 0;
    this.dogLosses = 0;
  }
}
