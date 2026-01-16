/**
 * HPBar Component
 *
 * Renders an HP bar for a survival quiz character with:
 * - Smooth HP decrease animation
 * - Damage flash effect when HP decreases
 * - Character emoji/avatar display
 * - HP number display (e.g., "75/100")
 * - Position support (left for cat, right for dog)
 *
 * Requirements: 3.3, 3.5
 */

import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { SurvivalCharacter, CHARACTER_INFO } from '../survival/types';

// =============================================================================
// Types
// =============================================================================

export interface HPBarProps {
  /** Character type (cat or dog) */
  character: SurvivalCharacter;
  /** Current HP value (0-100) */
  currentHP: number;
  /** Maximum HP value (default: 100) */
  maxHP?: number;
  /** Previous HP value for animation (if different from currentHP, triggers animation) */
  previousHP?: number;
  /** Position on screen */
  position: 'left' | 'right';
  /** Custom style configuration */
  style?: HPBarStyle;
  /** Animation duration in frames for HP decrease */
  animationDurationFrames?: number;
}

export interface HPBarStyle {
  /** HP bar fill color (defaults to character color) */
  barColor?: string;
  /** HP bar background color */
  backgroundColor?: string;
  /** Damage flash color */
  damageColor?: string;
  /** Text color for HP numbers */
  textColor?: string;
  /** Bar width in pixels */
  barWidth?: number;
  /** Bar height in pixels */
  barHeight?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<Omit<HPBarStyle, 'barColor'>> & { barColor: string | undefined } = {
  barColor: undefined, // Will use character color if not specified
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  damageColor: '#FF0000',
  textColor: '#FFFFFF',
  barWidth: 300,
  barHeight: 30,
};

const DEFAULT_ANIMATION_DURATION = 20; // frames (~0.67 seconds at 30fps)

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Character Avatar - Displays character emoji with optional damage shake
 */
const CharacterAvatar: React.FC<{
  character: SurvivalCharacter;
  isDamaged: boolean;
  position: 'left' | 'right';
}> = ({ character, isDamaged, position }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const info = CHARACTER_INFO[character];

  // Damage shake animation
  const shakeX = isDamaged ? Math.sin(frame * 2) * 5 : 0;
  const shakeY = isDamaged ? Math.cos(frame * 2.5) * 3 : 0;

  // Scale bounce on damage
  const damageScale = isDamaged
    ? spring({
        frame,
        fps,
        config: { damping: 8, stiffness: 300 },
        from: 1.2,
        to: 1,
      })
    : 1;

  return (
    <div
      style={{
        fontSize: 64,
        transform: `translate(${shakeX}px, ${shakeY}px) scale(${damageScale})`,
        filter: isDamaged ? 'brightness(1.3)' : 'none',
        marginRight: position === 'left' ? 15 : 0,
        marginLeft: position === 'right' ? 15 : 0,
        textShadow: `0 4px 15px ${info.color}66`,
      }}
    >
      {info.emoji}
    </div>
  );
};

/**
 * HP Bar Fill - The actual HP bar with animation
 */
const HPBarFill: React.FC<{
  currentHP: number;
  previousHP: number;
  maxHP: number;
  barColor: string;
  damageColor: string;
  animationDurationFrames: number;
  barWidth: number;
  barHeight: number;
}> = ({
  currentHP,
  previousHP,
  maxHP,
  barColor,
  damageColor,
  animationDurationFrames,
  barWidth,
  barHeight,
}) => {
  const frame = useCurrentFrame();

  const isDamaged = previousHP > currentHP;
  const hpDifference = previousHP - currentHP;

  // Animate HP decrease smoothly
  const animatedHP = isDamaged
    ? interpolate(frame, [0, animationDurationFrames], [previousHP, currentHP], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
      })
    : currentHP;

  // Calculate bar widths
  const currentBarWidth = (animatedHP / maxHP) * barWidth;
  const damageBarWidth = isDamaged ? (hpDifference / maxHP) * barWidth : 0;

