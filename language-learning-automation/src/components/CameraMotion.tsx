/**
 * CameraMotion Component - Professional Camera Movement System
 *
 * cameraDirection 프롬프트를 파싱하여 실제 영화/드라마 수준의 카메라 무빙 구현
 *
 * 지원하는 카메라 기법:
 * - Shot Types: Wide, Medium, Close-up, Extreme Close-up, Two-shot
 * - Camera Angles: Eye-level, Low angle, High angle, Dutch angle, Bird's eye
 * - Camera Movements: Pan, Tilt, Dolly, Tracking, Zoom, Push-in, Pull-back
 * - Focus: Shallow/Deep DOF, Rack focus simulation
 */

import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, Easing, staticFile } from 'remotion';
import type { ScenePrompt } from '../script/types';

// =============================================================================
// Types
// =============================================================================

/** 샷 타입 (프레이밍) */
export type ShotType =
  | 'extreme-wide' // 익스트림 와이드 - 전경
  | 'wide' // 와이드샷 - 전체 장면
  | 'medium-wide' // 미디엄 와이드 - 무릎 위
  | 'medium' // 미디엄샷 - 허리 위
  | 'medium-close' // 미디엄 클로즈 - 가슴 위
  | 'close-up' // 클로즈업 - 얼굴
  | 'extreme-close' // 익스트림 클로즈업 - 눈/입
  | 'two-shot' // 투샷 - 두 인물
  | 'over-shoulder'; // 오버숄더

/** 카메라 앵글 */
export type CameraAngle =
  | 'eye-level' // 눈높이 (기본)
  | 'low-angle' // 로우앵글 - 위엄/힘
  | 'high-angle' // 하이앵글 - 취약/작음
  | 'dutch-angle' // 더치앵글 - 불안/긴장
  | 'birds-eye' // 버즈아이 - 위에서 내려다봄
  | 'worms-eye'; // 웜즈아이 - 아래에서 올려다봄

/** 카메라 무빙 타입 */
export type CameraMovement =
  | 'static' // 정적 (미세한 흔들림만)
  | 'pan-left' // 좌로 패닝
  | 'pan-right' // 우로 패닝
  | 'tilt-up' // 위로 틸트
  | 'tilt-down' // 아래로 틸트
  | 'dolly-in' // 돌리 인 (피사체로 접근)
  | 'dolly-out' // 돌리 아웃 (피사체에서 후퇴)
  | 'tracking-left' // 좌로 트래킹
  | 'tracking-right' // 우로 트래킹
  | 'push-in' // 푸시 인 (줌 + 돌리)
  | 'pull-back' // 풀백 (줌아웃 + 돌리아웃)
  | 'crane-up' // 크레인 업
  | 'crane-down' // 크레인 다운
  | 'orbit-left' // 좌로 공전
  | 'orbit-right'; // 우로 공전

/** 파싱된 카메라 정보 */
export interface ParsedCameraInfo {
  shotType: ShotType;
  angle: CameraAngle;
  movement: CameraMovement;
  /** 피사계 심도 (0: 깊음, 1: 얕음) - 보케 효과 강도 */
  depthOfField: number;
  /** 무빙 속도 (0.5: 느림, 1: 보통, 2: 빠름) */
  speed: number;
  /** 무빙 강도 (0: 미세, 1: 보통, 2: 강함) */
  intensity: number;
}

/** 최종 카메라 모션 설정 */
export interface CameraMotionConfig {
  scaleStart: number;
  scaleEnd: number;
  panXStart: number;
  panXEnd: number;
  panYStart: number;
  panYEnd: number;
  rotateStart: number;
  rotateEnd: number;
  /** transform-origin (예: 'center center', 'left top') */
  transformOrigin: string;
  easing: (t: number) => number;
}

// =============================================================================
// Camera Direction Parser (핵심!)
// =============================================================================

