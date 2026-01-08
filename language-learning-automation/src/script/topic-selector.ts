import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type { Category } from './types';

interface TopicHistory {
  date: string;
  topic: string;
  category: Category;
}

const HISTORY_FILE = path.join(process.cwd(), 'output', 'topic-history.json');

/**
 * Load topic history to avoid duplicates
 */
async function loadTopicHistory(): Promise<TopicHistory[]> {
  try {
    const content = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Save topic to history
 */
async function saveTopicToHistory(topic: string, category: Category): Promise<void> {
  const history = await loadTopicHistory();
  const today = new Date().toISOString().split('T')[0];

  history.push({ date: today, topic, category });

  // Keep only last 100 entries
  const recentHistory = history.slice(-100);

  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(recentHistory, null, 2), 'utf-8');
}

/**
 * Generate a timely, relevant topic using AI
 */
export async function selectTimlyTopic(category: Category): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Get current date info
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const month = now.getMonth() + 1;
  const dayOfWeek = now.toLocaleDateString('ko-KR', { weekday: 'long' });

  // Get recent topic history
  const history = await loadTopicHistory();
  const recentTopics = history.slice(-30).map((h) => h.topic);

  const prompt = `# Role
너는 유튜브 조회수를 폭발시키는 '콘텐츠 기획 전문가'이자 '언어 교육자'야.

# Task
오늘 날짜(${today}, ${dayOfWeek})와 계절(${month}월)을 고려해서, 사람들이 썸네일을 보자마자 클릭하고 싶어지는 "구체적이고 리얼한 영어 회화 주제" 1개를 제안해줘.

# Category Context
${getCategoryGuidance(category)}

# Criteria (선정 기준)
1. **구체성(Specific)**: 단순한 '식당'이 아니라, "주문한 음식이 잘못 나와서 컴플레인 거는 상황"이어야 함.

2. **공감대(Empathy)**: 누구나 겪을 법하거나 걱정하는 상황
   - 여행: "입국 심사에서 질문 공세", "호텔 예약이 안 되어있을 때", "택시 기사가 돌아가는 길로 갈 때"
   - 일상: "층간 소음 항의", "엘리베이터 고장", "배달 음식이 잘못 왔을 때"
   - 비즈니스: "화상 회의 중 연결 끊김", "이메일 오타로 곤란한 상황"
   - 위급: "해외에서 지갑 분실", "약국에서 약 설명 듣기", "병원 응급실"

3. **시의성(Timely)**: 현재 시기(${month}월, ${dayOfWeek})에 맞는 상황
   - 1-2주 내 다가오는 이벤트나 명절 관련
   - 계절에 맞는 상황 (겨울: 난방, 감기, 눈 / 여름: 에어컨, 휴가 등)
   - 요일 특성 (월요일: 출근, 금요일: 퇴근 후 약속 등)

4. **다양성**: 여행, 비즈니스, 일상 생활, 위급 상황을 골고루

5. **중복 회피**: 최근 사용한 주제는 피할 것
${recentTopics.length > 0 ? recentTopics.map((t) => `   - ${t}`).join('\n') : '   (최근 주제 없음)'}

# Output Format
한글로 10-20자 이내의 구체적인 상황 설명만 출력.
설명이나 부가 텍스트 없이 주제만 출력할 것.

## Good Examples:
- 주문한 음식이 잘못 나왔을 때
- 입국 심사대에서 질문 공세 받기
- 호텔 체크인 예약이 없다고 할 때
- 층간 소음으로 윗집에 항의하기
- 택시 기사가 먼 길로 돌아갈 때
- 해외 약국에서 감기약 사기
- 비행기 연착으로 환불 요청하기

## Bad Examples (너무 일반적):
- 식당에서 주문하기
- 호텔 체크인
- 쇼핑하기

지금 주제를 하나만 출력해줘.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const topic = response.text().trim();

  // Save to history
  await saveTopicToHistory(topic, category);

  return topic;
}

function getCategoryGuidance(category: Category): string {
  const guidance: Record<Category, string> = {
    story: `짧은 에피소드 형식. 감정과 경험이 담긴 이야기.
예: "첫 출근 날 엘리베이터에서 사장님과 마주친 썰", "해외여행 중 지갑을 잃어버렸던 날"`,

    conversation: `두 사람의 실제 대화 상황. 질문-응답 구조. 구체적인 상황일수록 좋음.
예: "카페에서 주문한 음료가 잘못 나왔을 때", "친구가 약속 시간에 2시간 늦었을 때"`,

    news: `뉴스 스타일의 정보 전달. 시의성 있는 이슈.
예: "이번 주 한파 경보 발령", "설 연휴 고속도로 정체 예상"`,

    announcement: `두 사람이 공지/안내에 대해 대화하는 형식.
예: "백화점 세일 공지 보고 대화하기", "공항 게이트 변경 안내 듣고 당황하기"`,

    travel_business: `여행이나 업무 상황의 실용 영어. 구체적인 문제 상황이 좋음.
예: "호텔 예약이 안 되어있다고 할 때", "비행기 연착으로 환불 요청하기"`,

    lesson: `지식이나 상식을 설명하는 교육 콘텐츠.
예: "겨울철 정전기 방지법", "감기 빨리 낫는 방법"`,

    fairytale: `교훈이 있는 동화나 우화.
예: "개미와 베짱이", "황금알을 낳는 거위"`,
  };

  return guidance[category];
}

/**
 * Show recent topic history
 */
export async function showTopicHistory(): Promise<void> {
  const history = await loadTopicHistory();

  if (history.length === 0) {
    console.log('📋 주제 히스토리가 없습니다.');
    return;
  }

  console.log('\n📋 최근 생성된 주제 (최근 30개):\n');

  const recent = history.slice(-30).reverse();
  recent.forEach((entry, index) => {
    console.log(`${index + 1}. [${entry.date}] ${entry.category}: ${entry.topic}`);
  });

  console.log(`\n총 ${history.length}개의 주제가 기록되어 있습니다.`);
}
