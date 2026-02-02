/**
 * Topic Combination Generator
 *
 * YouTube 쿼터 문제 해결을 위한 주제 변형/조합 시스템
 * - 동일 주제 반복 방지
 * - [테마] × [상황] × [감정] 매트릭스
 * - 계절/시즌 레이어
 */

import type { Category } from './types';

// ============================================
// 1. 테마 (Theme) - 큰 주제 영역
// ============================================

export interface Theme {
  id: string;
  name: string;
  nameKo: string;
  subThemes: string[];
}

export const THEMES: Theme[] = [
  {
    id: 'family',
    name: 'Family & Relationships',
    nameKo: '가족/관계',
    subThemes: [
      'parents',
      'siblings',
      'grandparents',
      'childhood',
      'reunion',
      'conflict',
      'reconciliation',
    ],
  },
  {
    id: 'work',
    name: 'Work & Career',
    nameKo: '직장/커리어',
    subThemes: [
      'interview',
      'promotion',
      'resignation',
      'coworkers',
      'boss',
      'project',
      'deadline',
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Adventure',
    nameKo: '여행/모험',
    subThemes: ['airport', 'hotel', 'restaurant', 'lost', 'discovery', 'culture', 'language'],
  },
  {
    id: 'daily',
    name: 'Daily Life',
    nameKo: '일상',
    subThemes: ['cafe', 'shopping', 'cooking', 'cleaning', 'exercise', 'hobby', 'routine'],
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    nameKo: '건강/웰빙',
    subThemes: ['hospital', 'checkup', 'diet', 'sleep', 'stress', 'recovery', 'habit'],
  },
  {
    id: 'growth',
    name: 'Personal Growth',
    nameKo: '자기계발',
    subThemes: ['goal', 'habit', 'learning', 'failure', 'success', 'motivation', 'change'],
  },
  {
    id: 'memory',
    name: 'Memory & Nostalgia',
    nameKo: '추억/향수',
    subThemes: ['childhood', 'old_place', 'old_friend', 'lost_item', 'letter', 'photo', 'reunion'],
  },
  {
    id: 'nature',
    name: 'Nature & Seasons',
    nameKo: '자연/계절',
    subThemes: ['spring', 'summer', 'autumn', 'winter', 'weather', 'garden', 'animal'],
  },
];

// ============================================
// 2. 상황 (Situation) - 구체적 맥락
// ============================================

export interface Situation {
  id: string;
  name: string;
  nameKo: string;
  triggers: string[]; // 상황을 촉발하는 요소
}

export const SITUATIONS: Situation[] = [
  {
    id: 'unexpected_visit',
    name: 'Unexpected Visit',
    nameKo: '예상치 못한 방문',
    triggers: ['repair call', 'delivery', 'old address', 'wrong door', 'surprise guest'],
  },
  {
    id: 'chance_encounter',
    name: 'Chance Encounter',
    nameKo: '우연한 만남',
    triggers: ['street', 'cafe', 'airport', 'elevator', 'waiting room'],
  },
  {
    id: 'discovery',
    name: 'Discovery',
    nameKo: '발견',
    triggers: ['old item', 'hidden letter', 'secret', 'truth', 'lost memory'],
  },
  {
    id: 'decision_moment',
    name: 'Decision Moment',
    nameKo: '결정의 순간',
    triggers: ['crossroads', 'deadline', 'opportunity', 'risk', 'choice'],
  },
  {
    id: 'problem_solving',
    name: 'Problem Solving',
    nameKo: '문제 해결',
    triggers: ['breakdown', 'lost item', 'misunderstanding', 'conflict', 'emergency'],
  },
  {
    id: 'celebration',
    name: 'Celebration',
    nameKo: '축하/기념',
    triggers: ['birthday', 'anniversary', 'achievement', 'holiday', 'reunion'],
  },
  {
    id: 'transition',
    name: 'Life Transition',
    nameKo: '인생 전환점',
    triggers: ['moving', 'graduation', 'retirement', 'new job', 'marriage'],
  },
  {
    id: 'reflection',
    name: 'Reflection',
    nameKo: '회고/성찰',
    triggers: ['year end', 'milestone', 'quiet moment', 'old photo', 'anniversary'],
  },
];

// ============================================
// 3. 감정 (Emotion) - 핵심 감정 요소
// ============================================

export interface Emotion {
  id: string;
  name: string;
  nameKo: string;
  intensity: 'low' | 'medium' | 'high';
  relatedEmotions: string[];
}

export const EMOTIONS: Emotion[] = [
  {
    id: 'nostalgia',
    name: 'Nostalgia',
    nameKo: '향수/그리움',
    intensity: 'medium',
    relatedEmotions: ['longing', 'warmth', 'bittersweet'],
  },
  {
    id: 'surprise',
    name: 'Surprise',
    nameKo: '놀라움',
    intensity: 'high',
    relatedEmotions: ['shock', 'wonder', 'disbelief'],
  },
  {
    id: 'gratitude',
    name: 'Gratitude',
    nameKo: '감사',
    intensity: 'medium',
    relatedEmotions: ['appreciation', 'warmth', 'humility'],
  },
  {
    id: 'determination',
    name: 'Determination',
    nameKo: '결심/의지',
    intensity: 'high',
    relatedEmotions: ['resolve', 'courage', 'hope'],
  },
  {
    id: 'relief',
    name: 'Relief',
    nameKo: '안도',
    intensity: 'medium',
    relatedEmotions: ['calm', 'peace', 'release'],
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    nameKo: '호기심',
    intensity: 'medium',
    relatedEmotions: ['wonder', 'interest', 'excitement'],
  },
  {
    id: 'warmth',
    name: 'Warmth',
    nameKo: '따뜻함',
    intensity: 'low',
    relatedEmotions: ['love', 'comfort', 'connection'],
  },
  {
    id: 'growth',
    name: 'Growth',
    nameKo: '성장',
    intensity: 'medium',
    relatedEmotions: ['learning', 'change', 'maturity'],
  },
];

// ============================================
// 4. 계절/시즌 레이어
// ============================================

export interface SeasonalContext {
  month: number;
  season: string;
  seasonKo: string;
  events: string[];
  moods: string[];
  visualElements: string[];
}

export const SEASONAL_CONTEXTS: SeasonalContext[] = [
  {
    month: 1,
    season: 'winter',
    seasonKo: '겨울',
    events: ['new year', 'resolution', 'cold wave', 'snow'],
    moods: ['fresh start', 'reflection', 'cozy', 'hopeful'],
    visualElements: ['snow', 'warm drinks', 'fireplace', 'winter clothes'],
  },
  {
    month: 2,
    season: 'winter',
    seasonKo: '겨울',
    events: ['valentine', 'lunar new year', 'graduation season'],
    moods: ['romantic', 'family', 'transition'],
    visualElements: ['hearts', 'traditional food', 'cold weather'],
  },
  {
    month: 3,
    season: 'spring',
    seasonKo: '봄',
    events: ['spring start', 'new semester', 'cherry blossom'],
    moods: ['fresh', 'hopeful', 'new beginning'],
    visualElements: ['flowers', 'warm breeze', 'light clothes'],
  },
  {
    month: 4,
    season: 'spring',
    seasonKo: '봄',
    events: ['cherry blossom peak', 'outdoor activities'],
    moods: ['joyful', 'energetic', 'romantic'],
    visualElements: ['pink blossoms', 'picnic', 'sunshine'],
  },
  {
    month: 5,
    season: 'spring',
    seasonKo: '봄',
    events: ['family month', 'parents day', 'teachers day'],
    moods: ['grateful', 'family-oriented', 'appreciative'],
    visualElements: ['carnations', 'family gatherings', 'gifts'],
  },
  {
    month: 6,
    season: 'summer',
    seasonKo: '여름',
    events: ['summer start', 'vacation planning', 'rainy season'],
    moods: ['anticipation', 'planning', 'refreshing'],
    visualElements: ['rain', 'umbrella', 'green leaves'],
  },
  {
    month: 7,
    season: 'summer',
    seasonKo: '여름',
    events: ['summer vacation', 'beach', 'heat wave'],
    moods: ['adventurous', 'relaxed', 'energetic'],
    visualElements: ['beach', 'sun', 'ice cream', 'swimming'],
  },
  {
    month: 8,
    season: 'summer',
    seasonKo: '여름',
    events: ['vacation peak', 'independence day', 'back to school prep'],
    moods: ['nostalgic', 'transitional', 'reflective'],
    visualElements: ['sunset', 'travel', 'summer memories'],
  },
  {
    month: 9,
    season: 'autumn',
    seasonKo: '가을',
    events: ['chuseok', 'harvest', 'new semester'],
    moods: ['grateful', 'family', 'reflective'],
    visualElements: ['full moon', 'traditional food', 'falling leaves'],
  },
  {
    month: 10,
    season: 'autumn',
    seasonKo: '가을',
    events: ['autumn foliage', 'halloween', 'hangul day'],
    moods: ['cozy', 'nostalgic', 'cultural'],
    visualElements: ['red leaves', 'pumpkins', 'warm colors'],
  },
  {
    month: 11,
    season: 'autumn',
    seasonKo: '가을',
    events: ['suneung', 'thanksgiving', 'year-end prep'],
    moods: ['supportive', 'grateful', 'anticipatory'],
    visualElements: ['bare trees', 'warm drinks', 'cozy interiors'],
  },
  {
    month: 12,
    season: 'winter',
    seasonKo: '겨울',
    events: ['christmas', 'year-end', 'new year eve'],
    moods: ['festive', 'reflective', 'hopeful'],
    visualElements: ['snow', 'lights', 'gifts', 'gatherings'],
  },
];

// ============================================
// 5. 주제 조합 생성기
// ============================================

export interface TopicCombination {
  theme: Theme;
  subTheme: string;
  situation: Situation;
  emotion: Emotion;
  seasonalContext: SeasonalContext;
  generatedTopic: string;
  generatedTopicKo: string;
}

/**
 * 현재 월에 맞는 계절 컨텍스트 가져오기
 */
export function getCurrentSeasonalContext(): SeasonalContext {
  const currentMonth = new Date().getMonth() + 1;
  return SEASONAL_CONTEXTS.find((s) => s.month === currentMonth) || SEASONAL_CONTEXTS[0];
}

/**
 * 카테고리에 적합한 테마 필터링
 */
export function getThemesForCategory(category: Category): Theme[] {
  const categoryThemeMap: Record<Category, string[]> = {
    story: ['family', 'memory', 'growth', 'work'],
    conversation: ['daily', 'health', 'growth', 'travel'],
    news: ['nature', 'health', 'work', 'daily'],
    announcement: ['travel', 'daily', 'work'],
    travel_business: ['travel', 'work', 'daily'],
    lesson: ['growth', 'health', 'work', 'daily'],
    fairytale: ['nature', 'growth', 'family'],
  };

  const themeIds = categoryThemeMap[category] || ['daily', 'growth'];
  return THEMES.filter((t) => themeIds.includes(t.id));
}

/**
 * 카테고리에 적합한 상황 필터링
 */
export function getSituationsForCategory(category: Category): Situation[] {
  const categorySituationMap: Record<Category, string[]> = {
    story: ['unexpected_visit', 'chance_encounter', 'discovery', 'reflection'],
    conversation: ['decision_moment', 'celebration', 'problem_solving'],
    news: ['discovery', 'transition', 'celebration'],
    announcement: ['problem_solving', 'transition'],
    travel_business: ['problem_solving', 'discovery', 'celebration'],
    lesson: ['decision_moment', 'reflection', 'transition'],
    fairytale: ['discovery', 'decision_moment', 'transition'],
  };

  const situationIds = categorySituationMap[category] || ['discovery', 'reflection'];
  return SITUATIONS.filter((s) => situationIds.includes(s.id));
}

/**
 * 랜덤 요소 선택 (가중치 적용 가능)
 */
function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 주제 조합 생성
 */
export function generateTopicCombination(
  category: Category,
  recentTopics: string[] = []
): TopicCombination {
  const themes = getThemesForCategory(category);
  const situations = getSituationsForCategory(category);
  const seasonalContext = getCurrentSeasonalContext();

  // 최근 사용된 테마/상황 회피
  const availableThemes = themes.filter(
    (t) =>
      !recentTopics.some((topic) => t.subThemes.some((sub) => topic.toLowerCase().includes(sub)))
  );
  const availableSituations = situations.filter(
    (s) =>
      !recentTopics.some((topic) =>
        s.triggers.some((trigger) => topic.toLowerCase().includes(trigger))
      )
  );

  const theme = randomPick(availableThemes.length > 0 ? availableThemes : themes);
  const subTheme = randomPick(theme.subThemes);
  const situation = randomPick(availableSituations.length > 0 ? availableSituations : situations);
  const emotion = randomPick(EMOTIONS);

  return {
    theme,
    subTheme,
    situation,
    emotion,
    seasonalContext,
    generatedTopic: '', // LLM이 생성
    generatedTopicKo: '', // LLM이 생성
  };
}

/**
 * 주제 조합을 프롬프트로 변환
 */
export function buildCombinationPrompt(combination: TopicCombination): string {
  return `## 주제 조합 가이드

### 테마
- 영역: ${combination.theme.nameKo} (${combination.theme.name})
- 세부: ${combination.subTheme}

### 상황
- 유형: ${combination.situation.nameKo} (${combination.situation.name})
- 트리거: ${combination.situation.triggers.slice(0, 3).join(', ')}

### 감정
- 핵심: ${combination.emotion.nameKo} (${combination.emotion.name})
- 강도: ${combination.emotion.intensity}
- 관련: ${combination.emotion.relatedEmotions.join(', ')}

### 계절 컨텍스트 (${combination.seasonalContext.month}월)
- 계절: ${combination.seasonalContext.seasonKo}
- 이벤트: ${combination.seasonalContext.events.join(', ')}
- 분위기: ${combination.seasonalContext.moods.join(', ')}
- 시각 요소: ${combination.seasonalContext.visualElements.join(', ')}

이 조합을 바탕으로 구체적이고 감성적인 주제를 생성하세요.
단, 위 요소들을 직접적으로 나열하지 말고, 자연스러운 스토리 상황으로 녹여내세요.`;
}

// ============================================
// 6. 주제 변형 전략
// ============================================

export interface TopicTransformation {
  strategy: string;
  description: string;
  example: {
    original: string;
    transformed: string;
  };
}

export const TOPIC_TRANSFORMATIONS: TopicTransformation[] = [
  {
    strategy: 'perspective_shift',
    description: '시점 변경 - 같은 상황을 다른 시점에서',
    example: {
      original: '카페에서 커피를 주문해요',
      transformed: '바리스타가 특별한 손님을 만났어요',
    },
  },
  {
    strategy: 'time_shift',
    description: '시간 변경 - 과거/현재/미래로 이동',
    example: {
      original: '새해 목표를 세워요',
      transformed: '작년의 나에게서 온 새해 메시지',
    },
  },
  {
    strategy: 'emotion_amplify',
    description: '감정 증폭 - 일상에 감정적 깊이 추가',
    example: {
      original: '집을 수리해요',
      transformed: '어릴 때 살던 집에 방문하게 됐어요',
    },
  },
  {
    strategy: 'unexpected_twist',
    description: '예상치 못한 반전 추가',
    example: {
      original: '엘리베이터를 타요',
      transformed: '새해 직전, 엘리베이터에 갇혔어요',
    },
  },
  {
    strategy: 'question_format',
    description: '질문 형식으로 호기심 유발',
    example: {
      original: '겨울 날씨예요',
      transformed: '겨울을 좋아하세요, 싫어하세요?',
    },
  },
  {
    strategy: 'number_structure',
    description: '숫자 구조로 명확성 추가',
    example: {
      original: '돈을 아끼는 방법',
      transformed: '돈이 줄줄 새는 사람들의 5가지 습관',
    },
  },
  {
    strategy: 'why_question',
    description: '이유/원인 탐구',
    example: {
      original: '산타는 빨간 옷을 입어요',
      transformed: '산타클로스는 왜 빨간 옷을 입을까?',
    },
  },
];

/**
 * 주제 변형 전략 프롬프트 생성
 */
export function buildTransformationPrompt(): string {
  return `## 주제 변형 전략

평범한 주제를 클릭하고 싶은 주제로 변형하세요:

${TOPIC_TRANSFORMATIONS.map(
  (t) => `
### ${t.strategy}
- ${t.description}
- 예: "${t.example.original}" → "${t.example.transformed}"`
).join('\n')}

**핵심 원칙:**
1. 구체적 상황 > 추상적 개념
2. 감정적 연결 > 정보 나열
3. 호기심 유발 > 직접적 설명
4. 개인적 경험 > 일반적 사실`;
}
