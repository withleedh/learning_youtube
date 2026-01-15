import { z } from 'zod';

/**
 * Timing Profile System for Retention Optimization
 *
 * Implements timing profiles (fast, normal, suspense) and burst sequences
 * to maintain viewer engagement throughout the video.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

// Timing profile types
export const timingProfileTypeSchema = z.enum(['fast', 'normal', 'suspense']);
export type TimingProfileType = z.infer<typeof timingProfileTypeSchema>;

// Timing profile configuration
export interface TimingProfile {
  name: TimingProfileType;
  segmentDurationSeconds: number; // Duration per segment in seconds
  burstDurationSeconds: number; // Duration for burst segments (5초)
  description: string;
}

// Predefined timing profiles
export const TIMING_PROFILES: Record<TimingProfileType, TimingProfile> = {
  fast: {
    name: 'fast',
    segmentDurationSeconds: 7,
    burstDurationSeconds: 5,
    description: '빠른 템포 - 7초/세그먼트',
  },
  normal: {
    name: 'normal',
    segmentDurationSeconds: 10,
    burstDurationSeconds: 5,
    description: '일반 템포 - 10초/세그먼트',
  },
  suspense: {
    name: 'suspense',
    segmentDurationSeconds: 12,
    burstDurationSeconds: 5,
    description: '서스펜스 템포 - 12초/세그먼트',
  },
};

// Burst sequence configuration
export interface BurstSequenceConfig {
  triggerEveryNSegments: number; // Trigger burst every N segments (default: 5)
  burstLength: number; // Number of consecutive burst segments (default: 3)
  burstDurationSeconds: number; // Duration for each burst segment (default: 5)
}

export const DEFAULT_BURST_CONFIG: BurstSequenceConfig = {
  triggerEveryNSegments: 5,
  burstLength: 3,
  burstDurationSeconds: 5,
};

// Segment timing result
export interface SegmentTiming {
  segmentIndex: number;
  durationSeconds: number;
  isBurst: boolean;
  startTimeSeconds: number;
  endTimeSeconds: number;
}

// Video timing result
export interface VideoTiming {
  profile: TimingProfileType;
  segmentTimings: SegmentTiming[];
  totalDurationSeconds: number;
  burstSequenceCount: number;
  hookDurationSeconds: number;
  ctaDurationSeconds: number;
}

// Default durations for hook and CTA
export const DEFAULT_HOOK_DURATION_SECONDS = 5;
export const DEFAULT_CTA_DURATION_SECONDS = 15;
export const DEFAULT_TRANSITION_DURATION_SECONDS = 0.5;

/**
 * Determines if a segment index should be part of a burst sequence.
 *
 * Burst sequences are triggered every N segments (default: 5).
 * When triggered, the next 3 consecutive segments become burst segments.
 *
 * @param segmentIndex - 0-based index of the segment
 * @param totalSegments - Total number of segments in the video
 * @param config - Burst sequence configuration
 * @returns true if this segment is part of a burst sequence
 */
