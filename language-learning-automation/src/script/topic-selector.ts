import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type { Category } from './types';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';
import { buildCulturalContextPrompt, getRandomCulturalCategory } from './cultural-interests';
import { buildHighPerformancePatternsPrompt } from './topic-patterns';
import { buildTodayEventsPrompt, getTodayTopicSuggestions } from './calendar-events';

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
 * Generate multiple topic candidates and select the best one
 */
export async function selectTimlyTopic(
  category: Category,
  targetLanguage: string = 'English',
  nativeLanguage: string = 'Korean',
  candidateCount: number = 3
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  // Get recent topic history
  const history = await loadTopicHistory();
  const recentTopics = history.slice(-30).map((h) => h.topic);

  // Step 1: Generate multiple candidates
  console.log(`   📝 주제 후보 ${candidateCount}개 생성 중...`);
  const candidates = await generateTopicCandidates(
    model,
    category,
    targetLanguage,
    nativeLanguage,
    recentTopics,
    candidateCount
  );
  console.log(`   ✓ 후보: ${candidates.map((c, i) => `${i + 1}. ${c}`).join(' | ')}`);

  // Step 2: LLM selects the best one
  console.log(`   🤖 최적 주제 선정 중...`);
  const bestTopic = await selectBestTopic(model, candidates, category, nativeLanguage);

  // Save to history
  await saveTopicToHistory(bestTopic, category);

  return bestTopic;
}

/**
 * Generate multiple topic candidates
 */
