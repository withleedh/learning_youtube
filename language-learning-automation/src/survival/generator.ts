/**
 * Survival Generator - Gemini 기반 "Cat vs Dog 50라운드 서바이벌" 콘텐츠 생성
 *
 * Requirements:
 * - 1.1: Generate exactly 50 rounds
 * - 1.4: Category distribution - no single category > 50% (max 25 rounds per category)
 * - 1.6: Fast-paced content (short situation, explanation)
 * - 10.2: Explanation under 30 characters (20 recommended)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';
import {
  survivalScriptSchema,
  type SurvivalScript,
  type SurvivalRound,
  type SurvivalCharacter,
} from './types';
import { HPSystem, DEFAULT_HP_CONFIG, HPSystemConfig } from './hp-system';
import {
  generateRoundWinners,
  assignExpressionsToCharacters,
  type WinnerDecision,
} from './winner-logic';

// Category type (same as comparison)
export type SurvivalCategory =
  | 'daily'
  | 'business'
  | 'emotion'
  | 'request_reject'
  | 'apology_thanks';

// Category display names (Korean)
export const SURVIVAL_CATEGORY_NAMES: Record<SurvivalCategory, string> = {
  daily: '일상',
  business: '비즈니스',
  emotion: '감정표현',
  request_reject: '요청/거절',
  apology_thanks: '사과/감사',
};

/**
 * Configuration for the survival generator
 */
export interface SurvivalGeneratorConfig {
  roundCount: number; // 50
  categories?: SurvivalCategory[];
  excludeExpressions?: string[];
  seed?: number; // For reproducible randomization
}

/**
 * Default generator configuration
 */
const DEFAULT_CONFIG: SurvivalGeneratorConfig = {
  roundCount: 50,
  categories: ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'],
};

/**
 * Raw expression pair from Gemini (before character assignment)
 */
interface RawExpressionPair {
  category: SurvivalCategory;
  situation: string;
  situationEnglish: string;
  konglishText: string;
  nativeText: string;
  explanation: string;
}

/**
 * Generate the Gemini prompt for expression pairs
 * Optimized for fast-paced survival quiz format
 */
