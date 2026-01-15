/**
 * ComparisonLongform Component
 *
 * Main composition for Korean vs Native comparison longform videos.
 * Orchestrates Hook → Segments → CTA structure with timing profiles
 * and burst sequence support.
 *
 * Requirements: 9.1, 9.2, 9.3, 11.2, 11.3
 */

import React from 'react';
import { AbsoluteFill, Sequence, Img, staticFile, useVideoConfig } from 'remotion';
import type { ComparisonScript, ComparisonSegment } from '../comparison/types';
import type { TimingProfileType, VideoTiming } from '../comparison/timing-profile';
import {
  calculateVideoTiming,
  secondsToFrames,
  isBurstSegment,
  DEFAULT_HOOK_DURATION_SECONDS,
  DEFAULT_CTA_DURATION_SECONDS,
  DEFAULT_TRANSITION_DURATION_SECONDS,
} from '../comparison/timing-profile';
import { ComparisonView, calculateSegmentDuration } from './ComparisonView';
import { HookIntro } from './HookIntro';
import { CTAEnding } from './CTAEnding';

// =============================================================================
// Types
// =============================================================================

export interface ComparisonLongformProps {
  /** Complete comparison script */
  script: ComparisonScript;
  /** Audio files for each segment */
  audioFiles?: SegmentAudioFiles[];
  /** Hook audio file path */
  hookAudioPath?: string;
  /** CTA audio file path */
  ctaAudioPath?: string;
  /** Background image path */
  backgroundImage?: string;
  /** Channel logo path */
  channelLogo?: string;
  /** Timing profile to use */
  timingProfile?: TimingProfileType;
  /** Selected hook variant index (0 = main hook) */
  selectedHookVariant?: number;
  /** Configuration overrides */
  config?: ComparisonLongformConfig;
}

export interface SegmentAudioFiles {
  situation?: string;
  korean?: string;
  native?: string;
  explanation?: string;
}

export interface ComparisonLongformConfig {
  /** Frames per second */
  fps?: number;
  /** Video width */
  width?: number;
  /** Video height */
  height?: number;
  /** Hook duration in seconds */
  hookDurationSeconds?: number;
  /** CTA duration in seconds */
  ctaDurationSeconds?: number;
  /** Transition duration in seconds */
  transitionDurationSeconds?: number;
  /** Style overrides */
  style?: ComparisonLongformStyle;
}

