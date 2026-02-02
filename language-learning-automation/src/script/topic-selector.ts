import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type { Category } from './types';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';
import { buildCulturalContextPrompt, getRandomCulturalCategory } from './cultural-interests';
import { buildHighPerformancePatternsPrompt } from './topic-patterns';
import { buildTodayEventsPrompt, getTodayTopicSuggestions } from './calendar-events';
import { generateTopicCombination, type TopicCombination } from './topic-combination';
import {
  selectPatternByWeight,
  inferPatternFromTopic,
  type PatternSelectionResult,
  type PatternHistory,
} from './performance-patterns';

interface TopicHistory {
  date: string;
  topic: string;
  category: Category;
  patternId?: string; // 사용된 패턴 ID
}

const HISTORY_FILE = path.join(process.cwd(), 'output', 'topic-history.json');
const PATTERN_HISTORY_FILE = path.join(process.cwd(), 'output', 'pattern-history.json');

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
async function saveTopicToHistory(
  topic: string,
  category: Category,
  patternId?: string
): Promise<void> {
  const history = await loadTopicHistory();
  const today = new Date().toISOString().split('T')[0];

  history.push({ date: today, topic, category, patternId });

  // Keep only last 100 entries
  const recentHistory = history.slice(-100);

  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(recentHistory, null, 2), 'utf-8');
}

/**
 * Load pattern history for weighted selection
 */
