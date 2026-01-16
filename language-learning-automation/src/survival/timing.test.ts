import { describe, it, expect } from 'vitest';
import {
  SurvivalTimingConfig,
  DEFAULT_SURVIVAL_TIMING,
  TIMING_BOUNDS,
  DEFAULT_SECTION_DURATIONS,
  calculateRoundDuration,
  calculateTotalVideoDuration,
  validateRoundTiming,
  validateIntroDuration,
  validateEndingDuration,
  validateTotalVideoDuration,
  calculateFrameCount,
  getRoundPhaseFrames,
  getRoundPhaseStartFrames,
} from './timing';

describe('timing', () => {
  describe('DEFAULT_SURVIVAL_TIMING', () => {
    /**
     * Validates: Requirement 6.1
     * THE Timing_System SHALL structure each round as:
     * situation (1.5초) → Dog answer (1.5초) → Cat answer (1.5초) →
     * delay (0.5초) → Floor_Drop (1.5초) → explanation (1.5초)
     */
    it('should have correct default values', () => {
      expect(DEFAULT_SURVIVAL_TIMING.situationDuration).toBe(1.5);
      expect(DEFAULT_SURVIVAL_TIMING.dogAnswerDuration).toBe(1.5);
      expect(DEFAULT_SURVIVAL_TIMING.catAnswerDuration).toBe(1.5);
      expect(DEFAULT_SURVIVAL_TIMING.revealDelay).toBe(0.5);
      expect(DEFAULT_SURVIVAL_TIMING.floorDropDuration).toBe(1.5);
      expect(DEFAULT_SURVIVAL_TIMING.explanationDuration).toBe(1.5);
      expect(DEFAULT_SURVIVAL_TIMING.transitionDuration).toBe(0.3);
    });

    /**
     * Validates: Requirement 6.5
     * THE Timing_System SHALL insert brief transitions between rounds (0.3초)
     */
    it('should have 0.3 second transition duration', () => {
      expect(DEFAULT_SURVIVAL_TIMING.transitionDuration).toBe(0.3);
    });
  });

  describe('TIMING_BOUNDS', () => {
    /**
     * Validates: Requirements 1.3, 6.1
     * Each round should be 8-10 seconds
     */
    it('should have correct round duration bounds', () => {
      expect(TIMING_BOUNDS.minRoundDuration).toBe(8);
      expect(TIMING_BOUNDS.maxRoundDuration).toBe(10);
    });

    /**
     * Validates: Requirement 7.4
     * THE Survival_Intro SHALL be 5-8 seconds in duration
     */
    it('should have correct intro duration bounds', () => {
      expect(TIMING_BOUNDS.minIntroDuration).toBe(5);
      expect(TIMING_BOUNDS.maxIntroDuration).toBe(8);
    });

    /**
     * Validates: Requirement 8.5
     * THE Survival_Ending SHALL be 10-15 seconds in duration
     */
    it('should have correct ending duration bounds', () => {
      expect(TIMING_BOUNDS.minEndingDuration).toBe(10);
      expect(TIMING_BOUNDS.maxEndingDuration).toBe(15);
    });

    /**
     * Validates: Requirements 6.3, 6.4
     * Total video should be between 8-12 minutes
     */
    it('should have correct video duration bounds', () => {
      expect(TIMING_BOUNDS.minVideoDuration).toBe(8 * 60); // 8 minutes in seconds
      expect(TIMING_BOUNDS.maxVideoDuration).toBe(12 * 60); // 12 minutes in seconds
    });
  });

  describe('calculateRoundDuration', () => {
    /**
     * Validates: Requirements 1.3, 6.1
     * Each round should be 8-10 seconds
     */
    it('should calculate correct duration for default timing', () => {
      const duration = calculateRoundDuration(DEFAULT_SURVIVAL_TIMING);
      // 1.5 + 1.5 + 1.5 + 0.5 + 1.5 + 1.5 + 0.3 = 8.3
      expect(duration).toBe(8.3);
    });

    it('should calculate correct duration for custom timing', () => {
      const customTiming: SurvivalTimingConfig = {
        situationDuration: 2,
        dogAnswerDuration: 2,
        catAnswerDuration: 2,
        revealDelay: 0.5,
        floorDropDuration: 1.5,
        explanationDuration: 1.5,
        transitionDuration: 0.5,
      };
      const duration = calculateRoundDuration(customTiming);
      // 2 + 2 + 2 + 0.5 + 1.5 + 1.5 + 0.5 = 10
      expect(duration).toBe(10);
    });

    it('should sum all phase durations', () => {
      const timing: SurvivalTimingConfig = {
        situationDuration: 1,
        dogAnswerDuration: 1,
        catAnswerDuration: 1,
        revealDelay: 1,
        floorDropDuration: 1,
        explanationDuration: 1,
        transitionDuration: 1,
      };
      const duration = calculateRoundDuration(timing);
      expect(duration).toBe(7);
    });
  });

  describe('calculateTotalVideoDuration', () => {
    /**
     * Validates: Requirements 6.3, 6.4
     * Total video should be between 8-12 minutes
     */
    it('should calculate correct total duration for 50 rounds', () => {
      const roundCount = 50;
      const introDuration = 6.5;
      const endingDuration = 12.5;

      const totalDuration = calculateTotalVideoDuration(
        roundCount,
        introDuration,
        endingDuration,
        DEFAULT_SURVIVAL_TIMING
      );

      // 6.5 + (50 * 8.3) + 12.5 = 6.5 + 415 + 12.5 = 434 seconds
      expect(totalDuration).toBeCloseTo(434, 5);
    });

    it('should calculate correct total duration for different round counts', () => {
      const introDuration = 6;
      const endingDuration = 12;

      // 10 rounds
      const duration10 = calculateTotalVideoDuration(
        10,
        introDuration,
        endingDuration,
        DEFAULT_SURVIVAL_TIMING
      );
      // 6 + (10 * 8.3) + 12 = 6 + 83 + 12 = 101 seconds
      expect(duration10).toBe(101);

      // 100 rounds
      const duration100 = calculateTotalVideoDuration(
        100,
        introDuration,
        endingDuration,
        DEFAULT_SURVIVAL_TIMING
      );
      // 6 + (100 * 8.3) + 12 = 6 + 830 + 12 = 848 seconds
      expect(duration100).toBeCloseTo(848, 5);
    });

    it('should handle zero rounds', () => {
      const totalDuration = calculateTotalVideoDuration(0, 6, 12, DEFAULT_SURVIVAL_TIMING);
      expect(totalDuration).toBe(18); // Just intro + ending
    });
  });

  describe('validateRoundTiming', () => {
    /**
     * Validates: Requirements 1.3, 6.1
     * Each round should be 8-10 seconds
     */
    it('should validate default timing as valid', () => {
      const result = validateRoundTiming(DEFAULT_SURVIVAL_TIMING);
      expect(result.isValid).toBe(true);
      expect(result.duration).toBe(8.3);
      expect(result.error).toBeUndefined();
    });

    it('should reject timing below minimum', () => {
      const shortTiming: SurvivalTimingConfig = {
        situationDuration: 1,
        dogAnswerDuration: 1,
        catAnswerDuration: 1,
        revealDelay: 0.5,
        floorDropDuration: 1,
        explanationDuration: 1,
        transitionDuration: 0.3,
      };
      const result = validateRoundTiming(shortTiming);
      expect(result.isValid).toBe(false);
      expect(result.duration).toBe(5.8);
      expect(result.error).toContain('below minimum');
    });

    it('should reject timing above maximum', () => {
      const longTiming: SurvivalTimingConfig = {
        situationDuration: 2,
        dogAnswerDuration: 2,
        catAnswerDuration: 2,
        revealDelay: 1,
        floorDropDuration: 2,
        explanationDuration: 2,
        transitionDuration: 1,
      };
      const result = validateRoundTiming(longTiming);
      expect(result.isValid).toBe(false);
      expect(result.duration).toBe(12);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should accept timing at exact minimum', () => {
      const minTiming: SurvivalTimingConfig = {
        situationDuration: 1.5,
        dogAnswerDuration: 1.5,
        catAnswerDuration: 1.5,
        revealDelay: 0.5,
        floorDropDuration: 1.5,
        explanationDuration: 1.2,
        transitionDuration: 0.3,
      };
      const result = validateRoundTiming(minTiming);
      expect(result.isValid).toBe(true);
      expect(result.duration).toBe(8);
    });

    it('should accept timing at exact maximum', () => {
      const maxTiming: SurvivalTimingConfig = {
        situationDuration: 2,
        dogAnswerDuration: 2,
        catAnswerDuration: 2,
        revealDelay: 0.5,
        floorDropDuration: 1.5,
        explanationDuration: 1.5,
        transitionDuration: 0.5,
      };
      const result = validateRoundTiming(maxTiming);
      expect(result.isValid).toBe(true);
      expect(result.duration).toBe(10);
    });
  });

  describe('validateIntroDuration', () => {
    /**
     * Validates: Requirement 7.4
     * THE Survival_Intro SHALL be 5-8 seconds in duration
     */
    it('should validate duration within bounds', () => {
      expect(validateIntroDuration(5).isValid).toBe(true);
      expect(validateIntroDuration(6.5).isValid).toBe(true);
      expect(validateIntroDuration(8).isValid).toBe(true);
    });

    it('should reject duration below minimum', () => {
      const result = validateIntroDuration(4);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('below minimum');
    });

    it('should reject duration above maximum', () => {
      const result = validateIntroDuration(9);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('validateEndingDuration', () => {
    /**
     * Validates: Requirement 8.5
     * THE Survival_Ending SHALL be 10-15 seconds in duration
     */
    it('should validate duration within bounds', () => {
      expect(validateEndingDuration(10).isValid).toBe(true);
      expect(validateEndingDuration(12.5).isValid).toBe(true);
      expect(validateEndingDuration(15).isValid).toBe(true);
    });

    it('should reject duration below minimum', () => {
      const result = validateEndingDuration(8);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('below minimum');
    });

    it('should reject duration above maximum', () => {
      const result = validateEndingDuration(20);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('validateTotalVideoDuration', () => {
    /**
     * Validates: Requirements 6.3, 6.4
     * Total video should be between 8-12 minutes
     */
    it('should validate 50 rounds with default timing', () => {
      const result = validateTotalVideoDuration(
        50,
        DEFAULT_SECTION_DURATIONS.introDuration,
        DEFAULT_SECTION_DURATIONS.endingDuration,
        DEFAULT_SURVIVAL_TIMING
      );
      // 6.5 + (50 * 8.3) + 12.5 = 434 seconds = 7.23 minutes
      // This is below 8 minutes, so it should be invalid
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('below minimum');
    });

    it('should validate configuration that produces 8-12 minute video', () => {
      // To get 8 minutes (480 seconds):
      // intro (6) + rounds + ending (12) = 480
      // rounds = 462 seconds
      // With 8.3s per round: 462 / 8.3 ≈ 56 rounds
      const result = validateTotalVideoDuration(56, 6, 12, DEFAULT_SURVIVAL_TIMING);
      // 6 + (56 * 8.3) + 12 = 6 + 464.8 + 12 = 482.8 seconds = 8.05 minutes
      expect(result.isValid).toBe(true);
      expect(result.durationMinutes).toBeGreaterThanOrEqual(8);
      expect(result.durationMinutes).toBeLessThanOrEqual(12);
    });

    it('should reject video duration below 8 minutes', () => {
      const result = validateTotalVideoDuration(30, 6, 12, DEFAULT_SURVIVAL_TIMING);
      // 6 + (30 * 8.3) + 12 = 6 + 249 + 12 = 267 seconds = 4.45 minutes
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('below minimum');
    });

    it('should reject video duration above 12 minutes', () => {
      const result = validateTotalVideoDuration(100, 6, 12, DEFAULT_SURVIVAL_TIMING);
      // 6 + (100 * 8.3) + 12 = 6 + 830 + 12 = 848 seconds = 14.13 minutes
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should return duration in both seconds and minutes', () => {
      const result = validateTotalVideoDuration(50, 6, 12, DEFAULT_SURVIVAL_TIMING);
      expect(result.duration).toBeCloseTo(433, 5); // seconds
      expect(result.durationMinutes).toBeCloseTo(433 / 60, 1);
    });
  });

  describe('calculateFrameCount', () => {
    it('should calculate correct frame count at 30 fps', () => {
      expect(calculateFrameCount(1, 30)).toBe(30);
      expect(calculateFrameCount(1.5, 30)).toBe(45);
      expect(calculateFrameCount(0.5, 30)).toBe(15);
    });

    it('should calculate correct frame count at 60 fps', () => {
      expect(calculateFrameCount(1, 60)).toBe(60);
      expect(calculateFrameCount(1.5, 60)).toBe(90);
      expect(calculateFrameCount(0.5, 60)).toBe(30);
    });

    it('should use 30 fps as default', () => {
      expect(calculateFrameCount(1)).toBe(30);
      expect(calculateFrameCount(2)).toBe(60);
    });

    it('should round to nearest integer', () => {
      expect(calculateFrameCount(0.3, 30)).toBe(9);
      expect(calculateFrameCount(0.33, 30)).toBe(10);
    });
  });

  describe('getRoundPhaseFrames', () => {
    it('should calculate correct frame counts for default timing at 30 fps', () => {
      const frames = getRoundPhaseFrames(DEFAULT_SURVIVAL_TIMING, 30);

      expect(frames.situationFrames).toBe(45); // 1.5 * 30
      expect(frames.dogAnswerFrames).toBe(45); // 1.5 * 30
      expect(frames.catAnswerFrames).toBe(45); // 1.5 * 30
      expect(frames.revealDelayFrames).toBe(15); // 0.5 * 30
      expect(frames.floorDropFrames).toBe(45); // 1.5 * 30
      expect(frames.explanationFrames).toBe(45); // 1.5 * 30
      expect(frames.transitionFrames).toBe(9); // 0.3 * 30
      expect(frames.totalFrames).toBe(249); // 8.3 * 30
    });

    it('should calculate correct frame counts at 60 fps', () => {
      const frames = getRoundPhaseFrames(DEFAULT_SURVIVAL_TIMING, 60);

      expect(frames.situationFrames).toBe(90); // 1.5 * 60
      expect(frames.dogAnswerFrames).toBe(90); // 1.5 * 60
      expect(frames.totalFrames).toBe(498); // 8.3 * 60
    });

    it('should use 30 fps as default', () => {
      const frames = getRoundPhaseFrames(DEFAULT_SURVIVAL_TIMING);
      expect(frames.situationFrames).toBe(45);
    });
  });

  describe('getRoundPhaseStartFrames', () => {
    it('should calculate correct start frames for default timing', () => {
      const startFrames = getRoundPhaseStartFrames(DEFAULT_SURVIVAL_TIMING, 30);

      expect(startFrames.situationStart).toBe(0);
      expect(startFrames.dogAnswerStart).toBe(45); // After situation (1.5s)
      expect(startFrames.catAnswerStart).toBe(90); // After dog answer (3s)
      expect(startFrames.revealDelayStart).toBe(135); // After cat answer (4.5s)
      expect(startFrames.floorDropStart).toBe(150); // After reveal delay (5s)
      expect(startFrames.explanationStart).toBe(195); // After floor drop (6.5s)
      expect(startFrames.transitionStart).toBe(240); // After explanation (8s)
    });

    it('should calculate cumulative start frames', () => {
      const customTiming: SurvivalTimingConfig = {
        situationDuration: 1,
        dogAnswerDuration: 1,
        catAnswerDuration: 1,
        revealDelay: 1,
        floorDropDuration: 1,
        explanationDuration: 1,
        transitionDuration: 1,
      };
      const startFrames = getRoundPhaseStartFrames(customTiming, 30);

      expect(startFrames.situationStart).toBe(0);
      expect(startFrames.dogAnswerStart).toBe(30);
      expect(startFrames.catAnswerStart).toBe(60);
      expect(startFrames.revealDelayStart).toBe(90);
      expect(startFrames.floorDropStart).toBe(120);
      expect(startFrames.explanationStart).toBe(150);
      expect(startFrames.transitionStart).toBe(180);
    });
  });

  describe('DEFAULT_SECTION_DURATIONS', () => {
    it('should have intro duration within bounds', () => {
      expect(DEFAULT_SECTION_DURATIONS.introDuration).toBeGreaterThanOrEqual(
        TIMING_BOUNDS.minIntroDuration
      );
      expect(DEFAULT_SECTION_DURATIONS.introDuration).toBeLessThanOrEqual(
        TIMING_BOUNDS.maxIntroDuration
      );
    });

    it('should have ending duration within bounds', () => {
      expect(DEFAULT_SECTION_DURATIONS.endingDuration).toBeGreaterThanOrEqual(
        TIMING_BOUNDS.minEndingDuration
      );
      expect(DEFAULT_SECTION_DURATIONS.endingDuration).toBeLessThanOrEqual(
        TIMING_BOUNDS.maxEndingDuration
      );
    });
  });
});
