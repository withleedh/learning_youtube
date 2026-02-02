/**
 * Performance-Based Pattern Selection System
 *
 * 경쟁 채널 "귀가 뚫리는 영어" 166개 영상 분석 기반
 * 조회수 가중치를 적용한 패턴 선택 시스템
 *
 * 핵심 전략:
 * 1. 고성과 패턴 우선 선택 (가중치 기반)
 * 2. 같은 패턴 내 주제 변형 (YouTube 쿼터 회피)
 * 3. 시의성 보너스 적용
 * 4. 최근 사용 패턴 페널티
 */

import type { Category } from './types';

// ============================================
// 1. 고성과 패턴 DB (분석 결과 기반)
// ============================================

export interface PerformancePattern {
  id: string;
  weight: number; // 전체 조회수 대비 비중
  avgViews: number; // 평균 조회수
  keywords: string[]; // 패턴 식별 키워드
  topExamples: string[]; // 실제 고성과 제목
  subjectVariations: string[]; // 주제 변형 가이드
  seasonalBonus: number[]; // 월별 보너스 (1-12월)
  compatibleCategories: Category[]; // 호환 카테고리
}

export const PERFORMANCE_PATTERNS: PerformancePattern[] = [
  {
    id: 'weather_seasonal',
    weight: 0.339,
    avgViews: 38281,
    keywords: ['한파', '폭염', '눈', '비', '겨울', '여름', '봄', '가을', '크리스마스', '새해'],
    topExamples: [
      '서울에 한파가 시작됐어요',
      '서울에 폭염이 시작됐어요',
      '추운 겨울날, 눈사람을 만들었어요',
    ],
    subjectVariations: [
      '날씨 변화 + 일상 영향',
      '계절 시작 + 감정',
      '날씨 + 특별한 활동',
      '기상 현상 + 추억',
    ],
    seasonalBonus: [1.5, 1.3, 1.0, 0.8, 0.7, 1.2, 1.5, 1.3, 1.0, 1.0, 1.2, 1.5],
    compatibleCategories: ['story', 'news', 'conversation'],
  },
  {
    id: 'practical_place',
    weight: 0.142,
    avgViews: 29432,
    keywords: ['카페', '공항', '호텔', '레스토랑', '편의점', '약국', '백화점', '시장', '병원'],
    topExamples: [
      '카페에서 커피를 주문해요',
      '비행기를 타러 공항에 갔어요',
      '영국 레스토랑에서 음식을 주문해요',
    ],
    subjectVariations: [
      '장소 + 특별한 상황',
      '장소 + 문제 해결',
      '장소 + 감정적 순간',
      '장소 + 문화 차이',
    ],
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.3, 1.3, 1.0, 1.0, 1.0, 1.0],
    compatibleCategories: ['conversation', 'travel_business'],
  },
  {
    id: 'travel',
    weight: 0.118,
    avgViews: 19957,
    keywords: ['여행', '비행기', '택시', '지하철', '버스', '입국', '체크인', '짐'],
    topExamples: [
      '비행기를 타러 공항에 갔어요',
      '영국 레스토랑에서 음식을 주문해요',
      '샌프란시스코 호텔에서 체크인을 해요',
    ],
    subjectVariations: [
      '여행지 + 특별한 경험',
      '이동 수단 + 에피소드',
      '여행 준비 + 감정',
      '여행 중 문제 + 해결',
    ],
    seasonalBonus: [0.8, 0.8, 1.0, 1.0, 1.2, 1.3, 1.5, 1.5, 1.2, 1.0, 0.9, 1.2],
    compatibleCategories: ['travel_business', 'conversation', 'story'],
  },
  {
    id: 'fairytale',
    weight: 0.106,
    avgViews: 23306,
    keywords: ['동화', '쥐', '개', '토끼', '거북이', '여우', '사자', '욕심', '교훈'],
    topExamples: [
      '시골 쥐와 도시 쥐, 누가 더 행복할까?',
      '욕심 많은 개의 비참한 최후',
      '한입 거리 생쥐의 놀라운 반전',
    ],
    subjectVariations: [
      '대비되는 두 캐릭터 비교 (A vs B)',
      '욕심/탐욕의 결말',
      '예상치 못한 반전',
      '작은 것의 승리',
    ],
    // 동화는 시의성 무관 - 보편적 교훈이 핵심
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    compatibleCategories: ['fairytale'],
  },
  {
    id: 'emotional_animal',
    weight: 0.054,
    avgViews: 40290, // 최고 평균 조회수!
    keywords: ['고양이', '강아지', '길고양이', '반려', '입양', '가출', '구조'],
    topExamples: ['길고양이를 집에 데려왔어요', '우리집 강아지가 가출했어요'],
    subjectVariations: [
      '동물 + 감동적 만남',
      '반려동물 + 에피소드',
      '동물 구조/입양 스토리',
      '동물과의 이별/재회',
    ],
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    compatibleCategories: ['story', 'news'],
  },
  {
    id: 'daily_relatable',
    weight: 0.05,
    avgViews: 26769,
    keywords: ['지각', '늦잠', '잃어버', '분실', '고장', '실수', '당황'],
    topExamples: [
      '늦잠을 자서 지각했어요',
      '지하철에서 지갑을 잃어버렸어요',
      '한여름에 에어컨이 고장났어요',
    ],
    subjectVariations: [
      '일상 실수 + 해결',
      '당황스러운 상황 + 대처',
      '예상치 못한 문제 + 감정',
      '공감되는 실수 + 교훈',
    ],
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.3, 1.2, 1.0, 1.0, 1.0, 1.0],
    compatibleCategories: ['story', 'conversation'],
  },
  {
    id: 'life_philosophy',
    weight: 0.035,
    avgViews: 32490,
    keywords: ['인생', '살아가는', '나이', '죽기 전', '후회', '행복'],
    topExamples: [
      '내가 열심히 살아가는 이유',
      '인생을 바꾸겠다고 결심한 날',
      '나이가 들수록 멋진 사람의 특징',
    ],
    subjectVariations: [
      '인생 교훈 + 개인 경험',
      '나이/시간 + 깨달음',
      '결심/변화의 순간',
      '행복/성공의 정의',
    ],
    seasonalBonus: [1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5],
    compatibleCategories: ['story', 'lesson'],
  },
  {
    id: 'self_improvement',
    weight: 0.037,
    avgViews: 17405,
    keywords: ['습관', '방법', '이유', '특징', '비결', '극복', '성공'],
    topExamples: [
      '내가 열심히 살아가는 이유',
      '나이가 들수록 멋진 사람의 특징',
      '작심삼일을 극복하는 5가지 방법',
    ],
    subjectVariations: ['숫자 + 방법/습관', '특정 유형의 특징', '극복/성공 스토리', '왜/이유 탐구'],
    seasonalBonus: [1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.3],
    compatibleCategories: ['lesson', 'story'],
  },
  {
    id: 'nostalgia',
    weight: 0.019,
    avgViews: 23636,
    keywords: ['어릴 때', '옛날', '첫사랑', '동창회', '추억', '살던 집'],
    topExamples: [
      '길에서 우연히 첫사랑을 만났어요',
      '어릴 때 살던 집에 방문하게 됐어요',
      '동창회에서 옛 친구들을 만났어요',
    ],
    subjectVariations: [
      '과거 장소 + 재방문',
      '옛 인연 + 우연한 만남',
      '추억 + 현재 감정',
      '시간의 흐름 + 변화',
    ],
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.0, 1.0, 1.3],
    compatibleCategories: ['story', 'conversation'],
  },
  {
    id: 'news',
    weight: 0.076,
    avgViews: 17694,
    keywords: ['뉴스', '발견', '인기', '화제', '세계', '한국'],
    topExamples: [
      '서울에 폭염이 시작됐어요',
      '한국 음식이 해외에서 큰 인기예요',
      '밭에서 돈다발이 발견됐어요',
    ],
    subjectVariations: [
      '한국 관련 + 세계 반응',
      '놀라운 발견/사건',
      '트렌드 + 인기',
      '시의성 있는 소식',
    ],
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    compatibleCategories: ['news'],
  },
  {
    id: 'announcement',
    weight: 0.029,
    avgViews: 21373,
    keywords: ['안내', '방송', '기내', '공지', '알림'],
    topExamples: [
      '기내 안내 방송 - 이륙 직후 & 순항 중',
      '기내 안내 방송 - 탑승 환영 & 이륙 준비',
      '기내에서 승무원에게 요청을 해요',
    ],
    subjectVariations: ['기내 방송 + 상황별', '공공장소 안내 + 반응', '안내 + 실제 대화'],
    seasonalBonus: [1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.3, 1.3, 1.0, 1.0, 1.0, 1.2],
    compatibleCategories: ['announcement', 'travel_business'],
  },
  {
    id: 'emotional_letter',
    weight: 0.005,
    avgViews: 9511,
    keywords: ['편지', '메시지', '군대', '입대', '작년의 나'],
    topExamples: ['작년의 나에게서 온 새해 메시지', '군 입대한 아들이 보낸 편지'],
    subjectVariations: ['시간을 넘는 메시지', '특별한 관계 + 편지', '감동적인 메시지 내용'],
    seasonalBonus: [1.5, 1.0, 1.0, 1.0, 1.2, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.3],
    compatibleCategories: ['story'],
  },
];

