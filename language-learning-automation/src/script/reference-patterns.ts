/**
 * Reference Pattern Database
 *
 * 타겟 채널 "귀가 뚫리는 영어" 분석 기반 패턴 DB
 * - 문장 스타일, 감정 흐름, 구조 패턴 추출
 * - Few-shot 학습용 (문장 복사 X, 패턴만 학습)
 */

import type { Category } from './types';

// ============================================
// 1. 문장 스타일 패턴
// ============================================

export interface SentenceStylePattern {
  category: Category;
  characteristics: string[];
  wordCount: { min: number; max: number };
  sentenceStructures: string[];
  emotionalTone: string[];
  examplePatterns: string[]; // 패턴만, 실제 문장 X
}

export const SENTENCE_STYLE_PATTERNS: Record<Category, SentenceStylePattern> = {
  story: {
    category: 'story',
    characteristics: [
      '1인칭 회상 시점 (I remember, One day, Last year)',
      '감정 변화가 있는 서사 흐름',
      '구체적 디테일 (장소, 시간, 감각)',
      '반전 또는 깨달음으로 마무리',
    ],
    wordCount: { min: 5, max: 12 },
    sentenceStructures: [
      'I [verb] as a [job/role].',
      'One day, I [past verb] to [action].',
      'The [noun] seemed [adjective].',
      'When I [past verb], I [past verb].',
      'It was the [noun] where I [past verb].',
      'Many [adjective] [noun] came [verb]ing back.',
      '[Noun], my [body part] began to [verb].',
      'That day, the [noun] finally [past verb] my [noun].',
    ],
    emotionalTone: ['nostalgic', 'reflective', 'bittersweet', 'heartwarming'],
    examplePatterns: [
      '직업/상황 소개 → 특별한 사건 발생 → 과거 연결 발견 → 감정적 클라이맥스 → 깨달음/여운',
    ],
  },

  conversation: {
    category: 'conversation',
    characteristics: [
      '자연스러운 질문-대답 흐름',
      '리액션 표현 (Oh!, Really?, That sounds...)',
      "감정 공유 (I was excited, That's disappointing)",
      '서로의 말에 반응하며 진행',
    ],
    wordCount: { min: 4, max: 10 },
    sentenceStructures: [
      'What are you [verb]ing right now?',
      "I'm [verb]ing my [noun] for [event].",
      'That sounds [adjective].',
      'Yes, I heard [verb]ing [noun] helps me [verb].',
      'What [noun] do you have?',
      'First, I want to [verb] [noun].',
      "That's a [adjective] goal.",
      'You should try it.',
      "Let's [verb] and [verb].",
    ],
    emotionalTone: ['friendly', 'supportive', 'curious', 'encouraging'],
    examplePatterns: ['상황 질문 → 계획/목표 공유 → 구체적 내용 → 격려/공감 → 함께 다짐'],
  },

  news: {
    category: 'news',
    characteristics: [
      '객관적 정보 전달',
      '구체적 숫자/통계 활용',
      '현재 시제 중심',
      '전문가 의견 또는 전망으로 마무리',
    ],
    wordCount: { min: 6, max: 12 },
    sentenceStructures: [
      '[Subject] is becoming very [adjective] around the world.',
      'Many people in [place] enjoy [noun].',
      'This trend has grown [adverb] in recent years.',
      '[Noun] is known for its [adjective] [noun].',
      '[Adjective] [noun] are especially popular with [group].',
      'Many [experts] say [noun] is [adjective] for [noun].',
    ],
    emotionalTone: ['informative', 'objective', 'engaging', 'surprising'],
    examplePatterns: ['핵심 뉴스 → 배경 설명 → 구체적 사례 → 영향/의미 → 전망'],
  },

  announcement: {
    category: 'announcement',
    characteristics: [
      '정중하고 명확한 톤',
      '시간, 장소, 변경사항 명시',
      '사과 또는 감사 표현',
      '추가 안내로 마무리',
    ],
    wordCount: { min: 5, max: 10 },
    sentenceStructures: [
      'Attention all [noun].',
      'We have an important announcement.',
      '[Noun] has been [past participle].',
      'The new [noun] is [time/place].',
      'We apologize for any inconvenience.',
      'Please [verb] in the [place].',
      '[Adjective] [noun] will be provided.',
    ],
    emotionalTone: ['polite', 'clear', 'apologetic', 'helpful'],
    examplePatterns: ['주의 환기 → 핵심 안내 → 변경 사항 → 사과/보상 → 추가 안내'],
  },

  travel_business: {
    category: 'travel_business',
    characteristics: [
      '실용적 표현 중심',
      '요청, 확인, 문제 해결 상황',
      '정중하면서 자연스러운 톤',
      '구체적 정보 교환',
    ],
    wordCount: { min: 5, max: 12 },
    sentenceStructures: [
      'Hello, I have a reservation under [name].',
      'Let me check that for you.',
      'Yes, I found your [noun].',
      'Is my [noun] ready?',
      'Your [noun] is on the [ordinal] floor.',
      'Does the [noun] have a [adjective] [noun]?',
      'Here is your [noun].',
      'What time is [noun]?',
    ],
    emotionalTone: ['professional', 'helpful', 'polite', 'efficient'],
    examplePatterns: ['인사/요청 → 확인 → 정보 제공 → 추가 질문 → 감사/마무리'],
  },

  lesson: {
    category: 'lesson',
    characteristics: [
      '단계별 구조 (First, Second, Third)',
      '실용적 조언과 예시',
      '숫자 활용 (5가지, 3단계)',
      '격려와 실천 권유로 마무리',
    ],
    wordCount: { min: 6, max: 12 },
    sentenceStructures: [
      'Some people [verb] hard every day.',
      'But they still cannot [verb] much [noun].',
      'This is not about [noun] or [noun] at all.',
      'Today I will explain [noun].',
      'The first [noun] is [verb]ing [noun].',
      'They [verb] something [adjective] without [verb]ing.',
      'Then they [verb] the [noun] at [time].',
    ],
    emotionalTone: ['educational', 'encouraging', 'practical', 'motivating'],
    examplePatterns: ['문제 제기 → 원인 분석 → 단계별 해결책 → 예시 → 격려/실천 권유'],
  },

  fairytale: {
    category: 'fairytale',
    characteristics: [
      '3인칭 서사 시점',
      '캐릭터와 상황 묘사가 풍부',
      '교훈이나 메시지 포함',
      '따뜻한 결말',
    ],
    wordCount: { min: 5, max: 12 },
    sentenceStructures: [
      'There was a [adjective] and [adjective] [place].',
      'Many kinds of [noun] grew together.',
      '[Season] came and [adjective] [noun] touched the [noun].',
      'Soon the season of [noun] began.',
      'Some [noun] [past verb] very [adverb].',
      'But one [adjective] [noun] did not [verb].',
      'They opened wide and showed their [adjective] [noun].',
    ],
    emotionalTone: ['warm', 'whimsical', 'hopeful', 'moral'],
    examplePatterns: ['배경 설정 → 캐릭터 소개 → 갈등/도전 → 성장/변화 → 교훈적 결말'],
  },
};

