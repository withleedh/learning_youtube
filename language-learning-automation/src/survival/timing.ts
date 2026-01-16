/**
 * Survival Quiz Timing System
 *
 * Manages timing profiles for the survival quiz rounds.
 * Each round follows a specific timing structure to maintain
 * fast-paced gameplay (8-10 seconds per round).
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5, 7.4, 8.5
 */

/**
 * Configuration for timing of each phase within a survival round.
 * Total per round should be 8-10 seconds for fast-paced gameplay.
 */
export interface SurvivalTimingConfig {
  /** Duration for situation display (seconds) */
  situationDuration: number; // 1.5초
  /** Duration for dog's answer display (seconds) */
  dogAnswerDuration: number; // 1.5초
  /** Duration for cat's answer display (seconds) */
  catAnswerDuration: number; // 1.5초
  /** Delay before revealing winner (seconds) */
  revealDelay: number; // 0.5초
  /** Duration for floor drop animation (seconds) */
  floorDropDuration: number; // 1.5초
  /** Duration for explanation display (seconds) */
  explanationDuration: number; // 1.5초
  /** Duration for transition between rounds (seconds) */
  transitionDuration: number; // 0.3초
}

/**
 * Default timing configuration for survival rounds.
 * Total per round: 8.3초 (within 8-10초 target)
 *
 * Validates: Requirement 6.1
 * THE Timing_System SHALL structure each round as:
 * situation (1.5초) → Dog answer (1.5초) → Cat answer (1.5초) →
 * delay (0.5초) → Floor_Drop (1.5초) → explanation (1.5초)
 */
export const DEFAULT_SURVIVAL_TIMING: SurvivalTimingConfig = {
  situationDuration: 1.5,
  dogAnswerDuration: 1.5,
  catAnswerDuration: 1.5,
  revealDelay: 0.5,
  floorDropDuration: 1.5,
  explanationDuration: 1.5,
  transitionDuration: 0.3,
};

/**
 * Timing bounds for validation
 */
export const TIMING_BOUNDS = {
  /** Minimum round duration in seconds (Requirement 1.3, 6.1) */
  minRoundDuration: 8,
  /** Maximum round duration in seconds (Requirement 1.3, 6.1) */
  maxRoundDuration: 10,
  /** Minimum intro duration in seconds (Requirement 7.4) */
  minIntroDuration: 5,
  /** Maximum intro duration in seconds (Requirement 7.4) */
  maxIntroDuration: 8,
  /** Minimum ending duration in seconds (Requirement 8.5) */
  minEndingDuration: 10,
  /** Maximum ending duration in seconds (Requirement 8.5) */
  maxEndingDuration: 15,
  /** Minimum total video duration in seconds (Requirement 6.3) */
  minVideoDuration: 8 * 60, // 8 minutes
  /** Maximum total video duration in seconds (Requirement 6.4) */
  maxVideoDuration: 12 * 60, // 12 minutes
};

/**
 * Default durations for intro and ending sections
 */
export const DEFAULT_SECTION_DURATIONS = {
  /** Default intro duration in seconds */
  introDuration: 6.5, // Middle of 5-8 second range
  /** Default ending duration in seconds */
  endingDuration: 12.5, // Middle of 10-15 second range
};

/**
 * Calculate the total duration of a single round.
 *
 * @param config - Timing configuration for the round
 * @returns Total round duration in seconds
 *
 * Validates: Requirements 1.3, 6.1
 * Each round should be 8-10 seconds
 */
export function calculateRoundDuration(config: SurvivalTimingConfig): number {
  return (
    config.situationDuration +
    config.dogAnswerDuration +
    config.catAnswerDuration +
    config.revealDelay +
    config.floorDropDuration +
    config.explanationDuration +
    config.transitionDuration
  );
}

