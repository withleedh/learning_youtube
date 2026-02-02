import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateBlankWord,
  validateWrongChoices,
  validateBlankInTarget,
  validateWordCount,
  validateSceneCoverage,
  isLearnableWord,
  areWrongChoicesValid,
  isBlankInTarget,
  isWordCountValid,
  isSceneCoverageValid,
  MIN_WORD_COUNT,
  MAX_WORD_COUNT,
  MIN_SCENE_COUNT,
  MAX_SCENE_COUNT,
} from './validators';
import type { ScenePrompt } from '../types';

/**
 * Feature: multi-step-script-pipeline
 * Property Tests for Validators
 * **Validates: Requirements 2.3, 2.4, 2.7, 3.5, 6.2, 6.3**
 */

// ============================================================================
// Test Data Generators
// ============================================================================

/** Articles that should fail validation */
const ARTICLES = ['a', 'an', 'the'];

/** Pronouns that should fail validation */
const PRONOUNS = [
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
];

/** Basic verbs that should fail validation */
const BASIC_VERBS = [
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
];

/** Learnable words that should pass validation */
const LEARNABLE_WORDS = [
  'beautiful',
  'restaurant',
  'adventure',
  'delicious',
  'wonderful',
  'amazing',
  'incredible',
  'fantastic',
  'journey',
  'experience',
  'coffee',
  'morning',
  'evening',
  'friend',
  'family',
  'travel',
  'explore',
  'discover',
  'create',
  'imagine',
];

/** Generator for learnable words */
const learnableWordArb = fc.constantFrom(...LEARNABLE_WORDS);

/** Generator for articles */
const articleArb = fc.constantFrom(...ARTICLES);

/** Generator for pronouns */
const pronounArb = fc.constantFrom(...PRONOUNS);

/** Generator for basic verbs */
const basicVerbArb = fc.constantFrom(...BASIC_VERBS);

/** Generator for single words (no spaces) */
const singleWordArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), {
  minLength: 2,
  maxLength: 12,
});

/** Generator for multi-word phrases (with spaces) */
const multiWordPhraseArb = fc.tuple(singleWordArb, singleWordArb).map(([a, b]) => `${a} ${b}`);

/** Generator for valid sentence word counts */
const validWordCountArb = fc.integer({ min: MIN_WORD_COUNT, max: MAX_WORD_COUNT });

/** Generator for invalid (too few) word counts */
const tooFewWordsArb = fc.integer({ min: 1, max: MIN_WORD_COUNT - 1 });

/** Generator for invalid (too many) word counts */
const tooManyWordsArb = fc.integer({ min: MAX_WORD_COUNT + 1, max: 30 });

/** Generate a sentence with specific word count */
function generateSentenceWithWordCount(wordCount: number): string {
  const words = Array.from({ length: wordCount }, (_, i) => `word${i + 1}`);
  return words.join(' ');
}

// ============================================================================
// Property 4: Blank Words Are Learnable
// **Validates: Requirements 2.3**
// ============================================================================

