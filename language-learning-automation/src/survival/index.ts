/**
 * Survival Quiz Module
 *
 * Public API exports for the survival quiz longform video generator.
 */

// =============================================================================
// Types
// =============================================================================

export {
  // Character types
  SurvivalCharacter,
  CHARACTER_INFO,
  // Round types
  SurvivalRound,
  survivalRoundSchema,
  // HP types
  HPState,
  hpStateSchema,
  // Script types
  SurvivalScript,
  survivalScriptSchema,
  survivalCharacterSchema,
} from './types';

// =============================================================================
// HP System
// =============================================================================

export { HPSystem, HPSystemConfig, DEFAULT_HP_CONFIG } from './hp-system';

// =============================================================================
// Winner Logic
// =============================================================================

export {
  WinnerDecision,
  generateRoundWinners,
  assignExpressionsToCharacters,
  determineFinalWinner,
  countWins,
} from './winner-logic';

// =============================================================================
// Timing
// =============================================================================

export {
  SurvivalTimingConfig,
  DEFAULT_SURVIVAL_TIMING,
  calculateRoundDuration,
  calculateTotalVideoDuration,
  validateTimingConfig,
  createTimingConfig,
  INTRO_DURATION_BOUNDS,
  ENDING_DURATION_BOUNDS,
} from './timing';

// =============================================================================
// Generator
// =============================================================================

export { SurvivalGenerator, SurvivalGeneratorConfig } from './generator';

// =============================================================================
// Expression Database
// =============================================================================

export {
  SurvivalExpressionDB,
  SurvivalExpressionRecord,
  SurvivalExpressionDBConfig,
  DEFAULT_SURVIVAL_EXPRESSION_DB_CONFIG,
} from './expression-db';

// =============================================================================
// Validator
// =============================================================================

export {
  validateExpression,
  validateSurvivalRound,
  createLinguisticValidator,
  FORBIDDEN_PATTERNS,
  ValidationResult,
  SurvivalRoundValidation,
  ForbiddenPattern,
  validationResultSchema,
} from './validator';

// =============================================================================
// Audio
// =============================================================================

export {
  // Types
  SurvivalAudioConfig,
  SurvivalAudioFiles,
  SurvivalAudioManifest,
  RoundAudioSet,
  SurvivalSFXPaths,
  SurvivalAudioFile,
  SurvivalAudioResult,
  SurvivalTTSProvider,
  VoiceGender,
  VoiceEntry,
  // Functions
  generateSurvivalAudio,
  generateSurvivalAudioManifest,
  generateRoundAudio,
  generatePhaseAudio,
  createSurvivalVoiceConfig,
  createVoiceConfigFromNames,
  createRandomizedVoiceConfig,
  createFixedVoiceConfig,
  CHARACTER_VOICE_PRESETS,
  getRandomVoice,
  getRandomMaleVoice,
  getRandomFemaleVoice,
  getRandomVoiceByGender,
  getSFXPaths,
  manifestToAudioFiles,
  createMockSurvivalAudioFiles,
  getRoundAudioDuration,
  saveSurvivalAudioManifest,
  loadSurvivalAudioManifest,
  generateSurvivalAudioFilename,
  getCharacterVoice,
  getCharacterAnswerText,
  // Constants
  DEFAULT_SURVIVAL_AUDIO_CONFIG,
  DEFAULT_SFX_PATHS,
  ENGLISH_VOICES,
  KOREAN_VOICES,
} from './audio';

// =============================================================================
// Timestamps
// =============================================================================

export {
  // Types
  TimestampEntry,
  TimestampConfig,
  // Functions
  generateTimestamps,
  generateTimestampEntries,
  generateTimestampsText,
  formatTimestamp,
  formatTimeOnly,
  validateTimestampCompleteness,
  validateTimestampFormat,
  parseTimestamp,
  calculateRoundStartTime,
  generateCustomTimestamps,
  getDefaultRoundMarkers,
} from './timestamps';

// =============================================================================
// SEO Generator
// =============================================================================

export {
  // Types
  SEOMetadata,
  SEOGeneratorConfig,
  // Functions
  generateSEOMetadata,
  generateSEOText,
  exportSEOToJSON,
} from './seo-generator';

// =============================================================================
// Pipeline
// =============================================================================

export {
  // Types
  SurvivalPipelineOptions,
  SurvivalPipelineResult,
  // Functions
  runSurvivalPipeline,
  estimateVideoDuration,
  runQuickPipeline,
} from './pipeline';
