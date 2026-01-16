import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import {
  checkBatchUniqueness,
  checkScriptExpressionUniqueness,
  getExcludedExpressions,
  checkExpressionExclusion,
  checkExpressionsExclusion,
  filterExcludedExpressions,
  DEFAULT_RECENCY_EXCLUSION_COUNT,
  createSurvivalExpressionDatabase,
  ExpressionDatabase,
} from './expression-db';
import type { SurvivalScript, SurvivalRound, SurvivalCharacter } from './types';

/**
 * Feature: survival-quiz-longform, Property 18: Expression Uniqueness in Batch
 * Validates: Requirements 12.5
 *
 * For any generated SurvivalScript, all konglishAnswer.text values SHALL be unique
 * within the script, and all nativeAnswer.text values SHALL be unique within the script.
 */

// Helper to create a valid SurvivalRound
function createRound(
  id: number,
  konglishText: string,
  nativeText: string,
  category: 'daily' | 'business' | 'emotion' | 'request_reject' | 'apology_thanks' = 'daily',
  winner: SurvivalCharacter = 'cat'
): SurvivalRound {
  const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';
  return {
    id,
    category,
    situation: `상황 ${id}`,
    situationEnglish: `Situation ${id}`,
    konglishAnswer: { text: konglishText, character: loser },
    nativeAnswer: { text: nativeText, character: winner },
    explanation: `설명 ${id}`,
    winner,
  };
}

