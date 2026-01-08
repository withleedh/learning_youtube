/**
 * Ending Component
 * 영상 마지막 엔딩 화면
 * - 인트로와 비슷한 분위기
 * - 감사 메시지 + 다음 영상 예고
 */

import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

export interface EndingProps {
  /** 배경 이미지 경로 (인트로 배경 재사용) */
  backgroundPath?: string;
  /** 첫 줄 텍스트 */
  line1?: string;
  /** 둘째 줄 텍스트 */
  line2?: string;
  /** 엔딩 TTS 경로 */
  narrationPath?: string;
  /** 학습 언어 (예: English, Japanese) - 텍스트 자동 생성용 */
  targetLanguage?: string;
}

// 엔딩 화면 기본 길이 (5초)
export const ENDING_DURATION = 5 * 30; // 150 frames

export const Ending: React.FC<EndingProps> = ({
  backgroundPath,
  line1,
  line2,
  narrationPath,
  targetLanguage = 'English',
}) => {
  const frame = useCurrentFrame();

  // 언어에 따른 기본 텍스트
  const defaultLine1 = '고생하셨습니다.';
  const languageKr = getLanguageInKorean(targetLanguage);
  const defaultLine2 = `${languageKr}가 들리는 그 순간까지! 내일 다시 만나요.`;

  const displayLine1 = line1 ?? defaultLine1;
  const displayLine2 = line2 ?? defaultLine2;

  // 배경 페이드인
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 첫 줄 애니메이션 (Fade up)
  const line1Opacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line1Y = interpolate(frame, [15, 35], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 둘째 줄 애니메이션 (Fade up, 약간 딜레이)
  const line2Opacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line2Y = interpolate(frame, [35, 55], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 전체 페이드아웃 (마지막 20프레임)
  const fadeOutStart = ENDING_DURATION - 20;
  const fadeOut = interpolate(frame, [fadeOutStart, ENDING_DURATION], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 색상 (인트로와 동일)
  const LINE1_COLOR = '#FFFFFF';
  const LINE2_COLOR = '#FFD93D';

  const hasBackground = backgroundPath && backgroundPath.length > 0;
  const hasNarration = narrationPath && narrationPath.length > 0;

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* TTS 나레이션 */}
      {hasNarration && <Audio src={staticFile(narrationPath)} volume={1.0} />}

      {/* 배경 이미지 (블러 처리) */}
      {hasBackground && (
        <AbsoluteFill style={{ opacity: bgOpacity }}>
          <Img
            src={staticFile(backgroundPath)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(30px) brightness(0.3)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* 어두운 오버레이 */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(10,25,50,0.9) 0%, rgba(5,15,35,0.95) 100%)',
          opacity: bgOpacity,
        }}
      />

      {/* 문구 컨테이너 */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 80px',
          gap: 30,
        }}
      >
        {/* 첫 줄 - 감사 메시지 */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            color: LINE1_COLOR,
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 6px 40px rgba(0,0,0,0.6)',
            letterSpacing: '2px',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {displayLine1}
        </div>

        {/* 둘째 줄 - 다음 영상 예고 (강조) */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: LINE2_COLOR,
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: `0 0 60px ${LINE2_COLOR}66, 0 6px 40px rgba(0,0,0,0.6)`,
            letterSpacing: '2px',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {displayLine2}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * 언어명을 한국어로 변환
 */
function getLanguageInKorean(language: string): string {
  const languageMap: Record<string, string> = {
    English: '영어',
    Japanese: '일본어',
    Chinese: '중국어',
    Spanish: '스페인어',
    French: '프랑스어',
    German: '독일어',
    Korean: '한국어',
    Vietnamese: '베트남어',
    Thai: '태국어',
    Indonesian: '인도네시아어',
  };
  return languageMap[language] || language;
}

/**
 * 엔딩 화면 길이 계산
 */
export function calculateEndingDuration(narrationDuration?: number, fps: number = 30): number {
  if (narrationDuration) {
    // TTS 길이 + 1초 여유
    return Math.ceil(narrationDuration * fps) + 30;
  }
  return ENDING_DURATION;
}
