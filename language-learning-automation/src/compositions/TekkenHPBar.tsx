/**
 * TekkenHPBar Component - Tekken 8 Style HP Gauge
 *
 * High-quality fighting game style HP bar positioned at top
 * Features:
 * - Angled/slanted bar design
 * - Character portraits with real images
 * - Glowing effects and gradients
 * - Damage animation with red flash
 * - Round counter in center
 * - Extended width bars (700px each)
 *
 * Inspired by Tekken 8's UI design
 */

import React from 'react';
import { useCurrentFrame, interpolate, staticFile, Img } from 'remotion';
import { SurvivalCharacter, CHARACTER_INFO } from '../survival/types';

// =============================================================================
// Types
// =============================================================================

export interface TekkenHPBarProps {
  /** Cat's current HP (0-100) */
  catHP: number;
  /** Dog's current HP (0-100) */
  dogHP: number;
  /** Cat's previous HP for damage animation */
  previousCatHP?: number;
  /** Dog's previous HP for damage animation */
  previousDogHP?: number;
  /** Current round number */
  currentRound: number;
  /** Total rounds */
  totalRounds: number;
  /** Cat's win count */
  catWins?: number;
  /** Dog's win count */
  dogWins?: number;
}

// =============================================================================
// Constants
// =============================================================================

const BAR_WIDTH = 700;
const BAR_HEIGHT = 36;
const PORTRAIT_SIZE = 85;

// Character image paths (in public folder)
const CHARACTER_IMAGES = {
  cat: 'characters/cat.png',
  dog: 'characters/dog.png',
};

// Colors
const COLORS = {
  cat: {
    primary: '#FF9500',
    secondary: '#FFB84D',
    glow: '#FF6B00',
    dark: '#CC7700',
  },
  dog: {
    primary: '#5856D6',
    secondary: '#7A78E8',
    glow: '#4240B0',
    dark: '#3D3BA8',
  },
  hp: {
    full: '#00FF88',
    high: '#88FF00',
    medium: '#FFDD00',
    low: '#FF6600',
    critical: '#FF0044',
    empty: '#333333',
    damage: '#FF0000',
  },
  ui: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    dark: '#1A1A2E',
    border: '#4A4A6A',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function getHPColor(hp: number): string {
  if (hp > 70) return COLORS.hp.full;
  if (hp > 50) return COLORS.hp.high;
  if (hp > 30) return COLORS.hp.medium;
  if (hp > 15) return COLORS.hp.low;
  return COLORS.hp.critical;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Character Portrait - Circular portrait with real character image
 */
const CharacterPortrait: React.FC<{
  character: SurvivalCharacter;
  side: 'left' | 'right';
  hp: number;
}> = ({ character, side, hp }) => {
  const frame = useCurrentFrame();
  const characterColors = COLORS[character];

  // Pulse effect when low HP
  const isLowHP = hp < 30;
  const pulseIntensity = isLowHP ? 0.5 + Math.sin(frame * 0.3) * 0.5 : 1;

  // Glow intensity based on HP
  const glowSize = isLowHP ? 15 + Math.sin(frame * 0.4) * 5 : 10;

  return (
    <div
      style={{
        position: 'relative',
        width: PORTRAIT_SIZE,
        height: PORTRAIT_SIZE,
      }}
    >
      {/* Outer glow ring */}
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
          borderRadius: '50%',
          background: `conic-gradient(from ${side === 'left' ? 0 : 180}deg, ${characterColors.primary}, ${characterColors.glow}, ${characterColors.primary})`,
          opacity: pulseIntensity,
          filter: `blur(${glowSize}px)`,
        }}
      />

      {/* Portrait background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${characterColors.secondary} 0%, ${characterColors.dark} 100%)`,
          border: `3px solid ${characterColors.primary}`,
          boxShadow: `
            0 0 ${glowSize}px ${characterColors.glow},
            inset 0 -20px 30px rgba(0,0,0,0.4)
          `,
          overflow: 'hidden',
        }}
      >
        {/* Character image */}
        <Img
          src={staticFile(CHARACTER_IMAGES[character])}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.2)',
          }}
        />
      </div>

      {/* HP critical warning */}
      {isLowHP && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: COLORS.hp.critical,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 900,
            color: '#FFFFFF',
            boxShadow: `0 0 10px ${COLORS.hp.critical}`,
            opacity: pulseIntensity,
          }}
        >
          !
        </div>
      )}
    </div>
  );
};

/**
 * HP Gauge - Angled bar with gradient fill
 */