// ============================================
// 2. 감정 아크 패턴 (Emotional Arc)
// ============================================

export interface EmotionalArc {
  name: string;
  description: string;
  phases: {
    phase: string;
    sentenceRange: [number, number]; // 15문장 기준
    emotion: string;
    intensity: number; // 1-10
    techniques: string[];
  }[];
}

export const EMOTIONAL_ARCS: Record<string, EmotionalArc> = {
  // 호기심 → 공감 → 긴장 → 해소 → 여운
  curiosity_to_lingering: {
    name: '호기심에서 여운까지',
    description:
      '시청자의 호기심을 자극하고, 공감을 이끌어내며, 긴장감을 조성한 후 해소하고 여운을 남김',
    phases: [
      {
        phase: 'hook',
        sentenceRange: [1, 2],
        emotion: 'curiosity',
        intensity: 7,
        techniques: ['unexpected situation', 'intriguing question', 'mysterious detail'],
      },
      {
        phase: 'setup',
        sentenceRange: [3, 5],
        emotion: 'empathy',
        intensity: 5,
        techniques: ['relatable context', 'character connection', 'sensory details'],
      },
      {
        phase: 'rising',
        sentenceRange: [6, 9],
        emotion: 'tension',
        intensity: 8,
        techniques: ['conflict introduction', 'stakes raising', 'emotional investment'],
      },
      {
        phase: 'climax',
        sentenceRange: [10, 12],
        emotion: 'revelation',
        intensity: 10,
        techniques: ['turning point', 'emotional peak', 'surprise element'],
      },
      {
        phase: 'resolution',
        sentenceRange: [13, 15],
        emotion: 'lingering',
        intensity: 6,
        techniques: ['reflection', 'lesson learned', 'open-ended thought'],
      },
    ],
  },

  // 일상 → 문제 → 해결 → 성장
  problem_solution: {
    name: '문제 해결 여정',
    description: '일상에서 문제가 발생하고, 해결 과정을 거쳐 성장하는 구조',
    phases: [
      {
        phase: 'normal',
        sentenceRange: [1, 3],
        emotion: 'neutral',
        intensity: 4,
        techniques: ['everyday setting', 'routine description', 'character introduction'],
      },
      {
        phase: 'disruption',
        sentenceRange: [4, 6],
        emotion: 'concern',
        intensity: 6,
        techniques: ['problem emergence', 'challenge introduction', 'stakes establishment'],
      },
      {
        phase: 'struggle',
        sentenceRange: [7, 10],
        emotion: 'determination',
        intensity: 8,
        techniques: ['effort description', 'obstacle facing', 'help seeking'],
      },
      {
        phase: 'resolution',
        sentenceRange: [11, 13],
        emotion: 'relief',
        intensity: 7,
        techniques: ['solution finding', 'problem solving', 'success moment'],
      },
      {
        phase: 'growth',
        sentenceRange: [14, 15],
        emotion: 'satisfaction',
        intensity: 6,
        techniques: ['lesson reflection', 'gratitude expression', 'future outlook'],
      },
    ],
  },

  // 대화형: 질문 → 공유 → 공감 → 격려 → 다짐
  conversation_flow: {
    name: '대화 흐름',
    description: '자연스러운 대화를 통해 정보를 공유하고 서로 격려하는 구조',
    phases: [
      {
        phase: 'opening',
        sentenceRange: [1, 3],
        emotion: 'curious',
        intensity: 5,
        techniques: ['situation question', 'interest showing', 'context setting'],
      },
      {
        phase: 'sharing',
        sentenceRange: [4, 7],
        emotion: 'engaged',
        intensity: 6,
        techniques: ['information exchange', 'detail providing', 'experience sharing'],
      },
      {
        phase: 'deepening',
        sentenceRange: [8, 11],
        emotion: 'connected',
        intensity: 7,
        techniques: ['follow-up questions', 'empathy showing', 'advice giving'],
      },
      {
        phase: 'encouraging',
        sentenceRange: [12, 14],
        emotion: 'supportive',
        intensity: 8,
        techniques: ['positive feedback', 'encouragement', 'shared goals'],
      },
      {
        phase: 'closing',
        sentenceRange: [15, 15],
        emotion: 'hopeful',
        intensity: 6,
        techniques: ['future commitment', 'warm farewell', 'positive outlook'],
      },
    ],
  },
};

