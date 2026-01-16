/**
 * SurvivalRoundView Component - High Quality Battle Arena Style
 * Uses actual character images from assets folder
 */

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  staticFile,
  Img,
} from 'remotion';
import { SurvivalRound, SurvivalCharacter } from '../survival/types';
import { SurvivalTimingConfig, DEFAULT_SURVIVAL_TIMING } from '../survival/timing';
import { TekkenHPBar } from './TekkenHPBar';

export interface SurvivalRoundViewProps {
  round: SurvivalRound;
  roundNumber: number;
  totalRounds: number;
  catHP: number;
  dogHP: number;
  previousCatHP: number;
  previousDogHP: number;
  catWins?: number;
  dogWins?: number;
  audioFiles?: {
    situation?: string;
    dogAnswer?: string;
    catAnswer?: string;
    floorDrop?: string;
    hpDecrease?: string;
    explanation?: string;
  };
  timingConfig?: SurvivalTimingConfig;
  fps?: number;
}

const DEFAULT_FPS = 30;
const COLORS = {
  cat: { primary: '#FF9500', glow: '#FF6B00' },
  dog: { primary: '#5856D6', glow: '#4240B0' },
  correct: { primary: '#00FF88', glow: '#00CC6A' },
  wrong: { primary: '#FF3B30', glow: '#CC2F26' },
};

// Character image paths (in assets/survival/characters folder)
// 10 emotions × 3 variations each
type EmotionType =
  | 'neutral'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'sad'
  | 'shocked'
  | 'confident'
  | 'nervous'
  | 'celebrating'
  | 'defeated';

const getCharacterImagePath = (
  character: 'cat' | 'dog',
  emotion: EmotionType,
  variation: 1 | 2 | 3 = 1
): string => {
  return `survival/characters/${character}/${character}_${emotion}_${variation}.png`;
};

// Simplified mapping for component phases
const CHARACTER_IMAGES = {
  cat: {
    normal: getCharacterImagePath('cat', 'neutral'),
    thinking: getCharacterImagePath('cat', 'thinking'),
    speaking: getCharacterImagePath('cat', 'speaking'),
    happy: getCharacterImagePath('cat', 'celebrating'),
    sad: getCharacterImagePath('cat', 'defeated'),
    winner: getCharacterImagePath('cat', 'celebrating'),
    loser: getCharacterImagePath('cat', 'defeated'),
  },
  dog: {
    normal: getCharacterImagePath('dog', 'neutral'),
    thinking: getCharacterImagePath('dog', 'thinking'),
    speaking: getCharacterImagePath('dog', 'speaking'),
    happy: getCharacterImagePath('dog', 'celebrating'),
    sad: getCharacterImagePath('dog', 'defeated'),
    winner: getCharacterImagePath('dog', 'celebrating'),
    loser: getCharacterImagePath('dog', 'defeated'),
  },
};

function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

