/**
 * SSML Injector Module
 *
 * Transforms plain text scripts into SSML with mark tags for word-level timepoint extraction.
 * Used with Google Cloud TTS's enableTimePointing: ['SSML_MARK'] option.
 */

import { z } from 'zod';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SSMLInjectorInput {
  text: string; // Original text
  sentenceId: number; // Sentence ID for mark naming
}

export interface WordMapEntry {
  markName: string; // "index_0", "index_1", ...
  word: string; // Original word (including attached punctuation)
  index: number; // Word order
}

export interface SSMLInjectorOutput {
  ssml: string; // <speak>...</speak> formatted SSML
  wordMap: WordMapEntry[]; // Mark ID to original word mapping
}

// Zod schemas for validation
export const ssmlInjectorInputSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
  sentenceId: z.number().int().nonnegative(),
});

export const wordMapEntrySchema = z.object({
  markName: z.string(),
  word: z.string(),
  index: z.number().int().nonnegative(),
});

export const ssmlInjectorOutputSchema = z.object({
  ssml: z.string(),
  wordMap: z.array(wordMapEntrySchema),
});

// ============================================================================
// Error Types
// ============================================================================

export class SSMLInjectorError extends Error {
  constructor(
    message: string,
    public readonly code: 'EMPTY_TEXT' | 'INVALID_CHARACTER' | 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'SSMLInjectorError';
  }
}

// ============================================================================
// Special Character Normalization
// ============================================================================

/**
 * Characters that need to be escaped in SSML
 */
const SSML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/**
 * Escape special XML/SSML characters
 */
