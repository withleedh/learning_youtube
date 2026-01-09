import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import { scriptSchema, type Script, type Category } from './types';
import type { ChannelConfig } from '../config/types';
import { generateScriptPrompt, getCategoryForDay } from './prompts';
import { selectTimlyTopic } from './topic-selector';
import { GEMINI_MODELS, getGeminiApiKey } from '../config/gemini';

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate a script using Gemini API
 */
export async function generateScript(
  config: ChannelConfig,
  category?: Category,
  topic?: string
): Promise<Script> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  // Use provided category or get from current day
  const scriptCategory = category || getCategoryForDay(new Date());

  // If no topic provided, let AI select a timely topic
  let selectedTopic = topic;
  if (!selectedTopic) {
    console.log('🤖 AI가 시의성 있는 주제를 선정 중...');
    selectedTopic = await selectTimlyTopic(
      scriptCategory,
      config.meta.targetLanguage,
      config.meta.nativeLanguage
    );
    console.log(`   ✓ 선정된 주제: "${selectedTopic}"`);
  }

  // Generate prompt
  const prompt = generateScriptPrompt(config, scriptCategory, selectedTopic);

  // Call Gemini API
  const result = await model.generateContent(prompt);
  const response = await result.response;
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
    category: scriptCategory,
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
        { id: 'M' as const, name: 'James', gender: 'male' as const, ethnicity: 'American', role: 'customer' },
        { id: 'F' as const, name: 'Sarah', gender: 'female' as const, ethnicity: 'American', role: 'barista' },
      ],
    },
    sentences,
  };
}
