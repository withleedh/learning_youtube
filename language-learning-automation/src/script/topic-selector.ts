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

interface TopicSelectionContext {
  recentTopics: string[];
  recentPatternIds: string[];
}

type GeminiModel = ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
type GeminiGenerateContentResult = Awaited<ReturnType<GeminiModel['generateContent']>>;

const HISTORY_FILE = path.join(process.cwd(), 'output', 'topic-history.json');
const PATTERN_HISTORY_FILE = path.join(process.cwd(), 'output', 'pattern-history.json');
const GEMINI_REQUEST_TIMEOUT_MS = 60_000;
const GEMINI_REQUEST_MAX_RETRIES = 2;
const WORKBENCH_TOPIC_POOL_BATCH_SIZE = 20;

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

async function loadTopicSelectionContext(): Promise<TopicSelectionContext> {
  const history = await loadTopicHistory();
  const patternHistory = await loadPatternHistory();

  return {
    recentTopics: history.slice(-30).map((entry) => entry.topic),
    recentPatternIds: patternHistory.slice(-14).map((entry) => entry.patternId),
  };
}

function rememberTopicSelection(
  context: TopicSelectionContext,
  topic: string,
  patternId: string
): void {
  context.recentTopics = [...context.recentTopics, topic].slice(-30);
  context.recentPatternIds = [...context.recentPatternIds, patternId].slice(-14);
}

async function recordTopicSelection(
  topic: string,
  category: Category,
  patternId: string
): Promise<void> {
  await saveTopicToHistory(topic, category, patternId);
  await savePatternToHistory(patternId, topic);
}

function appendRecentTopics(context: TopicSelectionContext, topics: string[]): void {
  if (topics.length === 0) {
    return;
  }

  context.recentTopics = [...context.recentTopics, ...topics].slice(-30);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function generateTextWithRetry(
  model: GeminiModel,
  prompt: string,
  label: string
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_REQUEST_MAX_RETRIES; attempt++) {
    try {
      const result = await withTimeout<GeminiGenerateContentResult>(
        model.generateContent(prompt),
        GEMINI_REQUEST_TIMEOUT_MS,
        label
      );
      return result.response.text().trim();
    } catch (error) {
      lastError = error;

      if (attempt < GEMINI_REQUEST_MAX_RETRIES) {
        console.warn(
          `   ⚠️ ${label} retry ${attempt}/${GEMINI_REQUEST_MAX_RETRIES - 1}: ${formatErrorMessage(error)}`
        );
      }
    }
  }

  throw new Error(
    `${label} failed after ${GEMINI_REQUEST_MAX_RETRIES} attempts: ${formatErrorMessage(lastError)}`
  );
}

async function selectTimelyTopicCandidate(
  model: GeminiModel,
  category: Category,
  targetLanguage: string,
  nativeLanguage: string,
  candidateCount: number,
  context: TopicSelectionContext,
  persistSelection: boolean
): Promise<{ topic: string; patternId: string }> {
  const patternSelection = selectPatternByWeight(category, context.recentPatternIds);
  console.log(
    `   🎯 선택된 패턴: ${patternSelection.pattern.id} (평균 ${patternSelection.pattern.avgViews.toLocaleString()} 조회수)`
  );
  console.log(`   📊 변형 방향: ${patternSelection.variationGuide}`);

  const combination =
    category === 'fairytale' ? generateTopicCombination(category, context.recentTopics) : null;
  if (combination) {
    console.log(
      `   🎲 추가 조합: ${combination.theme.nameKo} × ${combination.situation.nameKo} × ${combination.emotion.nameKo}`
    );
  }

  console.log(`   📝 주제 후보 ${candidateCount}개 생성 중...`);
  const candidates = await generateTopicCandidatesWithPattern(
    model,
    category,
    targetLanguage,
    nativeLanguage,
    context.recentTopics,
    candidateCount,
    patternSelection,
    combination
  );
  console.log(`   ✓ 후보: ${candidates.map((c, i) => `${i + 1}. ${c}`).join(' | ')}`);

  console.log(`   🤖 최적 주제 선정 중...`);
  const bestTopic = await selectBestTopic(model, candidates, category, nativeLanguage);
  const patternId = inferPatternFromTopic(bestTopic) || patternSelection.pattern.id;

  rememberTopicSelection(context, bestTopic, patternId);

  if (persistSelection) {
    await recordTopicSelection(bestTopic, category, patternId);
  }

  return { topic: bestTopic, patternId };
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
  const context = await loadTopicSelectionContext();
  const selection = await selectTimelyTopicCandidate(
    model,
    category,
    targetLanguage,
    nativeLanguage,
    candidateCount,
    context,
    true
  );

  return selection.topic;
}