/**
 * LLM이 생성한 cameraDirection 문자열을 파싱하여 카메라 정보 추출
 *
 * 예시 입력:
 * - "Wide establishing shot, eye-level, utilizing the break room's natural window light"
 * - "Medium tracking shot, slight low angle, moving backward down the corridor"
 * - "Close-up, shallow depth of field, isolating the characters' faces"
 * - "Medium wide shot, pulling back slowly from the elevator doors"
 */
export function parseCameraDirection(cameraDirection?: string): ParsedCameraInfo {
  if (!cameraDirection) {
    return {
      shotType: 'medium',
      angle: 'eye-level',
      movement: 'static',
      depthOfField: 0.3,
      speed: 1,
      intensity: 1,
    };
  }

  const lower = cameraDirection.toLowerCase();

  // 1. Shot Type 파싱
  const shotType = parseShotType(lower);

  // 2. Camera Angle 파싱
  const angle = parseCameraAngle(lower);

  // 3. Camera Movement 파싱
  const movement = parseCameraMovement(lower);

  // 4. Depth of Field 파싱
  const depthOfField = parseDepthOfField(lower);

  // 5. Speed 파싱
  const speed = parseSpeed(lower);

  // 6. Intensity 파싱
  const intensity = parseIntensity(lower);

  return { shotType, angle, movement, depthOfField, speed, intensity };
}

function parseShotType(text: string): ShotType {
  // 순서 중요: 더 구체적인 것 먼저 체크
  if (text.includes('extreme wide') || text.includes('establishing')) return 'extreme-wide';
  if (text.includes('extreme close') || text.includes('ecl')) return 'extreme-close';
  if (text.includes('medium wide') || text.includes('mws')) return 'medium-wide';
  if (text.includes('medium close') || text.includes('mcu')) return 'medium-close';
  if (text.includes('close-up') || text.includes('closeup') || text.includes('close up'))
    return 'close-up';
  if (text.includes('two-shot') || text.includes('two shot') || text.includes('2-shot'))
    return 'two-shot';
  if (text.includes('over-the-shoulder') || text.includes('over shoulder') || text.includes('ots'))
    return 'over-shoulder';
  if (text.includes('wide')) return 'wide';
  if (text.includes('medium')) return 'medium';

  return 'medium'; // 기본값
}

function parseCameraAngle(text: string): CameraAngle {
  if (text.includes("bird's eye") || text.includes('birds eye') || text.includes('overhead'))
    return 'birds-eye';
  if (text.includes("worm's eye") || text.includes('worms eye')) return 'worms-eye';
  if (text.includes('dutch') || text.includes('canted') || text.includes('tilted'))
    return 'dutch-angle';
  if (text.includes('low angle') || text.includes('low-angle') || text.includes('looking up'))
    return 'low-angle';
  if (text.includes('high angle') || text.includes('high-angle') || text.includes('looking down'))
    return 'high-angle';
  if (text.includes('eye-level') || text.includes('eye level')) return 'eye-level';

  return 'eye-level'; // 기본값
}

