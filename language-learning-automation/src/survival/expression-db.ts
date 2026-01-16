/**
 * Survival Expression Database
 * Extends the comparison expression-db for survival quiz use cases
 *
 * Requirements:
 * - 12.1: Expression storage and retrieval
 * - 12.2: Expression recency exclusion (last 10 videos)
 * - 12.4: Blacklist support
 * - 12.5: Expression uniqueness in batch
 */

// Re-export the core ExpressionDatabase class and types
export {
  ExpressionDatabase,
  createExpressionDatabase,
  expressionRecordSchema,
  expressionDatabaseSchema,
  type ExpressionRecord,
  type ExpressionDatabaseData,
  type AddExpressionInput,
} from '../comparison/expression-db';

import {
  ExpressionDatabase,
  createExpressionDatabase,
  type AddExpressionInput,
} from '../comparison/expression-db';
import type { SurvivalScript, SurvivalRound } from './types';
import type { ComparisonCategory, Difficulty } from '../comparison/types';

/**
 * Default difficulty for survival expressions
 * Survival quiz uses B1 (intermediate) as default since it targets general audience
 */
export const DEFAULT_SURVIVAL_DIFFICULTY: Difficulty = 'B1';

/**
 * Default number of recent videos to exclude expressions from
 * Requirement 12.2: Avoid expressions used in last 10 videos
 */
export const DEFAULT_RECENCY_EXCLUSION_COUNT = 10;

/**
 * Expression data extracted from a survival round
 */
export interface SurvivalExpressionData {
  konglishExpression: string;
  nativeExpression: string;
  category: ComparisonCategory;
}

/**
 * Result of checking expressions for exclusion
 */
export interface ExclusionCheckResult {
  expression: string;
  isExcluded: boolean;
  reason?: 'recent' | 'blacklisted';
}

/**
 * Get all expressions that should be excluded when generating new content
 * Combines recent expressions (last 10 videos) and blacklisted expressions
 *
 * @param db - ExpressionDatabase instance
 * @param recentVideoCount - Number of recent videos to check (default: 10)
 * @returns Array of expression strings to exclude
 *
 * Validates: Requirements 12.2, 12.4
 */
export async function getExcludedExpressions(
  db: ExpressionDatabase,
  recentVideoCount: number = DEFAULT_RECENCY_EXCLUSION_COUNT
): Promise<string[]> {
  const [recentExpressions, blacklist] = await Promise.all([
    db.getRecentExpressions(recentVideoCount),
    db.getBlacklist(),
  ]);

  // Combine and deduplicate
  const allExcluded = new Set<string>();

  for (const expr of recentExpressions) {
    allExcluded.add(expr.toLowerCase().trim());
  }

  for (const expr of blacklist) {
    allExcluded.add(expr.toLowerCase().trim());
  }

  return Array.from(allExcluded);
}

/**
 * Check if a single expression should be excluded
 *
 * @param db - ExpressionDatabase instance
 * @param expression - Expression to check
 * @param recentVideoCount - Number of recent videos to check (default: 10)
 * @returns ExclusionCheckResult with exclusion status and reason
 *
 * Validates: Requirements 12.2, 12.4
 */
export async function checkExpressionExclusion(
  db: ExpressionDatabase,
  expression: string,
  recentVideoCount: number = DEFAULT_RECENCY_EXCLUSION_COUNT
): Promise<ExclusionCheckResult> {
  // Check blacklist first (higher priority)
  const isBlacklisted = await db.isBlacklisted(expression);
  if (isBlacklisted) {
    return {
      expression,
      isExcluded: true,
      reason: 'blacklisted',
    };
  }

  // Check recent usage
  const wasRecent = await db.wasUsedRecently(expression, recentVideoCount);
  if (wasRecent) {
    return {
      expression,
      isExcluded: true,
      reason: 'recent',
    };
  }

  return {
    expression,
    isExcluded: false,
  };
}

/**
 * Check multiple expressions for exclusion in batch
 *
 * @param db - ExpressionDatabase instance
 * @param expressions - Array of expressions to check
 * @param recentVideoCount - Number of recent videos to check (default: 10)
 * @returns Array of ExclusionCheckResult for each expression
 *
 * Validates: Requirements 12.2, 12.4
 */
export async function checkExpressionsExclusion(
  db: ExpressionDatabase,
  expressions: string[],
  recentVideoCount: number = DEFAULT_RECENCY_EXCLUSION_COUNT
): Promise<ExclusionCheckResult[]> {
  // Get excluded expressions once for efficiency
  const excludedSet = new Set(await getExcludedExpressions(db, recentVideoCount));
  const blacklist = await db.getBlacklist();
  const blacklistSet = new Set(blacklist.map((b) => b.toLowerCase().trim()));

  return expressions.map((expression) => {
    const normalized = expression.toLowerCase().trim();

    if (blacklistSet.has(normalized)) {
      return {
        expression,
        isExcluded: true,
        reason: 'blacklisted' as const,
      };
    }

    if (excludedSet.has(normalized)) {
      return {
        expression,
        isExcluded: true,
        reason: 'recent' as const,
      };
    }

    return {
      expression,
      isExcluded: false,
    };
  });
}

