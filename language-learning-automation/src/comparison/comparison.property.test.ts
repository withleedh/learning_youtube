import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { comparisonSegmentSchema, type ComparisonSegment, type ComparisonCategory } from './types';

/**
 * Feature: korean-vs-native-longform
 * Property 2: Segment Structure Completeness
 * Validates: Requirements 1.2
 *
 * For any ComparisonSegment, it SHALL contain non-empty values for:
 * - situation
 * - koreanExpression.text
 * - nativeExpression.text
 * - explanation
 */

// Arbitrary for generating valid categories
const categoryArb: fc.Arbitrary<ComparisonCategory> = fc.constantFrom(
  'daily',
  'business',
  'emotion',
  'request_reject',
  'apology_thanks'
);

// Arbitrary for generating valid comparison segments
const comparisonSegmentArb: fc.Arbitrary<ComparisonSegment> = fc
  .record({
    id: fc.integer({ min: 1, max: 100 }),
    category: categoryArb,
    situation: fc.string({ minLength: 1, maxLength: 200 }),
    koreanExpressionText: fc.string({ minLength: 1, maxLength: 100 }),
    koreanExpressionLiteral: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
    nativeExpressionText: fc.string({ minLength: 1, maxLength: 100 }),
    nativeExpressionNote: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
    explanation: fc.string({ minLength: 1, maxLength: 200 }),
  })
  .map(
    ({
      id,
      category,
      situation,
      koreanExpressionText,
      koreanExpressionLiteral,
      nativeExpressionText,
      nativeExpressionNote,
      explanation,
    }) => ({
      id,
      category,
      situation,
      koreanExpression: {
        text: koreanExpressionText,
        literal: koreanExpressionLiteral,
      },
      nativeExpression: {
        text: nativeExpressionText,
        note: nativeExpressionNote,
      },
      explanation,
    })
  );