  // Damage bar fade out animation
  const damageOpacity = isDamaged
    ? interpolate(frame, [animationDurationFrames * 0.5, animationDurationFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Flash effect on damage
  const flashOpacity = isDamaged
    ? interpolate(frame, [0, 5, 10], [0.8, 0.4, 0], {
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <div
      style={{
        position: 'relative',
        width: barWidth,
        height: barHeight,
        borderRadius: barHeight / 2,
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Damage indicator (red bar showing HP loss) */}
      {isDamaged && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: currentBarWidth,
            width: damageBarWidth,
            height: '100%',
            backgroundColor: damageColor,
            opacity: damageOpacity,
            transition: 'opacity 0.1s',
          }}
        />
      )}

      {/* Current HP bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: currentBarWidth,
          height: '100%',
          backgroundColor: barColor,
          borderRadius: barHeight / 2,
          boxShadow: `0 0 20px ${barColor}66`,
        }}
      />

      {/* Shine effect on HP bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: currentBarWidth,
          height: '40%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
          borderRadius: `${barHeight / 2}px ${barHeight / 2}px 0 0`,
        }}
      />

      {/* Flash overlay on damage */}
      {isDamaged && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: damageColor,
            opacity: flashOpacity,
            borderRadius: barHeight / 2,
          }}
        />
      )}
    </div>
  );
};

/**
 * HP Number Display - Shows current/max HP
 */
const HPNumberDisplay: React.FC<{
  currentHP: number;
  previousHP: number;
  maxHP: number;
  textColor: string;
  animationDurationFrames: number;
  isDamaged: boolean;
}> = ({ currentHP, previousHP, maxHP, textColor, animationDurationFrames, isDamaged }) => {
  const frame = useCurrentFrame();

  // Animate the displayed number
  const displayedHP = isDamaged
    ? Math.round(
        interpolate(frame, [0, animationDurationFrames], [previousHP, currentHP], {
          extrapolateRight: 'clamp',
          extrapolateLeft: 'clamp',
        })
      )
    : currentHP;

  // Color flash on damage
  const numberColor = isDamaged
    ? interpolate(frame, [0, 10, 20], [1, 0, 0], {
        extrapolateRight: 'clamp',
      }) > 0.5
      ? '#FF4444'
      : textColor
    : textColor;

  // Scale pulse on damage
  const scale = isDamaged
    ? interpolate(frame, [0, 5, 15], [1, 1.2, 1], {
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <div
      style={{
        fontSize: 24,
        fontWeight: 700,
        color: numberColor,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        transform: `scale(${scale})`,
        marginTop: 8,
        letterSpacing: '1px',
      }}
    >
      {displayedHP}/{maxHP}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * HPBar - Renders a character's HP bar with animations
 *
 * Features:
 * - Smooth HP decrease animation using Remotion's interpolate
 * - Damage flash effect when HP decreases
 * - Character emoji display
 * - HP number display (e.g., "75/100")
 * - Position support (left for cat, right for dog)
 */
export const HPBar: React.FC<HPBarProps> = ({
  character,
  currentHP,
  maxHP = 100,
  previousHP,
  position,
  style: customStyle,
  animationDurationFrames = DEFAULT_ANIMATION_DURATION,
}) => {
  const info = CHARACTER_INFO[character];

  // Merge custom style with defaults
  const style = {
    ...DEFAULT_STYLE,
    ...customStyle,
    barColor: customStyle?.barColor ?? info.color,
  };

  // Determine if damage animation should play
  const effectivePreviousHP = previousHP ?? currentHP;
  const isDamaged = effectivePreviousHP > currentHP;

  // Flex direction based on position
  const flexDirection = position === 'left' ? 'row' : 'row-reverse';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection,
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 20,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: `2px solid ${info.color}44`,
      }}
    >
      {/* Character Avatar */}
      <CharacterAvatar character={character} isDamaged={isDamaged} position={position} />

      {/* HP Bar and Number Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: position === 'left' ? 'flex-start' : 'flex-end',
        }}
      >
        {/* Character Name */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: info.color,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            marginBottom: 6,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          {info.nameKorean}
        </div>

        {/* HP Bar */}
        <HPBarFill
          currentHP={currentHP}
          previousHP={effectivePreviousHP}
          maxHP={maxHP}
          barColor={style.barColor}
          damageColor={style.damageColor}
          animationDurationFrames={animationDurationFrames}
          barWidth={style.barWidth}
          barHeight={style.barHeight}
        />

        {/* HP Number */}
        <HPNumberDisplay
          currentHP={currentHP}
          previousHP={effectivePreviousHP}
          maxHP={maxHP}
          textColor={style.textColor}
          animationDurationFrames={animationDurationFrames}
          isDamaged={isDamaged}
        />
      </div>
    </div>
  );
};

export default HPBar;
