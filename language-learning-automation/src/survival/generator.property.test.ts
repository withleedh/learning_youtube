import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { survivalScriptSchema, type SurvivalRound, type SurvivalCharacter } from './types';
import { generateRoundWinners, assignExpressionsToCharacters } from './winner-logic';

/**
 * Feature: survival-quiz-longform, Property 1: Round Count Exactness
 * Validates: Requirements 1.1
 *
 * For any generated SurvivalScript, the rounds array length SHALL be exactly 50.
 *
 * Since the actual generator requires Gemini API calls, we test:
 * 1. Schema validation enforces exactly 50 rounds
 * 2. The buildRounds logic produces correct number of rounds from input
 */

// Category type for generating valid categories
type SurvivalCategory = 'daily' | 'business' | 'emotion' | 'request_reject' | 'apology_thanks';

// Arbitrary for generating valid categories
const categoryArb: fc.Arbitrary<SurvivalCategory> = fc.constantFrom(
  'daily',
  'business',
  'emotion',
  'request_reject',
  'apology_thanks'
);

// Arbitrary for generating valid characters
const characterArb: fc.Arbitrary<SurvivalCharacter> = fc.constantFrom('cat', 'dog');

// Arbitrary for generating a valid SurvivalRound
const survivalRoundArb: fc.Arbitrary<SurvivalRound> = fc
  .record({
    id: fc.integer({ min: 1, max: 50 }),
    category: categoryArb,
    situation: fc.string({ minLength: 1, maxLength: 50 }),
    situationEnglish: fc.string({ minLength: 1, maxLength: 100 }),
    konglishText: fc.string({ minLength: 1, maxLength: 100 }),
    nativeText: fc.string({ minLength: 1, maxLength: 100 }),
    explanation: fc.string({ minLength: 1, maxLength: 30 }),
    winner: characterArb,
  })
  .map(
    ({
      id,
      category,
      situation,
      situationEnglish,
      konglishText,
      nativeText,
      explanation,
      winner,
    }) => {
      const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';
      return {
        id,
        category,
        situation,
        situationEnglish,
        konglishAnswer: {
          text: konglishText,
          character: loser,
        },
        nativeAnswer: {
          text: nativeText,
          character: winner,
        },
        explanation,
        winner,
      };
    }
  );

// Helper to generate exactly N rounds with sequential IDs
function generateNRounds(n: number, baseRound: Omit<SurvivalRound, 'id'>): SurvivalRound[] {
  return Array.from({ length: n }, (_, i) => ({
    ...baseRound,
    id: i + 1,
  }));
}

// Helper to create a valid SurvivalScript structure
function createSurvivalScript(rounds: SurvivalRound[]) {
  const catWins = rounds.filter((r) => r.winner === 'cat').length;
  const dogWins = rounds.filter((r) => r.winner === 'dog').length;
  const winner: SurvivalCharacter = catWins >= dogWins ? 'cat' : 'dog';

  return {
    channelId: 'test-channel',
    date: '2024-01-15',
    title: {
      korean: '고양이 vs 강아지 50라운드 서바이벌',
      english: 'Cat vs Dog 50-Round Survival',
    },
    intro: {
      title: 'Cat vs Dog 서바이벌!',
      subtitle: '틀리면 바닥이 열립니다!',
    },
    rounds,
    ending: {
      winner,
      catFinalHP: winner === 'cat' ? 50 : 0,
      dogFinalHP: winner === 'dog' ? 50 : 0,
      catWins,
      dogWins,
      ctaQuestion: '다음 대결에서는 누가 이길까요?',
    },
  };
}

// Raw expression pair type (before character assignment)
interface RawExpressionPair {
  category: SurvivalCategory;
  situation: string;
  situationEnglish: string;
  konglishText: string;
  nativeText: string;
  explanation: string;
}