/**
 * Calculate the total video duration including intro, all rounds, and ending.
 *
 * @param roundCount - Number of quiz rounds (typically 50)
 * @param introDuration - Duration of intro section in seconds
 * @param endingDuration - Duration of ending section in seconds
 * @param config - Timing configuration for each round
 * @returns Total video duration in seconds
 *
 * Validates: Requirements 6.3, 6.4
 * Total video should be between 8-12 minutes
 */
export function calculateTotalVideoDuration(
  roundCount: number,
  introDuration: number,
  endingDuration: number,
  config: SurvivalTimingConfig
): number {
  const roundDuration = calculateRoundDuration(config);
  const totalRoundsDuration = roundCount * roundDuration;

  return introDuration + totalRoundsDuration + endingDuration;
}

/**
 * Validate that a timing configuration produces valid round duration.
 *
 * @param config - Timing configuration to validate
 * @returns Object with isValid flag and any error message
 *
 * Validates: Requirements 1.3, 6.1
 */
export function validateRoundTiming(config: SurvivalTimingConfig): {
  isValid: boolean;
  duration: number;
  error?: string;
} {
  const duration = calculateRoundDuration(config);

  if (duration < TIMING_BOUNDS.minRoundDuration) {
    return {
      isValid: false,
      duration,
      error: `Round duration ${duration}s is below minimum ${TIMING_BOUNDS.minRoundDuration}s`,
    };
  }

  if (duration > TIMING_BOUNDS.maxRoundDuration) {
    return {
      isValid: false,
      duration,
      error: `Round duration ${duration}s exceeds maximum ${TIMING_BOUNDS.maxRoundDuration}s`,
    };
  }

  return { isValid: true, duration };
}

/**
 * Validate intro duration is within bounds.
 *
 * @param duration - Intro duration in seconds
 * @returns Object with isValid flag and any error message
 *
 * Validates: Requirement 7.4
 * THE Survival_Intro SHALL be 5-8 seconds in duration
 */
export function validateIntroDuration(duration: number): {
  isValid: boolean;
  error?: string;
} {
  if (duration < TIMING_BOUNDS.minIntroDuration) {
    return {
      isValid: false,
      error: `Intro duration ${duration}s is below minimum ${TIMING_BOUNDS.minIntroDuration}s`,
    };
  }

  if (duration > TIMING_BOUNDS.maxIntroDuration) {
    return {
      isValid: false,
      error: `Intro duration ${duration}s exceeds maximum ${TIMING_BOUNDS.maxIntroDuration}s`,
    };
  }

  return { isValid: true };
}

/**
 * Validate ending duration is within bounds.
 *
 * @param duration - Ending duration in seconds
 * @returns Object with isValid flag and any error message
 *
 * Validates: Requirement 8.5
 * THE Survival_Ending SHALL be 10-15 seconds in duration
 */
export function validateEndingDuration(duration: number): {
  isValid: boolean;
  error?: string;
} {
  if (duration < TIMING_BOUNDS.minEndingDuration) {
    return {
      isValid: false,
      error: `Ending duration ${duration}s is below minimum ${TIMING_BOUNDS.minEndingDuration}s`,
    };
  }

  if (duration > TIMING_BOUNDS.maxEndingDuration) {
    return {
      isValid: false,
      error: `Ending duration ${duration}s exceeds maximum ${TIMING_BOUNDS.maxEndingDuration}s`,
    };
  }

  return { isValid: true };
}

/**
 * Validate total video duration is within bounds.
 *
 * @param roundCount - Number of quiz rounds
 * @param introDuration - Duration of intro section in seconds
 * @param endingDuration - Duration of ending section in seconds
 * @param config - Timing configuration for each round
 * @returns Object with isValid flag, duration, and any error message
 *
 * Validates: Requirements 6.3, 6.4
 * WHEN total video duration exceeds 12 minutes, THE Pipeline SHALL reduce round timing or round count
 * WHEN total video duration is under 8 minutes, THE Pipeline SHALL increase round timing
 */
