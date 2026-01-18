/**
 * 인기 영상 패턴 DB
 * 귀가 뚫리는 영어 채널 인기 영상 분석 기반
 */

import type { Category } from './types';

/**
 * 고성과 제목 패턴 (조회수 분석 기반)
 */
export const HIGH_PERFORMANCE_PATTERNS = {
  // 조회수 10만+ 영상 패턴
  top_tier: [
    { pattern: '~에 ~가 시작됐어요', example: '서울에 한파가 시작됐어요', avgViews: '500K+' },
    { pattern: '~날, ~을 만들었어요', example: '추운 겨울날, 눈사람을 만들었어요', avgViews: '60K+' },
    { pattern: '내가 ~하는 이유', example: '내가 열심히 살아가는 이유', avgViews: '50K+' },
    { pattern: '~겠다고 결심한 날', example: '인생을 바꾸겠다고 결심한 날', avgViews: '45K+' },
  ],
  
  // 조회수 2-5만 영상 패턴
  high_tier: [
    { pattern: '당신의 ~은 무엇인가요?', example: '당신의 취미는 무엇인가요?' },
    { pattern: '당신의 ~은 어땠나요?', example: '당신의 2025년은 어땠나요?' },
    { pattern: '~을 좋아하세요, 싫어하세요?', example: '겨울을 좋아하세요, 싫어하세요?' },
    { pattern: '~에 약속 있으세요?', example: '크리스마스에 약속 있으세요?' },
    { pattern: '~을 보러 갔어요', example: '2026년 새해 일출을 보러 갔어요' },
  ],
  
  // 스토리 패턴
  story_patterns: [
    { pattern: '~에서 ~을 만났어요', example: '동창회에서 옛 친구들을 만났어요' },
    { pattern: '~하게 됐어요', example: '어릴 때 살던 집에 방문하게 됐어요' },
    { pattern: '~에서 온 ~', example: '작년의 나에게서 온 새해 메시지' },
    { pattern: '~에 갇혔어요', example: '새해 직전, 엘리베이터에 갇혔어요' },
    { pattern: '이번 ~에는 제가 ~예요', example: '이번 크리스마스에는 제가 산타예요' },
  ],
  
  // 교훈/정보 패턴
  lesson_patterns: [
    { pattern: '~하는 사람들의 N가지 습관', example: '돈이 줄줄 새는 사람들의 5가지 습관' },
    { pattern: '~을 극복하는 N가지 방법', example: '작심삼일을 극복하는 5가지 방법' },
    { pattern: '~하기 전에 후회하는 N가지', example: '사람들이 죽기 전에 후회하는 5가지' },
    { pattern: '~은 왜 ~할까?', example: '산타클로스는 왜 빨간 옷을 입을까?' },
    { pattern: '~하는 이유', example: '겨울에 눈이 내리는 이유' },
    { pattern: '~하지 않는 법', example: '남들에게 만만해 보이지 않는 법' },
  ],
  
  // 동화/힐링 패턴
  fairytale_patterns: [
    { pattern: '~에서 가장 ~한 ~', example: '정원에서 가장 늦게 피어난 꽃' },
    { pattern: '~하게 만들어주는 ~', example: '행복하게 만들어주는 자판기' },
    { pattern: '~이 되고 싶었던 ~', example: '크리스마스 트리가 되고 싶었던 작은 나무' },
    { pattern: '세상에서 가장 ~한 ~', example: '세상에서 가장 값진 선물' },
    { pattern: '~하면 안 되는 이유', example: '적과 타협하면 안 되는 이유' },
    { pattern: '~하면 생기는 일', example: '타인의 말에 휘둘리면 생기는 일' },
  ],
};

/**
 * 감정/호기심 트리거 키워드
 */
export const EMOTION_TRIGGERS = {
  // 감동/공감
  emotional: ['감동', '눈물', '추억', '그리움', '행복', '따뜻', '사랑', '가족', '친구'],
  
  // 호기심
  curiosity: ['비밀', '이유', '왜', '진실', '놀라운', '깜짝', '반전'],
  
  // 공포/긴장
  tension: ['갇혔어요', '잃어버렸어요', '사라졌어요', '위험', '급하게'],
  
  // 성취/변화
  achievement: ['해냈어요', '성공했어요', '바뀌었어요', '극복했어요', '결심한'],
  
  // 공감 상황
  relatable: [
    '건강검진', '면접', '출장', '동창회', '이사', '명절', '연말', '월급',
    '다이어트', '야근', '휴가', '퇴사', '이직', '결혼', '육아',
  ],
};

/**
 * 월별 추천 키워드
 */
export const SEASONAL_KEYWORDS: Record<number, string[]> = {
  1: ['새해', '신년', '다짐', '목표', '겨울', '한파', '새 시작', '일출'],
  2: ['발렌타인', '초콜릿', '고백', '사랑', '겨울', '설날', '세뱃돈'],
  3: ['봄', '졸업', '입학', '벚꽃', '새 시작', '꽃샘추위'],
  4: ['봄', '벚꽃', '피크닉', '나들이', '새싹', '만우절'],
  5: ['가정의달', '어버이날', '스승의날', '여행', '연휴'],
  6: ['여름', '장마', '휴가계획', '더위', '에어컨'],
  7: ['여름휴가', '바다', '수영', '무더위', '피서'],
  8: ['휴가', '여행', '해변', '바캉스', '무더위', '열대야'],
  9: ['가을', '추석', '명절', '귀향', '한가위', '단풍'],
  10: ['가을', '단풍', '할로윈', '독서', '낙엽', '쌀쌀'],
  11: ['가을', '낙엽', '수능', '채용', '연말준비', '김장'],
  12: ['크리스마스', '연말', '송년회', '겨울', '눈', '산타', '선물', '회고'],
};

/**
 * 카테고리별 추천 주제 패턴 반환
 */
export function getCategoryPatterns(category: Category): Array<{ pattern: string; example: string }> {
  switch (category) {
    case 'story':
      return HIGH_PERFORMANCE_PATTERNS.story_patterns;
    case 'lesson':
      return HIGH_PERFORMANCE_PATTERNS.lesson_patterns;
    case 'fairytale':
      return HIGH_PERFORMANCE_PATTERNS.fairytale_patterns;
    default:
      return [
        ...HIGH_PERFORMANCE_PATTERNS.top_tier,
        ...HIGH_PERFORMANCE_PATTERNS.high_tier,
      ];
  }
}

/**
 * 현재 월에 맞는 시즌 키워드 반환
 */
export function getSeasonalKeywords(month?: number): string[] {
  const currentMonth = month ?? (new Date().getMonth() + 1);
  return SEASONAL_KEYWORDS[currentMonth] || [];
}

/**
 * 프롬프트에 삽입할 고성과 패턴 문자열 생성
 */
export function buildHighPerformancePatternsPrompt(category: Category, month?: number): string {
  const patterns = getCategoryPatterns(category);
  const seasonal = getSeasonalKeywords(month);
  const emotionList = Object.values(EMOTION_TRIGGERS).flat().slice(0, 15);
  
  return `
## 🔥 고성과 제목 패턴 (조회수 분석)
${patterns
  .slice(0, 5)
  .map((p) => `- "${p.pattern}" → 예: "${p.example}"`)
  .join('\n')}

## 🎯 감정 트리거 키워드 (클릭율 높음)
${emotionList.join(', ')}

## 📅 ${month ?? new Date().getMonth() + 1}월 시즌 키워드
${seasonal.join(', ')}
`;
}