// ============================================
// 3. 마이크로 드라마 요소
// ============================================

export interface MicroDramaElement {
  type: string;
  description: string;
  examples: string[];
  sentencePosition: 'early' | 'middle' | 'late' | 'any';
}

export const MICRO_DRAMA_ELEMENTS: MicroDramaElement[] = [
  {
    type: 'unexpected_connection',
    description: '예상치 못한 연결고리 발견',
    examples: [
      '수리하러 간 집이 어릴 때 살던 집',
      '우연히 만난 사람이 옛 친구',
      '발견한 물건이 잃어버린 추억',
    ],
    sentencePosition: 'early',
  },
  {
    type: 'hidden_truth',
    description: '숨겨진 진실의 발견',
    examples: ['아버지가 남긴 비밀 일기', '몰랐던 가족의 희생', '오해했던 상황의 진실'],
    sentencePosition: 'middle',
  },
  {
    type: 'emotional_reversal',
    description: '감정의 반전',
    examples: ['짜증났던 상황이 감동으로', '두려웠던 것이 기회로', '슬픔이 감사로'],
    sentencePosition: 'late',
  },
  {
    type: 'small_kindness',
    description: '작은 친절의 큰 영향',
    examples: ['낯선 사람의 도움', '잊고 있던 친절의 보답', '작은 배려가 만든 변화'],
    sentencePosition: 'any',
  },
  {
    type: 'time_bridge',
    description: '시간을 잇는 연결',
    examples: ['과거의 나에게서 온 메시지', '오래전 약속의 실현', '세대를 잇는 물건/이야기'],
    sentencePosition: 'middle',
  },
];

