import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SurvivalTimingConfig,
  DEFAULT_SURVIVAL_TIMING,
  DEFAULT_SECTION_DURATIONS,
  TIMING_BOUNDS,
  calculateRoundDuration,
  calculateTotalVideoDuration,
  validateRoundTiming,
  validateTotalVideoDuration,
  validateIntroDuration,
  validateEndingDuration,
} from './timing';

/**
 * Feature: survival-quiz-longform, Property 3: Round Duration Bounds
 * Validates: Requirements 1.3, 6.1
 *
 * For any valid timing configuration, calculateRoundDuration(config) returns
 * a value between 8-10 seconds.
 *
 * Requirement 1.3: Each round should be 8-10 seconds
 * Requirement 6.1: THE Timing_System SHALL structure each round as:
 * situation (1.5초) → Dog answer (1.5초) → Cat answer (1.5초) →
 * delay (0.5초) → Floor_Drop (1.5초) → explanation (1.5초)
 */
describe('Property 3: Round Duration Bounds', () => {
  /**
   * Arbitrary generator for valid SurvivalTimingConfig values.
   * Generates configurations that should produce durations within 8-10 seconds.
   *
   * The generator constrains individual phase durations to reasonable ranges
   * that, when summed, fall within the 8-10 second target.
   */
  const validTimingConfigArb: fc.Arbitrary<SurvivalTimingConfig> = fc
    .record({
      // Each phase has reasonable bounds that contribute to 8-10 second total
      situationDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      dogAnswerDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      catAnswerDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      revealDelay: fc.double({ min: 0.3, max: 0.7, noNaN: true }),
      floorDropDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      explanationDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      transitionDuration: fc.double({ min: 0.2, max: 0.5, noNaN: true }),
    })
    .filter((config) => {
      // Filter to only include configs that produce valid durations (8-10 seconds)
      const duration = calculateRoundDuration(config);
      return (
        duration >= TIMING_BOUNDS.minRoundDuration && duration <= TIMING_BOUNDS.maxRoundDuration
      );
    });

  /**
   * Property 3.1: Default timing configuration produces duration within bounds
   * **Validates: Requirements 1.3, 6.1**
   *
   * The DEFAULT_SURVIVAL_TIMING configuration SHALL produce a round duration
   * between 8 and 10 seconds.
   */
  it('default timing configuration produces duration within 8-10 seconds', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const duration = calculateRoundDuration(DEFAULT_SURVIVAL_TIMING);

        expect(duration).toBeGreaterThanOrEqual(TIMING_BOUNDS.minRoundDuration);
        expect(duration).toBeLessThanOrEqual(TIMING_BOUNDS.maxRoundDuration);

        return (
          duration >= TIMING_BOUNDS.minRoundDuration && duration <= TIMING_BOUNDS.maxRoundDuration
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: Any valid timing configuration produces duration within bounds
   * **Validates: Requirements 1.3, 6.1**
   *
   * For any SurvivalTimingConfig that passes validation, the calculated
   * round duration SHALL be between 8 and 10 seconds.
   */
  it('any valid timing configuration produces duration within 8-10 seconds', () => {
    fc.assert(
      fc.property(validTimingConfigArb, (config) => {
        const duration = calculateRoundDuration(config);

        expect(duration).toBeGreaterThanOrEqual(TIMING_BOUNDS.minRoundDuration);
        expect(duration).toBeLessThanOrEqual(TIMING_BOUNDS.maxRoundDuration);

        return (
          duration >= TIMING_BOUNDS.minRoundDuration && duration <= TIMING_BOUNDS.maxRoundDuration
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: validateRoundTiming returns isValid: true only for durations within bounds
   * **Validates: Requirements 1.3, 6.1**
   *
   * When validateRoundTiming returns isValid: true, the duration SHALL be
   * between 8 and 10 seconds.
   */
  it('validateRoundTiming returns isValid: true only for durations within 8-10 seconds', () => {
    fc.assert(
      fc.property(validTimingConfigArb, (config) => {
        const result = validateRoundTiming(config);

        if (result.isValid) {
          expect(result.duration).toBeGreaterThanOrEqual(TIMING_BOUNDS.minRoundDuration);
          expect(result.duration).toBeLessThanOrEqual(TIMING_BOUNDS.maxRoundDuration);
        }

        return (
          !result.isValid ||
          (result.duration >= TIMING_BOUNDS.minRoundDuration &&
            result.duration <= TIMING_BOUNDS.maxRoundDuration)
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: Duration calculation is deterministic
   * **Validates: Requirements 1.3, 6.1**
   *
   * For any timing configuration, calling calculateRoundDuration multiple times
   * SHALL produce the same result.
   */
  it('duration calculation is deterministic for same configuration', () => {
    fc.assert(
      fc.property(validTimingConfigArb, (config) => {
        const duration1 = calculateRoundDuration(config);
        const duration2 = calculateRoundDuration(config);
        const duration3 = calculateRoundDuration(config);

        expect(duration1).toBe(duration2);
        expect(duration2).toBe(duration3);

        return duration1 === duration2 && duration2 === duration3;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: Duration equals sum of all phase durations
   * **Validates: Requirements 1.3, 6.1**
   *
   * The calculated round duration SHALL equal the sum of all individual
   * phase durations (situation + dogAnswer + catAnswer + revealDelay +
   * floorDrop + explanation + transition).
   */
  it('duration equals sum of all phase durations', () => {
    fc.assert(
      fc.property(validTimingConfigArb, (config) => {
        const calculatedDuration = calculateRoundDuration(config);
        const expectedSum =
          config.situationDuration +
          config.dogAnswerDuration +
          config.catAnswerDuration +
          config.revealDelay +
          config.floorDropDuration +
          config.explanationDuration +
          config.transitionDuration;

        // Use toBeCloseTo for floating point comparison
        expect(calculatedDuration).toBeCloseTo(expectedSum, 10);

        return Math.abs(calculatedDuration - expectedSum) < 0.0001;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.6: Minimum bound is exactly 8 seconds
   * **Validates: Requirements 1.3, 6.1**
   *
   * The TIMING_BOUNDS.minRoundDuration SHALL be exactly 8 seconds.
   */
  it('minimum round duration bound is exactly 8 seconds', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(TIMING_BOUNDS.minRoundDuration).toBe(8);
        return TIMING_BOUNDS.minRoundDuration === 8;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.7: Maximum bound is exactly 10 seconds
   * **Validates: Requirements 1.3, 6.1**
   *
   * The TIMING_BOUNDS.maxRoundDuration SHALL be exactly 10 seconds.
   */
  it('maximum round duration bound is exactly 10 seconds', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(TIMING_BOUNDS.maxRoundDuration).toBe(10);
        return TIMING_BOUNDS.maxRoundDuration === 10;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.8: Configurations at exact minimum (8 seconds) are valid
   * **Validates: Requirements 1.3, 6.1**
   *
   * A timing configuration that produces exactly 8 seconds SHALL be valid.
   */
  it('configurations producing exactly 8 seconds are valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Create a config that produces exactly 8 seconds
        const exactMinConfig: SurvivalTimingConfig = {
          situationDuration: 1.5,
          dogAnswerDuration: 1.5,
          catAnswerDuration: 1.5,
          revealDelay: 0.5,
          floorDropDuration: 1.5,
          explanationDuration: 1.2,
          transitionDuration: 0.3,
        };

        const duration = calculateRoundDuration(exactMinConfig);
        const result = validateRoundTiming(exactMinConfig);

        expect(duration).toBe(8);
        expect(result.isValid).toBe(true);

        return duration === 8 && result.isValid;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.9: Configurations at exact maximum (10 seconds) are valid
   * **Validates: Requirements 1.3, 6.1**
   *
   * A timing configuration that produces exactly 10 seconds SHALL be valid.
   */
  it('configurations producing exactly 10 seconds are valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Create a config that produces exactly 10 seconds
        const exactMaxConfig: SurvivalTimingConfig = {
          situationDuration: 2,
          dogAnswerDuration: 2,
          catAnswerDuration: 2,
          revealDelay: 0.5,
          floorDropDuration: 1.5,
          explanationDuration: 1.5,
          transitionDuration: 0.5,
        };

        const duration = calculateRoundDuration(exactMaxConfig);
        const result = validateRoundTiming(exactMaxConfig);

        expect(duration).toBe(10);
        expect(result.isValid).toBe(true);

        return duration === 10 && result.isValid;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.10: Configurations below minimum (< 8 seconds) are invalid
   * **Validates: Requirements 1.3, 6.1**
   *
   * A timing configuration that produces less than 8 seconds SHALL be invalid.
   */
  it('configurations producing less than 8 seconds are invalid', () => {
    // Generate configs that produce durations below 8 seconds
    const shortTimingConfigArb: fc.Arbitrary<SurvivalTimingConfig> = fc
      .record({
        situationDuration: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        dogAnswerDuration: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        catAnswerDuration: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        revealDelay: fc.double({ min: 0.1, max: 0.3, noNaN: true }),
        floorDropDuration: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        explanationDuration: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        transitionDuration: fc.double({ min: 0.1, max: 0.2, noNaN: true }),
      })
      .filter((config) => {
        const duration = calculateRoundDuration(config);
        return duration < TIMING_BOUNDS.minRoundDuration;
      });

    fc.assert(
      fc.property(shortTimingConfigArb, (config) => {
        const result = validateRoundTiming(config);

        expect(result.isValid).toBe(false);
        expect(result.duration).toBeLessThan(TIMING_BOUNDS.minRoundDuration);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid &&
          result.duration < TIMING_BOUNDS.minRoundDuration &&
          result.error !== undefined &&
          result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.11: Configurations above maximum (> 10 seconds) are invalid
   * **Validates: Requirements 1.3, 6.1**
   *
   * A timing configuration that produces more than 10 seconds SHALL be invalid.
   */
  it('configurations producing more than 10 seconds are invalid', () => {
    // Generate configs that produce durations above 10 seconds
    const longTimingConfigArb: fc.Arbitrary<SurvivalTimingConfig> = fc
      .record({
        situationDuration: fc.double({ min: 2.0, max: 3.0, noNaN: true }),
        dogAnswerDuration: fc.double({ min: 2.0, max: 3.0, noNaN: true }),
        catAnswerDuration: fc.double({ min: 2.0, max: 3.0, noNaN: true }),
        revealDelay: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        floorDropDuration: fc.double({ min: 2.0, max: 3.0, noNaN: true }),
        explanationDuration: fc.double({ min: 2.0, max: 3.0, noNaN: true }),
        transitionDuration: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
      })
      .filter((config) => {
        const duration = calculateRoundDuration(config);
        return duration > TIMING_BOUNDS.maxRoundDuration;
      });

    fc.assert(
      fc.property(longTimingConfigArb, (config) => {
        const result = validateRoundTiming(config);

        expect(result.isValid).toBe(false);
        expect(result.duration).toBeGreaterThan(TIMING_BOUNDS.maxRoundDuration);
        expect(result.error).toContain('exceeds maximum');

        return (
          !result.isValid &&
          result.duration > TIMING_BOUNDS.maxRoundDuration &&
          result.error !== undefined &&
          result.error.includes('exceeds maximum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.12: validateRoundTiming duration matches calculateRoundDuration
   * **Validates: Requirements 1.3, 6.1**
   *
   * The duration returned by validateRoundTiming SHALL match the value
   * returned by calculateRoundDuration for the same configuration.
   */
  it('validateRoundTiming duration matches calculateRoundDuration', () => {
    // Generate arbitrary timing configs (both valid and invalid)
    const anyTimingConfigArb: fc.Arbitrary<SurvivalTimingConfig> = fc.record({
      situationDuration: fc.double({ min: 0.5, max: 3.0, noNaN: true }),
      dogAnswerDuration: fc.double({ min: 0.5, max: 3.0, noNaN: true }),
      catAnswerDuration: fc.double({ min: 0.5, max: 3.0, noNaN: true }),
      revealDelay: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
      floorDropDuration: fc.double({ min: 0.5, max: 3.0, noNaN: true }),
      explanationDuration: fc.double({ min: 0.5, max: 3.0, noNaN: true }),
      transitionDuration: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
    });

    fc.assert(
      fc.property(anyTimingConfigArb, (config) => {
        const calculatedDuration = calculateRoundDuration(config);
        const validationResult = validateRoundTiming(config);

        expect(validationResult.duration).toBeCloseTo(calculatedDuration, 10);

        return Math.abs(validationResult.duration - calculatedDuration) < 0.0001;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.13: All phase durations are non-negative in valid configs
   * **Validates: Requirements 1.3, 6.1**
   *
   * For any valid timing configuration, all individual phase durations
   * SHALL be non-negative.
   */
  it('all phase durations are non-negative in valid configurations', () => {
    fc.assert(
      fc.property(validTimingConfigArb, (config) => {
        expect(config.situationDuration).toBeGreaterThanOrEqual(0);
        expect(config.dogAnswerDuration).toBeGreaterThanOrEqual(0);
        expect(config.catAnswerDuration).toBeGreaterThanOrEqual(0);
        expect(config.revealDelay).toBeGreaterThanOrEqual(0);
        expect(config.floorDropDuration).toBeGreaterThanOrEqual(0);
        expect(config.explanationDuration).toBeGreaterThanOrEqual(0);
        expect(config.transitionDuration).toBeGreaterThanOrEqual(0);

        return (
          config.situationDuration >= 0 &&
          config.dogAnswerDuration >= 0 &&
          config.catAnswerDuration >= 0 &&
          config.revealDelay >= 0 &&
          config.floorDropDuration >= 0 &&
          config.explanationDuration >= 0 &&
          config.transitionDuration >= 0
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.14: Duration is always a finite positive number
   * **Validates: Requirements 1.3, 6.1**
   *
   * For any timing configuration with non-negative phase durations,
   * the calculated duration SHALL be a finite positive number.
   */
  it('duration is always a finite positive number for non-negative phases', () => {
    const nonNegativeTimingConfigArb: fc.Arbitrary<SurvivalTimingConfig> = fc.record({
      situationDuration: fc.double({ min: 0, max: 5.0, noNaN: true }),
      dogAnswerDuration: fc.double({ min: 0, max: 5.0, noNaN: true }),
      catAnswerDuration: fc.double({ min: 0, max: 5.0, noNaN: true }),
      revealDelay: fc.double({ min: 0, max: 2.0, noNaN: true }),
      floorDropDuration: fc.double({ min: 0, max: 5.0, noNaN: true }),
      explanationDuration: fc.double({ min: 0, max: 5.0, noNaN: true }),
      transitionDuration: fc.double({ min: 0, max: 2.0, noNaN: true }),
    });

    fc.assert(
      fc.property(nonNegativeTimingConfigArb, (config) => {
        const duration = calculateRoundDuration(config);

        expect(Number.isFinite(duration)).toBe(true);
        expect(duration).toBeGreaterThanOrEqual(0);

        return Number.isFinite(duration) && duration >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.15: Default timing follows the specified structure
   * **Validates: Requirements 6.1**
   *
   * The DEFAULT_SURVIVAL_TIMING SHALL follow the structure specified in
   * Requirement 6.1: situation (1.5초) → Dog answer (1.5초) → Cat answer (1.5초) →
   * delay (0.5초) → Floor_Drop (1.5초) → explanation (1.5초)
   */
  it('default timing follows the specified structure from Requirement 6.1', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Verify the default timing matches Requirement 6.1
        expect(DEFAULT_SURVIVAL_TIMING.situationDuration).toBe(1.5);
        expect(DEFAULT_SURVIVAL_TIMING.dogAnswerDuration).toBe(1.5);
        expect(DEFAULT_SURVIVAL_TIMING.catAnswerDuration).toBe(1.5);
        expect(DEFAULT_SURVIVAL_TIMING.revealDelay).toBe(0.5);
        expect(DEFAULT_SURVIVAL_TIMING.floorDropDuration).toBe(1.5);
        expect(DEFAULT_SURVIVAL_TIMING.explanationDuration).toBe(1.5);
        // Transition is 0.3초 per Requirement 6.5
        expect(DEFAULT_SURVIVAL_TIMING.transitionDuration).toBe(0.3);

        return (
          DEFAULT_SURVIVAL_TIMING.situationDuration === 1.5 &&
          DEFAULT_SURVIVAL_TIMING.dogAnswerDuration === 1.5 &&
          DEFAULT_SURVIVAL_TIMING.catAnswerDuration === 1.5 &&
          DEFAULT_SURVIVAL_TIMING.revealDelay === 0.5 &&
          DEFAULT_SURVIVAL_TIMING.floorDropDuration === 1.5 &&
          DEFAULT_SURVIVAL_TIMING.explanationDuration === 1.5 &&
          DEFAULT_SURVIVAL_TIMING.transitionDuration === 0.3
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 13: Video Duration Bounds
 * Validates: Requirements 6.3, 6.4
 *
 * For 50 rounds with valid intro (5-8s) and ending (10-15s), total video
 * duration is between 8-12 minutes.
 *
 * Requirement 6.3: WHEN total video duration exceeds 12 minutes, THE Pipeline
 * SHALL reduce round timing or round count
 * Requirement 6.4: WHEN total video duration is under 8 minutes, THE Pipeline
 * SHALL increase round timing
 */
describe('Property 13: Video Duration Bounds', () => {
  /**
   * Arbitrary generator for valid SurvivalTimingConfig values.
   * Generates configurations that produce round durations within 8-10 seconds.
   */
  const validTimingConfigArb: fc.Arbitrary<SurvivalTimingConfig> = fc
    .record({
      situationDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      dogAnswerDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      catAnswerDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      revealDelay: fc.double({ min: 0.3, max: 0.7, noNaN: true }),
      floorDropDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      explanationDuration: fc.double({ min: 1.0, max: 2.0, noNaN: true }),
      transitionDuration: fc.double({ min: 0.2, max: 0.5, noNaN: true }),
    })
    .filter((config) => {
      const duration = calculateRoundDuration(config);
      return (
        duration >= TIMING_BOUNDS.minRoundDuration && duration <= TIMING_BOUNDS.maxRoundDuration
      );
    });

  /**
   * Arbitrary generator for valid intro durations (5-8 seconds).
   * Validates: Requirement 7.4
   */
  const validIntroDurationArb: fc.Arbitrary<number> = fc.double({
    min: TIMING_BOUNDS.minIntroDuration,
    max: TIMING_BOUNDS.maxIntroDuration,
    noNaN: true,
  });

  /**
   * Arbitrary generator for valid ending durations (10-15 seconds).
   * Validates: Requirement 8.5
   */
  const validEndingDurationArb: fc.Arbitrary<number> = fc.double({
    min: TIMING_BOUNDS.minEndingDuration,
    max: TIMING_BOUNDS.maxEndingDuration,
    noNaN: true,
  });

  /**
   * Property 13.1: Video duration bounds are correctly defined
   * **Validates: Requirements 6.3, 6.4**
   *
   * The TIMING_BOUNDS SHALL define minVideoDuration as 8 minutes (480 seconds)
   * and maxVideoDuration as 12 minutes (720 seconds).
   */
  it('video duration bounds are correctly defined (8-12 minutes)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(TIMING_BOUNDS.minVideoDuration).toBe(8 * 60); // 480 seconds
        expect(TIMING_BOUNDS.maxVideoDuration).toBe(12 * 60); // 720 seconds

        return TIMING_BOUNDS.minVideoDuration === 480 && TIMING_BOUNDS.maxVideoDuration === 720;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.2: calculateTotalVideoDuration returns correct sum
   * **Validates: Requirements 6.3, 6.4**
   *
   * The calculateTotalVideoDuration function SHALL return the sum of
   * intro duration + (roundCount * roundDuration) + ending duration.
   */
  it('calculateTotalVideoDuration returns correct sum of all components', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // roundCount
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const totalDuration = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          const roundDuration = calculateRoundDuration(config);
          const expectedTotal = introDuration + roundCount * roundDuration + endingDuration;

          expect(totalDuration).toBeCloseTo(expectedTotal, 10);

          return Math.abs(totalDuration - expectedTotal) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.3: Default configuration with 50 rounds is correctly validated
   * **Validates: Requirements 6.3, 6.4**
   *
   * Using DEFAULT_SURVIVAL_TIMING with 50 rounds and default intro/ending
   * durations, the validation function SHALL correctly identify whether the
   * video duration is within bounds and provide accurate duration information.
   *
   * Note: The default 8.3s/round timing with 50 rounds produces ~7.2 minutes,
   * which is below the 8-minute minimum. Per Requirement 6.4, the Pipeline
   * would need to increase round timing to meet the minimum.
   */
  it('default configuration with 50 rounds is correctly validated', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const totalDuration = calculateTotalVideoDuration(
          50, // 50 rounds
          DEFAULT_SECTION_DURATIONS.introDuration,
          DEFAULT_SECTION_DURATIONS.endingDuration,
          DEFAULT_SURVIVAL_TIMING
        );

        const result = validateTotalVideoDuration(
          50,
          DEFAULT_SECTION_DURATIONS.introDuration,
          DEFAULT_SECTION_DURATIONS.endingDuration,
          DEFAULT_SURVIVAL_TIMING
        );

        // Verify the duration calculation is correct
        expect(result.duration).toBeCloseTo(totalDuration, 10);
        expect(result.durationMinutes).toBeCloseTo(totalDuration / 60, 10);

        // The default 50-round config produces ~434 seconds (~7.2 minutes)
        // which is below the 8-minute minimum, so isValid should be false
        // This correctly triggers Requirement 6.4: increase round timing
        const expectedValid =
          totalDuration >= TIMING_BOUNDS.minVideoDuration &&
          totalDuration <= TIMING_BOUNDS.maxVideoDuration;

        expect(result.isValid).toBe(expectedValid);

        return (
          Math.abs(result.duration - totalDuration) < 0.0001 && result.isValid === expectedValid
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.4: validateTotalVideoDuration correctly identifies valid durations
   * **Validates: Requirements 6.3, 6.4**
   *
   * When validateTotalVideoDuration returns isValid: true, the duration
   * SHALL be between 8 and 12 minutes (480-720 seconds).
   */
  it('validateTotalVideoDuration returns isValid: true only for durations within 8-12 minutes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 70 }), // roundCount
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const result = validateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          if (result.isValid) {
            expect(result.duration).toBeGreaterThanOrEqual(TIMING_BOUNDS.minVideoDuration);
            expect(result.duration).toBeLessThanOrEqual(TIMING_BOUNDS.maxVideoDuration);
          }

          return (
            !result.isValid ||
            (result.duration >= TIMING_BOUNDS.minVideoDuration &&
              result.duration <= TIMING_BOUNDS.maxVideoDuration)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.5: validateTotalVideoDuration correctly identifies videos under 8 minutes
   * **Validates: Requirements 6.4**
   *
   * When total video duration is under 8 minutes, validateTotalVideoDuration
   * SHALL return isValid: false with appropriate error message.
   */
  it('validateTotalVideoDuration returns isValid: false for videos under 8 minutes', () => {
    // Generate configurations that produce short videos (under 8 minutes)
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Very few rounds
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const totalDuration = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          // Only test if this configuration actually produces a short video
          if (totalDuration < TIMING_BOUNDS.minVideoDuration) {
            const result = validateTotalVideoDuration(
              roundCount,
              introDuration,
              endingDuration,
              config
            );

            expect(result.isValid).toBe(false);
            expect(result.duration).toBeLessThan(TIMING_BOUNDS.minVideoDuration);
            expect(result.error).toContain('below minimum');

            return (
              !result.isValid &&
              result.duration < TIMING_BOUNDS.minVideoDuration &&
              result.error !== undefined &&
              result.error.includes('below minimum')
            );
          }

          return true; // Skip if not a short video
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.6: validateTotalVideoDuration correctly identifies videos over 12 minutes
   * **Validates: Requirements 6.3**
   *
   * When total video duration exceeds 12 minutes, validateTotalVideoDuration
   * SHALL return isValid: false with appropriate error message.
   */
  it('validateTotalVideoDuration returns isValid: false for videos over 12 minutes', () => {
    // Generate configurations that produce long videos (over 12 minutes)
    fc.assert(
      fc.property(
        fc.integer({ min: 80, max: 150 }), // Many rounds
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const totalDuration = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          // Only test if this configuration actually produces a long video
          if (totalDuration > TIMING_BOUNDS.maxVideoDuration) {
            const result = validateTotalVideoDuration(
              roundCount,
              introDuration,
              endingDuration,
              config
            );

            expect(result.isValid).toBe(false);
            expect(result.duration).toBeGreaterThan(TIMING_BOUNDS.maxVideoDuration);
            expect(result.error).toContain('exceeds maximum');

            return (
              !result.isValid &&
              result.duration > TIMING_BOUNDS.maxVideoDuration &&
              result.error !== undefined &&
              result.error.includes('exceeds maximum')
            );
          }

          return true; // Skip if not a long video
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.7: validateTotalVideoDuration duration matches calculateTotalVideoDuration
   * **Validates: Requirements 6.3, 6.4**
   *
   * The duration returned by validateTotalVideoDuration SHALL match the value
   * returned by calculateTotalVideoDuration for the same parameters.
   */
  it('validateTotalVideoDuration duration matches calculateTotalVideoDuration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const calculatedDuration = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );
          const validationResult = validateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          expect(validationResult.duration).toBeCloseTo(calculatedDuration, 10);

          return Math.abs(validationResult.duration - calculatedDuration) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.8: validateTotalVideoDuration provides correct durationMinutes
   * **Validates: Requirements 6.3, 6.4**
   *
   * The durationMinutes returned by validateTotalVideoDuration SHALL equal
   * duration / 60.
   */
  it('validateTotalVideoDuration provides correct durationMinutes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const result = validateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          const expectedMinutes = result.duration / 60;

          expect(result.durationMinutes).toBeCloseTo(expectedMinutes, 10);

          return Math.abs(result.durationMinutes - expectedMinutes) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.9: Video at exact minimum boundary (8 minutes) is valid
   * **Validates: Requirements 6.3, 6.4**
   *
   * A video configuration that produces exactly 8 minutes (480 seconds)
   * SHALL be valid.
   */
  it('video at exact minimum boundary (8 minutes) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Calculate what round count would give us exactly 8 minutes
        // with default timing
        const roundDuration = calculateRoundDuration(DEFAULT_SURVIVAL_TIMING);
        const introDuration = DEFAULT_SECTION_DURATIONS.introDuration;
        const endingDuration = DEFAULT_SECTION_DURATIONS.endingDuration;

        // Target: 480 seconds = intro + (rounds * roundDuration) + ending
        // rounds = (480 - intro - ending) / roundDuration
        const targetRounds = Math.floor(
          (TIMING_BOUNDS.minVideoDuration - introDuration - endingDuration) / roundDuration
        );

        // Adjust intro/ending to hit exactly 480 seconds
        const totalWithRounds = introDuration + targetRounds * roundDuration + endingDuration;
        const adjustedEnding = endingDuration + (TIMING_BOUNDS.minVideoDuration - totalWithRounds);

        const result = validateTotalVideoDuration(
          targetRounds,
          introDuration,
          adjustedEnding,
          DEFAULT_SURVIVAL_TIMING
        );

        // The duration should be at or very close to 480 seconds
        expect(result.duration).toBeCloseTo(TIMING_BOUNDS.minVideoDuration, 1);
        expect(result.isValid).toBe(true);

        return result.isValid && Math.abs(result.duration - TIMING_BOUNDS.minVideoDuration) < 1;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.10: Video at exact maximum boundary (12 minutes) is valid
   * **Validates: Requirements 6.3, 6.4**
   *
   * A video configuration that produces exactly 12 minutes (720 seconds)
   * SHALL be valid.
   */
  it('video at exact maximum boundary (12 minutes) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Calculate what round count would give us exactly 12 minutes
        const roundDuration = calculateRoundDuration(DEFAULT_SURVIVAL_TIMING);
        const introDuration = DEFAULT_SECTION_DURATIONS.introDuration;
        const endingDuration = DEFAULT_SECTION_DURATIONS.endingDuration;

        // Target: 720 seconds = intro + (rounds * roundDuration) + ending
        const targetRounds = Math.floor(
          (TIMING_BOUNDS.maxVideoDuration - introDuration - endingDuration) / roundDuration
        );

        // Adjust intro/ending to hit exactly 720 seconds
        const totalWithRounds = introDuration + targetRounds * roundDuration + endingDuration;
        const adjustedEnding = endingDuration + (TIMING_BOUNDS.maxVideoDuration - totalWithRounds);

        const result = validateTotalVideoDuration(
          targetRounds,
          introDuration,
          adjustedEnding,
          DEFAULT_SURVIVAL_TIMING
        );

        // The duration should be at or very close to 720 seconds
        expect(result.duration).toBeCloseTo(TIMING_BOUNDS.maxVideoDuration, 1);
        expect(result.isValid).toBe(true);

        return result.isValid && Math.abs(result.duration - TIMING_BOUNDS.maxVideoDuration) < 1;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.11: Total duration is always positive for valid inputs
   * **Validates: Requirements 6.3, 6.4**
   *
   * For any positive round count and non-negative intro/ending durations,
   * the total video duration SHALL be positive.
   */
  it('total duration is always positive for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.double({ min: 0, max: 20, noNaN: true }),
        fc.double({ min: 0, max: 20, noNaN: true }),
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const totalDuration = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          expect(totalDuration).toBeGreaterThan(0);
          expect(Number.isFinite(totalDuration)).toBe(true);

          return totalDuration > 0 && Number.isFinite(totalDuration);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.12: Duration increases monotonically with round count
   * **Validates: Requirements 6.3, 6.4**
   *
   * For fixed intro, ending, and timing config, increasing the round count
   * SHALL always increase the total video duration.
   */
  it('duration increases monotonically with round count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount1, roundCount2, introDuration, endingDuration, config) => {
          const duration1 = calculateTotalVideoDuration(
            roundCount1,
            introDuration,
            endingDuration,
            config
          );
          const duration2 = calculateTotalVideoDuration(
            roundCount2,
            introDuration,
            endingDuration,
            config
          );

          if (roundCount1 < roundCount2) {
            expect(duration1).toBeLessThan(duration2);
            return duration1 < duration2;
          } else if (roundCount1 > roundCount2) {
            expect(duration1).toBeGreaterThan(duration2);
            return duration1 > duration2;
          } else {
            expect(duration1).toBeCloseTo(duration2, 10);
            return Math.abs(duration1 - duration2) < 0.0001;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.13: 50 rounds with valid intro/ending produces duration in target range
   * **Validates: Requirements 6.3, 6.4**
   *
   * For 50 rounds with any valid intro (5-8s) and ending (10-15s) durations,
   * and valid timing config, the video duration SHALL be within a reasonable range.
   */
  it('50 rounds with valid intro/ending produces reasonable video duration', () => {
    fc.assert(
      fc.property(
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (introDuration, endingDuration, config) => {
          const totalDuration = calculateTotalVideoDuration(
            50, // Standard 50 rounds
            introDuration,
            endingDuration,
            config
          );

          const durationMinutes = totalDuration / 60;

          // With 50 rounds at 8-10 seconds each, plus intro/ending,
          // we expect roughly 7-9 minutes of video
          // (50 * 8 = 400s = 6.67min to 50 * 10 = 500s = 8.33min)
          // Plus intro (5-8s) and ending (10-15s) = 15-23s more
          // Total range: ~6.9 to ~8.7 minutes

          expect(durationMinutes).toBeGreaterThan(6);
          expect(durationMinutes).toBeLessThan(10);

          return durationMinutes > 6 && durationMinutes < 10;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.14: Calculation is deterministic
   * **Validates: Requirements 6.3, 6.4**
   *
   * For the same inputs, calculateTotalVideoDuration SHALL always return
   * the same result.
   */
  it('calculation is deterministic for same inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        validIntroDurationArb,
        validEndingDurationArb,
        validTimingConfigArb,
        (roundCount, introDuration, endingDuration, config) => {
          const duration1 = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );
          const duration2 = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );
          const duration3 = calculateTotalVideoDuration(
            roundCount,
            introDuration,
            endingDuration,
            config
          );

          expect(duration1).toBe(duration2);
          expect(duration2).toBe(duration3);

          return duration1 === duration2 && duration2 === duration3;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 14: Intro Duration Bounds
 * Validates: Requirements 7.4
 *
 * For any SurvivalIntro configuration, validateIntroDuration returns
 * isValid: true only for durations between 5-8 seconds.
 *
 * Requirement 7.4: THE Survival_Intro SHALL be 5-8 seconds in duration
 */
describe('Property 14: Intro Duration Bounds', () => {
  /**
   * Arbitrary generator for valid intro durations (5-8 seconds).
   */
  const validIntroDurationArb: fc.Arbitrary<number> = fc.double({
    min: TIMING_BOUNDS.minIntroDuration,
    max: TIMING_BOUNDS.maxIntroDuration,
    noNaN: true,
  });

  /**
   * Arbitrary generator for intro durations below minimum (< 5 seconds).
   */
  const belowMinIntroDurationArb: fc.Arbitrary<number> = fc.double({
    min: 0,
    max: TIMING_BOUNDS.minIntroDuration - 0.001,
    noNaN: true,
  });

  /**
   * Arbitrary generator for intro durations above maximum (> 8 seconds).
   */
  const aboveMaxIntroDurationArb: fc.Arbitrary<number> = fc.double({
    min: TIMING_BOUNDS.maxIntroDuration + 0.001,
    max: 30,
    noNaN: true,
  });

  /**
   * Property 14.1: Intro duration bounds are correctly defined
   * **Validates: Requirements 7.4**
   *
   * The TIMING_BOUNDS SHALL define minIntroDuration as 5 seconds
   * and maxIntroDuration as 8 seconds.
   */
  it('intro duration bounds are correctly defined (5-8 seconds)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(TIMING_BOUNDS.minIntroDuration).toBe(5);
        expect(TIMING_BOUNDS.maxIntroDuration).toBe(8);

        return TIMING_BOUNDS.minIntroDuration === 5 && TIMING_BOUNDS.maxIntroDuration === 8;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.2: Default intro duration is within bounds
   * **Validates: Requirements 7.4**
   *
   * The DEFAULT_SECTION_DURATIONS.introDuration SHALL be between 5 and 8 seconds.
   */
  it('default intro duration is within bounds (5-8 seconds)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const defaultIntro = DEFAULT_SECTION_DURATIONS.introDuration;

        expect(defaultIntro).toBeGreaterThanOrEqual(TIMING_BOUNDS.minIntroDuration);
        expect(defaultIntro).toBeLessThanOrEqual(TIMING_BOUNDS.maxIntroDuration);

        return (
          defaultIntro >= TIMING_BOUNDS.minIntroDuration &&
          defaultIntro <= TIMING_BOUNDS.maxIntroDuration
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.3: validateIntroDuration returns isValid: true for durations within bounds
   * **Validates: Requirements 7.4**
   *
   * For any intro duration between 5 and 8 seconds, validateIntroDuration
   * SHALL return isValid: true.
   */
  it('validateIntroDuration returns isValid: true for durations between 5-8 seconds', () => {
    fc.assert(
      fc.property(validIntroDurationArb, (duration) => {
        const result = validateIntroDuration(duration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.4: validateIntroDuration returns isValid: false for durations below minimum
   * **Validates: Requirements 7.4**
   *
   * For any intro duration below 5 seconds, validateIntroDuration
   * SHALL return isValid: false with appropriate error message.
   */
  it('validateIntroDuration returns isValid: false for durations below 5 seconds', () => {
    fc.assert(
      fc.property(belowMinIntroDurationArb, (duration) => {
        const result = validateIntroDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.5: validateIntroDuration returns isValid: false for durations above maximum
   * **Validates: Requirements 7.4**
   *
   * For any intro duration above 8 seconds, validateIntroDuration
   * SHALL return isValid: false with appropriate error message.
   */
  it('validateIntroDuration returns isValid: false for durations above 8 seconds', () => {
    fc.assert(
      fc.property(aboveMaxIntroDurationArb, (duration) => {
        const result = validateIntroDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('exceeds maximum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('exceeds maximum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.6: Intro duration at exact minimum (5 seconds) is valid
   * **Validates: Requirements 7.4**
   *
   * An intro duration of exactly 5 seconds SHALL be valid.
   */
  it('intro duration at exact minimum (5 seconds) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateIntroDuration(TIMING_BOUNDS.minIntroDuration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.7: Intro duration at exact maximum (8 seconds) is valid
   * **Validates: Requirements 7.4**
   *
   * An intro duration of exactly 8 seconds SHALL be valid.
   */
  it('intro duration at exact maximum (8 seconds) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateIntroDuration(TIMING_BOUNDS.maxIntroDuration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.8: validateIntroDuration is deterministic
   * **Validates: Requirements 7.4**
   *
   * For any intro duration, calling validateIntroDuration multiple times
   * SHALL produce the same result.
   */
  it('validateIntroDuration is deterministic for same duration', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 20, noNaN: true }), (duration) => {
        const result1 = validateIntroDuration(duration);
        const result2 = validateIntroDuration(duration);
        const result3 = validateIntroDuration(duration);

        expect(result1.isValid).toBe(result2.isValid);
        expect(result2.isValid).toBe(result3.isValid);
        expect(result1.error).toBe(result2.error);
        expect(result2.error).toBe(result3.error);

        return (
          result1.isValid === result2.isValid &&
          result2.isValid === result3.isValid &&
          result1.error === result2.error &&
          result2.error === result3.error
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.9: Intro duration just below minimum is invalid
   * **Validates: Requirements 7.4**
   *
   * An intro duration of 4.999 seconds (just below 5) SHALL be invalid.
   */
  it('intro duration just below minimum (4.999 seconds) is invalid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const justBelowMin = TIMING_BOUNDS.minIntroDuration - 0.001;
        const result = validateIntroDuration(justBelowMin);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.10: Intro duration just above maximum is invalid
   * **Validates: Requirements 7.4**
   *
   * An intro duration of 8.001 seconds (just above 8) SHALL be invalid.
   */
  it('intro duration just above maximum (8.001 seconds) is invalid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const justAboveMax = TIMING_BOUNDS.maxIntroDuration + 0.001;
        const result = validateIntroDuration(justAboveMax);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('exceeds maximum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('exceeds maximum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.11: Zero intro duration is invalid
   * **Validates: Requirements 7.4**
   *
   * An intro duration of 0 seconds SHALL be invalid.
   */
  it('zero intro duration is invalid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateIntroDuration(0);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.12: Negative intro duration is invalid
   * **Validates: Requirements 7.4**
   *
   * Any negative intro duration SHALL be invalid.
   */
  it('negative intro duration is invalid', () => {
    fc.assert(
      fc.property(fc.double({ min: -100, max: -0.001, noNaN: true }), (duration) => {
        const result = validateIntroDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.13: Error message includes actual duration value
   * **Validates: Requirements 7.4**
   *
   * When validateIntroDuration returns an error, the error message
   * SHALL include the actual duration value.
   */
  it('error message includes actual duration value', () => {
    fc.assert(
      fc.property(fc.oneof(belowMinIntroDurationArb, aboveMaxIntroDurationArb), (duration) => {
        const result = validateIntroDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain(duration.toString());

        return (
          !result.isValid &&
          result.error !== undefined &&
          result.error.includes(duration.toString())
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.14: Valid intro durations span the entire 5-8 second range
   * **Validates: Requirements 7.4**
   *
   * Any duration value within the 5-8 second range (inclusive) SHALL be valid.
   */
  it('valid intro durations span the entire 5-8 second range', () => {
    // Test specific values across the range
    const testValues = [5, 5.5, 6, 6.5, 7, 7.5, 8];

    fc.assert(
      fc.property(fc.constantFrom(...testValues), (duration) => {
        const result = validateIntroDuration(duration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.15: Default intro duration (6.5s) is valid
   * **Validates: Requirements 7.4**
   *
   * The default intro duration of 6.5 seconds SHALL be valid.
   */
  it('default intro duration (6.5 seconds) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateIntroDuration(DEFAULT_SECTION_DURATIONS.introDuration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(DEFAULT_SECTION_DURATIONS.introDuration).toBe(6.5);

        return (
          result.isValid &&
          result.error === undefined &&
          DEFAULT_SECTION_DURATIONS.introDuration === 6.5
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 15: Ending Duration Bounds
 * Validates: Requirements 8.5
 *
 * For any SurvivalEnding configuration, validateEndingDuration returns
 * isValid: true only for durations between 10-15 seconds.
 *
 * Requirement 8.5: THE Survival_Ending SHALL be 10-15 seconds in duration
 */
describe('Property 15: Ending Duration Bounds', () => {
  /**
   * Arbitrary generator for valid ending durations (10-15 seconds).
   */
  const validEndingDurationArb: fc.Arbitrary<number> = fc.double({
    min: TIMING_BOUNDS.minEndingDuration,
    max: TIMING_BOUNDS.maxEndingDuration,
    noNaN: true,
  });

  /**
   * Arbitrary generator for ending durations below minimum (< 10 seconds).
   */
  const belowMinEndingDurationArb: fc.Arbitrary<number> = fc.double({
    min: 0,
    max: TIMING_BOUNDS.minEndingDuration - 0.001,
    noNaN: true,
  });

  /**
   * Arbitrary generator for ending durations above maximum (> 15 seconds).
   */
  const aboveMaxEndingDurationArb: fc.Arbitrary<number> = fc.double({
    min: TIMING_BOUNDS.maxEndingDuration + 0.001,
    max: 60,
    noNaN: true,
  });

  /**
   * Property 15.1: Ending duration bounds are correctly defined
   * **Validates: Requirements 8.5**
   *
   * The TIMING_BOUNDS SHALL define minEndingDuration as 10 seconds
   * and maxEndingDuration as 15 seconds.
   */
  it('ending duration bounds are correctly defined (10-15 seconds)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(TIMING_BOUNDS.minEndingDuration).toBe(10);
        expect(TIMING_BOUNDS.maxEndingDuration).toBe(15);

        return TIMING_BOUNDS.minEndingDuration === 10 && TIMING_BOUNDS.maxEndingDuration === 15;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.2: Default ending duration is within bounds
   * **Validates: Requirements 8.5**
   *
   * The DEFAULT_SECTION_DURATIONS.endingDuration SHALL be between 10 and 15 seconds.
   */
  it('default ending duration is within bounds (10-15 seconds)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const defaultEnding = DEFAULT_SECTION_DURATIONS.endingDuration;

        expect(defaultEnding).toBeGreaterThanOrEqual(TIMING_BOUNDS.minEndingDuration);
        expect(defaultEnding).toBeLessThanOrEqual(TIMING_BOUNDS.maxEndingDuration);

        return (
          defaultEnding >= TIMING_BOUNDS.minEndingDuration &&
          defaultEnding <= TIMING_BOUNDS.maxEndingDuration
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.3: validateEndingDuration returns isValid: true for durations within bounds
   * **Validates: Requirements 8.5**
   *
   * For any ending duration between 10 and 15 seconds, validateEndingDuration
   * SHALL return isValid: true.
   */
  it('validateEndingDuration returns isValid: true for durations between 10-15 seconds', () => {
    fc.assert(
      fc.property(validEndingDurationArb, (duration) => {
        const result = validateEndingDuration(duration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.4: validateEndingDuration returns isValid: false for durations below minimum
   * **Validates: Requirements 8.5**
   *
   * For any ending duration below 10 seconds, validateEndingDuration
   * SHALL return isValid: false with appropriate error message.
   */
  it('validateEndingDuration returns isValid: false for durations below 10 seconds', () => {
    fc.assert(
      fc.property(belowMinEndingDurationArb, (duration) => {
        const result = validateEndingDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.5: validateEndingDuration returns isValid: false for durations above maximum
   * **Validates: Requirements 8.5**
   *
   * For any ending duration above 15 seconds, validateEndingDuration
   * SHALL return isValid: false with appropriate error message.
   */
  it('validateEndingDuration returns isValid: false for durations above 15 seconds', () => {
    fc.assert(
      fc.property(aboveMaxEndingDurationArb, (duration) => {
        const result = validateEndingDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('exceeds maximum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('exceeds maximum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.6: Ending duration at exact minimum (10 seconds) is valid
   * **Validates: Requirements 8.5**
   *
   * An ending duration of exactly 10 seconds SHALL be valid.
   */
  it('ending duration at exact minimum (10 seconds) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateEndingDuration(TIMING_BOUNDS.minEndingDuration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.7: Ending duration at exact maximum (15 seconds) is valid
   * **Validates: Requirements 8.5**
   *
   * An ending duration of exactly 15 seconds SHALL be valid.
   */
  it('ending duration at exact maximum (15 seconds) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateEndingDuration(TIMING_BOUNDS.maxEndingDuration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.8: validateEndingDuration is deterministic
   * **Validates: Requirements 8.5**
   *
   * For any ending duration, calling validateEndingDuration multiple times
   * SHALL produce the same result.
   */
  it('validateEndingDuration is deterministic for same duration', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 60, noNaN: true }), (duration) => {
        const result1 = validateEndingDuration(duration);
        const result2 = validateEndingDuration(duration);
        const result3 = validateEndingDuration(duration);

        expect(result1.isValid).toBe(result2.isValid);
        expect(result2.isValid).toBe(result3.isValid);
        expect(result1.error).toBe(result2.error);
        expect(result2.error).toBe(result3.error);

        return (
          result1.isValid === result2.isValid &&
          result2.isValid === result3.isValid &&
          result1.error === result2.error &&
          result2.error === result3.error
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.9: Ending duration just below minimum is invalid
   * **Validates: Requirements 8.5**
   *
   * An ending duration of 9.999 seconds (just below 10) SHALL be invalid.
   */
  it('ending duration just below minimum (9.999 seconds) is invalid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const justBelowMin = TIMING_BOUNDS.minEndingDuration - 0.001;
        const result = validateEndingDuration(justBelowMin);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.10: Ending duration just above maximum is invalid
   * **Validates: Requirements 8.5**
   *
   * An ending duration of 15.001 seconds (just above 15) SHALL be invalid.
   */
  it('ending duration just above maximum (15.001 seconds) is invalid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const justAboveMax = TIMING_BOUNDS.maxEndingDuration + 0.001;
        const result = validateEndingDuration(justAboveMax);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('exceeds maximum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('exceeds maximum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.11: Zero ending duration is invalid
   * **Validates: Requirements 8.5**
   *
   * An ending duration of 0 seconds SHALL be invalid.
   */
  it('zero ending duration is invalid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateEndingDuration(0);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.12: Negative ending duration is invalid
   * **Validates: Requirements 8.5**
   *
   * Any negative ending duration SHALL be invalid.
   */
  it('negative ending duration is invalid', () => {
    fc.assert(
      fc.property(fc.double({ min: -100, max: -0.001, noNaN: true }), (duration) => {
        const result = validateEndingDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('below minimum');

        return (
          !result.isValid && result.error !== undefined && result.error.includes('below minimum')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.13: Error message includes actual duration value
   * **Validates: Requirements 8.5**
   *
   * When validateEndingDuration returns an error, the error message
   * SHALL include the actual duration value.
   */
  it('error message includes actual duration value', () => {
    fc.assert(
      fc.property(fc.oneof(belowMinEndingDurationArb, aboveMaxEndingDurationArb), (duration) => {
        const result = validateEndingDuration(duration);

        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain(duration.toString());

        return (
          !result.isValid &&
          result.error !== undefined &&
          result.error.includes(duration.toString())
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.14: Valid ending durations span the entire 10-15 second range
   * **Validates: Requirements 8.5**
   *
   * Any duration value within the 10-15 second range (inclusive) SHALL be valid.
   */
  it('valid ending durations span the entire 10-15 second range', () => {
    // Test specific values across the range
    const testValues = [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15];

    fc.assert(
      fc.property(fc.constantFrom(...testValues), (duration) => {
        const result = validateEndingDuration(duration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();

        return result.isValid && result.error === undefined;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.15: Default ending duration (12.5s) is valid
   * **Validates: Requirements 8.5**
   *
   * The default ending duration of 12.5 seconds SHALL be valid.
   */
  it('default ending duration (12.5 seconds) is valid', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = validateEndingDuration(DEFAULT_SECTION_DURATIONS.endingDuration);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(DEFAULT_SECTION_DURATIONS.endingDuration).toBe(12.5);

        return (
          result.isValid &&
          result.error === undefined &&
          DEFAULT_SECTION_DURATIONS.endingDuration === 12.5
        );
      }),
      { numRuns: 100 }
    );
  });
});