// Arena Background - Epic battle arena with dynamic lighting
const ArenaBackground: React.FC<{ phase: Phase }> = ({ phase }) => {
  const frame = useCurrentFrame();
  const rotation = frame * 0.15;
  const isResult = phase === 'result' || phase === 'explanation';

  // Dynamic lighting based on phase
  const lightIntensity = isResult ? 0.4 + Math.sin(frame * 0.2) * 0.1 : 0.2;

  return (
    <>
      {/* Main gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #0A0A1A 0%, #1A1A3A 40%, #2A2A5A 100%)',
        }}
      />

      {/* Animated radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1200,
          height: 800,
          background: `radial-gradient(ellipse, rgba(100,100,255,${lightIntensity}) 0%, transparent 60%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* 3D Arena floor */}
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          left: '50%',
          transform: `translateX(-50%) perspective(800px) rotateX(70deg) rotate(${rotation}deg)`,
          width: 1600,
          height: 1600,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 50% 50%, rgba(80,80,180,0.3) 0%, transparent 50%),
            repeating-conic-gradient(from 0deg, rgba(100,100,200,0.1) 0deg 10deg, transparent 10deg 20deg)
          `,
          border: '3px solid rgba(100,100,255,0.4)',
          boxShadow: '0 0 100px rgba(100,100,255,0.3), inset 0 0 100px rgba(100,100,255,0.2)',
        }}
      />

      {/* Grid lines on floor */}
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          left: '50%',
          transform: `translateX(-50%) perspective(800px) rotateX(70deg)`,
          width: 1600,
          height: 1600,
          background: `
            linear-gradient(0deg, transparent 49%, rgba(100,100,255,0.15) 50%, transparent 51%),
            linear-gradient(90deg, transparent 49%, rgba(100,100,255,0.15) 50%, transparent 51%)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Side spotlights */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '100%',
          background: `linear-gradient(90deg, rgba(255,150,0,${lightIntensity * 0.3}) 0%, transparent 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '40%',
          height: '100%',
          background: `linear-gradient(-90deg, rgba(88,86,214,${lightIntensity * 0.3}) 0%, transparent 100%)`,
        }}
      />
    </>
  );
};

// Question Display with random effects (Cyberpunk Typewriter or Slam Down Impact)
const QuestionDisplay: React.FC<{ situation: string; roundNumber?: number }> = ({
  situation,
  roundNumber = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use roundNumber to determine effect type (deterministic based on round)
  const effectType = roundNumber % 2 === 0 ? 'typewriter' : 'slamdown';

  const chars = situation.split('');

  if (effectType === 'typewriter') {
    // Effect 1: Cyberpunk Typewriter with custom easing
    // 0~60%: 서서히 가속, 60~100%: 부드럽게 마무리
    const totalDuration = fps * 1.2; // 1.2초 동안 타이핑
    const linearProgress = Math.min(frame / totalDuration, 1);

    let easedProgress: number;
    if (linearProgress < 0.6) {
      // 서서히 가속
      const t = linearProgress / 0.6;
      easedProgress = 0.6 * (t * t);
    } else {
      // 부드럽게 마무리
      const t = (linearProgress - 0.6) / 0.4;
      easedProgress = 0.6 + 0.4 * (1 - (1 - t) * (1 - t));
    }

    const visibleChars = Math.min(Math.floor(easedProgress * chars.length), chars.length);
    const cursorVisible = frame % 10 < 5 && visibleChars < chars.length;

    return (
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            fontFamily: 'Pretendard, sans-serif',
            textAlign: 'center',
            letterSpacing: 2,
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {chars.slice(0, visibleChars).map((char, i) => {
            // 각 글자가 나타난 후 경과 프레임 계산
            const charAppearFrame = (i / chars.length) * fps * 1.2;
            const charAge = Math.max(0, frame - charAppearFrame);
            const glitchOffset = charAge < 3 ? (Math.random() - 0.5) * 4 : 0;
            const neonPulse = 0.8 + Math.sin(frame * 0.3 + i * 0.5) * 0.2;

            return (
              <span
                key={i}
                style={{
                  color: '#FFFFFF',
                  textShadow: `
                    0 0 10px rgba(0, 255, 255, ${neonPulse}),
                    0 0 20px rgba(255, 0, 255, ${neonPulse * 0.7}),
                    0 0 40px rgba(0, 255, 255, ${neonPulse * 0.5}),
                    0 4px 30px rgba(0,0,0,0.9)
                  `,
                  transform: `translateY(${glitchOffset}px)`,
                  display: 'inline-block',
                }}
              >
                {char}
              </span>
            );
          })}
          {cursorVisible && (
            <span
              style={{
                color: '#00FFFF',
                textShadow: '0 0 20px #00FFFF, 0 0 40px #FF00FF',
                marginLeft: 4,
              }}
            >
              |
            </span>
          )}
        </div>
      </div>
    );
  } else {
    // Effect 2: Slam Down Impact with custom easing
    // 0~60%: 서서히 가속 (ease-in quadratic)
    // 60~100%: 부드럽게 착지 (ease-out)
    const slamDuration = 20; // frames
    const linearProgress = Math.min(frame / slamDuration, 1);

    let progress: number;
    if (linearProgress < 0.6) {
      // 0~60%: 서서히 가속 (quadratic ease-in)
      const t = linearProgress / 0.6;
      progress = 0.6 * (t * t);
    } else {
      // 60~100%: 부드럽게 착지 (quadratic ease-out)
      const t = (linearProgress - 0.6) / 0.4;
      progress = 0.6 + 0.4 * (1 - (1 - t) * (1 - t));
    }

    const y = interpolate(progress, [0, 0.7, 0.85, 1], [-300, 20, -10, 0], {
      extrapolateRight: 'clamp',
    });

    const scale = interpolate(progress, [0, 0.7, 0.85, 1], [1.5, 1.1, 0.95, 1], {
      extrapolateRight: 'clamp',
    });

    const shake =
      progress > 0.65 && progress < 0.9 ? Math.sin(frame * 50) * (1 - progress) * 15 : 0;

    const impactOpacity = interpolate(progress, [0.65, 0.75, 1], [0, 1, 0], {
      extrapolateRight: 'clamp',
    });

    return (
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: '50%',
          transform: `translateX(-50%)`,
          zIndex: 20,
        }}
      >
        {/* Impact flash */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 800,
            height: 200,
            background: 'radial-gradient(ellipse, rgba(255,200,0,0.8) 0%, transparent 70%)',
            filter: 'blur(30px)',
            opacity: impactOpacity,
          }}
        />

        {/* Dust particles */}
        {progress > 0.65 &&
          Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI;
            const distance = (progress - 0.65) * 300;
            const px = Math.cos(angle) * distance;
            const py = Math.abs(Math.sin(angle)) * distance * 0.3;
            const dustOpacity = Math.max(0, 1 - (progress - 0.65) * 3);

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${px}px)`,
                  top: `calc(50% + ${py}px)`,
                  width: 8 + (i % 4) * 4,
                  height: 8 + (i % 4) * 4,
                  borderRadius: '50%',
                  background: 'rgba(200, 180, 150, 0.8)',
                  filter: 'blur(2px)',
                  opacity: dustOpacity,
                }}
              />
            );
          })}

        {/* Main text */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, sans-serif',
            textAlign: 'center',
            textShadow: `
              0 4px 30px rgba(0,0,0,0.9),
              0 0 ${20 + impactOpacity * 30}px rgba(255,200,0,${impactOpacity * 0.8})
            `,
            letterSpacing: 2,
            transform: `translateY(${y}px) translateX(${shake}px) scale(${scale})`,
          }}
        >
          {situation}
        </div>
      </div>
    );
  }
};

