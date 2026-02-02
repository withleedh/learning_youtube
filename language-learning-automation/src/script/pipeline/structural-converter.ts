/**
 * Structural Converter Module
 *
 * Phase 2 of the multi-step script pipeline.
 * Converts creative screenplay output into structured educational JSON.
 *
 * Role: "You are a language education expert"
 * Focus: CEFR analysis, blank selection, wrong choices, vocabulary
 * Output: Structured JSON matching Sentence schema
 *
 * @module structural-converter
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, getGeminiApiKey } from '../../config/gemini';
import type { Sentence, Character } from '../types';
import type { ChannelConfig } from '../../config/types';
import type {
  ScreenplayOutput,
  StructuralConverterInput,
  StructuredSentences,
  ValidationError,
} from './types';
import {
  validateBlankWord,
  validateBlankInTarget,
  validateWordCount,
  validateWrongChoices,
} from './validators';
import {
  suggestBlankWordCandidates,
  isLearnableBlankWord,
  FORBIDDEN_BLANK_WORDS,
} from './blank-word-selector';
import { generateWrongChoices, isValidWrongChoice } from './wrong-choice-generator';

// ============================================================================
// Structural Converter Implementation
// ============================================================================

/**
 * Convert a screenplay into structured educational format.
 *
 * This is Phase 2 of the pipeline, focusing on educational structure.
 * The AI is instructed to act as a language education expert and produce
 * properly structured JSON with CEFR analysis, blanks, and vocabulary.
 *
 * @param input - Structural converter input containing screenplay and config
 * @returns StructuredSentences with metadata and sentences array
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */
export async function convertToStructuredFormat(
  input: StructuralConverterInput
): Promise<StructuredSentences> {
  const { screenplay, config, targetLanguage, nativeLanguage } = input;

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const prompt = buildStructuralPrompt(screenplay, config, targetLanguage, nativeLanguage);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON from response
  const structured = parseStructuredOutput(text, screenplay);

  // Validate and fix any issues
  const validated = validateAndFixStructuredOutput(structured, screenplay);

  return validated;
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build the structural conversion prompt.
 *
 * Key principles:
 * - Focus on educational structure
 * - CEFR level analysis
 * - Learnable blank word selection
 * - Phonetically similar wrong choices
 *
 * @param screenplay - The screenplay from creative phase
 * @param config - Channel configuration
 * @param targetLanguage - Target language (e.g., "English")
 * @param nativeLanguage - Native language (e.g., "Korean")
 * @returns The prompt string
 */
function buildStructuralPrompt(
  screenplay: ScreenplayOutput,
  config: ChannelConfig,
  targetLanguage: string,
  nativeLanguage: string
): string {
  // Extract dialogue lines from screenplay
  const dialogueLines = extractDialogueLines(screenplay);

  return `# Role
You are a language education expert specializing in CEFR-based curriculum design.

Your job is to convert a creative screenplay into structured educational content.
Focus ONLY on educational structure - the creative content is already written.

# Task
Convert the following screenplay into structured JSON for a language learning video.

## Screenplay Title: ${screenplay.title}

## Characters:
${screenplay.characters.map((c) => `- ${c.id} (${c.name}): ${c.description}`).join('\n')}

## Dialogue Lines to Convert:
${dialogueLines.map((line, i) => `${i + 1}. [${line.speaker}] ${line.text}`).join('\n')}

# Educational Guidelines

## CEFR Level: A1-A2 (Pre-Intermediate)
- Sentences should be accessible to beginners
- If a sentence is too complex, simplify while preserving meaning
- Target: 4-15 words per sentence

## Blank Word Selection (CRITICAL)
Select ONE word per sentence for the fill-in-the-blank exercise.

**Good blank words (learnable vocabulary):**
- Nouns: "restaurant", "morning", "adventure", "coffee"
- Adjectives: "beautiful", "delicious", "familiar", "excited"
- Meaningful verbs: "remember", "discover", "enjoy", "arrive"
- Adverbs: "really", "finally", "suddenly", "carefully"

**BAD blank words (NEVER use these):**
- Articles: a, an, the
- Pronouns: I, you, he, she, it, we, they, me, him, her, us, them
- Basic verbs: is, are, was, were, be, been, have, has, had, do, does, did
- Prepositions alone: in, on, at, to, for, of, with

## Wrong Word Choices (for quiz)
Generate 2 wrong choices that are:
- Single words only (NO phrases)
- Phonetically similar to the blank answer
- Real English words
- Different from the blank answer

**Examples:**
- blankAnswer: "meeting" → wrongWordChoices: ["eating", "beating"]
- blankAnswer: "familiar" → wrongWordChoices: ["similar", "family"]
- blankAnswer: "coffee" → wrongWordChoices: ["copy", "coughing"]

## Native Translation
- Natural, conversational translation (NOT textbook-style)
- Should sound like how a native ${nativeLanguage} speaker would actually say it

# Output Format (JSON)
{
  "metadata": {
    "topic": "${screenplay.title}",
    "style": "casual",
    "title": {
      "target": "${screenplay.title}",
      "native": "[Natural ${nativeLanguage} title]"
    },
    "characters": [
      ${screenplay.characters
        .map(
          (c) => `{
        "id": "${c.id}",
        "name": "${c.name}",
        "gender": "${c.id === 'M' ? 'male' : 'female'}",
        "ethnicity": "American",
        "role": "${c.description}"
      }`
        )
        .join(',\n      ')}
    ]
  },
  "sentences": [
    {
      "id": 1,
      "speaker": "M or F",
      "target": "Full sentence in ${targetLanguage}",
      "targetPronunciation": "Pronunciation guide in ${nativeLanguage} script (optional)",
      "targetBlank": "Sentence with _______ replacing the blank word",
      "blankAnswer": "the word that fills the blank",
      "native": "Natural ${nativeLanguage} translation",
      "words": [
        { "word": "blankAnswer", "meaning": "meaning in ${nativeLanguage}" },
        { "word": "another useful word", "meaning": "meaning" }
      ],
      "wrongWordChoices": ["similar_word_1", "similar_word_2"]
    }
  ]
}

# Critical Rules
1. **blankAnswer MUST appear exactly in the target sentence**
2. **targetBlank MUST contain exactly "_______" (7 underscores) replacing the blankAnswer**
3. **wrongWordChoices MUST be single words (no spaces)**
4. **Each sentence should have 4-15 words**
5. **Native translation should be natural and conversational**
6. **words array should include blankAnswer + 1-2 useful vocabulary words**

Generate ONLY the JSON output. No additional text.`;
}

// ============================================================================
// Output Parsing
// ============================================================================

/**
 * Parse the structured output from AI response.
 *
 * @param text - Raw text from AI
 * @param screenplay - Original screenplay for fallback
 * @returns Parsed StructuredSentences
 */
function parseStructuredOutput(text: string, screenplay: ScreenplayOutput): StructuredSentences {
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from structural converter response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse JSON from structural converter response');
  }

  const data = parsed as {
    metadata?: {
      topic?: string;
      style?: string;
      title?: { target?: string; native?: string };
      characters?: Character[];
    };
    sentences?: Sentence[];
  };

  // Build structured output with defaults
  const metadata = {
    topic: data.metadata?.topic || screenplay.title,
    style: data.metadata?.style || 'casual',
    title: {
      target: data.metadata?.title?.target || screenplay.title,
      native: data.metadata?.title?.native || screenplay.title,
    },
    characters: data.metadata?.characters || buildDefaultCharacters(screenplay),
  };

  const sentences = data.sentences || [];

  return { metadata, sentences };
}

