/**
 * RoundCounter Component
 *
 * Displays the current round number in "Round N/50" format:
 * - Round change animation
 * - Final stretch emphasis (rounds 45-50)
 * - Glow/pulse effect for dramatic moments
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */

import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';

// =============================================================================
// Types
// =============================================================================

export interface RoundCounterProps {
  /** Current round number (1-50) */
  currentRound: number;
  /** Total number of rounds (default: 50) */
  totalRounds?: number;
  /** Whether this is the final stretch (rounds 45-50) */
  isFinalStretch?: boolean;
  /** Custom style configuration */
  style?: RoundCounterStyle;
  /** Whether to show entrance animation */
  showEntrance?: boolean;
}

export interface RoundCounterStyle {
  /** Text color */
  textColor?: string;
  /** Accent color for emphasis */
  accentColor?: string;
  /** Final stretch color */
  finalStretchColor?: string;
  /** Font size */
  fontSize?: number;
  /** Background color */
  backgroundColor?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<RoundCounterStyle> = {
  textColor: '#FFFFFF',
  accentColor: '#FFD700',
  finalStretchColor: '#FF4444',
  fontSize: 32,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
};

const FINAL_STRETCH_START = 45;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format round counter text
 * Property 16: Round Counter Format - "Round N/50"
 */
export function formatRoundCounter(currentRound: number, totalRounds: number): string {
  return `Round ${currentRound}/${totalRounds}`;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Pulse Effect - Animated glow for final stretch
 */
const PulseEffect: React.FC<{
  isFinalStretch: boolean;
  color: string;
}> = ({ isFinalStretch, color }) => {
  const frame = useCurrentFrame();

  if (!isFinalStretch) return null;

  // Pulsing glow effect
  const pulseScale = 1 + Math.sin(frame * 0.15) * 0.1;
  const pulseOpacity = 0.3 + Math.sin(frame * 0.15) * 0.2;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${pulseScale})`,
        width: '120%',
        height: '120%',
        borderRadius: 20,
        backgroundColor: color,
        opacity: pulseOpacity,
        filter: 'blur(20px)',
        zIndex: -1,
      }}
    />
  );
};

/**
 * Round Number - The main number display with animation
 */
const RoundNumber: React.FC<{
  currentRound: number;
  totalRounds: number;
  textColor: string;
  accentColor: string;
  finalStretchColor: string;
  fontSize: number;
  isFinalStretch: boolean;
  showEntrance: boolean;
}> = ({
  currentRound,
  totalRounds,
  textColor,
  accentColor,
  finalStretchColor,
  fontSize,
  isFinalStretch,
  showEntrance,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const entranceScale = showEntrance
    ? spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 200 },
        from: 0.5,
        to: 1,
      })
    : 1;

  const entranceOpacity = showEntrance
    ? interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
    : 1;

  // Final stretch pulse
  const finalStretchScale = isFinalStretch ? 1 + Math.sin(frame * 0.2) * 0.05 : 1;

  // Color based on state
  const numberColor = isFinalStretch ? finalStretchColor : accentColor;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
        transform: `scale(${entranceScale * finalStretchScale})`,
        opacity: entranceOpacity,
      }}
    >
      <span
        style={{
          fontSize: fontSize * 0.8,
          fontWeight: 600,
          color: textColor,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        Round
      </span>
      <span
        style={{
          fontSize: fontSize * 1.2,
          fontWeight: 900,
          color: numberColor,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: isFinalStretch
            ? `0 0 20px ${finalStretchColor}, 0 0 40px ${finalStretchColor}`
            : `0 0 10px ${accentColor}66`,
        }}
      >
        {currentRound}
      </span>
      <span
        style={{
          fontSize: fontSize * 0.7,
          fontWeight: 500,
          color: textColor,
          opacity: 0.7,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        /{totalRounds}
      </span>
    </div>
  );
};

/**
 * Final Stretch Badge - Shows when in final rounds
 */
const FinalStretchBadge: React.FC<{
  isFinalStretch: boolean;
  color: string;
}> = ({ isFinalStretch, color }) => {
  const frame = useCurrentFrame();

  if (!isFinalStretch) return null;

  // Flashing effect
  const flashOpacity = 0.8 + Math.sin(frame * 0.3) * 0.2;

  return (
    <div
      style={{
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: color,
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 8px',
        borderRadius: 8,
        opacity: flashOpacity,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: 1,
        boxShadow: `0 0 15px ${color}`,
      }}
    >
      Final!
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * RoundCounter - Displays current round with animations
 *
 * Features:
 * - "Round N/50" format (Property 16)
 * - Round change animation
 * - Final stretch emphasis (rounds 45-50)
 * - Glow/pulse effect for dramatic moments
 */
export const RoundCounter: React.FC<RoundCounterProps> = ({
  currentRound,
  totalRounds = 50,
  isFinalStretch: isFinalStretchProp,
  style: customStyle,
  showEntrance = false,
}) => {
  // Merge custom style with defaults
  const style = { ...DEFAULT_STYLE, ...customStyle };

  // Determine if in final stretch (auto-detect if not provided)
  const isFinalStretch = isFinalStretchProp ?? currentRound >= FINAL_STRETCH_START;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 24px',
        backgroundColor: style.backgroundColor,
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
        boxShadow: isFinalStretch
          ? `0 0 30px ${style.finalStretchColor}44, 0 8px 32px rgba(0, 0, 0, 0.3)`
          : '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: isFinalStretch
          ? `2px solid ${style.finalStretchColor}66`
          : '2px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Pulse effect for final stretch */}
      <PulseEffect isFinalStretch={isFinalStretch} color={style.finalStretchColor} />

      {/* Round number display */}
      <RoundNumber
        currentRound={currentRound}
        totalRounds={totalRounds}
        textColor={style.textColor}
        accentColor={style.accentColor}
        finalStretchColor={style.finalStretchColor}
        fontSize={style.fontSize}
        isFinalStretch={isFinalStretch}
        showEntrance={showEntrance}
      />

      {/* Final stretch badge */}
      <FinalStretchBadge isFinalStretch={isFinalStretch} color={style.finalStretchColor} />
    </div>
  );
};

export default RoundCounter;