function generateExpressionPairsPrompt(count: number, config: SurvivalGeneratorConfig): string {
  const categoryList = (config.categories || DEFAULT_CONFIG.categories!)
    .map((c) => `${c} (${SURVIVAL_CATEGORY_NAMES[c]})`)
    .join(', ');

  const excludeSection =
    config.excludeExpressions && config.excludeExpressions.length > 0
      ? `\n\nEXCLUDE these expressions (already used):\n${config.excludeExpressions.map((e) => `- "${e}"`).join('\n')}`
      : '';

  return `You are creating content for a "Cat vs Dog English Survival Quiz" game show.

Generate exactly ${count} English expression quiz pairs for rapid-fire rounds (8-10 seconds each).

Each pair should have:
1. category: one of [${categoryList}]
2. situation: 상황 설명 (Korean, VERY SHORT - under 15 characters)
3. situationEnglish: The English phrase being asked (e.g., "Where is the bathroom?")
4. konglishText: 한국인이 흔히 쓰는 어색한 영어 (Konglish/wrong)
5. nativeText: 원어민이 실제로 쓰는 표현 (correct)
6. explanation: 왜 다른지 설명 (Korean, UNDER 20 characters - must be very brief!)

CRITICAL RULES FOR FAST PACING:
- situation must be VERY SHORT (under 15 chars) - e.g., "화장실 어디에요?"
- explanation must be UNDER 20 chars - e.g., "toilet은 변기 자체를 의미"
- Focus on common, relatable mistakes
- Each pair must be instantly understandable
- Distribute categories evenly (no single category > 50% of total, max ${Math.floor(count / 2)} per category)

IMPORTANT RULES:
- Korean expressions should be things Koreans ACTUALLY say (common mistakes)
- Native expressions should be what Americans/British ACTUALLY say in daily life
- Focus on expressions that make viewers think "나도 이렇게 말했는데!"
- Avoid textbook examples, use real conversational English
- Each pair should be self-contained (understandable without context)
${excludeSection}

Examples:
{
  "category": "daily",
  "situation": "화장실 어디에요?",
  "situationEnglish": "Where is the bathroom?",
  "konglishText": "Where is toilet?",
  "nativeText": "Where is the restroom?",
  "explanation": "toilet은 변기 자체를 의미"
}

{
  "category": "business",
  "situation": "회의 시간 확인",
  "situationEnglish": "What time is the meeting?",
  "konglishText": "What time is meeting?",
  "nativeText": "What time does the meeting start?",
  "explanation": "the와 동사 필요"
}

{
  "category": "emotion",
  "situation": "응원할 때",
  "situationEnglish": "Cheering someone on",
  "konglishText": "Fighting!",
  "nativeText": "You got this!",
  "explanation": "fighting은 콩글리시"
}

Return ONLY a JSON array with this structure (no markdown, no explanation):
[
  {
    "category": "daily",
    "situation": "화장실 어디에요?",
    "situationEnglish": "Where is the bathroom?",
    "konglishText": "Where is toilet?",
    "nativeText": "Where is the restroom?",
    "explanation": "toilet은 변기 자체를 의미"
  }
]`;
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
 * Validate category distribution
 * Requirement 1.4: No single category > 50% (max 25 rounds per category for 50 rounds)
 */
function validateCategoryDistribution(pairs: RawExpressionPair[], maxPerCategory: number): boolean {
  const categoryCount: Record<string, number> = {};

  for (const pair of pairs) {
    categoryCount[pair.category] = (categoryCount[pair.category] || 0) + 1;
  }

  for (const count of Object.values(categoryCount)) {
    if (count > maxPerCategory) {
      return false;
    }
  }

  return true;
}

/**
 * Truncate explanation to max length if needed
 * Requirement 10.2: Explanation under 30 characters (20 recommended)
 */
function truncateExplanation(explanation: string, maxLength: number = 30): string {
  if (explanation.length <= maxLength) {
    return explanation;
  }
  return explanation.slice(0, maxLength - 3) + '...';
}

/**
 * SurvivalGenerator class for generating survival quiz content
 */
export class SurvivalGenerator {
  private genAI: GoogleGenerativeAI;
  private hpSystem: HPSystem;

  constructor(apiKey?: string) {
    const key = apiKey || getGeminiApiKey();
    this.genAI = new GoogleGenerativeAI(key);
    this.hpSystem = new HPSystem(DEFAULT_HP_CONFIG);
  }

  /**
   * Generate complete survival script
   *
   * @param channelId - Channel identifier
   * @param config - Optional configuration overrides
   * @returns Complete SurvivalScript with 50 rounds
   */
  async generateScript(
    channelId: string,
    config?: Partial<SurvivalGeneratorConfig>
  ): Promise<SurvivalScript> {
    const fullConfig: SurvivalGeneratorConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Validate round count (minimum 1)
    if (fullConfig.roundCount < 1) {
      console.warn(`Round count ${fullConfig.roundCount} is less than 1, adjusting to 1`);
      fullConfig.roundCount = 1;
    }

    console.log(`🎮 Generating survival script with ${fullConfig.roundCount} rounds...`);

    // Step 1: Generate expression pairs from Gemini
    const expressionPairs = await this.generateExpressionPairs(fullConfig.roundCount, fullConfig);
    console.log(`   ✓ Generated ${expressionPairs.length} expression pairs`);

    // Step 2: Pre-determine all round winners
    const roundWinners = generateRoundWinners(fullConfig.roundCount, fullConfig.seed);
    console.log(`   ✓ Generated ${roundWinners.length} winner decisions`);

    // Step 3: Build rounds with character assignments
    const rounds = this.buildRounds(expressionPairs, roundWinners);
    console.log(`   ✓ Built ${rounds.length} complete rounds`);

    // Step 4: Calculate HP progression and final results
    const hpConfig: HPSystemConfig = {
      ...DEFAULT_HP_CONFIG,
      totalRounds: fullConfig.roundCount, // Use actual round count for dynamic damage
    };
    this.hpSystem = new HPSystem(hpConfig); // Reset HP system with correct round count
    for (const round of rounds) {
      const loser: SurvivalCharacter = round.winner === 'cat' ? 'dog' : 'cat';
      this.hpSystem.applyRoundResult(loser, round.id);
    }
    const finalResults = this.hpSystem.getFinalResults();
    console.log(`   ✓ Calculated final results: ${finalResults.winner} wins!`);

    // Step 5: Build complete script
    const today = new Date().toISOString().split('T')[0];

    const scriptData = {
      channelId,
      date: today,
      title: {
        korean: '고양이 vs 강아지 50라운드 서바이벌',
        english: 'Cat vs Dog 50-Round Survival',
      },
      intro: {
        title: 'Cat vs Dog 서바이벌!',
        subtitle: '틀리면 바닥이 열립니다!',
      },
      rounds,
      ending: {
        winner: finalResults.winner,
        catFinalHP: finalResults.catFinalHP,
        dogFinalHP: finalResults.dogFinalHP,
        catWins: finalResults.catWins,
        dogWins: finalResults.dogWins,
        ctaQuestion: '다음 대결에서는 누가 이길까요?',
      },
    };

    // Step 6: Validate with schema
    const validationResult = survivalScriptSchema.safeParse(scriptData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Generated script failed validation: ${errors}`);
    }

    console.log(`   ✓ Script validation passed`);

    return validationResult.data;
  }

  /**
   * Generate raw expression pairs using Gemini
   * Private method for internal use
   */
  private async generateExpressionPairs(
    count: number,
    config: SurvivalGeneratorConfig
  ): Promise<RawExpressionPair[]> {
    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODELS.text });
    const prompt = generateExpressionPairsPrompt(count, config);

    let attempts = 0;
    const maxAttempts = 3;
    const maxPerCategory = Math.floor(count / 2); // 50% max per category

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`   📝 Generating expression pairs (attempt ${attempts}/${maxAttempts})...`);

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const pairs = parseJsonResponse<RawExpressionPair[]>(text);

        if (!Array.isArray(pairs)) {
          throw new Error('Expected array of expression pairs from Gemini');
        }

        // Validate we got enough pairs
        if (pairs.length < count) {
          console.warn(`   ⚠️ Got ${pairs.length} pairs, expected ${count}. Retrying...`);
          continue;
        }

        // Take exactly the count we need
        const selectedPairs = pairs.slice(0, count);

        // Validate category distribution (skip for small round counts)
        if (count > 5 && !validateCategoryDistribution(selectedPairs, maxPerCategory)) {
          console.warn(`   ⚠️ Category distribution invalid (>50% in one category). Retrying...`);
          continue;
        }

        // Truncate explanations if needed (Requirement 10.2)
        const processedPairs = selectedPairs.map((pair) => ({
          ...pair,
          explanation: truncateExplanation(pair.explanation, 30),
        }));

        return processedPairs;
      } catch (error) {
        console.error(`   ❌ Attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error(`Failed to generate expression pairs after ${maxAttempts} attempts`);
  }

  /**
   * Build complete rounds from expression pairs and winner decisions
   */
  private buildRounds(
    expressionPairs: RawExpressionPair[],
    roundWinners: WinnerDecision[]
  ): SurvivalRound[] {
    const rounds: SurvivalRound[] = [];

    for (let i = 0; i < expressionPairs.length; i++) {
      const pair = expressionPairs[i];
      const winnerDecision = roundWinners[i];

      // Assign expressions to characters based on winner
      const { konglishAnswer, nativeAnswer } = assignExpressionsToCharacters(
        pair.konglishText,
        pair.nativeText,
        winnerDecision.winner
      );

      const round: SurvivalRound = {
        id: i + 1,
        category: pair.category,
        situation: pair.situation,
        situationEnglish: pair.situationEnglish,
        konglishAnswer,
        nativeAnswer,
        explanation: pair.explanation,
        winner: winnerDecision.winner,
      };

      rounds.push(round);
    }

    return rounds;
  }
}

/**
 * Convenience function to generate a survival script
 */
export async function generateSurvivalScript(
  channelId: string,
  config?: Partial<SurvivalGeneratorConfig>
): Promise<SurvivalScript> {
  const generator = new SurvivalGenerator();
  return generator.generateScript(channelId, config);
}
