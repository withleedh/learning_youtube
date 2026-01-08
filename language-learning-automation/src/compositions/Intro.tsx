import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { FallbackLogo } from '../components/Logo';

export interface IntroProps {
  channelName: string;
  logoPath?: string;
  introSoundPath?: string;
  primaryColor: string;
  fps?: number;
}

// Step descriptions for the intro
const STEP_DESCRIPTIONS = [
  '자막 없이 듣기',
  '문장별 듣기',
  '10번씩 반복 듣기',
  '다시 자막 없이 듣기',
];

// Intro duration: 30 seconds at 30fps = 900 frames
export const INTRO_DURATION_FRAMES = 30 * 30;
const LOGO_DURATION_FRAMES = 2 * 30; // 2 seconds
const STEPS_DURATION_FRAMES = INTRO_DURATION_FRAMES - LOGO_DURATION_FRAMES; // 28 seconds
const STEP_DURATION_FRAMES = STEPS_DURATION_FRAMES / 4; // 7 seconds per step

export const Intro: React.FC<IntroProps> = ({
  channelName,
  logoPath,
  introSoundPath,
  primaryColor,
  fps = 30,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Intro Sound */}
      {introSoundPath && <Audio src={staticFile(introSoundPath)} volume={0.8} />}

      {/* Logo Section (0-2 seconds) */}
      <Sequence from={0} durationInFrames={LOGO_DURATION_FRAMES}>
        <LogoSection channelName={channelName} primaryColor={primaryColor} />
      </Sequence>

      {/* Steps Section (2-30 seconds) */}
      <Sequence from={LOGO_DURATION_FRAMES} durationInFrames={STEPS_DURATION_FRAMES}>
        <StepsSection primaryColor={primaryColor} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Logo section component
const LogoSection: React.FC<{ channelName: string; primaryColor: string }> = ({
  channelName,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 45, 60], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, 15], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <FallbackLogo text={channelName} color={primaryColor} />
    </AbsoluteFill>
  );
};

// Steps section component
const StepsSection: React.FC<{ primaryColor: string }> = ({ primaryColor }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          fontSize: 36,
          color: '#FFFFFF',
          marginBottom: 60,
          fontWeight: 600,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        오늘의 학습 순서
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        {STEP_DESCRIPTIONS.map((step, index) => {
          const stepStartFrame = index * STEP_DURATION_FRAMES;
          const opacity = interpolate(frame, [stepStartFrame, stepStartFrame + 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const translateX = interpolate(frame, [stepStartFrame, stepStartFrame + 30], [-50, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                opacity,
                transform: `translateX(${translateX}px)`,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: primaryColor,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                {index + 1}
              </div>
              <div
                style={{
                  fontSize: 32,
                  color: '#FFFFFF',
                  fontWeight: 500,
                  fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
