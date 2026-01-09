import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  interpolate,
  useCurrentFrame,
  staticFile,
  random,
} from 'remotion';

/** 스텝 설명 데이터 */
export interface StepDescription {
  title: string;
  description: string;
}

export interface IntroProps {
  channelName: string;
  logoPath?: string;
  introSoundPath?: string;
  primaryColor: string;
  secondaryColor?: string;
  /** 인트로 배경 이미지 경로 (assets/{channelId}/intro/background.png) */
  introBackgroundPath?: string;
  /** 썸네일 이미지 경로 */
  thumbnailPath?: string;
  /** 학습 대상 언어 (예: English, Japanese) */
  targetLanguage?: string;
  /** 바이럴 문구 나레이션 TTS 경로 */
  viralNarrationPath?: string;
  /** 바이럴 TTS 길이 (초) - 동적 타이밍용 */
  viralNarrationDuration?: number;
  /** 가이드 나레이션 TTS 경로 */
  guideNarrationPath?: string;
  /** 가이드 TTS 길이 (초) - 동적 타이밍용 */
  guideNarrationDuration?: number;
  /** 스텝별 TTS 경로 배열 (step1~4) */
  stepNarrationPaths?: string[];
  /** 스텝별 TTS 길이 배열 (초) */
  stepNarrationDurations?: number[];
  /** 마무리 TTS 경로 ("자, 이제 시작해볼까요?") */
  closingNarrationPath?: string;
  /** 마무리 TTS 길이 (초) */
  closingNarrationDuration?: number;
  fps?: number;
  /** 다국어 지원을 위한 UI 텍스트 */
  uiLabels?: {
    introTitle?: string;
    step1Title?: string;
    step2Title?: string;
    step3Title?: string;
    step4Title?: string;
    step1Desc?: string;
    step2Desc?: string;
    step3Desc?: string;
    step4Desc?: string;
    /** 바이럴 문구 (첫 줄) - {language}는 학습 언어로 대체됨 */
    viralLine1?: string;
    /** 바이럴 문구 (둘째 줄) - {language}는 학습 언어로 대체됨 */
    viralLine2?: string;
  };
  /** 스텝 설명 (타이틀 + 설명) */
  stepDescriptions?: StepDescription[];
}

// Intro duration constants
// - 썸네일 + 빈티지 효과: 3초 (90 frames)
// - 바이럴 문구: TTS 길이 + 0.5초 여유 (동적)
// - 가이드 문구 + TTS: TTS 길이 + 0.5초 여유 (동적)
// - Step 설명: 각 스텝 TTS + 마무리 TTS + 1초 대기 (동적)
const THUMBNAIL_DURATION = 3 * 30; // 3초
const DEFAULT_VIRAL_DURATION = 4 * 30; // 기본 4초 (TTS 없을 때)
const DEFAULT_GUIDE_DURATION = 3 * 30; // 기본 3초 (TTS 없을 때)
const DEFAULT_STEPS_DURATION = 9 * 30; // 기본 9초 (TTS 없을 때)
const BUFFER_FRAMES = 15; // 0.5초 여유 (페이드아웃용)
const CLOSING_PAUSE_FRAMES = 30; // 마무리 후 1초 대기

// 기본 스텝 설명 데이터
export const DEFAULT_STEP_DESCRIPTIONS: StepDescription[] = [
  {
    title: '전체 흐름 파악 (자막 없이 듣기)',
    description: '자막 없이 소리에만 집중하며, 상황을 상상해보세요.',
  },
  {
    title: '자막으로 내용 이해 하기',
    description: '자막과 함께 들으며, 안 들렸던 부분을 확인하세요.',
  },
  {
    title: '3단계 반복 듣기',
    description: '[느리게-빈칸-빠르게] 반복으로 영어가 들리기 시작해요.',
  },
  {
    title: '기적의 순간 (다시 자막 없이 듣기)',
    description: '놀랍게 선명해진 영어를 직접 확인해보세요!',
  },
];

/**
 * uiLabels에서 스텝 설명 생성
 */
