/**
 * SurvivalIntro Component - Street Fighter Style
 *
 * Renders a dramatic VS screen inspired by fighting games:
 * - Split screen with diagonal divide
 * - Characters on opposite sides with dramatic lighting
 * - Electric VS effect in the center
 * - Dramatic entrance animations
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CHARACTER_INFO } from '../survival/types';

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
  backgroundColor: '#0A0A15',
  titleColor: '#FFFFFF',
  catColor: CHARACTER_INFO.cat.color,
  dogColor: CHARACTER_INFO.dog.color,
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Dramatic Background with split screen effect
 */
const DramaticBackground: React.FC<{
  catColor: string;
  dogColor: string;
}> = ({ catColor, dogColor }) => {
  const frame = useCurrentFrame();

  // Animated gradient intensity
  const pulseIntensity = 0.3 + Math.sin(frame * 0.08) * 0.15;

  // Lightning flash effect
  const lightningFlash = frame % 45 < 3 ? 0.3 : 0;

  return (
    <>
      {/* Base dark background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0A0A15',
        }}
      />

      {/* Cat side gradient (left) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '55%',
          height: '100%',
          background: `linear-gradient(135deg, ${catColor}${Math.round(pulseIntensity * 255)
            .toString(16)
            .padStart(2, '0')} 0%, transparent 70%)`,
          clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)',
        }}
      />

      {/* Dog side gradient (right) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55%',
          height: '100%',
          background: `linear-gradient(225deg, ${dogColor}${Math.round(pulseIntensity * 255)
            .toString(16)
            .padStart(2, '0')} 0%, transparent 70%)`,
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)',
        }}
      />

      {/* Center diagonal line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: 8,
          height: '100%',
          background: `linear-gradient(180deg, #FFD700 0%, #FF6B00 50%, #FFD700 100%)`,
          transform: 'translateX(-50%) skewX(-15deg)',
          boxShadow: '0 0 30px #FFD700, 0 0 60px #FF6B00',
        }}
      />

      {/* Lightning flash overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `rgba(255, 255, 255, ${lightningFlash})`,
          pointerEvents: 'none',
        }}
      />

      {/* Scan lines effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          )`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

/**
 * Character Panel - One side of the VS screen
 */
const CharacterPanel: React.FC<{
  character: 'cat' | 'dog';
  side: 'left' | 'right';
  color: string;
}> = ({ character, side, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const info = CHARACTER_INFO[character];

  // Entrance animation
  const entranceDelay = side === 'left' ? 10 : 15;
  const slideX = spring({
    frame: frame - entranceDelay,
    fps,
    config: { damping: 15, stiffness: 100 },
    from: side === 'left' ? -400 : 400,
    to: 0,
  });

  const opacity = interpolate(frame, [entranceDelay, entranceDelay + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Breathing/idle animation
  const breathe = Math.sin(frame * 0.1) * 8;
  const shadowPulse = 0.5 + Math.sin(frame * 0.15) * 0.3;

  // Character shake on entrance
  const shake = frame < entranceDelay + 20 ? Math.sin(frame * 2) * 3 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        [side]: 0,
        width: '45%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `translateX(${slideX + shake}px)`,
      }}
    >
      {/* Character emoji - HUGE */}
      <div
        style={{
          fontSize: 280,
          transform: `translateY(${breathe}px) ${side === 'right' ? 'scaleX(-1)' : ''}`,
          filter: `drop-shadow(0 0 ${40 * shadowPulse}px ${color}) drop-shadow(0 20px 40px rgba(0,0,0,0.8))`,
          marginBottom: -40,
        }}
      >
        {info.emoji}
      </div>

      {/* Character name plate */}
      <div
        style={{
          background: `linear-gradient(90deg, transparent, ${color}CC, transparent)`,
          padding: '15px 60px',
          marginTop: 20,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: '#FFFFFF',
            fontFamily: 'Impact, Pretendard, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: 8,
            textShadow: `0 0 20px ${color}, 0 4px 10px rgba(0,0,0,0.8)`,
          }}
        >
          {info.nameKorean}
        </div>
      </div>

      {/* Stats/Title */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: color,
          fontFamily: 'Pretendard, sans-serif',
          marginTop: 15,
          letterSpacing: 4,
          textShadow: `0 0 10px ${color}`,
        }}
      >
        {/* {character === 'cat' ? '🎀 CHALLENGER' : '🔥 DEFENDER'} */}
      </div>
    </div>
  );
};

/**
 * Electric VS Badge - Center dramatic VS
 */
const ElectricVS: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // VS entrance with impact
  const vsDelay = 35;
  const vsScale = spring({
    frame: frame - vsDelay,
    fps,
    config: { damping: 8, stiffness: 300 },
    from: 3,
    to: 1,
  });

  const vsOpacity = interpolate(frame, [vsDelay, vsDelay + 5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Electric pulse effect
  const electricPulse = Math.sin(frame * 0.3) * 0.3 + 0.7;
  const electricOffset = Math.sin(frame * 0.5) * 3;

  // Rotation wobble
  const rotation = frame < vsDelay + 30 ? Math.sin(frame * 0.8) * 5 : 0;

  if (frame < vsDelay) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${vsScale}) rotate(${rotation}deg)`,
        opacity: vsOpacity,
        zIndex: 100,
      }}
    >
      {/* Electric glow background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 300,
          height: 300,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, rgba(255,215,0,${electricPulse * 0.5}) 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* VS Text with electric effect */}
      <div
        style={{
          fontSize: 180,
          fontWeight: 900,
          fontFamily: 'Impact, sans-serif',
          color: '#FFD700',
          textShadow: `
            ${electricOffset}px 0 0 #FF6B00,
            ${-electricOffset}px 0 0 #FFAA00,
            0 0 30px #FFD700,
            0 0 60px #FF6B00,
            0 0 90px #FFD700,
            0 8px 20px rgba(0,0,0,0.8)
          `,
          letterSpacing: -10,
          WebkitTextStroke: '3px #FF6B00',
        }}
      >
        VS
      </div>

      {/* Electric sparks */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + frame * 0.1;
        const radius = 100 + Math.sin(frame * 0.2 + i) * 20;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const sparkOpacity = 0.5 + Math.sin(frame * 0.5 + i * 2) * 0.5;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FFFFFF',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity: sparkOpacity,
              boxShadow: '0 0 10px #FFD700, 0 0 20px #FFFFFF',
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Title Banner - Top dramatic title
 */
const TitleBanner: React.FC<{
  title: string;
  subtitle: string;
}> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title drop animation
  const titleY = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 100 },
    from: -100,
    to: 0,
  });

  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Subtitle slide
  const subtitleOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [60, 80], [30, 0], { extrapolateRight: 'clamp' });

  // Glow pulse
  const glowPulse = 0.7 + Math.sin(frame * 0.1) * 0.3;

  return (
    <div
      style={{
        position: 'absolute',
        top: 120,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {/* Main title */}
      <div
        style={{
          fontSize: 84,
          fontWeight: 900,
          color: '#FFFFFF',
          fontFamily: 'Impact, Pretendard, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: 12,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textShadow: `
            0 0 ${30 * glowPulse}px #FFD700,
            0 0 ${60 * glowPulse}px #FF6B00,
            0 6px 20px rgba(0,0,0,0.8)
          `,
          WebkitTextStroke: '2px #FFD700',
        }}
      >
        {title}
      </div>

      {/* Subtitle - danger warning style */}
      <div
        style={{
          marginTop: 20,
          padding: '10px 40px',
          background: 'linear-gradient(90deg, transparent, rgba(255,0,0,0.8), transparent)',
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, sans-serif',
            letterSpacing: 6,
            textShadow: '0 0 20px #FF0000',
          }}
        >
          ⚠️ {subtitle} ⚠️
        </div>
      </div>
    </div>
  );
};

/**
 * Tekken-style FIGHT Transition
 * - Diagonal split opens from center
 * - Lava/fire flows outward
 * - Giant FIGHT text appears
 */
const TekkenFightTransition: React.FC<{
  durationInFrames: number;
}> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // FIGHT starts 2 seconds before end
  const fightStartFrame = durationInFrames - fps * 2;
  const localFrame = frame - fightStartFrame;
  const showFight = frame >= fightStartFrame;

  if (!showFight) return null;

  // Animation phases (in local frames)
  const splitProgress = Math.min(localFrame / 15, 1); // 0.5초 동안 갈라짐
  const lavaProgress = Math.min(Math.max(localFrame - 8, 0) / 20, 1); // 용암 퍼짐
  const textProgress = Math.min(Math.max(localFrame - 12, 0) / 10, 1); // 텍스트 등장

  // Easing functions
  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const easedSplit = easeOutQuart(splitProgress);
  const easedLava = easeOutQuart(lavaProgress);
  const easedText = easeOutBack(textProgress);

  // Split opening distance
  const splitDistance = easedSplit * 960; // 화면 절반

  // Lava particles - 더 많이, 더 넓게
  const lavaParticles = Array.from({ length: 100 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const speed = 0.3 + (i % 7) * 0.4;
    const yOffset = (i % 12) * 80 - 480; // 더 넓은 Y 범위 (-480 ~ +480)
    const delay = (i % 8) * 1.5;
    const particleProgress = Math.max(0, (localFrame - 6 - delay) / 30);
    const x = side * particleProgress * speed * 800; // 더 멀리 퍼짐
    const y = yOffset + Math.sin(particleProgress * 4 + i) * 40;
    const opacity = Math.max(0, 1 - particleProgress * 0.7);
    const size = 8 + (i % 5) * 10;
    const hue = 15 + (i % 4) * 12; // Orange to red
    return { x, y, opacity, size, hue };
  });

  // Extra spark particles - 작은 불꽃들
  const sparkParticles = Array.from({ length: 80 }, (_, i) => {
    const angle = (i / 80) * Math.PI * 2;
    const speed = 1 + (i % 5) * 0.8;
    const delay = (i % 10) * 1;
    const particleProgress = Math.max(0, (localFrame - 10 - delay) / 35);
    const radius = particleProgress * speed * 600;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.6; // 타원형으로 퍼짐
    const opacity = Math.max(0, 1 - particleProgress * 0.8);
    const size = 4 + (i % 3) * 4;
    return { x, y, opacity, size };
  });

  // Screen shake
  const shakeX = localFrame < 20 ? Math.sin(localFrame * 8) * (20 - localFrame) * 0.5 : 0;
  const shakeY = localFrame < 20 ? Math.cos(localFrame * 10) * (20 - localFrame) * 0.3 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(0, 0, 0, ${0.7 * splitProgress})`,
        }}
      />

      {/* Left diagonal panel sliding left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '60%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a0a00 0%, #0a0000 100%)',
          clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)',
          transform: `translateX(${-splitDistance}px)`,
          boxShadow: 'inset -20px 0 60px rgba(255, 100, 0, 0.5)',
        }}
      />

      {/* Right diagonal panel sliding right */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          height: '100%',
          background: 'linear-gradient(225deg, #1a0a00 0%, #0a0000 100%)',
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)',
          transform: `translateX(${splitDistance}px)`,
          boxShadow: 'inset 20px 0 60px rgba(255, 100, 0, 0.5)',
        }}
      />

      {/* Center lava crack glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 20 + easedLava * 100,
          height: '120%',
          transform: 'translate(-50%, -50%) skewX(-15deg)',
          background: `linear-gradient(180deg, 
            transparent 0%, 
            rgba(255, 100, 0, ${0.8 * easedLava}) 20%, 
            rgba(255, 200, 0, ${0.9 * easedLava}) 50%, 
            rgba(255, 100, 0, ${0.8 * easedLava}) 80%, 
            transparent 100%)`,
          filter: 'blur(10px)',
        }}
      />

      {/* Lava/fire particles */}
      {lavaParticles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `calc(50% + ${p.y}px)`,
            left: `calc(50% + ${p.x}px)`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, hsl(${p.hue}, 100%, 60%) 0%, hsl(${p.hue + 10}, 100%, 40%) 100%)`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size}px hsl(${p.hue}, 100%, 50%), 0 0 ${p.size * 2}px hsl(${p.hue}, 80%, 40%)`,
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Extra spark particles - 작은 불꽃들 */}
      {sparkParticles.map((p, i) => (
        <div
          key={`spark-${i}`}
          style={{
            position: 'absolute',
            top: `calc(50% + ${p.y}px)`,
            left: `calc(50% + ${p.x}px)`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, #FFFFFF 0%, #FFAA00 50%, #FF6600 100%)`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px #FF8800, 0 0 ${p.size * 4}px #FF4400`,
          }}
        />
      ))}

      {/* Fire streaks from center - 더 많이 */}
      {Array.from({ length: 24 }, (_, i) => {
        const side = i < 12 ? -1 : 1;
        const yPos = (i % 12) * 90 - 495;
        const streakProgress = Math.max(0, (localFrame - 8 - (i % 4) * 1.5) / 18);
        const width = streakProgress * 900;
        const opacity = Math.max(0, 1 - streakProgress * 0.5);

        return (
          <div
            key={`streak-${i}`}
            style={{
              position: 'absolute',
              top: `calc(50% + ${yPos}px)`,
              left: side === -1 ? `calc(50% - ${width}px)` : '50%',
              width: width,
              height: 4 + (i % 3) * 2,
              background: `linear-gradient(${side === -1 ? '270deg' : '90deg'}, 
                rgba(255, 200, 0, ${opacity}) 0%, 
                rgba(255, 100, 0, ${opacity * 0.5}) 50%, 
                transparent 100%)`,
              filter: 'blur(2px)',
            }}
          />
        );
      })}

      {/* FIGHT! text - HUGE */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${easedText * 1})`,
          opacity: textProgress > 0 ? 1 : 0,
        }}
      >
        {/* Glow background */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 800,
            height: 400,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse, rgba(255, 150, 0, 0.6) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Main FIGHT text */}
        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            fontFamily: 'Impact, sans-serif',
            color: '#FFFFFF',
            textShadow: `
              0 0 20px #FF6600,
              0 0 40px #FF4400,
              0 0 80px #FF2200,
              0 0 120px #FF0000,
              0 10px 40px rgba(0,0,0,0.8),
              4px 4px 0 #FF6600,
              -4px -4px 0 #FF6600
            `,
            letterSpacing: 30,
            WebkitTextStroke: '4px #FF4400',
          }}
        >
          FIGHT!
        </div>
      </div>

      {/* Flash effect on impact */}
      {localFrame >= 12 && localFrame < 18 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `rgba(255, 200, 100, ${0.5 * (1 - (localFrame - 12) / 6)})`,
          }}
        />
      )}
    </div>
  );
};

/**
 * Bottom Info Bar - Round info and rules
 */
const BottomInfoBar: React.FC<{
  durationInFrames: number;
}> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide up animation
  const barY = spring({
    frame: frame - 80,
    fps,
    config: { damping: 15, stiffness: 80 },
    from: 100,
    to: 0,
  });

  const barOpacity = interpolate(frame, [80, 95], [0, 1], { extrapolateRight: 'clamp' });

  // Hide info bar when FIGHT appears
  const fightStartFrame = durationInFrames - fps * 2;
  const hideBar = frame >= fightStartFrame;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      {/* Info bar */}
      {!hideBar && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 60,
            padding: '25px 0',
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.9))',
            opacity: barOpacity,
            transform: `translateY(${barY}px)`,
          }}
        >
          {/* <InfoItem icon="🎯" text="50 ROUNDS" />
          <InfoItem icon="💔" text="HP SYSTEM" />
          <InfoItem icon="⚡" text="SURVIVAL MODE" /> */}
        </div>
      )}
    </div>
  );
};

/**
 * Info Item - Single info badge
 */
const InfoItem: React.FC<{
  icon: string;
  text: string;
}> = ({ icon, text }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 25px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Pretendard, sans-serif',
          letterSpacing: 2,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Film Grain & Vignette Overlay
 */
const FilmGrainOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  // Animated grain offset for realistic effect
  const grainOffset = frame * 100;

  return (
    <>
      {/* Film grain noise */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.08,
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundPosition: `${grainOffset % 200}px ${(grainOffset * 0.7) % 200}px`,
          pointerEvents: 'none',
          zIndex: 300,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 301,
        }}
      />

      {/* Subtle scan lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          )`,
          pointerEvents: 'none',
          zIndex: 302,
        }}
      />
    </>
  );
};