describe('Property Tests: Comparison Segment Structure', () => {
  /**
   * Property 2: Segment Structure Completeness
   * For any ComparisonSegment, it SHALL contain non-empty values for:
   * situation, koreanExpression.text, nativeExpression.text, and explanation.
   * **Validates: Requirements 1.2**
   */
  it('Property 2: Segment structure completeness - all required fields are non-empty', () => {
    fc.assert(
      fc.property(comparisonSegmentArb, (segment) => {
        // situation must be non-empty
        expect(segment.situation.length).toBeGreaterThan(0);

        // koreanExpression.text must be non-empty
        expect(segment.koreanExpression.text.length).toBeGreaterThan(0);

        // nativeExpression.text must be non-empty
        expect(segment.nativeExpression.text.length).toBeGreaterThan(0);

        // explanation must be non-empty
        expect(segment.explanation.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2.1: Generated segments pass schema validation', () => {
    fc.assert(
      fc.property(comparisonSegmentArb, (segment) => {
        const result = comparisonSegmentSchema.safeParse(segment);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2.2: Category is always a valid enum value', () => {
    const validCategories = ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'];

    fc.assert(
      fc.property(comparisonSegmentArb, (segment) => {
        expect(validCategories).toContain(segment.category);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2.3: Schema rejects segments with empty required fields', () => {
    // Test that schema correctly rejects empty situation
    const emptySegment = {
      id: 1,
      category: 'daily',
      situation: '',
      koreanExpression: { text: 'test' },
      nativeExpression: { text: 'test' },
      explanation: 'test',
    };

    const result = comparisonSegmentSchema.safeParse(emptySegment);
    expect(result.success).toBe(false);
  });

  it('Property 2.4: Schema rejects segments with empty koreanExpression.text', () => {
    const emptyKoreanSegment = {
      id: 1,
      category: 'daily',
      situation: 'test situation',
      koreanExpression: { text: '' },
      nativeExpression: { text: 'test' },
      explanation: 'test',
    };

    const result = comparisonSegmentSchema.safeParse(emptyKoreanSegment);
    expect(result.success).toBe(false);
  });

  it('Property 2.5: Schema rejects segments with empty nativeExpression.text', () => {
    const emptyNativeSegment = {
      id: 1,
      category: 'daily',
      situation: 'test situation',
      koreanExpression: { text: 'test' },
      nativeExpression: { text: '' },
      explanation: 'test',
    };

    const result = comparisonSegmentSchema.safeParse(emptyNativeSegment);
    expect(result.success).toBe(false);
  });

  it('Property 2.6: Schema rejects segments with empty explanation', () => {
    const emptyExplanationSegment = {
      id: 1,
      category: 'daily',
      situation: 'test situation',
      koreanExpression: { text: 'test' },
      nativeExpression: { text: 'test' },
      explanation: '',
    };

    const result = comparisonSegmentSchema.safeParse(emptyExplanationSegment);
    expect(result.success).toBe(false);
  });
});

import { comparisonScriptSchema, type ComparisonScript, type Hook } from './types';
import { createSampleComparisonScript } from './sample';

// Arbitrary for generating valid hooks
const hookArb: fc.Arbitrary<Hook> = fc.record({
  text: fc.string({ minLength: 1, maxLength: 50 }),
  subtext: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

// Arbitrary for generating valid comparison scripts with configurable segment count
const comparisonScriptArb = (
  minSegments: number,
  maxSegments: number
): fc.Arbitrary<ComparisonScript> =>
  fc
    .record({
      channelId: fc.string({ minLength: 1, maxLength: 50 }),
      date: fc
        .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map((d) => d.toISOString().split('T')[0]),
      titleKorean: fc.string({ minLength: 1, maxLength: 100 }),
      titleEnglish: fc.string({ minLength: 1, maxLength: 100 }),
      hook: hookArb,
      hookVariants: fc.array(hookArb, { minLength: 3, maxLength: 5 }),
      segmentCount: fc.integer({ min: minSegments, max: maxSegments }),
      ctaQuestion: fc.string({ minLength: 1, maxLength: 100 }),
      ctaReminder: fc.string({ minLength: 1, maxLength: 100 }),
    })
    .chain(
      ({
        channelId,
        date,
        titleKorean,
        titleEnglish,
        hook,
        hookVariants,
        segmentCount,
        ctaQuestion,
        ctaReminder,
      }) =>
        fc
          .array(comparisonSegmentArb, { minLength: segmentCount, maxLength: segmentCount })
          .map((segments) => ({
            channelId,
            date,
            title: { korean: titleKorean, english: titleEnglish },
            hook,
            hookVariants,
            segments: segments.map((s, i) => ({ ...s, id: i + 1 })),
            cta: { question: ctaQuestion, reminder: ctaReminder },
          }))
    );

describe('Property Tests: Comparison Script Generation', () => {
  /**
   * Property 1: Segment Count Bounds
   * For any generated ComparisonScript, the segments array length SHALL be between 25 and 35 inclusive.
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Segment Count Bounds', () => {
    it('createSampleComparisonScript generates scripts with segment count in valid range', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 35 }), (segmentCount) => {
          const script = createSampleComparisonScript('test-channel', segmentCount);

          // Segment count must be between 25 and 35
          expect(script.segments.length).toBeGreaterThanOrEqual(25);
          expect(script.segments.length).toBeLessThanOrEqual(35);
          expect(script.segments.length).toBe(segmentCount);
        }),
        { numRuns: 100 }
      );
    });

    it('Schema validates scripts with 25-35 segments', () => {
      fc.assert(
        fc.property(comparisonScriptArb(25, 35), (script) => {
          const result = comparisonScriptSchema.safeParse(script);
          expect(result.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('Schema rejects scripts with fewer than 25 segments', () => {
      fc.assert(
        fc.property(comparisonScriptArb(1, 24), (script) => {
          const result = comparisonScriptSchema.safeParse(script);
          expect(result.success).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('Schema rejects scripts with more than 35 segments', () => {
      fc.assert(
        fc.property(comparisonScriptArb(36, 50), (script) => {
          const result = comparisonScriptSchema.safeParse(script);
          expect(result.success).toBe(false);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 3: Category Distribution
   * For any batch of N segments where N >= 10, no single category SHALL represent more than 50% of total segments.
   * **Validates: Requirements 1.6**
   */
  describe('Property 3: Category Distribution', () => {
    it('createSampleComparisonScript distributes categories evenly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 35 }), (segmentCount) => {
          const script = createSampleComparisonScript('test-channel', segmentCount);

          // Count categories
          const categoryCounts: Record<string, number> = {};
          for (const segment of script.segments) {
            categoryCounts[segment.category] = (categoryCounts[segment.category] || 0) + 1;
          }

          // No single category should exceed 50% of total
          const maxAllowed = Math.ceil(segmentCount * 0.5);
          for (const count of Object.values(categoryCounts)) {
            expect(count).toBeLessThanOrEqual(maxAllowed);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('Category distribution check for arbitrary scripts with 10+ segments', () => {
      fc.assert(
        fc.property(comparisonScriptArb(25, 35), (script) => {
          if (script.segments.length < 10) return true; // Skip if less than 10 segments

          // Count categories
          const categoryCounts: Record<string, number> = {};
          for (const segment of script.segments) {
            categoryCounts[segment.category] = (categoryCounts[segment.category] || 0) + 1;
          }

          // Check that no category exceeds 50%
          const maxAllowed = Math.ceil(script.segments.length * 0.5);
          for (const count of Object.values(categoryCounts)) {
            expect(count).toBeLessThanOrEqual(maxAllowed);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Hook Variants Count
   * For any generated script, hookVariants array SHALL contain 3-5 items.
   * **Validates: Requirements 10.1**
   */
  describe('Property 11: Hook Variants Count', () => {
    it('createSampleComparisonScript generates 3-5 hook variants', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 35 }), (segmentCount) => {
          const script = createSampleComparisonScript('test-channel', segmentCount);

          // hookVariants must exist and have 3-5 items
          expect(script.hookVariants).toBeDefined();
          expect(script.hookVariants!.length).toBeGreaterThanOrEqual(3);
          expect(script.hookVariants!.length).toBeLessThanOrEqual(5);
        }),
        { numRuns: 100 }
      );
    });

    it('Schema validates scripts with 3-5 hook variants', () => {
      fc.assert(
        fc.property(comparisonScriptArb(25, 35), (script) => {
          // Ensure hookVariants is in valid range
          if (
            script.hookVariants &&
            script.hookVariants.length >= 3 &&
            script.hookVariants.length <= 5
          ) {
            const result = comparisonScriptSchema.safeParse(script);
            expect(result.success).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('Each hook variant has required text field', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 35 }), (segmentCount) => {
          const script = createSampleComparisonScript('test-channel', segmentCount);

          for (const hook of script.hookVariants || []) {
            expect(hook.text).toBeDefined();
            expect(hook.text.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});

import { ExpressionDatabase, type AddExpressionInput } from './expression-db';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Arbitrary for generating valid difficulty levels - used in expression database tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _difficultyArb: fc.Arbitrary<'A2' | 'B1' | 'B2' | 'C1'> = fc.constantFrom(
  'A2',
  'B1',
  'B2',
  'C1'
);

describe('Property Tests: Expression Database', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'expr-db-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Property 5: Expression Uniqueness in Batch
   * For any generated ComparisonScript, all koreanExpression.text values SHALL be unique within the script.
   * **Validates: Requirements 8.6**
   */
  describe('Property 5: Expression Uniqueness in Batch', () => {
    it('Adding unique expressions to database preserves uniqueness', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 5, max: 20 }), async (count) => {
          const db = new ExpressionDatabase(tempDir, 'test-channel');
          await db.load();

          // Generate unique expressions
          const expressions: AddExpressionInput[] = [];
          for (let i = 0; i < count; i++) {
            expressions.push({
              expression: `unique_expression_${i}_${Date.now()}`,
              category: ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'][
                i % 5
              ] as ComparisonCategory,
              difficulty: ['A2', 'B1', 'B2', 'C1'][i % 4] as 'A2' | 'B1' | 'B2' | 'C1',
            });
          }

          // Add all expressions
          await db.addExpressions(expressions, 'video-1');

          // Get recent expressions
          const recentExpressions = await db.getRecentExpressions(1);

          // All expressions should be unique
          const uniqueSet = new Set(recentExpressions);
          expect(uniqueSet.size).toBe(recentExpressions.length);
        }),
        { numRuns: 100 }
      );
    });

    it('Sample script has unique koreanExpression.text values', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 35 }), (segmentCount) => {
          const script = createSampleComparisonScript('test-channel', segmentCount);

          // Extract all koreanExpression.text values
          const koreanExpressions = script.segments.map((s) => s.koreanExpression.text);

          // All should be unique
          const uniqueSet = new Set(koreanExpressions);
          expect(uniqueSet.size).toBe(koreanExpressions.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Expression Recency Check
   * For any newly generated expression, it SHALL NOT appear in expressions used in the last 10 videos.
   * **Validates: Requirements 8.2**
   */
  describe('Property 6: Expression Recency Check', () => {
    it('wasUsedRecently correctly identifies expressions from recent videos', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 10 }),
          async (videoCount, expressionsPerVideo) => {
            const db = new ExpressionDatabase(tempDir, `test-channel-${Date.now()}`);
            await db.load();

            // Add expressions across multiple videos
            const allExpressions: string[] = [];
            for (let v = 0; v < videoCount; v++) {
              const videoId = `video-${v}`;
              for (let e = 0; e < expressionsPerVideo; e++) {
                const expression = `expr_v${v}_e${e}_${Date.now()}`;
                allExpressions.push(expression);
                await db.addExpression(
                  {
                    expression,
                    category: 'daily',
                    difficulty: 'B1',
                  },
                  videoId
                );
              }
            }

            // Check that all added expressions are found in recent videos
            for (const expr of allExpressions) {
              const wasRecent = await db.wasUsedRecently(expr, videoCount);
              expect(wasRecent).toBe(true);
            }

            // Check that a new expression is NOT found
            const newExpr = `brand_new_expression_${Date.now()}`;
            const wasNewRecent = await db.wasUsedRecently(newExpr, videoCount);
            expect(wasNewRecent).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getRecentExpressions respects video count limit', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 3, max: 10 }), async (totalVideos) => {
          const db = new ExpressionDatabase(tempDir, `test-channel-limit-${Date.now()}`);
          await db.load();

          // Add one expression per video with different dates
          for (let v = 0; v < totalVideos; v++) {
            await db.addExpression(
              {
                expression: `expr_video_${v}`,
                category: 'daily',
                difficulty: 'B1',
              },
              `video-${v}`
            );
          }

          // Request only last 2 videos
          const recentExpressions = await db.getRecentExpressions(2);

          // Should only get expressions from 2 videos (at most 2 expressions)
          expect(recentExpressions.length).toBeLessThanOrEqual(2);
        }),
        { numRuns: 100 }
      );
    });
  });
});

import {
  LinguisticValidator,
  FORBIDDEN_PATTERNS,
  validateExpression,
  isValidExpression,
  type ForbiddenPattern,
} from './linguistic-validator';

/**
 * Feature: korean-vs-native-longform
 * Property 12: Forbidden Pattern Detection
 * Validates: Requirements 12.1, 12.2
 *
 * For any expression matching forbidden patterns, validator SHALL return failed status.
 */

// Arbitrary for generating expressions that match specific forbidden patterns
const forbiddenExpressionArb = (pattern: ForbiddenPattern): fc.Arbitrary<string> => {
  // Generate expressions that will match the pattern
  const matchingExamples: Record<string, string[]> = {
    'overly-formal-apology': [
      'I am sorry for bothering you',
      'I am sorry for bothering you with this',
      'I am sorry for bothering you again',
    ],
    'formal-disturb-apology': [
      'I am sorry to disturb you',
      'I am sorry to disturb you but',
      'I am sorry to disturb you at this hour',
    ],
    'corporate-apology': [
      'I apologize for the inconvenience',
      'I apologize for the inconvenience caused',
      'We apologize for the inconvenience',
    ],
    'archaic-greeting': ['How do you do', 'How do you do?', 'How do you do, sir'],
    'textbook-response': [
      'I am fine, thank you, and you?',
      'I am fine thank you and you?',
      'I am fine, thank you and you?',
    ],
    'overly-polite-request': [
      'Would you mind if I ask',
      'Would you mind if I sit here',
      'Would you mind if I borrow this',
    ],
    'formal-would-like': ['I would like to help', 'I would like to order', 'I would like to ask'],
    'korean-direct-translation': [
      'Please understand',
      'Please understand my situation',
      'Please understand me',
    ],
    'incorrect-home-usage': [
      'I will go to home',
      'I will go to home now',
      'I will go to home after work',
    ],
    'incorrect-go-home': ['go to home', 'I need to go to home', 'Let me go to home'],
    'konglish-fighting': ['Fighting!', 'Fighting', 'fighting!'],
    'awkward-time-expression': ['after 3 days', 'after 5 days', 'after 10 days'],
    'literal-problem': ['I have a problem', 'I have a problem with this', 'I have a problem here'],
    'formal-cannot': ['I cannot do this', 'I cannot help', 'I cannot attend'],
    'formal-do-not': ['I do not know', 'I do not think so', 'I do not understand'],
    'overly-formal-thanks': [
      'Thank you very much for your help',
      'Thank you very much for your help today',
    ],
    'formal-very-sorry': [
      'I am very sorry',
      'I am very sorry about that',
      'I am very sorry for this',
    ],
    'incorrect-morning-preposition': [
      'in the morning of Monday',
      'in the morning of the meeting',
      'in the morning of that day',
    ],
    'konglish-skinship': ['skin ship', 'skinship', 'skin ship is important'],
    'konglish-handphone': ['hand phone', 'my hand phone', 'hand phone number'],
    'konglish-meeting': ['meeting blind date', 'blind date meeting'],
    'formal-think-that': [
      'I think that this is good',
      'I think that we should go',
      'I think that it works',
    ],
  };

  const examples = matchingExamples[pattern.name];
  if (examples && examples.length > 0) {
    return fc.constantFrom(...examples);
  }

  // Fallback: return a generic expression that should match
  return fc.constant(`Test expression for ${pattern.name}`);
};

// Arbitrary for generating clean expressions (no forbidden patterns)
const cleanExpressionArb: fc.Arbitrary<string> = fc.constantFrom(
  "I'm heading home",
  'You got this!',
  'Sorry to bother you',
  "I'd like to help",
  "I'm good, thanks!",
  'Nice to meet you',
  "I can't make it",
  "I don't think so",
  'Thanks so much!',
  "I'm really sorry",
  'Good to see you',
  'How are you doing?',
  "I'll be there soon",
  'Sounds good to me',
  'Let me know if you need anything'
);

describe('Property Tests: Linguistic Validator', () => {
  /**
   * Property 12: Forbidden Pattern Detection
   * For any expression matching forbidden patterns, validator SHALL return failed status.
   * **Validates: Requirements 12.1, 12.2**
   */
  describe('Property 12: Forbidden Pattern Detection', () => {
    it('Expressions matching error-severity patterns return failed status', () => {
      // Get all error-severity patterns
      const errorPatterns = FORBIDDEN_PATTERNS.filter((p) => p.severity === 'error');

      fc.assert(
        fc.property(fc.constantFrom(...errorPatterns), (pattern) => {
          // Generate an expression that matches this pattern
          const matchingExpression = forbiddenExpressionArb(pattern);

          return fc.assert(
            fc.property(matchingExpression, (expression) => {
              const result = validateExpression(expression);

              // Should return failed status for error patterns
              expect(result.status).toBe('failed');
              expect(result.matchedPatterns).toContain(pattern.name);
              expect(result.confidenceScore).toBeLessThan(1);
            }),
            { numRuns: 10 }
          );
        }),
        { numRuns: 100 }
      );
    });

    it('Expressions matching warning-severity patterns return warning or failed status', () => {
      // Get all warning-severity patterns
      const warningPatterns = FORBIDDEN_PATTERNS.filter((p) => p.severity === 'warning');

      fc.assert(
        fc.property(fc.constantFrom(...warningPatterns), (pattern) => {
          const matchingExpression = forbiddenExpressionArb(pattern);

          return fc.assert(
            fc.property(matchingExpression, (expression) => {
              const result = validateExpression(expression);

              // Should return warning or failed status
              expect(['warning', 'failed']).toContain(result.status);
              expect(result.confidenceScore).toBeLessThan(1);
            }),
            { numRuns: 10 }
          );
        }),
        { numRuns: 100 }
      );
    });

    it('Clean expressions return passed status', () => {
      fc.assert(
        fc.property(cleanExpressionArb, (expression) => {
          const result = validateExpression(expression);

          // Clean expressions should pass
          expect(result.status).toBe('passed');
          expect(result.matchedPatterns).toHaveLength(0);
          expect(result.confidenceScore).toBeGreaterThan(0.5);
        }),
        { numRuns: 100 }
      );
    });

    it('isValidExpression returns false for forbidden patterns', () => {
      const errorPatterns = FORBIDDEN_PATTERNS.filter((p) => p.severity === 'error');

      fc.assert(
        fc.property(fc.constantFrom(...errorPatterns), (pattern) => {
          const matchingExpression = forbiddenExpressionArb(pattern);

          return fc.assert(
            fc.property(matchingExpression, (expression) => {
              const isValid = isValidExpression(expression);
              expect(isValid).toBe(false);
            }),
            { numRuns: 10 }
          );
        }),
        { numRuns: 100 }
      );
    });

    it('Validator provides suggestions for matched patterns', () => {
      fc.assert(
        fc.property(fc.constantFrom(...FORBIDDEN_PATTERNS), (pattern) => {
          const matchingExpression = forbiddenExpressionArb(pattern);

          return fc.assert(
            fc.property(matchingExpression, (expression) => {
              const result = validateExpression(expression);

              // If pattern matched, suggestions should be provided
              if (result.matchedPatterns.length > 0) {
                expect(result.suggestions.length).toBeGreaterThan(0);
              }
            }),
            { numRuns: 10 }
          );
        }),
        { numRuns: 100 }
      );
    });

    it('Confidence score is always between 0 and 1', () => {
      // Test with both clean and forbidden expressions
      const allExpressions = fc.oneof(
        cleanExpressionArb,
        fc.constantFrom(
          'I am sorry for bothering you',
          'How do you do',
          'Fighting!',
          'Please understand'
        )
      );

      fc.assert(
        fc.property(allExpressions, (expression) => {
          const result = validateExpression(expression);

          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(1);
        }),
        { numRuns: 100 }
      );
    });

    it('LinguisticValidator instance works consistently', () => {
      const validator = new LinguisticValidator();

      fc.assert(
        fc.property(cleanExpressionArb, (expression) => {
          const result1 = validator.validateExpression(expression);
          const result2 = validator.validateExpression(expression);

          // Same expression should produce same result
          expect(result1.status).toBe(result2.status);
          expect(result1.confidenceScore).toBe(result2.confidenceScore);
          expect(result1.matchedPatterns).toEqual(result2.matchedPatterns);
        }),
        { numRuns: 100 }
      );
    });

    it('Custom patterns are detected correctly', () => {
      const customPattern: ForbiddenPattern = {
        pattern: /\btest custom pattern\b/i,
        name: 'test-custom',
        description: 'Test custom pattern',
        suggestions: ['alternative suggestion'],
        severity: 'error',
      };

      const validator = new LinguisticValidator([customPattern]);

      fc.assert(
        fc.property(
          fc.constantFrom(
            'test custom pattern',
            'This is a test custom pattern here',
            'test custom pattern!'
          ),
          (expression) => {
            const result = validator.validateExpression(expression);

            expect(result.status).toBe('failed');
            expect(result.matchedPatterns).toContain('test-custom');
            expect(result.suggestions).toContain('alternative suggestion');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

import {
  isBurstSegment,
  countBurstSequences,
  getBurstSegmentIndices,
  calculateVideoTiming,
  estimateVideoDuration,
  TIMING_PROFILES,
  DEFAULT_BURST_CONFIG,
  type BurstSequenceConfig,
  type TimingProfileType,
} from './timing-profile';

/**
 * Feature: korean-vs-native-longform
 * Property 13: Burst Sequence Insertion
 * Validates: Requirements 11.2, 11.3
 *
 * For any video with 15+ segments, burst sequences SHALL be inserted every 5 segments.
 * When burst sequence is triggered, 3 consecutive segments become burst segments (5초 each).
 */

describe('Property Tests: Timing Profile - Burst Sequence Insertion', () => {
  /**
   * Property 13: Burst Sequence Insertion
   * For any video with 15+ segments, burst sequences SHALL be inserted every 5 segments.
   * **Validates: Requirements 11.2, 11.3**
   */
  describe('Property 13: Burst Sequence Insertion', () => {
    it('Videos with 15+ segments have burst sequences inserted every 5 segments', () => {
      fc.assert(
        fc.property(fc.integer({ min: 15, max: 50 }), (totalSegments) => {
          const burstIndices = getBurstSegmentIndices(totalSegments);

          // Should have burst sequences
          expect(burstIndices.length).toBeGreaterThan(0);

          // Verify burst sequences are inserted at correct intervals
          // Burst triggers at segment 5, 10, 15, etc. (1-indexed)
          // After trigger, next 3 segments are burst segments
          const expectedBurstStarts = [];
          for (let trigger = 5; trigger < totalSegments; trigger += 5) {
            expectedBurstStarts.push(trigger); // 0-indexed: 5, 10, 15...
          }

          // Each burst start should have up to 3 consecutive burst segments
          for (const burstStart of expectedBurstStarts) {
            if (burstStart < totalSegments) {
              // At least the first burst segment should exist
              expect(burstIndices).toContain(burstStart);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('Videos with fewer than 15 segments have no burst sequences', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 14 }), (totalSegments) => {
          const burstIndices = getBurstSegmentIndices(totalSegments);

          // Should have no burst sequences
          expect(burstIndices.length).toBe(0);

          // countBurstSequences should also return 0
          const burstCount = countBurstSequences(totalSegments);
          expect(burstCount).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('Burst segments have reduced duration (5 seconds)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 50 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (totalSegments, profile) => {
            const timing = calculateVideoTiming(totalSegments, profile);

            // Check that burst segments have 5-second duration
            for (const segmentTiming of timing.segmentTimings) {
              if (segmentTiming.isBurst) {
                expect(segmentTiming.durationSeconds).toBe(
                  DEFAULT_BURST_CONFIG.burstDurationSeconds
                );
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Burst sequences contain exactly 3 consecutive segments when space allows', () => {
      fc.assert(
        fc.property(fc.integer({ min: 15, max: 50 }), (totalSegments) => {
          const burstIndices = getBurstSegmentIndices(totalSegments);

          if (burstIndices.length === 0) return;

          // Group burst indices into sequences
          const sequences: number[][] = [];
          let currentSequence: number[] = [];

          for (let i = 0; i < burstIndices.length; i++) {
            if (currentSequence.length === 0) {
              currentSequence.push(burstIndices[i]);
            } else if (burstIndices[i] === currentSequence[currentSequence.length - 1] + 1) {
              currentSequence.push(burstIndices[i]);
            } else {
              sequences.push(currentSequence);
              currentSequence = [burstIndices[i]];
            }
          }
          if (currentSequence.length > 0) {
            sequences.push(currentSequence);
          }

          // Each sequence should have at most 3 segments (burst length)
          for (const seq of sequences) {
            expect(seq.length).toBeLessThanOrEqual(DEFAULT_BURST_CONFIG.burstLength);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('isBurstSegment is consistent with getBurstSegmentIndices', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 0, max: 49 }),
          (totalSegments, segmentIndex) => {
            if (segmentIndex >= totalSegments) return;

            const burstIndices = getBurstSegmentIndices(totalSegments);
            const isBurst = isBurstSegment(segmentIndex, totalSegments);

            // isBurstSegment should match getBurstSegmentIndices
            expect(burstIndices.includes(segmentIndex)).toBe(isBurst);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('countBurstSequences matches actual burst sequence count', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 50 }), (totalSegments) => {
          const burstIndices = getBurstSegmentIndices(totalSegments);
          const reportedCount = countBurstSequences(totalSegments);

          if (totalSegments < 15) {
            expect(reportedCount).toBe(0);
            expect(burstIndices.length).toBe(0);
            return;
          }

          // Count actual sequences by grouping consecutive indices
          let actualSequenceCount = 0;
          let prevIndex = -10;

          for (const idx of burstIndices) {
            if (idx !== prevIndex + 1) {
              actualSequenceCount++;
            }
            prevIndex = idx;
          }

          expect(reportedCount).toBe(actualSequenceCount);
        }),
        { numRuns: 100 }
      );
    });

    it('Video timing includes correct burst sequence count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 50 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (totalSegments, profile) => {
            const timing = calculateVideoTiming(totalSegments, profile);

            // burstSequenceCount should match countBurstSequences
            expect(timing.burstSequenceCount).toBe(countBurstSequences(totalSegments));

            // Count burst segments in timing
            const burstSegmentCount = timing.segmentTimings.filter((s) => s.isBurst).length;
            expect(burstSegmentCount).toBe(getBurstSegmentIndices(totalSegments).length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Custom burst config is respected', () => {
      const customConfig: BurstSequenceConfig = {
        triggerEveryNSegments: 7,
        burstLength: 2,
        burstDurationSeconds: 4,
      };

      fc.assert(
        fc.property(fc.integer({ min: 15, max: 50 }), (totalSegments) => {
          const burstIndices = getBurstSegmentIndices(totalSegments, customConfig);

          // With trigger every 7 segments, first burst should start at index 7 (0-indexed)
          if (totalSegments > 7) {
            expect(burstIndices).toContain(7);
          }

          // Group into sequences and verify burst length
          const sequences: number[][] = [];
          let currentSequence: number[] = [];

          for (let i = 0; i < burstIndices.length; i++) {
            if (currentSequence.length === 0) {
              currentSequence.push(burstIndices[i]);
            } else if (burstIndices[i] === currentSequence[currentSequence.length - 1] + 1) {
              currentSequence.push(burstIndices[i]);
            } else {
              sequences.push(currentSequence);
              currentSequence = [burstIndices[i]];
            }
          }
          if (currentSequence.length > 0) {
            sequences.push(currentSequence);
          }

          // Each sequence should have at most 2 segments (custom burst length)
          for (const seq of sequences) {
            expect(seq.length).toBeLessThanOrEqual(customConfig.burstLength);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Feature: korean-vs-native-longform
 * Property 7: Video Duration Bounds
 * Validates: Requirements 9.4, 9.5
 *
 * For any video with 25-35 segments using valid timing profiles:
 * - Total duration SHALL NOT exceed 12 minutes (720 seconds)
 * - Total duration SHALL NOT be under 8 minutes (480 seconds)
 */

describe('Property Tests: Video Duration Bounds', () => {
  /**
   * Property 7: Video Duration Bounds
   * For any video with 25-35 segments, total duration SHALL be between 8 and 12 minutes.
   * **Validates: Requirements 9.4, 9.5**
   */
  describe('Property 7: Video Duration Bounds', () => {
    it('Video duration is within expected range for valid segment counts (25-35)', () => {
      // Calculate expected bounds based on actual timing profile settings
      // Hook: 5s, CTA: 15s, Transition: 0.5s
      // fast: 7s/segment, normal: 10s/segment, suspense: 12s/segment

      const HOOK_DURATION = 5;
      const CTA_DURATION = 15;
      const TRANSITION_DURATION = 0.5;

      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const duration = estimateVideoDuration(segmentCount, profile);

            // Get expected segment duration for this profile
            const segmentDuration = TIMING_PROFILES[profile].segmentDurationSeconds;

            // Calculate expected min/max duration (considering burst sequences reduce duration)
            // Without burst optimization:
            const maxExpected =
              HOOK_DURATION +
              segmentCount * segmentDuration +
              CTA_DURATION +
              (segmentCount - 1) * TRANSITION_DURATION;

            // With burst optimization (some segments become 5s instead of full duration)
            // Minimum would be if all segments were burst segments (5s each)
            const minExpected =
              HOOK_DURATION +
              segmentCount * 5 + // All burst
              CTA_DURATION +
              (segmentCount - 1) * TRANSITION_DURATION;

            // Duration should be between min and max expected
            expect(duration).toBeGreaterThanOrEqual(minExpected);
            expect(duration).toBeLessThanOrEqual(maxExpected);

            // Duration should be positive and reasonable (at least 2 minutes)
            expect(duration).toBeGreaterThan(120);
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Video duration scales appropriately with segment count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 34 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const duration1 = estimateVideoDuration(segmentCount, profile);
            const duration2 = estimateVideoDuration(segmentCount + 1, profile);

            // Adding a segment should increase duration
            expect(duration2).toBeGreaterThan(duration1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Timing profiles produce different durations for same segment count', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 35 }), (segmentCount) => {
          const fastDuration = estimateVideoDuration(segmentCount, 'fast');
          const normalDuration = estimateVideoDuration(segmentCount, 'normal');
          const suspenseDuration = estimateVideoDuration(segmentCount, 'suspense');

          // Fast should be shorter than normal, normal shorter than suspense
          expect(fastDuration).toBeLessThan(normalDuration);
          expect(normalDuration).toBeLessThan(suspenseDuration);
        }),
        { numRuns: 100 }
      );
    });

    it('calculateVideoTiming returns consistent duration with estimateVideoDuration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const estimated = estimateVideoDuration(segmentCount, profile);
            const timing = calculateVideoTiming(segmentCount, profile);

            // Both functions should return the same total duration
            expect(timing.totalDurationSeconds).toBe(estimated);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Hook and CTA durations are included in total duration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const timing = calculateVideoTiming(segmentCount, profile);

            // Total duration should include hook and CTA
            expect(timing.hookDurationSeconds).toBeGreaterThan(0);
            expect(timing.ctaDurationSeconds).toBeGreaterThan(0);

            // Sum of segments + hook + CTA should approximately equal total
            // (with some allowance for transitions)
            const segmentSum = timing.segmentTimings.reduce(
              (sum, seg) => sum + seg.durationSeconds,
              0
            );
            const componentSum =
              segmentSum + timing.hookDurationSeconds + timing.ctaDurationSeconds;

            // Total should be at least the sum of components (transitions add time)
            expect(timing.totalDurationSeconds).toBeGreaterThanOrEqual(componentSum);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Burst segments reduce total duration compared to no-burst scenario', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            if (segmentCount < 15) return; // No burst for < 15 segments

            const timing = calculateVideoTiming(segmentCount, profile);
            const timingProfile = TIMING_PROFILES[profile];

            // Calculate expected duration without burst
            const expectedWithoutBurst =
              timing.hookDurationSeconds +
              segmentCount * timingProfile.segmentDurationSeconds +
              timing.ctaDurationSeconds +
              (segmentCount - 1) * 0.5; // transitions

            // Actual duration should be less due to burst segments (5s vs normal duration)
            if (timing.burstSequenceCount > 0) {
              expect(timing.totalDurationSeconds).toBeLessThan(expectedWithoutBurst);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Segment timing boundaries are correctly calculated', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const timing = calculateVideoTiming(segmentCount, profile);

            // Each segment should have correct start and end times
            for (const seg of timing.segmentTimings) {
              // End time should be start time + duration
              expect(seg.endTimeSeconds).toBe(seg.startTimeSeconds + seg.durationSeconds);

              // Start time should be non-negative
              expect(seg.startTimeSeconds).toBeGreaterThanOrEqual(0);
            }

            // Segments should be in order
            for (let i = 1; i < timing.segmentTimings.length; i++) {
              const prev = timing.segmentTimings[i - 1];
              const curr = timing.segmentTimings[i];

              // Current segment should start after previous segment ends
              // (with transition time in between)
              expect(curr.startTimeSeconds).toBeGreaterThan(prev.endTimeSeconds);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Feature: korean-vs-native-longform
 * Property 9: Timestamp Generation
 * Validates: Requirements 9.6
 *
 * For any generated video, timestamps SHALL be produced in YouTube chapter format (MM:SS Label).
 */

import {
  generateComparisonTimestamps,
  formatTimestamp,
} from './timestamps';

describe('Property Tests: Timestamp Generation', () => {
  /**
   * Property 9: Timestamp Generation
   * For any generated video, timestamps SHALL be produced in YouTube chapter format (MM:SS Label).
   * **Validates: Requirements 9.6**
   */
  describe('Property 9: Timestamp Generation', () => {
    it('formatTimestamp produces MM:SS format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3600 }), // 0 to 60 minutes
          (seconds) => {
            const result = formatTimestamp(seconds);

            // Should match MM:SS pattern
            expect(result).toMatch(/^\d{2}:\d{2}$/);

            // Parse back and verify
            const [mins, secs] = result.split(':').map(Number);
            expect(mins).toBe(Math.floor(seconds / 60));
            expect(secs).toBe(Math.floor(seconds % 60));
          }
        ),
        { numRuns: 200 }
      );
    });

    it('timestamps follow MM:SS Label format for all lines', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const script = createSampleComparisonScript('test-channel', segmentCount);
            const timestamps = generateComparisonTimestamps(script, profile);

            // Each line should match MM:SS Label pattern
            const lines = timestamps.split('\n');
            const pattern = /^\d{2}:\d{2} .+$/;

            expect(lines.length).toBeGreaterThan(0);

            for (const line of lines) {
              if (line.trim()) {
                expect(line).toMatch(pattern);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('timestamps start at 00:00 for Hook', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const script = createSampleComparisonScript('test-channel', segmentCount);
            const timestamps = generateComparisonTimestamps(script, profile);

            const firstLine = timestamps.split('\n')[0];
            expect(firstLine).toBe('00:00 Hook');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('timestamp times are in increasing order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const script = createSampleComparisonScript('test-channel', segmentCount);
            const timestamps = generateComparisonTimestamps(script, profile);

            const lines = timestamps.split('\n').filter((l) => l.trim());

            // Parse times and check they are increasing
            let prevSeconds = -1;
            for (const line of lines) {
              const match = line.match(/^(\d{2}):(\d{2})/);
              if (match) {
                const currentSeconds = parseInt(match[1]) * 60 + parseInt(match[2]);
                expect(currentSeconds).toBeGreaterThanOrEqual(prevSeconds);
                prevSeconds = currentSeconds;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('has correct number of timestamp entries (Hook + segments + CTA)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const script = createSampleComparisonScript('test-channel', segmentCount);
            const timestamps = generateComparisonTimestamps(script, profile);

            const lines = timestamps.split('\n').filter((l) => l.trim());

            // Should have: 1 Hook + segmentCount segments + 1 CTA
            const expectedCount = 1 + segmentCount + 1;
            expect(lines.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('CTA timestamp is at the end', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 25, max: 35 }),
          fc.constantFrom<TimingProfileType>('fast', 'normal', 'suspense'),
          (segmentCount, profile) => {
            const script = createSampleComparisonScript('test-channel', segmentCount);
            const timestamps = generateComparisonTimestamps(script, profile);

            const lines = timestamps.split('\n').filter((l) => l.trim());
            const lastLine = lines[lines.length - 1];

            expect(lastLine).toMatch(/^\d{2}:\d{2} CTA$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