// VS Lightning
const VSLightning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 150 } });
  const glowPulse = 0.8 + Math.sin(frame * 0.3) * 0.2;
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        zIndex: 25,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 120,
          height: 120,
          background: `radial-gradient(circle, rgba(255,215,0,${glowPulse * 0.5}) 0%, transparent 70%)`,
          filter: 'blur(15px)',
        }}
      />
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          fontFamily: 'Impact, sans-serif',
          background: 'linear-gradient(180deg, #FFD700 0%, #FF8C00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 0 20px #FFD700)`,
        }}
      >
        VS
      </div>
    </div>
  );
};

// Explosion Particles for Wrong Answer - Enhanced with dramatic effects
const ExplosionParticles: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const frame = useCurrentFrame();

  // Main explosion particles (glass shards)
  const glassShards = Array.from({ length: 15 }, (_, i) => {
    const angle = (i / 15) * Math.PI * 2;
    const speed = 4 + (i % 3) * 2;
    const size = 8 + (i % 4) * 4;
    const delay = (i % 3) * 2;
    const progress = Math.max(0, frame - delay) / 25;
    const x = Math.cos(angle) * speed * progress * 50;
    const y = Math.sin(angle) * speed * progress * 40 + progress * progress * 80;
    const opacity = Math.max(0, 1 - progress);
    const rotation = frame * (15 + (i % 5) * 10);
    return { x, y, size, opacity, rotation };
  });

  // Fire/spark particles
  const fireParticles = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2 + i * 0.1;
    const speed = 2 + (i % 5) * 1.5;
    const delay = (i % 5) * 1.5;
    const progress = Math.max(0, frame - delay) / 30;
    const x = Math.cos(angle) * speed * progress * 60;
    const y = Math.sin(angle) * speed * progress * 50 - progress * 20;
    const opacity = Math.max(0, 1 - progress * 0.8);
    const size = 3 + (i % 4) * 2;
    const hue = 0 + (i % 3) * 15; // Red to orange
    return { x, y, size, opacity, hue };
  });

  // Ember particles (small glowing dots)
  const embers = Array.from({ length: 25 }, (_, i) => {
    const angle = (i / 25) * Math.PI * 2;
    const speed = 1.5 + (i % 4);
    const delay = (i % 4) * 3;
    const progress = Math.max(0, frame - delay) / 40;
    const wobble = Math.sin(frame * 0.3 + i) * 10;
    const x = Math.cos(angle) * speed * progress * 80 + wobble;
    const y = Math.sin(angle) * speed * progress * 60 - progress * 40;
    const opacity = Math.max(0, 1 - progress);
    const size = 2 + (i % 3);
    return { x, y, size, opacity };
  });

  // 1920px 화면 기준: 왼쪽 박스 중심 460px (160+300), 오른쪽 박스 중심 1460px (1160+300)
  const baseX = side === 'left' ? 460 : 1460;
  const baseY = 540;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* Central flash */}
      <div
        style={{
          position: 'absolute',
          left: baseX - 150,
          top: baseY - 150,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,100,0,0.9) 0%, rgba(255,50,0,0.5) 30%, transparent 70%)',
          filter: 'blur(20px)',
          opacity: Math.max(0, 1 - frame / 15),
          transform: `scale(${1 + frame * 0.1})`,
        }}
      />

      {/* Glass shards */}
      {glassShards.map((p, i) => (
        <div
          key={`glass-${i}`}
          style={{
            position: 'absolute',
            left: baseX + p.x,
            top: baseY + p.y,
            width: p.size,
            height: p.size * 0.6,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(180,200,220,0.6) 50%, rgba(100,120,140,0.3) 100%)',
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg) skewX(15deg)`,
            borderRadius: 2,
            boxShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 15px rgba(200,220,255,0.5)',
          }}
        />
      ))}

      {/* Fire particles */}
      {fireParticles.map((p, i) => (
        <div
          key={`fire-${i}`}
          style={{
            position: 'absolute',
            left: baseX + p.x,
            top: baseY + p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, hsl(${p.hue}, 100%, 60%) 0%, hsl(${p.hue + 15}, 100%, 50%) 100%)`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue}, 100%, 50%), 0 0 ${p.size * 6}px hsl(${p.hue}, 80%, 40%)`,
          }}
        />
      ))}

      {/* Embers */}
      {embers.map((p, i) => (
        <div
          key={`ember-${i}`}
          style={{
            position: 'absolute',
            left: baseX + p.x,
            top: baseY + p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#FF6600',
            opacity: p.opacity * (0.5 + Math.sin(frame * 0.5 + i) * 0.5),
            boxShadow: '0 0 6px #FF4400, 0 0 12px #FF2200',
          }}
        />
      ))}

      {/* Smoke clouds */}
      {[0, 1, 2].map((i) => {
        const delay = i * 5;
        const progress = Math.max(0, frame - delay) / 50;
        return (
          <div
            key={`smoke-${i}`}
            style={{
              position: 'absolute',
              left: baseX - 100 + (i - 1) * 40,
              top: baseY - 80 - progress * 60,
              width: 180 + i * 20,
              height: 180 + i * 20,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(80,80,80,${0.5 - i * 0.1}) 0%, transparent 70%)`,
              filter: 'blur(25px)',
              opacity: Math.max(0, 0.8 - progress),
              transform: `scale(${1 + progress * 2})`,
            }}
          />
        );
      })}

      {/* Red glow overlay on the losing side */}
      <div
        style={{
          position: 'absolute',
          left: side === 'left' ? 0 : 960,
          top: 150,
          width: 960,
          height: 780,
          background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.3) 0%, transparent 60%)',
          filter: 'blur(30px)',
          opacity: Math.max(0, 0.8 - frame / 40),
        }}
      />
    </div>
  );
};

