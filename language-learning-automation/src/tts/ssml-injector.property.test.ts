import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { injectSSMLMarks, validateSSML } from './ssml-injector';

/**
 * Feature: high-retention-video-generator
 * Property 1: SSML Injection Preserves Words
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.7
 *
 * For any valid text input containing N words, the SSML Injector SHALL produce output where:
 * - The wordMap contains exactly N entries
 * - Each entry's word matches the original word (including attached punctuation)
 * - Mark IDs are sequential (index_0, index_1, ..., index_N-1)
 * - The SSML output is wrapped in <speak> tags
 */

// Arbitrary for generating simple words (alphanumeric only to avoid normalization complexity)
const simpleWordArb = fc.stringMatching(/^[a-zA-Z]+$/);

// Arbitrary for generating words with optional trailing punctuation
const wordWithPunctuationArb = fc
  .tuple(simpleWordArb, fc.constantFrom('', '.', ',', '!', '?', ';', ':'))
  .map(([word, punct]) => word + punct);

// Arbitrary for generating a non-empty array of simple words
const wordsArrayArb = fc.array(simpleWordArb, { minLength: 1, maxLength: 20 });

// Arbitrary for generating sentence ID
const sentenceIdArb = fc.integer({ min: 0, max: 1000 });

describe('Property Tests: SSML Injection Preserves Words', () => {
  it('Property 1.1: wordMap contains exactly N entries for N words', () => {
    fc.assert(
      fc.property(wordsArrayArb, sentenceIdArb, (words, sentenceId) => {
        const text = words.join(' ');
        const result = injectSSMLMarks({ text, sentenceId });

        // wordMap should have exactly N entries
        expect(result.wordMap.length).toBe(words.length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.2: each wordMap entry word matches the original word', () => {
    fc.assert(
      fc.property(wordsArrayArb, sentenceIdArb, (words, sentenceId) => {
        const text = words.join(' ');
        const result = injectSSMLMarks({ text, sentenceId });

        // Each word in wordMap should match the original word
        for (let i = 0; i < words.length; i++) {
          expect(result.wordMap[i].word).toBe(words[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.3: mark IDs are sequential (index_0, index_1, ...)', () => {
    fc.assert(
      fc.property(wordsArrayArb, sentenceIdArb, (words, sentenceId) => {
        const text = words.join(' ');
        const result = injectSSMLMarks({ text, sentenceId });

        // Mark IDs should be sequential
        for (let i = 0; i < result.wordMap.length; i++) {
          expect(result.wordMap[i].markName).toBe(`index_${i}`);
          expect(result.wordMap[i].index).toBe(i);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.4: SSML output is wrapped in <speak> tags', () => {
    fc.assert(
      fc.property(wordsArrayArb, sentenceIdArb, (words, sentenceId) => {
        const text = words.join(' ');
        const result = injectSSMLMarks({ text, sentenceId });

        // SSML should start with <speak> and end with </speak>
        expect(result.ssml.startsWith('<speak>')).toBe(true);
        expect(result.ssml.endsWith('</speak>')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.5: SSML output passes validation', () => {
    fc.assert(
      fc.property(wordsArrayArb, sentenceIdArb, (words, sentenceId) => {
        const text = words.join(' ');
        const result = injectSSMLMarks({ text, sentenceId });

        // SSML should be valid
        expect(validateSSML(result.ssml)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.6: SSML contains mark tags for each word', () => {
    fc.assert(
      fc.property(wordsArrayArb, sentenceIdArb, (words, sentenceId) => {
        const text = words.join(' ');
        const result = injectSSMLMarks({ text, sentenceId });

        // Count mark tags in SSML
        const markMatches = result.ssml.match(/<mark name="index_\d+"\/>/g) || [];
        expect(markMatches.length).toBe(words.length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.7: words with punctuation preserve punctuation attachment', () => {
    fc.assert(
      fc.property(
        fc.array(wordWithPunctuationArb, { minLength: 1, maxLength: 10 }),
        sentenceIdArb,
        (words, sentenceId) => {
          const text = words.join(' ');
          const result = injectSSMLMarks({ text, sentenceId });

          // wordMap should have same number of entries as input words
          expect(result.wordMap.length).toBe(words.length);

          // Each word should match (punctuation stays attached)
          for (let i = 0; i < words.length; i++) {
            expect(result.wordMap[i].word).toBe(words[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