const HPGauge: React.FC<{
  character: SurvivalCharacter;
  hp: number;
  previousHP?: number;
  side: 'left' | 'right';
}> = ({ character: _character, hp, previousHP = hp, side }) => {
  const frame = useCurrentFrame();

  // Animate HP change
  const displayHP = interpolate(frame, [0, 15], [previousHP, hp], { extrapolateRight: 'clamp' });

  // Damage flash
  const showDamage = previousHP > hp;
  const damageWidth = ((previousHP - hp) / 100) * BAR_WIDTH;
  const damageOpacity = showDamage
    ? interpolate(frame, [0, 20], [1, 0], { extrapolateRight: 'clamp' })
    : 0;

  // HP bar width
  const hpWidth = (displayHP / 100) * BAR_WIDTH;
  const hpColor = getHPColor(displayHP);

  // Low HP pulse
  const isLowHP = hp < 30;
  const pulseOpacity = isLowHP ? 0.3 + Math.sin(frame * 0.4) * 0.2 : 0;

  // Skew direction based on side
  const skewAngle = side === 'left' ? -8 : 8;

  return (
    <div
      style={{
        position: 'relative',
        width: BAR_WIDTH,
        height: BAR_HEIGHT,
        transform: `skewX(${skewAngle}deg)`,
      }}
    >
      {/* Background track */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          [side]: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg, #2A2A3E 0%, #1A1A28 100%)`,
          border: `2px solid ${COLORS.ui.border}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Inner shadow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Damage indicator (red flash) */}
      {showDamage && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            [side]: side === 'left' ? hpWidth + 2 : undefined,
            [side === 'left' ? 'left' : 'right']: side === 'left' ? undefined : hpWidth + 2,
            width: damageWidth,
            height: BAR_HEIGHT - 4,
            background: COLORS.hp.damage,
            opacity: damageOpacity,
            borderRadius: 2,
          }}
        />
      )}

      {/* HP fill */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          [side]: 2,
          width: Math.max(0, hpWidth - 4),
          height: BAR_HEIGHT - 4,
          background: `linear-gradient(180deg, ${hpColor} 0%, ${hpColor}AA 50%, ${hpColor}66 100%)`,
          borderRadius: 2,
          boxShadow: `0 0 15px ${hpColor}66`,
          transition: 'background 0.3s ease',
        }}
      >
        {/* Shine effect */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
            borderRadius: '2px 2px 0 0',
          }}
        />
      </div>

      {/* Low HP pulse overlay */}
      {isLowHP && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: COLORS.hp.critical,
            opacity: pulseOpacity,
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* HP text */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          [side]: 15,
          transform: `translateY(-50%) skewX(${-skewAngle}deg)`,
          fontSize: 16,
          fontWeight: 900,
          color: '#FFFFFF',
          fontFamily: 'Impact, sans-serif',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          letterSpacing: 1,
        }}
      >
        {Math.round(displayHP)}
      </div>
    </div>
  );
};

/**
 * Round Counter - Center display with wins
 */
const RoundCounter: React.FC<{
  currentRound: number;
  totalRounds: number;
  catWins: number;
  dogWins: number;
}> = ({ currentRound, totalRounds, catWins, dogWins }) => {
  const frame = useCurrentFrame();

  // Pulse effect
  const pulse = 1 + Math.sin(frame * 0.1) * 0.02;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* Win indicators */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 30,
        }}
      >
        {/* Cat wins */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={`cat-${i}`}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: i < catWins ? COLORS.cat.primary : '#333',
                border: `2px solid ${COLORS.cat.primary}`,
                boxShadow: i < catWins ? `0 0 8px ${COLORS.cat.glow}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Round number */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `scale(${pulse})`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.ui.silver,
              fontFamily: 'Pretendard, sans-serif',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Round
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: COLORS.ui.gold,
              fontFamily: 'Impact, sans-serif',
              textShadow: `0 0 20px ${COLORS.ui.gold}66, 0 2px 4px rgba(0,0,0,0.8)`,
              lineHeight: 1,
            }}
          >
            {currentRound}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#888',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            / {totalRounds}
          </div>
        </div>

        {/* Dog wins */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={`dog-${i}`}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: i < dogWins ? COLORS.dog.primary : '#333',
                border: `2px solid ${COLORS.dog.primary}`,
                boxShadow: i < dogWins ? `0 0 8px ${COLORS.dog.glow}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Character Name Tag
 */
const NameTag: React.FC<{
  character: SurvivalCharacter;
  side: 'left' | 'right';
}> = ({ character, side }) => {
  const info = CHARACTER_INFO[character];
  const characterColors = COLORS[character];

  return (
    <div
      style={{
        position: 'absolute',
        [side]: PORTRAIT_SIZE + 20,
        bottom: -25,
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: characterColors.primary,
          fontFamily: 'Impact, Pretendard, sans-serif',
          letterSpacing: 2,
          textShadow: `0 0 10px ${characterColors.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
          textTransform: 'uppercase',
        }}
      >
        {info.nameKorean}
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * TekkenHPBar - Tekken 8 style HP gauge at top of screen
 */
export const TekkenHPBar: React.FC<TekkenHPBarProps> = ({
  catHP,
  dogHP,
  previousCatHP = catHP,
  previousDogHP = dogHP,
  currentRound,
  totalRounds,
  catWins = 0,
  dogWins = 0,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 25,
        background:
          'linear-gradient(0deg, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.95) 100%)',
      }}
    >
      {/* Main HP bar container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          position: 'relative',
        }}
      >
        {/* Cat side */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            position: 'relative',
          }}
        >
          <CharacterPortrait character="cat" side="left" hp={catHP} />
          <HPGauge character="cat" hp={catHP} previousHP={previousCatHP} side="left" />
          <NameTag character="cat" side="left" />
        </div>

        {/* Center round counter */}
        <RoundCounter
          currentRound={currentRound}
          totalRounds={totalRounds}
          catWins={catWins}
          dogWins={dogWins}
        />

        {/* Dog side */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            flexDirection: 'row-reverse',
            position: 'relative',
          }}
        >
          <CharacterPortrait character="dog" side="right" hp={dogHP} />
          <HPGauge character="dog" hp={dogHP} previousHP={previousDogHP} side="right" />
          <NameTag character="dog" side="right" />
        </div>
      </div>
    </div>
  );
};

export default TekkenHPBar;
