/**
 * Intro Asset Types
 * 채널별 인트로 에셋 생성 및 관리를 위한 타입 정의
 */

export interface IntroAssetConfig {
  channelId: string;
  channelName: string;
  targetLanguage: string;
  nativeLanguage: string;
  primaryColor: string;
  secondaryColor: string;
  style: IntroStyle;
}

export type IntroStyle =
  | 'modern' // 깔끔한 모던 스타일
  | 'neon' // 네온 글로우 효과
  | 'gradient' // 그라데이션 배경
  | 'minimal' // 미니멀리스트
  | 'cinematic'; // 영화같은 시네마틱

export interface IntroAssets {
  /** 인트로 배경 이미지 (1920x1080) */
  backgroundImage: string;
  /** 로고 이미지 (투명 배경 PNG) */
  logoImage: string;
  /** 스텝 아이콘들 */
  stepIcons: string[];
  /** 바이럴 문구 TTS 경로 */
  viralTtsPath?: string;
  /** 가이드 문구 TTS 경로 */
  guideTtsPath?: string;
  /** 생성 일시 */
  generatedAt: string;
  /** 사용된 스타일 */
  style: IntroStyle;
}

export interface IntroGeneratorOptions {
  /** 출력 디렉토리 */
  outputDir: string;
  /** 강제 재생성 여부 */
  force?: boolean;
}

/** 스텝 정보 (다국어 지원) */
export interface StepInfo {
  number: number;
  title: string;
  description: string;
  icon: string;
}

/** 인트로 텍스트 설정 */
export interface IntroTextConfig {
  title: string; // "오늘의 학습 순서" 등
  steps: StepInfo[];
}
