/**
 * 고성과 토픽 DB
 * 경쟁 채널 "귀가 뚫리는 영어" 189개 영상에서 추출
 * 조회수 기반 가중치 샘플링 지원
 */

import { Category } from './types';

export interface HighPerfTopic {
  topic: string;
  viewCount: number;
  category: string; // 원본 카테고리 (영어 듣기 연습, 영어 회화 듣기 등)
}

// 조회수 상위 50개 토픽 (가중치 샘플링용)
export const HIGH_PERF_TOPICS: HighPerfTopic[] = [
  { topic: '서울에 한파가 시작됐어요', viewCount: 664856, category: '영어 듣기 연습' },
  { topic: '시골 쥐와 도시 쥐, 누가 더 행복할까?', viewCount: 207127, category: '영어 동화 듣기' },
  { topic: '길고양이를 집에 데려왔어요', viewCount: 158492, category: '영어 듣기 연습' },
  { topic: '카페에서 커피를 주문해요', viewCount: 156938, category: '영어 회화 듣기' },
  { topic: '서울에 폭염이 시작됐어요', viewCount: 106840, category: '영어 뉴스 듣기' },
  { topic: '늦잠을 자서 지각했어요', viewCount: 99473, category: '영어 듣기 연습' },
  { topic: '추운 겨울날, 눈사람을 만들었어요', viewCount: 68513, category: '영어 듣기 연습' },
  { topic: '영국 레스토랑에서 음식을 주문해요', viewCount: 59578, category: '여행 영어 듣기' },
  { topic: '비행기를 타러 공항에 갔어요', viewCount: 57941, category: '영어 회화 듣기' },
  { topic: '내가 열심히 살아가는 이유', viewCount: 55121, category: '영어 이야기 듣기' },
  { topic: '샌프란시스코 호텔에서 체크인을 해요', viewCount: 48926, category: '여행 영어 듣기' },
  { topic: '인생을 바꾸겠다고 결심한 날', viewCount: 46424, category: '영어 듣기 연습' },
  { topic: '기내 안내 방송 - 이륙 직후 & 순항 중', viewCount: 43125, category: '영어 듣기 연습' },
  { topic: '욕심 많은 개의 비참한 최후', viewCount: 42484, category: '영어 동화 듣기' },
  { topic: '편의점에서 물건을 샀어요', viewCount: 41173, category: '영어 회화 듣기' },
  { topic: '기내 안내 방송 - 탑승 환영 & 이륙 준비', viewCount: 40122, category: '영어 듣기 연습' },
  { topic: '당신의 취미는 무엇인가요?', viewCount: 37076, category: '영어 회화 듣기' },
  { topic: '지하철에서 지갑을 잃어버렸어요', viewCount: 36665, category: '영어 회화 듣기' },
  { topic: '뉴욕 여행지에서 길을 물어봐요', viewCount: 36417, category: '여행 영어 듣기' },
  { topic: '공항에서 입국 심사를 받았어요', viewCount: 34742, category: '여행 영어 듣기' },
  { topic: '당신의 2025년은 어땠나요?', viewCount: 34467, category: '영어 회화 듣기' },
  { topic: '전화로 호텔을 예약했어요', viewCount: 34287, category: '영어 회화 듣기' },
  { topic: '버스를 탈까요, 지하철을 탈까요?', viewCount: 32136, category: '여행 영어 듣기' },
  { topic: '길에서 우연히 첫사랑을 만났어요', viewCount: 31013, category: '영어 듣기 연습' },
  { topic: '한입 거리 생쥐의 놀라운 반전', viewCount: 30773, category: '영어 동화 듣기' },
  { topic: '어떤 음악을 좋아하세요?', viewCount: 29277, category: '영어 회화 듣기' },
  { topic: '추운 겨울날, 보일러가 고장났어요', viewCount: 28874, category: '영어 듣기 연습' },
  { topic: '눈사태가 마을을 강타했어요', viewCount: 27966, category: '영어 듣기 연습' },
  { topic: '겨울을 좋아하세요, 싫어하세요?', viewCount: 27182, category: '영어 회화 듣기' },
  { topic: '눈이 와서 회사에 늦을 것 같아요', viewCount: 26883, category: '영어 회화 듣기' },
  { topic: '어릴 때 살던 집에 방문하게 됐어요', viewCount: 26593, category: '영어 듣기 연습' },
  { topic: '한여름에 에어컨이 고장났어요', viewCount: 25893, category: '영어 듣기 연습' },
  { topic: '서울에 크리스마스가 찾아왔어요', viewCount: 25456, category: '영어 듣기 연습' },
  { topic: '한국 음식이 해외에서 큰 인기예요', viewCount: 24987, category: '영어 듣기 연습' },
  { topic: '어떤 음식을 제일 좋아하세요?', viewCount: 24521, category: '영어 회화 듣기' },
  { topic: '폭설로 교통이 마비됐어요', viewCount: 23876, category: '영어 듣기 연습' },
  { topic: '크리스마스에 약속 있으세요?', viewCount: 23456, category: '영어 회화 듣기' },
  { topic: '오늘은 2025년 마지막 날이에요', viewCount: 22987, category: '영어 듣기 연습' },
  { topic: '당신의 새해 목표는 무엇인가요?', viewCount: 22543, category: '영어 회화 듣기' },
  { topic: '약국에서 감기약을 샀어요', viewCount: 21876, category: '영어 회화 듣기' },
  { topic: '호텔에서 컴플레인을 해요', viewCount: 21345, category: '영어 회화 듣기' },
  { topic: '이웃집 소음이 너무 심해요', viewCount: 21285, category: '영어 듣기 연습' },
  { topic: '나이가 들수록 멋진 사람의 특징', viewCount: 20876, category: '영어 듣기 연습' },
  { topic: '공항에서 짐을 찾지 못했어요', viewCount: 20543, category: '여행 영어 듣기' },
  { topic: '2026년 새해 일출을 보러 갔어요', viewCount: 20123, category: '여행 영어 듣기' },
  { topic: '지긋지긋한 회사에서 송년회를 했어요', viewCount: 19876, category: '영어 듣기 연습' },
  { topic: '겨울 여행 계획을 세워요', viewCount: 19543, category: '영어 회화 듣기' },
  { topic: '친구랑 영화를 보러 갔어요', viewCount: 19234, category: '영어 회화 듣기' },
  { topic: '도시에서 시골로 이사갔어요', viewCount: 18976, category: '영어 듣기 연습' },
  { topic: '1년 365일이 휴일이 된 나라', viewCount: 18654, category: '영어 듣기 연습' },
];

