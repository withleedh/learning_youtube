import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type { Category } from './types';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';
import { buildCulturalContextPrompt, getRandomCulturalCategory } from './cultural-interests';

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
export async function selectTimlyTopic(
  category: Category,
  targetLanguage: string = 'English',
  nativeLanguage: string = 'Korean'
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  // Get current date info
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const month = now.getMonth() + 1;
  const dayOfWeek = now.toLocaleDateString('ko-KR', { weekday: 'long' });

  // Get recent topic history
  const history = await loadTopicHistory();
  const recentTopics = history.slice(-30).map((h) => h.topic);

  // Language display names
  const langDisplayNames: Record<string, Record<string, string>> = {
    Korean: {
      English: '영어',
      Korean: '한국어',
      Japanese: '일본어',
      Chinese: '중국어',
      Spanish: '스페인어',
    },
    English: {
      English: 'English',
      Korean: 'Korean',
      Japanese: 'Japanese',
      Chinese: 'Chinese',
      Spanish: 'Spanish',
    },
  };

  const targetLangName = langDisplayNames[nativeLanguage]?.[targetLanguage] || targetLanguage;
  const nativeLangName = langDisplayNames[nativeLanguage]?.[nativeLanguage] || nativeLanguage;

  // 문화적 관심사 컨텍스트 생성
  const culturalContext = buildCulturalContextPrompt(targetLanguage, nativeLangName);
  const culturalCategory = getRandomCulturalCategory(targetLanguage);

  const prompt = `# Role
너는 유튜브 ${targetLangName} 학습 채널의 '콘텐츠 기획자'야.
목표: 시청자가 "이거 나도 필요해!" 하고 클릭하게 만드는 주제 선정

# Target Audience
- ${targetLangName} 초중급자 (해외여행 준비 중이거나 일상 회화 연습 중)
- 모국어: ${nativeLangName}
${culturalContext}

# Task
#${month}월에 맞는 
**보편적이고 공감되는** ${targetLangName} 회화 주제 1개를 제안해줘.
${culturalCategory ? `오늘은 "${culturalCategory.category}" 관련 주제를 우선 고려해줘.` : ''}

# Category: ${category}
${getCategoryGuidance(category, targetLangName)}

# 🎯 핵심 기준: "넓고 보편적인 상황"

## ✅ 좋은 주제 (넓고 보편적)
- "카페에서 커피 주문하기" (누구나 경험)
- "공항에서 체크인하기" (여행자 필수)
- "식당에서 주문하기" (매일 하는 일)
- "택시 타고 목적지 가기" (여행 필수)
- "호텔 체크인하기" (여행 필수)
- "마트에서 장보기" (일상)
- "친구와 주말 계획 세우기" (일상 대화)

## ❌ 나쁜 주제 (너무 구체적/좁음)
- "호텔에서 담요 추가 요청하기" ← 너무 구체적
- "카페에서 우유 변경 요청하기" ← 너무 좁음
- "택시에서 에어컨 켜달라고 하기" ← 너무 세부적
- "식당에서 소금 달라고 하기" ← 너무 사소함

## 판단 기준
1. **10명 중 8명 이상**이 경험할 상황인가?
2. **유튜브 썸네일**로 만들면 클릭하고 싶은가?
3. **15문장 대화**로 자연스럽게 확장 가능한가?

# 시의성 (${month}월)
- 1-2월: 새해, 겨울여행, 스키장
- 3-4월: 봄, 벚꽃, 졸업/입학
- 5-6월: 여행 시즌, 휴가 계획
- 7-8월: 여름휴가, 해변, 더위
- 9-10월: 가을, 단풍, 추석
- 11-12월: 연말, 크리스마스, 쇼핑

# 중복 회피 (최근 사용 주제)
${
  recentTopics.length > 0
    ? recentTopics
        .slice(-10)
        .map((t) => `- ${t}`)
        .join('\n')
    : '(없음)'
}

# Output
${nativeLangName === 'Korean' ? '한글' : nativeLangName}로 **8-12자** 이내.
"~하기" 형태로 끝나는 간결한 상황 설명만 출력.
부가 설명 없이 주제만 출력.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const topic = response.text().trim();

  // Save to history
  await saveTopicToHistory(topic, category);

  return topic;
}

function getCategoryGuidance(category: Category, targetLangName: string): string {
  const guidance: Record<Category, string> = {
    story: `짧고 쉬운 에피소드. 일상적인 경험담.
예: "처음 해외여행 갔던 날", "새 친구를 사귄 이야기"`,

    conversation: `두 사람의 자연스러운 ${targetLangName} 대화.
예: "카페에서 주문하기", "친구와 주말 계획 세우기", "새 동료와 인사하기"`,

    news: `쉬운 뉴스 스타일. 간단한 정보 전달.
예: "이번 주 날씨 예보", "새로 오픈한 맛집 소개"`,

    announcement: `안내 상황에 대한 두 사람의 대화.
예: "공항 안내방송 듣고 대화하기", "가게 세일 안내 보고 대화하기"`,

    travel_business: `여행/비즈니스 필수 상황.
예: "호텔 체크인하기", "공항에서 탑승하기", "회의 일정 잡기"`,

    lesson: `쉬운 생활 팁이나 상식.
예: "감기 예방하는 방법", "여행 짐 싸는 팁"`,

    fairytale: `짧고 쉬운 동화.
예: "토끼와 거북이", "해와 바람"`,
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