async function generateTopicCandidates(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  category: Category,
  targetLanguage: string,
  nativeLanguage: string,
  recentTopics: string[],
  count: number
): Promise<string[]> {
  // Get current date info
  const now = new Date();
  const month = now.getMonth() + 1;

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

  // 고성과 패턴 및 오늘 이벤트 컨텍스트
  const highPerformancePatterns = buildHighPerformancePatternsPrompt(category, month);
  const todayEventsContext = buildTodayEventsPrompt();
  const todaySuggestions = getTodayTopicSuggestions(category);

  const prompt = `# Role
너는 유튜브 ${targetLangName} 학습 채널의 '스토리텔러'야.

# Goal
시청자가 "이거 뭐지? 궁금하다!" 하고 클릭하게 만드는 **감성적이고 공감되는** 주제 선정

# Target Audience
- ${targetLangName} 초중급자
- 모국어: ${nativeLangName}
${culturalContext}

# Task
${month}월에 맞는 **감성적이고 스토리가 있는** ${targetLangName} 학습 주제 **${count}개**를 제안해줘.
${culturalCategory ? `오늘은 "${culturalCategory.category}" 관련 주제를 우선 고려해줘.` : ''}

# Category: ${category}
${getCategoryGuidance(category, targetLangName)}

${highPerformancePatterns}

${todayEventsContext}
${todaySuggestions.length > 0 ? `
## 💡 오늘 이벤트 관련 추천 주제
${todaySuggestions.map(s => `- ${s}`).join('\n')}
` : ''}

# 🎯 주제 선정 핵심 원칙

## 1. 감성 자극 (클릭하고 싶은 호기심/공감)
✅ 좋음: "어릴 때 살던 집에 방문하게 됐어요", "작년의 나에게서 온 새해 메시지"
❌ 나쁨: "카페에서 주문하기", "호텔 체크인하기" (너무 평범함)

## 2. 구체적 상황 (막연하지 않은 스토리)
✅ 좋음: "새해 직전, 엘리베이터에 갇혔어요", "이번 크리스마스에는 제가 산타예요"
❌ 나쁨: "엘리베이터 타기", "크리스마스 이야기" (막연함)

## 3. 공감 포인트 (누구나 겪을 법한 감정)
✅ 좋음: "지긋지긋한 회사에서 송년회를 했어요", "건강 검진 결과가 나왔어요"
❌ 나쁨: "회사 생활", "병원 가기" (감정이 없음)

# ✨ 좋은 주제 예시 (참고)
**스토리/에피소드:**
- 어릴 때 살던 집에 방문하게 됐어요
- 작년의 나에게서 온 새해 메시지
- 새해 직전, 엘리베이터에 갇혔어요
- 이번 크리스마스에는 제가 산타예요
- 추운 겨울날, 눈사람을 만들었어요

**회화/대화:**
- 건강 검진 결과가 나왔어요
- 당신의 새해 목표는 무엇인가요?
- 크리스마스에 약속 있으세요?
- 겨울을 좋아하세요, 싫어하세요?
- 어떤 음악을 좋아하세요?

**뉴스/시사:**
- 한국 음식이 해외에서 큰 인기예요
- 오늘은 2025년 마지막 날이에요
- 서울에 크리스마스가 찾아왔어요
- 세계 곳곳에서 산타가 목격됐어요

**여행/비즈니스:**
- 2026년 새해 일출을 보러 갔어요
- 스테이크 굽기 단계, 어떻게 주문해야 할까요?
- 아이슬란드 오로라 투어를 갔어요
- 버스를 탈까요, 지하철을 탈까요?
- 스키장에서 스키 장비를 렌탈해요
- 시드니 오페라하우스에서 티켓을 사요

**수업/정보:**
- 돈이 줄줄 새는 사람들의 5가지 습관
- 작심삼일을 극복하는 5가지 방법
- 사람들이 죽기 전에 후회하는 5가지
- 산타클로스는 왜 빨간 옷을 입을까?
- 겨울에 눈이 내리는 이유
- 남들에게 만만해 보이지 않는 법

**동화/힐링:**
- 정원에서 가장 늦게 피어난 꽃
- 행복하게 만들어주는 자판기
- 크리스마스 트리가 되고 싶었던 작은 나무
- 세상에서 가장 값진 선물
- 적과 타협하면 안 되는 이유
- 타인의 말에 휘둘리면 생기는 일

# 시의성 (${month}월)
- 1-2월: 새해 다짐, 겨울 감성, 설날, 발렌타인
- 3-4월: 봄 설렘, 벚꽃, 새 시작, 졸업/입학
- 5-6월: 여행 설렘, 휴가 계획, 가정의 달
- 7-8월: 여름휴가, 바다, 더위, 휴식
- 9-10월: 가을 감성, 단풍, 추석, 할로윈
- 11-12월: 연말 감성, 크리스마스, 송년회, 회고

# 중복 회피 (최근 사용 주제)
${
  recentTopics.length > 0
    ? recentTopics
        .slice(-10)
        .map((t) => `- ${t}`)
        .join('\n')
    : '(없음)'
}

# Output Format
${nativeLangName === 'Korean' ? '한글' : nativeLangName}로 **10-25자** 이내.
${getOutputStyleGuidance(category)}

**정확히 ${count}개**의 주제를 줄바꿈으로 구분해서 출력.
부가 설명 없이 주제만 출력.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text().trim();

  // Parse multiple topics (one per line)
  const topics = text
    .split('\n')
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim()) // Remove numbering like "1. " or "1) "
    .filter((line) => line.length > 0)
    .slice(0, count);

  return topics.length > 0 ? topics : [text]; // Fallback to single topic if parsing fails
}

/**
 * LLM selects the best topic from candidates
 */
async function selectBestTopic(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  candidates: string[],
  category: Category,
  nativeLanguage: string
): Promise<string> {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const isKorean = nativeLanguage === 'Korean';

  const prompt = isKorean
    ? `# Task
다음 ${candidates.length}개의 유튜브 영상 주제 후보 중에서 **가장 클릭하고 싶은** 주제 1개를 선택해줘.

# 후보
${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}

# 선정 기준
1. **호기심 유발**: "이게 뭐지?" 하고 클릭하고 싶은 정도
2. **감정적 공감**: 시청자가 "나도 그런 적 있어" 하고 느낄 수 있는 정도
3. **구체성**: 막연하지 않고 상황이 그려지는 정도
4. **시의성**: 지금 시기에 맞는 정도

# Output
선택한 주제만 출력 (번호나 설명 없이)`
    : `# Task
Select the **most clickable** topic from these ${candidates.length} YouTube video topic candidates.

# Candidates
${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}

# Selection Criteria
1. **Curiosity**: How much it makes you want to click
2. **Emotional resonance**: How relatable it is
3. **Specificity**: How concrete and vivid the situation is
4. **Timeliness**: How relevant it is to the current season

# Output
Output only the selected topic (no number or explanation)`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const selected = response.text().trim();

  // Find the closest match from candidates (in case LLM slightly modifies it)
  const exactMatch = candidates.find((c) => c === selected);
  if (exactMatch) return exactMatch;

  // Fuzzy match - find candidate that contains the selected text or vice versa
  const fuzzyMatch = candidates.find(
    (c) =>
      selected.includes(c) || c.includes(selected) || selected.toLowerCase() === c.toLowerCase()
  );
  if (fuzzyMatch) return fuzzyMatch;

  // Default to first candidate if no match
  return candidates[0];
}

function getCategoryGuidance(category: Category, targetLangName: string): string {
  const guidance: Record<Category, string> = {
    story: `감성적인 에피소드. 공감되는 일상 이야기.
예: "어릴 때 살던 집에 방문하게 됐어요", "작년의 나에게서 온 새해 메시지", "새해 직전, 엘리베이터에 갇혔어요"`,

    conversation: `공감되는 주제로 나누는 ${targetLangName} 대화.
예: "건강 검진 결과가 나왔어요", "당신의 새해 목표는 무엇인가요?", "겨울을 좋아하세요, 싫어하세요?"`,

    news: `흥미로운 소식을 전하는 뉴스 스타일.
예: "한국 음식이 해외에서 큰 인기예요", "서울에 크리스마스가 찾아왔어요", "세계 곳곳에서 산타가 목격됐어요"`,

    announcement: `일상에서 듣는 안내와 그에 대한 반응.
예: "비행기가 2시간 지연됐대요", "오늘 백화점 세일 마지막 날이래요"`,

    travel_business: `여행/비즈니스에서 겪는 감성적 순간.
예: "첫 해외여행에서 길을 잃었어요", "면접 결과가 드디어 나왔어요", "출장지에서 고향 음식을 발견했어요"`,

    lesson: `삶에 도움이 되는 따뜻한 조언.
예: "스트레스 받을 때 이렇게 해보세요", "좋은 습관을 만드는 작은 방법들"`,

    fairytale: `교훈이 있는 따뜻한 이야기.
예: "욕심 많은 왕과 현명한 농부", "숲속 동물들의 크리스마스"`,
  };

  return guidance[category];
}

function getOutputStyleGuidance(category: Category): string {
  const styles: Record<Category, string> = {
    story: `**"~했어요", "~됐어요"** 같은 과거형 종결어미 사용.
감정을 자극하는 구체적 상황으로 표현.`,

    conversation: `**"~인가요?", "~있으세요?", "~좋아하세요?"** 같은 질문형 또는
**"~했어요", "~나왔어요"** 같은 상황 서술형 사용.`,

    news: `**"~예요", "~래요", "~됐어요"** 같은 뉴스 전달체 사용.
흥미로운 소식을 전하는 느낌으로.`,

    announcement: `**"~래요", "~대요"** 같은 전달체 사용.
안내 내용에 대한 반응을 담아서.`,

    travel_business: `**"~했어요", "~해요", "~할까요?"** 같은 상황/질문형 사용.
여행/비즈니스 현장감 있게.`,

    lesson: `**명사형** 또는 **"~하는 법", "~하는 이유", "~가지 방법"** 스타일.
예: "돈이 줄줄 새는 사람들의 5가지 습관", "산타클로스는 왜 빨간 옷을 입을까?"`,

    fairytale: `**명사형** 또는 **"~하는 이유", "~생기는 일"** 스타일.
예: "정원에서 가장 늦게 피어난 꽃", "타인의 말에 휘둘리면 생기는 일"`,
  };

  return styles[category];
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