// Sparkle/Firework Particles for Correct Answer - Enhanced with celebrations
const SparkleParticles: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const frame = useCurrentFrame();

  // Main sparkles (bigger, more prominent)
  const sparkles = Array.from({ length: 35 }, (_, i) => {
    const angle = (i / 35) * Math.PI * 2;
    const speed = 2.5 + (i % 4) * 1.5;
    const delay = (i % 5) * 2;
    const progress = Math.max(0, frame - delay) / 30;
    const x = Math.cos(angle) * speed * progress * 70;
    const y = Math.sin(angle) * speed * progress * 60 - progress * 40;
    const opacity = Math.max(0, 1 - progress * 0.7);
    const size = 4 + (i % 4) * 3;
    const hue = 120 + (i % 4) * 20; // Green to cyan
    return { x, y, size, opacity, hue };
  });

  // Firework trails (upward shooting)
  const fireworkTrails = Array.from({ length: 8 }, (_, i) => {
    const baseAngle = -Math.PI / 2 + ((i - 4) / 8) * Math.PI * 0.6;
    const speed = 4 + (i % 3);
    const delay = i * 3;
    const progress = Math.max(0, frame - delay) / 35;
    const x = Math.cos(baseAngle) * speed * progress * 80;
    const y = Math.sin(baseAngle) * speed * progress * 100;
    const opacity = Math.max(0, 1 - progress);
    return { x, y, opacity, trailLength: 6 };
  });

  // Star bursts
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const delay = 5 + (i % 3) * 3;
    const progress = Math.max(0, frame - delay) / 20;
    const distance = 40 + progress * 80;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 20;
    const opacity = progress < 0.5 ? progress * 2 : Math.max(0, 2 - progress * 2);
    const size = 8 + (i % 3) * 4;
    return { x, y, opacity, size };
  });

  // Lightning bolts (electric effect)
  const lightningPaths = [
    {
      points: [
        [0, -50],
        [20, -80],
        [-10, -120],
        [30, -160],
        [10, -200],
      ],
      delay: 0,
    },
    {
      points: [
        [0, -40],
        [-25, -70],
        [15, -110],
        [-20, -150],
        [0, -180],
      ],
      delay: 5,
    },
    {
      points: [
        [0, -45],
        [30, -85],
        [0, -125],
        [25, -165],
      ],
      delay: 10,
    },
  ];

  // 1920px 화면 기준: 왼쪽 박스 중심 460px (160+300), 오른쪽 박스 중심 1460px (1160+300)
  const baseX = side === 'left' ? 460 : 1460;
  const baseY = 540;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* Central victory flash */}
      <div
        style={{
          position: 'absolute',
          left: baseX - 180,
          top: baseY - 180,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,255,136,0.8) 0%, rgba(0,200,100,0.4) 30%, transparent 70%)',
          filter: 'blur(25px)',
          opacity: Math.max(0, 1 - frame / 12),
          transform: `scale(${1 + frame * 0.08})`,
        }}
      />

      {/* Lightning bolts */}
      {lightningPaths.map((lightning, lightningIdx) => {
        const lightningProgress = Math.max(0, frame - lightning.delay) / 15;
        if (lightningProgress <= 0 || lightningProgress > 1.5) return null;
        const opacity = lightningProgress < 0.5 ? 1 : Math.max(0, 2 - lightningProgress * 2);

        return (
          <svg
            key={`lightning-${lightningIdx}`}
            style={{
              position: 'absolute',
              left: baseX - 50,
              top: baseY - 50,
              width: 100,
              height: 250,
              pointerEvents: 'none',
            }}
          >
            <path
              d={`M ${lightning.points.map((p) => `${50 + p[0]} ${50 + p[1]}`).join(' L ')}`}
              stroke={`rgba(0, 255, 180, ${opacity})`}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
            <path
              d={`M ${lightning.points.map((p) => `${50 + p[0]} ${50 + p[1]}`).join(' L ')}`}
              stroke={`rgba(200, 255, 230, ${opacity})`}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        );
      })}

      {/* Firework trails */}
      {fireworkTrails.map((fw, i) => (
        <React.Fragment key={`firework-${i}`}>
          {/* Trail head */}
          <div
            style={{
              position: 'absolute',
              left: baseX + fw.x - 6,
              top: baseY + fw.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFFFFF 0%, #00FF88 50%, #00CC66 100%)',
              opacity: fw.opacity,
              boxShadow: '0 0 15px #00FF88, 0 0 30px #00CC66',
            }}
          />
          {/* Trail particles */}
          {Array.from({ length: fw.trailLength }, (_, j) => {
            const trailProgress = Math.max(0, 1 - j / fw.trailLength);
            return (
              <div
                key={`trail-${j}`}
                style={{
                  position: 'absolute',
                  left: baseX + fw.x * trailProgress - 3,
                  top: baseY + fw.y * trailProgress - 3,
                  width: 6 - j,
                  height: 6 - j,
                  borderRadius: '50%',
                  background: '#00FF88',
                  opacity: fw.opacity * (1 - j / fw.trailLength) * 0.7,
                  boxShadow: '0 0 8px #00FF88',
                }}
              />
            );
          })}
        </React.Fragment>
      ))}

      {/* Main sparkles */}
      {sparkles.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          style={{
            position: 'absolute',
            left: baseX + s.x,
            top: baseY + s.y,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, #FFFFFF 0%, hsl(${s.hue}, 100%, 60%) 50%, hsl(${s.hue}, 100%, 40%) 100%)`,
            opacity: s.opacity,
            boxShadow: `0 0 ${s.size * 2}px hsl(${s.hue}, 100%, 50%), 0 0 ${s.size * 4}px hsl(${s.hue}, 80%, 40%)`,
          }}
        />
      ))}

      {/* Star bursts (4-pointed stars) */}
      {stars.map((star, i) => (
        <div
          key={`star-${i}`}
          style={{
            position: 'absolute',
            left: baseX + star.x - star.size / 2,
            top: baseY + star.y - star.size / 2,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '20%',
              top: '40%',
              background: 'linear-gradient(90deg, transparent 0%, #00FF88 50%, transparent 100%)',
              boxShadow: '0 0 10px #00FF88',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '20%',
              height: '100%',
              left: '40%',
              background: 'linear-gradient(180deg, transparent 0%, #00FF88 50%, transparent 100%)',
              boxShadow: '0 0 10px #00FF88',
            }}
          />
        </div>
      ))}

      {/* Winner side green glow overlay */}
      <div
        style={{
          position: 'absolute',
          left: side === 'left' ? 0 : 960,
          top: 150,
          width: 960,
          height: 780,
          background:
            'radial-gradient(ellipse at center, rgba(0,255,136,0.25) 0%, transparent 60%)',
          filter: 'blur(30px)',
          opacity: 0.7 + Math.sin(frame * 0.2) * 0.3,
        }}
      />
    </div>
  );
};