export interface TopicWorkbenchBundle {
  category: Category;
  candidates: string[];
  recommendedTopic: string;
}

export interface TopicWorkbenchProgress {
  requestedCount: number;
  generatedCount: number;
  batchNumber: number;
  totalBatches: number;
  lastBatchCandidates: string[];
  phase: 'generating' | 'ranking';
}

interface GenerateTopicWorkbenchBundleOptions {
  onProgress?: (progress: TopicWorkbenchProgress) => void | Promise<void>;
}

/**
 * Generate reviewable topic candidates for the admin workbench without mutating topic history.
 */
export async function generateTopicWorkbenchBundle(
  category: Category,
  targetLanguage: string = 'English',
  nativeLanguage: string = 'Korean',
  candidateCount: number = 3,
  options: GenerateTopicWorkbenchBundleOptions = {}
): Promise<TopicWorkbenchBundle> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });
  const context = await loadTopicSelectionContext();
  const poolSize = Math.max(1, candidateCount);
  const batchSize = Math.min(poolSize, WORKBENCH_TOPIC_POOL_BATCH_SIZE);
  const totalBatches = Math.ceil(poolSize / batchSize);
  const maxAttempts = Math.max(totalBatches * 3, 3);
  const candidates: string[] = [];
  let attemptCount = 0;
  let batchNumber = 0;

  while (candidates.length < poolSize && attemptCount < maxAttempts) {
    attemptCount += 1;
    batchNumber += 1;
    const remaining = poolSize - candidates.length;
    const requestCount = Math.min(batchSize, remaining);
    const patternSelection = selectPatternByWeight(category, context.recentPatternIds);
    const combination =
      category === 'fairytale' ? generateTopicCombination(category, context.recentTopics) : null;
    const acceptedCandidates = (
      await generateTopicCandidatesWithPattern(
        model,
        category,
        targetLanguage,
        nativeLanguage,
        context.recentTopics,
        requestCount,
        patternSelection,
        combination
      )
    ).slice(0, requestCount);

    if (acceptedCandidates.length === 0) {
      continue;
    }

    candidates.push(...acceptedCandidates);
    appendRecentTopics(context, acceptedCandidates);

    await options.onProgress?.({
      requestedCount: poolSize,
      generatedCount: candidates.length,
      batchNumber: Math.min(batchNumber, totalBatches),
      totalBatches,
      lastBatchCandidates: acceptedCandidates,
      phase: 'generating',
    });
  }

  if (candidates.length < poolSize) {
    throw new Error(`Only generated ${candidates.length}/${poolSize} topic candidates`);
  }

  await options.onProgress?.({
    requestedCount: poolSize,
    generatedCount: candidates.length,
    batchNumber: totalBatches,
    totalBatches,
    lastBatchCandidates: [],
    phase: 'ranking',
  });

  const recommendedTopic =
    candidates.length === 1
      ? candidates[0]
      : await selectBestTopic(model, candidates, category, nativeLanguage);

  return {
    category,
    candidates,
    recommendedTopic,
  };
}

