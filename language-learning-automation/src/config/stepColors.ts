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

// 스텝별 색상 설정 (블루-틸 그라데이션 조화)
// 차분하고 세련된 느낌의 색상 팔레트
export const STEP_COLOR_CONFIG: StepColorConfig[] = [
  {
    primary: '#3B82F6', // 밝은 파랑
    complementary: '#1E3A5F', // 어두운 네이비
    background: 'rgba(59, 130, 246, 0.15)',
  },
  {
    primary: '#06B6D4', // 시안/틸
    complementary: '#164E63', // 어두운 틸
    background: 'rgba(6, 182, 212, 0.15)',
  },
  {
    primary: '#8B5CF6', // 바이올렛
    complementary: '#4C1D95', // 어두운 바이올렛
    background: 'rgba(139, 92, 246, 0.15)',
  },
  {
    primary: '#10B981', // 에메랄드
    complementary: '#065F46', // 어두운 에메랄드
    background: 'rgba(16, 185, 129, 0.15)',
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
