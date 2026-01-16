/**
 * Survival Quiz Pipeline
 *
 * Complete pipeline for generating survival quiz videos:
 * - Script generation → Validation → TTS → Rendering
 * - Timestamp/SEO generation
 *
 * Requirements: 1.1, 6.3, 6.4
 */

import { promises as fs } from 'fs';
import path from 'path';
import { SurvivalScript } from './types';
import { SurvivalGenerator, SurvivalGeneratorConfig } from './generator';
import { validateSurvivalRound } from './validator';
import {
  generateSurvivalAudio,
  SurvivalAudioConfig,
  SurvivalAudioFiles,
  SurvivalAudioResultWithDurations,
  createFixedVoiceConfig,
} from './audio';
import { generateTimestamps, TimestampConfig } from './timestamps';
import { generateSEOMetadata, SEOMetadata, SEOGeneratorConfig } from './seo-generator';
import {
  SurvivalTimingConfig,
  DEFAULT_SURVIVAL_TIMING,
  calculateTotalVideoDuration,
} from './timing';

// =============================================================================
// Types
// =============================================================================

export interface SurvivalPipelineOptions {
  /** Channel ID */
  channelId: string;
  /** Number of rounds (default: 50) */
  roundCount?: number;
  /** Categories to include */
  categories?: Array<'daily' | 'business' | 'emotion' | 'request_reject' | 'apology_thanks'>;
  /** Output directory */
  outputDir?: string;
  /** Whether to auto-render video */
  autoRender?: boolean;
  /** Random seed for reproducibility */
  seed?: number;
  /** Gemini API key */
  apiKey?: string;
  /** Audio configuration */
  audioConfig?: Partial<SurvivalAudioConfig>;
  /** Timing configuration */
  timingConfig?: SurvivalTimingConfig;
  /** SEO configuration */
  seoConfig?: Partial<SEOGeneratorConfig>;
  /** Skip audio generation */
  skipAudio?: boolean;
  /** Progress callback */
  onProgress?: (stage: string, progress: number, total: number) => void;
}

export interface SurvivalPipelineResult {
  /** Whether pipeline succeeded */
  success: boolean;
  /** Generated script */
  script: SurvivalScript;
  /** Generated audio files */
  audioFiles?: SurvivalAudioFiles;
  /** Path to rendered video (if autoRender) */
  videoPath?: string;
  /** Generated timestamps */
  timestamps: string[];
  /** SEO metadata */
  seoMetadata: SEOMetadata;
  /** Output directory */
  outputDir: string;
  /** Validation results */
  validationResults: {
    totalRounds: number;
    validRounds: number;
    invalidRounds: number;
    warnings: string[];
  };
  /** Error message if failed */
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OUTPUT_DIR = 'output/survival';
const DEFAULT_ROUND_COUNT = 50;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create output directory structure
 */
async function createOutputDirectory(baseDir: string, channelId: string): Promise<string> {
  const date = new Date().toISOString().split('T')[0];
  const outputDir = path.join(baseDir, channelId, date);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'audio'), { recursive: true });

  return outputDir;
}

/**
 * Save script to JSON file
 */
async function saveScript(script: SurvivalScript, outputDir: string): Promise<string> {
  const scriptPath = path.join(outputDir, 'script.json');
  await fs.writeFile(scriptPath, JSON.stringify(script, null, 2));
  return scriptPath;
}

/**
 * Save timestamps to file
 */
async function saveTimestamps(timestamps: string[], outputDir: string): Promise<string> {
  const timestampsPath = path.join(outputDir, 'timestamps.txt');
  await fs.writeFile(timestampsPath, timestamps.join('\n'));
  return timestampsPath;
}

/**
 * Save SEO metadata to file
 */
async function saveSEOMetadata(metadata: SEOMetadata, outputDir: string): Promise<string> {
  const seoPath = path.join(outputDir, 'seo.json');
  await fs.writeFile(seoPath, JSON.stringify(metadata, null, 2));
  return seoPath;
}

/**
 * Validate all rounds in a script
 */
function validateScript(script: SurvivalScript): {
  totalRounds: number;
  validRounds: number;
  invalidRounds: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let validRounds = 0;
  let invalidRounds = 0;

  for (const round of script.rounds) {
    const result = validateSurvivalRound(round);

    if (result.isValid) {
      validRounds++;
    } else {
      invalidRounds++;
      warnings.push(`Round ${round.id}: Native expression has forbidden patterns`);
    }

    // Check for warnings (not errors)
    if (result.nativeValidation.status === 'warning') {
      warnings.push(
        `Round ${round.id}: Native expression has warnings - ${result.nativeValidation.reason}`
      );
    }
  }

  return {
    totalRounds: script.rounds.length,
    validRounds,
    invalidRounds,
    warnings,
  };
}

// =============================================================================
// Main Pipeline Function
// =============================================================================

/**
 * Run the complete survival quiz pipeline
 */