/**
 * Extract expression data from a survival round
 *
 * @param round - SurvivalRound to extract expressions from
 * @returns SurvivalExpressionData with both expressions and category
 */
export function extractExpressionsFromRound(round: SurvivalRound): SurvivalExpressionData {
  return {
    konglishExpression: round.konglishAnswer.text,
    nativeExpression: round.nativeAnswer.text,
    category: round.category,
  };
}

/**
 * Record all expressions from a survival script to the database
 * Records both konglish and native expressions from all rounds
 *
 * @param db - ExpressionDatabase instance
 * @param script - SurvivalScript containing rounds with expressions
 * @param difficulty - Difficulty level for the expressions (default: B1)
 *
 * Validates: Requirements 12.1
 */
export async function recordSurvivalExpressions(
  db: ExpressionDatabase,
  script: SurvivalScript,
  difficulty: Difficulty = DEFAULT_SURVIVAL_DIFFICULTY
): Promise<void> {
  const videoId = `survival-${script.channelId}-${script.date}`;
  const inputs: AddExpressionInput[] = [];

  for (const round of script.rounds) {
    const expressionData = extractExpressionsFromRound(round);

    // Add konglish expression
    inputs.push({
      expression: expressionData.konglishExpression,
      category: expressionData.category,
      difficulty,
    });

    // Add native expression
    inputs.push({
      expression: expressionData.nativeExpression,
      category: expressionData.category,
      difficulty,
    });
  }

  await db.addExpressions(inputs, videoId);
}

/**
 * Check if all expressions in a batch are unique (no duplicates within the batch)
 *
 * @param expressions - Array of expressions to check
 * @returns Object with isUnique flag and any duplicate expressions found
 *
 * Validates: Requirements 12.5
 */
export function checkBatchUniqueness(expressions: string[]): {
  isUnique: boolean;
  duplicates: string[];
} {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const expr of expressions) {
    const normalized = expr.toLowerCase().trim();
    if (seen.has(normalized)) {
      duplicates.push(expr);
    } else {
      seen.add(normalized);
    }
  }

  return {
    isUnique: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Check if all expressions in a survival script are unique
 * Checks both konglish and native expressions separately
 *
 * @param script - SurvivalScript to check
 * @returns Object with uniqueness status for both expression types
 *
 * Validates: Requirements 12.5
 */
export function checkScriptExpressionUniqueness(script: SurvivalScript): {
  konglishUnique: boolean;
  nativeUnique: boolean;
  konglishDuplicates: string[];
  nativeDuplicates: string[];
} {
  const konglishExpressions = script.rounds.map((r) => r.konglishAnswer.text);
  const nativeExpressions = script.rounds.map((r) => r.nativeAnswer.text);

  const konglishResult = checkBatchUniqueness(konglishExpressions);
  const nativeResult = checkBatchUniqueness(nativeExpressions);

  return {
    konglishUnique: konglishResult.isUnique,
    nativeUnique: nativeResult.isUnique,
    konglishDuplicates: konglishResult.duplicates,
    nativeDuplicates: nativeResult.duplicates,
  };
}

/**
 * Filter out excluded expressions from a list
 * Useful for filtering generated expressions before use
 *
 * @param db - ExpressionDatabase instance
 * @param expressions - Array of expressions to filter
 * @param recentVideoCount - Number of recent videos to check (default: 10)
 * @returns Array of expressions that are not excluded
 *
 * Validates: Requirements 12.2, 12.4
 */
export async function filterExcludedExpressions(
  db: ExpressionDatabase,
  expressions: string[],
  recentVideoCount: number = DEFAULT_RECENCY_EXCLUSION_COUNT
): Promise<string[]> {
  const excludedSet = new Set(await getExcludedExpressions(db, recentVideoCount));

  return expressions.filter((expr) => !excludedSet.has(expr.toLowerCase().trim()));
}

/**
 * Create a survival-specific expression database instance
 * Convenience wrapper around createExpressionDatabase
 *
 * @param channelId - Channel ID for the database
 * @param outputDir - Output directory (default: 'output')
 * @returns ExpressionDatabase instance
 */
export function createSurvivalExpressionDatabase(
  channelId: string,
  outputDir: string = 'output'
): ExpressionDatabase {
  return createExpressionDatabase(outputDir, channelId);
}
