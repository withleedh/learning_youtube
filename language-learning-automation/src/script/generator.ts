import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import { scriptSchema, type Script, type Category } from './types';
import type { ChannelConfig } from '../config/types';
import { generateScriptPrompt, getCategoryForDay } from './prompts';
import { selectTimlyTopic } from './topic-selector';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';
import { runScriptPipeline, type PipelineConfig } from './pipeline';

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Options for script generation.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
export interface GenerateScriptOptions {
  /**
   * When true, uses the multi-step pipeline for script generation.
   * When false (default), uses the existing single-shot generation.
   *
   * **Validates: Requirement 5.3**
   */
  usePipeline?: boolean;

  /**
   * Number of script candidates to generate (for single-shot mode).
   * Default: 3
   */
  candidateCount?: number;

  /**
   * Pipeline-specific configuration options.
   * Only used when usePipeline is true.
   */
  pipelineConfig?: Partial<PipelineConfig>;
}

/**
 * Generate a script using Gemini API with candidate selection.
 *
 * This function supports two modes:
 * 1. **Pipeline mode** (usePipeline: true): Uses the multi-step pipeline that separates
 *    creative writing, structural conversion, and visual generation into distinct phases.
 *    This produces higher quality scripts by reducing AI cognitive overload.
 *
 * 2. **Single-shot mode** (usePipeline: false, default): Uses the existing single-shot
 *    generation with candidate selection. This is the legacy behavior maintained for
 *    backward compatibility.
 *
 * @param config - Channel configuration
 * @param category - Script category (optional, defaults to day-based selection)
 * @param topic - Topic for the script (optional, AI will select if not provided)
 * @param candidateCountOrOptions - Either a number (legacy) or GenerateScriptOptions object
 * @returns Generated Script object
 *
 * @example
 * // Legacy usage (backward compatible)
 * const script = await generateScript(config, 'story', 'A day at the beach', 3);
 *
 * @example
 * // New usage with pipeline
 * const script = await generateScript(config, 'story', 'A day at the beach', {
 *   usePipeline: true,
 *   pipelineConfig: { candidateCount: 1 }
 * });
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
export async function generateScript(
  config: ChannelConfig,
  category?: Category,
  topic?: string,
  candidateCountOrOptions: number | GenerateScriptOptions = 3
): Promise<Script> {
  // Parse options - support both legacy (number) and new (object) signatures
  const options: GenerateScriptOptions =
    typeof candidateCountOrOptions === 'number'
      ? { candidateCount: candidateCountOrOptions, usePipeline: false }
      : candidateCountOrOptions;

  const { usePipeline = false, candidateCount = 3, pipelineConfig } = options;

  // Use provided category or get from current day
  const scriptCategory = category || getCategoryForDay(new Date());

  // If no topic provided, let AI select a timely topic
  let selectedTopic = topic;
  if (!selectedTopic) {
    console.log('🤖 AI가 시의성 있는 주제를 선정 중...');
    selectedTopic = await selectTimlyTopic(
      scriptCategory,
      config.meta.targetLanguage,
      config.meta.nativeLanguage,
      3 // Generate 3 topic candidates
    );
    console.log(`   ✓ 선정된 주제: "${selectedTopic}"`);
  }

  // Debug: Show what we're generating
  console.log(
    `   🔍 DEBUG: category=${scriptCategory}, topic="${selectedTopic}", usePipeline=${usePipeline}`
  );

  // =========================================================================
  // Pipeline Mode (Requirement 5.2)
  // =========================================================================
  if (usePipeline) {
    console.log('   🔄 Using multi-step pipeline for script generation...');

    const result = await runScriptPipeline(config, scriptCategory, selectedTopic, {
      pipelineEnabled: true,
      candidateCount: pipelineConfig?.candidateCount ?? 1,
      ...pipelineConfig,
    });

    console.log(
      `   ✓ Pipeline completed - Creative: ${result.phases.creative.duration}ms, Structural: ${result.phases.structural.duration}ms, Visual: ${result.phases.visual.duration}ms`
    );

    return result.script;
  }

  // =========================================================================
  // Single-Shot Mode (Legacy - Requirement 5.3)
  // =========================================================================
  return generateScriptSingleShot(config, scriptCategory, selectedTopic, candidateCount);
}

/**
 * Generate a script using the legacy single-shot approach with candidate selection.
 *
 * This is the original implementation that generates multiple candidates and
 * uses LLM to select the best one. Maintained for backward compatibility.
 *
 * @param config - Channel configuration
 * @param category - Script category
 * @param topic - Topic for the script
 * @param candidateCount - Number of candidates to generate
 * @returns Generated Script object
 *
 * **Validates: Requirement 5.3**
 */
async function generateScriptSingleShot(
  config: ChannelConfig,
  category: Category,
  topic: string,
  candidateCount: number
): Promise<Script> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  // Generate multiple script candidates
  console.log(`   📝 스크립트 후보 ${candidateCount}개 생성 중...`);
  const candidates: Script[] = [];

  for (let i = 0; i < candidateCount; i++) {
    try {
      const script = await generateSingleScript(model, config, category, topic);
      candidates.push(script);
      console.log(`   ✓ 후보 ${i + 1}/${candidateCount} 생성 완료`);
    } catch (error) {
      console.warn(`   ⚠️ 후보 ${i + 1} 생성 실패: ${error}`);
    }
  }

  if (candidates.length === 0) {
    throw new Error('Failed to generate any valid script candidates');
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // LLM selects the best script
  console.log(`   🤖 최적 스크립트 선정 중...`);
  const bestScript = await selectBestScript(model, candidates, config.meta.nativeLanguage);

  return bestScript;
}

