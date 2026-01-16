/**
 * Survival Validator - 서바이벌 퀴즈용 영어 표현 검증 래퍼
 *
 * 기존 src/comparison/linguistic-validator.ts를 재사용하여
 * 서바이벌 퀴즈에 특화된 검증 기능을 제공합니다.
 *
 * Requirements: 13.1, 13.2, 13.4
 * - 13.1: Forbidden pattern detection
 * - 13.2: Expression validation (overly textbook-like expressions)
 * - 13.4: Confidence score presence
 */

// Re-export all types and classes from linguistic-validator
export {
  LinguisticValidator,
  createLinguisticValidator,
  validateExpression,
  isValidExpression,
  FORBIDDEN_PATTERNS,
  validationResultSchema,
  type ValidationResult,
  type ForbiddenPattern,
} from '../comparison/linguistic-validator';

import {
  LinguisticValidator,
  ValidationResult,
  createLinguisticValidator,
} from '../comparison/linguistic-validator';
import { SurvivalRound, SurvivalScript } from './types';

/**
 * Validation result for a single round
 */
export interface RoundValidationResult {
  roundId: number;
  konglishValidation: ValidationResult;
  nativeValidation: ValidationResult;
  isValid: boolean;
  hasWarnings: boolean;
}

/**
 * Summary of validation results for a script
 */
export interface ScriptValidationSummary {
  totalRounds: number;
  validRounds: number;
  invalidRounds: number;
  warningRounds: number;
  averageConfidenceScore: number;
  invalidRoundIds: number[];
  warningRoundIds: number[];
}

/**
 * Complete validation result for a script
 */
export interface ScriptValidationResult {
  isValid: boolean;
  summary: ScriptValidationSummary;
  roundResults: RoundValidationResult[];
}

/**
 * Validate a single survival round's expressions
 *
 * Validates both konglish and native expressions in the round.
 * Note: Konglish expressions are expected to potentially fail validation
 * (they are intentionally incorrect), but we still validate them for
 * patterns that might be too extreme or inappropriate.
 *
 * @param round - The survival round to validate
 * @param validator - Optional custom validator instance
 * @returns RoundValidationResult with validation details
 */
export function validateSurvivalRound(
  round: SurvivalRound,
  validator?: LinguisticValidator
): RoundValidationResult {
  const v = validator ?? createLinguisticValidator();

  const konglishValidation = v.validateExpression(round.konglishAnswer.text);
  const nativeValidation = v.validateExpression(round.nativeAnswer.text);

  // A round is valid if the native expression passes validation
  // (konglish is expected to potentially fail - it's intentionally wrong)
  const isValid = nativeValidation.status !== 'failed';
  const hasWarnings =
    nativeValidation.status === 'warning' || konglishValidation.status === 'warning';

  return {
    roundId: round.id,
    konglishValidation,
    nativeValidation,
    isValid,
    hasWarnings,
  };
}

/**
 * Validate all expressions in a survival script
 *
 * @param script - The complete survival script to validate
 * @param validator - Optional custom validator instance
 * @returns ScriptValidationResult with all round validations
 */
export function validateSurvivalScript(
  script: SurvivalScript,
  validator?: LinguisticValidator
): ScriptValidationResult {
  const v = validator ?? createLinguisticValidator();

  const roundResults = script.rounds.map((round) => validateSurvivalRound(round, v));

  const summary = getSurvivalValidationSummary(roundResults);

  return {
    isValid: summary.invalidRounds === 0,
    summary,
    roundResults,
  };
}

/**
 * Get a summary of validation results
 *
 * @param roundResults - Array of round validation results
 * @returns ScriptValidationSummary with aggregated statistics
 */
export function getSurvivalValidationSummary(
  roundResults: RoundValidationResult[]
): ScriptValidationSummary {
  const totalRounds = roundResults.length;
  const invalidRoundIds: number[] = [];
  const warningRoundIds: number[] = [];
  let totalConfidenceScore = 0;

  for (const result of roundResults) {
    // Sum confidence scores (using native expression's score as the primary metric)
    totalConfidenceScore += result.nativeValidation.confidenceScore;

    if (!result.isValid) {
      invalidRoundIds.push(result.roundId);
    } else if (result.hasWarnings) {
      warningRoundIds.push(result.roundId);
    }
  }

  const validRounds = totalRounds - invalidRoundIds.length;
  const averageConfidenceScore = totalRounds > 0 ? totalConfidenceScore / totalRounds : 0;

  return {
    totalRounds,
    validRounds,
    invalidRounds: invalidRoundIds.length,
    warningRounds: warningRoundIds.length,
    averageConfidenceScore,
    invalidRoundIds,
    warningRoundIds,
  };
}

/**
 * Quick check if a round's native expression is valid
 *
 * @param round - The survival round to check
 * @returns true if the native expression passes validation
 */
export function isRoundValid(round: SurvivalRound): boolean {
  const result = validateSurvivalRound(round);
  return result.isValid;
}

/**
 * Get confidence score for a round's native expression
 *
 * @param round - The survival round to check
 * @returns Confidence score between 0 and 1
 */
export function getRoundConfidenceScore(round: SurvivalRound): number {
  const result = validateSurvivalRound(round);
  return result.nativeValidation.confidenceScore;
}

/**
 * Filter rounds that need regeneration (failed validation)
 *
 * @param script - The survival script to check
 * @returns Array of round IDs that need regeneration
 */
export function getRoundsNeedingRegeneration(script: SurvivalScript): number[] {
  const result = validateSurvivalScript(script);
  return result.summary.invalidRoundIds;
}

/**
 * Create a survival-specific validator with optional custom patterns
 *
 * @param customPatterns - Optional additional forbidden patterns
 * @returns LinguisticValidator instance configured for survival quiz
 */
export function createSurvivalValidator(
  customPatterns: import('../comparison/linguistic-validator').ForbiddenPattern[] = []
): LinguisticValidator {
  return createLinguisticValidator(customPatterns);
}
