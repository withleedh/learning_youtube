/**
 * ComparisonView Component
 *
 * Renders a single comparison segment with phase-based animation:
 * - Phase 1: Situation (상황 설명)
 * - Phase 2: Korean Expression (❌ 한국인 표현)
 * - Phase 3: Native Expression (⭕ 원어민 표현)
 * - Phase 4: Explanation (설명)
 *
 * Requirements: 1.3, 1.4, 3.3, 3.4, 11.1
 */

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  staticFile,
} from 'remotion';
import type { ComparisonSegment } from '../comparison/types';
import type { TimingProfileType } from '../comparison/timing-profile';
import { TIMING_PROFILES, secondsToFrames } from '../comparison/timing-profile';

// =============================================================================
// Types
// =============================================================================

export type ComparisonPhase = 'situation' | 'korean' | 'native' | 'explanation';

export interface ComparisonViewProps {
  segment: ComparisonSegment;
  /** Current phase to display */
  phase?: ComparisonPhase;
  /** Timing profile for duration calculation */
  timingProfile?: TimingProfileType;
  /** Whether this segment is part of a burst sequence (faster timing) */
  isBurst?: boolean;
  /** Audio file paths for each phase */
  audioFiles?: {
    situation?: string;
    korean?: string;
    native?: string;
    explanation?: string;
  };
  /** Style configuration */
  style?: ComparisonViewStyle;
}