// Damage Number Display
const DamageNumber: React.FC<{ damage: number; side: 'left' | 'right' }> = ({ damage, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 8, stiffness: 200 } });
  const y = interpolate(frame, [0, 30], [0, -40], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [20, 40], [1, 0], { extrapolateRight: 'clamp' });

  // 1920px 화면 기준: 왼쪽 박스 중심 460px, 오른쪽 박스 중심 1460px
  const xPos = side === 'left' ? 460 : 1460;

  return (
    <div
      style={{
        position: 'absolute',
        top: `calc(50% - 100px + ${y}px)`,
        left: xPos,
        fontSize: 72,
        fontWeight: 900,
        fontFamily: 'Impact, sans-serif',
        color: '#FF3B30',
        textShadow: '0 0 20px #FF0000, 0 4px 10px rgba(0,0,0,0.8), 2px 2px 0 #AA0000',
        transform: `scale(${scale})`,
        opacity,
        zIndex: 60,
      }}
    >
      -{damage}
    </div>
  );
};

// Answer Box Component with Real Character Images
const AnswerBox: React.FC<{
  character: SurvivalCharacter;
  side: 'left' | 'right';
  phase: 'empty' | 'answer' | 'thinking' | 'result';
  answerText: string;
  isWinner: boolean;
  isLoser: boolean;
  isSpeaking: boolean;
}> = ({ character, side, phase, answerText, isWinner, isLoser, isSpeaking }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = COLORS[character];

  const entranceScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const shakeX = isLoser && phase === 'result' ? Math.sin(frame * 4) * 12 : 0;
  const shakeY = isLoser && phase === 'result' ? Math.cos(frame * 5) * 6 : 0;

  // Speaking animations
  const speakingScale = isSpeaking ? 1.03 + Math.sin(frame * 0.4) * 0.02 : 1;
  const speakingGlow = isSpeaking ? 0.7 + Math.sin(frame * 0.5) * 0.3 : 0.3;
  const speakingBorderWidth = isSpeaking ? 6 : 4;

  // Character bounce animation - enhanced when speaking
  const characterBounce = isSpeaking
    ? Math.sin(frame * 0.25) * 8
    : phase === 'thinking'
      ? Math.sin(frame * 0.15) * 5
      : isWinner && phase === 'result'
        ? Math.abs(Math.sin(frame * 0.3)) * 15
        : 0;

  const getBorderColor = () => {
    if (phase === 'result') return isWinner ? COLORS.correct.primary : COLORS.wrong.primary;
    // Brighter border when speaking
    if (isSpeaking) return character === 'cat' ? '#FFB347' : '#7B68EE';
    return colors.primary;
  };

  const getBackgroundColor = () => {
    if (phase === 'result' && isWinner) return 'rgba(0, 255, 136, 0.2)';
    if (phase === 'result' && isLoser) return 'rgba(255, 59, 48, 0.3)';
    // Slightly brighter when speaking
    if (isSpeaking) return `${colors.primary}35`;
    return `${colors.primary}20`;
  };

  // Get character image based on state
  const getCharacterImage = () => {
    // Result phase: winner/loser images
    if (phase === 'result') {
      if (isWinner) return CHARACTER_IMAGES[character].winner;
      if (isLoser) return CHARACTER_IMAGES[character].loser;
    }
    // Speaking state: use speaking image
    if (isSpeaking) return CHARACTER_IMAGES[character].speaking;
    // Thinking phase: use thinking image
    if (phase === 'thinking') return CHARACTER_IMAGES[character].thinking;
    // Default: neutral
    return CHARACTER_IMAGES[character].normal;
  };

  // 화면 너비 1920px 기준, 박스 너비 600px
  // 화면 중앙 960px, VS에서 200px 간격
  // 왼쪽(고양이): 960 - 200 - 600 = 160px
  // 오른쪽(개): 960 + 200 = 1160px
  const boxX = side === 'left' ? 160 : 1160;

  // Glow effect intensity - enhanced when speaking
  const glowIntensity =
    phase === 'result'
      ? isWinner
        ? 0.6 + Math.sin(frame * 0.2) * 0.2
        : 0.3
      : isSpeaking
        ? speakingGlow
        : 0.3;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: boxX,
        transform: `translateX(${shakeX}px) translateY(calc(-50% + ${shakeY}px)) scale(${entranceScale * speakingScale})`,
        width: 600,
        height: 320,
        zIndex: isSpeaking ? 20 : 15,
      }}
    >
      {/* Glow behind box */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          left: -30,
          right: -30,
          bottom: -30,
          borderRadius: 40,
          background: `radial-gradient(ellipse, ${isWinner ? COLORS.correct.glow : isLoser ? COLORS.wrong.glow : colors.glow}${Math.round(
            glowIntensity * 100
          )
            .toString(16)
            .padStart(2, '0')} 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* Speaking indicator - pulsing ring */}
      {isSpeaking && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            borderRadius: 34,
            border: `3px solid ${colors.primary}`,
            opacity: 0.5 + Math.sin(frame * 0.4) * 0.5,
            boxShadow: `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`,
          }}
        />
      )}

      {/* Main box */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: getBackgroundColor(),
          border: `${speakingBorderWidth}px solid ${getBorderColor()}`,
          borderRadius: 24,
          boxShadow: isSpeaking
            ? `
              0 0 60px ${colors.glow}90,
              0 0 100px ${colors.glow}50,
              inset 0 0 80px rgba(0,0,0,0.3),
              0 10px 40px rgba(0,0,0,0.5)
            `
            : `
              0 0 40px ${isWinner ? COLORS.correct.glow : isLoser ? COLORS.wrong.glow : colors.glow}60,
              inset 0 0 80px rgba(0,0,0,0.4),
              0 10px 40px rgba(0,0,0,0.5)
            `,
          overflow: 'visible',
        }}
      >
        {/* Crack overlay for loser - more dramatic */}
        {isLoser && phase === 'result' && (
          <>
            <svg
              style={{ position: 'absolute', inset: -30, pointerEvents: 'none', zIndex: 10 }}
              viewBox="0 0 480 400"
            >
              {/* Main cracks */}
              <path
                d="M0 80 L60 100 L40 150 L90 180 L50 220 L80 260"
                stroke="#FF3B30"
                strokeWidth="5"
                fill="none"
                opacity="0.9"
                strokeLinecap="round"
              />
              <path
                d="M480 100 L420 120 L450 170 L400 200 L440 250"
                stroke="#FF3B30"
                strokeWidth="5"
                fill="none"
                opacity="0.9"
                strokeLinecap="round"
              />
              <path
                d="M80 400 L110 340 L70 290 L120 250"
                stroke="#FF3B30"
                strokeWidth="4"
                fill="none"
                opacity="0.8"
                strokeLinecap="round"
              />
              <path
                d="M400 400 L370 350 L410 300 L360 260"
                stroke="#FF3B30"
                strokeWidth="4"
                fill="none"
                opacity="0.8"
                strokeLinecap="round"
              />
              {/* Corner cracks */}
              <path
                d="M0 0 L70 60 L40 100"
                stroke="#FF3B30"
                strokeWidth="6"
                fill="none"
                opacity="1"
                strokeLinecap="round"
              />
              <path
                d="M480 0 L410 60 L440 100"
                stroke="#FF3B30"
                strokeWidth="6"
                fill="none"
                opacity="1"
                strokeLinecap="round"
              />
              {/* Additional detail cracks */}
              <path
                d="M60 100 L80 130"
                stroke="#FF3B30"
                strokeWidth="3"
                fill="none"
                opacity="0.7"
              />
              <path
                d="M420 120 L400 150"
                stroke="#FF3B30"
                strokeWidth="3"
                fill="none"
                opacity="0.7"
              />
            </svg>
            {/* Red overlay flash */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 24,
                background: 'rgba(255,0,0,0.15)',
                opacity: 0.5 + Math.sin(frame * 0.3) * 0.3,
              }}
            />
          </>
        )}

        {/* Character Image */}
        <div
          style={{
            position: 'absolute',
            top: -70 + characterBounce,
            left: '50%',
            transform: `translateX(-50%) ${isLoser && phase === 'result' ? 'rotate(-10deg)' : ''} ${isSpeaking ? `scale(${1.05 + Math.sin(frame * 0.3) * 0.03})` : ''}`,
            width: 140,
            height: 140,
            filter: `drop-shadow(0 10px 25px rgba(0,0,0,0.7))`,
            transition: 'transform 0.2s',
          }}
        >
          <Img
            src={staticFile(getCharacterImage())}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: isLoser && phase === 'result' ? 'grayscale(30%) brightness(0.8)' : 'none',
            }}
          />
          {/* Speaking glow effect */}
          {isSpeaking && (
            <div
              style={{
                position: 'absolute',
                top: -25,
                left: -25,
                right: -25,
                bottom: -25,
                background: `radial-gradient(circle, ${colors.glow}${Math.round(
                  (0.4 + Math.sin(frame * 0.4) * 0.3) * 255
                )
                  .toString(16)
                  .padStart(2, '0')} 0%, transparent 60%)`,
                filter: 'blur(15px)',
              }}
            />
          )}
          {/* Winner sparkle effect */}
          {isWinner && phase === 'result' && (
            <div
              style={{
                position: 'absolute',
                top: -20,
                left: -20,
                right: -20,
                bottom: -20,
                background: `radial-gradient(circle, rgba(0,255,136,${0.3 + Math.sin(frame * 0.3) * 0.2}) 0%, transparent 60%)`,
                filter: 'blur(10px)',
              }}
            />
          )}
        </div>

        {/* Content - 캐릭터 이미지 영역(70px) 아래부터 시작 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          {phase === 'empty' ? (
            // Empty state during situation/question phase - show waiting indicator
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: colors.primary,
                opacity: 0.4,
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              ...
            </div>
          ) : phase === 'thinking' ? (
            // Thinking state - show ? after answers are given
            <>
              <div
                style={{
                  fontSize: 90,
                  fontWeight: 900,
                  color: colors.primary,
                  textShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}`,
                }}
              >
                ?
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#AAA',
                  fontFamily: 'Pretendard, sans-serif',
                  marginTop: 10,
                  letterSpacing: 3,
                }}
              >
                THINKING...
              </div>
            </>
          ) : (
            // Answer and Result phases - show the answer text
            <>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: 'Pretendard, sans-serif',
                  textAlign: 'center',
                  textShadow: '0 4px 20px rgba(0,0,0,0.9)',
                  lineHeight: 1.4,
                  maxWidth: '90%',
                }}
              >
                {answerText}
              </div>
              {phase === 'result' && (
                <div
                  style={{
                    fontSize: 72,
                    marginTop: 15,
                    filter: `drop-shadow(0 0 20px ${isWinner ? '#00FF88' : '#FF3B30'})`,
                  }}
                >
                  {isWinner ? '✅' : '❌'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
type Phase = 'situation' | 'answer' | 'thinking' | 'result' | 'explanation';

export const SurvivalRoundView: React.FC<SurvivalRoundViewProps> = ({
  round,
  roundNumber,
  totalRounds,
  catHP,
  dogHP,
  previousCatHP,
  previousDogHP,
  catWins = 0,
  dogWins = 0,
  audioFiles,
  timingConfig = DEFAULT_SURVIVAL_TIMING,
  fps = DEFAULT_FPS,
}) => {
  const frame = useCurrentFrame();

  const situationFrames = secondsToFrames(timingConfig.situationDuration, fps);
  const answerFrames = secondsToFrames(
    timingConfig.dogAnswerDuration + timingConfig.catAnswerDuration,
    fps
  );
  const thinkingFrames = secondsToFrames(1, fps); // 1초간 thinking
  const resultFrames = secondsToFrames(timingConfig.floorDropDuration, fps);
  const explanationFrames = secondsToFrames(timingConfig.explanationDuration, fps);

  const answerStart = situationFrames;
  const thinkingStart = answerStart + answerFrames;
  const resultStart = thinkingStart + thinkingFrames;
  const explanationStart = resultStart + resultFrames;

  const getCurrentPhase = (): Phase => {
    if (frame < answerStart) return 'situation';
    if (frame < thinkingStart) return 'answer';
    if (frame < resultStart) return 'thinking';
    if (frame < explanationStart) return 'result';
    return 'explanation';
  };

  const currentPhase = getCurrentPhase();
  const loser: SurvivalCharacter = round.winner === 'cat' ? 'dog' : 'cat';
  const displayCatHP =
    currentPhase === 'result' || currentPhase === 'explanation' ? catHP : previousCatHP;
  const displayDogHP =
    currentPhase === 'result' || currentPhase === 'explanation' ? dogHP : previousDogHP;

  const catAnswer =
    round.konglishAnswer.character === 'cat' ? round.konglishAnswer.text : round.nativeAnswer.text;
  const dogAnswer =
    round.konglishAnswer.character === 'dog' ? round.konglishAnswer.text : round.nativeAnswer.text;

  // Box phase: situation에서는 빈 박스, answer에서는 답변 표시, thinking에서는 ?, result에서는 결과
  const getBoxPhase = (): 'empty' | 'answer' | 'thinking' | 'result' => {
    if (currentPhase === 'situation') return 'empty';
    if (currentPhase === 'answer') return 'answer';
    if (currentPhase === 'thinking') return 'thinking';
    return 'result';
  };

  const boxPhase = getBoxPhase();
  const damage = Math.round(previousCatHP - catHP) || Math.round(previousDogHP - dogHP) || 20;

  // Speaking state: cat (left) speaks first, then dog (right)
  const catAnswerFrames = secondsToFrames(timingConfig.catAnswerDuration, fps);
  const dogAnswerStart = answerStart + catAnswerFrames;
  const isCatSpeaking = frame >= answerStart && frame < dogAnswerStart;
  const isDogSpeaking = frame >= dogAnswerStart && frame < thinkingStart;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A1628', overflow: 'hidden' }}>
      <ArenaBackground phase={currentPhase} />

      <TekkenHPBar
        catHP={displayCatHP}
        dogHP={displayDogHP}
        previousCatHP={previousCatHP}
        previousDogHP={previousDogHP}
        currentRound={roundNumber}
        totalRounds={totalRounds}
        catWins={catWins}
        dogWins={dogWins}
      />

      <QuestionDisplay situation={round.situation} roundNumber={roundNumber} />
      <VSLightning />

      <AnswerBox
        character="cat"
        side="left"
        phase={boxPhase}
        answerText={catAnswer}
        isWinner={round.winner === 'cat'}
        isLoser={loser === 'cat'}
        isSpeaking={isCatSpeaking}
      />
      <AnswerBox
        character="dog"
        side="right"
        phase={boxPhase}
        answerText={dogAnswer}
        isWinner={round.winner === 'dog'}
        isLoser={loser === 'dog'}
        isSpeaking={isDogSpeaking}
      />

      {/* Particles */}
      {(currentPhase === 'result' || currentPhase === 'explanation') && (
        <>
          <Sequence from={resultStart - frame}>
            {loser === 'cat' ? (
              <ExplosionParticles side="left" />
            ) : (
              <ExplosionParticles side="right" />
            )}
            {round.winner === 'cat' ? (
              <SparkleParticles side="left" />
            ) : (
              <SparkleParticles side="right" />
            )}
            <DamageNumber damage={damage} side={loser === 'cat' ? 'left' : 'right'} />
          </Sequence>
        </>
      )}

      {/* Audio */}
      {audioFiles?.situation && (
        <Sequence from={0} durationInFrames={situationFrames}>
          <Audio src={audioFiles.situation} />
        </Sequence>
      )}
      {audioFiles?.catAnswer && (
        <Sequence
          from={answerStart}
          durationInFrames={secondsToFrames(timingConfig.catAnswerDuration, fps)}
        >
          <Audio src={audioFiles.catAnswer} />
        </Sequence>
      )}
      {audioFiles?.dogAnswer && (
        <Sequence
          from={answerStart + secondsToFrames(timingConfig.catAnswerDuration, fps)}
          durationInFrames={secondsToFrames(timingConfig.dogAnswerDuration, fps)}
        >
          <Audio src={audioFiles.dogAnswer} />
        </Sequence>
      )}
      {audioFiles?.explanation && (
        <Sequence from={explanationStart} durationInFrames={explanationFrames}>
          <Audio src={audioFiles.explanation} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export default SurvivalRoundView;
