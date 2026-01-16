import { describe, it, expect, beforeEach } from 'vitest';
import { HPSystem, DEFAULT_HP_CONFIG, HPSystemConfig } from './hp-system';
import type { SurvivalCharacter } from './types';

describe('HPSystem', () => {
  let hpSystem: HPSystem;

  beforeEach(() => {
    hpSystem = new HPSystem();
  });

  describe('constructor and initialization', () => {
    /**
     * Validates: Requirement 3.1
     * THE HP_System SHALL initialize both characters with HP 100 at video start
     */
    it('should initialize both characters with HP 100 by default', () => {
      const state = hpSystem.getHPState();
      expect(state.cat.currentHP).toBe(100);
      expect(state.dog.currentHP).toBe(100);
    });

    it('should initialize both characters with custom initialHP', () => {
      const customConfig: HPSystemConfig = {
        initialHP: 200,
        totalRounds: 50,
        minHPDecrease: 2,
        maxHPDecrease: 5,
      };
      const customSystem = new HPSystem(customConfig);
      const state = customSystem.getHPState();
      expect(state.cat.currentHP).toBe(200);
      expect(state.dog.currentHP).toBe(200);
    });

    it('should initialize both characters with 0 losses', () => {
      const state = hpSystem.getHPState();
      expect(state.cat.roundsLost).toBe(0);
      expect(state.dog.roundsLost).toBe(0);
    });

    it('should use DEFAULT_HP_CONFIG when no config provided', () => {
      expect(DEFAULT_HP_CONFIG.initialHP).toBe(100);
      expect(DEFAULT_HP_CONFIG.totalRounds).toBe(50);
      expect(DEFAULT_HP_CONFIG.minHPDecrease).toBe(2);
      expect(DEFAULT_HP_CONFIG.maxHPDecrease).toBe(5);
    });
  });

  describe('calculateHPDecrease', () => {
    /**
     * Validates: Requirement 3.4
     * THE HP_System SHALL calculate HP decrease based on remaining rounds
     */
    it('should return a value between minHPDecrease and maxHPDecrease', () => {
      // Run multiple times due to randomness
      for (let i = 0; i < 100; i++) {
        const decrease = hpSystem.calculateHPDecrease(1, 0);
        expect(decrease).toBeGreaterThanOrEqual(DEFAULT_HP_CONFIG.minHPDecrease);
        expect(decrease).toBeLessThanOrEqual(DEFAULT_HP_CONFIG.maxHPDecrease);
      }
    });

    it('should return an integer value', () => {
      for (let i = 0; i < 50; i++) {
        const decrease = hpSystem.calculateHPDecrease(i + 1, i);
        expect(Number.isInteger(decrease)).toBe(true);
      }
    });

    it('should respect custom min/max HP decrease config', () => {
      const customConfig: HPSystemConfig = {
        initialHP: 100,
        totalRounds: 50,
        minHPDecrease: 5,
        maxHPDecrease: 10,
      };
      const customSystem = new HPSystem(customConfig);

      for (let i = 0; i < 100; i++) {
        const decrease = customSystem.calculateHPDecrease(1, 0);
        expect(decrease).toBeGreaterThanOrEqual(5);
        expect(decrease).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('applyRoundResult', () => {
    /**
     * Validates: Requirement 3.2
     * WHEN a character gives wrong answer, THE HP_System SHALL decrease that character's HP
     */
    it('should decrease cat HP when cat loses', () => {
      const initialState = hpSystem.getHPState();
      const result = hpSystem.applyRoundResult('cat', 1);

      expect(result.catHP).toBeLessThan(initialState.cat.currentHP);
      expect(result.dogHP).toBe(initialState.dog.currentHP);
      expect(result.hpDecrease).toBeGreaterThan(0);
    });

    it('should decrease dog HP when dog loses', () => {
      const initialState = hpSystem.getHPState();
      const result = hpSystem.applyRoundResult('dog', 1);

      expect(result.dogHP).toBeLessThan(initialState.dog.currentHP);
      expect(result.catHP).toBe(initialState.cat.currentHP);
      expect(result.hpDecrease).toBeGreaterThan(0);
    });

    it('should increment loss counter for the loser', () => {
      hpSystem.applyRoundResult('cat', 1);
      const state = hpSystem.getHPState();
      expect(state.cat.roundsLost).toBe(1);
      expect(state.dog.roundsLost).toBe(0);
    });

    it('should track multiple losses correctly', () => {
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('cat', 2);
      hpSystem.applyRoundResult('dog', 3);

      const state = hpSystem.getHPState();
      expect(state.cat.roundsLost).toBe(2);
      expect(state.dog.roundsLost).toBe(1);
    });

    /**
     * Validates: Requirement 3.6
     * THE HP_System SHALL ensure HP never goes below 0
     */
    it('should never let HP go below 0', () => {
      // Apply many losses to ensure HP doesn't go negative
      for (let i = 0; i < 50; i++) {
        hpSystem.applyRoundResult('cat', i + 1);
      }

      const state = hpSystem.getHPState();
      expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
    });

    it('should clamp HP to 0 when decrease would make it negative', () => {
      // Create a system with low initial HP
      const lowHPConfig: HPSystemConfig = {
        initialHP: 5,
        totalRounds: 50,
        minHPDecrease: 10, // Decrease is larger than initial HP
        maxHPDecrease: 15,
      };
      const lowHPSystem = new HPSystem(lowHPConfig);

      lowHPSystem.applyRoundResult('cat', 1);
      const state = lowHPSystem.getHPState();
      expect(state.cat.currentHP).toBe(0);
    });
  });

  describe('getHPState', () => {
    it('should return correct character identifiers', () => {
      const state = hpSystem.getHPState();
      expect(state.cat.character).toBe('cat');
      expect(state.dog.character).toBe('dog');
    });

    it('should reflect current HP after losses', () => {
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('dog', 2);

      const state = hpSystem.getHPState();
      expect(state.cat.currentHP).toBeLessThan(100);
      expect(state.dog.currentHP).toBeLessThan(100);
    });

    it('should reflect correct loss counts', () => {
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('cat', 2);
      hpSystem.applyRoundResult('dog', 3);
      hpSystem.applyRoundResult('dog', 4);
      hpSystem.applyRoundResult('dog', 5);

      const state = hpSystem.getHPState();
      expect(state.cat.roundsLost).toBe(2);
      expect(state.dog.roundsLost).toBe(3);
    });
  });

  describe('getFinalResults', () => {
    it('should return cat as winner when cat has more wins', () => {
      // Dog loses more rounds, so cat wins more
      hpSystem.applyRoundResult('dog', 1);
      hpSystem.applyRoundResult('dog', 2);
      hpSystem.applyRoundResult('cat', 3);

      const results = hpSystem.getFinalResults();
      expect(results.winner).toBe('cat');
      expect(results.catWins).toBe(2); // dog lost 2 rounds = cat won 2
      expect(results.dogWins).toBe(1); // cat lost 1 round = dog won 1
    });

    it('should return dog as winner when dog has more wins', () => {
      // Cat loses more rounds, so dog wins more
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('cat', 2);
      hpSystem.applyRoundResult('dog', 3);

      const results = hpSystem.getFinalResults();
      expect(results.winner).toBe('dog');
      expect(results.dogWins).toBe(2); // cat lost 2 rounds = dog won 2
      expect(results.catWins).toBe(1); // dog lost 1 round = cat won 1
    });

    it('should handle tie by comparing HP', () => {
      // Equal losses
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('dog', 2);

      const results = hpSystem.getFinalResults();
      expect(results.catWins).toBe(results.dogWins);
      // Winner should be determined by HP (or cat if equal)
      expect(['cat', 'dog']).toContain(results.winner);
    });

    it('should return correct final HP values', () => {
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('dog', 2);

      const results = hpSystem.getFinalResults();
      const state = hpSystem.getHPState();

      expect(results.catFinalHP).toBe(state.cat.currentHP);
      expect(results.dogFinalHP).toBe(state.dog.currentHP);
    });

    it('should return correct win counts', () => {
      // Simulate 10 rounds: cat loses 6, dog loses 4
      for (let i = 0; i < 6; i++) {
        hpSystem.applyRoundResult('cat', i + 1);
      }
      for (let i = 0; i < 4; i++) {
        hpSystem.applyRoundResult('dog', i + 7);
      }

      const results = hpSystem.getFinalResults();
      expect(results.catWins).toBe(4); // dog lost 4 = cat won 4
      expect(results.dogWins).toBe(6); // cat lost 6 = dog won 6
      expect(results.winner).toBe('dog');
    });
  });

  describe('reset', () => {
    it('should reset HP to initial values', () => {
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('dog', 2);
      hpSystem.reset();

      const state = hpSystem.getHPState();
      expect(state.cat.currentHP).toBe(100);
      expect(state.dog.currentHP).toBe(100);
    });

    it('should reset loss counters to 0', () => {
      hpSystem.applyRoundResult('cat', 1);
      hpSystem.applyRoundResult('dog', 2);
      hpSystem.reset();

      const state = hpSystem.getHPState();
      expect(state.cat.roundsLost).toBe(0);
      expect(state.dog.roundsLost).toBe(0);
    });
  });

  describe('full game simulation', () => {
    it('should handle a complete 50-round game', () => {
      const losers: SurvivalCharacter[] = [];

      // Simulate 50 rounds with alternating losers
      for (let i = 0; i < 50; i++) {
        const loser: SurvivalCharacter = i % 2 === 0 ? 'cat' : 'dog';
        losers.push(loser);
        hpSystem.applyRoundResult(loser, i + 1);
      }

      const state = hpSystem.getHPState();
      const results = hpSystem.getFinalResults();

      // Both HP should be non-negative
      expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
      expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);

      // Total losses should equal 50
      expect(state.cat.roundsLost + state.dog.roundsLost).toBe(50);

      // Total wins should equal 50
      expect(results.catWins + results.dogWins).toBe(50);
    });

    it('should produce reasonable HP distribution after 50 rounds', () => {
      // Simulate a game where one character loses most rounds
      for (let i = 0; i < 40; i++) {
        hpSystem.applyRoundResult('cat', i + 1);
      }
      for (let i = 0; i < 10; i++) {
        hpSystem.applyRoundResult('dog', i + 41);
      }

      const state = hpSystem.getHPState();

      // Cat should have much lower HP than dog
      expect(state.cat.currentHP).toBeLessThan(state.dog.currentHP);

      // Both should still be non-negative
      expect(state.cat.currentHP).toBeGreaterThanOrEqual(0);
      expect(state.dog.currentHP).toBeGreaterThanOrEqual(0);
    });
  });
});
