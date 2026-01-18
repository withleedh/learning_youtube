/**
 * 달력 이벤트 DB
 * 시의성 있는 주제 선정을 위한 한국 달력 이벤트
 */

export interface CalendarEvent {
  date: string; // MM-DD 또는 "MM-*" (해당 월 전체)
  name: string;
  keywords: string[];
  topicSuggestions: {
    story?: string[];
    conversation?: string[];
    news?: string[];
    lesson?: string[];
    fairytale?: string[];
    travel_business?: string[];
    announcement?: string[];
  };
}

/**
 * 한국 공휴일 및 주요 이벤트
 */
export const KOREAN_CALENDAR_EVENTS: CalendarEvent[] = [
  // 1월
  {
    date: '01-01',
    name: '새해 첫날',
    keywords: ['새해', '다짐', '일출', '덕담', '신년'],
    topicSuggestions: {
      story: ['새해 첫날, 일출을 보러 갔어요', '새해 아침에 받은 특별한 전화'],
      conversation: ['새해 계획을 세웠어요', '당신의 새해 목표는 무엇인가요?'],
      news: ['새해 첫날, 전국에서 일출을 보러 갔어요'],
    },
  },
  {
    date: '01-*',
    name: '1월 (겨울)',
    keywords: ['겨울', '한파', '눈', '따뜻한', '코트', '핫초코'],
    topicSuggestions: {
      story: ['서울에 한파가 시작됐어요', '추운 겨울날, 눈사람을 만들었어요'],
      conversation: ['겨울을 좋아하세요, 싫어하세요?'],
      lesson: ['겨울에 눈이 내리는 이유'],
    },
  },
  
  // 2월
  {
    date: '02-14',
    name: '발렌타인데이',
    keywords: ['발렌타인', '초콜릿', '고백', '사랑'],
    topicSuggestions: {
      story: ['발렌타인데이에 받은 깜짝 선물', '10년 만에 받은 발렌타인 초콜릿'],
      conversation: ['발렌타인데이 계획이 있으세요?'],
    },
  },
  
  // 3월
  {
    date: '03-01',
    name: '삼일절',
    keywords: ['삼일절', '독립', '역사', '애국'],
    topicSuggestions: {
      news: ['삼일절을 맞아 전국에서 기념식이 열렸어요'],
      lesson: ['삼일절의 의미를 알아봐요'],
    },
  },
  {
    date: '03-*',
    name: '3월 (봄 시작)',
    keywords: ['봄', '입학', '졸업', '새 시작', '벚꽃', '꽃샘추위'],
    topicSuggestions: {
      story: ['졸업식 날, 눈물을 흘렸어요', '첫 출근날 있었던 일'],
      conversation: ['봄이 오고 있어요. 기분이 어때요?'],
    },
  },
  
  // 4월
  {
    date: '04-*',
    name: '4월 (벚꽃)',
    keywords: ['봄', '벚꽃', '피크닉', '나들이', '꽃놀이'],
    topicSuggestions: {
      story: ['벚꽃 아래서 프러포즈를 받았어요', '10년 전 그날, 같은 벤치에 앉았어요'],
      conversation: ['벚꽃 구경 가실 계획 있으세요?'],
      travel_business: ['한국에서 벚꽃 명소를 찾아갔어요'],
    },
  },
  
  // 5월
  {
    date: '05-05',
    name: '어린이날',
    keywords: ['어린이날', '선물', '놀이공원', '아이', '행복'],
    topicSuggestions: {
      story: ['아빠가 어린이날에 해준 약속', '어린이날 추억이 떠올랐어요'],
    },
  },
  {
    date: '05-08',
    name: '어버이날',
    keywords: ['어버이날', '부모님', '카네이션', '감사', '효도'],
    topicSuggestions: {
      story: ['어버이날에 부모님께 드린 편지', '엄마가 울었던 어버이날'],
      conversation: ['어버이날 선물 뭘 드릴까요?'],
    },
  },
  
  // 6월
  {
    date: '06-*',
    name: '6월 (초여름)',
    keywords: ['여름', '장마', '휴가계획', '에어컨', '빙수'],
    topicSuggestions: {
      story: ['장마철에 있었던 로맨틱한 이야기'],
      conversation: ['여름휴가 계획 세우셨어요?'],
    },
  },
  
  // 7월
  {
    date: '07-*',
    name: '7월 (여름휴가)',
    keywords: ['여름휴가', '바다', '수영', '피서', '더위', '수박'],
    topicSuggestions: {
      story: ['바다에서 있었던 잊지 못할 하루'],
      travel_business: ['제주도 여행을 계획했어요', '바다가 보이는 펜션에 묵었어요'],
      lesson: ['여름에 시원하게 지내는 방법'],
    },
  },
  
  // 8월
  {
    date: '08-15',
    name: '광복절',
    keywords: ['광복절', '해방', '역사', '태극기'],
    topicSuggestions: {
      news: ['광복절을 맞아 전국에 태극기가 걸렸어요'],
      lesson: ['광복절의 의미를 알아봐요'],
    },
  },
  
  // 9월-10월 (추석은 음력이라 대략적으로)
  {
    date: '09-*',
    name: '9월 (추석 시즌)',
    keywords: ['추석', '명절', '송편', '귀향', '보름달', '가족'],
    topicSuggestions: {
      story: ['추석에 온가족이 모였어요', '할머니 댁에서 보낸 추석'],
      conversation: ['추석 연휴 계획이 있으세요?', '추석이 끝나고 다이어트를 해요'],
      news: ['추석 귀경길, 도로가 꽉 막혔어요'],
    },
  },
  
  // 10월
  {
    date: '10-03',
    name: '개천절',
    keywords: ['개천절', '단군', '역사'],
    topicSuggestions: {
      lesson: ['개천절에 대해 알아봐요'],
    },
  },
  {
    date: '10-09',
    name: '한글날',
    keywords: ['한글날', '세종대왕', '한글', '언어'],
    topicSuggestions: {
      lesson: ['한글날에 담긴 의미를 알아봐요'],
    },
  },
  {
    date: '10-31',
    name: '할로윈',
    keywords: ['할로윈', '호박', '귀신', '코스튬', '파티'],
    topicSuggestions: {
      story: ['할로윈 파티에서 있었던 일'],
      travel_business: ['미국에서 할로윈을 경험했어요'],
    },
  },
  
  // 11월
  {
    date: '11-*',
    name: '11월 (가을/겨울 전환)',
    keywords: ['가을', '낙엽', '수능', '김장', '연말준비'],
    topicSuggestions: {
      story: ['수능날 있었던 이야기'],
      news: ['수능이 전국에서 치러졌어요'],
    },
  },
  
  // 12월
  {
    date: '12-25',
    name: '크리스마스',
    keywords: ['크리스마스', '산타', '선물', '캐롤', '트리', '눈'],
    topicSuggestions: {
      story: [
        '이번 크리스마스에는 제가 산타예요',
        '크리스마스 트리가 되고 싶었던 작은 나무',
      ],
      conversation: ['크리스마스에 약속 있으세요?'],
      news: ['서울에 크리스마스가 찾아왔어요', '세계 곳곳에서 산타가 목격됐어요'],
      lesson: ['산타클로스는 왜 빨간 옷을 입을까?'],
      fairytale: ['세상에서 가장 값진 선물'],
    },
  },
  {
    date: '12-31',
    name: '연말/송년',
    keywords: ['연말', '송년회', '회고', '마지막날', '새해전야'],
    topicSuggestions: {
      story: ['새해 직전, 엘리베이터에 갇혔어요', '지긋지긋한 회사에서 송년회를 했어요'],
      conversation: ['당신의 올해는 어땠나요?'],
      news: ['오늘은 올해 마지막 날이에요'],
    },
  },
  {
    date: '12-*',
    name: '12월 (겨울/연말)',
    keywords: ['겨울', '눈', '크리스마스', '연말', '송년회', '한해마무리'],
    topicSuggestions: {
      story: ['백화점에서 겨울옷을 샀어요', '폭설로 교통이 마비됐어요'],
      lesson: ['겨울에 눈이 내리는 이유'],
    },
  },
];