/**
 * SurvivalIntro - Street Fighter Style VS Screen
 *
 * Animation sequence:
 * 1. Background split effect appears
 * 2. Title drops from top
 * 3. Characters slide in from sides
 * 4. VS badge impacts center with electric effect
 * 5. Subtitle warning appears
 * 6. Bottom info bar slides up
 * 7. "FIGHT!" appears before transition
 */
export const SurvivalIntro: React.FC<SurvivalIntroProps> = ({
  title,
  subtitle,
  durationInFrames,
  style: customStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = { ...DEFAULT_STYLE, ...customStyle };

  // 2. Camera work - zoom effect (0.5초 = 15프레임 안에 완료)
  const zoomStart = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 300 },
    from: 1.1,
    to: 1.0,
  });

  // Slight zoom in during VS reveal
  const vsZoom = frame > 35 && frame < 60 ? 1 + Math.sin((frame - 35) * 0.15) * 0.03 : 1;

  // Zoom out slightly before FIGHT
  const fightStartFrame = durationInFrames - fps * 2;
  const preFightZoom =
    frame > fightStartFrame - 30 && frame < fightStartFrame
      ? interpolate(frame, [fightStartFrame - 30, fightStartFrame], [1, 0.95], {
          extrapolateRight: 'clamp',
        })
      : frame >= fightStartFrame
        ? 0.95
        : 1;

  const totalZoom = zoomStart * vsZoom * preFightZoom;

  // 6. Color grading - stronger tints on each side
  const catTintOpacity = 0.15 + Math.sin(frame * 0.05) * 0.05;
  const dogTintOpacity = 0.15 + Math.sin(frame * 0.05 + Math.PI) * 0.05;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: style.backgroundColor,
        overflow: 'hidden',
      }}
    >
      {/* Camera zoom wrapper */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${totalZoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Dramatic split background */}
        <DramaticBackground catColor={style.catColor} dogColor={style.dogColor} />

        {/* 6. Color grading overlays */}
        {/* Cat side (left) - warm orange tint */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: `linear-gradient(90deg, ${style.catColor}${Math.round(catTintOpacity * 255)
              .toString(16)
              .padStart(2, '0')} 0%, transparent 100%)`,
            pointerEvents: 'none',
            zIndex: 5,
            mixBlendMode: 'color',
          }}
        />

        {/* Dog side (right) - cool purple tint */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: `linear-gradient(-90deg, ${style.dogColor}${Math.round(dogTintOpacity * 255)
              .toString(16)
              .padStart(2, '0')} 0%, transparent 100%)`,
            pointerEvents: 'none',
            zIndex: 5,
            mixBlendMode: 'color',
          }}
        />

        {/* Title banner */}
        <TitleBanner title={title} subtitle={subtitle} />

        {/* Character panels */}
        <CharacterPanel character="cat" side="left" color={style.catColor} />
        <CharacterPanel character="dog" side="right" color={style.dogColor} />

        {/* Electric VS badge */}
        <ElectricVS />

        {/* Bottom info bar */}
        <BottomInfoBar durationInFrames={durationInFrames} />
      </div>

      {/* Tekken-style FIGHT transition (outside zoom wrapper) */}
      <TekkenFightTransition durationInFrames={durationInFrames} />

      {/* 5. Film grain & vignette (always on top) */}
      <FilmGrainOverlay />
    </AbsoluteFill>
  );
};

export default SurvivalIntro;