export interface ComparisonViewStyle {
  backgroundColor?: string;
  koreanColor?: string; // ❌ indicator color (red)
  nativeColor?: string; // ⭕ indicator color (green)
  textColor?: string;
  situationColor?: string;
  explanationColor?: string;
  fontSize?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<ComparisonViewStyle> = {
  backgroundColor: '#0D1B2A',
  koreanColor: '#FF4444',
  nativeColor: '#44DD44',
  textColor: '#FFFFFF',
  situationColor: '#AABBCC',
  explanationColor: '#FFD93D',
  fontSize: 64,
};

// Phase timing ratios (out of 1.0)
const PHASE_RATIOS = {
  situation: 0.2, // 20% of segment duration
  korean: 0.3, // 30% of segment duration
  native: 0.3, // 30% of segment duration
  explanation: 0.2, // 20% of segment duration
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate phase durations based on timing profile
 */
export function calculatePhaseDurations(
  timingProfile: TimingProfileType = 'normal',
  isBurst: boolean = false,
  fps: number = 30
): Record<ComparisonPhase, number> {
  const profile = TIMING_PROFILES[timingProfile];
  const totalSeconds = isBurst ? profile.burstDurationSeconds : profile.segmentDurationSeconds;
  const totalFrames = secondsToFrames(totalSeconds, fps);

  return {
    situation: Math.round(totalFrames * PHASE_RATIOS.situation),
    korean: Math.round(totalFrames * PHASE_RATIOS.korean),
    native: Math.round(totalFrames * PHASE_RATIOS.native),
    explanation: Math.round(totalFrames * PHASE_RATIOS.explanation),
  };
}

/**
 * Calculate total segment duration in frames
 */
export function calculateSegmentDuration(
  timingProfile: TimingProfileType = 'normal',
  isBurst: boolean = false,
  fps: number = 30
): number {
  const profile = TIMING_PROFILES[timingProfile];
  const totalSeconds = isBurst ? profile.burstDurationSeconds : profile.segmentDurationSeconds;
  return secondsToFrames(totalSeconds, fps);
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Situation Phase - 상황 설명 */
const SituationPhase: React.FC<{
  text: string;
  style: Required<ComparisonViewStyle>;
  durationFrames: number;
}> = ({ text, style, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const slideUp = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // Scale animation
  const scale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 150 },
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 80px',
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Situation icon */}
      <div
        style={{
          fontSize: 72,
          marginBottom: 30,
          transform: `scale(${scale})`,
        }}
      >
        💬
      </div>

      {/* Situation text */}
      <div
        style={{
          fontSize: style.fontSize * 0.9,
          fontWeight: 600,
          color: style.situationColor,
          textAlign: 'center',
          lineHeight: 1.4,
          transform: `translateY(${slideUp}px)`,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          maxWidth: '90%',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Korean Expression Phase - ❌ 한국인 표현 */
const KoreanPhase: React.FC<{
  expression: { text: string; literal?: string };
  style: Required<ComparisonViewStyle>;
  durationFrames: number;
}> = ({ expression, style, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // X indicator animation
  const xScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  // Shake animation for X
  const shake = Math.sin(frame * 0.5) * 3;

  // Text slide in
  const textSlide = interpolate(frame, [5, 20], [50, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 80px',
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* ❌ Indicator */}
      <div
        style={{
          fontSize: 120,
          marginBottom: 40,
          transform: `scale(${xScale}) translateX(${shake}px)`,
          filter: `drop-shadow(0 0 30px ${style.koreanColor}88)`,
        }}
      >
        ❌
      </div>

      {/* Korean expression text */}
      <div
        style={{
          fontSize: style.fontSize,
          fontWeight: 700,
          color: style.koreanColor,
          textAlign: 'center',
          lineHeight: 1.3,
          transform: `translateX(${textSlide}px)`,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: `0 0 40px ${style.koreanColor}44, 0 4px 20px rgba(0,0,0,0.5)`,
          maxWidth: '90%',
        }}
      >
        &ldquo;{expression.text}&rdquo;
      </div>

      {/* Literal translation (if provided) */}
      {expression.literal && (
        <div
          style={{
            fontSize: style.fontSize * 0.5,
            fontWeight: 400,
            color: style.textColor,
            opacity: 0.6,
            marginTop: 20,
            textAlign: 'center',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          ({expression.literal})
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Native Expression Phase - ⭕ 원어민 표현 */
const NativePhase: React.FC<{
  expression: { text: string; note?: string };
  style: Required<ComparisonViewStyle>;
  durationFrames: number;
}> = ({ expression, style, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // O indicator animation with bounce
  const oScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 180 },
  });

  // Glow pulse animation
  const glowIntensity = 0.5 + Math.sin(frame * 0.15) * 0.2;

  // Text slide in
  const textSlide = interpolate(frame, [5, 20], [-50, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 80px',
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* ⭕ Indicator */}
      <div
        style={{
          fontSize: 120,
          marginBottom: 40,
          transform: `scale(${oScale})`,
          filter: `drop-shadow(0 0 ${30 * glowIntensity}px ${style.nativeColor}88)`,
        }}
      >
        ⭕
      </div>

      {/* Native expression text */}
      <div
        style={{
          fontSize: style.fontSize,
          fontWeight: 700,
          color: style.nativeColor,
          textAlign: 'center',
          lineHeight: 1.3,
          transform: `translateX(${textSlide}px)`,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: `0 0 40px ${style.nativeColor}44, 0 4px 20px rgba(0,0,0,0.5)`,
          maxWidth: '90%',
        }}
      >
        &ldquo;{expression.text}&rdquo;
      </div>

      {/* Note (if provided) */}
      {expression.note && (
        <div
          style={{
            fontSize: style.fontSize * 0.5,
            fontWeight: 400,
            color: style.textColor,
            opacity: 0.7,
            marginTop: 20,
            textAlign: 'center',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          💡 {expression.note}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Explanation Phase - 설명 */
const ExplanationPhase: React.FC<{
  text: string;
  style: Required<ComparisonViewStyle>;
  durationFrames: number;
}> = ({ text, style, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // Scale animation
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 80px',
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Lightbulb icon */}
      <div
        style={{
          fontSize: 72,
          marginBottom: 30,
          transform: `scale(${scale})`,
        }}
      >
        💡
      </div>

      {/* Explanation text */}
      <div
        style={{
          fontSize: style.fontSize * 0.8,
          fontWeight: 600,
          color: style.explanationColor,
          textAlign: 'center',
          lineHeight: 1.5,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: `0 0 30px ${style.explanationColor}44, 0 4px 20px rgba(0,0,0,0.5)`,
          maxWidth: '85%',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * ComparisonView - Renders a single comparison segment with all phases
 *
 * This component renders the complete segment with automatic phase transitions.
 * Each phase (situation → korean → native → explanation) is rendered in sequence.
 */
export const ComparisonView: React.FC<ComparisonViewProps> = ({
  segment,
  timingProfile = 'normal',
  isBurst = false,
  audioFiles,
  style: customStyle,
}) => {
  const { fps } = useVideoConfig();

  // Merge custom style with defaults
  const style: Required<ComparisonViewStyle> = {
    ...DEFAULT_STYLE,
    ...customStyle,
  };

  // Calculate phase durations
  const phaseDurations = calculatePhaseDurations(timingProfile, isBurst, fps);

  // Calculate phase start frames
  const situationStart = 0;
  const koreanStart = phaseDurations.situation;
  const nativeStart = koreanStart + phaseDurations.korean;
  const explanationStart = nativeStart + phaseDurations.native;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: style.backgroundColor,
      }}
    >
      {/* Background gradient overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)`,
        }}
      />

      {/* Phase 1: Situation */}
      <Sequence from={situationStart} durationInFrames={phaseDurations.situation}>
        {audioFiles?.situation && <Audio src={staticFile(audioFiles.situation)} volume={1.0} />}
        <SituationPhase
          text={segment.situation}
          style={style}
          durationFrames={phaseDurations.situation}
        />
      </Sequence>

      {/* Phase 2: Korean Expression */}
      <Sequence from={koreanStart} durationInFrames={phaseDurations.korean}>
        {audioFiles?.korean && <Audio src={staticFile(audioFiles.korean)} volume={1.0} />}
        <KoreanPhase
          expression={segment.koreanExpression}
          style={style}
          durationFrames={phaseDurations.korean}
        />
      </Sequence>

      {/* Phase 3: Native Expression */}
      <Sequence from={nativeStart} durationInFrames={phaseDurations.native}>
        {audioFiles?.native && <Audio src={staticFile(audioFiles.native)} volume={1.0} />}
        <NativePhase
          expression={segment.nativeExpression}
          style={style}
          durationFrames={phaseDurations.native}
        />
      </Sequence>

      {/* Phase 4: Explanation */}
      <Sequence from={explanationStart} durationInFrames={phaseDurations.explanation}>
        {audioFiles?.explanation && <Audio src={staticFile(audioFiles.explanation)} volume={1.0} />}
        <ExplanationPhase
          text={segment.explanation}
          style={style}
          durationFrames={phaseDurations.explanation}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export default ComparisonView;
