/**
 * Timestamps Generator for Survival Quiz
 *
 * Generates YouTube chapter timestamps for survival quiz videos:
 * - Intro marker
 * - Round markers at 1/10/20/30/40/50
 * - Ending marker
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import { SurvivalTimingConfig, DEFAULT_SURVIVAL_TIMING, calculateRoundDuration } from './timing';

// =============================================================================
// Types
// =============================================================================

export interface TimestampEntry {
  /** Time in seconds from video start */
  timeSeconds: number;
  /** Label for the timestamp */
  label: string;
}

export interface TimestampConfig {
  /** Intro duration in seconds */
  introDuration: number;
  /** Ending duration in seconds */
  endingDuration: number;
  /** Timing configuration for rounds */
  timingConfig: SurvivalTimingConfig;
  /** Total number of rounds */
  totalRounds: number;
  /** Round markers (which rounds to mark) */
  roundMarkers: number[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMESTAMP_CONFIG: TimestampConfig = {
  introDuration: 8,
  endingDuration: 15,
  timingConfig: DEFAULT_SURVIVAL_TIMING,
  totalRounds: 50,
  roundMarkers: [1, 10, 20, 30, 40, 50],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format seconds to YouTube timestamp format (M:SS or MM:SS)
 * Property 24: Timestamp Format - "M:SS Label" or "MM:SS Label"
 */
export function formatTimestamp(seconds: number, label: string): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;
  return `${timeStr} ${label}`;
}

/**
 * Format seconds to time string only (without label)
 */
export function formatTimeOnly(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate the start time of a specific round in seconds
 */
export function calculateRoundStartTime(
  roundNumber: number,
  introDuration: number,
  timingConfig: SurvivalTimingConfig
): number {
  const roundDuration = calculateRoundDuration(timingConfig);
  const transitionDuration = timingConfig.transitionDuration;

  // Round 1 starts after intro
  // Round N starts after intro + (N-1) * (roundDuration + transition)
  return introDuration + (roundNumber - 1) * (roundDuration + transitionDuration);
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Generate timestamp entries for a survival quiz video
 * Property 23: Timestamp Completeness - includes intro, round markers, ending
 */
export function generateTimestampEntries(config: Partial<TimestampConfig> = {}): TimestampEntry[] {
  const fullConfig = { ...DEFAULT_TIMESTAMP_CONFIG, ...config };
  const { introDuration, endingDuration, timingConfig, totalRounds, roundMarkers } = fullConfig;

  const entries: TimestampEntry[] = [];

  // 1. Intro marker (always at 0:00)
  entries.push({
    timeSeconds: 0,
    label: '🎬 인트로',
  });

  // 2. Round markers
  for (const roundNum of roundMarkers) {
    if (roundNum > 0 && roundNum <= totalRounds) {
      const startTime = calculateRoundStartTime(roundNum, introDuration, timingConfig);
      entries.push({
        timeSeconds: startTime,
        label: `🎯 Round ${roundNum}`,
      });
    }
  }

  // 3. Ending marker
  const roundDuration = calculateRoundDuration(timingConfig);
  const transitionDuration = timingConfig.transitionDuration;
  const totalRoundsDuration = totalRounds * roundDuration + (totalRounds - 1) * transitionDuration;
  const endingStartTime = introDuration + totalRoundsDuration;

  entries.push({
    timeSeconds: endingStartTime,
    label: '🏆 결과 발표',
  });

  return entries;
}

/**
 * Generate formatted timestamps for YouTube description
 * Returns array of formatted timestamp strings
 */
export function generateTimestamps(config: Partial<TimestampConfig> = {}): string[] {
  const entries = generateTimestampEntries(config);

  return entries.map((entry) => formatTimestamp(entry.timeSeconds, entry.label));
}

/**
 * Generate timestamps as a single string for YouTube description
 */
export function generateTimestampsText(config: Partial<TimestampConfig> = {}): string {
  const timestamps = generateTimestamps(config);
  return timestamps.join('\n');
}

/**
 * Validate that timestamps are complete
 * Property 23: Must include intro, round markers, and ending
 */
export function validateTimestampCompleteness(timestamps: TimestampEntry[]): {
  isComplete: boolean;
  missingElements: string[];
} {
  const missingElements: string[] = [];

  // Check for intro (should be at 0 seconds)
  const hasIntro = timestamps.some((t) => t.timeSeconds === 0);
  if (!hasIntro) {
    missingElements.push('intro marker');
  }

  // Check for at least some round markers
  const roundMarkers = timestamps.filter((t) => t.label.includes('Round'));
  if (roundMarkers.length === 0) {
    missingElements.push('round markers');
  }

  // Check for ending marker
  const hasEnding = timestamps.some(
    (t) => t.label.includes('결과') || t.label.includes('ending') || t.label.includes('Ending')
  );
  if (!hasEnding) {
    missingElements.push('ending marker');
  }

  return {
    isComplete: missingElements.length === 0,
    missingElements,
  };
}

/**
 * Validate timestamp format
 * Property 24: Must match "M:SS Label" or "MM:SS Label" pattern
 */
export function validateTimestampFormat(timestamp: string): boolean {
  // Pattern: M:SS or MM:SS followed by space and label
  const pattern = /^\d{1,2}:\d{2} .+$/;
  return pattern.test(timestamp);
}

/**
 * Parse a timestamp string back to TimestampEntry
 */
export function parseTimestamp(timestamp: string): TimestampEntry | null {
  const match = timestamp.match(/^(\d{1,2}):(\d{2}) (.+)$/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const label = match[3];

  return {
    timeSeconds: minutes * 60 + seconds,
    label,
  };
}

/**
 * Generate timestamps with custom round markers
 */
export function generateCustomTimestamps(
  roundMarkers: number[],
  config: Partial<Omit<TimestampConfig, 'roundMarkers'>> = {}
): string[] {
  return generateTimestamps({ ...config, roundMarkers });
}

/**
 * Get default round markers for a given total rounds
 */
export function getDefaultRoundMarkers(totalRounds: number): number[] {
  if (totalRounds <= 10) {
    return [1, totalRounds];
  } else if (totalRounds <= 20) {
    return [1, 10, totalRounds];
  } else if (totalRounds <= 30) {
    return [1, 10, 20, totalRounds];
  } else if (totalRounds <= 40) {
    return [1, 10, 20, 30, totalRounds];
  } else {
    return [1, 10, 20, 30, 40, totalRounds];
  }
}
