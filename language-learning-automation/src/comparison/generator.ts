/**
 * Comparison Generator - Gemini 기반 "한국인 영어 vs 원어민 영어" 비교 표현 생성
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';
import {
  comparisonScriptSchema,
  type ComparisonScript,
  type ComparisonSegment,
  type ComparisonCategory,
  type Hook,
  type CTA,
  CATEGORY_NAMES,
} from './types';

// Re-export sample script creation for convenience
export { createSampleComparisonScript } from './sample';

// Generator configuration
export interface ComparisonGeneratorConfig {
  segmentCount: number; // 25-35
  categories?: ComparisonCategory[]; // 포함할 카테고리 (기본: 전체)
  excludeExpressions?: string[]; // 제외할 표현 (중복 방지)
}

// Default configuration
const DEFAULT_CONFIG: ComparisonGeneratorConfig = {
  segmentCount: 30,
  categories: ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'],
};

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate comparison segments prompt
 */
function generateSegmentsPrompt(config: ComparisonGeneratorConfig): string {
  const categoryList = (config.categories || DEFAULT_CONFIG.categories!)
    .map((c) => `${c} (${CATEGORY_NAMES[c]})`)
    .join(', ');

  const excludeSection =
    config.excludeExpressions && config.excludeExpressions.length > 0
      ? `\n\nEXCLUDE these expressions (already used):\n${config.excludeExpressions.map((e) => `- "${e}"`).join('\n')}`
      : '';

  return `You are an expert English teacher creating "Korean English vs Native English" comparison content for a YouTube video.

Generate exactly ${config.segmentCount} comparison pairs.

Each pair should have:
1. category: one of [${categoryList}]
2. situation: 상황 설명 (Korean, 1-2 sentences, concise)
3. koreanExpression: { text: 한국인이 흔히 쓰는 영어 (awkward but understandable), literal?: 직역 (optional) }
4. nativeExpression: { text: 원어민이 실제로 쓰는 표현 (natural, commonly used), note?: 뉘앙스 설명 (optional) }
5. explanation: 왜 다른지 간단 설명 (Korean, 1 sentence)
6. difficulty: one of ["A2", "B1", "B2", "C1"] - 표현 난이도

Categories to include: ${categoryList}
Distribute categories evenly (no single category > 50% of total).

IMPORTANT RULES:
- Korean expressions should be things Koreans ACTUALLY say (common mistakes)
- Native expressions should be what Americans/British ACTUALLY say in daily life
- Focus on expressions that make viewers think "나도 이렇게 말했는데!"
- Avoid textbook examples, use real conversational English
- Each pair should be self-contained (understandable without context)
- Prioritize expressions that trigger emotional reaction (surprise, embarrassment, realization)
- Balance difficulty: start with A2-B1, gradually include B2-C1
${excludeSection}

Examples of GOOD pairs:
❌ "I'm sorry, I can't." → ⭕ "I wish I could, but..."
❌ "Fighting!" → ⭕ "You got this!" / "Go for it!"
❌ "I will go to home." → ⭕ "I'm heading home."
❌ "I'm sorry for bothering you." → ⭕ "Sorry to bother you."
❌ "Please understand." → ⭕ "I hope you understand."

Return ONLY a JSON array with this structure (no markdown, no explanation):
[
  {
    "category": "daily",
    "situation": "친구가 도움을 요청했는데 거절해야 할 때",
    "koreanExpression": { "text": "I'm sorry, I can't." },
    "nativeExpression": { "text": "I wish I could, but I'm swamped right now.", "note": "아쉬움을 표현" },
    "explanation": "단순 거절보다 아쉬움을 표현하면 더 자연스럽고 예의 바름",
    "difficulty": "B1"
  }
]`;
}

/**
 * Generate hook variants prompt
 */
function generateHookPrompt(): string {
  return `You are a YouTube content creator specializing in English learning content.

Generate 5 different hook variants for a "Korean English vs Native English" comparison video.
Each hook should grab attention in the first 3-5 seconds.

Hook patterns to use:
- Fear/Warning: "이거 모르면 망신당합니다", "원어민이 절대 안 쓰는 표현"
- Curiosity: "90%가 틀리는 영어", "한국인만 쓰는 영어 표현"
- Challenge: "당신은 몇 개나 알고 있나요?", "이 중 틀린 표현을 찾아보세요"
- Empathy: "나도 이렇게 말했는데...", "이거 저만 그런 거 아니죠?"

Each hook should have:
1. text: 메인 텍스트 (Korean, attention-grabbing, 10-20 characters)
2. subtext: 서브 텍스트 (Korean, optional, adds context, 15-30 characters)

Ensure each hook has a DIFFERENT emotional appeal:
- Hook 1: Fear/Warning (공포/경고)
- Hook 2: Curiosity (호기심)
- Hook 3: Challenge (도전)
- Hook 4: Empathy (공감)
- Hook 5: Surprise (놀라움)

Return ONLY a JSON array with this structure (no markdown, no explanation):
[
  { "text": "90%가 틀리는 영어", "subtext": "당신도 이렇게 말하고 있을지도..." },
  { "text": "이거 모르면 망신당합니다", "subtext": "원어민 앞에서 절대 쓰면 안 되는 표현" }
]`;
}

