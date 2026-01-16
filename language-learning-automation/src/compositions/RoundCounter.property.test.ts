import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatRoundCounter } from './RoundCounter';

/**
 * Feature: survival-quiz-longform, Property 16: Round Counter Format
 * **Validates: Requirements 9.2**
 *
 * For any round number N (1-50), the formatted round counter SHALL match
 * the pattern "Round N/50".
 */
describe('Property 16: Round Counter Format', () => {
  /**
   * Property 16.1: Format matches "Round N/50" pattern
   * **Validates: Requirements 9.2**
   *
   * For any valid round number, the formatted string SHALL match
   * the exact pattern "Round {N}/{total}".
   */
  it('format matches "Round N/50" pattern for all valid rounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        (currentRound, totalRounds) => {
          const formatted = formatRoundCounter(currentRound, totalRounds);

          // Must match the pattern "Round N/M"
          const pattern = /^Round \d+\/\d+$/;
          expect(formatted).toMatch(pattern);

          // Must contain the exact round numbers
          expect(formatted).toBe(`Round ${currentRound}/${totalRounds}`);

          return pattern.test(formatted) && formatted === `Round ${currentRound}/${totalRounds}`;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.2: Format is consistent for same input
   * **Validates: Requirements 9.2**
   *
   * For any round number, calling formatRoundCounter multiple times
   * SHALL always produce the same result.
   */
  it('format is deterministic - same input always produces same output', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 2, max: 10 }),
        (currentRound, totalRounds, iterations) => {
          const results: string[] = [];

          for (let i = 0; i < iterations; i++) {
            results.push(formatRoundCounter(currentRound, totalRounds));
          }

          // All results should be identical
          const firstResult = results[0];
          for (const result of results) {
            expect(result).toBe(firstResult);
          }

          return results.every((r) => r === firstResult);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.3: Format contains "Round" prefix
   * **Validates: Requirements 9.2**
   *
   * For any round number, the formatted string SHALL start with "Round ".
   */
  it('format always starts with "Round "', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        (currentRound, totalRounds) => {
          const formatted = formatRoundCounter(currentRound, totalRounds);

          expect(formatted.startsWith('Round ')).toBe(true);

          return formatted.startsWith('Round ');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.4: Format contains slash separator
   * **Validates: Requirements 9.2**
   *
   * For any round number, the formatted string SHALL contain a "/" separator.
   */
  it('format contains "/" separator between current and total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        (currentRound, totalRounds) => {
          const formatted = formatRoundCounter(currentRound, totalRounds);

          expect(formatted).toContain('/');

          // Split and verify parts
          const parts = formatted.replace('Round ', '').split('/');
          expect(parts.length).toBe(2);
          expect(parseInt(parts[0])).toBe(currentRound);
          expect(parseInt(parts[1])).toBe(totalRounds);

          return formatted.includes('/') && parts.length === 2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.5: Format handles edge cases correctly
   * **Validates: Requirements 9.2**
   *
   * Edge cases like round 1, round 50, and various totals SHALL be formatted correctly.
   */
  it('format handles edge cases correctly', () => {
    const edgeCases = [
      { current: 1, total: 50, expected: 'Round 1/50' },
      { current: 50, total: 50, expected: 'Round 50/50' },
      { current: 25, total: 50, expected: 'Round 25/50' },
      { current: 1, total: 1, expected: 'Round 1/1' },
      { current: 100, total: 100, expected: 'Round 100/100' },
      { current: 45, total: 50, expected: 'Round 45/50' }, // Final stretch start
    ];

    fc.assert(
      fc.property(fc.constantFrom(...edgeCases), ({ current, total, expected }) => {
        const formatted = formatRoundCounter(current, total);

        expect(formatted).toBe(expected);

        return formatted === expected;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.6: Format produces non-empty string
   * **Validates: Requirements 9.2**
   *
   * For any valid input, the formatted string SHALL never be empty.
   */
  it('format always produces non-empty string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (currentRound, totalRounds) => {
          const formatted = formatRoundCounter(currentRound, totalRounds);

          expect(formatted.length).toBeGreaterThan(0);
          expect(formatted.trim()).toBe(formatted); // No leading/trailing whitespace

          return formatted.length > 0 && formatted.trim() === formatted;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.7: Format length is reasonable
   * **Validates: Requirements 9.2**
   *
   * For rounds 1-50 with total 50, the formatted string length SHALL be
   * between 10 and 15 characters.
   */
  it('format length is reasonable for standard 50-round game', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (currentRound) => {
        const formatted = formatRoundCounter(currentRound, 50);

        // "Round 1/50" = 10 chars, "Round 50/50" = 12 chars
        expect(formatted.length).toBeGreaterThanOrEqual(10);
        expect(formatted.length).toBeLessThanOrEqual(12);

        return formatted.length >= 10 && formatted.length <= 12;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.8: Current round number is extractable from format
   * **Validates: Requirements 9.2**
   *
   * The current round number SHALL be extractable from the formatted string.
   */
  it('current round number is extractable from formatted string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        (currentRound, totalRounds) => {
          const formatted = formatRoundCounter(currentRound, totalRounds);

          // Extract numbers from the format
          const numbers = formatted.match(/\d+/g);
          expect(numbers).not.toBeNull();
          expect(numbers!.length).toBe(2);
          expect(parseInt(numbers![0])).toBe(currentRound);
          expect(parseInt(numbers![1])).toBe(totalRounds);

          return (
            numbers !== null &&
            numbers.length === 2 &&
            parseInt(numbers[0]) === currentRound &&
            parseInt(numbers[1]) === totalRounds
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
