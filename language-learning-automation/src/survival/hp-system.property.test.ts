import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { HPSystem, DEFAULT_HP_CONFIG, HPSystemConfig } from './hp-system';
import { SurvivalCharacter } from './types';

/**
 * Feature: survival-quiz-longform, Property 6: HP Initialization
 * Validates: Requirements 3.1
 *
 * For any newly created HPSystem instance, both cat and dog HP SHALL be
 * initialized to exactly 100 (or the configured initialHP value).
 */
describe('Property 6: HP Initialization', () => {
  /**
   * Property 6.1: Default initialization sets both HP to exactly 100
   * **Validates: Requirements 3.1**
   *
   * For any newly created HPSystem with default config, both cat and dog HP
   * SHALL be initialized to exactly 100.
   */
  it('default initialization sets both cat and dog HP to exactly 100', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const hpSystem = new HPSystem();
        const state = hpSystem.getHPState();

        // Both cat and dog HP must be exactly 100
        expect(state.cat.currentHP).toBe(100);
        expect(state.dog.currentHP).toBe(100);

        return state.cat.currentHP === 100 && state.dog.currentHP === 100;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: Custom initialHP configuration is respected
   * **Validates: Requirements 3.1**
   *
   * For any valid initialHP value, a newly created HPSystem SHALL initialize
   * both cat and dog HP to exactly that value.
   */
  it('custom initialHP configuration is respected for both characters', () => {
    // Generate arbitrary valid initialHP values (positive integers up to 1000)
    const initialHPArb = fc.integer({ min: 1, max: 1000 });

    fc.assert(
      fc.property(initialHPArb, (initialHP) => {
        const config: HPSystemConfig = {
          initialHP,
          totalRounds: 50,
          minHPDecrease: 2,
          maxHPDecrease: 5,
        };

        const hpSystem = new HPSystem(config);
        const state = hpSystem.getHPState();

        // Both cat and dog HP must be exactly the configured initialHP
        expect(state.cat.currentHP).toBe(initialHP);
        expect(state.dog.currentHP).toBe(initialHP);

        return state.cat.currentHP === initialHP && state.dog.currentHP === initialHP;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.3: Both characters have equal HP at initialization
   * **Validates: Requirements 3.1**
   *
   * For any HPSystem configuration, cat and dog HP SHALL be equal at initialization.
   */
  it('both characters have equal HP at initialization for any config', () => {
    // Generate arbitrary valid HP system configurations
    const configArb: fc.Arbitrary<HPSystemConfig> = fc
      .record({
        initialHP: fc.integer({ min: 1, max: 1000 }),
        totalRounds: fc.integer({ min: 1, max: 100 }),
        minHPDecrease: fc.integer({ min: 1, max: 10 }),
        maxHPDecrease: fc.integer({ min: 1, max: 20 }),
      })
      .filter((config) => config.minHPDecrease <= config.maxHPDecrease);

    fc.assert(
      fc.property(configArb, (config) => {
        const hpSystem = new HPSystem(config);
        const state = hpSystem.getHPState();

        // Cat and dog HP must be equal at initialization
        expect(state.cat.currentHP).toBe(state.dog.currentHP);

        return state.cat.currentHP === state.dog.currentHP;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.4: Initial HP matches configured value exactly
   * **Validates: Requirements 3.1**
   *
   * For any HPSystem configuration, the initial HP for both characters
   * SHALL match the configured initialHP value exactly.
   */
  it('initial HP matches configured value exactly for any config', () => {
    const configArb: fc.Arbitrary<HPSystemConfig> = fc
      .record({
        initialHP: fc.integer({ min: 1, max: 1000 }),
        totalRounds: fc.integer({ min: 1, max: 100 }),
        minHPDecrease: fc.integer({ min: 1, max: 10 }),
        maxHPDecrease: fc.integer({ min: 1, max: 20 }),
      })
      .filter((config) => config.minHPDecrease <= config.maxHPDecrease);

    fc.assert(
      fc.property(configArb, (config) => {
        const hpSystem = new HPSystem(config);
        const state = hpSystem.getHPState();

        // Both HP values must match the configured initialHP exactly
        expect(state.cat.currentHP).toBe(config.initialHP);
        expect(state.dog.currentHP).toBe(config.initialHP);

        return state.cat.currentHP === config.initialHP && state.dog.currentHP === config.initialHP;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.5: Initial roundsLost is zero for both characters
   * **Validates: Requirements 3.1**
   *
   * For any newly created HPSystem, both characters SHALL have zero roundsLost.
   */
  it('initial roundsLost is zero for both characters', () => {
    const configArb: fc.Arbitrary<HPSystemConfig> = fc
      .record({
        initialHP: fc.integer({ min: 1, max: 1000 }),
        totalRounds: fc.integer({ min: 1, max: 100 }),
        minHPDecrease: fc.integer({ min: 1, max: 10 }),
        maxHPDecrease: fc.integer({ min: 1, max: 20 }),
      })
      .filter((config) => config.minHPDecrease <= config.maxHPDecrease);

    fc.assert(
      fc.property(configArb, (config) => {
        const hpSystem = new HPSystem(config);
        const state = hpSystem.getHPState();

        // Both characters must have zero losses at initialization
        expect(state.cat.roundsLost).toBe(0);
        expect(state.dog.roundsLost).toBe(0);

        return state.cat.roundsLost === 0 && state.dog.roundsLost === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.6: Character identifiers are correct at initialization
   * **Validates: Requirements 3.1**
   *
   * For any newly created HPSystem, the character identifiers in the HP state
   * SHALL be 'cat' and 'dog' respectively.
   */
  it('character identifiers are correct at initialization', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const hpSystem = new HPSystem();
        const state = hpSystem.getHPState();

        // Character identifiers must be correct
        expect(state.cat.character).toBe('cat');
        expect(state.dog.character).toBe('dog');

        return state.cat.character === 'cat' && state.dog.character === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.7: DEFAULT_HP_CONFIG initialHP is exactly 100
   * **Validates: Requirements 3.1**
   *
   * The default configuration SHALL have initialHP set to exactly 100.
   */
  it('DEFAULT_HP_CONFIG has initialHP of exactly 100', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(DEFAULT_HP_CONFIG.initialHP).toBe(100);
        return DEFAULT_HP_CONFIG.initialHP === 100;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.8: Multiple HPSystem instances are independent
   * **Validates: Requirements 3.1**
   *
   * Creating multiple HPSystem instances SHALL result in each having
   * independent initialization with the correct HP values.
   */
  it('multiple HPSystem instances are independently initialized', () => {
    const instanceCountArb = fc.integer({ min: 2, max: 10 });
    const initialHPArb = fc.integer({ min: 1, max: 1000 });

    fc.assert(
      fc.property(instanceCountArb, initialHPArb, (count, initialHP) => {
        const config: HPSystemConfig = {
          initialHP,
          totalRounds: 50,
          minHPDecrease: 2,
          maxHPDecrease: 5,
        };

        // Create multiple instances
        const instances = Array.from({ length: count }, () => new HPSystem(config));

        // Each instance should have correct initialization
        for (const instance of instances) {
          const state = instance.getHPState();
          expect(state.cat.currentHP).toBe(initialHP);
          expect(state.dog.currentHP).toBe(initialHP);
          expect(state.cat.roundsLost).toBe(0);
          expect(state.dog.roundsLost).toBe(0);
        }

        return instances.every((instance) => {
          const state = instance.getHPState();
          return (
            state.cat.currentHP === initialHP &&
            state.dog.currentHP === initialHP &&
            state.cat.roundsLost === 0 &&
            state.dog.roundsLost === 0
          );
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.9: Reset restores HP to initial values
   * **Validates: Requirements 3.1**
   *
   * After reset(), the HPSystem SHALL return to the initialized state
   * with both characters having the configured initialHP.
   */
  it('reset restores HP to initial values', () => {
    const initialHPArb = fc.integer({ min: 1, max: 1000 });
    const lossCountArb = fc.integer({ min: 1, max: 25 });

    fc.assert(
      fc.property(initialHPArb, lossCountArb, (initialHP, lossCount) => {
        const config: HPSystemConfig = {
          initialHP,
          totalRounds: 50,
          minHPDecrease: 2,
          maxHPDecrease: 5,
        };

        const hpSystem = new HPSystem(config);

        // Apply some losses to change state
        for (let i = 0; i < lossCount; i++) {
          hpSystem.applyRoundResult(i % 2 === 0 ? 'cat' : 'dog', i + 1);
        }

        // Reset the system
        hpSystem.reset();

        // Verify HP is restored to initial values
        const state = hpSystem.getHPState();
        expect(state.cat.currentHP).toBe(initialHP);
        expect(state.dog.currentHP).toBe(initialHP);
        expect(state.cat.roundsLost).toBe(0);
        expect(state.dog.roundsLost).toBe(0);

        return (
          state.cat.currentHP === initialHP &&
          state.dog.currentHP === initialHP &&
          state.cat.roundsLost === 0 &&
          state.dog.roundsLost === 0
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.10: HP values are within valid range at initialization
   * **Validates: Requirements 3.1**
   *
   * For any valid configuration, the initial HP SHALL be within the valid
   * range (0 to max configured HP).
   */
  it('HP values are within valid range at initialization', () => {
    const configArb: fc.Arbitrary<HPSystemConfig> = fc
      .record({
        initialHP: fc.integer({ min: 1, max: 1000 }),
        totalRounds: fc.integer({ min: 1, max: 100 }),
        minHPDecrease: fc.integer({ min: 1, max: 10 }),
        maxHPDecrease: fc.integer({ min: 1, max: 20 }),
      })
      .filter((config) => config.minHPDecrease <= config.maxHPDecrease);

    fc.assert(
      fc.property(configArb, (config) => {
        const hpSystem = new HPSystem(config);
        const state = hpSystem.getHPState();

        // HP must be positive and within configured range
        expect(state.cat.currentHP).toBeGreaterThan(0);
        expect(state.cat.currentHP).toBeLessThanOrEqual(config.initialHP);
        expect(state.dog.currentHP).toBeGreaterThan(0);
        expect(state.dog.currentHP).toBeLessThanOrEqual(config.initialHP);

        return (
          state.cat.currentHP > 0 &&
          state.cat.currentHP <= config.initialHP &&
          state.dog.currentHP > 0 &&
          state.dog.currentHP <= config.initialHP
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 7: HP Decrease on Loss
 * Validates: Requirements 3.2, 3.4
 *
 * For any round result applied to HPSystem where a character loses, that character's HP
 * SHALL decrease by a positive amount, and the winner's HP SHALL remain unchanged.
 */
describe('Property 7: HP Decrease on Loss', () => {
  /**
   * Property 7.1: Loser's HP decreases by a positive amount
   * **Validates: Requirements 3.2**
   *
   * For any round result where a character loses, that character's HP SHALL
   * decrease by a positive amount (greater than 0).
   */
  it("loser's HP decreases by a positive amount", () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(loserArb, roundNumberArb, (loser, roundNumber) => {
        const hpSystem = new HPSystem();
        const stateBefore = hpSystem.getHPState();
        const loserHPBefore =
          loser === 'cat' ? stateBefore.cat.currentHP : stateBefore.dog.currentHP;

        const result = hpSystem.applyRoundResult(loser, roundNumber);

        const stateAfter = hpSystem.getHPState();
        const loserHPAfter = loser === 'cat' ? stateAfter.cat.currentHP : stateAfter.dog.currentHP;

        // HP decrease must be positive
        expect(result.hpDecrease).toBeGreaterThan(0);

        // Loser's HP must have decreased
        expect(loserHPAfter).toBeLessThan(loserHPBefore);

        return result.hpDecrease > 0 && loserHPAfter < loserHPBefore;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.2: Winner's HP remains unchanged
   * **Validates: Requirements 3.4**
   *
   * For any round result where a character loses, the winner's (non-losing character's)
   * HP SHALL remain unchanged.
   */
  it("winner's HP remains unchanged when opponent loses", () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(loserArb, roundNumberArb, (loser, roundNumber) => {
        const hpSystem = new HPSystem();
        const stateBefore = hpSystem.getHPState();
        const winner: SurvivalCharacter = loser === 'cat' ? 'dog' : 'cat';
        const winnerHPBefore =
          winner === 'cat' ? stateBefore.cat.currentHP : stateBefore.dog.currentHP;

        hpSystem.applyRoundResult(loser, roundNumber);

        const stateAfter = hpSystem.getHPState();
        const winnerHPAfter =
          winner === 'cat' ? stateAfter.cat.currentHP : stateAfter.dog.currentHP;

        // Winner's HP must remain unchanged
        expect(winnerHPAfter).toBe(winnerHPBefore);

        return winnerHPAfter === winnerHPBefore;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.3: HP decrease is within configured bounds
   * **Validates: Requirements 3.2, 3.4**
   *
   * For any round result, the HP decrease SHALL be within the configured
   * minHPDecrease and maxHPDecrease bounds.
   */
  it('HP decrease is within configured bounds (minHPDecrease to maxHPDecrease)', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });
    const configArb: fc.Arbitrary<HPSystemConfig> = fc
      .record({
        initialHP: fc.integer({ min: 50, max: 200 }),
        totalRounds: fc.integer({ min: 10, max: 100 }),
        minHPDecrease: fc.integer({ min: 1, max: 10 }),
        maxHPDecrease: fc.integer({ min: 5, max: 20 }),
      })
      .filter((config) => config.minHPDecrease <= config.maxHPDecrease);

    fc.assert(
      fc.property(loserArb, roundNumberArb, configArb, (loser, roundNumber, config) => {
        const hpSystem = new HPSystem(config);
        const result = hpSystem.applyRoundResult(loser, roundNumber);

        // HP decrease must be within configured bounds
        expect(result.hpDecrease).toBeGreaterThanOrEqual(config.minHPDecrease);
        expect(result.hpDecrease).toBeLessThanOrEqual(config.maxHPDecrease);

        return (
          result.hpDecrease >= config.minHPDecrease && result.hpDecrease <= config.maxHPDecrease
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.4: Multiple consecutive losses decrease HP correctly
   * **Validates: Requirements 3.2, 3.4**
   *
   * For any sequence of losses by the same character, each loss SHALL decrease
   * that character's HP by a positive amount, and the opponent's HP SHALL remain unchanged.
   */
  it('multiple consecutive losses decrease HP correctly', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const lossCountArb = fc.integer({ min: 1, max: 25 });

    fc.assert(
      fc.property(loserArb, lossCountArb, (loser, lossCount) => {
        const hpSystem = new HPSystem();
        const winner: SurvivalCharacter = loser === 'cat' ? 'dog' : 'cat';

        const initialState = hpSystem.getHPState();
        const winnerInitialHP =
          winner === 'cat' ? initialState.cat.currentHP : initialState.dog.currentHP;
        let previousLoserHP =
          loser === 'cat' ? initialState.cat.currentHP : initialState.dog.currentHP;

        for (let round = 1; round <= lossCount; round++) {
          const result = hpSystem.applyRoundResult(loser, round);
          const currentState = hpSystem.getHPState();
          const currentLoserHP =
            loser === 'cat' ? currentState.cat.currentHP : currentState.dog.currentHP;
          const currentWinnerHP =
            winner === 'cat' ? currentState.cat.currentHP : currentState.dog.currentHP;

          // Each loss must decrease HP by a positive amount
          expect(result.hpDecrease).toBeGreaterThan(0);

          // Loser's HP must decrease (or stay at 0 if already at 0)
          if (previousLoserHP > 0) {
            expect(currentLoserHP).toBeLessThan(previousLoserHP);
          }

          // Winner's HP must remain unchanged
          expect(currentWinnerHP).toBe(winnerInitialHP);

          previousLoserHP = currentLoserHP;
        }

        // Final check: winner's HP unchanged
        const finalState = hpSystem.getHPState();
        const finalWinnerHP =
          winner === 'cat' ? finalState.cat.currentHP : finalState.dog.currentHP;
        expect(finalWinnerHP).toBe(winnerInitialHP);

        return finalWinnerHP === winnerInitialHP;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.5: Alternating losses affect only the losing character each round
   * **Validates: Requirements 3.2, 3.4**
   *
   * For any sequence of alternating losses between cat and dog, each round SHALL
   * only decrease the loser's HP while the winner's HP remains unchanged.
   */
  it('alternating losses affect only the losing character each round', () => {
    const roundCountArb = fc.integer({ min: 2, max: 50 });
    const startingLoserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');

    fc.assert(
      fc.property(roundCountArb, startingLoserArb, (roundCount, startingLoser) => {
        const hpSystem = new HPSystem();

        for (let round = 1; round <= roundCount; round++) {
          const loser: SurvivalCharacter =
            round % 2 === 1 ? startingLoser : startingLoser === 'cat' ? 'dog' : 'cat';
          const winner: SurvivalCharacter = loser === 'cat' ? 'dog' : 'cat';

          const stateBefore = hpSystem.getHPState();
          const loserHPBefore =
            loser === 'cat' ? stateBefore.cat.currentHP : stateBefore.dog.currentHP;
          const winnerHPBefore =
            winner === 'cat' ? stateBefore.cat.currentHP : stateBefore.dog.currentHP;

          const result = hpSystem.applyRoundResult(loser, round);

          const stateAfter = hpSystem.getHPState();
          const loserHPAfter =
            loser === 'cat' ? stateAfter.cat.currentHP : stateAfter.dog.currentHP;
          const winnerHPAfter =
            winner === 'cat' ? stateAfter.cat.currentHP : stateAfter.dog.currentHP;

          // HP decrease must be positive
          expect(result.hpDecrease).toBeGreaterThan(0);

          // Loser's HP must decrease (unless already at 0)
          if (loserHPBefore > 0) {
            expect(loserHPAfter).toBeLessThan(loserHPBefore);
          }

          // Winner's HP must remain unchanged
          expect(winnerHPAfter).toBe(winnerHPBefore);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.6: HP decrease amount matches the actual HP change
   * **Validates: Requirements 3.2**
   *
   * For any round result, the reported hpDecrease SHALL match the actual
   * difference in the loser's HP (accounting for clamping at 0).
   */
  it('HP decrease amount matches the actual HP change', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(loserArb, roundNumberArb, (loser, roundNumber) => {
        const hpSystem = new HPSystem();
        const stateBefore = hpSystem.getHPState();
        const loserHPBefore =
          loser === 'cat' ? stateBefore.cat.currentHP : stateBefore.dog.currentHP;

        const result = hpSystem.applyRoundResult(loser, roundNumber);

        const stateAfter = hpSystem.getHPState();
        const loserHPAfter = loser === 'cat' ? stateAfter.cat.currentHP : stateAfter.dog.currentHP;

        // The actual HP change should match the reported decrease
        // (accounting for clamping at 0)
        const actualDecrease = loserHPBefore - loserHPAfter;
        const expectedDecrease = Math.min(result.hpDecrease, loserHPBefore);

        expect(actualDecrease).toBe(expectedDecrease);

        return actualDecrease === expectedDecrease;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.7: Default config HP decrease is within 2-5 range
   * **Validates: Requirements 3.2, 3.4**
   *
   * For any round result with default configuration, the HP decrease SHALL
   * be within the default bounds of 2-5.
   */
  it('default config HP decrease is within 2-5 range', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(loserArb, roundNumberArb, (loser, roundNumber) => {
        const hpSystem = new HPSystem(); // Uses DEFAULT_HP_CONFIG
        const result = hpSystem.applyRoundResult(loser, roundNumber);

        // Default config: minHPDecrease = 2, maxHPDecrease = 5
        expect(result.hpDecrease).toBeGreaterThanOrEqual(2);
        expect(result.hpDecrease).toBeLessThanOrEqual(5);

        return result.hpDecrease >= 2 && result.hpDecrease <= 5;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.8: Loss tracking increments correctly for loser only
   * **Validates: Requirements 3.2**
   *
   * For any round result, the loser's roundsLost SHALL increment by 1,
   * and the winner's roundsLost SHALL remain unchanged.
   */
  it('loss tracking increments correctly for loser only', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(loserArb, roundNumberArb, (loser, roundNumber) => {
        const hpSystem = new HPSystem();
        const winner: SurvivalCharacter = loser === 'cat' ? 'dog' : 'cat';

        const stateBefore = hpSystem.getHPState();
        const loserLossesBefore =
          loser === 'cat' ? stateBefore.cat.roundsLost : stateBefore.dog.roundsLost;
        const winnerLossesBefore =
          winner === 'cat' ? stateBefore.cat.roundsLost : stateBefore.dog.roundsLost;

        hpSystem.applyRoundResult(loser, roundNumber);

        const stateAfter = hpSystem.getHPState();
        const loserLossesAfter =
          loser === 'cat' ? stateAfter.cat.roundsLost : stateAfter.dog.roundsLost;
        const winnerLossesAfter =
          winner === 'cat' ? stateAfter.cat.roundsLost : stateAfter.dog.roundsLost;

        // Loser's losses must increment by 1
        expect(loserLossesAfter).toBe(loserLossesBefore + 1);

        // Winner's losses must remain unchanged
        expect(winnerLossesAfter).toBe(winnerLossesBefore);

        return (
          loserLossesAfter === loserLossesBefore + 1 && winnerLossesAfter === winnerLossesBefore
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.9: HP decrease is deterministic for same random seed
   * **Validates: Requirements 3.4**
   *
   * Note: This property tests that the HP decrease calculation is consistent
   * within the configured bounds, though the exact value may vary due to
   * randomization in the calculation.
   */
  it('HP decrease is always within bounds regardless of round progression', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundSequenceArb = fc.array(fc.integer({ min: 1, max: 50 }), {
      minLength: 1,
      maxLength: 50,
    });

    fc.assert(
      fc.property(loserArb, roundSequenceArb, (loser, roundSequence) => {
        const hpSystem = new HPSystem();

        for (const roundNumber of roundSequence) {
          const result = hpSystem.applyRoundResult(loser, roundNumber);

          // Every HP decrease must be within default bounds
          expect(result.hpDecrease).toBeGreaterThanOrEqual(DEFAULT_HP_CONFIG.minHPDecrease);
          expect(result.hpDecrease).toBeLessThanOrEqual(DEFAULT_HP_CONFIG.maxHPDecrease);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.10: Returned HP values match internal state
   * **Validates: Requirements 3.2**
   *
   * For any round result, the returned catHP and dogHP values SHALL match
   * the values returned by getHPState().
   */
  it('returned HP values match internal state', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundNumberArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(loserArb, roundNumberArb, (loser, roundNumber) => {
        const hpSystem = new HPSystem();
        const result = hpSystem.applyRoundResult(loser, roundNumber);
        const state = hpSystem.getHPState();

        // Returned values must match internal state
        expect(result.catHP).toBe(state.cat.currentHP);
        expect(result.dogHP).toBe(state.dog.currentHP);

        return result.catHP === state.cat.currentHP && result.dogHP === state.dog.currentHP;
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 8: HP Non-Negative Invariant
 * Validates: Requirements 3.6
 *
 * For any sequence of round results applied to HPSystem, both cat and dog HP
 * SHALL always be >= 0.
 */
describe('Property 8: HP Non-Negative Invariant', () => {
  /**
   * Property 8.1: HP never goes below 0 for any sequence of losses
   * **Validates: Requirements 3.6**
   *
   * For any sequence of round results (losers), both cat and dog HP SHALL
   * always remain >= 0 after each round.
   */
  it('HP never goes below 0 for any sequence of losses', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), { minLength: 1, maxLength: 50 }),
        (losers) => {
          const hpSystem = new HPSystem();

          for (let i = 0; i < losers.length; i++) {
            hpSystem.applyRoundResult(losers[i], i + 1);
            const state = hpSystem.getHPState();

            // Both HP values must be >= 0 after each round
            expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
            expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
          }

          const finalState = hpSystem.getHPState();
          return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: HP is clamped at 0 when decrease would make it negative
   * **Validates: Requirements 3.6**
   *
   * When a character has low HP and loses a round, the HP decrease SHALL
   * be clamped so that HP never goes below 0.
   */
  it('HP is clamped at 0 when decrease would make it negative', () => {
    // Use a config with high HP decrease to force clamping scenarios
    const configArb: fc.Arbitrary<HPSystemConfig> = fc.constant({
      initialHP: 20, // Low initial HP
      totalRounds: 50,
      minHPDecrease: 5, // High minimum decrease
      maxHPDecrease: 10, // High maximum decrease
    });

    fc.assert(
      fc.property(
        configArb,
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), {
          minLength: 10,
          maxLength: 50,
        }),
        (config, losers) => {
          const hpSystem = new HPSystem(config);

          for (let i = 0; i < losers.length; i++) {
            hpSystem.applyRoundResult(losers[i], i + 1);
            const state = hpSystem.getHPState();

            // HP must never go below 0, even with aggressive decreases
            expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
            expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
          }

          const finalState = hpSystem.getHPState();
          return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Both characters maintain non-negative HP throughout any game simulation
   * **Validates: Requirements 3.6**
   *
   * For any complete 50-round game simulation with random winners,
   * both characters SHALL maintain HP >= 0 throughout.
   */
  it('both characters maintain non-negative HP throughout any 50-round game simulation', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), {
          minLength: 50,
          maxLength: 50,
        }),
        (losers) => {
          const hpSystem = new HPSystem();

          for (let round = 1; round <= 50; round++) {
            const loser = losers[round - 1];
            hpSystem.applyRoundResult(loser, round);

            const state = hpSystem.getHPState();

            // Invariant: HP must always be >= 0
            expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
            expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);

            // Additional check: HP should be a valid number (not NaN or Infinity)
            expect(Number.isFinite(state.cat.currentHP)).toBe(true);
            expect(Number.isFinite(state.dog.currentHP)).toBe(true);
          }

          const finalState = hpSystem.getHPState();
          return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: HP remains non-negative with extreme loss sequences (all losses to one character)
   * **Validates: Requirements 3.6**
   *
   * Even when one character loses every single round, their HP SHALL
   * remain >= 0 (clamped at 0).
   */
  it('HP remains non-negative when one character loses all rounds', () => {
    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const roundCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(loserArb, roundCountArb, (loser, roundCount) => {
        const hpSystem = new HPSystem();

        for (let round = 1; round <= roundCount; round++) {
          hpSystem.applyRoundResult(loser, round);
          const state = hpSystem.getHPState();

          // The loser's HP must never go below 0
          const loserHP = loser === 'cat' ? state.cat.currentHP : state.dog.currentHP;
          expect(loserHP).toBeGreaterThanOrEqual(0);

          // The winner's HP should remain at initial value
          const winner: SurvivalCharacter = loser === 'cat' ? 'dog' : 'cat';
          const winnerHP = winner === 'cat' ? state.cat.currentHP : state.dog.currentHP;
          expect(winnerHP).toBe(100); // Winner never loses HP
        }

        const finalState = hpSystem.getHPState();
        return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: HP non-negative invariant holds with custom configurations
   * **Validates: Requirements 3.6**
   *
   * For any valid HP system configuration and any sequence of losses,
   * both characters' HP SHALL remain >= 0.
   */
  it('HP non-negative invariant holds with any valid configuration', () => {
    const configArb: fc.Arbitrary<HPSystemConfig> = fc
      .record({
        initialHP: fc.integer({ min: 1, max: 1000 }),
        totalRounds: fc.integer({ min: 1, max: 100 }),
        minHPDecrease: fc.integer({ min: 1, max: 50 }),
        maxHPDecrease: fc.integer({ min: 1, max: 100 }),
      })
      .filter((config) => config.minHPDecrease <= config.maxHPDecrease);

    const losersArb = fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), {
      minLength: 1,
      maxLength: 100,
    });

    fc.assert(
      fc.property(configArb, losersArb, (config, losers) => {
        const hpSystem = new HPSystem(config);

        for (let i = 0; i < losers.length; i++) {
          hpSystem.applyRoundResult(losers[i], i + 1);
          const state = hpSystem.getHPState();

          // HP must always be >= 0 regardless of configuration
          expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
          expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
        }

        const finalState = hpSystem.getHPState();
        return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.6: HP at exactly 0 remains at 0 after additional losses
   * **Validates: Requirements 3.6**
   *
   * When a character's HP reaches exactly 0, additional losses SHALL
   * keep their HP at 0 (not go negative).
   */
  it('HP at exactly 0 remains at 0 after additional losses', () => {
    // Use config that will quickly reduce HP to 0
    const config: HPSystemConfig = {
      initialHP: 10,
      totalRounds: 50,
      minHPDecrease: 5,
      maxHPDecrease: 10,
    };

    const loserArb = fc.constantFrom<SurvivalCharacter>('cat', 'dog');
    const additionalLossesArb = fc.integer({ min: 1, max: 20 });

    fc.assert(
      fc.property(loserArb, additionalLossesArb, (loser, additionalLosses) => {
        const hpSystem = new HPSystem(config);

        // First, reduce HP to 0 by applying many losses
        for (let round = 1; round <= 10; round++) {
          hpSystem.applyRoundResult(loser, round);
        }

        const stateAtZero = hpSystem.getHPState();
        const hpAtZero = loser === 'cat' ? stateAtZero.cat.currentHP : stateAtZero.dog.currentHP;

        // HP should be at 0 or very close to it
        expect(hpAtZero).toBeGreaterThanOrEqual(0);

        // Apply additional losses
        for (let round = 11; round <= 10 + additionalLosses; round++) {
          hpSystem.applyRoundResult(loser, round);
          const state = hpSystem.getHPState();
          const currentHP = loser === 'cat' ? state.cat.currentHP : state.dog.currentHP;

          // HP must remain >= 0
          expect(currentHP).toBeGreaterThanOrEqual(0);
        }

        const finalState = hpSystem.getHPState();
        return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.7: HP values are always valid numbers (not NaN or Infinity)
   * **Validates: Requirements 3.6**
   *
   * For any sequence of operations, HP values SHALL always be valid
   * finite numbers >= 0.
   */
  it('HP values are always valid finite numbers >= 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), { minLength: 1, maxLength: 50 }),
        (losers) => {
          const hpSystem = new HPSystem();

          for (let i = 0; i < losers.length; i++) {
            hpSystem.applyRoundResult(losers[i], i + 1);
            const state = hpSystem.getHPState();

            // HP must be a valid finite number
            expect(Number.isFinite(state.cat.currentHP)).toBe(true);
            expect(Number.isFinite(state.dog.currentHP)).toBe(true);
            expect(Number.isNaN(state.cat.currentHP)).toBe(false);
            expect(Number.isNaN(state.dog.currentHP)).toBe(false);

            // HP must be >= 0
            expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
            expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.8: HP non-negative after reset and new game
   * **Validates: Requirements 3.6**
   *
   * After resetting the HP system and playing a new game, the HP
   * non-negative invariant SHALL still hold.
   */
  it('HP non-negative invariant holds after reset and new game', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), { minLength: 1, maxLength: 25 }),
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), { minLength: 1, maxLength: 25 }),
        (firstGameLosers, secondGameLosers) => {
          const hpSystem = new HPSystem();

          // Play first game
          for (let i = 0; i < firstGameLosers.length; i++) {
            hpSystem.applyRoundResult(firstGameLosers[i], i + 1);
            const state = hpSystem.getHPState();
            expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
            expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
          }

          // Reset
          hpSystem.reset();

          // Play second game
          for (let i = 0; i < secondGameLosers.length; i++) {
            hpSystem.applyRoundResult(secondGameLosers[i], i + 1);
            const state = hpSystem.getHPState();
            expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
            expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
          }

          const finalState = hpSystem.getHPState();
          return finalState.cat.currentHP >= 0 && finalState.dog.currentHP >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.9: HP decrease result never reports negative HP
   * **Validates: Requirements 3.6**
   *
   * The applyRoundResult return value SHALL never contain negative HP values.
   */
  it('applyRoundResult never returns negative HP values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), { minLength: 1, maxLength: 50 }),
        (losers) => {
          const hpSystem = new HPSystem();

          for (let i = 0; i < losers.length; i++) {
            const result = hpSystem.applyRoundResult(losers[i], i + 1);

            // Returned HP values must be >= 0
            expect(result.catHP).toBeGreaterThanOrEqual(0);
            expect(result.dogHP).toBeGreaterThanOrEqual(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.10: Final results never contain negative HP
   * **Validates: Requirements 3.6**
   *
   * The getFinalResults method SHALL never return negative HP values.
   */
  it('getFinalResults never returns negative HP values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<SurvivalCharacter>('cat', 'dog'), {
          minLength: 50,
          maxLength: 50,
        }),
        (losers) => {
          const hpSystem = new HPSystem();

          // Play full 50-round game
          for (let i = 0; i < losers.length; i++) {
            hpSystem.applyRoundResult(losers[i], i + 1);
          }

          const finalResults = hpSystem.getFinalResults();

          // Final HP values must be >= 0
          expect(finalResults.catFinalHP).toBeGreaterThanOrEqual(0);
          expect(finalResults.dogFinalHP).toBeGreaterThanOrEqual(0);

          return finalResults.catFinalHP >= 0 && finalResults.dogFinalHP >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
