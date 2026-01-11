import type { Category } from './types';

interface CategoryTone {
  description: string;
  style: string;
  examples: string[];
}

/**
 * 스크립트 형식 정의
 */
export type ScriptFormat = 'narration' | 'dialogue';

interface ScriptFormatConfig {
  format: ScriptFormat;
  speakers: ('M' | 'F')[];
  description: string;
}

/**
 * 카테고리별 스크립트 형식
 */
export const CATEGORY_SCRIPT_FORMAT: Record<Category, ScriptFormatConfig> = {
  story: {
    format: 'narration',
    speakers: ['F'],
    description: '1인칭 회상 나레이션. 부드러운 스토리텔링.',
  },
  conversation: {
    format: 'dialogue',
    speakers: ['M', 'F'],
    description: '두 사람의 자연스러운 일상 대화.',
  },
  news: {
    format: 'narration',
    speakers: ['M'],
    description: '뉴스 앵커 스타일. 객관적 정보 전달.',
  },
  announcement: {
    format: 'narration',
    speakers: ['M'],
    description: '안내 방송 스타일. 명확한 정보 전달.',
  },
  travel_business: {
    format: 'dialogue',
    speakers: ['M', 'F'],
    description: '여행/비즈니스 상황 대화.',
  },
  lesson: {
    format: 'narration',
    speakers: ['M'],
    description: '설명/강의 스타일. 정보 전달.',
  },
  fairytale: {
    format: 'narration',
    speakers: ['F'],
    description: '동화 나레이션. 따뜻한 스토리텔링.',
  },
};

/**
 * 카테고리가 나레이션인지 확인
 */
export function isNarrationCategory(category: Category): boolean {
  return CATEGORY_SCRIPT_FORMAT[category].format === 'narration';
}

/**
 * 카테고리의 기본 화자 가져오기
 */
export function getDefaultSpeaker(category: Category): 'M' | 'F' {
  return CATEGORY_SCRIPT_FORMAT[category].speakers[0];
}

/**
 * 한국어 카테고리별 톤 & 예시
 */
export const CATEGORY_TONES_KOREAN: Record<Category, CategoryTone> = {
  story: {
    description: '감성적인 에피소드. 공감되는 일상 이야기. 일기장 느낌.',
    style: '1인칭 개인 사연. "~했어요", "~됐어요" 종결어미.',
    examples: [
      '어릴 때 살던 집에 방문하게 됐어요',
      '작년의 나에게서 온 새해 메시지',
      '새해 직전, 엘리베이터에 갇혔어요',
      '이번 크리스마스에는 제가 산타예요',
      '지긋지긋한 회사에서 송년회를 했어요',
      '추운 겨울날, 눈사람을 만들었어요',
    ],
  },

  conversation: {
    description: '공감되는 주제로 나누는 대화. 리얼한 감정.',
    style: '질문형 또는 상황 서술. "~인가요?", "~있으세요?", "~했어요"',
    examples: [
      '건강 검진 결과가 나왔어요',
      '당신의 새해 목표는 무엇인가요?',
      '크리스마스에 약속 있으세요?',
      '겨울을 좋아하세요, 싫어하세요?',
      '당신의 2025년은 어땠나요?',
      '어떤 음악을 좋아하세요?',
    ],
  },

  news: {
    description: '흥미로운 소식을 전하는 객관적 뉴스 스타일. 시의성',
    style: '개인 감정 없이 사실 전달. "~예요", "~됐어요", "~래요"',
    examples: [
      '한국 음식이 해외에서 큰 인기예요',
      '오늘은 2025년 마지막 날이에요',
      '서울에 크리스마스가 찾아왔어요',
      '세계 곳곳에서 산타가 목격됐어요',
      '폭설로 교통이 마비됐어요',
      '출산율이 역대 최저치를 기록했어요',
    ],
  },

  announcement: {
    description: '일상에서 듣는 안내와 그에 대한 반응.',
    style: '전달체 사용. "~래요", "~대요"',
    examples: [
      '비행기가 2시간 지연됐대요',
      '오늘 백화점 세일 마지막 날이래요',
      '지하철 운행이 중단됐대요',
      '오늘부터 할인 행사가 시작된대요',
      '공항 게이트가 변경됐대요',
      '오늘 카페가 일찍 문을 닫는대요',
    ],
  },

  travel_business: {
    description: '여행/비즈니스에서 겪는 생생한 경험.',
    style: '현장감 있는 상황. "~했어요", "~해요", "~할까요?"',
    examples: [
      '2026년 새해 일출을 보러 갔어요',
      '스테이크 굽기 단계, 어떻게 주문해야 할까요?',
      '아이슬란드 오로라 투어를 갔어요',
      '버스를 탈까요, 지하철을 탈까요?',
      '스키장에서 스키 장비를 렌탈해요',
      '시드니 오페라하우스에서 티켓을 사요',
    ],
  },

  lesson: {
    description: '삶에 도움이 되는 정보성 콘텐츠.',
    style: '숫자 사용, 명사형/의문형. 개인 감정 없이.',
    examples: [
      '돈이 줄줄 새는 사람들의 5가지 습관',
      '작심삼일을 극복하는 5가지 방법',
      '사람들이 죽기 전에 후회하는 5가지',
      '산타클로스는 왜 빨간 옷을 입을까?',
      '겨울에 눈이 내리는 이유',
      '남들에게 만만해 보이지 않는 법',
    ],
  },

  fairytale: {
    description: '교훈이 있는 따뜻한 이야기. 동화적 분위기.',
    style: '명사형 또는 "~하는 이유", "~생기는 일" 스타일.',
    examples: [
      '정원에서 가장 늦게 피어난 꽃',
      '행복하게 만들어주는 자판기',
      '크리스마스 트리가 되고 싶었던 작은 나무',
      '세상에서 가장 값진 선물',
      '적과 타협하면 안 되는 이유',
      '타인의 말에 휘둘리면 생기는 일',
    ],
  },
};

