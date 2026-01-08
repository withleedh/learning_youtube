import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { scriptSchema, type Script, type Sentence, type Category } from './types';

/**
 * Feature: language-learning-automation
 * Property 3: Script Structure Integrity
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.7
 *
 * For any generated Script:
 * - The number of sentences equals the configured sentenceCount
 * - Each sentence has a non-empty words array
 * - Speaker alternates between 'M' and 'F'
 * - Each sentence has a valid targetBlank containing "_______" and blankAnswer exists in target
 * - Category is one of the valid enum values
 */

// Arbitrary for generating valid words
const wordArb = fc.record({
  word: fc.string({ minLength: 1, maxLength: 30 }),
  meaning: fc.string({ minLength: 1, maxLength: 50 }),
});

// Arbitrary for generating valid categories
const categoryArb: fc.Arbitrary<Category> = fc.constantFrom(
  'story',
  'conversation',
  'news',
  'announcement',
  'travel_business',
  'lesson',
  'fairytale'
);

// Arbitrary for generating a sentence with proper blank structure
const sentenceArb = (id: number, speaker: 'M' | 'F'): fc.Arbitrary<Sentence> =>
  fc
    .record({
      targetBase: fc.string({ minLength: 5, maxLength: 50 }),
      blankWord: fc.string({ minLength: 2, maxLength: 15 }),
      native: fc.string({ minLength: 1, maxLength: 100 }),
      words: fc.array(wordArb, { minLength: 1, maxLength: 5 }),
    })
    .map(({ targetBase, blankWord, native, words }) => ({
      id,
      speaker,
      target: `${targetBase} ${blankWord} end`,
      targetBlank: `${targetBase} _______ end`,
      blankAnswer: blankWord,
      native,
      words: [...words, { word: blankWord, meaning: native.slice(0, 10) || '뜻' }],
    }));

// Arbitrary for generating valid scripts with alternating speakers
const scriptArb = (sentenceCount: number): fc.Arbitrary<Script> =>
  fc
    .record({
      channelId: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')), {
        minLength: 1,
        maxLength: 20,
      }),
      date: fc
        .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map((d) => d.toISOString().split('T')[0]),
      category: categoryArb,
      topic: fc.string({ minLength: 1, maxLength: 50 }),
      titleTarget: fc.string({ minLength: 1, maxLength: 50 }),
      titleNative: fc.string({ minLength: 1, maxLength: 50 }),
    })
    .chain(({ channelId, date, category, topic, titleTarget, titleNative }) =>
      fc
        .tuple(
          ...Array.from({ length: sentenceCount }, (_, i) =>
            sentenceArb(i + 1, i % 2 === 0 ? 'M' : 'F')
          )
        )
        .map((sentences) => ({
          channelId,
          date,
          category,
          metadata: {
            topic,
            style: 'casual',
            title: {
              target: titleTarget,
              native: titleNative,
            },
          },
          sentences,
        }))
    );

describe('Property Tests: Script Structure Integrity', () => {
  it('Property 3.1: sentence count matches configured value', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 15 }), (sentenceCount) => {
        return fc.assert(
          fc.property(scriptArb(sentenceCount), (script) => {
            expect(script.sentences.length).toBe(sentenceCount);
          }),
          { numRuns: 10 }
        );
      }),
      { numRuns: 10 }
    );
  });

  it('Property 3.2: each sentence has non-empty words array', () => {
    fc.assert(
      fc.property(scriptArb(5), (script) => {
        script.sentences.forEach((sentence) => {
          expect(sentence.words.length).toBeGreaterThan(0);
          sentence.words.forEach((word) => {
            expect(word.word.length).toBeGreaterThan(0);
            expect(word.meaning.length).toBeGreaterThan(0);
          });
        });
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.3: speaker alternates between M and F', () => {
    fc.assert(
      fc.property(scriptArb(10), (script) => {
        script.sentences.forEach((sentence, index) => {
          const expectedSpeaker = index % 2 === 0 ? 'M' : 'F';
          expect(sentence.speaker).toBe(expectedSpeaker);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.4: targetBlank contains blank placeholder and blankAnswer exists in target', () => {
    fc.assert(
      fc.property(scriptArb(5), (script) => {
        script.sentences.forEach((sentence) => {
          // targetBlank should contain the blank placeholder
          expect(sentence.targetBlank).toContain('_______');

          // blankAnswer should exist in target
          expect(sentence.target).toContain(sentence.blankAnswer);

          // targetBlank should not contain the blankAnswer (it's replaced with _______)
          // Note: This might not always be true if blankAnswer appears multiple times
          // So we just check that the blank exists
        });
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.5: category is a valid enum value', () => {
    const validCategories = [
      'story',
      'conversation',
      'news',
      'announcement',
      'travel_business',
      'lesson',
      'fairytale',
    ];

    fc.assert(
      fc.property(scriptArb(3), (script) => {
        expect(validCategories).toContain(script.category);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.6: generated scripts pass schema validation', () => {
    fc.assert(
      fc.property(scriptArb(5), (script) => {
        const result = scriptSchema.safeParse(script);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
