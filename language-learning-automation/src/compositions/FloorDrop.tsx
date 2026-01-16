/**
 * FloorDrop Component
 *
 * Renders a floor drop animation for the survival quiz loser:
 * - Floor panels shaking animation
 * - Floor opens (splits in middle)
 * - Character falls through with rotation
 * - Floor closes back together
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, spring, Easing } from 'remotion';
import { SurvivalCharacter, CHARACTER_INFO } from '../survival/types';

// =============================================================================
// Types
// =============================================================================

export interface FloorDropProps {
  /** Character that falls through the floor (the loser) */
  character: SurvivalCharacter;
  /** Total duration of the animation in frames */
  durationInFrames: number;
  /** Custom style configuration */
  style?: FloorDropStyle;
}

export interface FloorDropStyle {
  /** Floor panel color */
  floorColor?: string;
  /** Background color (the void below) */
  backgroundColor?: string;
  /** Floor panel border color */
  borderColor?: string;
  /** Character size in pixels */
  characterSize?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<FloorDropStyle> = {
  floorColor: '#4A4A4A',
  backgroundColor: '#1A1A2E',
  borderColor: '#666666',
  characterSize: 120,
};

// Animation phase percentages (of total duration)
const PHASES = {
  shake: 0.15, // 0-15%: Floor shaking
  open: 0.35, // 15-50%: Floor opening
  fall: 0.35, // 50-85%: Character falling
  close: 0.15, // 85-100%: Floor closing
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Floor Panel - Single floor panel that can shake and move
 */
const FloorPanel: React.FC<{
  side: 'left' | 'right';
  shakeIntensity: number;
  openAmount: number;
  floorColor: string;
  borderColor: string;
}> = ({ side, shakeIntensity, openAmount, floorColor, borderColor }) => {
  const frame = useCurrentFrame();

  // Shake animation
  const shakeX = shakeIntensity * Math.sin(frame * 3) * 3;
  const shakeY = shakeIntensity * Math.cos(frame * 4) * 2;

  // Open animation - panels slide outward
  const translateX = side === 'left' ? -openAmount * 100 : openAmount * 100;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: side === 'left' ? 0 : '50%',
        width: '50%',
        height: 80,
        backgroundColor: floorColor,
        borderTop: `4px solid ${borderColor}`,
        borderBottom: `4px solid ${borderColor}`,
        borderLeft: side === 'left' ? `4px solid ${borderColor}` : 'none',
        borderRight: side === 'right' ? `4px solid ${borderColor}` : 'none',
        transform: `translate(${translateX + shakeX}%, ${shakeY}px)`,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        // Floor texture
        background: `
          linear-gradient(90deg, ${floorColor} 0%, ${floorColor}dd 50%, ${floorColor} 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 10px,
            rgba(0,0,0,0.1) 10px,
            rgba(0,0,0,0.1) 20px
          )
        `,
      }}
    >
      {/* Floor panel details */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: side === 'left' ? '80%' : '20%',
          transform: 'translate(-50%, -50%)',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: `3px solid ${borderColor}`,
          opacity: 0.5,
        }}
      />
    </div>
  );
};

/**
 * Falling Character - Character that falls through the floor
 */
const FallingCharacter: React.FC<{
  character: SurvivalCharacter;
  fallProgress: number;
  characterSize: number;
  isVisible: boolean;
}> = ({ character, fallProgress, characterSize, isVisible }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const info = CHARACTER_INFO[character];

  if (!isVisible) return null;

  // Fall animation with acceleration (gravity effect)
  const fallY = interpolate(fallProgress, [0, 1], [0, 400], {
    easing: Easing.in(Easing.quad),
  });

  // Rotation during fall
  const rotation = interpolate(fallProgress, [0, 1], [0, 360], {
    easing: Easing.out(Easing.cubic),
  });

  // Scale down as character falls away
  const scale = interpolate(fallProgress, [0, 0.5, 1], [1, 0.8, 0.3], {
    extrapolateRight: 'clamp',
  });

  // Opacity fade out
  const opacity = interpolate(fallProgress, [0.6, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Panic shake
  const panicShakeX = Math.sin(frame * 5) * 5 * (1 - fallProgress);
  const panicShakeY = Math.cos(frame * 6) * 3 * (1 - fallProgress);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) translateY(${fallY}px) rotate(${rotation}deg) scale(${scale}) translate(${panicShakeX}px, ${panicShakeY}px)`,
        fontSize: characterSize,
        opacity,
        filter: `drop-shadow(0 10px 30px rgba(0,0,0,0.5))`,
        zIndex: 10,
      }}
    >
      {info.emoji}
    </div>
  );
};

/**
 * Void Background - The dark void below the floor
 */
const VoidBackground: React.FC<{
  backgroundColor: string;
  openAmount: number;
}> = ({ backgroundColor, openAmount }) => {
  const voidOpacity = interpolate(openAmount, [0, 0.3, 1], [0, 0.5, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${openAmount * 100}%`,
        height: 200,
        backgroundColor,
        opacity: voidOpacity,
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
        // Gradient to create depth
        background: `
          radial-gradient(ellipse at center, ${backgroundColor} 0%, #000000 100%)
        `,
      }}
    />
  );
};