// Arbitrary for generating raw expression pairs
const rawExpressionPairArb: fc.Arbitrary<RawExpressionPair> = fc.record({
  category: categoryArb,
  situation: fc.string({ minLength: 1, maxLength: 50 }),
  situationEnglish: fc.string({ minLength: 1, maxLength: 100 }),
  konglishText: fc.string({ minLength: 1, maxLength: 100 }),
  nativeText: fc.string({ minLength: 1, maxLength: 100 }),
  explanation: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Simulates the buildRounds method from SurvivalGenerator
 * This is a pure function that can be tested without API calls
 */
function buildRounds(
  expressionPairs: RawExpressionPair[],
  roundWinners: { roundId: number; winner: SurvivalCharacter; loser: SurvivalCharacter }[]
): SurvivalRound[] {
  const rounds: SurvivalRound[] = [];

  for (let i = 0; i < expressionPairs.length; i++) {
    const pair = expressionPairs[i];
    const winnerDecision = roundWinners[i];

    // Assign expressions to characters based on winner
    const { konglishAnswer, nativeAnswer } = assignExpressionsToCharacters(
      pair.konglishText,
      pair.nativeText,
      winnerDecision.winner
    );

    const round: SurvivalRound = {
      id: i + 1,
      category: pair.category,
      situation: pair.situation,
      situationEnglish: pair.situationEnglish,
      konglishAnswer,
      nativeAnswer,
      explanation: pair.explanation,
      winner: winnerDecision.winner,
    };

    rounds.push(round);
  }

  return rounds;
}

describe('Property Tests: Generator Round Count Exactness', () => {
  /**
   * Feature: survival-quiz-longform, Property 1: Round Count Exactness
   * For any generated SurvivalScript, the rounds array length SHALL be exactly 50.
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Round Count Exactness', () => {
    /**
     * Property 1.1: Schema validation accepts exactly 50 rounds
     * **Validates: Requirements 1.1**
     */
    it('schema validation accepts exactly 50 rounds', () => {
      fc.assert(
        fc.property(
          fc.array(survivalRoundArb, { minLength: 50, maxLength: 50 }),
          (generatedRounds) => {
            // Ensure IDs are sequential 1-50
            const rounds = generatedRounds.map((r, i) => ({ ...r, id: i + 1 }));
            const script = createSurvivalScript(rounds);

            const result = survivalScriptSchema.safeParse(script);
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.rounds.length).toBe(50);
            }
            return result.success && result.data.rounds.length === 50;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.2: Schema validation rejects fewer than 50 rounds
     * **Validates: Requirements 1.1**
     */
    it('schema validation rejects fewer than 50 rounds', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 49 }), survivalRoundArb, (roundCount, baseRound) => {
          const rounds = generateNRounds(roundCount, baseRound);
          const script = createSurvivalScript(rounds);

          const result = survivalScriptSchema.safeParse(script);
          expect(result.success).toBe(false);
          return result.success === false;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.3: Schema validation rejects more than 50 rounds
     * **Validates: Requirements 1.1**
     */
    it('schema validation rejects more than 50 rounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 51, max: 100 }),
          survivalRoundArb,
          (roundCount, baseRound) => {
            const rounds = generateNRounds(roundCount, baseRound);
            const script = createSurvivalScript(rounds);

            const result = survivalScriptSchema.safeParse(script);
            expect(result.success).toBe(false);
            return result.success === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.4: buildRounds produces exactly N rounds when given N expression pairs
     * **Validates: Requirements 1.1**
     */
    it('buildRounds produces exactly N rounds when given N expression pairs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 1000000 }), // seed for reproducibility
          (roundCount, seed) => {
            // Generate N expression pairs
            const expressionPairs: RawExpressionPair[] = Array.from(
              { length: roundCount },
              (_, i) => ({
                category: 'daily' as SurvivalCategory,
                situation: `상황 ${i + 1}`,
                situationEnglish: `Situation ${i + 1}`,
                konglishText: `Konglish ${i + 1}`,
                nativeText: `Native ${i + 1}`,
                explanation: `설명 ${i + 1}`,
              })
            );

            // Generate N winner decisions
            const roundWinners = generateRoundWinners(roundCount, seed);

            // Build rounds
            const rounds = buildRounds(expressionPairs, roundWinners);

            // Verify count matches
            expect(rounds.length).toBe(roundCount);
            expect(rounds.length).toBe(expressionPairs.length);
            expect(rounds.length).toBe(roundWinners.length);

            return rounds.length === roundCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.5: buildRounds with exactly 50 pairs produces exactly 50 rounds
     * **Validates: Requirements 1.1**
     */
    it('buildRounds with exactly 50 pairs produces exactly 50 rounds', () => {
      fc.assert(
        fc.property(
          fc.array(rawExpressionPairArb, { minLength: 50, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }), // seed
          (expressionPairs, seed) => {
            const roundWinners = generateRoundWinners(50, seed);
            const rounds = buildRounds(expressionPairs, roundWinners);

            expect(rounds.length).toBe(50);
            return rounds.length === 50;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.6: Round IDs are sequential from 1 to N
     * **Validates: Requirements 1.1**
     */
    it('buildRounds produces sequential IDs from 1 to N', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 1000000 }),
          (roundCount, seed) => {
            const expressionPairs: RawExpressionPair[] = Array.from({ length: roundCount }, () => ({
              category: 'daily' as SurvivalCategory,
              situation: '상황',
              situationEnglish: 'Situation',
              konglishText: 'Konglish',
              nativeText: 'Native',
              explanation: '설명',
            }));

            const roundWinners = generateRoundWinners(roundCount, seed);
            const rounds = buildRounds(expressionPairs, roundWinners);

            // Verify IDs are sequential 1 to N
            for (let i = 0; i < rounds.length; i++) {
              expect(rounds[i].id).toBe(i + 1);
            }

            return rounds.every((r, i) => r.id === i + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.7: Empty input produces empty output
     * **Validates: Requirements 1.1**
     */
    it('buildRounds with empty input produces empty output', () => {
      const expressionPairs: RawExpressionPair[] = [];
      const roundWinners = generateRoundWinners(0);
      const rounds = buildRounds(expressionPairs, roundWinners);

      expect(rounds.length).toBe(0);
    });

    /**
     * Property 1.8: Schema enforces exactly 50 rounds - boundary test at 49
     * **Validates: Requirements 1.1**
     */
    it('schema rejects 49 rounds (boundary test)', () => {
      const baseRound: Omit<SurvivalRound, 'id'> = {
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const rounds = generateNRounds(49, baseRound);
      const script = createSurvivalScript(rounds);

      const result = survivalScriptSchema.safeParse(script);
      expect(result.success).toBe(false);
    });

    /**
     * Property 1.9: Schema enforces exactly 50 rounds - boundary test at 51
     * **Validates: Requirements 1.1**
     */
    it('schema rejects 51 rounds (boundary test)', () => {
      const baseRound: Omit<SurvivalRound, 'id'> = {
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const rounds = generateNRounds(51, baseRound);
      const script = createSurvivalScript(rounds);

      const result = survivalScriptSchema.safeParse(script);
      expect(result.success).toBe(false);
    });

    /**
     * Property 1.10: Schema accepts exactly 50 rounds (boundary test)
     * **Validates: Requirements 1.1**
     */
    it('schema accepts exactly 50 rounds (boundary test)', () => {
      const baseRound: Omit<SurvivalRound, 'id'> = {
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const rounds = generateNRounds(50, baseRound);
      const script = createSurvivalScript(rounds);

      const result = survivalScriptSchema.safeParse(script);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rounds.length).toBe(50);
      }
    });

    /**
     * Property 1.11: generateRoundWinners produces exactly N decisions
     * **Validates: Requirements 1.1**
     */
    it('generateRoundWinners produces exactly N decisions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.option(fc.integer({ min: 1, max: 1000000 }), { nil: undefined }),
          (roundCount, seed) => {
            const decisions = generateRoundWinners(roundCount, seed);
            expect(decisions.length).toBe(roundCount);
            return decisions.length === roundCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1.12: generateRoundWinners with default produces exactly 50 decisions
     * **Validates: Requirements 1.1**
     */
    it('generateRoundWinners with default produces exactly 50 decisions', () => {
      fc.assert(
        fc.property(fc.option(fc.integer({ min: 1, max: 1000000 }), { nil: undefined }), (seed) => {
          const decisions = generateRoundWinners(50, seed);
          expect(decisions.length).toBe(50);
          return decisions.length === 50;
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Feature: survival-quiz-longform, Property 4: Category Distribution
 * Validates: Requirements 1.4, 12.3
 *
 * For any generated SurvivalScript with 50 rounds, no single category SHALL
 * represent more than 50% of total rounds (max 25 rounds per category).
 */

// Helper function to validate category distribution
// Mirrors the validateCategoryDistribution function from generator.ts
function validateCategoryDistribution(
  rounds: Array<{ category: SurvivalCategory }>,
  maxPerCategory: number
): boolean {
  const categoryCount: Record<string, number> = {};

  for (const round of rounds) {
    categoryCount[round.category] = (categoryCount[round.category] || 0) + 1;
  }

  for (const count of Object.values(categoryCount)) {
    if (count > maxPerCategory) {
      return false;
    }
  }

  return true;
}

// Helper to count categories in rounds
function countCategories(
  rounds: Array<{ category: SurvivalCategory }>
): Record<SurvivalCategory, number> {
  const counts: Record<SurvivalCategory, number> = {
    daily: 0,
    business: 0,
    emotion: 0,
    request_reject: 0,
    apology_thanks: 0,
  };

  for (const round of rounds) {
    counts[round.category]++;
  }

  return counts;
}

describe('Property Tests: Generator Category Distribution', () => {
  /**
   * Feature: survival-quiz-longform, Property 4: Category Distribution
   * For any generated SurvivalScript with 50 rounds, no single category SHALL
   * represent more than 50% of total rounds (max 25 rounds per category).
   * **Validates: Requirements 1.4, 12.3**
   */
  describe('Property 4: Category Distribution', () => {
    /**
     * Property 4.1: validateCategoryDistribution correctly identifies valid distributions
     * **Validates: Requirements 1.4, 12.3**
     */
    it('validateCategoryDistribution accepts balanced distributions', () => {
      fc.assert(
        fc.property(
          // Generate 50 rounds with balanced category distribution (max 25 per category)
          fc.array(categoryArb, { minLength: 50, maxLength: 50 }),
          (categories) => {
            // Create rounds with the generated categories
            const rounds = categories.map((category) => ({ category }));

            // Check if distribution is valid (max 25 per category)
            const counts = countCategories(rounds);
            const maxCount = Math.max(...Object.values(counts));

            // If max count is <= 25, validation should pass
            if (maxCount <= 25) {
              expect(validateCategoryDistribution(rounds, 25)).toBe(true);
              return true;
            }

            // If max count > 25, validation should fail
            expect(validateCategoryDistribution(rounds, 25)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.2: validateCategoryDistribution rejects distributions with > 50% in one category
     * **Validates: Requirements 1.4, 12.3**
     */
    it('validateCategoryDistribution rejects distributions exceeding 50% threshold', () => {
      fc.assert(
        fc.property(
          // Generate a category that will exceed the limit
          categoryArb,
          // Generate count that exceeds 25 (26-50)
          fc.integer({ min: 26, max: 50 }),
          (dominantCategory, dominantCount) => {
            // Create rounds where one category exceeds 50%
            const rounds: Array<{ category: SurvivalCategory }> = [];

            // Add dominant category rounds
            for (let i = 0; i < dominantCount; i++) {
              rounds.push({ category: dominantCategory });
            }

            // Fill remaining with other categories
            const otherCategories: SurvivalCategory[] = [
              'daily',
              'business',
              'emotion',
              'request_reject',
              'apology_thanks',
            ].filter((c) => c !== dominantCategory) as SurvivalCategory[];

            const remaining = 50 - dominantCount;
            for (let i = 0; i < remaining; i++) {
              rounds.push({ category: otherCategories[i % otherCategories.length] });
            }

            // Validation should fail because one category > 25
            expect(validateCategoryDistribution(rounds, 25)).toBe(false);
            return validateCategoryDistribution(rounds, 25) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.3: validateCategoryDistribution accepts exactly 25 rounds per category (boundary)
     * **Validates: Requirements 1.4, 12.3**
     */
    it('validateCategoryDistribution accepts exactly 25 rounds in one category (boundary)', () => {
      fc.assert(
        fc.property(
          categoryArb,
          fc.array(categoryArb, { minLength: 25, maxLength: 25 }),
          (dominantCategory, otherCategories) => {
            // Create rounds with exactly 25 in one category
            const rounds: Array<{ category: SurvivalCategory }> = [];

            // Add exactly 25 of the dominant category
            for (let i = 0; i < 25; i++) {
              rounds.push({ category: dominantCategory });
            }

            // Add 25 more from other categories
            for (let i = 0; i < 25; i++) {
              rounds.push({ category: otherCategories[i] });
            }

            // Validation should pass because max is exactly 25
            const counts = countCategories(rounds);
            const maxCount = Math.max(...Object.values(counts));

            // If the other categories don't exceed 25, validation should pass
            if (maxCount <= 25) {
              expect(validateCategoryDistribution(rounds, 25)).toBe(true);
              return true;
            }

            // If other categories happen to exceed 25, validation should fail
            expect(validateCategoryDistribution(rounds, 25)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.4: validateCategoryDistribution rejects 26 rounds in one category (boundary)
     * **Validates: Requirements 1.4, 12.3**
     */
    it('validateCategoryDistribution rejects 26 rounds in one category (boundary)', () => {
      fc.assert(
        fc.property(categoryArb, (dominantCategory) => {
          // Create rounds with exactly 26 in one category
          const rounds: Array<{ category: SurvivalCategory }> = [];

          // Add exactly 26 of the dominant category
          for (let i = 0; i < 26; i++) {
            rounds.push({ category: dominantCategory });
          }

          // Fill remaining 24 with other categories
          const otherCategories: SurvivalCategory[] = [
            'daily',
            'business',
            'emotion',
            'request_reject',
            'apology_thanks',
          ].filter((c) => c !== dominantCategory) as SurvivalCategory[];

          for (let i = 0; i < 24; i++) {
            rounds.push({ category: otherCategories[i % otherCategories.length] });
          }

          // Validation should fail because one category has 26 > 25
          expect(validateCategoryDistribution(rounds, 25)).toBe(false);
          return validateCategoryDistribution(rounds, 25) === false;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.5: Perfectly balanced distribution (10 per category) is always valid
     * **Validates: Requirements 1.4, 12.3**
     */
    it('perfectly balanced distribution (10 per category) is always valid', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
          // Create perfectly balanced distribution: 10 rounds per category
          const categories: SurvivalCategory[] = [
            'daily',
            'business',
            'emotion',
            'request_reject',
            'apology_thanks',
          ];

          const rounds: Array<{ category: SurvivalCategory }> = [];
          for (const category of categories) {
            for (let i = 0; i < 10; i++) {
              rounds.push({ category });
            }
          }

          // Verify we have exactly 50 rounds
          expect(rounds.length).toBe(50);

          // Verify each category has exactly 10
          const counts = countCategories(rounds);
          for (const category of categories) {
            expect(counts[category]).toBe(10);
          }

          // Validation should always pass
          expect(validateCategoryDistribution(rounds, 25)).toBe(true);
          return validateCategoryDistribution(rounds, 25) === true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.6: All rounds in single category (50) is always invalid
     * **Validates: Requirements 1.4, 12.3**
     */
    it('all rounds in single category (50) is always invalid', () => {
      fc.assert(
        fc.property(categoryArb, (category) => {
          // Create 50 rounds all in one category
          const rounds: Array<{ category: SurvivalCategory }> = [];
          for (let i = 0; i < 50; i++) {
            rounds.push({ category });
          }

          // Validation should fail because 50 > 25
          expect(validateCategoryDistribution(rounds, 25)).toBe(false);
          return validateCategoryDistribution(rounds, 25) === false;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.7: Empty rounds array is always valid (no category exceeds limit)
     * **Validates: Requirements 1.4, 12.3**
     */
    it('empty rounds array is always valid', () => {
      const rounds: Array<{ category: SurvivalCategory }> = [];
      expect(validateCategoryDistribution(rounds, 25)).toBe(true);
    });

    /**
     * Property 4.8: Single round is always valid (1 <= 25)
     * **Validates: Requirements 1.4, 12.3**
     */
    it('single round is always valid', () => {
      fc.assert(
        fc.property(categoryArb, (category) => {
          const rounds = [{ category }];
          expect(validateCategoryDistribution(rounds, 25)).toBe(true);
          return validateCategoryDistribution(rounds, 25) === true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.9: Distribution with exactly maxPerCategory in multiple categories is valid
     * **Validates: Requirements 1.4, 12.3**
     */
    it('distribution with exactly maxPerCategory in multiple categories is valid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }), // number of categories at max
          (numCategoriesAtMax) => {
            const categories: SurvivalCategory[] = [
              'daily',
              'business',
              'emotion',
              'request_reject',
              'apology_thanks',
            ];

            const rounds: Array<{ category: SurvivalCategory }> = [];

            // Add exactly 25 rounds for numCategoriesAtMax categories
            // But we can only have 2 categories at 25 (total 50 rounds)
            const actualNumAtMax = Math.min(numCategoriesAtMax, 2);
            const roundsPerMaxCategory = 25;

            for (let i = 0; i < actualNumAtMax; i++) {
              for (let j = 0; j < roundsPerMaxCategory; j++) {
                rounds.push({ category: categories[i] });
              }
            }

            // Fill remaining rounds with other categories
            const remaining = 50 - rounds.length;
            for (let i = 0; i < remaining; i++) {
              rounds.push({ category: categories[actualNumAtMax + (i % (5 - actualNumAtMax))] });
            }

            // Ensure we have exactly 50 rounds
            const finalRounds = rounds.slice(0, 50);

            // Check if any category exceeds 25
            const counts = countCategories(finalRounds);
            const maxCount = Math.max(...Object.values(counts));

            if (maxCount <= 25) {
              expect(validateCategoryDistribution(finalRounds, 25)).toBe(true);
            } else {
              expect(validateCategoryDistribution(finalRounds, 25)).toBe(false);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.10: Schema validation with valid category distribution passes
     * **Validates: Requirements 1.4, 12.3**
     */
    it('schema validation with valid category distribution passes', () => {
      fc.assert(
        fc.property(
          // Generate 50 rounds with balanced categories (max 10 per category to ensure validity)
          fc.array(
            fc.record({
              category: categoryArb,
              situation: fc.string({ minLength: 1, maxLength: 50 }),
              situationEnglish: fc.string({ minLength: 1, maxLength: 100 }),
              konglishText: fc.string({ minLength: 1, maxLength: 100 }),
              nativeText: fc.string({ minLength: 1, maxLength: 100 }),
              explanation: fc.string({ minLength: 1, maxLength: 30 }),
              winner: characterArb,
            }),
            { minLength: 50, maxLength: 50 }
          ),
          (roundData) => {
            // Build rounds with proper structure
            const rounds: SurvivalRound[] = roundData.map((data, i) => {
              const loser: SurvivalCharacter = data.winner === 'cat' ? 'dog' : 'cat';
              return {
                id: i + 1,
                category: data.category,
                situation: data.situation,
                situationEnglish: data.situationEnglish,
                konglishAnswer: { text: data.konglishText, character: loser },
                nativeAnswer: { text: data.nativeText, character: data.winner },
                explanation: data.explanation,
                winner: data.winner,
              };
            });

            // Create script
            const script = createSurvivalScript(rounds);

            // Schema validation should pass (schema doesn't enforce category distribution)
            const result = survivalScriptSchema.safeParse(script);
            expect(result.success).toBe(true);

            // But we can verify category distribution separately
            const counts = countCategories(rounds);
            const maxCount = Math.max(...Object.values(counts));
            const isValidDistribution = maxCount <= 25;

            // Log for debugging if distribution is invalid
            if (!isValidDistribution) {
              console.log('Category counts:', counts, 'Max:', maxCount);
            }

            return result.success;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.11: validateCategoryDistribution is consistent with different maxPerCategory values
     * **Validates: Requirements 1.4, 12.3**
     */
    it('validateCategoryDistribution respects different maxPerCategory thresholds', () => {
      fc.assert(
        fc.property(
          fc.array(categoryArb, { minLength: 50, maxLength: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (categories, maxPerCategory) => {
            const rounds = categories.map((category) => ({ category }));
            const counts = countCategories(rounds);
            const maxCount = Math.max(...Object.values(counts));

            const isValid = validateCategoryDistribution(rounds, maxPerCategory);

            // Validation should pass iff maxCount <= maxPerCategory
            expect(isValid).toBe(maxCount <= maxPerCategory);
            return isValid === maxCount <= maxPerCategory;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.12: Category distribution validation is deterministic
     * **Validates: Requirements 1.4, 12.3**
     */
    it('category distribution validation is deterministic', () => {
      fc.assert(
        fc.property(fc.array(categoryArb, { minLength: 50, maxLength: 50 }), (categories) => {
          const rounds = categories.map((category) => ({ category }));

          // Run validation multiple times
          const result1 = validateCategoryDistribution(rounds, 25);
          const result2 = validateCategoryDistribution(rounds, 25);
          const result3 = validateCategoryDistribution(rounds, 25);

          // All results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);

          return result1 === result2 && result2 === result3;
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Feature: survival-quiz-longform, Property 17: Explanation Length
 * Validates: Requirements 10.2
 *
 * For any SurvivalRound explanation, the character count SHALL be under 30 characters
 * (with 20 recommended).
 *
 * Tests the truncateExplanation function and schema validation for explanation field.
 */

// Import the truncateExplanation function for testing
// Since it's not exported, we'll recreate the logic here for testing
function truncateExplanation(explanation: string, maxLength: number = 30): string {
  if (explanation.length <= maxLength) {
    return explanation;
  }
  return explanation.slice(0, maxLength - 3) + '...';
}

describe('Property Tests: Generator Explanation Length', () => {
  /**
   * Feature: survival-quiz-longform, Property 17: Explanation Length
   * For any SurvivalRound explanation, the character count SHALL be under 30 characters.
   * **Validates: Requirements 10.2**
   */
  describe('Property 17: Explanation Length', () => {
    /**
     * Property 17.1: truncateExplanation always produces output <= maxLength
     * **Validates: Requirements 10.2**
     *
     * Note: maxLength must be >= 4 to accommodate "..." (3 chars) plus at least 1 char of content.
     * The function is designed for maxLength of 30 (per requirements), so we test with realistic values.
     */
    it('truncateExplanation always produces output <= maxLength', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.integer({ min: 4, max: 100 }), // min 4 to accommodate "..." truncation
          (input, maxLength) => {
            const result = truncateExplanation(input, maxLength);
            expect(result.length).toBeLessThanOrEqual(maxLength);
            return result.length <= maxLength;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.2: truncateExplanation with default maxLength (30) always produces output <= 30
     * **Validates: Requirements 10.2**
     */
    it('truncateExplanation with default maxLength (30) always produces output <= 30', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
          const result = truncateExplanation(input);
          expect(result.length).toBeLessThanOrEqual(30);
          return result.length <= 30;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.3: Explanations <= maxLength are returned unchanged
     * **Validates: Requirements 10.2**
     */
    it('explanations <= maxLength are returned unchanged', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (maxLength, inputLength) => {
            // Generate string with length <= maxLength
            const actualLength = Math.min(inputLength, maxLength);
            const input = 'a'.repeat(actualLength);

            const result = truncateExplanation(input, maxLength);
            expect(result).toBe(input);
            return result === input;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.4: Explanations > maxLength are truncated with "..."
     * **Validates: Requirements 10.2**
     */
    it('explanations > maxLength are truncated with "..."', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 100 }), // maxLength must be >= 4 for "..." to fit
          fc.integer({ min: 1, max: 100 }),
          (maxLength, extraLength) => {
            // Generate string longer than maxLength
            const input = 'a'.repeat(maxLength + extraLength);

            const result = truncateExplanation(input, maxLength);

            // Result should end with "..."
            expect(result.endsWith('...')).toBe(true);
            // Result should be exactly maxLength
            expect(result.length).toBe(maxLength);

            return result.endsWith('...') && result.length === maxLength;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.5: Truncated content preserves prefix of original
     * **Validates: Requirements 10.2**
     */
    it('truncated content preserves prefix of original', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (maxLength, input) => {
            if (input.length <= maxLength) {
              // Not truncated, should be unchanged
              const result = truncateExplanation(input, maxLength);
              expect(result).toBe(input);
              return true;
            }

            const result = truncateExplanation(input, maxLength);
            // The prefix (before "...") should match the original
            const prefix = result.slice(0, -3);
            expect(input.startsWith(prefix)).toBe(true);

            return input.startsWith(prefix);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.6: Boundary test - exactly 30 characters is not truncated
     * **Validates: Requirements 10.2**
     */
    it('exactly 30 characters is not truncated', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
          const input = 'a'.repeat(30);
          const result = truncateExplanation(input);

          expect(result).toBe(input);
          expect(result.length).toBe(30);
          expect(result.endsWith('...')).toBe(false);

          return result === input && result.length === 30;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.7: Boundary test - 31 characters is truncated
     * **Validates: Requirements 10.2**
     */
    it('31 characters is truncated', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
          const input = 'a'.repeat(31);
          const result = truncateExplanation(input);

          expect(result.length).toBe(30);
          expect(result.endsWith('...')).toBe(true);
          expect(result).toBe('a'.repeat(27) + '...');

          return result.length === 30 && result.endsWith('...');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.8: Empty string is returned unchanged
     * **Validates: Requirements 10.2**
     */
    it('empty string is returned unchanged', () => {
      const result = truncateExplanation('');
      expect(result).toBe('');
      expect(result.length).toBe(0);
    });

    /**
     * Property 17.9: Schema validation enforces max 30 characters for explanation
     * **Validates: Requirements 10.2**
     */
    it('schema validation enforces max 30 characters for explanation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          characterArb,
          (explanation, winner) => {
            const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';
            const round: SurvivalRound = {
              id: 1,
              category: 'daily',
              situation: '화장실 어디에요?',
              situationEnglish: 'Where is the bathroom?',
              konglishAnswer: { text: 'Where is toilet?', character: loser },
              nativeAnswer: { text: 'Where is the restroom?', character: winner },
              explanation,
              winner,
            };

            // Create a valid script with this round (need 50 rounds)
            const rounds = Array.from({ length: 50 }, (_, i) => ({
              ...round,
              id: i + 1,
            }));
            const script = createSurvivalScript(rounds);

            const result = survivalScriptSchema.safeParse(script);
            expect(result.success).toBe(true);

            return result.success;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.10: Schema validation rejects explanation > 30 characters
     * **Validates: Requirements 10.2**
     */
    it('schema validation rejects explanation > 30 characters', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 31, max: 100 }),
          characterArb,
          (explanationLength, winner) => {
            const explanation = 'a'.repeat(explanationLength);
            const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';
            const round = {
              id: 1,
              category: 'daily',
              situation: '화장실 어디에요?',
              situationEnglish: 'Where is the bathroom?',
              konglishAnswer: { text: 'Where is toilet?', character: loser },
              nativeAnswer: { text: 'Where is the restroom?', character: winner },
              explanation,
              winner,
            };

            // Create a script with this round (need 50 rounds)
            const rounds = Array.from({ length: 50 }, (_, i) => ({
              ...round,
              id: i + 1,
            }));
            const script = createSurvivalScript(rounds);

            const result = survivalScriptSchema.safeParse(script);
            expect(result.success).toBe(false);

            return result.success === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.11: truncateExplanation is idempotent
     * **Validates: Requirements 10.2**
     */
    it('truncateExplanation is idempotent', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.integer({ min: 4, max: 100 }),
          (input, maxLength) => {
            const result1 = truncateExplanation(input, maxLength);
            const result2 = truncateExplanation(result1, maxLength);

            // Applying truncation twice should give same result
            expect(result1).toBe(result2);
            return result1 === result2;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.12: truncateExplanation preserves Korean characters correctly
     * **Validates: Requirements 10.2**
     */
    it('truncateExplanation preserves Korean characters correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 0, max: 50 }),
          (koreanLength, extraLength) => {
            // Generate Korean string
            const koreanChars = '가나다라마바사아자차카타파하';
            const koreanInput = Array.from(
              { length: koreanLength + extraLength },
              (_, i) => koreanChars[i % koreanChars.length]
            ).join('');

            const result = truncateExplanation(koreanInput, 30);

            // Result should be <= 30 characters
            expect(result.length).toBeLessThanOrEqual(30);

            // If truncated, should end with "..."
            if (koreanInput.length > 30) {
              expect(result.endsWith('...')).toBe(true);
            }

            return result.length <= 30;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.13: All explanations in a valid script are <= 30 characters
     * **Validates: Requirements 10.2**
     */
    it('all explanations in a valid script are <= 30 characters', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              category: categoryArb,
              situation: fc.string({ minLength: 1, maxLength: 50 }),
              situationEnglish: fc.string({ minLength: 1, maxLength: 100 }),
              konglishText: fc.string({ minLength: 1, maxLength: 100 }),
              nativeText: fc.string({ minLength: 1, maxLength: 100 }),
              explanation: fc.string({ minLength: 1, maxLength: 30 }), // Valid length
              winner: characterArb,
            }),
            { minLength: 50, maxLength: 50 }
          ),
          (roundData) => {
            // Build rounds with proper structure
            const rounds: SurvivalRound[] = roundData.map((data, i) => {
              const loser: SurvivalCharacter = data.winner === 'cat' ? 'dog' : 'cat';
              return {
                id: i + 1,
                category: data.category,
                situation: data.situation,
                situationEnglish: data.situationEnglish,
                konglishAnswer: { text: data.konglishText, character: loser },
                nativeAnswer: { text: data.nativeText, character: data.winner },
                explanation: data.explanation,
                winner: data.winner,
              };
            });

            // Create script
            const script = createSurvivalScript(rounds);

            // Schema validation should pass
            const result = survivalScriptSchema.safeParse(script);
            expect(result.success).toBe(true);

            // All explanations should be <= 30 characters
            if (result.success) {
              for (const round of result.data.rounds) {
                expect(round.explanation.length).toBeLessThanOrEqual(30);
              }
            }

            return result.success;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.14: truncateExplanation handles special characters
     * **Validates: Requirements 10.2**
     */
    it('truncateExplanation handles special characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
          // Input may contain any characters including special ones
          const result = truncateExplanation(input);

          // Result should always be <= 30
          expect(result.length).toBeLessThanOrEqual(30);

          // If input was <= 30, result should equal input
          if (input.length <= 30) {
            expect(result).toBe(input);
          } else {
            // If truncated, should end with "..."
            expect(result.endsWith('...')).toBe(true);
          }

          return result.length <= 30;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17.15: Recommended length (20 chars) is always valid
     * **Validates: Requirements 10.2**
     */
    it('recommended length (20 chars) is always valid', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
          const explanation = 'a'.repeat(20);
          const loser: SurvivalCharacter = 'dog';
          const winner: SurvivalCharacter = 'cat';

          const round: SurvivalRound = {
            id: 1,
            category: 'daily',
            situation: '화장실 어디에요?',
            situationEnglish: 'Where is the bathroom?',
            konglishAnswer: { text: 'Where is toilet?', character: loser },
            nativeAnswer: { text: 'Where is the restroom?', character: winner },
            explanation,
            winner,
          };

          // Create a valid script with this round
          const rounds = Array.from({ length: 50 }, (_, i) => ({
            ...round,
            id: i + 1,
          }));
          const script = createSurvivalScript(rounds);

          const result = survivalScriptSchema.safeParse(script);
          expect(result.success).toBe(true);

          // truncateExplanation should not modify 20-char string
          const truncated = truncateExplanation(explanation);
          expect(truncated).toBe(explanation);
          expect(truncated.length).toBe(20);

          return result.success && truncated === explanation;
        }),
        { numRuns: 100 }
      );
    });
  });
});