function parseCameraMovement(text: string): CameraMovement {
  // 복합 무빙 먼저 체크
  if (text.includes('push in') || text.includes('push-in') || text.includes('pushing in'))
    return 'push-in';
  if (
    text.includes('pull back') ||
    text.includes('pull-back') ||
    text.includes('pulling back') ||
    text.includes('reveal')
  )
    return 'pull-back';

  // 크레인/지브
  if (text.includes('crane up') || text.includes('rising')) return 'crane-up';
  if (text.includes('crane down') || text.includes('descending')) return 'crane-down';

  // 오빗 (공전)
  if (text.includes('orbit') || text.includes('circling') || text.includes('arc')) {
    if (text.includes('left') || text.includes('counter')) return 'orbit-left';
    return 'orbit-right';
  }

  // 트래킹
  if (text.includes('tracking') || text.includes('follow') || text.includes('moving')) {
    if (text.includes('left')) return 'tracking-left';
    if (text.includes('right')) return 'tracking-right';
    if (text.includes('backward') || text.includes('back')) return 'dolly-out';
    if (text.includes('forward')) return 'dolly-in';
    return 'tracking-right'; // 기본 트래킹 방향
  }

  // 돌리
  if (text.includes('dolly in') || text.includes('dolly-in') || text.includes('approaching'))
    return 'dolly-in';
  if (text.includes('dolly out') || text.includes('dolly-out') || text.includes('retreating'))
    return 'dolly-out';

  // 패닝
  if (text.includes('pan')) {
    if (text.includes('left')) return 'pan-left';
    if (text.includes('right')) return 'pan-right';
    return 'pan-right'; // 기본 패닝 방향
  }
  if (text.includes('panning')) {
    if (text.includes('left')) return 'pan-left';
    return 'pan-right';
  }

  // 틸트
  if (text.includes('tilt up') || text.includes('tilting up')) return 'tilt-up';
  if (text.includes('tilt down') || text.includes('tilting down')) return 'tilt-down';

  // 정적
  if (text.includes('static') || text.includes('fixed') || text.includes('locked')) return 'static';

  return 'static'; // 기본값
}

function parseDepthOfField(text: string): number {
  if (text.includes('shallow depth') || text.includes('shallow dof') || text.includes('bokeh'))
    return 0.8;
  if (
    text.includes('deep depth') ||
    text.includes('deep focus') ||
    text.includes('everything in focus')
  )
    return 0.1;
  if (text.includes('rack focus')) return 0.6;

  // 샷 타입에 따른 기본값
  if (text.includes('close-up') || text.includes('closeup')) return 0.6;
  if (text.includes('wide') || text.includes('establishing')) return 0.2;

  return 0.4; // 기본값
}

function parseSpeed(text: string): number {
  if (text.includes('slowly') || text.includes('slow') || text.includes('gentle')) return 0.6;
  if (text.includes('quickly') || text.includes('fast') || text.includes('rapid')) return 1.5;
  if (text.includes('very slow') || text.includes('creeping')) return 0.4;
  if (text.includes('very fast') || text.includes('whip')) return 2.0;

  return 1.0; // 기본값
}

function parseIntensity(text: string): number {
  if (text.includes('slight') || text.includes('subtle') || text.includes('gentle')) return 0.5;
  if (text.includes('dramatic') || text.includes('strong') || text.includes('bold')) return 1.5;

  return 1.0; // 기본값
}

// =============================================================================
// Motion Config Generator
// =============================================================================

/**
 * 파싱된 카메라 정보를 실제 모션 설정으로 변환
 */