function escapeSSML(text: string): string {
  return text.replace(/[&<>"']/g, (char) => SSML_ESCAPE_MAP[char] || char);
}

/**
 * Number word mappings for common ordinals and cardinals
 */
const ORDINAL_SUFFIXES: Record<string, string> = {
  '1st': 'first',
  '2nd': 'second',
  '3rd': 'third',
  '4th': 'fourth',
  '5th': 'fifth',
  '6th': 'sixth',
  '7th': 'seventh',
  '8th': 'eighth',
  '9th': 'ninth',
  '10th': 'tenth',
};

/**
 * Currency symbol mappings
 */
const CURRENCY_MAP: Record<string, string> = {
  $: 'dollars',
  '€': 'euros',
  '£': 'pounds',
  '¥': 'yen',
  '₩': 'won',
  '₹': 'rupees',
};

/**
 * Normalize numbers with units for better TTS pronunciation
 */
function normalizeNumbersWithUnits(text: string): string {
  let normalized = text;

  // Handle currency amounts (e.g., $100, €50.99)
  normalized = normalized.replace(
    /([€$£¥₩₹])(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g,
    (_, currency, amount) => {
      const currencyWord = CURRENCY_MAP[currency] || 'currency';
      const cleanAmount = amount.replace(/,/g, '');
      return `${cleanAmount} ${currencyWord}`;
    }
  );

  // Handle percentages (e.g., 50%, 99.9%)
  normalized = normalized.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent');

  // Handle ordinals (e.g., 1st, 2nd, 3rd, 21st)
  normalized = normalized.replace(/(\d+)(st|nd|rd|th)\b/gi, (match, num, suffix) => {
    const key = `${num}${suffix.toLowerCase()}`;
    if (ORDINAL_SUFFIXES[key]) {
      return ORDINAL_SUFFIXES[key];
    }
    // For larger ordinals, keep the number and add suffix word
    return `${num}${suffix}`;
  });

  // Handle time formats (e.g., 3:30, 10:45 AM)
  normalized = normalized.replace(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g, (_, hour, min, period) => {
    const periodStr = period ? ` ${period.toUpperCase()}` : '';
    if (min === '00') {
      return `${hour} o'clock${periodStr}`;
    }
    return `${hour} ${min}${periodStr}`;
  });

  // Handle date formats (e.g., 2024-01-15, 01/15/2024)
  normalized = normalized.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$2/$3/$1');

  // Handle ranges (e.g., 10-20, 100~200)
  normalized = normalized.replace(/(\d+)\s*[-~]\s*(\d+)/g, '$1 to $2');

  // Handle fractions written with slash (e.g., 1/2, 3/4)
  normalized = normalized.replace(/\b(\d+)\/(\d+)\b/g, (_, num, denom) => {
    const fractionMap: Record<string, string> = {
      '1/2': 'one half',
      '1/3': 'one third',
      '2/3': 'two thirds',
      '1/4': 'one quarter',
      '3/4': 'three quarters',
    };
    const key = `${num}/${denom}`;
    return fractionMap[key] || `${num} over ${denom}`;
  });

  // Handle large numbers with commas (keep them, TTS handles well)
  // But ensure no weird spacing
  normalized = normalized.replace(/(\d),(\d)/g, '$1$2');

  return normalized;
}

/**
 * Normalize special characters for TTS compatibility
 * - Numbers: Convert to spoken equivalents where needed
 * - Symbols: Convert to spoken equivalents or remove
 * - URLs/Emails: Simplify for pronunciation
 */
function normalizeForTTS(text: string): string {
  let normalized = text;

  // First, handle URLs before other replacements (to avoid breaking them)
  normalized = normalized.replace(/https?:\/\/\S+/g, (url) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/\./g, ' dot ').replace(/www\s*dot\s*/i, '');
    } catch {
      return 'link';
    }
  });

  // Handle email addresses
  normalized = normalized.replace(/[\w.-]+@[\w.-]+\.\w+/g, (email) => {
    return email.replace(/@/g, ' at ').replace(/\./g, ' dot ');
  });

  // Normalize numbers with units
  normalized = normalizeNumbersWithUnits(normalized);

  // Replace common symbols with spoken equivalents
  normalized = normalized.replace(/@/g, ' at ');
  normalized = normalized.replace(/#(\w+)/g, ' hashtag $1 '); // #hashtag
  normalized = normalized.replace(/#/g, ' number '); // standalone #
  normalized = normalized.replace(/&/g, ' and ');
  normalized = normalized.replace(/\+/g, ' plus ');
  normalized = normalized.replace(/=/g, ' equals ');
  normalized = normalized.replace(/\^/g, ' to the power of ');
  normalized = normalized.replace(/×/g, ' times ');
  normalized = normalized.replace(/÷/g, ' divided by ');
  normalized = normalized.replace(/±/g, ' plus or minus ');
  normalized = normalized.replace(/≈/g, ' approximately ');
  normalized = normalized.replace(/≠/g, ' not equal to ');
  normalized = normalized.replace(/≤/g, ' less than or equal to ');
  normalized = normalized.replace(/≥/g, ' greater than or equal to ');
  normalized = normalized.replace(/→/g, ' leads to ');
  normalized = normalized.replace(/←/g, ' from ');
  normalized = normalized.replace(/↔/g, ' both ways ');

  // Handle quotes and special punctuation
  normalized = normalized.replace(/[""]/g, '"');
  normalized = normalized.replace(/['']/g, "'");
  normalized = normalized.replace(/…/g, '...');
  normalized = normalized.replace(/—/g, ', ');
  normalized = normalized.replace(/–/g, ' to ');

  // Handle brackets - convert to pauses
  normalized = normalized.replace(/\[([^\]]+)\]/g, ', $1, ');
  normalized = normalized.replace(/\(([^)]+)\)/g, ', $1, ');
  normalized = normalized.replace(/\{([^}]+)\}/g, ', $1, ');

  // Remove or replace other problematic characters
  normalized = normalized.replace(/[*_~`|\\<>]/g, ' ');

  // Handle multiple punctuation (e.g., !!! or ???)
  normalized = normalized.replace(/([!?.]){2,}/g, '$1');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Normalize text while preserving original words for word map
 * Returns both normalized text and a mapping to help track word positions
 */
export function normalizeText(text: string): string {
  return normalizeForTTS(text);
}

// ============================================================================
// Word Tokenization
// ============================================================================

/**
 * Tokenize text into words, keeping punctuation attached to preceding words.
 *
 * Strategy:
 * 1. Split by whitespace to get raw tokens
 * 2. Each token becomes a word (punctuation stays attached)
 *
 * Examples:
 * - "Hello, world!" → ["Hello,", "world!"]
 * - "It's a test." → ["It's", "a", "test."]
 */
function tokenizeWords(text: string): string[] {
  // Normalize whitespace and split
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [];
  }

  // Split by whitespace - punctuation stays attached to words
  const tokens = normalized.split(/\s+/);

  // Filter out empty tokens
  return tokens.filter((token) => token.length > 0);
}

// ============================================================================
// Main SSML Injection Function
// ============================================================================

/**
 * Inject SSML marks before each word in the text.
 *
 * @param input - The input containing text and sentence ID
 * @returns SSML output with word map for sync data generation
 * @throws SSMLInjectorError if input is invalid
 *
 * @example
 * ```typescript
 * const result = injectSSMLMarks({ text: "Hello world!", sentenceId: 1 });
 * // result.ssml = '<speak><mark name="index_0"/>Hello <mark name="index_1"/>world!</speak>'
 * // result.wordMap = [
 * //   { markName: "index_0", word: "Hello", index: 0 },
 * //   { markName: "index_1", word: "world!", index: 1 }
 * // ]
 * ```
 */
export function injectSSMLMarks(input: SSMLInjectorInput): SSMLInjectorOutput {
  // Validate input
  const validationResult = ssmlInjectorInputSchema.safeParse(input);
  if (!validationResult.success) {
    throw new SSMLInjectorError(
      validationResult.error.errors[0]?.message || 'Validation failed',
      'VALIDATION_ERROR'
    );
  }

  const { text } = input;

  // Check for empty or whitespace-only text
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new SSMLInjectorError('Text cannot be empty', 'EMPTY_TEXT');
  }

  // Normalize special characters for TTS
  const normalizedText = normalizeForTTS(trimmedText);

  // Tokenize into words
  const words = tokenizeWords(normalizedText);

  if (words.length === 0) {
    throw new SSMLInjectorError('Text cannot be empty', 'EMPTY_TEXT');
  }

  // Build word map and SSML content
  const wordMap: WordMapEntry[] = [];
  const ssmlParts: string[] = [];

  words.forEach((word, index) => {
    const markName = `index_${index}`;

    // Add to word map
    wordMap.push({
      markName,
      word,
      index,
    });

    // Add mark and escaped word to SSML
    const escapedWord = escapeSSML(word);
    ssmlParts.push(`<mark name="${markName}"/>${escapedWord}`);
  });

  // Join with spaces and wrap in <speak> tags
  const ssmlContent = ssmlParts.join(' ');
  const ssml = `<speak>${ssmlContent}</speak>`;

  return {
    ssml,
    wordMap,
  };
}

/**
 * Inject SSML marks for multiple sentences with global sequential IDs.
 *
 * @param sentences - Array of sentence texts
 * @returns Array of SSML outputs with continuous mark IDs across all sentences
 */
export function injectSSMLMarksMultiple(sentences: string[]): {
  outputs: SSMLInjectorOutput[];
  totalWords: number;
} {
  const outputs: SSMLInjectorOutput[] = [];
  let globalIndex = 0;

  for (let sentenceIdx = 0; sentenceIdx < sentences.length; sentenceIdx++) {
    const text = sentences[sentenceIdx];
    const trimmedText = text.trim();

    if (!trimmedText) {
      continue;
    }

    // Normalize and tokenize
    const normalizedText = normalizeForTTS(trimmedText);
    const words = tokenizeWords(normalizedText);

    if (words.length === 0) {
      continue;
    }

    // Build word map and SSML with global indices
    const wordMap: WordMapEntry[] = [];
    const ssmlParts: string[] = [];

    words.forEach((word) => {
      const markName = `index_${globalIndex}`;

      wordMap.push({
        markName,
        word,
        index: globalIndex,
      });

      const escapedWord = escapeSSML(word);
      ssmlParts.push(`<mark name="${markName}"/>${escapedWord}`);

      globalIndex++;
    });

    const ssmlContent = ssmlParts.join(' ');
    const ssml = `<speak>${ssmlContent}</speak>`;

    outputs.push({ ssml, wordMap });
  }

  return {
    outputs,
    totalWords: globalIndex,
  };
}

/**
 * Validate that SSML is well-formed (basic check)
 */
export function validateSSML(ssml: string): boolean {
  // Check for proper speak tags
  if (!ssml.startsWith('<speak>') || !ssml.endsWith('</speak>')) {
    return false;
  }

  // Check for balanced tags (simple check)
  const openTags = (ssml.match(/<speak>/g) || []).length;
  const closeTags = (ssml.match(/<\/speak>/g) || []).length;

  if (openTags !== closeTags) {
    return false;
  }

  // Verify all mark-like patterns are valid (no unclosed mark tags)
  const invalidMarkPattern = /<mark[^>]*(?<!\/)\s*>/g;
  const invalidMarks = ssml.match(invalidMarkPattern) || [];

  return invalidMarks.length === 0;
}
