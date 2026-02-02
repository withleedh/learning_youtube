/**
 * Blank Word Selector Module
 *
 * Provides helper functions to select good blank word candidates
 * for fill-in-the-blank exercises.
 *
 * Filters out articles, pronouns, and basic verbs.
 * Prioritizes learnable vocabulary (nouns, adjectives, meaningful verbs).
 *
 * @module blank-word-selector
 * **Validates: Requirement 2.3**
 */

// ============================================================================
// Constants - Words to Exclude
// ============================================================================

/**
 * Articles that should NOT be used as blank words
 */
export const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * Pronouns that should NOT be used as blank words
 */
export const PRONOUNS = new Set([
  // Personal pronouns (subject)
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  // Personal pronouns (object)
  'me',
  'him',
  'her',
  'us',
  'them',
  // Possessive pronouns
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
  // Reflexive pronouns
  'myself',
  'yourself',
  'himself',
  'herself',
  'itself',
  'ourselves',
  'themselves',
  // Demonstrative pronouns
  'this',
  'that',
  'these',
  'those',
  // Interrogative pronouns
  'who',
  'whom',
  'whose',
  'which',
  'what',
  // Relative pronouns
  'whoever',
  'whomever',
  'whatever',
  'whichever',
]);

/**
 * Basic verbs that should NOT be used as blank words
 */
export const BASIC_VERBS = new Set([
  // Be verbs
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  // Have verbs
  'have',
  'has',
  'had',
  'having',
  // Do verbs
  'do',
  'does',
  'did',
  'doing',
  'done',
  // Modal verbs
  'will',
  'would',
  'shall',
  'should',
  'can',
  'could',
  'may',
  'might',
  'must',
  // Common auxiliary
  "won't",
  "wouldn't",
  "can't",
  "couldn't",
  "shouldn't",
  "don't",
  "doesn't",
  "didn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "haven't",
  "hasn't",
  "hadn't",
]);

/**
 * Common prepositions that are too simple for blanks
 */
export const SIMPLE_PREPOSITIONS = new Set([
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'up',
  'down',
  'out',
  'off',
  'over',
  'under',
  'into',
  'onto',
  'upon',
]);

/**
 * Common conjunctions that are too simple for blanks
 */
export const SIMPLE_CONJUNCTIONS = new Set([
  'and',
  'or',
  'but',
  'so',
  'yet',
  'nor',
  'for',
  'if',
  'then',
  'when',
  'while',
  'as',
  'because',
  'although',
  'though',
  'unless',
  'until',
  'since',
]);

/**
 * Very common words that are too simple for blanks
 */
export const TOO_COMMON_WORDS = new Set([
  'just',
  'very',
  'too',
  'also',
  'only',
  'even',
  'still',
  'now',
  'here',
  'there',
  'where',
  'how',
  'why',
  'yes',
  'no',
  'not',
  'all',
  'some',
  'any',
  'many',
  'much',
  'more',
  'most',
  'other',
  'such',
  'each',
  'every',
  'both',
  'few',
  'own',
  'same',
  'than',
  'well',
  'back',
  'way',
  'thing',
  'things',
  'time',
  'times',
  'day',
  'days',
  'year',
  'years',
  'people',
  'man',
  'men',
  'woman',
  'women',
  'child',
  'children',
]);

/**
 * Combined set of all forbidden blank words
 */
export const FORBIDDEN_BLANK_WORDS = new Set([
  ...ARTICLES,
  ...PRONOUNS,
  ...BASIC_VERBS,
  ...SIMPLE_PREPOSITIONS,
  ...SIMPLE_CONJUNCTIONS,
]);

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Check if a word is a learnable blank word candidate.
 *
 * A learnable word is one that:
 * - Is not an article, pronoun, or basic verb
 * - Is not a simple preposition or conjunction
 * - Has at least 3 characters
 *
 * @param word - The word to check
 * @returns true if the word is learnable, false otherwise
 *
 * **Validates: Requirement 2.3**
 */
export function isLearnableBlankWord(word: string): boolean {
  const normalized = word.toLowerCase().trim();

  // Must have at least 3 characters
  if (normalized.length < 3) {
    return false;
  }

  // Check against forbidden sets
  if (FORBIDDEN_BLANK_WORDS.has(normalized)) {
    return false;
  }

  // Check against too common words (optional, less strict)
  if (TOO_COMMON_WORDS.has(normalized)) {
    return false;
  }

  return true;
}