/**
 * Build default characters from screenplay.
 */
function buildDefaultCharacters(screenplay: ScreenplayOutput): Character[] {
  return screenplay.characters.map((c) => ({
    id: c.id,
    name: c.name,
    gender: c.id === 'M' ? ('male' as const) : ('female' as const),
    ethnicity: 'American',
    role: c.description,
  }));
}

// ============================================================================
// Validation and Fixing
// ============================================================================

/**
 * Validate and fix the structured output.
 *
 * @param structured - The parsed structured output
 * @param screenplay - Original screenplay for reference
 * @returns Validated and fixed StructuredSentences
 */
function validateAndFixStructuredOutput(
  structured: StructuredSentences,
  screenplay: ScreenplayOutput
): StructuredSentences {
  const fixedSentences = structured.sentences.map((sentence, index) => {
    const errors: ValidationError[] = [];

    // Validate blank word
    const blankError = validateBlankWord(sentence.blankAnswer, sentence.id);
    if (blankError) {
      errors.push(blankError);
    }

    // Validate blank in target
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

    // Fix issues if any
    if (errors.length > 0) {
      return fixSentence(sentence, errors);
    }

    return sentence;
  });

  return {
    metadata: structured.metadata,
    sentences: fixedSentences,
  };
}

/**
 * Fix a sentence based on validation errors.
 *
 * @param sentence - The sentence to fix
 * @param errors - Validation errors to address
 * @returns Fixed sentence
 */
function fixSentence(sentence: Sentence, errors: ValidationError[]): Sentence {
  let fixed = { ...sentence };

  for (const error of errors) {
    if (error.field === 'blankAnswer') {
      // Try to find a better blank word
      const candidates = suggestBlankWordCandidates(sentence.target);
      if (candidates.length > 0) {
        fixed.blankAnswer = candidates[0];
        fixed.targetBlank = sentence.target.replace(
          new RegExp(`\\b${candidates[0]}\\b`, 'i'),
          '_______'
        );
      }
    }

    if (error.field.startsWith('wrongWordChoices')) {
      // Regenerate wrong choices
      fixed.wrongWordChoices = generateWrongChoices(fixed.blankAnswer);
    }
  }

  // Ensure targetBlank is correct
  if (!fixed.targetBlank.includes('_______')) {
    fixed.targetBlank = fixed.target.replace(
      new RegExp(`\\b${fixed.blankAnswer}\\b`, 'i'),
      '_______'
    );
  }

  return fixed;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract dialogue lines from screenplay.
 */
function extractDialogueLines(
  screenplay: ScreenplayOutput
): Array<{ speaker: string; text: string }> {
  const lines: Array<{ speaker: string; text: string }> = [];

  for (const scene of screenplay.scenes) {
    for (const dialogue of scene.dialogue) {
      lines.push({
        speaker: dialogue.speaker,
        text: dialogue.line,
      });
    }
  }

  return lines;
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  buildStructuralPrompt,
  parseStructuredOutput,
  validateAndFixStructuredOutput,
  extractDialogueLines,
};
