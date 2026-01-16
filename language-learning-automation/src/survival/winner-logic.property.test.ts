import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRoundWinners, countWins } from './winner-logic';

/**
 * Feature: survival-quiz-longform, Property 9: Winner Randomization Distribution
 * Validates: Requirements 4.1
 *
 * For any large sample of generated winner sequences (1000+ rounds), the distribution
 * of cat vs dog wins SHALL be approximately 50/50 (within 40-60% range to account for variance).
 */
describe('Property 9: Winner Randomization Distribution', () => {
  /**
   * Property 9.1: Distribution is approximately 50/50 for large samples (1000+ rounds)
   * **Validates: Requirements 4.1**
   *
   * For any seed value, generating 1000+ rounds SHALL result in a distribution
   * where both cat and dog wins are within 40-60% of total rounds (wider range for statistical variance).
   */
  it('distribution is approximately 50/50 for 1000+ rounds with any seed', () => {
    // Generate arbitrary seeds to test randomization distribution
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const totalRounds = 1000;
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        const catPercentage = catWins / totalRounds;
        const dogPercentage = dogWins / totalRounds;

        // Distribution should be within 40-60% range (wider to account for statistical variance)
        expect(catPercentage).toBeGreaterThanOrEqual(0.4);
        expect(catPercentage).toBeLessThanOrEqual(0.6);
        expect(dogPercentage).toBeGreaterThanOrEqual(0.4);
        expect(dogPercentage).toBeLessThanOrEqual(0.6);

        return (
          catPercentage >= 0.4 &&
          catPercentage <= 0.6 &&
          dogPercentage >= 0.4 &&
          dogPercentage <= 0.6
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.2: Distribution is approximately 50/50 without seed (Math.random)
   * **Validates: Requirements 4.1**
   *
   * When no seed is provided, the distribution SHALL still be approximately 50/50.
   */
  it('distribution is approximately 50/50 for 1000+ rounds without seed', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const totalRounds = 1000;
        const decisions = generateRoundWinners(totalRounds);
        const { catWins, dogWins } = countWins(decisions);

        const catPercentage = catWins / totalRounds;
        const dogPercentage = dogWins / totalRounds;

        // Distribution should be within 45-55% range
        expect(catPercentage).toBeGreaterThanOrEqual(0.45);
        expect(catPercentage).toBeLessThanOrEqual(0.55);
        expect(dogPercentage).toBeGreaterThanOrEqual(0.45);
        expect(dogPercentage).toBeLessThanOrEqual(0.55);

        return (
          catPercentage >= 0.45 &&
          catPercentage <= 0.55 &&
          dogPercentage >= 0.45 &&
          dogPercentage <= 0.55
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.3: Distribution holds for larger sample sizes (2000+ rounds)
   * **Validates: Requirements 4.1**
   *
   * For larger sample sizes, the distribution should be even more stable
   * within the 45-55% range.
   */
  it('distribution is approximately 50/50 for 2000+ rounds', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const totalRounds = 2000;
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        const catPercentage = catWins / totalRounds;
        const dogPercentage = dogWins / totalRounds;

        // Distribution should be within 45-55% range
        expect(catPercentage).toBeGreaterThanOrEqual(0.45);
        expect(catPercentage).toBeLessThanOrEqual(0.55);
        expect(dogPercentage).toBeGreaterThanOrEqual(0.45);
        expect(dogPercentage).toBeLessThanOrEqual(0.55);

        return (
          catPercentage >= 0.45 &&
          catPercentage <= 0.55 &&
          dogPercentage >= 0.45 &&
          dogPercentage <= 0.55
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: Total wins always equals total rounds
   * **Validates: Requirements 4.1**
   *
   * For any sample size, catWins + dogWins SHALL equal the total number of rounds.
   */
  it('total wins always equals total rounds for any sample size', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1000, max: 5000 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins + dogWins).toBe(totalRounds);

        return catWins + dogWins === totalRounds;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.5: Each round has exactly one winner (cat or dog)
   * **Validates: Requirements 4.1**
   *
   * For any generated sequence, each round SHALL have exactly one winner
   * that is either 'cat' or 'dog'.
   */
  it('each round has exactly one valid winner (cat or dog)', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const totalRounds = 1000;
        const decisions = generateRoundWinners(totalRounds, seed);

        for (const decision of decisions) {
          expect(['cat', 'dog']).toContain(decision.winner);
          expect(['cat', 'dog']).toContain(decision.loser);
          expect(decision.winner).not.toBe(decision.loser);
        }

        return decisions.every(
          (d) =>
            (d.winner === 'cat' || d.winner === 'dog') &&
            (d.loser === 'cat' || d.loser === 'dog') &&
            d.winner !== d.loser
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.6: Seeded randomization is reproducible
   * **Validates: Requirements 4.1**
   *
   * For any seed value, generating the same number of rounds SHALL produce
   * identical results.
   */
  it('seeded randomization produces reproducible results', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1000, max: 2000 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions1 = generateRoundWinners(totalRounds, seed);
        const decisions2 = generateRoundWinners(totalRounds, seed);

        // Both sequences should be identical
        expect(decisions1).toEqual(decisions2);

        // Win counts should also be identical
        const counts1 = countWins(decisions1);
        const counts2 = countWins(decisions2);
        expect(counts1).toEqual(counts2);

        return (
          JSON.stringify(decisions1) === JSON.stringify(decisions2) &&
          counts1.catWins === counts2.catWins &&
          counts1.dogWins === counts2.dogWins
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.7: Different seeds produce different distributions
   * **Validates: Requirements 4.1**
   *
   * For different seed values, the generated sequences SHALL be different
   * (with very high probability).
   */
  it('different seeds produce different sequences', () => {
    const seedPairArb = fc
      .tuple(fc.integer({ min: 0, max: 2147483647 }), fc.integer({ min: 0, max: 2147483647 }))
      .filter(([seed1, seed2]) => seed1 !== seed2);

    fc.assert(
      fc.property(seedPairArb, ([seed1, seed2]) => {
        const totalRounds = 1000;
        const decisions1 = generateRoundWinners(totalRounds, seed1);
        const decisions2 = generateRoundWinners(totalRounds, seed2);

        // Count how many rounds have the same winner
        const sameWinnerCount = decisions1.filter(
          (d, i) => d.winner === decisions2[i].winner
        ).length;

        // With different seeds, it's extremely unlikely to have all same winners
        // Allow up to 90% same (very generous, actual should be ~50%)
        expect(sameWinnerCount).toBeLessThan(totalRounds * 0.9);

        return sameWinnerCount < totalRounds * 0.9;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.8: Distribution variance is bounded
   * **Validates: Requirements 4.1**
   *
   * For multiple independent samples, the variance in distribution
   * SHALL be bounded (no extreme outliers). Using a wider range (40-60%)
   * to account for natural variance in smaller sample sizes.
   */
  it('distribution variance is bounded across multiple samples', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const totalRounds = 1000;
        const sampleCount = 10;
        const catPercentages: number[] = [];

        for (let i = 0; i < sampleCount; i++) {
          const decisions = generateRoundWinners(totalRounds);
          const { catWins } = countWins(decisions);
          catPercentages.push(catWins / totalRounds);
        }

        // All samples should be within 40-60% range (wider to account for variance)
        for (const percentage of catPercentages) {
          expect(percentage).toBeGreaterThanOrEqual(0.4);
          expect(percentage).toBeLessThanOrEqual(0.6);
        }

        return catPercentages.every((p) => p >= 0.4 && p <= 0.6);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.9: Randomization uses approximately 50/50 probability
   * **Validates: Requirements 4.1**
   *
   * The underlying randomization mechanism SHALL use approximately 50/50
   * probability for cat vs dog wins.
   */
  it('randomization uses approximately 50/50 probability', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        // Generate a very large sample to test probability
        const totalRounds = 5000;
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        const catPercentage = catWins / totalRounds;
        const dogPercentage = dogWins / totalRounds;

        // With 5000 samples, distribution should be very close to 50%
        // Using 45-55% range as specified in requirements
        expect(catPercentage).toBeGreaterThanOrEqual(0.45);
        expect(catPercentage).toBeLessThanOrEqual(0.55);
        expect(dogPercentage).toBeGreaterThanOrEqual(0.45);
        expect(dogPercentage).toBeLessThanOrEqual(0.55);

        return (
          catPercentage >= 0.45 &&
          catPercentage <= 0.55 &&
          dogPercentage >= 0.45 &&
          dogPercentage <= 0.55
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.10: Distribution holds for the standard 50-round game
   * **Validates: Requirements 4.1**
   *
   * Note: For smaller samples like 50 rounds, the distribution may vary more,
   * but over many games, the average should still be approximately 50/50.
   */
  it('average distribution across many 50-round games is approximately 50/50', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const roundsPerGame = 50;
        const gameCount = 100;
        let totalCatWins = 0;
        let totalDogWins = 0;

        for (let i = 0; i < gameCount; i++) {
          const decisions = generateRoundWinners(roundsPerGame);
          const { catWins, dogWins } = countWins(decisions);
          totalCatWins += catWins;
          totalDogWins += dogWins;
        }

        const totalRounds = roundsPerGame * gameCount;
        const catPercentage = totalCatWins / totalRounds;
        const dogPercentage = totalDogWins / totalRounds;

        // Average across many games should be within 45-55% range
        expect(catPercentage).toBeGreaterThanOrEqual(0.45);
        expect(catPercentage).toBeLessThanOrEqual(0.55);
        expect(dogPercentage).toBeGreaterThanOrEqual(0.45);
        expect(dogPercentage).toBeLessThanOrEqual(0.55);

        return (
          catPercentage >= 0.45 &&
          catPercentage <= 0.55 &&
          dogPercentage >= 0.45 &&
          dogPercentage <= 0.55
        );
      }),
      { numRuns: 100 }
    );
  });
});

import { assignExpressionsToCharacters, determineFinalWinner } from './winner-logic';
import { SurvivalCharacter } from './types';

/**
 * Feature: survival-quiz-longform, Property 11: Win Tracking Sum
 * Validates: Requirements 4.3
 *
 * For any completed SurvivalScript, catWins + dogWins SHALL equal exactly 50 (total rounds).
 */
describe('Property 11: Win Tracking Sum', () => {
  /**
   * Property 11.1: catWins + dogWins always equals total rounds
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, the sum of cat wins and dog wins
   * SHALL equal exactly the total number of rounds.
   */
  it('catWins + dogWins always equals total rounds for standard 50-round game', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const totalRounds = 50;
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins + dogWins).toBe(totalRounds);

        return catWins + dogWins === totalRounds;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: Win sum equals total rounds for any round count
   * **Validates: Requirements 4.3**
   *
   * For any arbitrary number of rounds, catWins + dogWins SHALL equal
   * exactly that number of rounds.
   */
  it('catWins + dogWins equals total rounds for any round count', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 200 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins + dogWins).toBe(totalRounds);
        expect(decisions.length).toBe(totalRounds);

        return catWins + dogWins === totalRounds && decisions.length === totalRounds;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: Win counts are non-negative
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, both catWins and dogWins
   * SHALL be non-negative integers.
   */
  it('win counts are always non-negative', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins).toBeGreaterThanOrEqual(0);
        expect(dogWins).toBeGreaterThanOrEqual(0);

        return catWins >= 0 && dogWins >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.4: Win counts are bounded by total rounds
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, both catWins and dogWins
   * SHALL be less than or equal to the total number of rounds.
   */
  it('win counts are bounded by total rounds', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins).toBeLessThanOrEqual(totalRounds);
        expect(dogWins).toBeLessThanOrEqual(totalRounds);

        return catWins <= totalRounds && dogWins <= totalRounds;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.5: Win counts are consistent with round decisions
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, the win counts SHALL match
   * the actual count of winners in the decisions array.
   */
  it('win counts are consistent with round decisions', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        // Manually count winners from decisions
        const manualCatWins = decisions.filter((d) => d.winner === 'cat').length;
        const manualDogWins = decisions.filter((d) => d.winner === 'dog').length;

        expect(catWins).toBe(manualCatWins);
        expect(dogWins).toBe(manualDogWins);

        return catWins === manualCatWins && dogWins === manualDogWins;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.6: Win counts are integers
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, both catWins and dogWins
   * SHALL be integers (not floating point numbers).
   */
  it('win counts are always integers', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(Number.isInteger(catWins)).toBe(true);
        expect(Number.isInteger(dogWins)).toBe(true);

        return Number.isInteger(catWins) && Number.isInteger(dogWins);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.7: Win sum is preserved without seed (Math.random)
   * **Validates: Requirements 4.3**
   *
   * When no seed is provided, the win sum SHALL still equal total rounds.
   */
  it('win sum equals total rounds without seed', () => {
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(roundCountArb, (totalRounds) => {
        const decisions = generateRoundWinners(totalRounds);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins + dogWins).toBe(totalRounds);

        return catWins + dogWins === totalRounds;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.8: Each round contributes exactly one win
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, each round SHALL contribute
   * exactly one win to either cat or dog (not both, not neither).
   */
  it('each round contributes exactly one win', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);

        // Each decision should have exactly one winner (cat or dog)
        for (const decision of decisions) {
          expect(['cat', 'dog']).toContain(decision.winner);
          // Winner and loser should be different
          expect(decision.winner).not.toBe(decision.loser);
        }

        // Total wins should equal total rounds
        const { catWins, dogWins } = countWins(decisions);
        expect(catWins + dogWins).toBe(totalRounds);

        return (
          decisions.every(
            (d) => (d.winner === 'cat' || d.winner === 'dog') && d.winner !== d.loser
          ) && catWins + dogWins === totalRounds
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.9: Win tracking is consistent across multiple counts
   * **Validates: Requirements 4.3**
   *
   * For any generated winner sequence, counting wins multiple times
   * SHALL produce the same result.
   */
  it('win tracking is consistent across multiple counts', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const totalRounds = 50;
        const decisions = generateRoundWinners(totalRounds, seed);

        // Count wins multiple times
        const count1 = countWins(decisions);
        const count2 = countWins(decisions);
        const count3 = countWins(decisions);

        expect(count1).toEqual(count2);
        expect(count2).toEqual(count3);
        expect(count1.catWins + count1.dogWins).toBe(totalRounds);

        return (
          count1.catWins === count2.catWins &&
          count1.dogWins === count2.dogWins &&
          count2.catWins === count3.catWins &&
          count2.dogWins === count3.dogWins &&
          count1.catWins + count1.dogWins === totalRounds
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.10: Win sum holds for edge case of single round
   * **Validates: Requirements 4.3**
   *
   * For a single round game, catWins + dogWins SHALL equal 1.
   */
  it('win sum equals 1 for single round game', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const decisions = generateRoundWinners(1, seed);
        const { catWins, dogWins } = countWins(decisions);

        expect(catWins + dogWins).toBe(1);
        expect(catWins === 1 || dogWins === 1).toBe(true);
        expect(catWins === 0 || dogWins === 0).toBe(true);

        return (
          catWins + dogWins === 1 &&
          (catWins === 1 || dogWins === 1) &&
          (catWins === 0 || dogWins === 0)
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 10: Answer Assignment Correctness
 * Validates: Requirements 4.2
 *
 * For any SurvivalRound, the loser character (opposite of winner) SHALL have
 * the konglishAnswer, and the winner character SHALL have the nativeAnswer.
 */
describe('Property 10: Answer Assignment Correctness', () => {
  /**
   * Property 10.1: Winner always gets the native (correct) answer
   * **Validates: Requirements 4.2**
   *
   * For any winner character and any expression pair, the winner SHALL
   * be assigned the nativeAnswer.
   */
  it('winner always gets the native (correct) answer', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(winnerArb, konglishArb, nativeArb, (winner, konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, winner);

        // Winner should have the native answer
        expect(result.nativeAnswer.character).toBe(winner);
        expect(result.nativeAnswer.text).toBe(native);

        return result.nativeAnswer.character === winner && result.nativeAnswer.text === native;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: Loser always gets the konglish (wrong) answer
   * **Validates: Requirements 4.2**
   *
   * For any winner character and any expression pair, the loser (opposite of winner)
   * SHALL be assigned the konglishAnswer.
   */
  it('loser always gets the konglish (wrong) answer', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(winnerArb, konglishArb, nativeArb, (winner, konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, winner);
        const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';

        // Loser should have the konglish answer
        expect(result.konglishAnswer.character).toBe(loser);
        expect(result.konglishAnswer.text).toBe(konglish);

        return result.konglishAnswer.character === loser && result.konglishAnswer.text === konglish;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: Winner and loser are always different characters
   * **Validates: Requirements 4.2**
   *
   * For any expression assignment, the character with the konglishAnswer
   * SHALL be different from the character with the nativeAnswer.
   */
  it('winner and loser are always different characters', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(winnerArb, konglishArb, nativeArb, (winner, konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, winner);

        // Characters should be different
        expect(result.konglishAnswer.character).not.toBe(result.nativeAnswer.character);

        return result.konglishAnswer.character !== result.nativeAnswer.character;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.4: Answer assignment is deterministic for same inputs
   * **Validates: Requirements 4.2**
   *
   * For any given winner, konglish text, and native text, the assignment
   * SHALL always produce the same result.
   */
  it('answer assignment is deterministic for same inputs', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(winnerArb, konglishArb, nativeArb, (winner, konglish, native) => {
        const result1 = assignExpressionsToCharacters(konglish, native, winner);
        const result2 = assignExpressionsToCharacters(konglish, native, winner);

        // Results should be identical
        expect(result1).toEqual(result2);

        return JSON.stringify(result1) === JSON.stringify(result2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: Cat winner means dog gets konglish
   * **Validates: Requirements 4.2**
   *
   * When cat is the winner, dog SHALL always have the konglishAnswer.
   */
  it('cat winner means dog gets konglish answer', () => {
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(konglishArb, nativeArb, (konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, 'cat');

        expect(result.konglishAnswer.character).toBe('dog');
        expect(result.nativeAnswer.character).toBe('cat');

        return result.konglishAnswer.character === 'dog' && result.nativeAnswer.character === 'cat';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.6: Dog winner means cat gets konglish
   * **Validates: Requirements 4.2**
   *
   * When dog is the winner, cat SHALL always have the konglishAnswer.
   */
  it('dog winner means cat gets konglish answer', () => {
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(konglishArb, nativeArb, (konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, 'dog');

        expect(result.konglishAnswer.character).toBe('cat');
        expect(result.nativeAnswer.character).toBe('dog');

        return result.konglishAnswer.character === 'cat' && result.nativeAnswer.character === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.7: Text content is preserved exactly
   * **Validates: Requirements 4.2**
   *
   * The konglish and native text SHALL be preserved exactly in the result,
   * without any modification.
   */
  it('text content is preserved exactly', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    // Include various characters including unicode, spaces, special chars
    const textArb = fc.string({ minLength: 1, maxLength: 200 });

    fc.assert(
      fc.property(winnerArb, textArb, textArb, (winner, konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, winner);

        // Text should be preserved exactly
        expect(result.konglishAnswer.text).toBe(konglish);
        expect(result.nativeAnswer.text).toBe(native);

        return result.konglishAnswer.text === konglish && result.nativeAnswer.text === native;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.8: Both answers are always assigned to valid characters
   * **Validates: Requirements 4.2**
   *
   * Both konglishAnswer.character and nativeAnswer.character SHALL be
   * valid SurvivalCharacter values ('cat' or 'dog').
   */
  it('both answers are always assigned to valid characters', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(winnerArb, konglishArb, nativeArb, (winner, konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, winner);

        // Both characters should be valid
        expect(['cat', 'dog']).toContain(result.konglishAnswer.character);
        expect(['cat', 'dog']).toContain(result.nativeAnswer.character);

        return (
          (result.konglishAnswer.character === 'cat' ||
            result.konglishAnswer.character === 'dog') &&
          (result.nativeAnswer.character === 'cat' || result.nativeAnswer.character === 'dog')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.9: Assignment covers all character combinations
   * **Validates: Requirements 4.2**
   *
   * The assignment function SHALL correctly handle both possible winners
   * (cat and dog) and produce correct loser assignments.
   */
  it('assignment covers all character combinations correctly', () => {
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(konglishArb, nativeArb, (konglish, native) => {
        // Test cat as winner
        const catWinResult = assignExpressionsToCharacters(konglish, native, 'cat');
        expect(catWinResult.nativeAnswer.character).toBe('cat');
        expect(catWinResult.konglishAnswer.character).toBe('dog');

        // Test dog as winner
        const dogWinResult = assignExpressionsToCharacters(konglish, native, 'dog');
        expect(dogWinResult.nativeAnswer.character).toBe('dog');
        expect(dogWinResult.konglishAnswer.character).toBe('cat');

        return (
          catWinResult.nativeAnswer.character === 'cat' &&
          catWinResult.konglishAnswer.character === 'dog' &&
          dogWinResult.nativeAnswer.character === 'dog' &&
          dogWinResult.konglishAnswer.character === 'cat'
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.10: Result structure is complete
   * **Validates: Requirements 4.2**
   *
   * The result SHALL always contain both konglishAnswer and nativeAnswer
   * objects, each with text and character properties.
   */
  it('result structure is always complete', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const konglishArb = fc.string({ minLength: 1, maxLength: 100 });
    const nativeArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(winnerArb, konglishArb, nativeArb, (winner, konglish, native) => {
        const result = assignExpressionsToCharacters(konglish, native, winner);

        // Check structure completeness
        expect(result).toHaveProperty('konglishAnswer');
        expect(result).toHaveProperty('nativeAnswer');
        expect(result.konglishAnswer).toHaveProperty('text');
        expect(result.konglishAnswer).toHaveProperty('character');
        expect(result.nativeAnswer).toHaveProperty('text');
        expect(result.nativeAnswer).toHaveProperty('character');

        return (
          'konglishAnswer' in result &&
          'nativeAnswer' in result &&
          'text' in result.konglishAnswer &&
          'character' in result.konglishAnswer &&
          'text' in result.nativeAnswer &&
          'character' in result.nativeAnswer
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 12: Final Winner Determination
 * Validates: Requirements 4.5
 *
 * For any SurvivalScript ending, the winner field SHALL match the character with
 * more round wins (catWins > dogWins → cat wins, dogWins > catWins → dog wins).
 */
describe('Property 12: Final Winner Determination', () => {
  /**
   * Property 12.1: Character with more wins is the final winner
   * **Validates: Requirements 4.5**
   *
   * For any generated winner sequence, the character with more round wins
   * SHALL be determined as the final winner.
   */
  it('character with more wins is the final winner', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);
        const finalWinner = determineFinalWinner(decisions);

        if (catWins > dogWins) {
          expect(finalWinner).toBe('cat');
          return finalWinner === 'cat';
        } else if (dogWins > catWins) {
          expect(finalWinner).toBe('dog');
          return finalWinner === 'dog';
        } else {
          // Tie case - cat wins (deterministic tie-breaker)
          expect(finalWinner).toBe('cat');
          return finalWinner === 'cat';
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: Cat wins ties (deterministic tie-breaker)
   * **Validates: Requirements 4.5**
   *
   * When catWins equals dogWins (tie), cat SHALL be the final winner
   * as a deterministic tie-breaker.
   */
  it('cat wins ties as deterministic tie-breaker', () => {
    // Generate even number of rounds to allow for ties
    const evenRoundCountArb = fc.integer({ min: 1, max: 50 }).map((n) => n * 2);

    fc.assert(
      fc.property(evenRoundCountArb, (totalRounds) => {
        // Create a perfectly tied scenario manually
        const decisions: WinnerDecision[] = [];
        for (let i = 1; i <= totalRounds; i++) {
          // Alternate winners to create a tie
          const winner: SurvivalCharacter = i % 2 === 1 ? 'cat' : 'dog';
          const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';
          decisions.push({ roundId: i, winner, loser });
        }

        const { catWins, dogWins } = countWins(decisions);
        expect(catWins).toBe(dogWins); // Verify it's a tie

        const finalWinner = determineFinalWinner(decisions);
        expect(finalWinner).toBe('cat'); // Cat wins ties

        return catWins === dogWins && finalWinner === 'cat';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.3: Final winner is always a valid character ('cat' or 'dog')
   * **Validates: Requirements 4.5**
   *
   * For any generated winner sequence, the final winner SHALL always be
   * a valid SurvivalCharacter ('cat' or 'dog').
   */
  it('final winner is always a valid character', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 200 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const finalWinner = determineFinalWinner(decisions);

        expect(['cat', 'dog']).toContain(finalWinner);

        return finalWinner === 'cat' || finalWinner === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.4: Final winner determination is deterministic
   * **Validates: Requirements 4.5**
   *
   * For any given winner sequence, calling determineFinalWinner multiple times
   * SHALL always produce the same result.
   */
  it('final winner determination is deterministic', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const decisions = generateRoundWinners(50, seed);

        const winner1 = determineFinalWinner(decisions);
        const winner2 = determineFinalWinner(decisions);
        const winner3 = determineFinalWinner(decisions);

        expect(winner1).toBe(winner2);
        expect(winner2).toBe(winner3);

        return winner1 === winner2 && winner2 === winner3;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.5: Cat wins when catWins > dogWins
   * **Validates: Requirements 4.5**
   *
   * When cat has strictly more wins than dog, cat SHALL be the final winner.
   */
  it('cat wins when catWins > dogWins', () => {
    // Generate scenarios where cat has more wins
    const catWinsArb = fc.integer({ min: 1, max: 50 });
    const dogWinsArb = fc.integer({ min: 0, max: 49 });

    fc.assert(
      fc.property(
        catWinsArb,
        dogWinsArb.filter((d) => true), // Will filter below
        (catWinCount, dogWinCount) => {
          // Ensure cat has more wins
          if (catWinCount <= dogWinCount) {
            return true; // Skip this case
          }

          // Create decisions with specified win counts
          const decisions: WinnerDecision[] = [];
          let roundId = 1;

          // Add cat wins
          for (let i = 0; i < catWinCount; i++) {
            decisions.push({ roundId: roundId++, winner: 'cat', loser: 'dog' });
          }

          // Add dog wins
          for (let i = 0; i < dogWinCount; i++) {
            decisions.push({ roundId: roundId++, winner: 'dog', loser: 'cat' });
          }

          const finalWinner = determineFinalWinner(decisions);
          expect(finalWinner).toBe('cat');

          return finalWinner === 'cat';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.6: Dog wins when dogWins > catWins
   * **Validates: Requirements 4.5**
   *
   * When dog has strictly more wins than cat, dog SHALL be the final winner.
   */
  it('dog wins when dogWins > catWins', () => {
    // Generate scenarios where dog has more wins
    const dogWinsArb = fc.integer({ min: 1, max: 50 });
    const catWinsArb = fc.integer({ min: 0, max: 49 });

    fc.assert(
      fc.property(dogWinsArb, catWinsArb, (dogWinCount, catWinCount) => {
        // Ensure dog has more wins
        if (dogWinCount <= catWinCount) {
          return true; // Skip this case
        }

        // Create decisions with specified win counts
        const decisions: WinnerDecision[] = [];
        let roundId = 1;

        // Add dog wins
        for (let i = 0; i < dogWinCount; i++) {
          decisions.push({ roundId: roundId++, winner: 'dog', loser: 'cat' });
        }

        // Add cat wins
        for (let i = 0; i < catWinCount; i++) {
          decisions.push({ roundId: roundId++, winner: 'cat', loser: 'dog' });
        }

        const finalWinner = determineFinalWinner(decisions);
        expect(finalWinner).toBe('dog');

        return finalWinner === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.7: Final winner is consistent with win counts
   * **Validates: Requirements 4.5**
   *
   * The final winner determination SHALL be consistent with the actual
   * win counts from the decisions array.
   */
  it('final winner is consistent with win counts', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(seedArb, roundCountArb, (seed, totalRounds) => {
        const decisions = generateRoundWinners(totalRounds, seed);
        const { catWins, dogWins } = countWins(decisions);
        const finalWinner = determineFinalWinner(decisions);

        // Verify consistency
        if (catWins > dogWins) {
          expect(finalWinner).toBe('cat');
        } else if (dogWins > catWins) {
          expect(finalWinner).toBe('dog');
        } else {
          expect(finalWinner).toBe('cat'); // Tie-breaker
        }

        const expectedWinner = catWins > dogWins ? 'cat' : dogWins > catWins ? 'dog' : 'cat';
        return finalWinner === expectedWinner;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.8: Empty decisions array handling
   * **Validates: Requirements 4.5**
   *
   * For an empty decisions array (edge case), the function SHALL return
   * a valid character (cat wins by default as tie-breaker with 0-0).
   */
  it('empty decisions array returns cat (0-0 tie)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const decisions: WinnerDecision[] = [];
        const finalWinner = determineFinalWinner(decisions);

        // 0-0 is a tie, cat wins
        expect(finalWinner).toBe('cat');

        return finalWinner === 'cat';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.9: Single round determines winner correctly
   * **Validates: Requirements 4.5**
   *
   * For a single round game, the round winner SHALL be the final winner.
   */
  it('single round winner is the final winner', () => {
    const winnerArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');

    fc.assert(
      fc.property(winnerArb, (roundWinner) => {
        const loser: SurvivalCharacter = roundWinner === 'cat' ? 'dog' : 'cat';
        const decisions: WinnerDecision[] = [{ roundId: 1, winner: roundWinner, loser }];

        const finalWinner = determineFinalWinner(decisions);
        expect(finalWinner).toBe(roundWinner);

        return finalWinner === roundWinner;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.10: Standard 50-round game final winner determination
   * **Validates: Requirements 4.5**
   *
   * For the standard 50-round game, the final winner SHALL be correctly
   * determined based on round wins.
   */
  it('standard 50-round game determines final winner correctly', () => {
    const seedArb = fc.integer({ min: 0, max: 2147483647 });

    fc.assert(
      fc.property(seedArb, (seed) => {
        const decisions = generateRoundWinners(50, seed);
        const { catWins, dogWins } = countWins(decisions);
        const finalWinner = determineFinalWinner(decisions);

        // Verify total rounds
        expect(catWins + dogWins).toBe(50);

        // Verify winner determination
        if (catWins > dogWins) {
          expect(finalWinner).toBe('cat');
        } else if (dogWins > catWins) {
          expect(finalWinner).toBe('dog');
        } else {
          expect(finalWinner).toBe('cat'); // 25-25 tie, cat wins
        }

        return (
          catWins + dogWins === 50 &&
          ((catWins > dogWins && finalWinner === 'cat') ||
            (dogWins > catWins && finalWinner === 'dog') ||
            (catWins === dogWins && finalWinner === 'cat'))
        );
      }),
      { numRuns: 100 }
    );
  });
});
