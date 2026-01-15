/**
 * HookIntro Component
 *
 * Renders the hook intro section at the beginning of comparison videos.
 * Features attention-grabbing text with animations and background effects.
 *
 * Requirements: 2.1, 2.3, 10.3
 */

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  staticFile,
} from 'remotion';
import type { Hook } from '../comparison/types';

// =============================================================================
// Types
// =============================================================================

export interface HookIntroProps {
  /** Main hook content */
  hook: Hook;
  /** Array of hook variants for A/B testing */
  hookVariants?: Hook[];
  /** Index of selected hook variant (0 = main hook) */
  selectedVariantIndex?: number;
  /** Duration in frames */
  durationInFrames?: number;
  /** Background image path */
  backgroundImage?: string;
  /** Audio file path for hook narration */
  audioPath?: string;
  /** Style configuration */
  style?: HookIntroStyle;
}

export interface HookIntroStyle {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  animation?: 'fade' | 'zoom' | 'slide' | 'bounce';
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<HookIntroStyle> = {
  backgroundColor: '#0D1B2A',
  textColor: '#FFFFFF',
  accentColor: '#FF4444',
  animation: 'zoom',
};

const DEFAULT_DURATION_FRAMES = 150; // 5 seconds at 30fps

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the active hook based on variant selection
 */
function getActiveHook(hook: Hook, hookVariants?: Hook[], selectedVariantIndex?: number): Hook {
  if (selectedVariantIndex !== undefined && selectedVariantIndex > 0 && hookVariants) {
    const variantIndex = selectedVariantIndex - 1; // 0 = main hook, 1+ = variants
    if (variantIndex < hookVariants.length) {
      return hookVariants[variantIndex];
    }
  }
  return hook;
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Animated background with gradient and particles */
const AnimatedBackground: React.FC<{
  backgroundImage?: string;
  style: Required<HookIntroStyle>;
}> = ({ backgroundImage, style }) => {
  const frame = useCurrentFrame();

  // Subtle zoom animation for background
  const bgScale = interpolate(frame, [0, 150], [1.1, 1.0], {
    extrapolateRight: 'clamp',
  });

  // Gradient pulse
  const pulseIntensity = 0.3 + Math.sin(frame * 0.1) * 0.1;

  return (
    <AbsoluteFill>
      {/* Background image with blur */}
      {backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px) brightness(0.3)',
              transform: `scale(${bgScale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Dark gradient overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, 
            ${style.backgroundColor}CC 0%, 
            ${style.backgroundColor}FF 70%)`,
        }}
      />

      {/* Accent color glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, 
            ${style.accentColor}${Math.round(pulseIntensity * 255)
              .toString(16)
              .padStart(2, '0')} 0%, 
            transparent 50%)`,
          opacity: 0.3,
        }}
      />

      {/* Vignette effect */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Main text with animation */
const MainText: React.FC<{
  text: string;
  style: Required<HookIntroStyle>;
  durationFrames: number;
}> = ({ text, style, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation based on style
  let opacity = 1;
  let scale = 1;
  let translateY = 0;
  const translateX = 0;

  switch (style.animation) {
    case 'fade':
      opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
      break;
    case 'zoom':
      scale = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 150 },
      });
      opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      break;
    case 'slide':
      translateY = interpolate(frame, [0, 20], [100, 0], { extrapolateRight: 'clamp' });
      opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
      break;
    case 'bounce':
      scale = spring({
        frame,
        fps,
        config: { damping: 8, stiffness: 200 },
      });
      opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      break;
  }

  // Fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // Text glow pulse
  const glowIntensity = 0.6 + Math.sin(frame * 0.15) * 0.2;

  return (
    <div
      style={{
        fontSize: 96,
        fontWeight: 900,
        color: style.textColor,
        textAlign: 'center',
        lineHeight: 1.2,
        opacity: opacity * fadeOut,
        transform: `scale(${scale}) translateY(${translateY}px) translateX(${translateX}px)`,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        textShadow: `0 0 ${60 * glowIntensity}px ${style.accentColor}88, 0 6px 40px rgba(0,0,0,0.6)`,
        letterSpacing: '4px',
        maxWidth: '90%',
      }}
    >
      {text}
    </div>
  );
};

/** Subtext with delayed animation */
const SubText: React.FC<{
  text: string;
  style: Required<HookIntroStyle>;
  durationFrames: number;
}> = ({ text, style, durationFrames }) => {
  const frame = useCurrentFrame();

  // Delayed fade in
  const opacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slide up
  const translateY = interpolate(frame, [20, 40], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  return (
    <div
      style={{
        fontSize: 48,
        fontWeight: 500,
        color: style.textColor,
        textAlign: 'center',
        lineHeight: 1.4,
        opacity: opacity * fadeOut * 0.8,
        transform: `translateY(${translateY}px)`,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        marginTop: 30,
        maxWidth: '85%',
      }}
    >
      {text}
    </div>
  );
};

/** Decorative elements */
const DecorativeElements: React.FC<{
  style: Required<HookIntroStyle>;
}> = ({ style }) => {
  const frame = useCurrentFrame();

  // Rotating accent lines
  const rotation = frame * 0.5;

  // Pulsing circles
  const circleScale = 1 + Math.sin(frame * 0.1) * 0.1;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          width: 200,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${style.accentColor}, transparent)`,
          transform: `translateX(-50%) rotate(${rotation}deg)`,
          opacity: 0.5,
        }}
      />

      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          width: 200,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${style.accentColor}, transparent)`,
          transform: `translateX(-50%) rotate(${-rotation}deg)`,
          opacity: 0.5,
        }}
      />

      {/* Corner circles */}
      {[
        { top: '10%', left: '10%' },
        { top: '10%', right: '10%' },
        { bottom: '10%', left: '10%' },
        { bottom: '10%', right: '10%' },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `2px solid ${style.accentColor}`,
            transform: `scale(${circleScale})`,
            opacity: 0.3,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * HookIntro - Renders the attention-grabbing intro section
 *
 * Supports multiple hook variants for A/B testing.
 * Features animated text, background effects, and decorative elements.
 */
export const HookIntro: React.FC<HookIntroProps> = ({
  hook,
  hookVariants,
  selectedVariantIndex = 0,
  durationInFrames = DEFAULT_DURATION_FRAMES,
  backgroundImage,
  audioPath,
  style: customStyle,
}) => {
  // Merge custom style with defaults
  const style: Required<HookIntroStyle> = {
    ...DEFAULT_STYLE,
    ...customStyle,
  };

  // Get the active hook (main or variant)
  const activeHook = getActiveHook(hook, hookVariants, selectedVariantIndex);

  return (
    <AbsoluteFill>
      {/* Audio narration */}
      {audioPath && <Audio src={staticFile(audioPath)} volume={1.0} />}

      {/* Animated background */}
      <AnimatedBackground backgroundImage={backgroundImage} style={style} />

      {/* Decorative elements */}
      <DecorativeElements style={style} />

      {/* Content container */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 80px',
        }}
      >
        {/* Main hook text */}
        <MainText text={activeHook.text} style={style} durationFrames={durationInFrames} />

        {/* Subtext (if provided) */}
        {activeHook.subtext && (
          <SubText text={activeHook.subtext} style={style} durationFrames={durationInFrames} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default HookIntro;