export interface ComparisonLongformStyle {
  backgroundColor?: string;
  koreanColor?: string;
  nativeColor?: string;
  textColor?: string;
  accentColor?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: Required<Omit<ComparisonLongformConfig, 'style'>> & {
  style: Required<ComparisonLongformStyle>;
} = {
  fps: 30,
  width: 1920,
  height: 1080,
  hookDurationSeconds: DEFAULT_HOOK_DURATION_SECONDS,
  ctaDurationSeconds: DEFAULT_CTA_DURATION_SECONDS,
  transitionDurationSeconds: DEFAULT_TRANSITION_DURATION_SECONDS,
  style: {
    backgroundColor: '#0D1B2A',
    koreanColor: '#FF4444',
    nativeColor: '#44DD44',
    textColor: '#FFFFFF',
    accentColor: '#FFD93D',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate total video duration in frames
 */
export function calculateTotalDuration(
  segmentCount: number,
  timingProfile: TimingProfileType = 'normal',
  config: ComparisonLongformConfig = {},
  fps: number = 30
): number {
  const hookDuration = config.hookDurationSeconds ?? DEFAULT_HOOK_DURATION_SECONDS;
  const ctaDuration = config.ctaDurationSeconds ?? DEFAULT_CTA_DURATION_SECONDS;

  const timing = calculateVideoTiming(
    segmentCount,
    timingProfile,
    undefined,
    hookDuration,
    ctaDuration
  );

  return secondsToFrames(timing.totalDurationSeconds, fps);
}

/**
 * Calculate video timing information
 */
export function getVideoTiming(
  segmentCount: number,
  timingProfile: TimingProfileType = 'normal',
  config: ComparisonLongformConfig = {}
): VideoTiming {
  const hookDuration = config.hookDurationSeconds ?? DEFAULT_HOOK_DURATION_SECONDS;
  const ctaDuration = config.ctaDurationSeconds ?? DEFAULT_CTA_DURATION_SECONDS;

  return calculateVideoTiming(segmentCount, timingProfile, undefined, hookDuration, ctaDuration);
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Transition effect between segments */
const SegmentTransition: React.FC<{
  durationFrames: number;
  style: Required<ComparisonLongformStyle>;
}> = ({ durationFrames: _durationFrames, style }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: style.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Simple fade transition - content handled by Sequence opacity */}
    </AbsoluteFill>
  );
};

/** Background layer */
const BackgroundLayer: React.FC<{
  backgroundImage?: string;
  style: Required<ComparisonLongformStyle>;
}> = ({ backgroundImage, style }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: style.backgroundColor }}>
      {backgroundImage && (
        <Img
          src={staticFile(backgroundImage)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(30px) brightness(0.2)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * ComparisonLongform - Main composition for comparison videos
 *
 * Structure:
 * 1. Hook Intro (5 seconds default)
 * 2. Comparison Segments (25-35 segments, 7-12 seconds each)
 * 3. CTA Ending (15 seconds default)
 *
 * Features:
 * - Timing profile support (fast, normal, suspense)
 * - Burst sequence insertion every 5 segments
 * - Smooth transitions between segments
 * - Hook variant selection for A/B testing
 */
export const ComparisonLongform: React.FC<ComparisonLongformProps> = ({
  script,
  audioFiles,
  hookAudioPath,
  ctaAudioPath,
  backgroundImage,
  channelLogo,
  timingProfile = 'normal',
  selectedHookVariant = 0,
  config: customConfig,
}) => {
  const { fps } = useVideoConfig();

  // Merge config with defaults
  const config = {
    ...DEFAULT_CONFIG,
    ...customConfig,
    style: {
      ...DEFAULT_CONFIG.style,
      ...customConfig?.style,
    },
  };

  // Calculate timing
  const segmentCount = script.segments.length;
  // Video timing is available via getVideoTiming() for external use
  // const videoTiming = getVideoTiming(segmentCount, timingProfile, config);

  // Calculate frame positions
  const hookDurationFrames = secondsToFrames(config.hookDurationSeconds, fps);
  const ctaDurationFrames = secondsToFrames(config.ctaDurationSeconds, fps);
  const transitionDurationFrames = secondsToFrames(config.transitionDurationSeconds, fps);

  // Build segment sequences
  const segmentSequences: Array<{
    segment: ComparisonSegment;
    startFrame: number;
    durationFrames: number;
    isBurst: boolean;
    audioFiles?: SegmentAudioFiles;
  }> = [];

  let currentFrame = hookDurationFrames;

  for (let i = 0; i < segmentCount; i++) {
    const segment = script.segments[i];
    const isBurst = isBurstSegment(i, segmentCount);
    const durationFrames = calculateSegmentDuration(timingProfile, isBurst, fps);

    segmentSequences.push({
      segment,
      startFrame: currentFrame,
      durationFrames,
      isBurst,
      audioFiles: audioFiles?.[i],
    });

    currentFrame += durationFrames + transitionDurationFrames;
  }

  // CTA start frame (remove last transition)
  const ctaStartFrame = currentFrame - transitionDurationFrames;

  return (
    <AbsoluteFill>
      {/* Background layer */}
      <BackgroundLayer backgroundImage={backgroundImage} style={config.style} />

      {/* Hook Intro */}
      <Sequence from={0} durationInFrames={hookDurationFrames}>
        <HookIntro
          hook={script.hook}
          hookVariants={script.hookVariants}
          selectedVariantIndex={selectedHookVariant}
          durationInFrames={hookDurationFrames}
          backgroundImage={backgroundImage}
          audioPath={hookAudioPath}
          style={{
            backgroundColor: config.style.backgroundColor,
            textColor: config.style.textColor,
            accentColor: config.style.accentColor,
            animation: 'zoom',
          }}
        />
      </Sequence>

      {/* Comparison Segments */}
      {segmentSequences.map(
        ({ segment, startFrame, durationFrames, isBurst, audioFiles: segAudio }, index) => (
          <React.Fragment key={segment.id}>
            {/* Segment */}
            <Sequence from={startFrame} durationInFrames={durationFrames}>
              <ComparisonView
                segment={segment}
                timingProfile={timingProfile}
                isBurst={isBurst}
                audioFiles={segAudio}
                style={{
                  backgroundColor: config.style.backgroundColor,
                  koreanColor: config.style.koreanColor,
                  nativeColor: config.style.nativeColor,
                  textColor: config.style.textColor,
                }}
              />
            </Sequence>

            {/* Transition (except after last segment) */}
            {index < segmentCount - 1 && (
              <Sequence
                from={startFrame + durationFrames}
                durationInFrames={transitionDurationFrames}
              >
                <SegmentTransition durationFrames={transitionDurationFrames} style={config.style} />
              </Sequence>
            )}
          </React.Fragment>
        )
      )}

      {/* CTA Ending */}
      <Sequence from={ctaStartFrame} durationInFrames={ctaDurationFrames}>
        <CTAEnding
          cta={script.cta}
          durationInFrames={ctaDurationFrames}
          channelLogo={channelLogo}
          backgroundImage={backgroundImage}
          audioPath={ctaAudioPath}
          style={{
            backgroundColor: config.style.backgroundColor,
            questionColor: config.style.accentColor,
            reminderColor: config.style.textColor,
            accentColor: config.style.koreanColor,
          }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export default ComparisonLongform;