// Helper to create a valid SurvivalScript with given rounds
function createSurvivalScript(rounds: SurvivalRound[]): SurvivalScript {
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

// Arbitrary for generating unique non-empty strings
const uniqueStringArb = (minLength: number = 1, maxLength: number = 100): fc.Arbitrary<string> =>
  fc.string({ minLength, maxLength }).filter((s) => s.trim().length > 0);

describe('Property Tests: Expression Uniqueness in Batch', () => {
  /**
   * Feature: survival-quiz-longform, Property 18: Expression Uniqueness in Batch
   * For any generated SurvivalScript, all konglishAnswer.text values SHALL be unique
   * within the script, and all nativeAnswer.text values SHALL be unique within the script.
   * **Validates: Requirements 12.5**
   */
  describe('Property 18: Expression Uniqueness in Batch', () => {
    it('checkBatchUniqueness returns isUnique=true for arrays with all unique expressions', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (count) => {
          const expressions = Array.from({ length: count }, (_, i) => `expression_${i}`);
          const result = checkBatchUniqueness(expressions);
          expect(result.isUnique).toBe(true);
          expect(result.duplicates).toHaveLength(0);
          return result.isUnique === true && result.duplicates.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('checkBatchUniqueness returns isUnique=false when duplicates exist', () => {
      fc.assert(
        fc.property(
          uniqueStringArb(1, 50),
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 0, max: 20 }),
          (duplicateExpr, duplicateCount, uniqueCount) => {
            const expressions: string[] = [];
            for (let i = 0; i < duplicateCount; i++) {
              expressions.push(duplicateExpr);
            }
            for (let i = 0; i < uniqueCount; i++) {
              expressions.push(`unique_${i}_${Date.now()}`);
            }
            const result = checkBatchUniqueness(expressions);
            expect(result.isUnique).toBe(false);
            expect(result.duplicates.length).toBe(duplicateCount - 1);
            return result.isUnique === false && result.duplicates.length === duplicateCount - 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('checkBatchUniqueness handles case-insensitive comparison', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /[a-zA-Z]/.test(s)),
          (baseExpr) => {
            const expressions = [baseExpr.toLowerCase(), baseExpr.toUpperCase(), baseExpr];
            const result = checkBatchUniqueness(expressions);
            expect(result.isUnique).toBe(false);
            expect(result.duplicates.length).toBeGreaterThan(0);
            return result.isUnique === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('checkBatchUniqueness handles whitespace trimming', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          (baseExpr) => {
            const expressions = [
              baseExpr.trim(),
              `  ${baseExpr.trim()}  `,
              `\t${baseExpr.trim()}\n`,
            ];
            const result = checkBatchUniqueness(expressions);
            expect(result.isUnique).toBe(false);
            expect(result.duplicates.length).toBeGreaterThan(0);
            return result.isUnique === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('checkBatchUniqueness returns isUnique=true for empty array', () => {
      const result = checkBatchUniqueness([]);
      expect(result.isUnique).toBe(true);
      expect(result.duplicates).toHaveLength(0);
    });

    it('checkBatchUniqueness returns isUnique=true for single element array', () => {
      fc.assert(
        fc.property(uniqueStringArb(), (expr) => {
          const result = checkBatchUniqueness([expr]);
          expect(result.isUnique).toBe(true);
          expect(result.duplicates).toHaveLength(0);
          return result.isUnique === true && result.duplicates.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('checkBatchUniqueness correctly counts all duplicates', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 20 }), (totalDuplicates) => {
          const expressions = Array.from({ length: totalDuplicates }, () => 'same_expression');
          const result = checkBatchUniqueness(expressions);
          expect(result.isUnique).toBe(false);
          expect(result.duplicates.length).toBe(totalDuplicates - 1);
          return result.duplicates.length === totalDuplicates - 1;
        }),
        { numRuns: 100 }
      );
    });

    it('checkScriptExpressionUniqueness returns all unique for script with unique expressions', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 50 }), (roundCount) => {
          const rounds: SurvivalRound[] = Array.from({ length: roundCount }, (_, i) =>
            createRound(i + 1, `konglish_${i}`, `native_${i}`)
          );
          while (rounds.length < 50) {
            const i = rounds.length;
            rounds.push(createRound(i + 1, `konglish_${i}`, `native_${i}`));
          }
          const script = createSurvivalScript(rounds);
          const result = checkScriptExpressionUniqueness(script);
          expect(result.konglishUnique).toBe(true);
          expect(result.nativeUnique).toBe(true);
          expect(result.konglishDuplicates).toHaveLength(0);
          expect(result.nativeDuplicates).toHaveLength(0);
          return result.konglishUnique && result.nativeUnique;
        }),
        { numRuns: 100 }
      );
    });

    it('checkScriptExpressionUniqueness detects konglish duplicates', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 10 }), (duplicateCount) => {
          const rounds: SurvivalRound[] = [];
          for (let i = 0; i < duplicateCount; i++) {
            rounds.push(createRound(i + 1, 'duplicate_konglish', `native_${i}`));
          }
          for (let i = duplicateCount; i < 50; i++) {
            rounds.push(createRound(i + 1, `konglish_${i}`, `native_${i}`));
          }
          const script = createSurvivalScript(rounds);
          const result = checkScriptExpressionUniqueness(script);
          expect(result.konglishUnique).toBe(false);
          expect(result.nativeUnique).toBe(true);
          expect(result.konglishDuplicates.length).toBe(duplicateCount - 1);
          return result.konglishUnique === false && result.nativeUnique === true;
        }),
        { numRuns: 100 }
      );
    });

    it('checkScriptExpressionUniqueness detects native duplicates', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 10 }), (duplicateCount) => {
          const rounds: SurvivalRound[] = [];
          for (let i = 0; i < duplicateCount; i++) {
            rounds.push(createRound(i + 1, `konglish_${i}`, 'duplicate_native'));
          }
          for (let i = duplicateCount; i < 50; i++) {
            rounds.push(createRound(i + 1, `konglish_${i}`, `native_${i}`));
          }
          const script = createSurvivalScript(rounds);
          const result = checkScriptExpressionUniqueness(script);
          expect(result.konglishUnique).toBe(true);
          expect(result.nativeUnique).toBe(false);
          expect(result.nativeDuplicates.length).toBe(duplicateCount - 1);
          return result.konglishUnique === true && result.nativeUnique === false;
        }),
        { numRuns: 100 }
      );
    });

    it('checkScriptExpressionUniqueness handles case-insensitive duplicates in script', () => {
      const rounds: SurvivalRound[] = [];
      rounds.push(createRound(1, 'Hello World', 'native_1'));
      rounds.push(createRound(2, 'hello world', 'native_2'));
      rounds.push(createRound(3, 'HELLO WORLD', 'native_3'));
      for (let i = 3; i < 50; i++) {
        rounds.push(createRound(i + 1, `konglish_${i}`, `native_${i}`));
      }
      const script = createSurvivalScript(rounds);
      const result = checkScriptExpressionUniqueness(script);
      expect(result.konglishUnique).toBe(false);
      expect(result.konglishDuplicates.length).toBe(2);
    });

    it('checkBatchUniqueness preserves original expression format in duplicates', () => {
      const expressions = ['Hello', 'HELLO', '  hello  '];
      const result = checkBatchUniqueness(expressions);
      expect(result.isUnique).toBe(false);
      expect(result.duplicates).toContain('HELLO');
      expect(result.duplicates).toContain('  hello  ');
    });
  });
});