export function validateTotalVideoDuration(
  roundCount: number,
  introDuration: number,
  endingDuration: number,
  config: SurvivalTimingConfig
): {
  isValid: boolean;
  duration: number;
  durationMinutes: number;
  error?: string;
} {
  const duration = calculateTotalVideoDuration(roundCount, introDuration, endingDuration, config);
  const durationMinutes = duration / 60;

  if (duration < TIMING_BOUNDS.minVideoDuration) {
    return {
      isValid: false,
      duration,
      durationMinutes,
      error: `Video duration ${durationMinutes.toFixed(1)} minutes is below minimum 8 minutes`,
    };
  }

  if (duration > TIMING_BOUNDS.maxVideoDuration) {
    return {
      isValid: false,
      duration,
      durationMinutes,
      error: `Video duration ${durationMinutes.toFixed(1)} minutes exceeds maximum 12 minutes`,
    };
  }

  return { isValid: true, duration, durationMinutes };
}

/**
 * Calculate frame count for a duration at a given FPS.
 *
 * @param durationSeconds - Duration in seconds
 * @param fps - Frames per second (default: 30)
 * @returns Number of frames
 */
export function calculateFrameCount(durationSeconds: number, fps: number = 30): number {
  return Math.round(durationSeconds * fps);
}

/**
 * Get frame counts for all phases of a round.
 *
 * @param config - Timing configuration
 * @param fps - Frames per second (default: 30)
 * @returns Object with frame counts for each phase
 */
export function getRoundPhaseFrames(
  config: SurvivalTimingConfig,
  fps: number = 30
): {
  situationFrames: number;
  dogAnswerFrames: number;
  catAnswerFrames: number;
  revealDelayFrames: number;
  floorDropFrames: number;
  explanationFrames: number;
  transitionFrames: number;
  totalFrames: number;
} {
  return {
    situationFrames: calculateFrameCount(config.situationDuration, fps),
    dogAnswerFrames: calculateFrameCount(config.dogAnswerDuration, fps),
    catAnswerFrames: calculateFrameCount(config.catAnswerDuration, fps),
    revealDelayFrames: calculateFrameCount(config.revealDelay, fps),
    floorDropFrames: calculateFrameCount(config.floorDropDuration, fps),
    explanationFrames: calculateFrameCount(config.explanationDuration, fps),
    transitionFrames: calculateFrameCount(config.transitionDuration, fps),
    totalFrames: calculateFrameCount(calculateRoundDuration(config), fps),
  };
}

/**
 * Calculate start frame for each phase within a round.
 *
 * @param config - Timing configuration
 * @param fps - Frames per second (default: 30)
 * @returns Object with start frame for each phase
 */
export function getRoundPhaseStartFrames(
  config: SurvivalTimingConfig,
  fps: number = 30
): {
  situationStart: number;
  dogAnswerStart: number;
  catAnswerStart: number;
  revealDelayStart: number;
  floorDropStart: number;
  explanationStart: number;
  transitionStart: number;
} {
  const frames = getRoundPhaseFrames(config, fps);

  let currentFrame = 0;
  const situationStart = currentFrame;
  currentFrame += frames.situationFrames;

  const dogAnswerStart = currentFrame;
  currentFrame += frames.dogAnswerFrames;

  const catAnswerStart = currentFrame;
  currentFrame += frames.catAnswerFrames;

  const revealDelayStart = currentFrame;
  currentFrame += frames.revealDelayFrames;

  const floorDropStart = currentFrame;
  currentFrame += frames.floorDropFrames;

  const explanationStart = currentFrame;
  currentFrame += frames.explanationFrames;

  const transitionStart = currentFrame;

  return {
    situationStart,
    dogAnswerStart,
    catAnswerStart,
    revealDelayStart,
    floorDropStart,
    explanationStart,
    transitionStart,
  };
}
