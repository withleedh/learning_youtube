/**
 * CTAEnding Component
 *
 * Renders the call-to-action ending section for comparison videos.
 * Features question text, subscribe reminder, and engaging animations.
 *
 * Requirements: 6.1, 6.3
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
import type { CTA } from '../comparison/types';

// =============================================================================
// Types
// =============================================================================

export interface CTAEndingProps {
  /** CTA content */
  cta: CTA;
  /** Duration in frames (default: 10-15 seconds) */
  durationInFrames?: number;
  /** Channel logo path */
  channelLogo?: string;
  /** Background image path */
  backgroundImage?: string;
  /** Audio file path for CTA narration */
  audioPath?: string;
  /** Style configuration */
  style?: CTAEndingStyle;
}

export interface CTAEndingStyle {
  backgroundColor?: string;
  questionColor?: string;
  reminderColor?: string;
  accentColor?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STYLE: Required<CTAEndingStyle> = {
  backgroundColor: '#0D1B2A',
  questionColor: '#FFD93D',
  reminderColor: '#FFFFFF',
  accentColor: '#FF4444',
};

const DEFAULT_DURATION_FRAMES = 450; // 15 seconds at 30fps

// =============================================================================
// Sub-Components
// =============================================================================

/** Animated background with gradient */
const CTABackground: React.FC<{
  backgroundImage?: string;
  style: Required<CTAEndingStyle>;
}> = ({ backgroundImage, style }) => {
  const frame = useCurrentFrame();

  // Subtle zoom animation
  const bgScale = interpolate(frame, [0, 300], [1.05, 1.0], {
    extrapolateRight: 'clamp',
  });

  // Gradient pulse
  const pulseIntensity = 0.4 + Math.sin(frame * 0.08) * 0.15;

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
              filter: 'blur(25px) brightness(0.25)',
              transform: `scale(${bgScale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Dark gradient overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, 
            ${style.backgroundColor}EE 0%, 
            ${style.backgroundColor}FF 50%,
            ${style.backgroundColor}EE 100%)`,
        }}
      />

      {/* Accent glow at center */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, 
            ${style.accentColor}${Math.round(pulseIntensity * 255)
              .toString(16)
              .padStart(2, '0')} 0%, 
            transparent 60%)`,
          opacity: 0.2,
        }}
      />
    </AbsoluteFill>
  );
};

/** Question text with animation */
const QuestionText: React.FC<{
  text: string;
  style: Required<CTAEndingStyle>;
}> = ({ text, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scale animation
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  // Fade in
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Glow pulse
  const glowIntensity = 0.6 + Math.sin(frame * 0.12) * 0.2;

  return (
    <div
      style={{
        fontSize: 72,
        fontWeight: 800,
        color: style.questionColor,
        textAlign: 'center',
        lineHeight: 1.3,
        opacity,
        transform: `scale(${scale})`,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        textShadow: `0 0 ${50 * glowIntensity}px ${style.questionColor}66, 0 6px 30px rgba(0,0,0,0.5)`,
        letterSpacing: '2px',
        maxWidth: '90%',
      }}
    >
      {text}
    </div>
  );
};

/** Subscribe reminder with animation */
const ReminderText: React.FC<{
  text: string;
  style: Required<CTAEndingStyle>;
}> = ({ text, style }) => {
  const frame = useCurrentFrame();

  // Delayed fade in
  const opacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slide up
  const translateY = interpolate(frame, [40, 60], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        fontSize: 48,
        fontWeight: 600,
        color: style.reminderColor,
        textAlign: 'center',
        lineHeight: 1.4,
        opacity: opacity * 0.9,
        transform: `translateY(${translateY}px)`,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        marginTop: 40,
        maxWidth: '85%',
      }}
    >
      {text}
    </div>
  );
};

/** Animated subscribe button */
const SubscribeButton: React.FC<{
  style: Required<CTAEndingStyle>;
}> = ({ style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delayed appearance
  const opacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Bounce animation
  const scale = spring({
    frame: Math.max(0, frame - 80),
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  // Pulse animation
  const pulse = 1 + Math.sin((frame - 80) * 0.15) * 0.05;

  // Glow animation
  const glowSize = 20 + Math.sin((frame - 80) * 0.1) * 10;

  return (
    <div
      style={{
        marginTop: 60,
        opacity,
        transform: `scale(${scale * pulse})`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '24px 60px',
          background: style.accentColor,
          borderRadius: 16,
          boxShadow: `0 0 ${glowSize}px ${style.accentColor}88, 0 8px 30px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Bell icon */}
        <span style={{ fontSize: 48 }}>🔔</span>

        {/* Subscribe text */}
        <span
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: '2px',
          }}
        >
          구독
        </span>

        {/* Like icon */}
        <span style={{ fontSize: 48 }}>👍</span>
      </div>
    </div>
  );
};