/**
 * Generate a single script (internal helper)
 */
async function generateSingleScript(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  config: ChannelConfig,
  category: Category,
  topic: string
): Promise<Script> {
  // Generate prompt
  const prompt = generateScriptPrompt(config, category, topic);

  // Call Gemini API
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }

  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse JSON from Gemini response');
  }

  // Build full script object
  const today = new Date().toISOString().split('T')[0];
  const scriptData = {
    channelId: config.channelId,
    date: today,
    category,
    ...(parsedResponse as object),
  };

  // Validate with schema
  const validationResult = scriptSchema.safeParse(scriptData);
  if (!validationResult.success) {
    const errors = validationResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Generated script failed validation: ${errors}`);
  }

  return validationResult.data;
}

/**
 * LLM selects the best script from candidates
 */
async function selectBestScript(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  candidates: Script[],
  nativeLanguage: string
): Promise<Script> {
  const isKorean = nativeLanguage === 'Korean';

  // Create summaries of each script for comparison
  const summaries = candidates.map((script, i) => {
    const firstSentences = script.sentences
      .slice(0, 3)
      .map((s) => s.target)
      .join(' ');
    const lastSentences = script.sentences
      .slice(-2)
      .map((s) => s.target)
      .join(' ');
    return `## 후보 ${i + 1}
제목: ${script.metadata.title.target}
스타일: ${script.metadata.style}
시작: ${firstSentences}
끝: ${lastSentences}`;
  });

  const prompt = isKorean
    ? `# Task
다음 ${candidates.length}개의 영어 학습 스크립트 후보 중에서 **가장 좋은** 스크립트 1개를 선택해줘.

${summaries.join('\n\n')}

# 선정 기준
1. **자연스러움**: 실제 원어민이 쓸 법한 자연스러운 표현
2. **흐름**: 문장 간 연결이 자연스럽고 스토리가 잘 흐르는지
3. **학습 가치**: 유용한 표현과 어휘가 포함되어 있는지
4. **감정적 공감**: 시청자가 공감할 수 있는 내용인지
5. **완결성**: 시작과 끝이 잘 마무리되는지

# Output
선택한 후보 번호만 출력 (예: 1, 2, 또는 3)`
    : `# Task
Select the **best** script from these ${candidates.length} language learning script candidates.

${summaries.join('\n\n')}

# Selection Criteria
1. **Naturalness**: Sounds like what a native speaker would actually say
2. **Flow**: Sentences connect naturally and the story flows well
3. **Learning value**: Contains useful expressions and vocabulary
4. **Emotional resonance**: Content that viewers can relate to
5. **Completeness**: Has a good beginning and satisfying ending

# Output
Output only the selected candidate number (e.g., 1, 2, or 3)`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const selected = response.text().trim();

  // Parse the selected number
  const match = selected.match(/(\d+)/);
  if (match) {
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < candidates.length) {
      console.log(`   ✓ 후보 ${index + 1} 선정됨`);
      return candidates[index];
    }
  }

  // Default to first candidate
  console.log(`   ✓ 기본값으로 후보 1 선정됨`);
  return candidates[0];
}

/**
 * Save a script to a JSON file
 */
export async function saveScript(script: Script, outputDir: string): Promise<string> {
  const filename = `${script.date}_${script.category}.json`;
  const outputPath = path.join(outputDir, filename);

  // Ensure directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Write file
  await fs.writeFile(outputPath, JSON.stringify(script, null, 2), 'utf-8');

  return outputPath;
}

/**
 * Load a script from a JSON file
 */
export async function loadScript(scriptPath: string): Promise<Script> {
  const content = await fs.readFile(scriptPath, 'utf-8');
  const parsed = JSON.parse(content);

  const result = scriptSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid script file: ${errors}`);
  }

  return result.data;
}

/**
 * Create a sample script for testing (without API call)
 */
export function createSampleScript(config: ChannelConfig, category: Category): Script {
  const sentences = Array.from({ length: config.content.sentenceCount }, (_, i) => ({
    id: i + 1,
    speaker: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
    target: `Sample sentence ${i + 1} in English.`,
    targetBlank: `Sample _______ ${i + 1} in English.`,
    blankAnswer: 'sentence',
    native: `샘플 문장 ${i + 1}입니다.`,
    words: [
      { word: 'sample', meaning: '샘플' },
      { word: 'sentence', meaning: '문장' },
    ],
  }));

  return {
    channelId: config.channelId,
    date: new Date().toISOString().split('T')[0],
    category,
    metadata: {
      topic: 'Sample Topic',
      style: 'casual',
      title: {
        target: 'Sample Script',
        native: '샘플 스크립트',
      },
      characters: [
        {
          id: 'M' as const,
          name: 'James',
          gender: 'male' as const,
          ethnicity: 'American',
          role: 'customer',
        },
        {
          id: 'F' as const,
          name: 'Sarah',
          gender: 'female' as const,
          ethnicity: 'American',
          role: 'barista',
        },
      ],
    },
    sentences,
  };
}