// ============================================
// 2. 가중치 기반 패턴 선택
// ============================================

export interface PatternSelectionResult {
  pattern: PerformancePattern;
  adjustedWeight: number;
  variationGuide: string;
}

/**
 * 카테고리에 호환되는 패턴 필터링
 */
export function getCompatiblePatterns(category: Category): PerformancePattern[] {
  return PERFORMANCE_PATTERNS.filter((p) => p.compatibleCategories.includes(category));
}

/**
 * 시의성 보너스 적용된 가중치 계산
 */
function calculateAdjustedWeight(
  pattern: PerformancePattern,
  month: number,
  recentPatternIds: string[]
): number {
  let weight = pattern.weight;

  // 시의성 보너스 적용
  const seasonalMultiplier = pattern.seasonalBonus[month - 1] || 1.0;
  weight *= seasonalMultiplier;

  // 평균 조회수 보너스 (높은 평균 조회수 패턴 우대)
  const avgViewsBonus = Math.log10(pattern.avgViews) / 5; // 0.8 ~ 1.0 범위
  weight *= avgViewsBonus;

  // 최근 사용 패턴 페널티
  const recentUseCount = recentPatternIds.filter((id) => id === pattern.id).length;
  if (recentUseCount > 0) {
    weight *= Math.pow(0.5, recentUseCount); // 사용할 때마다 50% 감소
  }

  return weight;
}

