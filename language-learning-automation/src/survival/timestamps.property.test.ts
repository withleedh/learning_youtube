import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateTimestampEntries,
  generateTimestamps,
  formatTimestamp,
  validateTimestampCompleteness,
  validateTimestampFormat,
  parseTimestamp,
  calculateRoundStartTime,
  getDefaultRoundMarkers,
} from './timestamps';
import { DEFAULT_SURVIVAL_TIMING } from './timing';

/**
 * Feature: survival-quiz-longform, Property 23: Timestamp Completeness
 * **Validates: Requirements 14.1, 14.2, 14.3**
 *
 * For any generated video, timestamps SHALL include:
 * - intro marker
 * - round markers at 1/10/20/30/40/50
 * - ending marker
 */
describe('Property 23: Timestamp Completeness', () => {
  /**
   * Property 23.1: Generated timestamps include intro marker
   * **Validates: Requirements 14.1**
   */
  it('generated timestamps always include intro marker at 0:00', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 5, max: 15 }),
        (totalRounds, introDuration) => {
          const entries = generateTimestampEntries({
            totalRounds,
            introDuration,
            roundMarkers: getDefaultRoundMarkers(totalRounds),
          });

          // Must have intro marker at 0 seconds
          const introMarker = entries.find((e) => e.timeSeconds === 0);
          expect(introMarker).toBeDefined();
          expect(introMarker?.label).toContain('인트로');

          return introMarker !== undefined && introMarker.timeSeconds === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.2: Generated timestamps include round markers
   * **Validates: Requirements 14.2**
   */
  it('generated timestamps include round markers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (totalRounds) => {
        const roundMarkers = getDefaultRoundMarkers(totalRounds);
        const entries = generateTimestampEntries({
          totalRounds,
          roundMarkers,
        });

        // Must have round markers
        const roundEntries = entries.filter((e) => e.label.includes('Round'));
        expect(roundEntries.length).toBeGreaterThan(0);

        // Each specified round marker should be present
        for (const marker of roundMarkers) {
          const found = roundEntries.some((e) => e.label.includes(`Round ${marker}`));
          expect(found).toBe(true);
        }

        return roundEntries.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.3: Generated timestamps include ending marker
   * **Validates: Requirements 14.3**
   */
  it('generated timestamps always include ending marker', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 10, max: 20 }),
        (totalRounds, endingDuration) => {
          const entries = generateTimestampEntries({
            totalRounds,
            endingDuration,
            roundMarkers: getDefaultRoundMarkers(totalRounds),
          });

          // Must have ending marker
          const endingMarker = entries.find(
            (e) => e.label.includes('결과') || e.label.includes('ending')
          );
          expect(endingMarker).toBeDefined();

          // Ending marker should be after all round markers
          const roundMarkers = entries.filter((e) => e.label.includes('Round'));
          if (roundMarkers.length > 0) {
            const lastRoundTime = Math.max(...roundMarkers.map((e) => e.timeSeconds));
            expect(endingMarker!.timeSeconds).toBeGreaterThan(lastRoundTime);
          }

          return endingMarker !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.4: validateTimestampCompleteness correctly identifies complete timestamps
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  it('validateTimestampCompleteness returns true for complete timestamps', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (totalRounds) => {
        const entries = generateTimestampEntries({
          totalRounds,
          roundMarkers: getDefaultRoundMarkers(totalRounds),
        });

        const validation = validateTimestampCompleteness(entries);

        expect(validation.isComplete).toBe(true);
        expect(validation.missingElements).toHaveLength(0);

        return validation.isComplete && validation.missingElements.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.5: Timestamps are in chronological order
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  it('timestamps are in chronological order', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (totalRounds) => {
        const entries = generateTimestampEntries({
          totalRounds,
          roundMarkers: getDefaultRoundMarkers(totalRounds),
        });

        // Check chronological order
        for (let i = 1; i < entries.length; i++) {
          expect(entries[i].timeSeconds).toBeGreaterThanOrEqual(entries[i - 1].timeSeconds);
        }

        return entries.every((e, i) => i === 0 || e.timeSeconds >= entries[i - 1].timeSeconds);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.6: Round markers are at correct positions
   * **Validates: Requirements 14.2**
   */
  it('round markers are at correct calculated positions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 5, max: 10 }),
        (totalRounds, introDuration) => {
          const roundMarkers = [1, Math.floor(totalRounds / 2), totalRounds];
          const entries = generateTimestampEntries({
            totalRounds,
            introDuration,
            roundMarkers,
          });

          // Verify each round marker position
          for (const roundNum of roundMarkers) {
            const expectedTime = calculateRoundStartTime(
              roundNum,
              introDuration,
              DEFAULT_SURVIVAL_TIMING
            );
            const entry = entries.find((e) => e.label.includes(`Round ${roundNum}`));

            expect(entry).toBeDefined();
            expect(entry!.timeSeconds).toBeCloseTo(expectedTime, 1);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 24: Timestamp Format
 * **Validates: Requirements 14.4**
 *
 * For any generated timestamp, it SHALL match the YouTube chapter format
 * pattern: "M:SS Label" or "MM:SS Label".
 */
describe('Property 24: Timestamp Format', () => {
  /**
   * Property 24.1: formatTimestamp produces valid format
   * **Validates: Requirements 14.4**
   */
  it('formatTimestamp produces valid "M:SS Label" or "MM:SS Label" format', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 720 }), // 0-12 minutes in seconds
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        (seconds, label) => {
          const timestamp = formatTimestamp(seconds, label.trim());

          // Must match pattern
          const pattern = /^\d{1,2}:\d{2} .+$/;
          expect(timestamp).toMatch(pattern);

          return pattern.test(timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.2: validateTimestampFormat correctly validates format
   * **Validates: Requirements 14.4**
   */
  it('validateTimestampFormat returns true for valid formats', () => {
    const validTimestamps = [
      '0:00 Intro',
      '1:30 Round 1',
      '5:45 Round 10',
      '10:00 Round 20',
      '12:30 Ending',
      '0:05 🎬 인트로',
      '8:30 🏆 결과 발표',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...validTimestamps), (timestamp) => {
        const isValid = validateTimestampFormat(timestamp);

        expect(isValid).toBe(true);

        return isValid;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.3: validateTimestampFormat rejects invalid formats
   * **Validates: Requirements 14.4**
   */
  it('validateTimestampFormat returns false for invalid formats', () => {
    const invalidTimestamps = [
      'Intro', // No time
      '1:30', // No label
      '1:3 Label', // Invalid seconds format
      '1:300 Label', // Invalid seconds
      ':30 Label', // No minutes
      '1:30Label', // No space before label
      '', // Empty
    ];

    fc.assert(
      fc.property(fc.constantFrom(...invalidTimestamps), (timestamp) => {
        const isValid = validateTimestampFormat(timestamp);

        expect(isValid).toBe(false);

        return !isValid;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.4: Generated timestamps all have valid format
   * **Validates: Requirements 14.4**
   */
  it('all generated timestamps have valid format', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (totalRounds) => {
        const timestamps = generateTimestamps({
          totalRounds,
          roundMarkers: getDefaultRoundMarkers(totalRounds),
        });

        // All timestamps must be valid
        for (const timestamp of timestamps) {
          expect(validateTimestampFormat(timestamp)).toBe(true);
        }

        return timestamps.every((t) => validateTimestampFormat(t));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.5: parseTimestamp correctly parses valid timestamps
   * **Validates: Requirements 14.4**
   */
  it('parseTimestamp correctly parses valid timestamps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 720 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        (seconds, label) => {
          const trimmedLabel = label.trim();
          const timestamp = formatTimestamp(seconds, trimmedLabel);
          const parsed = parseTimestamp(timestamp);

          expect(parsed).not.toBeNull();
          expect(parsed!.timeSeconds).toBe(Math.floor(seconds));
          expect(parsed!.label).toBe(trimmedLabel);

          return (
            parsed !== null &&
            parsed.timeSeconds === Math.floor(seconds) &&
            parsed.label === trimmedLabel
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.6: Seconds are always two digits
   * **Validates: Requirements 14.4**
   */
  it('seconds portion is always two digits (zero-padded)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 720 }),
        fc.constantFrom('Label', 'Test', 'Round 1'),
        (seconds, label) => {
          const timestamp = formatTimestamp(seconds, label);

          // Extract seconds portion
          const match = timestamp.match(/^\d+:(\d{2})/);
          expect(match).not.toBeNull();
          expect(match![1].length).toBe(2);

          return match !== null && match[1].length === 2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.7: Time values are non-negative
   * **Validates: Requirements 14.4**
   */
  it('all timestamp times are non-negative', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (totalRounds) => {
        const entries = generateTimestampEntries({
          totalRounds,
          roundMarkers: getDefaultRoundMarkers(totalRounds),
        });

        // All times must be non-negative
        for (const entry of entries) {
          expect(entry.timeSeconds).toBeGreaterThanOrEqual(0);
        }

        return entries.every((e) => e.timeSeconds >= 0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24.8: First timestamp is always at 0:00
   * **Validates: Requirements 14.4**
   */
  it('first timestamp is always at 0:00', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (totalRounds) => {
        const timestamps = generateTimestamps({
          totalRounds,
          roundMarkers: getDefaultRoundMarkers(totalRounds),
        });

        expect(timestamps.length).toBeGreaterThan(0);
        expect(timestamps[0]).toMatch(/^0:00 /);

        return timestamps.length > 0 && timestamps[0].startsWith('0:00 ');
      }),
      { numRuns: 100 }
    );
  });
});