/** Channel logo with animation */
const ChannelLogo: React.FC<{
  logoPath: string;
}> = ({ logoPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delayed appearance
  const opacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scale animation
  const scale = spring({
    frame: Math.max(0, frame - 120),
    fps,
    config: { damping: 15, stiffness: 150 },
  });

  return (
    <div
      style={{
        marginTop: 50,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <Img
        src={staticFile(logoPath)}
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.3)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
};

/** Animated comment icon */
const CommentIcon: React.FC<{
  style: Required<CTAEndingStyle>;
}> = ({ style }) => {
  const frame = useCurrentFrame();

  // Delayed appearance
  const opacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Bounce animation
  const bounce = Math.sin((frame - 60) * 0.2) * 5;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20%',
        right: '15%',
        fontSize: 80,
        opacity: opacity * 0.8,
        transform: `translateY(${bounce}px)`,
        filter: `drop-shadow(0 0 20px ${style.questionColor}66)`,
      }}
    >
      💬
    </div>
  );
};

/** Floating particles */
const FloatingParticles: React.FC<{
  style: Required<CTAEndingStyle>;
}> = ({ style }) => {
  const frame = useCurrentFrame();

  const particles = [
    { x: 10, y: 20, size: 8, speed: 0.5, delay: 0 },
    { x: 85, y: 30, size: 6, speed: 0.7, delay: 20 },
    { x: 20, y: 70, size: 10, speed: 0.4, delay: 40 },
    { x: 90, y: 80, size: 7, speed: 0.6, delay: 10 },
    { x: 5, y: 50, size: 5, speed: 0.8, delay: 30 },
    { x: 95, y: 55, size: 9, speed: 0.45, delay: 50 },
  ];

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const adjustedFrame = Math.max(0, frame - p.delay);
        const y = p.y - ((adjustedFrame * p.speed) % 100);
        const opacity = interpolate(adjustedFrame, [0, 30], [0, 0.6], {
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: style.questionColor,
              opacity: opacity * (0.3 + Math.sin(adjustedFrame * 0.1 + i) * 0.2),
              boxShadow: `0 0 ${p.size * 2}px ${style.questionColor}88`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * CTAEnding - Renders the call-to-action ending section
 *
 * Features:
 * - Question text to encourage comments
 * - Subscribe reminder with animated button
 * - Channel logo display
 * - Engaging animations and effects
 */
export const CTAEnding: React.FC<CTAEndingProps> = ({
  cta,
  durationInFrames = DEFAULT_DURATION_FRAMES,
  channelLogo,
  backgroundImage,
  audioPath,
  style: customStyle,
}) => {
  const frame = useCurrentFrame();

  // Merge custom style with defaults
  const style: Required<CTAEndingStyle> = {
    ...DEFAULT_STYLE,
    ...customStyle,
  };

  // Fade out at end
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Audio narration */}
      {audioPath && <Audio src={staticFile(audioPath)} volume={1.0} />}

      {/* Animated background */}
      <CTABackground backgroundImage={backgroundImage} style={style} />

      {/* Floating particles */}
      <FloatingParticles style={style} />

      {/* Comment icon */}
      <CommentIcon style={style} />

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
        {/* Question text */}
        <QuestionText text={cta.question} style={style} />

        {/* Reminder text */}
        <ReminderText text={cta.reminder} style={style} />

        {/* Subscribe button */}
        <SubscribeButton style={style} />

        {/* Channel logo */}
        {channelLogo && <ChannelLogo logoPath={channelLogo} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default CTAEnding;
