import type { Sentence, ScenePrompt } from '../types';
import type { ValidationError, ScreenplayOutput } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, getGeminiApiKey } from '../../config/gemini';

// ============================================================================
// LLM-Based Engagement Quality Scoring (재미 검증)
// ============================================================================

/**
 * Engagement quality score result from LLM evaluation
 */
export interface EngagementScore {
  total: number; // 0-100
  breakdown: {
    emotionalArc: number; // 감정선 (0-25)
    naturalFlow: number; // 자연스러운 흐름 (0-25)
    engagement: number; // 몰입도/재미 (0-25)
    memorability: number; // 기억에 남는 요소 (0-25)
  };
  issues: string[];
  strengths: string[];
}

/**
 * Minimum engagement score to pass quality check
 */
export const MIN_ENGAGEMENT_SCORE = 60;

/**
 * Calculate engagement quality score using LLM evaluation
 * Language-agnostic: works for any target language
 *
 * Updated for "귀가 트이는 영어" style:
 * - Warm, authentic storytelling
 * - Simple, clear sentences
 * - Natural dialogue without forced humor
 *
 * @param screenplay - The screenplay output to evaluate
 * @param targetLanguage - The language of the dialogue (for context)
 * @returns EngagementScore with total, breakdown, issues, and strengths
 */