/**
 * Suggest good blank word candidates from a sentence.
 *
 * Analyzes the sentence and returns words that would make good
 * fill-in-the-blank exercises, prioritized by learning value.
 *
 * @param sentence - The sentence to analyze
 * @returns Array of candidate words, sorted by priority
 *
 * **Validates: Requirement 2.3**
 */
export function suggestBlankWordCandidates(sentence: string): string[] {
  // Extract words from sentence
  const words = extractWords(sentence);

  // Filter to learnable words
  const learnableWords = words.filter((word) => isLearnableBlankWord(word));

  // Score and sort by learning value
  const scored = learnableWords.map((word) => ({
    word,
    score: scoreWordLearningValue(word),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.word);
}

/**
 * Select the best blank word from a sentence.
 *
 * @param sentence - The sentence to analyze
 * @returns The best blank word candidate, or null if none found
 *
 * **Validates: Requirement 2.3**
 */
export function selectBestBlankWord(sentence: string): string | null {
  const candidates = suggestBlankWordCandidates(sentence);
  return candidates.length > 0 ? candidates[0] : null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract words from a sentence.
 *
 * @param sentence - The sentence to extract words from
 * @returns Array of words (lowercase, no punctuation)
 */
function extractWords(sentence: string): string[] {
  // Remove punctuation and split by whitespace
  const cleaned = sentence
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .toLowerCase()
    .trim();

  return cleaned.split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Score a word's learning value.
 *
 * Higher scores indicate better blank word candidates.
 *
 * Scoring factors:
 * - Word length (longer words are often more valuable)
 * - Likely part of speech (nouns, adjectives, meaningful verbs)
 * - Common patterns for learnable vocabulary
 *
 * @param word - The word to score
 * @returns Score from 0-100
 */
function scoreWordLearningValue(word: string): number {
  let score = 50; // Base score

  // Length bonus (4-10 characters is ideal)
  if (word.length >= 4 && word.length <= 10) {
    score += 10;
  } else if (word.length > 10) {
    score += 5;
  }

  // Suffix patterns that indicate learnable vocabulary
  const learnableSuffixes = [
    // Noun suffixes
    { suffix: 'tion', bonus: 15 }, // action, station
    { suffix: 'sion', bonus: 15 }, // decision, vision
    { suffix: 'ment', bonus: 15 }, // moment, apartment
    { suffix: 'ness', bonus: 12 }, // happiness, kindness
    { suffix: 'ity', bonus: 12 }, // city, quality
    { suffix: 'ance', bonus: 10 }, // distance, importance
    { suffix: 'ence', bonus: 10 }, // experience, difference
    { suffix: 'er', bonus: 8 }, // teacher, worker
    { suffix: 'or', bonus: 8 }, // doctor, actor
    { suffix: 'ist', bonus: 10 }, // artist, scientist
    // Adjective suffixes
    { suffix: 'ful', bonus: 12 }, // beautiful, wonderful
    { suffix: 'less', bonus: 10 }, // careless, endless
    { suffix: 'ous', bonus: 12 }, // famous, delicious
    { suffix: 'ive', bonus: 10 }, // active, creative
    { suffix: 'able', bonus: 10 }, // comfortable, available
    { suffix: 'ible', bonus: 10 }, // possible, incredible
    { suffix: 'al', bonus: 8 }, // special, natural
    { suffix: 'ic', bonus: 8 }, // fantastic, magic
    // Verb suffixes
    { suffix: 'ing', bonus: 5 }, // meeting, coming (gerunds)
    { suffix: 'ed', bonus: 3 }, // excited, surprised (past participles as adj)
    // Adverb suffixes
    { suffix: 'ly', bonus: 8 }, // really, finally
  ];

  for (const { suffix, bonus } of learnableSuffixes) {
    if (word.endsWith(suffix)) {
      score += bonus;
      break; // Only apply one suffix bonus
    }
  }

  // Penalize very short words
  if (word.length <= 3) {
    score -= 20;
  }

  // Penalize words that look like contractions
  if (word.includes("'")) {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Check if a word appears in a sentence (case-insensitive).
 *
 * @param sentence - The sentence to search
 * @param word - The word to find
 * @returns true if the word appears in the sentence
 */
export function wordAppearsInSentence(sentence: string, word: string): boolean {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
  return regex.test(sentence);
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a blank version of a sentence by replacing a word.
 *
 * @param sentence - The original sentence
 * @param blankWord - The word to replace with blank
 * @returns Sentence with the word replaced by "_______"
 */
export function createBlankSentence(sentence: string, blankWord: string): string {
  const regex = new RegExp(`\\b${escapeRegex(blankWord)}\\b`, 'i');
  return sentence.replace(regex, '_______');
}
