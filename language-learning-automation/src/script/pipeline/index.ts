/**
 * Multi-Step Script Pipeline - Public API
 *
 * This module exports the public API for the multi-step script generation pipeline.
 * The pipeline separates AI script generation into three phases:
 * 1. Creative Phase: Generate free-form screenplay
 * 2. Structural Phase: Convert to educational JSON
 * 3. Visual Phase: Generate scene prompts
 *
 * @module pipeline
 * **Validates: Requirement 5.2**
 */

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main pipeline orchestrator function.
 * This is the primary entry point for running the complete script generation pipeline.
 *
 * @example
 * ```typescript
 * import { runScriptPipeline } from './script/pipeline';
 *
 * const result = await runScriptPipeline(config, 'story', 'A day at the beach');
 * console.log(result.script);
 * ```
 *
 * **Validates: Requirement 5.2**
 */
export { runScriptPipeline, isPipelineEnabled } from './orchestrator';

// ============================================================================
// Individual Phase Functions (for testing and advanced usage)
// ============================================================================

/**
 * Creative Generator - Phase 1
 * Generates free-form screenplay scripts without JSON constraints.
 */
export {
  generateCreativeScript,
  isScreenplayFormat,
  hasNaturalDialoguePatterns,
} from './creative-generator';

/**
 * Structural Converter - Phase 2
 * Converts creative screenplay output into structured educational JSON.
 */
export { convertToStructuredFormat } from './structural-converter';

/**
 * Visual Generator - Phase 3
 * Generates scene prompts with camera directions and character appearances.
 */
export {
  generateVisualPrompts,
  suggestSceneCount,
  suggestSceneBoundaries,
  identifyBreakPoints,
  areCharacterAppearancesConsistent,
  doCameraDirectionsVary,
} from './visual-generator';

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validation functions for pipeline output.
 */
export {
  // Individual validators
  validateBlankWord,
  validateWrongChoices,
  validateBlankInTarget,
  validateWordCount,
  validateSceneCoverage,
  // Boolean convenience functions
  isLearnableWord,
  areWrongChoicesValid,
  isBlankInTarget,
  isWordCountValid,
  isSceneCoverageValid,
  // Sentence validation
  validateSentence,
  validateSentences,
  // Utility functions
  getWordCount,
  // Constants
  MIN_WORD_COUNT,
  MAX_WORD_COUNT,
  MIN_SCENE_COUNT,
  MAX_SCENE_COUNT,
} from './validators';

// ============================================================================
// Screenplay Parser
// ============================================================================

/**
 * Screenplay parsing utilities.
 */
export {
  parseScreenplay,
  countDialogueLines,
  getAllDialogueText,
  hasSpeakerLabels,
  extractDialogueLinesQuick,
} from './screenplay-parser';

export type { ParseResult, ParseOptions } from './screenplay-parser';

// ============================================================================
// Blank Word Selection
// ============================================================================

/**
 * Blank word selection utilities.
 */
export {
  isLearnableBlankWord,
  suggestBlankWordCandidates,
  selectBestBlankWord,
  wordAppearsInSentence,
  createBlankSentence,
  // Constants
  FORBIDDEN_BLANK_WORDS,
  ARTICLES,
  PRONOUNS,
  BASIC_VERBS,
} from './blank-word-selector';

// ============================================================================
// Wrong Choice Generation
// ============================================================================

/**
 * Wrong choice generation utilities.
 */
export {
  generateWrongChoices,
  isValidWrongChoice,
  areAllWrongChoicesValid,
  getPhoneticSimilarity,
} from './wrong-choice-generator';

// ============================================================================
// Types
// ============================================================================

/**
 * Type exports for consumers of the pipeline API.
 */
export type {
  // Screenplay types (Creative Phase)
  ScreenplayOutput,
  ScreenplayCharacter,
  ScreenplayScene,
  ScreenplayLine,
  // Phase input types
  CreativeGeneratorInput,
  StructuralConverterInput,
  VisualGeneratorInput,
  // Phase output types
  StructuredSentences,
  VisualOutput,
  // Pipeline configuration and results
  PipelineConfig,
  PipelineResult,
  PhaseMetrics,
  // Error types
  ValidationError,
  PhaseError,
} from './types';

/**
 * PipelineError class for error handling.
 */
export { PipelineError, DEFAULT_PIPELINE_CONFIG } from './types';

/**
 * Zod schemas for validation.
 */
export {
  screenplayCharacterSchema,
  screenplayLineSchema,
  screenplaySceneSchema,
  screenplayOutputSchema,
} from './types';