export function generateMotionConfig(info: ParsedCameraInfo): CameraMotionConfig {
  const { shotType, angle, movement, speed, intensity } = info;

  // 기본 설정
  const config: CameraMotionConfig = {
    scaleStart: 1.0,
    scaleEnd: 1.0,
    panXStart: 0,
    panXEnd: 0,
    panYStart: 0,
    panYEnd: 0,
    rotateStart: 0,
    rotateEnd: 0,
    transformOrigin: 'center center',
    easing: Easing.inOut(Easing.quad),
  };

  // 1. Shot Type에 따른 기본 스케일 설정
  const shotScales: Record<ShotType, { start: number; end: number }> = {
    'extreme-wide': { start: 1.0, end: 1.03 },
    wide: { start: 1.0, end: 1.05 },
    'medium-wide': { start: 1.02, end: 1.07 },
    medium: { start: 1.03, end: 1.08 },
    'medium-close': { start: 1.05, end: 1.1 },
    'close-up': { start: 1.08, end: 1.15 },
    'extreme-close': { start: 1.12, end: 1.2 },
    'two-shot': { start: 1.02, end: 1.07 },
    'over-shoulder': { start: 1.05, end: 1.1 },
  };

  const shotScale = shotScales[shotType];
  config.scaleStart = shotScale.start;
  config.scaleEnd = shotScale.end;

  // 2. Camera Movement에 따른 모션 적용
  const baseMove = 3 * intensity; // 기본 이동량

  switch (movement) {
    case 'pan-left':
      config.panXStart = baseMove;
      config.panXEnd = -baseMove;
      config.easing = Easing.inOut(Easing.cubic);
      break;

    case 'pan-right':
      config.panXStart = -baseMove;
      config.panXEnd = baseMove;
      config.easing = Easing.inOut(Easing.cubic);
      break;

    case 'tilt-up':
      config.panYStart = baseMove;
      config.panYEnd = -baseMove;
      config.easing = Easing.inOut(Easing.quad);
      break;

    case 'tilt-down':
      config.panYStart = -baseMove;
      config.panYEnd = baseMove;
      config.easing = Easing.inOut(Easing.quad);
      break;

    case 'dolly-in':
    case 'push-in':
      config.scaleStart = shotScale.start;
      config.scaleEnd = shotScale.end + 0.1 * intensity;
      config.easing = Easing.out(Easing.cubic);
      break;

    case 'dolly-out':
    case 'pull-back':
      config.scaleStart = shotScale.end + 0.05 * intensity;
      config.scaleEnd = shotScale.start;
      config.easing = Easing.in(Easing.cubic);
      break;

    case 'tracking-left':
      config.panXStart = baseMove * 1.5;
      config.panXEnd = -baseMove * 0.5;
      config.scaleEnd = config.scaleStart + 0.03;
      config.easing = Easing.inOut(Easing.cubic);
      break;

    case 'tracking-right':
      config.panXStart = -baseMove * 1.5;
      config.panXEnd = baseMove * 0.5;
      config.scaleEnd = config.scaleStart + 0.03;
      config.easing = Easing.inOut(Easing.cubic);
      break;

    case 'crane-up':
      config.panYStart = baseMove * 2;
      config.panYEnd = -baseMove;
      config.scaleStart = shotScale.start + 0.05;
      config.scaleEnd = shotScale.end;
      config.easing = Easing.out(Easing.quad);
      break;

    case 'crane-down':
      config.panYStart = -baseMove * 2;
      config.panYEnd = baseMove;
      config.scaleStart = shotScale.end;
      config.scaleEnd = shotScale.start + 0.05;
      config.easing = Easing.in(Easing.quad);
      break;

    case 'orbit-left':
      config.panXStart = -baseMove;
      config.panXEnd = baseMove;
      config.panYStart = -baseMove * 0.3;
      config.panYEnd = baseMove * 0.3;
      config.easing = Easing.inOut(Easing.sin);
      break;

    case 'orbit-right':
      config.panXStart = baseMove;
      config.panXEnd = -baseMove;
      config.panYStart = baseMove * 0.3;
      config.panYEnd = -baseMove * 0.3;
      config.easing = Easing.inOut(Easing.sin);
      break;

    case 'static':
    default:
      // 미세한 흔들림 (브리딩 효과)
      config.scaleEnd = config.scaleStart + 0.02;
      config.panXEnd = 0.5 * intensity;
      config.easing = Easing.inOut(Easing.sin);
      break;
  }

  // 3. Camera Angle에 따른 추가 조정
  switch (angle) {
    case 'low-angle':
      config.panYStart += 1;
      config.panYEnd += 0.5;
      config.transformOrigin = 'center bottom';
      break;

    case 'high-angle':
      config.panYStart -= 1;
      config.panYEnd -= 0.5;
      config.transformOrigin = 'center top';
      break;

    case 'dutch-angle':
      config.rotateStart = -2 * intensity;
      config.rotateEnd = 2 * intensity;
      break;

    case 'birds-eye':
      config.transformOrigin = 'center center';
      config.scaleStart += 0.05;
      config.scaleEnd += 0.05;
      break;

    case 'worms-eye':
      config.transformOrigin = 'center bottom';
      config.panYStart += 2;
      break;
  }

  // 4. Speed 적용 (이징 함수 조정)
  if (speed < 0.8) {
    // 느린 무빙: 더 부드러운 이징
    const originalEasing = config.easing;
    config.easing = (t: number) => originalEasing(t * 0.8 + 0.1);
  } else if (speed > 1.2) {
    // 빠른 무빙: 더 급격한 이징
    config.easing = Easing.bezier(0.4, 0, 0.2, 1);
  }

  return config;
}