export function getStepDescriptionsFromLabels(uiLabels?: {
  step1Title?: string;
  step2Title?: string;
  step3Title?: string;
  step4Title?: string;
  step1Desc?: string;
  step2Desc?: string;
  step3Desc?: string;
  step4Desc?: string;
}): StepDescription[] {
  if (!uiLabels) return DEFAULT_STEP_DESCRIPTIONS;

  return [
    {
      title: uiLabels.step1Title ?? DEFAULT_STEP_DESCRIPTIONS[0].title,
      description: uiLabels.step1Desc ?? DEFAULT_STEP_DESCRIPTIONS[0].description,
    },
    {
      title: uiLabels.step2Title ?? DEFAULT_STEP_DESCRIPTIONS[1].title,
      description: uiLabels.step2Desc ?? DEFAULT_STEP_DESCRIPTIONS[1].description,
    },
    {
      title: uiLabels.step3Title ?? DEFAULT_STEP_DESCRIPTIONS[2].title,
      description: uiLabels.step3Desc ?? DEFAULT_STEP_DESCRIPTIONS[2].description,
    },
    {
      title: uiLabels.step4Title ?? DEFAULT_STEP_DESCRIPTIONS[3].title,
      description: uiLabels.step4Desc ?? DEFAULT_STEP_DESCRIPTIONS[3].description,
    },
  ];
}

// 스텝별 색상 (stepColors.ts에서 가져옴)
import { STEP_COLORS } from '../config/stepColors';

// Re-export for backward compatibility
export { STEP_COLORS };

/**
 * HEX 색상을 톤다운된 배경색으로 변환
 * 원본 색상의 채도를 낮추고 투명도를 적용하여 시인성 좋은 배경색 생성
 */