/**
 * 영어 카테고리별 톤 & 예시
 */
export const CATEGORY_TONES_ENGLISH: Record<Category, CategoryTone> = {
  story: {
    description: 'Emotional episodes. Relatable daily life stories. Diary-like feel.',
    style: 'First person narrative. "I finally...", "I got..."',
    examples: [
      'I Finally Visited My Childhood Home',
      "A Message From Last Year's Me",
      "I Got Stuck in an Elevator on New Year's Eve",
      'This Christmas, I Became Santa',
      'I Had a Year-End Party at My Exhausting Job',
      'I Built a Snowman on a Cold Winter Day',
    ],
  },

  conversation: {
    description: 'Relatable conversations. Real emotions.',
    style: 'Questions or situation statements.',
    examples: [
      'My Health Checkup Results Are In',
      "What's Your New Year's Resolution?",
      'Do You Have Plans for Christmas?',
      'Do You Love or Hate Winter?',
      'How Was Your 2025?',
      'What Kind of Music Do You Like?',
    ],
  },

  news: {
    description: 'Interesting news style. Timely and surprising.',
    style: 'Objective reporting. No personal emotions.',
    examples: [
      'Korean Food Is Taking Over the World',
      'Today Is the Last Day of 2025',
      'Christmas Has Arrived in Seoul',
      'Santa Was Spotted Around the Globe',
      'Traffic Paralyzed by Heavy Snow',
      'Birth Rate Hits Record Low',
    ],
  },

  announcement: {
    description: 'Daily announcements and reactions.',
    style: 'Reported speech style.',
    examples: [
      'The Flight Is Delayed by 2 Hours',
      'Today Is the Last Day of the Sale',
      'Subway Service Has Been Suspended',
      'The Discount Event Starts Today',
      'The Airport Gate Has Changed',
      'The Cafe Is Closing Early Today',
    ],
  },

  travel_business: {
    description: 'Vivid travel/business experiences.',
    style: 'Present situation feel. "I went...", "How do I...?"',
    examples: [
      'I Went to See the 2026 New Year Sunrise',
      'How Do I Order My Steak?',
      'My Iceland Aurora Tour Experience',
      'Should I Take the Bus or Subway?',
      'Renting Ski Equipment at the Resort',
      'Buying Tickets at Sydney Opera House',
    ],
  },

  lesson: {
    description: 'Helpful life information.',
    style: 'Use numbers. Noun phrases or questions. No personal emotions.',
    examples: [
      '5 Habits of People Who Are Always Broke',
      '5 Ways to Beat Procrastination',
      '5 Things People Regret Before They Die',
      'Why Does Santa Wear Red?',
      'Why Does It Snow in Winter?',
      'How to Stop Being a Pushover',
    ],
  },

  fairytale: {
    description: 'Warm stories with morals. Whimsical atmosphere.',
    style: 'Noun phrases or "The reason why...", "What happens when..."',
    examples: [
      'The Last Flower to Bloom in the Garden',
      'The Vending Machine That Makes You Happy',
      'The Little Tree That Wanted to Be a Christmas Tree',
      'The Most Precious Gift in the World',
      'Why You Should Never Compromise with the Enemy',
      'What Happens When You Let Others Control You',
    ],
  },
};

/**
 * 언어에 따른 카테고리 톤 가져오기
 */
export function getCategoryTone(category: Category, language: string): CategoryTone {
  if (language === 'Korean') {
    return CATEGORY_TONES_KOREAN[category];
  }
  return CATEGORY_TONES_ENGLISH[category];
}

/**
 * 프롬프트용 카테고리 가이드 문자열 생성
 */
export function buildCategoryGuidance(category: Category, language: string): string {
  const tone = getCategoryTone(category, language);
  const exampleList = tone.examples.map((e) => `- ${e}`).join('\n');

  return `${tone.description}
**스타일**: ${tone.style}

**예시**:
${exampleList}`;
}