/**
 * 가중치 기반 패턴 선택 (룰렛 휠 방식)
 */
export function selectPatternByWeight(
  category: Category,
  recentPatternIds: string[] = []
): PatternSelectionResult {
  const month = new Date().getMonth() + 1;
  const compatiblePatterns = getCompatiblePatterns(category);

  if (compatiblePatterns.length === 0) {
    // 호환 패턴이 없으면 전체에서 선택
    const fallback = PERFORMANCE_PATTERNS[0];
    return {
      pattern: fallback,
      adjustedWeight: fallback.weight,
      variationGuide: fallback.subjectVariations[0],
    };
  }

  // 조정된 가중치 계산
  const weightedPatterns = compatiblePatterns.map((pattern) => ({
    pattern,
    adjustedWeight: calculateAdjustedWeight(pattern, month, recentPatternIds),
  }));

  // 총 가중치
  const totalWeight = weightedPatterns.reduce((sum, p) => sum + p.adjustedWeight, 0);

  // 룰렛 휠 선택
  let random = Math.random() * totalWeight;
  let selected = weightedPatterns[0];

  for (const wp of weightedPatterns) {
    random -= wp.adjustedWeight;
    if (random <= 0) {
      selected = wp;
      break;
    }
  }

  // 변형 가이드 랜덤 선택
  const variationGuide =
    selected.pattern.subjectVariations[
      Math.floor(Math.random() * selected.pattern.subjectVariations.length)
    ];

  return {
    pattern: selected.pattern,
    adjustedWeight: selected.adjustedWeight,
    variationGuide,
  };
}

/**
 * 패턴 기반 주제 생성 프롬프트
 */
export function buildPatternBasedPrompt(selection: PatternSelectionResult): string {
  const { pattern, variationGuide } = selection;

  return `## 🎯 고성과 패턴 가이드

### 선택된 패턴: ${pattern.id.toUpperCase()}
- 평균 조회수: ${pattern.avgViews.toLocaleString()}
- 핵심 키워드: ${pattern.keywords.slice(0, 5).join(', ')}

### 실제 고성과 제목 (참고만, 복사 금지!)
${pattern.topExamples.map((ex) => `- "${ex}"`).join('\n')}

### 이번 주제 변형 방향
**${variationGuide}**

### ⚠️ 중요 규칙
1. 위 예시를 **그대로 복사하지 마세요**
2. 같은 패턴이지만 **다른 소재/상황**으로 변형하세요
3. 핵심 키워드를 활용하되 **새로운 조합**을 만드세요
4. 감정적 공감 + 구체적 상황 = 클릭 유도

### 변형 예시
- "서울에 한파가 시작됐어요" → "부산에 첫눈이 내렸어요"
- "길고양이를 집에 데려왔어요" → "버려진 강아지를 발견했어요"
- "카페에서 커피를 주문해요" → "처음 가본 빵집에서 주문해요"`;
}

// ============================================
// 3. 패턴 히스토리 관리
// ============================================

export interface PatternHistory {
  date: string;
  patternId: string;
  topic: string;
}

/**
 * 최근 사용된 패턴 ID 추출
 */
export function extractRecentPatternIds(history: PatternHistory[], days: number = 14): string[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  return history.filter((h) => h.date >= cutoffStr).map((h) => h.patternId);
}

/**
 * 주제에서 패턴 ID 추론
 */
export function inferPatternFromTopic(topic: string): string | null {
  for (const pattern of PERFORMANCE_PATTERNS) {
    if (pattern.keywords.some((kw) => topic.includes(kw))) {
      return pattern.id;
    }
  }
  return null;
}
