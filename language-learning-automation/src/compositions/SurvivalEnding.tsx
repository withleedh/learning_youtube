/**
 * SurvivalEnding Component
 *
 * Renders the ending sequence for survival quiz:
 * - Winner announcement with celebration
 * - Final HP bars
 * - Score display (Cat Xwin vs Dog Ywin)
 * - CTA question
 * - Subscribe reminder
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.6
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
// useVideoConfig is used in WinnerAnnouncement component
import { SurvivalCharacter, CHARACTER_INFO } from '../survival/types';
import { HPBar } from './HPBar';

// =============================================================================
// Types
// =============================================================================

export interface SurvivalEndingProps {
  /** Winner character */
  winner: SurvivalCharacter;
  /** Cat's final HP */
  catFinalHP: number;
  /** Dog's final HP */
  dogFinalHP: number;
  /** Cat's total wins */
  catWins: number;
  /** Dog's total wins */
  dogWins: number;
  /** CTA question text */
  ctaQuestion: string;
  /** Duration in frames */
  durationInFrames: number;
  /** Channel logo URL (optional) */
  channelLogo?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Winner Announcement - Shows the winner with celebration
 */
const WinnerAnnouncement: React.FC<{
  winner: SurvivalCharacter;
}> = ({ winner }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const winnerInfo = CHARACTER_INFO[winner];

  // Winner entrance animation
  const scale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 100 },
    from: 0,
    to: 1,
  });

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Celebration bounce
  const bounce = Math.sin(frame * 0.2) * 10;

  // Glow pulse
  const glowIntensity = 0.5 + Math.sin(frame * 0.15) * 0.3;

  // Confetti particles (simplified)
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* "WINNER!" text */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          color: '#FFD700',
          fontFamily: 'Impact, sans-serif',
          textShadow: `
            0 0 ${30 * glowIntensity}px #FFD700,
            0 0 ${60 * glowIntensity}px #FFD700,
            0 4px 20px rgba(0, 0, 0, 0.5)
          `,
          letterSpacing: 8,
        }}
      >
        🏆 WINNER! 🏆
      </div>

      {/* Winner character */}
      <div
        style={{
          fontSize: 150,
          transform: `translateY(${bounce}px)`,
          textShadow: `0 0 50px ${winnerInfo.color}`,
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
        }}
      >
        {winnerInfo.emoji}
      </div>

      {/* Winner name */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: winnerInfo.color,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: `0 0 20px ${winnerInfo.color}66, 0 4px 15px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {winnerInfo.nameKorean} 승리!
      </div>

      {/* Confetti effect (simplified) */}
      {confettiColors.map((color, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${20 + Math.sin(frame * 0.1 + i) * 10}%`,
            left: `${10 + i * 20}%`,
            width: 10,
            height: 10,
            backgroundColor: color,
            borderRadius: '50%',
            opacity: 0.8,
            transform: `rotate(${frame * 5 + i * 45}deg) translateY(${Math.sin(frame * 0.2 + i) * 20}px)`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Final Score Display - Shows final HP and win counts
 */
const FinalScoreDisplay: React.FC<{
  catFinalHP: number;
  dogFinalHP: number;
  catWins: number;
  dogWins: number;
}> = ({ catFinalHP, dogFinalHP, catWins, dogWins }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [40, 60], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        opacity,
        transform: `translateY(${y}px)`,
        marginTop: 40,
      }}
    >
      {/* HP Bars */}
      <div
        style={{
          display: 'flex',
          gap: 100,
          alignItems: 'center',
        }}
      >
        <HPBar character="cat" currentHP={catFinalHP} position="left" />
        <HPBar character="dog" currentHP={dogFinalHP} position="right" />
      </div>

      {/* Win counts */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 40,
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <span style={{ color: CHARACTER_INFO.cat.color }}>
          {CHARACTER_INFO.cat.emoji} {catWins}승
        </span>
        <span style={{ color: '#FFD700' }}>vs</span>
        <span style={{ color: CHARACTER_INFO.dog.color }}>
          {dogWins}승 {CHARACTER_INFO.dog.emoji}
        </span>
      </div>
    </div>
  );
};

/**
 * CTA Section - Call to action and subscribe reminder
 */
const CTASection: React.FC<{
  ctaQuestion: string;
  durationInFrames: number;
}> = ({ ctaQuestion, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Show in second half
  const showFrom = Math.floor(durationInFrames * 0.5);

  if (frame < showFrom) return null;

  const localFrame = frame - showFrom;

  const opacity = interpolate(localFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(localFrame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });

  // Pulse effect for subscribe button
  const pulseScale = 1 + Math.sin(localFrame * 0.2) * 0.05;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 25,
        opacity,
        transform: `translateY(${y}px)`,
        marginTop: 50,
      }}
    >
      {/* CTA Question */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: '#FFFFFF',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textAlign: 'center',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          maxWidth: 600,
        }}
      >
        {ctaQuestion}
      </div>

      {/* Subscribe reminder */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 15,
          padding: '15px 30px',
          backgroundColor: '#FF0000',
          borderRadius: 12,
          transform: `scale(${pulseScale})`,
          boxShadow: '0 4px 20px rgba(255, 0, 0, 0.4)',
        }}
      >
        <span style={{ fontSize: 24 }}>🔔</span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          구독 & 좋아요!
        </span>
      </div>

      {/* Comment prompt */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: '#AAAAAA',
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textAlign: 'center',
        }}
      >
        💬 댓글로 예측을 남겨주세요!
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * SurvivalEnding - Renders the ending sequence
 *
 * Animation sequence:
 * 1. Winner announcement with celebration
 * 2. Final HP bars and score
 * 3. CTA question
 * 4. Subscribe reminder
 */
export const SurvivalEnding: React.FC<SurvivalEndingProps> = ({
  winner,
  catFinalHP,
  dogFinalHP,
  catWins,
  dogWins,
  ctaQuestion,
  durationInFrames,
  channelLogo,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1A1A2E',
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
            radial-gradient(ellipse at center, #1A1A2E 0%, #000000 100%)
          `,
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* Winner announcement */}
        <WinnerAnnouncement winner={winner} />

        {/* Final score */}
        <FinalScoreDisplay
          catFinalHP={catFinalHP}
          dogFinalHP={dogFinalHP}
          catWins={catWins}
          dogWins={dogWins}
        />

        {/* CTA section */}
        <CTASection ctaQuestion={ctaQuestion} durationInFrames={durationInFrames} />
      </div>

      {/* Channel logo (if provided) */}
      {channelLogo && (
        <img
          src={channelLogo}
          alt="Channel Logo"
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            opacity: 0.8,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export default SurvivalEnding;