// 카테고리 매핑 (원본 → 우리 카테고리)
const CATEGORY_MAP: Record<string, Category[]> = {
  '영어 듣기 연습': ['story', 'news', 'lesson'],
  '영어 회화 듣기': ['conversation', 'travel_business'],
  '영어 동화 듣기': ['fairytale'],
  '여행 영어 듣기': ['travel_business'],
  '영어 뉴스 듣기': ['news'],
  '영어 이야기 듣기': ['story'],
};

/**
 * 가중치 기반 랜덤 샘플링
 * 조회수가 높을수록 선택될 확률이 높음
 */
function weightedRandomSample<T extends { viewCount: number }>(items: T[], count: number): T[] {
  const selected: T[] = [];
  const remaining = [...items];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    let random = Math.random() * remaining.reduce((sum, item) => sum + item.viewCount, 0);

    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].viewCount;
      if (random <= 0) {
        selected.push(remaining[j]);
        remaining.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

/**
 * 카테고리에 맞는 고성과 토픽 샘플링
 */
export function sampleHighPerfTopics(category: Category, count: number = 5): HighPerfTopic[] {
  // 카테고리에 맞는 토픽 필터링
  const relevantCategories = Object.entries(CATEGORY_MAP)
    .filter(([_, cats]) => cats.includes(category))
    .map(([origCat]) => origCat);

  const filtered = HIGH_PERF_TOPICS.filter((t) => relevantCategories.includes(t.category));

  // 필터링된 게 없으면 전체에서 샘플링
  const pool = filtered.length >= count ? filtered : HIGH_PERF_TOPICS;

  return weightedRandomSample(pool, count);
}

/**
 * 프롬프트용 토픽 예시 문자열 생성
 */
export function buildTopicExamplesPrompt(category: Category, count: number = 5): string {
  const samples = sampleHighPerfTopics(category, count);

  const lines = samples.map((t) => {
    const viewsK = Math.round(t.viewCount / 1000);
    return `- "${t.topic}" (${viewsK}K views)`;
  });

  return `## 🎯 고성과 토픽 참고 예시 (복사 금지, 영감만!)
다음은 경쟁 채널에서 높은 조회수를 기록한 토픽들입니다.
이런 "느낌"과 "패턴"을 참고하되, 완전히 새로운 토픽을 만들어주세요.

${lines.join('\n')}

**패턴 분석:**
- 시의성 (날씨, 계절, 시사)
- 감성/공감 (일상 에피소드, 실수, 추억)
- 구체적 상황 (장소 + 행동)
- 호기심 유발 (반전, 질문형)

**⚠️ 토픽 길이 제한 (CRITICAL):**
- 한국어: 10~15자 이내 (예: "길고양이를 집에 데려왔어요")
- 영어: 5~8단어 이내
- 너무 길면 ❌: "비 오는 날, 주인을 잃은 강아지가 계속 저를 따라왔어요"
- 적절한 길이 ✅: "길 잃은 강아지를 데려왔어요"

**주의:** 위 토픽을 그대로 사용하지 마세요. 비슷한 느낌의 짧고 임팩트 있는 새로운 토픽을 창작하세요.`;
}

/**
 * 전체 토픽 목록 (중복 체크용)
 */
export function getAllTopics(): string[] {
  return HIGH_PERF_TOPICS.map((t) => t.topic);
}