/**
 * Generate CTA prompt
 */
function generateCTAPrompt(): string {
  return `You are a YouTube content creator.

Generate a CTA (Call-to-Action) for the end of a "Korean English vs Native English" comparison video.

The CTA should:
1. question: 댓글 유도 질문 (Korean, engaging, 15-30 characters)
2. reminder: 구독/좋아요 유도 (Korean, friendly, 20-40 characters)

Question patterns:
- "여러분은 몇 개나 알고 계셨나요?"
- "가장 충격적인 표현은 무엇이었나요?"
- "이런 실수 해본 적 있으신가요?"
- "더 알고 싶은 표현이 있으신가요?"

Return ONLY a JSON object with this structure (no markdown, no explanation):
{ "question": "여러분은 몇 개나 알고 계셨나요?", "reminder": "구독과 좋아요로 응원해주세요!" }`;
}

/**
 * Parse JSON from Gemini response
 */
function parseJsonResponse<T>(text: string): T {
  // Try to extract JSON array or object
  const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    throw new Error('Failed to parse JSON from Gemini response');
  }
}

/**
 * Generate comparison segments using Gemini
 */
async function generateSegments(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  config: ComparisonGeneratorConfig
): Promise<Omit<ComparisonSegment, 'id'>[]> {
  const prompt = generateSegmentsPrompt(config);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const segments = parseJsonResponse<Omit<ComparisonSegment, 'id'>[]>(text);

  if (!Array.isArray(segments)) {
    throw new Error('Expected array of segments from Gemini');
  }

  return segments;
}

/**
 * Generate hook variants using Gemini
 */
async function generateHookVariants(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>
): Promise<Hook[]> {
  const prompt = generateHookPrompt();
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const hooks = parseJsonResponse<Hook[]>(text);

  if (!Array.isArray(hooks) || hooks.length < 3) {
    throw new Error('Expected at least 3 hook variants from Gemini');
  }

  // Ensure we have 3-5 hooks
  return hooks.slice(0, 5);
}

/**
 * Generate CTA using Gemini
 */
async function generateCTA(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>
): Promise<CTA> {
  const prompt = generateCTAPrompt();
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const cta = parseJsonResponse<CTA>(text);

  if (!cta.question || !cta.reminder) {
    throw new Error('Invalid CTA structure from Gemini');
  }

  return cta;
}

/**
 * Generate title based on categories
 */
function generateTitle(
  categories: ComparisonCategory[],
  date: string
): { korean: string; english: string } {
  // Determine main category theme
  const categoryCount: Record<string, number> = {};
  for (const cat of categories) {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }

  const mainCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] as
    | ComparisonCategory
    | undefined;
  const categoryName = mainCategory ? CATEGORY_NAMES[mainCategory] : '일상';

  const dateNum = date.replace(/-/g, '').slice(-4); // Last 4 digits for uniqueness

  return {
    korean: `한국인 vs 원어민 ${categoryName}편 #${dateNum}`,
    english: `Korean vs Native - ${categoryName} #${dateNum}`,
  };
}

/**
 * Main function: Generate complete comparison script
 */
export async function generateComparisonScript(
  channelId: string,
  config: Partial<ComparisonGeneratorConfig> = {}
): Promise<ComparisonScript> {
  const fullConfig: ComparisonGeneratorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Validate segment count
  if (fullConfig.segmentCount < 25 || fullConfig.segmentCount > 35) {
    throw new Error('Segment count must be between 25 and 35');
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  console.log(`🎬 Generating comparison script with ${fullConfig.segmentCount} segments...`);

  // Generate all components in parallel
  const [rawSegments, hookVariants, cta] = await Promise.all([
    generateSegments(model, fullConfig),
    generateHookVariants(model),
    generateCTA(model),
  ]);

  console.log(`   ✓ Generated ${rawSegments.length} segments`);
  console.log(`   ✓ Generated ${hookVariants.length} hook variants`);
  console.log(`   ✓ Generated CTA`);

  // Add IDs to segments
  const segments: ComparisonSegment[] = rawSegments.map((seg, index) => ({
    ...seg,
    id: index + 1,
  }));

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Generate title
  const categories = segments.map((s) => s.category);
  const title = generateTitle(categories, today);

  // Use first hook variant as main hook
  const mainHook = hookVariants[0];

  // Build script object
  const scriptData = {
    channelId,
    date: today,
    title,
    hook: mainHook,
    hookVariants,
    segments,
    cta,
  };

  // Validate with schema
  const validationResult = comparisonScriptSchema.safeParse(scriptData);
  if (!validationResult.success) {
    const errors = validationResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Generated script failed validation: ${errors}`);
  }

  console.log(`   ✓ Script validation passed`);

  return validationResult.data;
}