export function isBurstSegment(
  segmentIndex: number,
  totalSegments: number,
  config: BurstSequenceConfig = DEFAULT_BURST_CONFIG
): boolean {
  // Burst sequences only apply to videos with 15+ segments
  if (totalSegments < 15) {
    return false;
  }

  const { triggerEveryNSegments, burstLength } = config;

  // Calculate which burst sequence this segment might belong to
  // Burst triggers at indices: 5, 10, 15, 20, etc. (0-indexed: 4, 9, 14, 19)
  // After trigger, next 3 segments are burst segments

  // Find the trigger point before or at this segment
  for (
    let trigger = triggerEveryNSegments - 1;
    trigger < totalSegments;
    trigger += triggerEveryNSegments
  ) {
    // Check if this segment is within the burst range after the trigger
    const burstStart = trigger + 1;
    const burstEnd = burstStart + burstLength - 1;

    if (segmentIndex >= burstStart && segmentIndex <= burstEnd) {
      // Make sure we don't exceed total segments
      if (burstStart < totalSegments) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Counts the number of burst sequences in a video.
 *
 * @param totalSegments - Total number of segments
 * @param config - Burst sequence configuration
 * @returns Number of burst sequences
 */
export function countBurstSequences(
  totalSegments: number,
  config: BurstSequenceConfig = DEFAULT_BURST_CONFIG
): number {
  if (totalSegments < 15) {
    return 0;
  }

  const { triggerEveryNSegments } = config;
  let count = 0;

  // Count triggers that have at least one burst segment after them
  for (
    let trigger = triggerEveryNSegments - 1;
    trigger < totalSegments - 1;
    trigger += triggerEveryNSegments
  ) {
    count++;
  }

  return count;
}

/**
 * Gets the indices of all burst segments in a video.
 *
 * @param totalSegments - Total number of segments
 * @param config - Burst sequence configuration
 * @returns Array of segment indices that are burst segments
 */
export function getBurstSegmentIndices(
  totalSegments: number,
  config: BurstSequenceConfig = DEFAULT_BURST_CONFIG
): number[] {
  const burstIndices: number[] = [];

  for (let i = 0; i < totalSegments; i++) {
    if (isBurstSegment(i, totalSegments, config)) {
      burstIndices.push(i);
    }
  }

  return burstIndices;
}

/**
 * Calculates the duration for a specific segment.
 *
 * @param segmentIndex - 0-based index of the segment
 * @param totalSegments - Total number of segments
 * @param profile - Timing profile to use
 * @param burstConfig - Burst sequence configuration
 * @returns Duration in seconds for this segment
 */
export function getSegmentDuration(
  segmentIndex: number,
  totalSegments: number,
  profile: TimingProfileType = 'normal',
  burstConfig: BurstSequenceConfig = DEFAULT_BURST_CONFIG
): number {
  const timingProfile = TIMING_PROFILES[profile];

  if (isBurstSegment(segmentIndex, totalSegments, burstConfig)) {
    return burstConfig.burstDurationSeconds;
  }

  return timingProfile.segmentDurationSeconds;
}

/**
 * Calculates complete timing for all segments in a video.
 *
 * @param totalSegments - Total number of segments
 * @param profile - Timing profile to use
 * @param burstConfig - Burst sequence configuration
 * @param hookDuration - Duration of hook intro in seconds
 * @param ctaDuration - Duration of CTA ending in seconds
 * @returns Complete video timing information
 */
export function calculateVideoTiming(
  totalSegments: number,
  profile: TimingProfileType = 'normal',
  burstConfig: BurstSequenceConfig = DEFAULT_BURST_CONFIG,
  hookDuration: number = DEFAULT_HOOK_DURATION_SECONDS,
  ctaDuration: number = DEFAULT_CTA_DURATION_SECONDS
): VideoTiming {
  const segmentTimings: SegmentTiming[] = [];
  let currentTime = hookDuration; // Start after hook

  for (let i = 0; i < totalSegments; i++) {
    const isBurst = isBurstSegment(i, totalSegments, burstConfig);
    const duration = getSegmentDuration(i, totalSegments, profile, burstConfig);

    segmentTimings.push({
      segmentIndex: i,
      durationSeconds: duration,
      isBurst,
      startTimeSeconds: currentTime,
      endTimeSeconds: currentTime + duration,
    });

    currentTime += duration + DEFAULT_TRANSITION_DURATION_SECONDS;
  }

  // Remove last transition (no transition after last segment)
  if (segmentTimings.length > 0) {
    currentTime -= DEFAULT_TRANSITION_DURATION_SECONDS;
  }

  const totalDuration = currentTime + ctaDuration;

  return {
    profile,
    segmentTimings,
    totalDurationSeconds: totalDuration,
    burstSequenceCount: countBurstSequences(totalSegments, burstConfig),
    hookDurationSeconds: hookDuration,
    ctaDurationSeconds: ctaDuration,
  };
}

/**
 * Converts seconds to frame count.
 *
 * @param seconds - Duration in seconds
 * @param fps - Frames per second (default: 30)
 * @returns Number of frames
 */
export function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.round(seconds * fps);
}

/**
 * Converts frames to seconds.
 *
 * @param frames - Number of frames
 * @param fps - Frames per second (default: 30)
 * @returns Duration in seconds
 */
export function framesToSeconds(frames: number, fps: number = 30): number {
  return frames / fps;
}

/**
 * Gets timing profile by name.
 *
 * @param profileName - Name of the timing profile
 * @returns Timing profile configuration
 */
export function getTimingProfile(profileName: TimingProfileType): TimingProfile {
  return TIMING_PROFILES[profileName];
}

/**
 * Validates if a timing profile name is valid.
 *
 * @param profileName - Name to validate
 * @returns true if valid profile name
 */
export function isValidTimingProfile(profileName: string): profileName is TimingProfileType {
  return profileName in TIMING_PROFILES;
}

/**
 * Creates a custom timing profile.
 *
 * @param name - Profile name
 * @param segmentDurationSeconds - Duration per segment
 * @param burstDurationSeconds - Duration for burst segments
 * @param description - Profile description
 * @returns Custom timing profile
 */
export function createCustomTimingProfile(
  name: TimingProfileType,
  segmentDurationSeconds: number,
  burstDurationSeconds: number = 5,
  description: string = 'Custom timing profile'
): TimingProfile {
  return {
    name,
    segmentDurationSeconds,
    burstDurationSeconds,
    description,
  };
}

/**
 * Estimates total video duration based on segment count and profile.
 *
 * @param segmentCount - Number of segments
 * @param profile - Timing profile
 * @param burstConfig - Burst configuration
 * @returns Estimated duration in seconds
 */
export function estimateVideoDuration(
  segmentCount: number,
  profile: TimingProfileType = 'normal',
  burstConfig: BurstSequenceConfig = DEFAULT_BURST_CONFIG
): number {
  const timing = calculateVideoTiming(segmentCount, profile, burstConfig);
  return timing.totalDurationSeconds;
}

/**
 * Formats duration in seconds to MM:SS format.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "10:30")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Generates YouTube chapter timestamps from video timing.
 *
 * @param timing - Video timing information
 * @param segmentLabels - Optional labels for each segment
 * @returns Array of timestamp strings in YouTube format
 */
export function generateTimestamps(timing: VideoTiming, segmentLabels?: string[]): string[] {
  const timestamps: string[] = [];

  // Hook timestamp
  timestamps.push(`0:00 인트로`);

  // Segment timestamps
  for (let i = 0; i < timing.segmentTimings.length; i++) {
    const segmentTiming = timing.segmentTimings[i];
    const label = segmentLabels?.[i] || `비교 ${i + 1}`;
    const time = formatDuration(segmentTiming.startTimeSeconds);
    timestamps.push(`${time} ${label}`);
  }

  // CTA timestamp
  const ctaStart = timing.totalDurationSeconds - timing.ctaDurationSeconds;
  timestamps.push(`${formatDuration(ctaStart)} 마무리`);

  return timestamps;
}