/**
 * Warning Indicator - Shows "X" or warning before floor drops
 */
const WarningIndicator: React.FC<{
  character: SurvivalCharacter;
  shakeIntensity: number;
}> = ({ character, shakeIntensity }) => {
  const frame = useCurrentFrame();
  const info = CHARACTER_INFO[character];

  if (shakeIntensity <= 0) return null;

  // Flashing effect
  const flashOpacity = Math.sin(frame * 0.5) > 0 ? 1 : 0.3;

  // Scale pulse
  const scale = 1 + Math.sin(frame * 0.3) * 0.1;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        fontSize: 48,
        fontWeight: 900,
        color: '#FF0000',
        opacity: flashOpacity * shakeIntensity,
        textShadow: '0 0 20px #FF0000, 0 0 40px #FF0000',
        fontFamily: 'Impact, sans-serif',
      }}
    >
      ❌ WRONG!
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * FloorDrop - Renders the floor drop animation for quiz losers
 *
 * Animation sequence:
 * 1. Floor panels start shaking (warning)
 * 2. Floor opens (splits in middle)
 * 3. Character falls through with rotation
 * 4. Floor closes back together
 */
export const FloorDrop: React.FC<FloorDropProps> = ({
  character,
  durationInFrames,
  style: customStyle,
}) => {
  const frame = useCurrentFrame();

  // Merge custom style with defaults
  const style = { ...DEFAULT_STYLE, ...customStyle };

  // Calculate phase boundaries in frames
  const shakeEnd = Math.floor(durationInFrames * PHASES.shake);
  const openEnd = Math.floor(durationInFrames * (PHASES.shake + PHASES.open));
  const fallEnd = Math.floor(durationInFrames * (PHASES.shake + PHASES.open + PHASES.fall));
  const closeEnd = durationInFrames;

  // Calculate animation values based on current frame
  let shakeIntensity = 0;
  let openAmount = 0;
  let fallProgress = 0;
  let isCharacterVisible = true;

  if (frame < shakeEnd) {
    // Phase 1: Shaking
    shakeIntensity = interpolate(frame, [0, shakeEnd], [0, 1], {
      extrapolateRight: 'clamp',
    });
  } else if (frame < openEnd) {
    // Phase 2: Opening
    shakeIntensity = interpolate(frame, [shakeEnd, shakeEnd + 5], [1, 0], {
      extrapolateRight: 'clamp',
    });
    openAmount = interpolate(frame, [shakeEnd, openEnd], [0, 1], {
      easing: Easing.out(Easing.cubic),
    });
  } else if (frame < fallEnd) {
    // Phase 3: Falling
    openAmount = 1;
    fallProgress = interpolate(frame, [openEnd, fallEnd], [0, 1], {
      extrapolateRight: 'clamp',
    });
  } else {
    // Phase 4: Closing
    openAmount = interpolate(frame, [fallEnd, closeEnd], [1, 0], {
      easing: Easing.in(Easing.cubic),
    });
    isCharacterVisible = false;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    >
      {/* Void background (visible when floor opens) */}
      <VoidBackground backgroundColor={style.backgroundColor} openAmount={openAmount} />

      {/* Warning indicator */}
      <WarningIndicator character={character} shakeIntensity={shakeIntensity} />

      {/* Falling character */}
      <FallingCharacter
        character={character}
        fallProgress={fallProgress}
        characterSize={style.characterSize}
        isVisible={isCharacterVisible && (frame >= openEnd || openAmount > 0.3)}
      />

      {/* Floor panels */}
      <FloorPanel
        side="left"
        shakeIntensity={shakeIntensity}
        openAmount={openAmount}
        floorColor={style.floorColor}
        borderColor={style.borderColor}
      />
      <FloorPanel
        side="right"
        shakeIntensity={shakeIntensity}
        openAmount={openAmount}
        floorColor={style.floorColor}
        borderColor={style.borderColor}
      />
    </div>
  );
};

export default FloorDrop;
