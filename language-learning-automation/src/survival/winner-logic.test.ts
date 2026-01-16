import { describe, it, expect } from 'vitest';
import {
  generateRoundWinners,
  assignExpressionsToCharacters,
  determineFinalWinner,
  countWins,
  WinnerDecision,
} from './winner-logic';
import { SurvivalCharacter } from './types';

describe('winner-logic', () => {
  describe('generateRoundWinners', () => {
    it('should generate exactly the specified number of rounds', () => {
      const decisions = generateRoundWinners(50);
      expect(decisions).toHaveLength(50);
    });

    it('should generate default 50 rounds when no argument provided', () => {
      const decisions = generateRoundWinners();
      expect(decisions).toHaveLength(50);
    });

    it('should generate correct roundId sequence starting from 1', () => {
      const decisions = generateRoundWinners(10);
      for (let i = 0; i < 10; i++) {
        expect(decisions[i].roundId).toBe(i + 1);
      }
    });

    it('should only have cat or dog as winner', () => {
      const decisions = generateRoundWinners(100);
      for (const decision of decisions) {
        expect(['cat', 'dog']).toContain(decision.winner);
      }
    });

    it('should only have cat or dog as loser', () => {
      const decisions = generateRoundWinners(100);
      for (const decision of decisions) {
        expect(['cat', 'dog']).toContain(decision.loser);
      }
    });

    it('should have winner and loser be different characters', () => {
      const decisions = generateRoundWinners(100);
      for (const decision of decisions) {
        expect(decision.winner).not.toBe(decision.loser);
      }
    });

    it('should produce reproducible results with same seed', () => {
      const seed = 12345;
      const decisions1 = generateRoundWinners(50, seed);
      const decisions2 = generateRoundWinners(50, seed);

      expect(decisions1).toEqual(decisions2);
    });

    it('should produce different results with different seeds', () => {
      const decisions1 = generateRoundWinners(50, 12345);
      const decisions2 = generateRoundWinners(50, 67890);

      // Very unlikely to be exactly the same
      const sameCount = decisions1.filter((d, i) => d.winner === decisions2[i].winner).length;
      expect(sameCount).toBeLessThan(50);
    });

    it('should handle edge case of 0 rounds', () => {
      const decisions = generateRoundWinners(0);
      expect(decisions).toHaveLength(0);
    });

    it('should handle edge case of 1 round', () => {
      const decisions = generateRoundWinners(1);
      expect(decisions).toHaveLength(1);
      expect(decisions[0].roundId).toBe(1);
    });

    it('should produce approximately 50/50 distribution over many rounds', () => {
      // Generate many rounds to test distribution
      const decisions = generateRoundWinners(1000);
      const { catWins, dogWins } = countWins(decisions);

      // Should be within 45-55% range (very likely with 1000 samples)
      const catPercentage = catWins / 1000;
      const dogPercentage = dogWins / 1000;
      expect(catPercentage).toBeGreaterThan(0.4);
      expect(catPercentage).toBeLessThan(0.6);
      expect(dogPercentage).toBeGreaterThan(0.4);
      expect(dogPercentage).toBeLessThan(0.6);
    });
  });

  describe('assignExpressionsToCharacters', () => {
    it('should assign konglish to loser when cat wins', () => {
      const result = assignExpressionsToCharacters(
        'Where is toilet?',
        'Where is the restroom?',
        'cat'
      );

      expect(result.konglishAnswer.character).toBe('dog');
      expect(result.nativeAnswer.character).toBe('cat');
    });

    it('should assign konglish to loser when dog wins', () => {
      const result = assignExpressionsToCharacters(
        'Where is toilet?',
        'Where is the restroom?',
        'dog'
      );

      expect(result.konglishAnswer.character).toBe('cat');
      expect(result.nativeAnswer.character).toBe('dog');
    });

    it('should preserve the konglish text correctly', () => {
      const konglish = 'I am boring';
      const native = "I'm bored";

      const result = assignExpressionsToCharacters(konglish, native, 'cat');

      expect(result.konglishAnswer.text).toBe(konglish);
    });

    it('should preserve the native text correctly', () => {
      const konglish = 'I am boring';
      const native = "I'm bored";

      const result = assignExpressionsToCharacters(konglish, native, 'dog');

      expect(result.nativeAnswer.text).toBe(native);
    });

    it('should ensure winner has native answer and loser has konglish answer', () => {
      const winners: SurvivalCharacter[] = ['cat', 'dog'];

      for (const winner of winners) {
        const result = assignExpressionsToCharacters('wrong', 'correct', winner);
        const loser = winner === 'cat' ? 'dog' : 'cat';

        expect(result.nativeAnswer.character).toBe(winner);
        expect(result.konglishAnswer.character).toBe(loser);
      }
    });

    it('should handle empty strings', () => {
      const result = assignExpressionsToCharacters('', '', 'cat');

      expect(result.konglishAnswer.text).toBe('');
      expect(result.nativeAnswer.text).toBe('');
    });

    it('should handle special characters in text', () => {
      const konglish = "What's your hobby?";
      const native = 'What do you like to do for fun?';

      const result = assignExpressionsToCharacters(konglish, native, 'dog');

      expect(result.konglishAnswer.text).toBe(konglish);
      expect(result.nativeAnswer.text).toBe(native);
    });
  });

  describe('determineFinalWinner', () => {
    it('should return cat when cat has more wins', () => {
      const decisions: WinnerDecision[] = [
        { roundId: 1, winner: 'cat', loser: 'dog' },
        { roundId: 2, winner: 'cat', loser: 'dog' },
        { roundId: 3, winner: 'dog', loser: 'cat' },
      ];

      expect(determineFinalWinner(decisions)).toBe('cat');
    });

    it('should return dog when dog has more wins', () => {
      const decisions: WinnerDecision[] = [
        { roundId: 1, winner: 'dog', loser: 'cat' },
        { roundId: 2, winner: 'dog', loser: 'cat' },
        { roundId: 3, winner: 'cat', loser: 'dog' },
      ];

      expect(determineFinalWinner(decisions)).toBe('dog');
    });

    it('should return cat in case of tie (deterministic tie-breaker)', () => {
      const decisions: WinnerDecision[] = [
        { roundId: 1, winner: 'cat', loser: 'dog' },
        { roundId: 2, winner: 'dog', loser: 'cat' },
      ];

      expect(determineFinalWinner(decisions)).toBe('cat');
    });

    it('should handle empty array (cat wins by default)', () => {
      const decisions: WinnerDecision[] = [];
      expect(determineFinalWinner(decisions)).toBe('cat');
    });

    it('should handle single round', () => {
      const catWins: WinnerDecision[] = [{ roundId: 1, winner: 'cat', loser: 'dog' }];
      const dogWins: WinnerDecision[] = [{ roundId: 1, winner: 'dog', loser: 'cat' }];

      expect(determineFinalWinner(catWins)).toBe('cat');
      expect(determineFinalWinner(dogWins)).toBe('dog');
    });

    it('should correctly count 50 rounds', () => {
      // Create 26 cat wins and 24 dog wins
      const decisions: WinnerDecision[] = [];
      for (let i = 1; i <= 26; i++) {
        decisions.push({ roundId: i, winner: 'cat', loser: 'dog' });
      }
      for (let i = 27; i <= 50; i++) {
        decisions.push({ roundId: i, winner: 'dog', loser: 'cat' });
      }

      expect(determineFinalWinner(decisions)).toBe('cat');
    });

    it('should correctly determine dog winner with 50 rounds', () => {
      // Create 24 cat wins and 26 dog wins
      const decisions: WinnerDecision[] = [];
      for (let i = 1; i <= 24; i++) {
        decisions.push({ roundId: i, winner: 'cat', loser: 'dog' });
      }
      for (let i = 25; i <= 50; i++) {
        decisions.push({ roundId: i, winner: 'dog', loser: 'cat' });
      }

      expect(determineFinalWinner(decisions)).toBe('dog');
    });
  });

  describe('countWins', () => {
    it('should count wins correctly', () => {
      const decisions: WinnerDecision[] = [
        { roundId: 1, winner: 'cat', loser: 'dog' },
        { roundId: 2, winner: 'cat', loser: 'dog' },
        { roundId: 3, winner: 'dog', loser: 'cat' },
      ];

      const { catWins, dogWins } = countWins(decisions);

      expect(catWins).toBe(2);
      expect(dogWins).toBe(1);
    });

    it('should return 0 for empty array', () => {
      const { catWins, dogWins } = countWins([]);

      expect(catWins).toBe(0);
      expect(dogWins).toBe(0);
    });

    it('should sum to total rounds', () => {
      const decisions = generateRoundWinners(50);
      const { catWins, dogWins } = countWins(decisions);

      expect(catWins + dogWins).toBe(50);
    });

    it('should handle all cat wins', () => {
      const decisions: WinnerDecision[] = Array.from({ length: 10 }, (_, i) => ({
        roundId: i + 1,
        winner: 'cat' as SurvivalCharacter,
        loser: 'dog' as SurvivalCharacter,
      }));

      const { catWins, dogWins } = countWins(decisions);

      expect(catWins).toBe(10);
      expect(dogWins).toBe(0);
    });

    it('should handle all dog wins', () => {
      const decisions: WinnerDecision[] = Array.from({ length: 10 }, (_, i) => ({
        roundId: i + 1,
        winner: 'dog' as SurvivalCharacter,
        loser: 'cat' as SurvivalCharacter,
      }));

      const { catWins, dogWins } = countWins(decisions);

      expect(catWins).toBe(0);
      expect(dogWins).toBe(10);
    });
  });

  describe('integration tests', () => {
    it('should work end-to-end: generate winners, assign expressions, determine final winner', () => {
      // Generate round winners
      const decisions = generateRoundWinners(50, 42);

      // Assign expressions for each round
      const rounds = decisions.map((decision) => {
        const expressions = assignExpressionsToCharacters(
          'Konglish text',
          'Native text',
          decision.winner
        );
        return {
          ...decision,
          ...expressions,
        };
      });

      // Verify all rounds have correct assignment
      for (const round of rounds) {
        expect(round.nativeAnswer.character).toBe(round.winner);
        expect(round.konglishAnswer.character).toBe(round.loser);
      }

      // Determine final winner
      const finalWinner = determineFinalWinner(decisions);
      const { catWins, dogWins } = countWins(decisions);

      // Verify final winner matches win count
      if (catWins > dogWins) {
        expect(finalWinner).toBe('cat');
      } else if (dogWins > catWins) {
        expect(finalWinner).toBe('dog');
      } else {
        expect(finalWinner).toBe('cat'); // Tie-breaker
      }
    });

    it('should maintain consistency with seed across multiple calls', () => {
      const seed = 99999;

      // First run
      const decisions1 = generateRoundWinners(50, seed);
      const winner1 = determineFinalWinner(decisions1);
      const counts1 = countWins(decisions1);

      // Second run with same seed
      const decisions2 = generateRoundWinners(50, seed);
      const winner2 = determineFinalWinner(decisions2);
      const counts2 = countWins(decisions2);

      expect(decisions1).toEqual(decisions2);
      expect(winner1).toBe(winner2);
      expect(counts1).toEqual(counts2);
    });
  });
});