async function loadPatternHistory(): Promise<PatternHistory[]> {
  try {
    const content = await fs.readFile(PATTERN_HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Save pattern to history
 */
async function savePatternToHistory(patternId: string, topic: string): Promise<void> {
  const history = await loadPatternHistory();
  const today = new Date().toISOString().split('T')[0];

  history.push({ date: today, patternId, topic });

  // Keep only last 50 entries
  const recentHistory = history.slice(-50);

  await fs.mkdir(path.dirname(PATTERN_HISTORY_FILE), { recursive: true });
  await fs.writeFile(PATTERN_HISTORY_FILE, JSON.stringify(recentHistory, null, 2), 'utf-8');
}

/**
 * Generate multiple topic candidates and select the best one
 * Enhanced with PERFORMANCE-BASED pattern selection for better results
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

  // Get pattern history for weighted selection
  const patternHistory = await loadPatternHistory();
  const recentPatternIds = patternHistory.slice(-14).map((h) => h.patternId);

  // 🎯 성과 기반 패턴 선택 (핵심 변경!)
  const patternSelection = selectPatternByWeight(category, recentPatternIds);
  console.log(
    `   🎯 선택된 패턴: ${patternSelection.pattern.id} (평균 ${patternSelection.pattern.avgViews.toLocaleString()} 조회수)`
  );
  console.log(`   📊 변형 방향: ${patternSelection.variationGuide}`);

  // Generate topic combination for additional guidance (fairytale only)
  const combination =
    category === 'fairytale' ? generateTopicCombination(category, recentTopics) : null;
  if (combination) {
    console.log(
      `   🎲 추가 조합: ${combination.theme.nameKo} × ${combination.situation.nameKo} × ${combination.emotion.nameKo}`
    );
  }

  // Step 1: Generate multiple candidates with pattern-based guidance
  console.log(`   📝 주제 후보 ${candidateCount}개 생성 중...`);
  const candidates = await generateTopicCandidatesWithPattern(
    model,
    category,
    targetLanguage,
    nativeLanguage,
    recentTopics,
    candidateCount,
    patternSelection,
    combination
  );
  console.log(`   ✓ 후보: ${candidates.map((c, i) => `${i + 1}. ${c}`).join(' | ')}`);

  // Step 2: LLM selects the best one
  console.log(`   🤖 최적 주제 선정 중...`);
  const bestTopic = await selectBestTopic(model, candidates, category, nativeLanguage);

  // Save to history with pattern info
  const inferredPatternId = inferPatternFromTopic(bestTopic) || patternSelection.pattern.id;
  await saveTopicToHistory(bestTopic, category, inferredPatternId);
  await savePatternToHistory(inferredPatternId, bestTopic);

  return bestTopic;
}

/**
 * Legacy function for backward compatibility
 */
export async function selectTimlyTopicLegacy(
  category: Category,
  targetLanguage: string = 'English',
  nativeLanguage: string = 'Korean',
  candidateCount: number = 3
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const history = await loadTopicHistory();
  const recentTopics = history.slice(-30).map((h) => h.topic);

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

  console.log(`   🤖 최적 주제 선정 중...`);
  const bestTopic = await selectBestTopic(model, candidates, category, nativeLanguage);

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
${
  todaySuggestions.length > 0
    ? `
## 💡 오늘 이벤트 관련 추천 주제
${todaySuggestions.map((s) => `- ${s}`).join('\n')}
`
    : ''
}

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

# ✨ 좋은 주제 예시 (10-15자 참고)
**스토리/에피소드:**
- 어릴 때 살던 집에 갔어요 (12자)
- 길고양이를 집에 데려왔어요 (12자)
- 서울에 한파가 시작됐어요 (11자)
- 늦잠 자서 지각했어요 (9자)

**회화/대화:**
- 건강 검진 결과가 나왔어요 (12자)
- 새해 목표가 뭐예요? (9자)
- 크리스마스에 약속 있어요? (12자)
- 어떤 음악 좋아하세요? (10자)

**뉴스/시사:**
- 한국 음식이 해외서 인기예요 (13자)
- 서울에 폭염이 시작됐어요 (11자)
- 서울에 크리스마스가 왔어요 (12자)

**여행/비즈니스:**
- 호텔에서 체크인을 해요 (10자)
- 공항에서 입국 심사 받았어요 (13자)
- 버스 탈까요, 지하철 탈까요? (13자)

**수업/정보:**
- 돈이 새는 5가지 습관 (10자)
- 작심삼일 극복하는 법 (10자)
- 겨울에 눈이 내리는 이유 (11자)

**동화/힐링:**
- 욕심 많은 개의 최후 (9자)
- 시골 쥐와 도시 쥐 (8자)
- 가장 늦게 피어난 꽃 (9자)

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

# Output Format (CRITICAL - 반드시 준수!)
${nativeLangName === 'Korean' ? '한글' : nativeLangName}로 **10-15자** 이내.

## ⚠️ 글자수 제한 (MUST FOLLOW)
- 공백 포함 **최대 15자**
- 15자 초과 시 ❌ 실패로 간주
- 경쟁 채널 평균: 12자

## 글자수 예시
✅ 좋음 (15자 이하):
- "서울에 한파가 시작됐어요" (12자)
- "길고양이를 집에 데려왔어요" (13자)
- "늦잠 자서 지각했어요" (10자)

❌ 나쁨 (15자 초과):
- "비 오는 날, 주인을 잃은 강아지가 저를 따라왔어요" (24자)

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
    story: `감성적인 에피소드. 공감되는 일상 이야기. (10-15자)
예: "길고양이를 집에 데려왔어요", "서울에 한파가 시작됐어요", "늦잠 자서 지각했어요"`,

    conversation: `공감되는 주제로 나누는 ${targetLangName} 대화. (10-15자)
예: "건강 검진 결과가 나왔어요", "새해 목표가 뭐예요?", "어떤 음악 좋아하세요?"`,

    news: `흥미로운 소식을 전하는 뉴스 스타일. (10-15자)
예: "한국 음식이 해외서 인기예요", "서울에 폭염이 시작됐어요", "서울에 한파가 왔어요"`,

    announcement: `일상에서 듣는 안내와 그에 대한 반응. (10-15자)
예: "비행기가 2시간 지연됐대요", "세일 마지막 날이래요"`,

    travel_business: `여행/비즈니스에서 겪는 감성적 순간. (10-15자)
예: "호텔에서 체크인을 해요", "공항에서 입국 심사 받았어요", "짐을 찾지 못했어요"`,

    lesson: `삶에 도움이 되는 따뜻한 조언. (10-15자)
예: "돈이 새는 5가지 습관", "작심삼일 극복하는 법"`,

    fairytale: `이솝우화 스타일의 간결한 동화 제목. (10-15자)
**핵심**: 시의성 없이 보편적 교훈, 호기심 유발
예: "욕심 많은 개의 최후", "시골 쥐와 도시 쥐", "한입 거리 생쥐의 반전"
❌ 금지: 졸업식, 크리스마스 등 특정 시즌/이벤트 언급`,
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
예: "돈이 새는 5가지 습관" (10자), "눈이 내리는 이유" (8자)`,

    fairytale: `**간결한 명사형** 또는 **"~의 최후", "누가 더 ~할까?", "~의 반전"** 스타일.
**10-15자 이내**로 간결하게.
예: "욕심 많은 개의 최후" (9자), "시골 쥐와 도시 쥐" (8자)
❌ 금지: 시즌 언급(졸업식, 크리스마스 등), 15자 초과 제목`,
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

/**
 * 월별 시즌 키워드
 */
function getSeasonKeywords(month: number): string {
  const keywords: Record<number, string> = {
    1: '새해, 겨울, 한파, 눈, 설날',
    2: '발렌타인, 겨울, 졸업, 입시',
    3: '봄, 벚꽃, 새학기, 입학',
    4: '봄, 벚꽃, 여행, 나들이',
    5: '가정의달, 어버이날, 봄',
    6: '여름, 장마, 휴가계획',
    7: '여름휴가, 바다, 더위',
    8: '휴가, 바다, 폭염',
    9: '가을, 추석, 단풍',
    10: '가을, 단풍, 할로윈',
    11: '가을, 수능, 연말준비',
    12: '크리스마스, 연말, 송년회',
  };
  return keywords[month] || '일상';
}

/**
 * 단순화된 카테고리 가이드
 */
function getSimpleCategoryGuide(category: Category): string {
  const guides: Record<Category, string> = {
    story: '일상 에피소드, 감정이 담긴 경험담',
    conversation: '두 사람의 일상 대화, 질문과 답변',
    news: '흥미로운 소식, 트렌드, 시사',
    announcement: '안내방송, 공지사항',
    travel_business: '여행/출장 상황, 호텔/공항/식당',
    lesson: '팁, 습관, 방법론 (숫자 활용)',
    fairytale: '동물 우화, 교훈 있는 짧은 이야기',
  };
  return guides[category];
}

/**
 * 🎯 단순화된 주제 후보 생성
 * 핵심: 경쟁 채널 고성과 제목을 직접 참고하여 비슷한 느낌의 새 제목 생성
 */
async function generateTopicCandidatesWithPattern(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  category: Category,
  _targetLanguage: string,
  _nativeLanguage: string,
  recentTopics: string[],
  count: number,
  _patternSelection: PatternSelectionResult,
  _combination: TopicCombination | null
): Promise<string[]> {
  const now = new Date();
  const month = now.getMonth() + 1;

  // 고성과 제목 DB에서 카테고리별 샘플 가져오기
  const { sampleHighPerfTopics } = await import('./high-perf-topics');
  const topExamples = sampleHighPerfTopics(category, 8);

  // 시즌 키워드
  const seasonKeywords = getSeasonKeywords(month);

  const prompt = `유튜브 영어 학습 채널 제목을 ${count}개 만들어줘.

## 참고할 고성과 제목 (이런 느낌으로!)
${topExamples.map((t) => `- ${t.topic} (${Math.round(t.viewCount / 1000)}K)`).join('\n')}

## 이번 달 키워드: ${seasonKeywords}

## 카테고리: ${category}
${getSimpleCategoryGuide(category)}

## 규칙 (필수!)
1. **10~15자** (공백 포함, 절대 초과 금지)
2. **"~했어요", "~예요", "~할까요?"** 종결
3. 위 예시를 복사하지 말고, 비슷한 느낌의 새 제목
4. ${category === 'fairytale' ? '동물 우화 스타일, 시즌 언급 금지' : '현실적인 일상 상황'}

## 피할 주제 (최근 사용)
${recentTopics.slice(-10).join(', ') || '없음'}

${count}개만 출력. 번호/설명 없이 제목만.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const topics = text
    .split('\n')
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length <= 20) // 20자 초과는 필터링
    .slice(0, count);

  return topics.length > 0 ? topics : [text.split('\n')[0]];
}
