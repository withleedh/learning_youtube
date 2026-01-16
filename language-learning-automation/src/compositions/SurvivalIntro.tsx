/**
 * SurvivalIntro Component
 *
 * Renders the intro sequence for survival quiz:
 * - Game title with dramatic animation
 * - Both characters side by side
 * - HP bars at 100 for both
 * - Rules text
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CHARACTER_INFO } from '../survival/types';
import { HPBar } from './HPBar';

// =============================================================================
// Types
// =============================================================================

export interface SurvivalIntroProps {
  /** Main title text */
  title: string;
  /** Subtitle text */
  subtitle: string;
  /** Duration in frames */
  durationInFrames: number;
  /** Custom style configuration */
  style?: SurvivalIntroStyle;
}

export interface SurvivalIntroStyle {
  /** Background color */
  backgroundColor?: string;
  /** Title color */
  titleColor?: string;
  /** Cat accent color */
  catColor?: string;
  /** Dog accent color */
  dogColor?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<SurvivalIntroStyle> = {
  backgroundColor: '#1A1A2E',
  titleColor: '#FFFFFF',
  catColor: CHARACTER_INFO.cat.color,
  dogColor: CHARACTER_INFO.dog.color,
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Animated Title - Main game title with dramatic entrance
 */
const AnimatedTitle: React.FC<{
  title: string;
  subtitle: string;
  titleColor: string;
}> = ({ title, subtitle, titleColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance animation
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 0,
    to: 1,
  });

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Subtitle entrance (delayed)
  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [20, 40], [20, 0], { extrapolateRight: 'clamp' });

  // Glow pulse effect
  const glowIntensity = 0.5 + Math.sin(frame * 0.1) * 0.3;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Main title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: titleColor,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textAlign: 'center',
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textShadow: `
            0 0 ${20 * glowIntensity}px #FFD700,
            0 0 ${40 * glowIntensity}px #FFD700,
            0 4px 20px rgba(0, 0, 0, 0.5)
          `,
          letterSpacing: 4,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 600,
          color: '#FF4444',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textAlign: 'center',
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          textShadow: '0 0 20px #FF4444, 0 2px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

/**
 * Character Introduction - Shows both characters with their HP
 */
const CharacterIntroduction: React.FC<{
  catColor: string;
  dogColor: string;
}> = ({ catColor, dogColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cat entrance (from left)
  const catX = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 80 },
    from: -200,
    to: 0,
  });
  const catOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateRight: 'clamp' });

  // Dog entrance (from right)
  const dogX = spring({
    frame: frame - 35,
    fps,
    config: { damping: 12, stiffness: 80 },
    from: 200,
    to: 0,
  });
  const dogOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' });

  // VS text entrance
  const vsScale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 8, stiffness: 200 },
    from: 0,
    to: 1,
  });
  const vsOpacity = interpolate(frame, [50, 60], [0, 1], { extrapolateRight: 'clamp' });

  // Bounce animation for characters
  const catBounce = Math.sin(frame * 0.15) * 5;
  const dogBounce = Math.sin(frame * 0.15 + Math.PI) * 5;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
        marginTop: 40,
      }}
    >
      {/* Cat */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
          opacity: catOpacity,
          transform: `translateX(${catX}px) translateY(${catBounce}px)`,
        }}
      >
        <div
          style={{
            fontSize: 120,
            textShadow: `0 0 30px ${catColor}66`,
          }}
        >
          {CHARACTER_INFO.cat.emoji}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: catColor,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {CHARACTER_INFO.cat.nameKorean}
        </div>
      </div>

      {/* VS */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#FFD700',
          fontFamily: 'Impact, sans-serif',
          opacity: vsOpacity,
          transform: `scale(${vsScale})`,
          textShadow: '0 0 20px #FFD700, 0 4px 15px rgba(0, 0, 0, 0.5)',
        }}
      >
        VS
      </div>

      {/* Dog */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
          opacity: dogOpacity,
          transform: `translateX(${dogX}px) translateY(${dogBounce}px)`,
        }}
      >
        <div
          style={{
            fontSize: 120,
            textShadow: `0 0 30px ${dogColor}66`,
          }}
        >
          {CHARACTER_INFO.dog.emoji}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: dogColor,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {CHARACTER_INFO.dog.nameKorean}
        </div>
      </div>
    </div>
  );
};

/**
 * Rules Text - Shows game rules
 */
const RulesText: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [70, 85], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [70, 90], [30, 0], { extrapolateRight: 'clamp' });

  const rules = [
    '🎯 50라운드 영어 퀴즈 대결!',
    '❌ 틀리면 바닥이 열립니다!',
    '💔 HP가 0이 되면 패배!',
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15,
        marginTop: 50,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {rules.map((rule, index) => (
        <div
          key={index}
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            opacity: interpolate(frame, [70 + index * 10, 85 + index * 10], [0, 1], {
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {rule}
        </div>
      ))}
    </div>
  );
};

/**
 * HP Bars Display - Shows both HP bars at 100
 */
const HPBarsDisplay: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [90, 105], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 40px',
        opacity,
      }}
    >
      <HPBar character="cat" currentHP={100} position="left" />
      <HPBar character="dog" currentHP={100} position="right" />
    </div>
  );
};

/**
 * Start Countdown - "Ready? START!" text
 */
const StartCountdown: React.FC<{
  durationInFrames: number;
}> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Show in last 2 seconds
  const showFrom = durationInFrames - fps * 2;

  if (frame < showFrom) return null;

  const localFrame = frame - showFrom;

  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 8, stiffness: 300 },
    from: 2,
    to: 1,
  });

  const opacity = interpolate(localFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  // Flash effect
  const flash = Math.sin(localFrame * 0.5) > 0 ? 1 : 0.7;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: `translateX(-50%) scale(${scale})`,
        fontSize: 48,
        fontWeight: 900,
        color: '#00FF00',
        fontFamily: 'Impact, sans-serif',
        opacity: opacity * flash,
        textShadow: '0 0 30px #00FF00, 0 0 60px #00FF00, 0 4px 20px rgba(0, 0, 0, 0.5)',
        letterSpacing: 8,
      }}
    >
      START!
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * SurvivalIntro - Renders the intro sequence
 *
 * Animation sequence:
 * 1. Title entrance with glow
 * 2. Subtitle entrance
 * 3. Characters slide in from sides
 * 4. VS text appears
 * 5. Rules text fades in
 * 6. HP bars appear
 * 7. "START!" countdown
 */
export const SurvivalIntro: React.FC<SurvivalIntroProps> = ({
  title,
  subtitle,
  durationInFrames,
  style: customStyle,
}) => {
  // Merge custom style with defaults
  const style = { ...DEFAULT_STYLE, ...customStyle };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: style.backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at center, ${style.backgroundColor} 0%, #000000 100%)
          `,
        }}
      />

      {/* HP Bars */}
      <HPBarsDisplay />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* Title */}
        <AnimatedTitle title={title} subtitle={subtitle} titleColor={style.titleColor} />

        {/* Characters */}
        <CharacterIntroduction catColor={style.catColor} dogColor={style.dogColor} />

        {/* Rules */}
        <RulesText />
      </div>

      {/* Start countdown */}
      <StartCountdown durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

export default SurvivalIntro;