// ============================================
// 4. 참여 유도 훅 (Engagement Hooks)
// ============================================

export interface EngagementHook {
  type: string;
  description: string;
  templates: string[];
  placement: 'opening' | 'middle' | 'closing';
}

export const ENGAGEMENT_HOOKS: EngagementHook[] = [
  {
    type: 'curiosity_gap',
    description: '호기심 갭 - 알고 싶게 만드는 정보 누락',
    templates: [
      'The address seemed familiar.',
      'Something felt different that day.',
      "I didn't know what was waiting for me.",
    ],
    placement: 'opening',
  },
  {
    type: 'relatable_situation',
    description: '공감 상황 - 누구나 겪을 법한 상황',
    templates: [
      'Have you ever felt this way?',
      'We all know that feeling.',
      'It happens to everyone.',
    ],
    placement: 'middle',
  },
  {
    type: 'emotional_question',
    description: '감정적 질문 - 생각하게 만드는 질문',
    templates: [
      'What would you do in this situation?',
      'Have you ever wondered why?',
      'Do you remember when...?',
    ],
    placement: 'middle',
  },
  {
    type: 'surprising_fact',
    description: '놀라운 사실 - 예상을 뒤엎는 정보',
    templates: [
      "But here's what I didn't expect.",
      'The truth was completely different.',
      'What happened next surprised me.',
    ],
    placement: 'middle',
  },
  {
    type: 'lingering_thought',
    description: '여운 - 생각이 남는 마무리',
    templates: [
      'That day changed everything.',
      'I still think about it sometimes.',
      'Some moments stay with us forever.',
    ],
    placement: 'closing',
  },
];

// ============================================
// 5. 고성과 주제 패턴 (High-Performance Patterns)
// ============================================

export interface HighPerformancePattern {
  pattern: string;
  description: string;
  viewCountRange: string;
  examples: string[];
  keywords: string[];
}