/**
 * 오늘 날짜에 해당하는 이벤트들 반환
 */
export function getTodayEvents(): CalendarEvent[] {
  const today = new Date();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const mmdd = `${month}-${day}`;
  const monthWildcard = `${month}-*`;
  
  return KOREAN_CALENDAR_EVENTS.filter(
    (e) => e.date === mmdd || e.date === monthWildcard
  );
}

/**
 * 특정 날짜의 이벤트들 반환
 */
export function getEventsForDate(date: Date): CalendarEvent[] {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const mmdd = `${month}-${day}`;
  const monthWildcard = `${month}-*`;
  
  return KOREAN_CALENDAR_EVENTS.filter(
    (e) => e.date === mmdd || e.date === monthWildcard
  );
}

/**
 * 오늘 이벤트 기반 추천 주제 반환 (카테고리별)
 */
export function getTodayTopicSuggestions(
  category: 'story' | 'conversation' | 'news' | 'lesson' | 'fairytale' | 'travel_business' | 'announcement'
): string[] {
  const events = getTodayEvents();
  const suggestions: string[] = [];
  
  for (const event of events) {
    const categorySuggestions = event.topicSuggestions[category];
    if (categorySuggestions) {
      suggestions.push(...categorySuggestions);
    }
  }
  
  return suggestions;
}

/**
 * 오늘 이벤트 키워드 반환
 */
export function getTodayKeywords(): string[] {
  const events = getTodayEvents();
  const keywords: string[] = [];
  
  for (const event of events) {
    keywords.push(...event.keywords);
  }
  
  return [...new Set(keywords)]; // 중복 제거
}

/**
 * 프롬프트용 오늘 이벤트 정보 문자열 생성
 */
export function buildTodayEventsPrompt(): string {
  const events = getTodayEvents();
  
  if (events.length === 0) {
    return '';
  }
  
  const eventNames = events.map((e) => e.name).join(', ');
  const keywords = getTodayKeywords();
  
  return `
## 📅 오늘의 이벤트/시즌
- 이벤트: ${eventNames}
- 관련 키워드: ${keywords.join(', ')}

이 이벤트와 연관된 감성적인 주제를 우선 고려해주세요.
`;
}
