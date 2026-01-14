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
  background?: string;
}

// 기본 스텝별 색상 설정 (블루-틸 그라데이션 조화)
// 차분하고 세련된 느낌의 색상 팔레트
export const DEFAULT_STEP_COLOR_CONFIG: StepColorConfig[] = [
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

// 기존 호환용 (deprecated)
export const STEP_COLOR_CONFIG = DEFAULT_STEP_COLOR_CONFIG;

/**
 * 스텝 인덱스로 색상 설정 가져오기
 * @param stepIndex 스텝 인덱스 (0-3)
 * @param customColors 채널별 커스텀 색상 (optional)
 */
export function getStepColors(
  stepIndex: number,
  customColors?: Array<{ primary: string; complementary: string }>
): StepColorConfig {
  // 커스텀 색상이 있으면 사용
  if (customColors && customColors[stepIndex]) {
    const custom = customColors[stepIndex];
    return {
      primary: custom.primary,
      complementary: custom.complementary,
      background: hexToRgba(custom.primary, 0.15),
    };
  }

  return DEFAULT_STEP_COLOR_CONFIG[stepIndex] ?? DEFAULT_STEP_COLOR_CONFIG[0];
}

/**
 * HEX 색상을 RGBA로 변환
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 메인 색상 배열 (기존 호환용)
 */
export const STEP_COLORS = DEFAULT_STEP_COLOR_CONFIG.map((c) => c.primary);

/**
 * 보색 배열
 */
export const STEP_COMPLEMENTARY_COLORS = DEFAULT_STEP_COLOR_CONFIG.map((c) => c.complementary);