export async function runSurvivalPipeline(
  options: SurvivalPipelineOptions
): Promise<SurvivalPipelineResult> {
  const {
    channelId,
    roundCount = DEFAULT_ROUND_COUNT,
    categories,
    outputDir: baseOutputDir = DEFAULT_OUTPUT_DIR,
    autoRender = false,
    seed,
    apiKey,
    audioConfig,
    timingConfig = DEFAULT_SURVIVAL_TIMING,
    seoConfig,
    skipAudio = false,
    onProgress,
  } = options;

  try {
    // 1. Create output directory
    onProgress?.('setup', 0, 5);
    const outputDir = await createOutputDirectory(baseOutputDir, channelId);

    // 2. Generate script
    onProgress?.('script', 1, 5);
    const generatorApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!generatorApiKey) {
      throw new Error('GEMINI_API_KEY is required for script generation');
    }

    const generator = new SurvivalGenerator(generatorApiKey);
    const generatorConfig: Partial<SurvivalGeneratorConfig> = {
      roundCount,
      seed,
    };
    if (categories) {
      generatorConfig.categories = categories;
    }

    const script = await generator.generateScript(channelId, generatorConfig);

    // Save script
    await saveScript(script, outputDir);

    // 3. Validate script
    onProgress?.('validation', 2, 5);
    const validationResults = validateScript(script);

    if (validationResults.invalidRounds > validationResults.totalRounds * 0.1) {
      console.warn(`Warning: ${validationResults.invalidRounds} rounds have validation issues`);
    }

    // 4. Generate audio (if not skipped)
    let audioFiles: SurvivalAudioFiles | undefined;
    if (!skipAudio) {
      onProgress?.('audio', 3, 5);

      // Create fixed voice config for consistent character voices
      // Cat: Female + pitch 6, Dog: Male + pitch -3
      const fixedConfig = createFixedVoiceConfig();
      const fullAudioConfig = { ...fixedConfig, ...audioConfig };

      console.log(`🎤 Voice config for this episode:`);
      console.log(
        `   Cat: ${fullAudioConfig.catVoice.name} (${fullAudioConfig.catVoice.gender}) pitch: ${fullAudioConfig.catVoice.pitch ?? 0}`
      );
      console.log(
        `   Dog: ${fullAudioConfig.dogVoice.name} (${fullAudioConfig.dogVoice.gender}) pitch: ${fullAudioConfig.dogVoice.pitch ?? 0}`
      );

      const audioDir = path.join(outputDir, 'audio');

      const audioResult: SurvivalAudioResultWithDurations = await generateSurvivalAudio(
        script,
        fullAudioConfig,
        audioDir,
        (current, total, phase) => {
          onProgress?.(`audio:${phase}`, current, total);
        }
      );

      audioFiles = audioResult.audioFiles;

      // Update script with audio durations for dynamic timing
      for (let i = 0; i < script.rounds.length; i++) {
        script.rounds[i].audioDurations = audioResult.roundDurations[i];
      }

      // Re-save script with audio durations
      await saveScript(script, outputDir);
    }

    // 5. Generate timestamps and SEO
    onProgress?.('metadata', 4, 5);
    const timestampConfig: Partial<TimestampConfig> = {
      timingConfig,
      totalRounds: roundCount,
    };
    const timestamps = generateTimestamps(timestampConfig);
    await saveTimestamps(timestamps, outputDir);

    const fullSeoConfig: Partial<SEOGeneratorConfig> = {
      ...seoConfig,
      includeTimestamps: true,
      timestampConfig,
    };
    const seoMetadata = generateSEOMetadata(script, fullSeoConfig);
    await saveSEOMetadata(seoMetadata, outputDir);

    // 6. Render video (if autoRender)
    let videoPath: string | undefined;
    if (autoRender) {
      onProgress?.('render', 5, 5);
      // Video rendering would be done via Remotion CLI
      // This is a placeholder - actual rendering requires Remotion setup
      console.log('Auto-render requested. Run Remotion render command separately.');
      videoPath = path.join(outputDir, 'survival_quiz.mp4');
    }

    onProgress?.('complete', 5, 5);

    return {
      success: true,
      script,
      audioFiles,
      videoPath,
      timestamps,
      seoMetadata,
      outputDir,
      validationResults,
    };
  } catch (error) {
    return {
      success: false,
      script: {} as SurvivalScript,
      timestamps: [],
      seoMetadata: {} as SEOMetadata,
      outputDir: '',
      validationResults: {
        totalRounds: 0,
        validRounds: 0,
        invalidRounds: 0,
        warnings: [],
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Calculate estimated video duration
 */
export function estimateVideoDuration(
  roundCount: number = DEFAULT_ROUND_COUNT,
  timingConfig: SurvivalTimingConfig = DEFAULT_SURVIVAL_TIMING
): {
  totalSeconds: number;
  totalMinutes: number;
  formatted: string;
} {
  const introDuration = 8;
  const endingDuration = 15;

  const totalSeconds = calculateTotalVideoDuration(
    roundCount,
    introDuration,
    endingDuration,
    timingConfig
  );

  const totalMinutes = totalSeconds / 60;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);

  return {
    totalSeconds,
    totalMinutes,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
  };
}

/**
 * Quick pipeline for testing (generates script only)
 */
export async function runQuickPipeline(
  channelId: string,
  apiKey: string,
  roundCount: number = 5
): Promise<SurvivalScript> {
  const generator = new SurvivalGenerator(apiKey);
  return generator.generateScript(channelId, { roundCount });
}