describe('Property 4: Blank Words Are Learnable', () => {
  /**
   * Property 4.1: Articles are rejected as blank words
   * **Validates: Requirements 2.3**
   */
  it('articles are rejected as blank words', () => {
    fc.assert(
      fc.property(articleArb, (article) => {
        const error = validateBlankWord(article);
        expect(error).not.toBeNull();
        expect(error?.field).toBe('blankAnswer');
        expect(error?.expected).toContain('not an article');
        return error !== null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: Pronouns are rejected as blank words
   * **Validates: Requirements 2.3**
   */
  it('pronouns are rejected as blank words', () => {
    fc.assert(
      fc.property(pronounArb, (pronoun) => {
        const error = validateBlankWord(pronoun);
        expect(error).not.toBeNull();
        expect(error?.field).toBe('blankAnswer');
        expect(error?.expected).toContain('not a pronoun');
        return error !== null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.3: Basic verbs are rejected as blank words
   * **Validates: Requirements 2.3**
   */
  it('basic verbs are rejected as blank words', () => {
    fc.assert(
      fc.property(basicVerbArb, (verb) => {
        const error = validateBlankWord(verb);
        expect(error).not.toBeNull();
        expect(error?.field).toBe('blankAnswer');
        expect(error?.expected).toContain('not a basic verb');
        return error !== null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.4: Learnable words are accepted as blank words
   * **Validates: Requirements 2.3**
   */
  it('learnable words are accepted as blank words', () => {
    fc.assert(
      fc.property(learnableWordArb, (word) => {
        const error = validateBlankWord(word);
        expect(error).toBeNull();
        expect(isLearnableWord(word)).toBe(true);
        return error === null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.5: Case-insensitive validation
   * **Validates: Requirements 2.3**
   */
  it('validation is case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ARTICLES, ...PRONOUNS, ...BASIC_VERBS),
        fc.constantFrom('upper', 'lower', 'mixed'),
        (word, caseType) => {
          let testWord: string;
          switch (caseType) {
            case 'upper':
              testWord = word.toUpperCase();
              break;
            case 'lower':
              testWord = word.toLowerCase();
              break;
            case 'mixed':
              testWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              break;
            default:
              testWord = word;
          }
          const error = validateBlankWord(testWord);
          expect(error).not.toBeNull();
          return error !== null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 5: Wrong Choices Are Single Words
// **Validates: Requirements 2.4, 6.3**
// ============================================================================

describe('Property 5: Wrong Choices Are Single Words', () => {
  /**
   * Property 5.1: Single words pass validation
   * **Validates: Requirements 2.4, 6.3**
   */
  it('single words pass validation', () => {
    fc.assert(
      fc.property(
        fc.array(singleWordArb, { minLength: 1, maxLength: 3 }),
        learnableWordArb,
        (wrongChoices, blankAnswer) => {
          // Filter out any that match blankAnswer
          const filteredChoices = wrongChoices.filter(
            (c) => c.toLowerCase() !== blankAnswer.toLowerCase()
          );
          if (filteredChoices.length === 0) return true;

          const errors = validateWrongChoices(filteredChoices, blankAnswer);
          expect(errors).toHaveLength(0);
          expect(areWrongChoicesValid(filteredChoices, blankAnswer)).toBe(true);
          return errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: Multi-word phrases fail validation
   * **Validates: Requirements 2.4, 6.3**
   */
  it('multi-word phrases fail validation', () => {
    fc.assert(
      fc.property(multiWordPhraseArb, learnableWordArb, (phrase, blankAnswer) => {
        const errors = validateWrongChoices([phrase], blankAnswer);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].expected).toContain('single word');
        expect(areWrongChoicesValid([phrase], blankAnswer)).toBe(false);
        return errors.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: Choices matching blankAnswer fail validation
   * **Validates: Requirements 2.4, 6.3**
   */
  it('choices matching blankAnswer fail validation', () => {
    fc.assert(
      fc.property(learnableWordArb, (word) => {
        const errors = validateWrongChoices([word], word);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].expected).toContain('different from blankAnswer');
        return errors.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: Empty or undefined wrongChoices passes validation
   * **Validates: Requirements 2.4, 6.3**
   */
  it('empty or undefined wrongChoices passes validation', () => {
    fc.assert(
      fc.property(learnableWordArb, (blankAnswer) => {
        const errorsEmpty = validateWrongChoices([], blankAnswer);
        const errorsUndefined = validateWrongChoices(undefined, blankAnswer);
        expect(errorsEmpty).toHaveLength(0);
        expect(errorsUndefined).toHaveLength(0);
        return errorsEmpty.length === 0 && errorsUndefined.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.5: Multiple invalid choices all reported
   * **Validates: Requirements 2.4, 6.3**
   */
  it('multiple invalid choices all reported', () => {
    fc.assert(
      fc.property(
        fc.array(multiWordPhraseArb, { minLength: 2, maxLength: 3 }),
        learnableWordArb,
        (phrases, blankAnswer) => {
          const errors = validateWrongChoices(phrases, blankAnswer);
          expect(errors.length).toBe(phrases.length);
          return errors.length === phrases.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 7: Sentences Within Word Count
// **Validates: Requirements 2.7**
// ============================================================================

describe('Property 7: Sentences Within Word Count', () => {
  /**
   * Property 7.1: Sentences with valid word count pass validation
   * **Validates: Requirements 2.7**
   */
  it('sentences with valid word count pass validation', () => {
    fc.assert(
      fc.property(validWordCountArb, (wordCount) => {
        const sentence = generateSentenceWithWordCount(wordCount);
        const error = validateWordCount(sentence);
        expect(error).toBeNull();
        expect(isWordCountValid(sentence)).toBe(true);
        return error === null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.2: Sentences with too few words fail validation
   * **Validates: Requirements 2.7**
   */
  it('sentences with too few words fail validation', () => {
    fc.assert(
      fc.property(tooFewWordsArb, (wordCount) => {
        const sentence = generateSentenceWithWordCount(wordCount);
        const error = validateWordCount(sentence);
        expect(error).not.toBeNull();
        expect(error?.expected).toContain(`at least ${MIN_WORD_COUNT}`);
        expect(isWordCountValid(sentence)).toBe(false);
        return error !== null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.3: Sentences with too many words fail validation
   * **Validates: Requirements 2.7**
   */
  it('sentences with too many words fail validation', () => {
    fc.assert(
      fc.property(tooManyWordsArb, (wordCount) => {
        const sentence = generateSentenceWithWordCount(wordCount);
        const error = validateWordCount(sentence);
        expect(error).not.toBeNull();
        expect(error?.expected).toContain(`at most ${MAX_WORD_COUNT}`);
        expect(isWordCountValid(sentence)).toBe(false);
        return error !== null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.4: Word count boundaries are inclusive
   * **Validates: Requirements 2.7**
   */
  it('word count boundaries are inclusive', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const minSentence = generateSentenceWithWordCount(MIN_WORD_COUNT);
        const maxSentence = generateSentenceWithWordCount(MAX_WORD_COUNT);

        expect(validateWordCount(minSentence)).toBeNull();
        expect(validateWordCount(maxSentence)).toBeNull();
        expect(isWordCountValid(minSentence)).toBe(true);
        expect(isWordCountValid(maxSentence)).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.5: Extra whitespace is handled correctly
   * **Validates: Requirements 2.7**
   */
  it('extra whitespace is handled correctly', () => {
    fc.assert(
      fc.property(validWordCountArb, (wordCount) => {
        const words = Array.from({ length: wordCount }, (_, i) => `word${i + 1}`);
        // Add extra spaces between words
        const sentenceWithExtraSpaces = words.join('   ');
        const error = validateWordCount(sentenceWithExtraSpaces);
        expect(error).toBeNull();
        return error === null;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 8: Scene Prompts Cover All Sentences
// **Validates: Requirements 3.5**
// ============================================================================

describe('Property 8: Scene Prompts Cover All Sentences', () => {
  /** Helper to create a valid scene prompt */
  function createScenePrompt(start: number, end: number): ScenePrompt {
    return {
      sentenceRange: [start, end],
      setting: 'Test setting',
      mood: 'Test mood',
      characterActions: 'Test actions',
      cameraDirection: 'Medium shot',
    };
  }

  /** Generate valid non-overlapping scene prompts covering all sentences */
  function generateValidScenePrompts(totalSentences: number, sceneCount: number): ScenePrompt[] {
    if (sceneCount < MIN_SCENE_COUNT || sceneCount > MAX_SCENE_COUNT) {
      sceneCount = Math.max(MIN_SCENE_COUNT, Math.min(MAX_SCENE_COUNT, sceneCount));
    }
    if (totalSentences < sceneCount) {
      totalSentences = sceneCount;
    }

    const scenes: ScenePrompt[] = [];
    const sentencesPerScene = Math.floor(totalSentences / sceneCount);
    let currentStart = 1;

    for (let i = 0; i < sceneCount; i++) {
      const isLast = i === sceneCount - 1;
      const end = isLast ? totalSentences : currentStart + sentencesPerScene - 1;
      scenes.push(createScenePrompt(currentStart, end));
      currentStart = end + 1;
    }

    return scenes;
  }

  /**
   * Property 8.1: Valid scene coverage passes validation
   * **Validates: Requirements 3.5**
   */
  it('valid scene coverage passes validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 15 }),
        fc.integer({ min: MIN_SCENE_COUNT, max: MAX_SCENE_COUNT }),
        (totalSentences, sceneCount) => {
          const scenes = generateValidScenePrompts(totalSentences, sceneCount);
          const errors = validateSceneCoverage(scenes, totalSentences);
          expect(errors).toHaveLength(0);
          expect(isSceneCoverageValid(scenes, totalSentences)).toBe(true);
          return errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: Too few scenes fails validation
   * **Validates: Requirements 3.5**
   */
  it('too few scenes fails validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 15 }),
        fc.integer({ min: 1, max: MIN_SCENE_COUNT - 1 }),
        (totalSentences, sceneCount) => {
          // Create scenes that cover all sentences but with too few scenes
          const sentencesPerScene = Math.ceil(totalSentences / sceneCount);
          const scenes: ScenePrompt[] = [];
          let currentStart = 1;

          for (let i = 0; i < sceneCount; i++) {
            const end = Math.min(currentStart + sentencesPerScene - 1, totalSentences);
            scenes.push(createScenePrompt(currentStart, end));
            currentStart = end + 1;
            if (currentStart > totalSentences) break;
          }

          const errors = validateSceneCoverage(scenes, totalSentences);
          const hasSceneCountError = errors.some((e) => e.expected.includes('at least'));
          expect(hasSceneCountError).toBe(true);
          return hasSceneCountError;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Too many scenes fails validation
   * **Validates: Requirements 3.5**
   */
  it('too many scenes fails validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 15 }),
        fc.integer({ min: MAX_SCENE_COUNT + 1, max: 10 }),
        (totalSentences, sceneCount) => {
          // Create scenes with one sentence each
          const scenes: ScenePrompt[] = [];
          for (let i = 1; i <= Math.min(sceneCount, totalSentences); i++) {
            scenes.push(createScenePrompt(i, i));
          }

          const errors = validateSceneCoverage(scenes, totalSentences);
          const hasSceneCountError = errors.some((e) => e.expected.includes('at most'));
          expect(hasSceneCountError).toBe(true);
          return hasSceneCountError;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: Gaps in coverage fail validation
   * **Validates: Requirements 3.5**
   */
  it('gaps in coverage fail validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 8, max: 15 }), (totalSentences) => {
        // Create scenes with a gap (skip sentence 4)
        const scenes: ScenePrompt[] = [
          createScenePrompt(1, 3),
          createScenePrompt(5, 7),
          createScenePrompt(8, totalSentences),
        ];

        const errors = validateSceneCoverage(scenes, totalSentences);
        const hasGapError = errors.some((e) => e.expected.includes('sentence 4'));
        expect(hasGapError).toBe(true);
        return hasGapError;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: Overlapping scenes fail validation
   * **Validates: Requirements 3.5**
   */
  it('overlapping scenes fail validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 9, max: 15 }), (totalSentences) => {
        // Create scenes with overlap (both cover sentence 4)
        const scenes: ScenePrompt[] = [
          createScenePrompt(1, 4),
          createScenePrompt(4, 7),
          createScenePrompt(8, totalSentences),
        ];

        const errors = validateSceneCoverage(scenes, totalSentences);
        const hasOverlapError = errors.some((e) => e.expected.includes('no overlap'));
        expect(hasOverlapError).toBe(true);
        return hasOverlapError;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.6: Scene count boundaries are inclusive
   * **Validates: Requirements 3.5**
   */
  it('scene count boundaries are inclusive', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 12 }), (totalSentences) => {
        const minScenes = generateValidScenePrompts(totalSentences, MIN_SCENE_COUNT);
        const maxScenes = generateValidScenePrompts(totalSentences, MAX_SCENE_COUNT);

        const minErrors = validateSceneCoverage(minScenes, totalSentences);
        const maxErrors = validateSceneCoverage(maxScenes, totalSentences);

        expect(minErrors).toHaveLength(0);
        expect(maxErrors).toHaveLength(0);

        return minErrors.length === 0 && maxErrors.length === 0;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 11: BlankAnswer Appears in Target
// **Validates: Requirements 6.2**
// ============================================================================

describe('Property 11: BlankAnswer Appears in Target', () => {
  /**
   * Property 11.1: BlankAnswer present in target passes validation
   * **Validates: Requirements 6.2**
   */
  it('blankAnswer present in target passes validation', () => {
    fc.assert(
      fc.property(learnableWordArb, (word) => {
        const target = `I really love ${word} in the morning`;
        const error = validateBlankInTarget(target, word);
        expect(error).toBeNull();
        expect(isBlankInTarget(target, word)).toBe(true);
        return error === null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: BlankAnswer not in target fails validation
   * **Validates: Requirements 6.2**
   */
  it('blankAnswer not in target fails validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('coffee', 'morning', 'adventure'),
        fc.constantFrom('xyz123', 'notaword', 'missing'),
        (targetWord, blankAnswer) => {
          const target = `I really love ${targetWord} in the evening`;
          const error = validateBlankInTarget(target, blankAnswer);
          expect(error).not.toBeNull();
          expect(error?.expected).toContain('substring of target');
          expect(isBlankInTarget(target, blankAnswer)).toBe(false);
          return error !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: Case-insensitive matching
   * **Validates: Requirements 6.2**
   */
  it('case-insensitive matching works', () => {
    fc.assert(
      fc.property(
        learnableWordArb,
        fc.constantFrom('upper', 'lower', 'mixed'),
        (word, caseType) => {
          const target = `I really love ${word} in the morning`;
          let testWord: string;
          switch (caseType) {
            case 'upper':
              testWord = word.toUpperCase();
              break;
            case 'lower':
              testWord = word.toLowerCase();
              break;
            case 'mixed':
              testWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              break;
            default:
              testWord = word;
          }
          const error = validateBlankInTarget(target, testWord);
          expect(error).toBeNull();
          return error === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.4: Partial word matches work
   * **Validates: Requirements 6.2**
   */
  it('partial word matches work (substring)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // "beautiful" contains "beauty" - but we're checking if blankAnswer is IN target
        const target = 'The beautiful sunset was amazing';
        const error = validateBlankInTarget(target, 'beautiful');
        expect(error).toBeNull();
        return error === null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.5: Whitespace trimming works
   * **Validates: Requirements 6.2**
   */
  it('whitespace trimming works', () => {
    fc.assert(
      fc.property(learnableWordArb, (word) => {
        const target = `I really love ${word} in the morning`;
        const blankWithSpaces = `  ${word}  `;
        const error = validateBlankInTarget(target, blankWithSpaces);
        expect(error).toBeNull();
        return error === null;
      }),
      { numRuns: 100 }
    );
  });
});