export async function recordApprovedTopic(
  topic: string,
  category: Category
): Promise<void> {
  const patternId = inferPatternFromTopic(topic);
  await saveTopicToHistory(topic, category, patternId);
  if (patternId) {
    await savePatternToHistory(patternId, topic);
  }
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
  model: GeminiModel,
  category: Category,
  targetLanguage: string,
  nativeLanguage: string,
  recentTopics: string[],
  count: number
): Promise<string[]> {
  // Get current date info
  const now = new Date();
  const month = now.getMonth() + 1;

  // Language display names (in each native language)
  const langDisplayNames: Record<string, Record<string, string>> = {
    Korean: {
      English: '영어',
      Korean: '한국어',
      Japanese: '일본어',
      Chinese: '중국어',
      Spanish: '스페인어',
    },
    Japanese: {
      English: '英語',
      Korean: '韓国語',
      Japanese: '日本語',
      Chinese: '中国語',
      Spanish: 'スペイン語',
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

  // Build prompt based on native language
  const prompt = buildTopicPrompt(
    nativeLanguage,
    targetLangName,
    nativeLangName,
    month,
    category,
    count,
    culturalContext,
    culturalCategory,
    highPerformancePatterns,
    todayEventsContext,
    todaySuggestions,
    recentTopics
  );

  const text = await generateTextWithRetry(model, prompt, `Generate ${count} topic candidates`);

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
  model: GeminiModel,
  candidates: string[],
  category: Category,
  nativeLanguage: string
): Promise<string> {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const isKorean = nativeLanguage === 'Korean';
  const isJapanese = nativeLanguage === 'Japanese';

  let prompt: string;
  if (isJapanese) {
    prompt = `# Task
次の${candidates.length}個のYouTube動画トピック候補から、**最もクリックしたくなる**トピックを1つ選んでください。

# 候補
${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}

# 選定基準
1. **好奇心**: 「これ何？」とクリックしたくなる度合い
2. **感情的共感**: 視聴者が「私もそういうことあった」と感じられる度合い
3. **具体性**: 曖昧でなく状況がイメージできる度合い
4. **季節性**: 今の時期に合っている度合い

# Output
選択したトピックのみ出力（番号や説明なし）`;
  } else if (isKorean) {
    prompt = `# Task
다음 ${candidates.length}개의 유튜브 영상 주제 후보 중에서 **가장 클릭하고 싶은** 주제 1개를 선택해줘.

# 후보
${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}

# 선정 기준
1. **호기심 유발**: "이게 뭐지?" 하고 클릭하고 싶은 정도
2. **감정적 공감**: 시청자가 "나도 그런 적 있어" 하고 느낄 수 있는 정도
3. **구체성**: 막연하지 않고 상황이 그려지는 정도
4. **시의성**: 지금 시기에 맞는 정도

# Output
선택한 주제만 출력 (번호나 설명 없이)`;
  } else {
    prompt = `# Task
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
  }

  const selected = await generateTextWithRetry(
    model,
    prompt,
    `Select best topic from ${candidates.length} candidates`
  );

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
 * Get simple category guide for Japanese
 */
function getSimpleCategoryGuideJapanese(category: Category): string {
  const guides: Record<Category, string> = {
    story: '日常のエピソード、感情的な瞬間',
    conversation: '友達/家族/同僚との会話',
    news: '興味深いニュース、トレンド',
    announcement: '空港/店舗/公共施設のアナウンス',
    travel_business: '旅行/出張、ホテル/空港/レストラン',
    lesson: 'ヒント、習慣、方法論（数字活用）',
    fairytale: '動物寓話、教訓のある短い話',
  };
  return guides[category];
}

/**
 * 🎯 단순화된 주제 후보 생성
 * 핵심: 경쟁 채널 고성과 제목을 직접 참고하여 비슷한 느낌의 새 제목 생성
 */
async function generateTopicCandidatesWithPattern(
  model: GeminiModel,
  category: Category,
  _targetLanguage: string,
  nativeLanguage: string,
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

  // Build prompt based on native language
  const prompt =
    nativeLanguage === 'Japanese'
      ? buildJapanesePatternPrompt(count, topExamples, seasonKeywords, category, recentTopics)
      : buildKoreanPatternPrompt(count, topExamples, seasonKeywords, category, recentTopics);

  const text = await generateTextWithRetry(
    model,
    prompt,
    `Generate ${count} patterned topic candidates`
  );

  const topics = text
    .split('\n')
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length <= 25) // 25자 초과는 필터링
    .slice(0, count);

  return topics.length > 0 ? topics : [text.split('\n')[0]];
}

/**
 * Korean pattern prompt (original)
 */
function buildKoreanPatternPrompt(
  count: number,
  topExamples: Array<{ topic: string; viewCount: number }>,
  seasonKeywords: string,
  category: Category,
  recentTopics: string[]
): string {
  return `유튜브 영어 학습 채널 제목을 ${count}개 만들어줘.

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
}

/**
 * Japanese pattern prompt
 */
function buildJapanesePatternPrompt(
  count: number,
  topExamples: Array<{ topic: string; viewCount: number }>,
  seasonKeywords: string,
  category: Category,
  recentTopics: string[]
): string {
  return `YouTube英語学習チャンネルのタイトルを${count}個作ってください。

## 参考にする高パフォーマンスタイトル（このような感じで！）
${topExamples.map((t) => `- ${t.topic} (${Math.round(t.viewCount / 1000)}K)`).join('\n')}

## 今月のキーワード: ${seasonKeywords}

## カテゴリ: ${category}
${getSimpleCategoryGuideJapanese(category)}

## ルール（必須！）
1. **10~20文字**（スペース含む、絶対超過禁止）
2. **「〜しました」「〜です」「〜しましょうか？」** 終結
3. 上の例をコピーせず、似た感じの新しいタイトル
4. ${category === 'fairytale' ? '動物寓話スタイル、シーズン言及禁止' : '現実的な日常状況'}

## 避けるトピック（最近使用）
${recentTopics.slice(-10).join(', ') || 'なし'}

${count}個だけ出力。番号/説明なしでタイトルのみ。`;
}

/**
 * Build topic generation prompt based on native language
 */
function buildTopicPrompt(
  nativeLanguage: string,
  targetLangName: string,
  nativeLangName: string,
  month: number,
  category: Category,
  count: number,
  culturalContext: string,
  culturalCategory: { category: string } | null,
  highPerformancePatterns: string,
  todayEventsContext: string,
  todaySuggestions: string[],
  recentTopics: string[]
): string {
  if (nativeLanguage === 'Japanese') {
    return buildJapaneseTopicPrompt(
      targetLangName,
      nativeLangName,
      month,
      category,
      count,
      culturalContext,
      culturalCategory,
      highPerformancePatterns,
      todayEventsContext,
      todaySuggestions,
      recentTopics
    );
  }

  // Default: Korean prompt
  return buildKoreanTopicPrompt(
    targetLangName,
    nativeLangName,
    month,
    category,
    count,
    culturalContext,
    culturalCategory,
    highPerformancePatterns,
    todayEventsContext,
    todaySuggestions,
    recentTopics
  );
}

/**
 * Korean topic prompt (original)
 */
function buildKoreanTopicPrompt(
  targetLangName: string,
  nativeLangName: string,
  month: number,
  category: Category,
  count: number,
  culturalContext: string,
  culturalCategory: { category: string } | null,
  highPerformancePatterns: string,
  todayEventsContext: string,
  todaySuggestions: string[],
  recentTopics: string[]
): string {
  return `# Role
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
한글로 **10-15자** 이내.

## ⚠️ 글자수 제한 (MUST FOLLOW)
- 공백 포함 **최대 15자**
- 15자 초과 시 ❌ 실패로 간주

${getOutputStyleGuidance(category)}

**정확히 ${count}개**의 주제를 줄바꿈으로 구분해서 출력.
부가 설명 없이 주제만 출력.`;
}

/**
 * Japanese topic prompt
 */
function buildJapaneseTopicPrompt(
  targetLangName: string,
  nativeLangName: string,
  month: number,
  category: Category,
  count: number,
  culturalContext: string,
  culturalCategory: { category: string } | null,
  _highPerformancePatterns: string,
  _todayEventsContext: string,
  _todaySuggestions: string[],
  recentTopics: string[]
): string {
  return `# Role
あなたはYouTube ${targetLangName}学習チャンネルの「ストーリーテラー」です。

# Goal
視聴者が「これ何？気になる！」とクリックしたくなる**感情的で共感できる**トピックを選定

# Target Audience
- ${targetLangName}初中級者
- 母国語: ${nativeLangName}
${culturalContext}

# Task
${month}月に合った**感情的でストーリーのある** ${targetLangName}学習トピックを**${count}個**提案してください。
${culturalCategory ? `今日は「${culturalCategory.category}」関連のトピックを優先してください。` : ''}

# Category: ${category}
${getJapaneseCategoryGuidance(category, targetLangName)}

# 🎯 トピック選定の核心原則

## 1. 感情刺激（クリックしたくなる好奇心/共感）
✅ 良い: "子供の頃住んでいた家に行きました", "去年の自分からの新年メッセージ"
❌ 悪い: "カフェで注文する", "ホテルチェックイン" (平凡すぎる)

## 2. 具体的な状況（曖昧でないストーリー）
✅ 良い: "新年直前、エレベーターに閉じ込められました", "今年のクリスマスは私がサンタです"
❌ 悪い: "エレベーターに乗る", "クリスマスの話" (曖昧)

## 3. 共感ポイント（誰もが経験しそうな感情）
✅ 良い: "うんざりする会社で忘年会をしました", "健康診断の結果が出ました"
❌ 悪い: "会社生活", "病院に行く" (感情がない)

# ✨ 良いトピック例（10-20文字参考）
**ストーリー/エピソード:**
- 子供の頃住んでいた家に行きました
- 野良猫を家に連れてきました
- 東京に寒波が来ました
- 寝坊して遅刻しました

**会話/対話:**
- 健康診断の結果が出ました
- 新年の目標は何ですか？
- クリスマスに予定ありますか？
- どんな音楽が好きですか？

# 季節性 (${month}月)
- 1-2月: 新年の抱負、冬の感性、正月、バレンタイン
- 3-4月: 春のときめき、桜、新しい始まり、卒業/入学
- 5-6月: 旅行のワクワク、休暇計画、ゴールデンウィーク
- 7-8月: 夏休み、海、暑さ、休息
- 9-10月: 秋の感性、紅葉、お盆、ハロウィン
- 11-12月: 年末の感性、クリスマス、忘年会、振り返り

# 重複回避（最近使用したトピック）
${
  recentTopics.length > 0
    ? recentTopics
        .slice(-10)
        .map((t) => `- ${t}`)
        .join('\n')
    : '(なし)'
}

# Output Format (CRITICAL - 必ず守ること！)
日本語で**10-20文字**以内。

## ⚠️ 文字数制限 (MUST FOLLOW)
- スペース含め**最大20文字**
- 20文字超過は❌失敗とみなす

**正確に${count}個**のトピックを改行で区切って出力。
追加説明なしでトピックのみ出力。`;
}

/**
 * Japanese category guidance
 */
function getJapaneseCategoryGuidance(category: Category, targetLangName: string): string {
  const guidance: Record<Category, string> = {
    story: `感情的なエピソード。共感できる日常の話。(10-20文字)
例: "野良猫を家に連れてきました", "東京に寒波が来ました"`,

    conversation: `共感できるテーマで交わす${targetLangName}会話。(10-20文字)
例: "健康診断の結果が出ました", "新年の目標は何ですか？"`,

    news: `興味深いニュースを伝えるスタイル。(10-20文字)
例: "日本食が海外で人気です", "東京に猛暑が始まりました"`,

    announcement: `日常で聞くアナウンスとそれに対する反応。(10-20文字)
例: "飛行機が2時間遅延だそうです", "セール最終日だそうです"`,

    travel_business: `旅行/ビジネスで経験する感情的な瞬間。(10-20文字)
例: "ホテルでチェックインします", "空港で入国審査を受けました"`,

    lesson: `人生に役立つ温かいアドバイス。(10-20文字)
例: "お金が漏れる5つの習慣", "三日坊主を克服する方法"`,

    fairytale: `イソップ寓話スタイルの簡潔な童話タイトル。(10-20文字)
例: "欲張りな犬の末路", "田舎のネズミと都会のネズミ"`,
  };

  return guidance[category] || '';
}