export const HIGH_PERFORMANCE_PATTERNS: HighPerformancePattern[] = [
  {
    pattern: 'nostalgic_return',
    description: '과거로의 회귀 - 어린 시절, 옛 장소, 추억',
    viewCountRange: '20k-60k',
    examples: [
      '어릴 때 살던 집에 방문하게 됐어요',
      '동창회에서 옛 친구들을 만났어요',
      '길에서 우연히 첫사랑을 만났어요',
    ],
    keywords: ['childhood', 'memory', 'return', 'reunion', 'old'],
  },
  {
    pattern: 'seasonal_emotion',
    description: '계절 감성 - 날씨, 명절, 시즌 이벤트',
    viewCountRange: '20k-600k',
    examples: [
      '서울에 한파가 시작됐어요',
      '추운 겨울날, 눈사람을 만들었어요',
      '크리스마스에 약속 있으세요?',
    ],
    keywords: ['winter', 'summer', 'christmas', 'new year', 'weather'],
  },
  {
    pattern: 'life_lesson',
    description: '인생 교훈 - 자기계발, 습관, 성공/실패',
    viewCountRange: '10k-50k',
    examples: [
      '인생을 바꾸겠다고 결심한 날',
      '돈이 줄줄 새는 사람들의 5가지 습관',
      '내가 열심히 살아가는 이유',
    ],
    keywords: ['life', 'habit', 'success', 'change', 'reason'],
  },
  {
    pattern: 'daily_situation',
    description: '일상 상황 - 카페, 병원, 쇼핑 등',
    viewCountRange: '10k-140k',
    examples: ['카페에서 커피를 주문해요', '건강 검진 결과가 나왔어요', '약국에서 감기약을 샀어요'],
    keywords: ['cafe', 'hospital', 'shopping', 'order', 'daily'],
  },
  {
    pattern: 'travel_adventure',
    description: '여행 모험 - 해외여행, 공항, 호텔',
    viewCountRange: '10k-50k',
    examples: [
      '공항에서 입국 심사를 받았어요',
      '샌프란시스코 호텔에서 체크인을 해요',
      '런던에서 여권을 잃어버렸어요',
    ],
    keywords: ['airport', 'hotel', 'travel', 'abroad', 'check-in'],
  },
  {
    pattern: 'fable_moral',
    description: '우화/교훈 - 동물 이야기, 인생 교훈',
    viewCountRange: '5k-200k',
    examples: [
      '시골 쥐와 도시 쥐, 누가 더 행복할까?',
      '욕심 많은 개의 비참한 최후',
      '한입 거리 생쥐의 놀라운 반전',
    ],
    keywords: ['fable', 'animal', 'moral', 'lesson', 'story'],
  },
];

// ============================================
// 6. 카테고리별 추천 감정 아크
// ============================================

export function getRecommendedArc(category: Category): string {
  const arcMap: Record<Category, string> = {
    story: 'curiosity_to_lingering',
    conversation: 'conversation_flow',
    news: 'problem_solution',
    announcement: 'problem_solution',
    travel_business: 'conversation_flow',
    lesson: 'problem_solution',
    fairytale: 'curiosity_to_lingering',
  };
  return arcMap[category];
}

// ============================================
// 7. 패턴 기반 프롬프트 생성 헬퍼
// ============================================

export function buildStylePatternPrompt(category: Category): string {
  const pattern = SENTENCE_STYLE_PATTERNS[category];

  return `## 문장 스타일 패턴 (${category})

### 특징
${pattern.characteristics.map((c) => `- ${c}`).join('\n')}

### 문장 길이
- 최소: ${pattern.wordCount.min}단어
- 최대: ${pattern.wordCount.max}단어

### 문장 구조 패턴
${pattern.sentenceStructures.map((s) => `- "${s}"`).join('\n')}

### 감정 톤
${pattern.emotionalTone.join(', ')}

### 전체 흐름
${pattern.examplePatterns.join('\n')}`;
}

export function buildEmotionalArcPrompt(arcName: string): string {
  const arc = EMOTIONAL_ARCS[arcName];
  if (!arc) return '';

  return `## 감정 아크: ${arc.name}

${arc.description}

### 단계별 구성
${arc.phases
  .map(
    (p) => `
**${p.phase.toUpperCase()}** (문장 ${p.sentenceRange[0]}-${p.sentenceRange[1]})
- 감정: ${p.emotion} (강도: ${p.intensity}/10)
- 기법: ${p.techniques.join(', ')}`
  )
  .join('\n')}`;
}

export function buildMicroDramaPrompt(): string {
  return `## 마이크로 드라마 요소

15문장 안에 작은 갈등-해결 구조를 포함하세요:

${MICRO_DRAMA_ELEMENTS.map(
  (e) => `
### ${e.type}
- 설명: ${e.description}
- 위치: ${e.sentencePosition}
- 예시 패턴: ${e.examples.slice(0, 2).join(', ')}`
).join('\n')}`;
}

export function buildEngagementHooksPrompt(): string {
  return `## 참여 유도 훅

시청자의 관심을 끌고 유지하는 요소를 포함하세요:

${ENGAGEMENT_HOOKS.map(
  (h) => `
### ${h.type} (${h.placement})
- ${h.description}
- 패턴: "${h.templates[0]}"`
).join('\n')}`;
}