/**
 * cameraDirection 문자열에서 바로 모션 설정 가져오기 (편의 함수)
 */
export function getCameraMotion(
  cameraDirection?: string,
  customMotion?: Partial<CameraMotionConfig>
): CameraMotionConfig {
  const parsed = parseCameraDirection(cameraDirection);
  const config = generateMotionConfig(parsed);

  if (customMotion) {
    return { ...config, ...customMotion };
  }

  return config;
}

// =============================================================================
// React Components
// =============================================================================

export interface CameraMotionProps {
  src: string;
  cameraDirection?: string;
  durationFrames: number;
  crossfadeFrames?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  customMotion?: Partial<CameraMotionConfig>;
}

export const CameraMotion: React.FC<CameraMotionProps> = ({
  src,
  cameraDirection,
  durationFrames,
  crossfadeFrames = 15,
  fadeIn = false,
  fadeOut = false,
  customMotion,
}) => {
  const frame = useCurrentFrame();
  const motion = getCameraMotion(cameraDirection, customMotion);

  // 진행률 (0 ~ 1)
  const rawProgress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const progress = motion.easing(rawProgress);

  // 스케일 보간
  const scale = interpolate(progress, [0, 1], [motion.scaleStart, motion.scaleEnd]);

  // 패닝 보간
  const panX = interpolate(progress, [0, 1], [motion.panXStart, motion.panXEnd]);
  const panY = interpolate(progress, [0, 1], [motion.panYStart, motion.panYEnd]);

  // 회전 보간
  const rotate = interpolate(progress, [0, 1], [motion.rotateStart, motion.rotateEnd]);

  // 페이드 처리
  const fadeInOpacity = fadeIn
    ? interpolate(frame, [0, crossfadeFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const fadeOutOpacity = fadeOut
    ? interpolate(frame, [durationFrames - crossfadeFrames, durationFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const opacity = fadeInOpacity * fadeOutOpacity;

  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${panX}%, ${panY}%) rotate(${rotate}deg)`,
          transformOrigin: motion.transformOrigin,
        }}
      />
    </AbsoluteFill>
  );
};

export default CameraMotion;

// =============================================================================
// Scene Info Helper (공통 유틸리티)
// =============================================================================

export interface SceneInfo {
  image: string | undefined;
  cameraDirection: string | undefined;
  sceneIndex: number;
}

export function getSceneInfoForSentence(
  sentenceId: number,
  sceneImages?: string[],
  scenePrompts?: ScenePrompt[]
): SceneInfo {
  if (!sceneImages || sceneImages.length === 0) {
    return { image: undefined, cameraDirection: undefined, sceneIndex: 0 };
  }
  if (!scenePrompts || scenePrompts.length === 0) {
    return { image: sceneImages[0], cameraDirection: undefined, sceneIndex: 0 };
  }

  for (let i = 0; i < scenePrompts.length; i++) {
    const [start, end] = scenePrompts[i].sentenceRange;
    if (sentenceId >= start && sentenceId <= end) {
      return {
        image: sceneImages[i] || sceneImages[0],
        cameraDirection: scenePrompts[i].cameraDirection,
        sceneIndex: i,
      };
    }
  }

  const lastIndex = scenePrompts.length - 1;
  return {
    image: sceneImages[lastIndex] || sceneImages[0],
    cameraDirection: scenePrompts[lastIndex]?.cameraDirection,
    sceneIndex: lastIndex,
  };
}

// =============================================================================
// AnimatedSceneBackground Component
// =============================================================================

/** 이전 카메라 상태 (연속성을 위해) */
export interface PreviousCameraState {
  scale: number;
  panX: number;
  panY: number;
  rotate: number;
}

export interface AnimatedSceneBackgroundProps {
  sceneImage?: string;
  previousSceneImage?: string;
  cameraDirection?: string;
  durationFrames: number;
  audioDurationFrames: number;
  isSceneChange?: boolean;
  isLastScene?: boolean;
  crossfadeFrames?: number;
  dimOpacity?: number;
  objectPosition?: string;
  /** 이전 문장의 카메라 끝 상태 (같은 씬 내 연속성) */
  previousCameraState?: PreviousCameraState;
}

export const AnimatedSceneBackground: React.FC<AnimatedSceneBackgroundProps> = ({
  sceneImage,
  previousSceneImage,
  cameraDirection,
  durationFrames,
  audioDurationFrames,
  isSceneChange = false,
  isLastScene = false,
  crossfadeFrames = 20,
  dimOpacity = 0,
  objectPosition = 'center',
  previousCameraState,
}) => {
  const frame = useCurrentFrame();
  const motion = getCameraMotion(cameraDirection);

  // 진행률 계산
  const rawProgress = interpolate(frame, [0, audioDurationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const progress = motion.easing(rawProgress);

  // 시작값: 이전 상태가 있고 씬이 바뀌지 않았으면 이전 끝값에서 시작
  const usesContinuity = previousCameraState && !isSceneChange;

  const scaleStart = usesContinuity ? previousCameraState.scale : motion.scaleStart;
  const panXStart = usesContinuity ? previousCameraState.panX : motion.panXStart;
  const panYStart = usesContinuity ? previousCameraState.panY : motion.panYStart;
  const rotateStart = usesContinuity ? previousCameraState.rotate : motion.rotateStart;

  // 모션 값 계산 (이전 상태에서 현재 목표로)
  const scale = interpolate(progress, [0, 1], [scaleStart, motion.scaleEnd]);
  const panX = interpolate(progress, [0, 1], [panXStart, motion.panXEnd]);
  const panY = interpolate(progress, [0, 1], [panYStart, motion.panYEnd]);
  const rotate = interpolate(progress, [0, 1], [rotateStart, motion.rotateEnd]);

  // 크로스페이드
  const crossfadeOpacity =
    isSceneChange && previousSceneImage
      ? interpolate(frame, [0, crossfadeFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  // 마지막 씬 페이드아웃
  const fadeOutOpacity = isLastScene
    ? interpolate(frame, [durationFrames - crossfadeFrames, durationFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  if (!sceneImage) return null;

  return (
    <>
      {/* 이전 씬 (크로스페이드 아웃) */}
      {isSceneChange && previousSceneImage && (
        <AbsoluteFill style={{ opacity: 1 - crossfadeOpacity, overflow: 'hidden' }}>
          <Img
            src={staticFile(previousSceneImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition,
            }}
          />
          {dimOpacity > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
              }}
            />
          )}
        </AbsoluteFill>
      )}

      {/* 현재 씬 (카메라 모션 + 크로스페이드 인) */}
      <AbsoluteFill style={{ opacity: crossfadeOpacity * fadeOutOpacity, overflow: 'hidden' }}>
        <Img
          src={staticFile(sceneImage)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
            transform: `scale(${scale}) translate(${panX}%, ${panY}%) rotate(${rotate}deg)`,
            transformOrigin: motion.transformOrigin,
          }}
        />
        {dimOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
            }}
          />
        )}
      </AbsoluteFill>
    </>
  );
};