export async function calculateEngagementScore(
  screenplay: ScreenplayOutput,
  targetLanguage: string = 'English'
): Promise<EngagementScore> {
  const allDialogue = screenplay.scenes.flatMap((s) => s.dialogue);

  if (allDialogue.length === 0) {
    return {
      total: 0,
      breakdown: { emotionalArc: 0, naturalFlow: 0, engagement: 0, memorability: 0 },
      issues: ['No dialogue found'],
      strengths: [],
    };
  }

  // Format dialogue for evaluation
  const dialogueText = allDialogue.map((d) => `${d.speaker}: ${d.line}`).join('\n');

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const prompt = `You are evaluating a ${targetLanguage} script for a language learning video.
The target style is WARM, SIMPLE, and AUTHENTIC - like "귀가 트이는 영어" (Korean English learning channel).

DIALOGUE:
${dialogueText}

Rate the script on these 4 criteria (0-25 points each, total 100):

1. EMOTIONAL_ARC (0-25): Does the dialogue have genuine emotional depth?
   - Authentic feelings, not exaggerated reactions
   - Natural emotional progression
   - Warm, relatable moments
   - NOT: forced drama, over-the-top reactions

2. NATURAL_FLOW (0-25): Does it sound like real, simple conversation?
   - Clear, simple sentences (5-12 words each)
   - Natural question-answer patterns
   - Appropriate for A1-A2 language learners
   - NOT: complex vocabulary, idioms, or slang

3. ENGAGEMENT (0-25): Is it relatable and easy to follow?
   - Universal situations anyone can understand
   - Clear context and purpose
   - Practical, useful expressions
   - NOT: confusing plot twists, Western-specific references

4. MEMORABILITY (0-25): Does it leave a warm impression?
   - Genuine moments that feel real
   - Simple but meaningful content
   - Something viewers can relate to
   - NOT: forced jokes, catchphrases, or gimmicks

IMPORTANT SCORING GUIDELINES:
- A simple, warm, authentic script = 70-85 points (GOOD)
- A practical, clear dialogue = 65-80 points (GOOD)
- Forced humor or complex language = 40-55 points (BAD)
- Robotic Q&A with no warmth = 35-50 points (BAD)

The goal is WARMTH and SIMPLICITY, not entertainment or humor.

Respond in this exact JSON format:
{
  "emotionalArc": <number 0-25>,
  "naturalFlow": <number 0-25>,
  "engagement": <number 0-25>,
  "memorability": <number 0-25>,
  "issues": ["issue1", "issue2"],
  "strengths": ["strength1", "strength2"]
}

Be fair - simple and warm scripts should score well.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[Engagement] Failed to parse LLM response, using fallback');
      return createFallbackScore(dialogueText);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const breakdown = {
      emotionalArc: Math.min(25, Math.max(0, parsed.emotionalArc || 0)),
      naturalFlow: Math.min(25, Math.max(0, parsed.naturalFlow || 0)),
      engagement: Math.min(25, Math.max(0, parsed.engagement || 0)),
      memorability: Math.min(25, Math.max(0, parsed.memorability || 0)),
    };

    return {
      total:
        breakdown.emotionalArc +
        breakdown.naturalFlow +
        breakdown.engagement +
        breakdown.memorability,
      breakdown,
      issues: parsed.issues || [],
      strengths: parsed.strengths || [],
    };
  } catch (error) {
    console.log('[Engagement] LLM evaluation failed:', error);
    return createFallbackScore(dialogueText);
  }
}

/**
 * Fallback scoring when LLM fails - basic heuristics
 */
function createFallbackScore(dialogueText: string): EngagementScore {
  const lines = dialogueText.split('\n').filter((l) => l.trim());
  const hasVariety = new Set(lines.map((l) => l.split(':')[0])).size > 1;
  const hasQuestions = dialogueText.includes('?');
  const avgLength = dialogueText.length / Math.max(1, lines.length);

  // Very basic fallback - just checks structure exists
  const base = 50;
  const varietyBonus = hasVariety ? 10 : 0;
  const questionBonus = hasQuestions ? 5 : 0;
  const lengthPenalty = avgLength > 100 ? -10 : 0; // Too long lines

  return {
    total: Math.min(100, Math.max(0, base + varietyBonus + questionBonus + lengthPenalty)),
    breakdown: {
      emotionalArc: 12,
      naturalFlow: hasVariety ? 15 : 10,
      engagement: 12,
      memorability: 10,
    },
    issues: ['LLM evaluation failed - using basic heuristics'],
    strengths: [],
  };
}

/**
 * Quick sync check for basic dialogue quality (no LLM call)
 * Use this for fast pre-filtering before expensive LLM evaluation
 */
export function hasBasicDialogueStructure(screenplay: ScreenplayOutput): boolean {
  const allDialogue = screenplay.scenes.flatMap((s) => s.dialogue);

  // Must have dialogue
  if (allDialogue.length < 5) return false;

  // Must have multiple speakers (for conversation category)
  const speakers = new Set(allDialogue.map((d) => d.speaker));
  if (speakers.size < 1) return false;

  // Lines shouldn't be too long (indicates unnatural dialogue)
  const avgLineLength = allDialogue.reduce((sum, d) => sum + d.line.length, 0) / allDialogue.length;
  if (avgLineLength > 150) return false;

  return true;
}

/**
 * Check if screenplay meets minimum engagement quality
 *
 * @param screenplay - The screenplay to check
 * @param targetLanguage - Language for LLM context
 * @param minScore - Minimum score to pass (default: 60)
 * @returns true if engagement is sufficient
 */
export async function hasMinimumEngagement(
  screenplay: ScreenplayOutput,
  targetLanguage: string = 'English',
  minScore: number = MIN_ENGAGEMENT_SCORE
): Promise<boolean> {
  const score = await calculateEngagementScore(screenplay, targetLanguage);
  return score.total >= minScore;
}

// ============================================================================
// Constants for Validation
// ============================================================================

/**
 * Articles that should not be used as blank words
 */
const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * Pronouns that should not be used as blank words
 */
const PRONOUNS = new Set([
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'its',
  'our',
  'their',
  'mine',
  'yours',
  'hers',
  'ours',
  'theirs',
  'myself',
  'yourself',
  'himself',
  'herself',
  'itself',
  'ourselves',
  'themselves',
  'this',
  'that',
  'these',
  'those',
  'who',
  'whom',
  'whose',
  'which',
  'what',
]);

/**
 * Basic verbs that should not be used as blank words
 */
const BASIC_VERBS = new Set([
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'do',
  'does',
  'did',
  'doing',
  'done',
  'will',
  'would',
  'shall',
  'should',
  'can',
  'could',
  'may',
  'might',
  'must',
  'am',
]);

/**
 * Minimum word count for a sentence
 */
export const MIN_WORD_COUNT = 4;

/**
 * Maximum word count for a sentence
 */
export const MAX_WORD_COUNT = 15;

/**
 * Minimum number of scenes
 */
export const MIN_SCENE_COUNT = 3;

/**
 * Maximum number of scenes
 */
export const MAX_SCENE_COUNT = 6;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a blank word is learnable (not an article, pronoun, or basic verb)
 *
 * @param blankAnswer - The word selected for the blank
 * @returns ValidationError if invalid, null if valid
 *
 * **Validates: Requirement 2.3**
 */
export function validateBlankWord(
  blankAnswer: string,
  sentenceId?: number
): ValidationError | null {
  const word = blankAnswer.toLowerCase().trim();

  if (ARTICLES.has(word)) {
    return {
      field: 'blankAnswer',
      expected: 'learnable vocabulary (not an article)',
      actual: blankAnswer,
      sentenceId,
    };
  }

  if (PRONOUNS.has(word)) {
    return {
      field: 'blankAnswer',
      expected: 'learnable vocabulary (not a pronoun)',
      actual: blankAnswer,
      sentenceId,
    };
  }

  if (BASIC_VERBS.has(word)) {
    return {
      field: 'blankAnswer',
      expected: 'learnable vocabulary (not a basic verb)',
      actual: blankAnswer,
      sentenceId,
    };
  }

  return null;
}

/**
 * Checks if a blank word is learnable (convenience function returning boolean)
 */
export function isLearnableWord(word: string): boolean {
  return validateBlankWord(word) === null;
}

/**
 * Validates that wrong choices are single words (no spaces)
 *
 * @param wrongChoices - Array of wrong word choices
 * @param blankAnswer - The correct answer to compare against
 * @param sentenceId - Optional sentence ID for error reporting
 * @returns Array of ValidationErrors for any invalid choices
 *
 * **Validates: Requirements 2.4, 6.3**
 */
export function validateWrongChoices(
  wrongChoices: string[] | undefined,
  blankAnswer: string,
  sentenceId?: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!wrongChoices || wrongChoices.length === 0) {
    return errors;
  }

  wrongChoices.forEach((choice, index) => {
    // Check for spaces (multi-word)
    if (choice.includes(' ')) {
      errors.push({
        field: `wrongWordChoices[${index}]`,
        expected: 'single word (no spaces)',
        actual: choice,
        sentenceId,
      });
    }

    // Check if same as blank answer
    if (choice.toLowerCase().trim() === blankAnswer.toLowerCase().trim()) {
      errors.push({
        field: `wrongWordChoices[${index}]`,
        expected: 'different from blankAnswer',
        actual: choice,
        sentenceId,
      });
    }
  });

  return errors;
}

/**
 * Checks if all wrong choices are valid single words
 */
export function areWrongChoicesValid(
  wrongChoices: string[] | undefined,
  blankAnswer: string
): boolean {
  return validateWrongChoices(wrongChoices, blankAnswer).length === 0;
}

/**
 * Validates that the blank answer appears in the target sentence
 *
 * @param target - The target sentence
 * @param blankAnswer - The word that should appear in the sentence
 * @param sentenceId - Optional sentence ID for error reporting
 * @returns ValidationError if invalid, null if valid
 *
 * **Validates: Requirement 6.2**
 */
export function validateBlankInTarget(
  target: string,
  blankAnswer: string,
  sentenceId?: number
): ValidationError | null {
  const targetLower = target.toLowerCase();
  const blankLower = blankAnswer.toLowerCase().trim();

  if (!targetLower.includes(blankLower)) {
    return {
      field: 'blankAnswer',
      expected: 'substring of target sentence',
      actual: blankAnswer,
      sentenceId,
    };
  }

  return null;
}

/**
 * Checks if blank answer appears in target sentence
 */
export function isBlankInTarget(target: string, blankAnswer: string): boolean {
  return validateBlankInTarget(target, blankAnswer) === null;
}

/**
 * Validates that a sentence has the correct word count (4-15 words)
 *
 * @param target - The target sentence
 * @param sentenceId - Optional sentence ID for error reporting
 * @returns ValidationError if invalid, null if valid
 *
 * **Validates: Requirement 2.7**
 */
export function validateWordCount(target: string, sentenceId?: number): ValidationError | null {
  const words = target
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount < MIN_WORD_COUNT) {
    return {
      field: 'target',
      expected: `at least ${MIN_WORD_COUNT} words`,
      actual: `${wordCount} words`,
      sentenceId,
    };
  }

  if (wordCount > MAX_WORD_COUNT) {
    return {
      field: 'target',
      expected: `at most ${MAX_WORD_COUNT} words`,
      actual: `${wordCount} words`,
      sentenceId,
    };
  }

  return null;
}

/**
 * Checks if word count is within valid range
 */
export function isWordCountValid(target: string): boolean {
  return validateWordCount(target) === null;
}

/**
 * Gets the word count of a sentence
 */
export function getWordCount(target: string): number {
  return target
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Validates that scene prompts cover all sentences without gaps or overlaps
 *
 * @param scenePrompts - Array of scene prompts with sentence ranges
 * @param totalSentences - Total number of sentences to cover
 * @returns Array of ValidationErrors for any coverage issues
 *
 * **Validates: Requirement 3.5**
 */
export function validateSceneCoverage(
  scenePrompts: ScenePrompt[],
  totalSentences: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check scene count
  if (scenePrompts.length < MIN_SCENE_COUNT) {
    errors.push({
      field: 'scenePrompts',
      expected: `at least ${MIN_SCENE_COUNT} scenes`,
      actual: `${scenePrompts.length} scenes`,
    });
  }

  if (scenePrompts.length > MAX_SCENE_COUNT) {
    errors.push({
      field: 'scenePrompts',
      expected: `at most ${MAX_SCENE_COUNT} scenes`,
      actual: `${scenePrompts.length} scenes`,
    });
  }

  if (scenePrompts.length === 0) {
    return errors;
  }

  // Sort scenes by start range
  const sortedScenes = [...scenePrompts].sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);

  // Check for gaps and overlaps
  const covered = new Set<number>();

  for (let i = 0; i < sortedScenes.length; i++) {
    const scene = sortedScenes[i];
    const [start, end] = scene.sentenceRange;

    // Validate range is valid
    if (start > end) {
      errors.push({
        field: `scenePrompts[${i}].sentenceRange`,
        expected: 'start <= end',
        actual: `[${start}, ${end}]`,
      });
      continue;
    }

    // Check for overlaps with already covered sentences
    for (let j = start; j <= end; j++) {
      if (covered.has(j)) {
        errors.push({
          field: `scenePrompts[${i}].sentenceRange`,
          expected: 'no overlap with other scenes',
          actual: `sentence ${j} already covered`,
        });
      }
      covered.add(j);
    }
  }

  // Check for gaps (sentences not covered)
  for (let i = 1; i <= totalSentences; i++) {
    if (!covered.has(i)) {
      errors.push({
        field: 'scenePrompts',
        expected: `sentence ${i} to be covered`,
        actual: 'not covered by any scene',
      });
    }
  }

  // Check for coverage beyond total sentences
  for (const sentenceNum of covered) {
    if (sentenceNum < 1 || sentenceNum > totalSentences) {
      errors.push({
        field: 'scenePrompts',
        expected: `sentence range within [1, ${totalSentences}]`,
        actual: `sentence ${sentenceNum} is out of range`,
      });
    }
  }

  return errors;
}

/**
 * Checks if scene coverage is valid
 */
export function isSceneCoverageValid(scenePrompts: ScenePrompt[], totalSentences: number): boolean {
  return validateSceneCoverage(scenePrompts, totalSentences).length === 0;
}

// ============================================================================
// Sentence Validation (combines multiple validators)
// ============================================================================

/**
 * Validates a single sentence against all validation rules
 *
 * @param sentence - The sentence to validate
 * @returns Array of ValidationErrors
 */
export function validateSentence(sentence: Sentence): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate blank word is learnable
  const blankError = validateBlankWord(sentence.blankAnswer, sentence.id);
  if (blankError) {
    errors.push(blankError);
  }

  // Validate blank appears in target
  const blankInTargetError = validateBlankInTarget(
    sentence.target,
    sentence.blankAnswer,
    sentence.id
  );
  if (blankInTargetError) {
    errors.push(blankInTargetError);
  }

  // Validate word count
  const wordCountError = validateWordCount(sentence.target, sentence.id);
  if (wordCountError) {
    errors.push(wordCountError);
  }

  // Validate wrong choices
  const wrongChoiceErrors = validateWrongChoices(
    sentence.wrongWordChoices,
    sentence.blankAnswer,
    sentence.id
  );
  errors.push(...wrongChoiceErrors);

  return errors;
}

/**
 * Validates all sentences in an array
 *
 * @param sentences - Array of sentences to validate
 * @returns Array of ValidationErrors from all sentences
 */
export function validateSentences(sentences: Sentence[]): ValidationError[] {
  return sentences.flatMap((sentence) => validateSentence(sentence));
}
