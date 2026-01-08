/**
 * StepTransition Component
 * 각 스텝 시작 전 전환 화면
 * - 보색 배경
 * - "STEP N" 큰 텍스트
 * - 하단 안내 문구
 * - 띠딩 효과음 + 남자 TTS
 */

import React from 'react';
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { getStepColors } from '../config/stepColors';

export interface StepTransitionProps {
  /** 스텝 번호 (1-4) */
  stepNumber: number;
  /** 효과음 경로 (띠딩) */
  bellSoundPath?: string;
  /** TTS 경로 (남자 목소리 "스텝원" 등) */
  ttsPath?: string;
  /** 하단 안내 문구 (선택) */
  notices?: string[];
}

// 기본 안내 문구
const DEFAULT_NOTICES = [
  // '* 전체 영어 스크립트는 영상 하단의 "더보기"에서 확인하실 수 있습니다.',
  '* 본 영상은 학습을 위한 픽션으로, 실제 사건 및 인물,단체,사건과 관련이 없습니다.',
];

// 전환 화면 기본 길이 (3초)
export const STEP_TRANSITION_DURATION = 3 * 30; // 90 frames

export const StepTransition: React.FC<StepTransitionProps> = ({
  stepNumber,
  bellSoundPath,
  ttsPath,
  notices = DEFAULT_NOTICES,
}) => {
  const frame = useCurrentFrame();
  const colors = getStepColors(stepNumber - 1);

  // 페이드인
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 텍스트 스케일 애니메이션
  const textScale = interpolate(frame, [0, 20], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  // 페이드아웃 (마지막 15프레임)
  const fadeOut = interpolate(
    frame,
    [STEP_TRANSITION_DURATION - 15, STEP_TRANSITION_DURATION],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* 효과음 (띠딩) */}
      {bellSoundPath && <Audio src={staticFile(bellSoundPath)} volume={0.8} />}

      {/* TTS (남자 목소리) */}
      {ttsPath && <Audio src={staticFile(ttsPath)} volume={1.0} />}

      {/* 보색 배경 */}
      <AbsoluteFill
        style={{
          backgroundColor: colors.complementary,
          opacity,
        }}
      />

      {/* 둥근 모서리 컨테이너 */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
        }}
      >
        {/* STEP N 텍스트 */}
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: '#FFFFFF',
            opacity,
            transform: `scale(${textScale})`,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: '10px',
            textShadow: '0 8px 40px rgba(0,0,0,0.3)',
          }}
        >
          STEP {stepNumber}
        </div>
      </AbsoluteFill>

      {/* 하단 안내 문구 */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '40px 60px',
          gap: 8,
        }}
      >
        {notices.map((notice, index) => (
          <div
            key={index}
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.8)',
              opacity,
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              textAlign: 'center',
            }}
          >
            {notice}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * 스텝 전환 화면 총 길이 계산
 */
export function calculateStepTransitionDuration(): number {
  return STEP_TRANSITION_DURATION;
}