function getStepBackgroundColor(hexColor: string, opacity: number = 0.15): string {
  // HEX to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * 스텝 섹션 길이 계산 (TTS 기반)
 */
export function calculateStepsDuration(
  stepDurations?: number[],
  closingDuration?: number,
  fps: number = 30
): number {
  if (!stepDurations || stepDurations.length === 0) {
    return DEFAULT_STEPS_DURATION;
  }

  // 각 스텝 TTS + 0.5초 여유
  const stepFrames = stepDurations.reduce(
    (sum, dur) => sum + Math.ceil(dur * fps) + BUFFER_FRAMES,
    0
  );

  // 마무리 TTS + 1초 대기
  const closingFrames = closingDuration
    ? Math.ceil(closingDuration * fps) + CLOSING_PAUSE_FRAMES
    : 60; // 기본 2초

  return stepFrames + closingFrames;
}

/**
 * TTS duration에 따른 동적 인트로 길이 계산
 */
export function calculateIntroDuration(
  viralDuration?: number,
  guideDuration?: number,
  stepDurations?: number[],
  closingDuration?: number,
  fps: number = 30
): number {
  const viralFrames = viralDuration
    ? Math.ceil(viralDuration * fps) + BUFFER_FRAMES
    : DEFAULT_VIRAL_DURATION;
  const guideFrames = guideDuration
    ? Math.ceil(guideDuration * fps) + BUFFER_FRAMES
    : DEFAULT_GUIDE_DURATION;
  const stepsFrames = calculateStepsDuration(stepDurations, closingDuration, fps);

  return THUMBNAIL_DURATION + viralFrames + guideFrames + stepsFrames;
}

// 기본 인트로 길이 (TTS duration 없을 때 사용)
export const INTRO_DURATION_FRAMES =
  THUMBNAIL_DURATION + DEFAULT_VIRAL_DURATION + DEFAULT_GUIDE_DURATION + DEFAULT_STEPS_DURATION;

export const Intro: React.FC<IntroProps> = ({
  channelName: _channelName,
  logoPath: _logoPath,
  introSoundPath,
  primaryColor: _primaryColor,
  secondaryColor: _secondaryColor = '#FF69B4',
  introBackgroundPath,
  thumbnailPath,
  targetLanguage = 'English',
  viralNarrationPath,
  viralNarrationDuration,
  guideNarrationPath,
  guideNarrationDuration,
  stepNarrationPaths,
  stepNarrationDurations,
  closingNarrationPath,
  closingNarrationDuration,
  fps = 30,
  uiLabels,
  stepDescriptions,
}) => {
  // TTS duration에 따른 동적 타이밍 계산
  const viralDurationFrames = viralNarrationDuration
    ? Math.ceil(viralNarrationDuration * fps) + BUFFER_FRAMES
    : DEFAULT_VIRAL_DURATION;
  const guideDurationFrames = guideNarrationDuration
    ? Math.ceil(guideNarrationDuration * fps) + BUFFER_FRAMES
    : DEFAULT_GUIDE_DURATION;
  const stepsDurationFrames = calculateStepsDuration(
    stepNarrationDurations,
    closingNarrationDuration,
    fps
  );

  // 바이럴 문구 (언어별 자동 생성)
  const viralMessages = getViralMessages(
    targetLanguage,
    uiLabels?.viralLine1,
    uiLabels?.viralLine2
  );

  // 스텝 설명 데이터 (uiLabels에서 생성)
  const steps = stepDescriptions ?? getStepDescriptionsFromLabels(uiLabels);

  // 파일 경로가 비어있지 않은지 체크
  const hasIntroSound = introSoundPath && introSoundPath.length > 0;
  const hasThumbnail = thumbnailPath && thumbnailPath.length > 0;
  const hasIntroBackground = introBackgroundPath && introBackgroundPath.length > 0;
  const hasViralNarration = viralNarrationPath && viralNarrationPath.length > 0;
  const hasGuideNarration = guideNarrationPath && guideNarrationPath.length > 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* 인트로 사운드 - 파일이 있을 때만 */}
      {hasIntroSound && <Audio src={staticFile(introSoundPath)} volume={0.7} />}

      {/* Part 1: 썸네일 + 빈티지 카메라 효과 (0-3초) */}
      <Sequence from={0} durationInFrames={THUMBNAIL_DURATION}>
        <VintageThumbnailSection
          thumbnailPath={hasThumbnail ? thumbnailPath : undefined}
          introBackgroundPath={hasIntroBackground ? introBackgroundPath : undefined}
        />
      </Sequence>

      {/* Part 2: 바이럴 문구 (TTS 길이에 따라 동적) */}
      <Sequence from={THUMBNAIL_DURATION} durationInFrames={viralDurationFrames}>
        <ViralMessageSection
          line1={viralMessages.line1}
          line2={viralMessages.line2}
          introBackgroundPath={hasIntroBackground ? introBackgroundPath : undefined}
          narrationPath={hasViralNarration ? viralNarrationPath : undefined}
          durationFrames={viralDurationFrames}
        />
      </Sequence>

      {/* Part 3: 가이드 문구 + TTS (TTS 길이에 따라 동적) */}
      <Sequence
        from={THUMBNAIL_DURATION + viralDurationFrames}
        durationInFrames={guideDurationFrames}
      >
        <GuideMessageSection
          introBackgroundPath={hasIntroBackground ? introBackgroundPath : undefined}
          narrationPath={hasGuideNarration ? guideNarrationPath : undefined}
          durationFrames={guideDurationFrames}
        />
      </Sequence>

      {/* Part 4: 학습 순서 (TTS 기반 동적 길이) */}
      <Sequence
        from={THUMBNAIL_DURATION + viralDurationFrames + guideDurationFrames}
        durationInFrames={stepsDurationFrames}
      >
        <StepsSection
          steps={steps}
          stepNarrationPaths={stepNarrationPaths}
          stepNarrationDurations={stepNarrationDurations}
          closingNarrationPath={closingNarrationPath}
          closingNarrationDuration={closingNarrationDuration}
          fps={fps}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * 학습 언어에 따른 바이럴 문구 생성
 */
function getViralMessages(
  targetLanguage: string,
  customLine1?: string,
  customLine2?: string
): { line1: string; line2: string } {
  // 커스텀 문구가 있으면 사용
  if (customLine1 && customLine2) {
    return {
      line1: customLine1.replace('{language}', getLanguageInKorean(targetLanguage)),
      line2: customLine2.replace('{language}', getLanguageInKorean(targetLanguage)),
    };
  }

  // 언어별 기본 문구
  const languageKr = getLanguageInKorean(targetLanguage);

  return {
    line1: `${languageKr} 문장을 반복해서 듣고`,
    line2: `${languageKr}가 들리는 순간을 느껴보세요.`,
  };
}

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

// 바이럴 문구 섹션
const ViralMessageSection: React.FC<{
  line1: string;
  line2: string;
  introBackgroundPath?: string;
  narrationPath?: string;
  durationFrames: number;
}> = ({ line1, line2, introBackgroundPath, narrationPath, durationFrames }) => {
  const frame = useCurrentFrame();

  // 배경 페이드인
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 첫 줄 애니메이션 (Fade up)
  const line1Opacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line1Y = interpolate(frame, [10, 30], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 둘째 줄 애니메이션 (Fade up, 약간 딜레이)
  const line2Opacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line2Y = interpolate(frame, [25, 45], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 전체 페이드아웃 (마지막 20프레임)
  const fadeOutStart = durationFrames - 20;
  const fadeOut = interpolate(frame, [fadeOutStart, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 색상 (dark blue 배경 기준)
  const LINE1_COLOR = '#FFFFFF';
  const LINE2_COLOR = '#FFD93D';

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* TTS 나레이션 */}
      {narrationPath && <Audio src={staticFile(narrationPath)} volume={1.0} />}

      {/* 배경 이미지 (블러 처리) */}
      {introBackgroundPath && (
        <AbsoluteFill style={{ opacity: bgOpacity }}>
          <Img
            src={staticFile(introBackgroundPath)}
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
        {/* 첫 줄 - 2.5배 크기 (52 * 2.5 = 130) */}
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
          {line1}
        </div>

        {/* 둘째 줄 (강조) - 2.5배 크기 (56 * 2.5 = 140) */}
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            color: LINE2_COLOR,
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: `0 0 60px ${LINE2_COLOR}66, 0 6px 40px rgba(0,0,0,0.6)`,
            letterSpacing: '3px',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {line2}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 가이드 문구 섹션 ("이 영상은 다음 네 단계로 진행됩니다")
const GuideMessageSection: React.FC<{
  introBackgroundPath?: string;
  narrationPath?: string;
  durationFrames: number;
}> = ({ introBackgroundPath, narrationPath, durationFrames }) => {
  const frame = useCurrentFrame();

  // 배경 페이드인
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 텍스트 애니메이션 (Fade up)
  const textOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [10, 30], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 전체 페이드아웃 (마지막 20프레임)
  const fadeOutStart = durationFrames - 20;
  const fadeOut = interpolate(frame, [fadeOutStart, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const WHITE_COLOR = '#FFFFFF';
  const GOLD_COLOR = '#FFD93D';

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* TTS 나레이션 */}
      {narrationPath && <Audio src={staticFile(narrationPath)} volume={1.0} />}

      {/* 배경 이미지 (블러 처리) */}
      {introBackgroundPath && (
        <AbsoluteFill style={{ opacity: bgOpacity }}>
          <Img
            src={staticFile(introBackgroundPath)}
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
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 80px',
        }}
      >
        {/* "이 영상은 다음 네 단계로 진행됩니다." - 바이럴과 동일한 크기 */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 6px 40px rgba(0,0,0,0.6)',
            letterSpacing: '2px',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          <span style={{ color: WHITE_COLOR }}>이 영상은 다음 </span>
          <span
            style={{
              color: GOLD_COLOR,
              textShadow: `0 0 60px ${GOLD_COLOR}66, 0 6px 40px rgba(0,0,0,0.6)`,
            }}
          >
            네
          </span>
          <span style={{ color: WHITE_COLOR }}> 단계로 진행됩니다.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 빈티지 카메라 효과가 적용된 썸네일 섹션
const VintageThumbnailSection: React.FC<{
  thumbnailPath?: string;
  introBackgroundPath?: string;
}> = ({ thumbnailPath, introBackgroundPath }) => {
  const frame = useCurrentFrame();

  // 페이드인/아웃
  const opacity = interpolate(frame, [0, 10, 70, 90], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });

  // 약간의 줌 효과
  const scale = interpolate(frame, [0, 90], [1.05, 1], {
    extrapolateRight: 'clamp',
  });

  // 빈티지 필름 그레인 노이즈 강도
  const grainIntensity = interpolate(frame, [0, 45, 90], [0.3, 0.15, 0.25], {
    extrapolateRight: 'clamp',
  });

  // 비네팅 강도
  const vignetteIntensity = interpolate(frame, [0, 30], [0.6, 0.4], {
    extrapolateRight: 'clamp',
  });

  // 색수차 (chromatic aberration) 효과
  const chromaticOffset = interpolate(frame, [0, 90], [3, 1], {
    extrapolateRight: 'clamp',
  });

  const imageSrc = thumbnailPath || introBackgroundPath;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* 메인 이미지 */}
      {imageSrc && (
        <AbsoluteFill style={{ transform: `scale(${scale})` }}>
          <Img
            src={staticFile(imageSrc)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'sepia(0.2) contrast(1.1) saturate(0.9)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* 색수차 효과 (RGB 분리) */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: 0.3,
        }}
      >
        {imageSrc && (
          <Img
            src={staticFile(imageSrc)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translateX(${chromaticOffset}px) scale(${scale})`,
              filter: 'sepia(0.2) hue-rotate(-10deg)',
              opacity: 0.5,
            }}
          />
        )}
      </AbsoluteFill>

      {/* 필름 그레인 노이즈 */}
      <FilmGrain intensity={grainIntensity} frame={frame} />

      {/* 비 효과 */}
      <RainEffect frame={frame} />

      {/* 비네팅 (어두운 테두리) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        }}
      />

      {/* 스캔라인 효과 */}
      <ScanLines opacity={0.08} />

      {/* 필름 스크래치 */}
      <FilmScratches frame={frame} />

      {/* 플리커 효과 */}
      <FlickerEffect frame={frame} />
    </AbsoluteFill>
  );
};

// 필름 그레인 노이즈 컴포넌트
const FilmGrain: React.FC<{ intensity: number; frame: number }> = ({ intensity, frame }) => {
  // 프레임마다 다른 노이즈 패턴
  const noiseOffset = (frame * 17) % 100;

  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${noiseOffset}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: intensity,
        mixBlendMode: 'overlay',
      }}
    />
  );
};

// 비 효과 컴포넌트
const RainEffect: React.FC<{ frame: number }> = ({ frame }) => {
  // 빗방울 생성 (고정된 위치, 프레임에 따라 이동)
  const raindrops = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      x: random(`rain-x-${i}`) * 100,
      startY: random(`rain-y-${i}`) * -50 - 10,
      speed: 15 + random(`rain-speed-${i}`) * 10,
      length: 15 + random(`rain-length-${i}`) * 20,
      opacity: 0.2 + random(`rain-opacity-${i}`) * 0.3,
      delay: random(`rain-delay-${i}`) * 30,
    }));
  }, []);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {raindrops.map((drop, i) => {
        const adjustedFrame = Math.max(0, frame - drop.delay);
        const y = (drop.startY + adjustedFrame * drop.speed) % 130;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${drop.x}%`,
              top: `${y}%`,
              width: 1,
              height: drop.length,
              background: `linear-gradient(to bottom, transparent, rgba(200, 220, 255, ${drop.opacity}))`,
              transform: 'rotate(-5deg)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// 스캔라인 효과
const ScanLines: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, ${opacity}) 2px,
          rgba(0, 0, 0, ${opacity}) 4px
        )`,
        pointerEvents: 'none',
      }}
    />
  );
};

// 필름 스크래치 효과
const FilmScratches: React.FC<{ frame: number }> = ({ frame }) => {
  const scratches = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => ({
      x: random(`scratch-x-${i}`) * 100,
      width: 1 + random(`scratch-w-${i}`),
      opacity: 0.1 + random(`scratch-o-${i}`) * 0.15,
    }));
  }, []);

  // 스크래치가 나타났다 사라지는 효과
  const scratchVisible = frame % 15 < 3;

  if (!scratchVisible) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {scratches.map((scratch, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${scratch.x}%`,
            top: 0,
            width: scratch.width,
            height: '100%',
            background: `rgba(255, 255, 255, ${scratch.opacity})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// 플리커 (깜빡임) 효과
const FlickerEffect: React.FC<{ frame: number }> = ({ frame }) => {
  // 불규칙한 깜빡임
  const flickerValue = Math.sin(frame * 0.5) * 0.02 + Math.sin(frame * 1.3) * 0.01;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(255, 255, 255, ${Math.max(0, flickerValue * 2)})`,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};

// 학습 순서 섹션 (새 디자인 - 파란 그라데이션 배경 + 색상 카드)
const StepsSection: React.FC<{
  steps: StepDescription[];
  stepNarrationPaths?: string[];
  stepNarrationDurations?: number[];
  closingNarrationPath?: string;
  closingNarrationDuration?: number;
  fps?: number;
}> = ({
  steps,
  stepNarrationPaths,
  stepNarrationDurations,
  closingNarrationPath,
  closingNarrationDuration,
  fps = 30,
}) => {
  const frame = useCurrentFrame();

  // 각 스텝의 시작 프레임 계산
  const stepStartFrames = useMemo(() => {
    const starts: number[] = [0];
    if (stepNarrationDurations && stepNarrationDurations.length > 0) {
      for (let i = 0; i < stepNarrationDurations.length - 1; i++) {
        const prevEnd = starts[i] + Math.ceil(stepNarrationDurations[i] * fps) + BUFFER_FRAMES;
        starts.push(prevEnd);
      }
    } else {
      // TTS 없을 때 기본 간격 (2초씩)
      for (let i = 1; i < 4; i++) {
        starts.push(i * 60);
      }
    }
    return starts;
  }, [stepNarrationDurations, fps]);

  // 마무리 시작 프레임
  const closingStartFrame = useMemo(() => {
    if (stepNarrationDurations && stepNarrationDurations.length > 0) {
      const lastStepEnd =
        stepStartFrames[stepStartFrames.length - 1] +
        Math.ceil(stepNarrationDurations[stepNarrationDurations.length - 1] * fps) +
        BUFFER_FRAMES;
      return lastStepEnd;
    }
    return 240; // 기본 8초
  }, [stepStartFrames, stepNarrationDurations, fps]);

  // 배경 페이드인
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* 파란색 그라데이션 배경 */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #0D1B2A 0%, #1B263B 50%, #0D1B2A 100%)',
          opacity: bgOpacity,
        }}
      />

      {/* 스텝별 TTS 오디오 (Sequence로 분리) */}
      {stepNarrationPaths?.map((audioPath, index) => {
        const stepStart = stepStartFrames[index] ?? index * 60;
        const stepDuration = stepNarrationDurations?.[index]
          ? Math.ceil(stepNarrationDurations[index] * fps) + 30
          : 90;

        return (
          <Sequence key={`audio-${index}`} from={stepStart} durationInFrames={stepDuration}>
            <Audio src={staticFile(audioPath)} volume={1.0} />
          </Sequence>
        );
      })}

      {/* 스텝 카드들 */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 80px',
          gap: 24,
        }}
      >
        {steps.map((step, index) => {
          const stepStart = stepStartFrames[index] ?? index * 60;

          // 페이드인 애니메이션
          const opacity = interpolate(frame, [stepStart, stepStart + 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const translateY = interpolate(frame, [stepStart, stepStart + 20], [30, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          // 스텝 색상
          const stepColor = STEP_COLORS[index] ?? STEP_COLORS[0];
          // 톤다운된 배경색 (원본 색상의 15% 투명도)
          const stepBgColor = getStepBackgroundColor(stepColor, 0.15);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                width: '100%',
                maxWidth: 1200,
                opacity,
                transform: `translateY(${translateY}px)`,
                background: stepBgColor,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              {/* 왼쪽 색상 바 + 번호 */}
              <div
                style={{
                  width: 80,
                  background: stepColor,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 54,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
                  }}
                >
                  {index + 1}
                </span>
              </div>

              {/* 텍스트 영역 */}
              <div
                style={{
                  flex: 1,
                  padding: '24px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {/* 타이틀 */}
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
                    lineHeight: 1.2,
                  }}
                >
                  {step.title}
                </div>

                {/* 설명 */}
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
                    lineHeight: 1.4,
                  }}
                >
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* 마무리 TTS ("자, 이제 시작해볼까요?") */}
      {closingNarrationPath && (
        <Sequence
          from={closingStartFrame}
          durationInFrames={
            closingNarrationDuration
              ? Math.ceil(closingNarrationDuration * fps) + CLOSING_PAUSE_FRAMES
              : 90
          }
        >
          <ClosingMessage
            narrationPath={closingNarrationPath}
            durationFrames={
              closingNarrationDuration
                ? Math.ceil(closingNarrationDuration * fps) + CLOSING_PAUSE_FRAMES
                : 90
            }
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

// 마무리 메시지 컴포넌트 (오디오만 재생, 텍스트 없음)
const ClosingMessage: React.FC<{
  narrationPath: string;
  durationFrames: number;
}> = ({ narrationPath, durationFrames: _durationFrames }) => {
  return (
    <AbsoluteFill>
      {/* TTS만 재생 */}
      <Audio src={staticFile(narrationPath)} volume={1.0} />
    </AbsoluteFill>
  );
};