/**
 * Feature: survival-quiz-longform, Property 19: Expression Recency Exclusion
 * Validates: Requirements 12.2
 *
 * For any newly generated expression, it SHALL NOT appear in expressions used
 * in the last 10 videos (when database is available).
 */

describe('Property Tests: Expression Recency Exclusion', () => {
  const TEST_OUTPUT_DIR = 'test-output-property19';
  const TEST_CHANNEL_ID = 'test-channel-property19';
  let db: ExpressionDatabase;
  let testCounter = 0;

  // Helper to create a fresh database for each property test iteration
  function createFreshDatabase(): ExpressionDatabase {
    testCounter++;
    return createSurvivalExpressionDatabase(
      `${TEST_CHANNEL_ID}-${testCounter}-${Date.now()}`,
      TEST_OUTPUT_DIR
    );
  }

  // Helper to create test database with expressions from multiple videos
  async function setupDatabaseWithVideos(
    database: ExpressionDatabase,
    videoExpressions: Array<{ videoId: string; expressions: string[] }>
  ): Promise<void> {
    await database.load();
    for (const video of videoExpressions) {
      for (const expr of video.expressions) {
        await database.addExpression(
          { expression: expr, category: 'daily', difficulty: 'B1' },
          video.videoId
        );
      }
    }
  }

  // Helper to clean up test directory
  async function cleanupTestDir(): Promise<void> {
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  }

  beforeEach(async () => {
    await cleanupTestDir();
    db = createSurvivalExpressionDatabase(TEST_CHANNEL_ID, TEST_OUTPUT_DIR);
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  /**
   * Feature: survival-quiz-longform, Property 19: Expression Recency Exclusion
   * For any newly generated expression, it SHALL NOT appear in expressions used
   * in the last 10 videos (when database is available).
   * **Validates: Requirements 12.2**
   */
  describe('Property 19: Expression Recency Exclusion', () => {
    /**
     * Property 19.1: DEFAULT_RECENCY_EXCLUSION_COUNT is exactly 10
     * **Validates: Requirements 12.2**
     */
    it('DEFAULT_RECENCY_EXCLUSION_COUNT is exactly 10', () => {
      expect(DEFAULT_RECENCY_EXCLUSION_COUNT).toBe(10);
    });

    /**
     * Property 19.2: Expressions from recent videos (within last 10) are excluded
     * **Validates: Requirements 12.2**
     */
    it('expressions from recent videos (within last 10) are excluded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
          async (videoCount, expressions) => {
            // Create fresh database for this iteration
            const testDb = createFreshDatabase();

            const videoExpressions = Array.from({ length: videoCount }, (_, i) => ({
              videoId: `video-${i}`,
              expressions: expressions.map((e) => `${e}_${i}`),
            }));

            await setupDatabaseWithVideos(testDb, videoExpressions);
            const excluded = await getExcludedExpressions(testDb, DEFAULT_RECENCY_EXCLUSION_COUNT);

            for (const video of videoExpressions) {
              for (const expr of video.expressions) {
                const normalizedExpr = expr.toLowerCase().trim();
                const isExcluded = excluded.some((e) => e.toLowerCase().trim() === normalizedExpr);
                expect(isExcluded).toBe(true);
              }
            }
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.3: checkExpressionExclusion correctly identifies recent expressions
     * **Validates: Requirements 12.2**
     */
    it('checkExpressionExclusion correctly identifies recent expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addExpression(
              { expression, category: 'daily', difficulty: 'B1' },
              'recent-video'
            );

            const result = await checkExpressionExclusion(
              testDb,
              expression,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(result.isExcluded).toBe(true);
            expect(result.reason).toBe('recent');
            expect(result.expression).toBe(expression);
            return result.isExcluded === true && result.reason === 'recent';
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.4: checkExpressionExclusion returns isExcluded=false for new expressions
     * **Validates: Requirements 12.2**
     */
    it('checkExpressionExclusion returns isExcluded=false for new expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            const result = await checkExpressionExclusion(
              testDb,
              expression,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(result.isExcluded).toBe(false);
            expect(result.reason).toBeUndefined();
            expect(result.expression).toBe(expression);
            return result.isExcluded === false && result.reason === undefined;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.5: filterExcludedExpressions removes recent expressions
     * **Validates: Requirements 12.2**
     */
    it('filterExcludedExpressions removes recent expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 2, maxLength: 10 }
          ),
          async (expressions) => {
            const testDb = createFreshDatabase();
            const uniqueExprs = [...new Set(expressions.map((e) => e.toLowerCase().trim()))];
            if (uniqueExprs.length < 2) return true;

            const recentExprs = uniqueExprs.slice(0, Math.floor(uniqueExprs.length / 2));
            const newExprs = uniqueExprs.slice(Math.floor(uniqueExprs.length / 2));

            await testDb.load();
            for (const expr of recentExprs) {
              await testDb.addExpression(
                { expression: expr, category: 'daily', difficulty: 'B1' },
                'recent-video'
              );
            }

            const filtered = await filterExcludedExpressions(
              testDb,
              uniqueExprs,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            // Recent expressions should be filtered out
            for (const expr of recentExprs) {
              const isInFiltered = filtered.some(
                (f) => f.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isInFiltered).toBe(false);
            }

            // New expressions should remain
            for (const expr of newExprs) {
              const isInFiltered = filtered.some(
                (f) => f.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isInFiltered).toBe(true);
            }
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.6: filterExcludedExpressions returns all expressions when database is empty
     * **Validates: Requirements 12.2**
     */
    it('filterExcludedExpressions returns all expressions when database is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 20 }
          ),
          async (expressions) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            const filtered = await filterExcludedExpressions(
              testDb,
              expressions,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(filtered.length).toBe(expressions.length);
            return filtered.length === expressions.length;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.7: Recency exclusion is case-insensitive
     * **Validates: Requirements 12.2**
     */
    it('recency exclusion is case-insensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /[a-zA-Z]/.test(s)),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addExpression(
              { expression: expression.toLowerCase(), category: 'daily', difficulty: 'B1' },
              'recent-video'
            );

            const result = await checkExpressionExclusion(
              testDb,
              expression.toUpperCase(),
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(result.isExcluded).toBe(true);
            expect(result.reason).toBe('recent');
            return result.isExcluded === true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.8: Recency exclusion handles whitespace trimming
     * **Validates: Requirements 12.2**
     */
    it('recency exclusion handles whitespace trimming', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addExpression(
              { expression: expression.trim(), category: 'daily', difficulty: 'B1' },
              'recent-video'
            );

            const result = await checkExpressionExclusion(
              testDb,
              `  ${expression.trim()}  `,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(result.isExcluded).toBe(true);
            expect(result.reason).toBe('recent');
            return result.isExcluded === true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.9: getExcludedExpressions returns empty array for empty database
     * **Validates: Requirements 12.2**
     */
    it('getExcludedExpressions returns empty array for empty database', async () => {
      const testDb = createFreshDatabase();
      await testDb.load();
      const excluded = await getExcludedExpressions(testDb, DEFAULT_RECENCY_EXCLUSION_COUNT);
      expect(excluded).toEqual([]);
    });

    /**
     * Property 19.10: getExcludedExpressions respects custom recency count
     * **Validates: Requirements 12.2**
     */
    it('getExcludedExpressions respects custom recency count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 10 }),
          async (totalVideos, recencyCount) => {
            const testDb = createFreshDatabase();
            const videoExpressions = Array.from({ length: totalVideos }, (_, i) => ({
              videoId: `video-${i}`,
              expressions: [`expr_${i}`],
            }));

            await setupDatabaseWithVideos(testDb, videoExpressions);
            const excluded = await getExcludedExpressions(testDb, recencyCount);

            // Number of excluded expressions should match min(totalVideos, recencyCount)
            const expectedCount = Math.min(totalVideos, recencyCount);
            expect(excluded.length).toBe(expectedCount);
            return excluded.length === expectedCount;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.11: Expressions from exactly 10 videos ago are excluded (boundary test)
     * **Validates: Requirements 12.2**
     */
    it('expressions from exactly 10 videos ago are excluded (boundary test)', async () => {
      const testDb = createFreshDatabase();
      const videoExpressions = Array.from({ length: 10 }, (_, i) => ({
        videoId: `video-${i}`,
        expressions: [`expr_${i}`],
      }));

      await setupDatabaseWithVideos(testDb, videoExpressions);
      const excluded = await getExcludedExpressions(testDb, 10);

      expect(excluded.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        const isExcluded = excluded.some((e) => e.toLowerCase().trim() === `expr_${i}`);
        expect(isExcluded).toBe(true);
      }
    });

    /**
     * Property 19.12: Multiple expressions per video are all excluded
     * **Validates: Requirements 12.2**
     */
    it('multiple expressions per video are all excluded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 10 }), async (expressionCount) => {
          const testDb = createFreshDatabase();
          const expressions = Array.from({ length: expressionCount }, (_, i) => `multi_expr_${i}`);

          await setupDatabaseWithVideos(testDb, [{ videoId: 'multi-expr-video', expressions }]);

          const excluded = await getExcludedExpressions(testDb, DEFAULT_RECENCY_EXCLUSION_COUNT);

          expect(excluded.length).toBe(expressionCount);
          for (const expr of expressions) {
            const isExcluded = excluded.some(
              (e) => e.toLowerCase().trim() === expr.toLowerCase().trim()
            );
            expect(isExcluded).toBe(true);
          }
          return true;
        }),
        { numRuns: 50 }
      );
    });

    /**
     * Property 19.13: filterExcludedExpressions preserves order of non-excluded expressions
     * **Validates: Requirements 12.2**
     */
    it('filterExcludedExpressions preserves order of non-excluded expressions', async () => {
      const testDb = createFreshDatabase();
      await testDb.load();
      await testDb.addExpression(
        { expression: 'excluded_1', category: 'daily', difficulty: 'B1' },
        'video-1'
      );
      await testDb.addExpression(
        { expression: 'excluded_2', category: 'daily', difficulty: 'B1' },
        'video-1'
      );

      const input = ['new_1', 'excluded_1', 'new_2', 'excluded_2', 'new_3'];
      const filtered = await filterExcludedExpressions(
        testDb,
        input,
        DEFAULT_RECENCY_EXCLUSION_COUNT
      );

      expect(filtered).toEqual(['new_1', 'new_2', 'new_3']);
    });

    /**
     * Property 19.14: getExcludedExpressions returns unique expressions (no duplicates)
     * **Validates: Requirements 12.2**
     */
    it('getExcludedExpressions returns unique expressions (no duplicates)', async () => {
      const testDb = createFreshDatabase();
      await testDb.load();
      await testDb.addExpression(
        { expression: 'duplicate_expr', category: 'daily', difficulty: 'B1' },
        'video-1'
      );
      await testDb.addExpression(
        { expression: 'duplicate_expr', category: 'daily', difficulty: 'B1' },
        'video-2'
      );
      await testDb.addExpression(
        { expression: 'duplicate_expr', category: 'daily', difficulty: 'B1' },
        'video-3'
      );

      const excluded = await getExcludedExpressions(testDb, DEFAULT_RECENCY_EXCLUSION_COUNT);
      const duplicateCount = excluded.filter(
        (e) => e.toLowerCase().trim() === 'duplicate_expr'
      ).length;
      expect(duplicateCount).toBe(1);
    });

    /**
     * Property 19.15: Recency count of 0 returns no excluded expressions
     * **Validates: Requirements 12.2**
     */
    it('recency count of 0 returns no excluded expressions from recency', async () => {
      const testDb = createFreshDatabase();
      await setupDatabaseWithVideos(testDb, [
        { videoId: 'video-1', expressions: ['expr_1', 'expr_2'] },
      ]);

      const excluded = await getExcludedExpressions(testDb, 0);
      expect(excluded.length).toBe(0);
    });

    /**
     * Property 19.16: checkExpressionExclusion prioritizes blacklist over recency
     * **Validates: Requirements 12.2**
     */
    it('checkExpressionExclusion prioritizes blacklist over recency', async () => {
      const testDb = createFreshDatabase();
      await testDb.load();

      const expression = 'both_blacklisted_and_recent';
      await testDb.addToBlacklist(expression);
      await testDb.addExpression(
        { expression, category: 'daily', difficulty: 'B1' },
        'recent-video'
      );

      const result = await checkExpressionExclusion(
        testDb,
        expression,
        DEFAULT_RECENCY_EXCLUSION_COUNT
      );

      expect(result.isExcluded).toBe(true);
      expect(result.reason).toBe('blacklisted');
    });
  });
});

/**
 * Feature: survival-quiz-longform, Property 20: Expression Blacklist Exclusion
 * Validates: Requirements 12.4
 *
 * For any generated expression, it SHALL NOT match any expression in the blacklist.
 */

describe('Property Tests: Expression Blacklist Exclusion', () => {
  const TEST_OUTPUT_DIR = 'test-output-property20';
  const TEST_CHANNEL_ID = 'test-channel-property20';
  let testCounter = 0;

  // Helper to create a fresh database for each property test iteration
  function createFreshDatabase(): ExpressionDatabase {
    testCounter++;
    return createSurvivalExpressionDatabase(
      `${TEST_CHANNEL_ID}-${testCounter}-${Date.now()}`,
      TEST_OUTPUT_DIR
    );
  }

  // Helper to clean up test directory
  async function cleanupTestDir(): Promise<void> {
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  }

  beforeEach(async () => {
    await cleanupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  /**
   * Feature: survival-quiz-longform, Property 20: Expression Blacklist Exclusion
   * For any generated expression, it SHALL NOT match any expression in the blacklist.
   * **Validates: Requirements 12.4**
   */
  describe('Property 20: Expression Blacklist Exclusion', () => {
    /**
     * Property 20.1: Blacklisted expressions are correctly identified as excluded
     * **Validates: Requirements 12.4**
     */
    it('blacklisted expressions are correctly identified as excluded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addToBlacklist(expression);

            const result = await checkExpressionExclusion(
              testDb,
              expression,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(result.isExcluded).toBe(true);
            expect(result.reason).toBe('blacklisted');
            expect(result.expression).toBe(expression);
            return result.isExcluded === true && result.reason === 'blacklisted';
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.2: Non-blacklisted expressions are not excluded (unless recent)
     * **Validates: Requirements 12.4**
     */
    it('non-blacklisted expressions are not excluded when not recent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            // Don't add to blacklist, don't add as recent

            const result = await checkExpressionExclusion(
              testDb,
              expression,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(result.isExcluded).toBe(false);
            expect(result.reason).toBeUndefined();
            return result.isExcluded === false && result.reason === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.3: Case-insensitive blacklist matching
     * **Validates: Requirements 12.4**
     */
    it('blacklist matching is case-insensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /[a-zA-Z]/.test(s)),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addToBlacklist(expression.toLowerCase());

            // Check with uppercase version
            const resultUpper = await checkExpressionExclusion(
              testDb,
              expression.toUpperCase(),
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(resultUpper.isExcluded).toBe(true);
            expect(resultUpper.reason).toBe('blacklisted');

            // Check with mixed case
            const mixedCase =
              expression
                .split('')
                .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                .join('') || expression;
            const resultMixed = await checkExpressionExclusion(
              testDb,
              mixedCase,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(resultMixed.isExcluded).toBe(true);
            expect(resultMixed.reason).toBe('blacklisted');
            return resultUpper.isExcluded === true && resultMixed.isExcluded === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.4: Whitespace trimming in blacklist matching
     * **Validates: Requirements 12.4**
     */
    it('blacklist matching handles whitespace trimming', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addToBlacklist(expression.trim());

            // Check with leading/trailing whitespace
            const resultWithSpaces = await checkExpressionExclusion(
              testDb,
              `  ${expression.trim()}  `,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(resultWithSpaces.isExcluded).toBe(true);
            expect(resultWithSpaces.reason).toBe('blacklisted');

            // Check with tabs and newlines
            const resultWithTabs = await checkExpressionExclusion(
              testDb,
              `\t${expression.trim()}\n`,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(resultWithTabs.isExcluded).toBe(true);
            expect(resultWithTabs.reason).toBe('blacklisted');
            return resultWithSpaces.isExcluded === true && resultWithTabs.isExcluded === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.5: getExcludedExpressions includes blacklisted expressions
     * **Validates: Requirements 12.4**
     */
    it('getExcludedExpressions includes blacklisted expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 10 }
          ),
          async (blacklistExpressions) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            // Add unique expressions to blacklist
            const uniqueExprs = [...new Set(blacklistExpressions.map((e) => e.trim()))];
            for (const expr of uniqueExprs) {
              await testDb.addToBlacklist(expr);
            }

            const excluded = await getExcludedExpressions(testDb, DEFAULT_RECENCY_EXCLUSION_COUNT);

            // All blacklisted expressions should be in excluded list
            for (const expr of uniqueExprs) {
              const normalizedExpr = expr.toLowerCase().trim();
              const isExcluded = excluded.some((e) => e.toLowerCase().trim() === normalizedExpr);
              expect(isExcluded).toBe(true);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.6: isBlacklisted returns true for blacklisted expressions
     * **Validates: Requirements 12.4**
     */
    it('isBlacklisted returns true for blacklisted expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addToBlacklist(expression);

            const isBlacklisted = await testDb.isBlacklisted(expression);
            expect(isBlacklisted).toBe(true);
            return isBlacklisted === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.7: isBlacklisted returns false for non-blacklisted expressions
     * **Validates: Requirements 12.4**
     */
    it('isBlacklisted returns false for non-blacklisted expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            // Don't add to blacklist

            const isBlacklisted = await testDb.isBlacklisted(expression);
            expect(isBlacklisted).toBe(false);
            return isBlacklisted === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.8: getBlacklist returns all blacklisted expressions
     * **Validates: Requirements 12.4**
     */
    it('getBlacklist returns all blacklisted expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 20 }
          ),
          async (expressions) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            // Add unique expressions to blacklist
            const uniqueExprs = [...new Set(expressions.map((e) => e.trim()))];
            for (const expr of uniqueExprs) {
              await testDb.addToBlacklist(expr);
            }

            const blacklist = await testDb.getBlacklist();

            expect(blacklist.length).toBe(uniqueExprs.length);
            for (const expr of uniqueExprs) {
              const isInBlacklist = blacklist.some(
                (b) => b.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isInBlacklist).toBe(true);
            }
            return blacklist.length === uniqueExprs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.9: addToBlacklist is idempotent (adding same expression twice doesn't duplicate)
     * **Validates: Requirements 12.4**
     */
    it('addToBlacklist is idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          fc.integer({ min: 2, max: 10 }),
          async (expression, addCount) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            // Add same expression multiple times
            for (let i = 0; i < addCount; i++) {
              await testDb.addToBlacklist(expression);
            }

            const blacklist = await testDb.getBlacklist();
            const occurrences = blacklist.filter(
              (b) => b.toLowerCase().trim() === expression.toLowerCase().trim()
            ).length;

            expect(occurrences).toBe(1);
            return occurrences === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.10: filterExcludedExpressions removes blacklisted expressions
     * **Validates: Requirements 12.4**
     */
    it('filterExcludedExpressions removes blacklisted expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 4, maxLength: 20 }
          ),
          async (expressions) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            const uniqueExprs = [...new Set(expressions.map((e) => e.toLowerCase().trim()))];
            if (uniqueExprs.length < 4) return true;

            // Blacklist half of the expressions
            const blacklistedExprs = uniqueExprs.slice(0, Math.floor(uniqueExprs.length / 2));
            const allowedExprs = uniqueExprs.slice(Math.floor(uniqueExprs.length / 2));

            for (const expr of blacklistedExprs) {
              await testDb.addToBlacklist(expr);
            }

            const filtered = await filterExcludedExpressions(
              testDb,
              uniqueExprs,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            // Blacklisted expressions should be filtered out
            for (const expr of blacklistedExprs) {
              const isInFiltered = filtered.some(
                (f) => f.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isInFiltered).toBe(false);
            }

            // Allowed expressions should remain
            for (const expr of allowedExprs) {
              const isInFiltered = filtered.some(
                (f) => f.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isInFiltered).toBe(true);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.11: Blacklist exclusion takes priority over recency exclusion
     * **Validates: Requirements 12.4**
     */
    it('blacklist exclusion takes priority over recency exclusion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            // Add to both blacklist and as recent expression
            await testDb.addToBlacklist(expression);
            await testDb.addExpression(
              { expression, category: 'daily', difficulty: 'B1' },
              'recent-video'
            );

            const result = await checkExpressionExclusion(
              testDb,
              expression,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            // Should report as blacklisted, not recent
            expect(result.isExcluded).toBe(true);
            expect(result.reason).toBe('blacklisted');
            return result.reason === 'blacklisted';
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.12: Empty blacklist doesn't exclude any expressions
     * **Validates: Requirements 12.4**
     */
    it('empty blacklist does not exclude any expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 20 }
          ),
          async (expressions) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            // Don't add anything to blacklist

            const blacklist = await testDb.getBlacklist();
            expect(blacklist.length).toBe(0);

            // All expressions should pass through filter
            const filtered = await filterExcludedExpressions(
              testDb,
              expressions,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(filtered.length).toBe(expressions.length);
            return filtered.length === expressions.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.13: getExcludedExpressions combines blacklist and recent expressions
     * **Validates: Requirements 12.4**
     */
    it('getExcludedExpressions combines blacklist and recent expressions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          async (blacklistExprs, recentExprs) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            // Make expressions unique and non-overlapping
            const uniqueBlacklist = [...new Set(blacklistExprs.map((e) => `bl_${e.trim()}`))];
            const uniqueRecent = [...new Set(recentExprs.map((e) => `rc_${e.trim()}`))];

            for (const expr of uniqueBlacklist) {
              await testDb.addToBlacklist(expr);
            }

            for (const expr of uniqueRecent) {
              await testDb.addExpression(
                { expression: expr, category: 'daily', difficulty: 'B1' },
                'recent-video'
              );
            }

            const excluded = await getExcludedExpressions(testDb, DEFAULT_RECENCY_EXCLUSION_COUNT);

            // Both blacklisted and recent expressions should be excluded
            for (const expr of uniqueBlacklist) {
              const isExcluded = excluded.some(
                (e) => e.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isExcluded).toBe(true);
            }

            for (const expr of uniqueRecent) {
              const isExcluded = excluded.some(
                (e) => e.toLowerCase().trim() === expr.toLowerCase().trim()
              );
              expect(isExcluded).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.14: checkExpressionsExclusion correctly identifies blacklisted expressions in batch
     * **Validates: Requirements 12.4**
     */
    it('checkExpressionsExclusion correctly identifies blacklisted expressions in batch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
            { minLength: 4, maxLength: 10 }
          ),
          async (expressions) => {
            const testDb = createFreshDatabase();
            await testDb.load();

            const uniqueExprs = [...new Set(expressions.map((e) => e.toLowerCase().trim()))];
            if (uniqueExprs.length < 4) return true;

            // Blacklist half
            const blacklistedExprs = uniqueExprs.slice(0, Math.floor(uniqueExprs.length / 2));
            for (const expr of blacklistedExprs) {
              await testDb.addToBlacklist(expr);
            }

            const results = await checkExpressionsExclusion(
              testDb,
              uniqueExprs,
              DEFAULT_RECENCY_EXCLUSION_COUNT
            );

            expect(results.length).toBe(uniqueExprs.length);

            for (let i = 0; i < uniqueExprs.length; i++) {
              const expr = uniqueExprs[i];
              const result = results[i];
              const isBlacklisted = blacklistedExprs.some(
                (b) => b.toLowerCase().trim() === expr.toLowerCase().trim()
              );

              if (isBlacklisted) {
                expect(result.isExcluded).toBe(true);
                expect(result.reason).toBe('blacklisted');
              } else {
                expect(result.isExcluded).toBe(false);
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.15: Blacklist persists across database reloads
     * **Validates: Requirements 12.4**
     */
    it('blacklist persists across database reloads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
          async (expressions) => {
            const channelId = `persist-test-${testCounter++}-${Date.now()}`;
            const testDb1 = createSurvivalExpressionDatabase(channelId, TEST_OUTPUT_DIR);
            await testDb1.load();

            const uniqueExprs = [...new Set(expressions.map((e) => e.trim()))];
            for (const expr of uniqueExprs) {
              await testDb1.addToBlacklist(expr);
            }

            // Create new database instance with same path
            const testDb2 = createSurvivalExpressionDatabase(channelId, TEST_OUTPUT_DIR);
            await testDb2.load();

            const blacklist = await testDb2.getBlacklist();
            expect(blacklist.length).toBe(uniqueExprs.length);

            for (const expr of uniqueExprs) {
              const isBlacklisted = await testDb2.isBlacklisted(expr);
              expect(isBlacklisted).toBe(true);
            }
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 20.16: getBlacklist returns empty array for fresh database
     * **Validates: Requirements 12.4**
     */
    it('getBlacklist returns empty array for fresh database', async () => {
      const testDb = createFreshDatabase();
      await testDb.load();

      const blacklist = await testDb.getBlacklist();
      expect(blacklist).toEqual([]);
      expect(blacklist.length).toBe(0);
    });

    /**
     * Property 20.17: isBlacklisted is case-insensitive
     * **Validates: Requirements 12.4**
     */
    it('isBlacklisted is case-insensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /[a-zA-Z]/.test(s)),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addToBlacklist(expression.toLowerCase());

            const isBlacklistedUpper = await testDb.isBlacklisted(expression.toUpperCase());
            const isBlacklistedLower = await testDb.isBlacklisted(expression.toLowerCase());
            const isBlacklistedOriginal = await testDb.isBlacklisted(expression);

            expect(isBlacklistedUpper).toBe(true);
            expect(isBlacklistedLower).toBe(true);
            expect(isBlacklistedOriginal).toBe(true);
            return isBlacklistedUpper && isBlacklistedLower && isBlacklistedOriginal;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 20.18: isBlacklisted handles whitespace trimming
     * **Validates: Requirements 12.4**
     */
    it('isBlacklisted handles whitespace trimming', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
          async (expression) => {
            const testDb = createFreshDatabase();
            await testDb.load();
            await testDb.addToBlacklist(expression.trim());

            const isBlacklistedWithSpaces = await testDb.isBlacklisted(`  ${expression.trim()}  `);
            const isBlacklistedWithTabs = await testDb.isBlacklisted(`\t${expression.trim()}\n`);

            expect(isBlacklistedWithSpaces).toBe(true);
            expect(isBlacklistedWithTabs).toBe(true);
            return isBlacklistedWithSpaces && isBlacklistedWithTabs;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
