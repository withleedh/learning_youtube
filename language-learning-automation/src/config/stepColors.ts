/**
 * Step Colors Configuration
 * 각 스텝별 메인 색상과 보색(배경용) 정의
 */

export interface StepColorConfig {
  /** 메인 색상 (숫자 배지, 강조) */
  primary: string;
  /** 보색 (전환 화면 배경) */
  complementary: string;
  /** 톤다운 배경색 (카드 배경용, 15% 투명도) */
  background: string;
}

// 스텝별 색상 설정
// primary: 인트로에서 사용하는 메인 색상
// complementary: 스텝 전환 화면 배경색 (보색 계열)
export const STEP_COLOR_CONFIG: StepColorConfig[] = [
  {
    primary: '#E53935', // 빨강
    complementary: '#8B2635', // 어두운 와인색 (이미지 참고)
    background: 'rgba(229, 57, 53, 0.15)',
  },
  {
    primary: '#FB8C00', // 주황
    complementary: '#8B5A00', // 어두운 주황/갈색
    background: 'rgba(251, 140, 0, 0.15)',
  },
  {
    primary: '#1E88E5', // 파랑
    complementary: '#1A4B7A', // 어두운 파랑
    background: 'rgba(30, 136, 229, 0.15)',
  },
  {
    primary: '#8E24AA', // 보라
    complementary: '#5C1A6B', // 어두운 보라
    background: 'rgba(142, 36, 170, 0.15)',
  },
];

/**
 * 스텝 인덱스로 색상 설정 가져오기
 */
export function getStepColors(stepIndex: number): StepColorConfig {
  return STEP_COLOR_CONFIG[stepIndex] ?? STEP_COLOR_CONFIG[0];
}

/**
 * 메인 색상 배열 (기존 호환용)
 */
export const STEP_COLORS = STEP_COLOR_CONFIG.map((c) => c.primary);

/**
 * 보색 배열
 */
export const STEP_COMPLEMENTARY_COLORS = STEP_COLOR_CONFIG.map((c) => c.complementary);
