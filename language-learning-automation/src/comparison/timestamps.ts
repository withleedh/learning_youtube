/**
 * Timestamp utilities for Comparison videos
 * Separated from pipeline.ts to allow browser-compatible testing
 */

import type { ComparisonScript } from './types';
import type { TimingProfileType } from './timing-profile';
import { calculateVideoTiming } from './timing-profile';

/**
 * Format seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Generate YouTube chapter timestamps for a Comparison video
 * Format: MM:SS Label (e.g., "00:00 Hook", "00:05 Segment 1")
 *
 * @param script - The comparison script
 * @param profile - Timing profile (fast/normal/suspense)
 * @returns YouTube chapter-compatible timestamp string
 */
export function generateComparisonTimestamps(
  script: ComparisonScript,
  profile: TimingProfileType = 'normal'
): string {
  const timing = calculateVideoTiming(script.segments.length, profile);
  const lines: string[] = [];

  // Hook
  lines.push(`${formatTimestamp(0)} Hook`);

  // Segments
  for (const segmentTiming of timing.segmentTimings) {
    const label = `Segment ${segmentTiming.segmentIndex + 1}`;
    lines.push(`${formatTimestamp(segmentTiming.startTimeSeconds)} ${label}`);
  }

  // CTA
  const ctaStart =
    timing.segmentTimings.length > 0
      ? timing.segmentTimings[timing.segmentTimings.length - 1].endTimeSeconds
      : timing.hookDurationSeconds;
  lines.push(`${formatTimestamp(ctaStart)} CTA`);

  return lines.join('\n');
}
