/**
 * Comparison Pipeline - 전체 파이프라인 통합
 * 스크립트 생성 → Linguistic Validation → TTS → 렌더링
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ComparisonScript, ComparisonCategory } from './types';
import type { TimingProfileType } from './timing-profile';
import { calculateVideoTiming } from './timing-profile';
import { generateComparisonScript } from './generator';
import { validateExpression } from './linguistic-validator';
import {
  generateAllComparisonAudio,
  saveAudioManifest,
  DEFAULT_VOICE_CONFIG,
  type ComparisonVoiceConfig,
  type ComparisonAudioManifest,
} from './audio';

// =============================================================================
// Pipeline Types
// =============================================================================

export interface ComparisonPipelineOptions {
  channelId: string;
  segmentCount?: number; // default: 30
  timingProfile?: TimingProfileType; // default: 'normal'
  hookVariant?: number | 'random'; // Hook 선택 (0-4 또는 random)
  categories?: ComparisonCategory[];
  outputDir?: string;
  autoRender?: boolean; // 렌더링 실행 여부
  dryRun?: boolean; // 검증만 수행
  voiceConfig?: ComparisonVoiceConfig; // TTS 설정
}

export interface ComparisonPipelineResult {
  success: boolean;
  script: ComparisonScript;
  timestamps: string; // YouTube chapters 형식
  audioManifest?: ComparisonAudioManifest;
  outputPath?: string;
  errors?: string[];
}

// =============================================================================
// Timestamp Generation
// =============================================================================

/**
 * Format seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Generate YouTube chapter timestamps for a Comparison video
 * Format: MM:SS Label (e.g., "00:00 Hook", "00:05 Segment 1")
 *
 * @param script - The comparison script
 * @param profile - Timing profile (fast/normal/suspense)
 * @returns YouTube chapter-compatible timestamp string
 */
export function generateComparisonTimestamps(
  script: ComparisonScript,
  profile: TimingProfileType = 'normal'
): string {
  const timing = calculateVideoTiming(script.segments.length, profile);
  const lines: string[] = [];

  // Hook
  lines.push(`${formatTimestamp(0)} Hook`);

  // Segments
  for (const segmentTiming of timing.segmentTimings) {
    const label = `Segment ${segmentTiming.segmentIndex + 1}`;
    lines.push(`${formatTimestamp(segmentTiming.startTimeSeconds)} ${label}`);
  }

  // CTA
  const ctaStart =
    timing.segmentTimings.length > 0
      ? timing.segmentTimings[timing.segmentTimings.length - 1].endTimeSeconds
      : timing.hookDurationSeconds;
  lines.push(`${formatTimestamp(ctaStart)} CTA`);

  return lines.join('\n');
}

// =============================================================================
// Pipeline Execution
// =============================================================================

/**
 * Run the full comparison pipeline
 *
 * @param options - Pipeline options
 * @returns Pipeline result with script, timestamps, and output path
 */
export async function runComparisonPipeline(
  options: ComparisonPipelineOptions
): Promise<ComparisonPipelineResult> {
  const errors: string[] = [];
  const timingProfile = options.timingProfile ?? 'normal';
  const segmentCount = options.segmentCount ?? 30;
  const voiceConfig = options.voiceConfig ?? DEFAULT_VOICE_CONFIG;

  // Determine output directory
  const dateStr = new Date().toISOString().split('T')[0];
  const outputDir =
    options.outputDir ??
    path.join(process.cwd(), 'output', options.channelId, `${dateStr}_comparison`);

  console.log('\n🎬 Comparison Video Pipeline');
  console.log('═'.repeat(50));
  console.log(`📺 Channel: ${options.channelId}`);
  console.log(`📊 Segments: ${segmentCount}`);
  console.log(`⏱️  Timing: ${timingProfile}`);
  console.log(`📂 Output: ${outputDir}`);
  console.log(`🔍 Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('═'.repeat(50));

  // Step 1: Generate Script
  console.log('\n📝 Step 1: Generating comparison script...');
  let script: ComparisonScript;

  try {
    script = await generateComparisonScript(options.channelId, {
      segmentCount,
      categories: options.categories,
    });
    console.log(`   ✅ Generated ${script.segments.length} segments`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Script generation failed: ${errorMsg}`);
    throw new Error(`Script generation failed: ${errorMsg}`);
  }

  // Step 2: Linguistic Validation
  console.log('\n🔍 Step 2: Validating expressions...');
  let invalidCount = 0;
  for (const segment of script.segments) {
    const result = validateExpression(segment.koreanExpression.text);
    if (result.status === 'failed') {
      invalidCount++;
      errors.push(`Invalid expression: ${segment.koreanExpression.text}`);
    }
  }
  console.log(
    `   ✅ Validation: ${script.segments.length - invalidCount}/${script.segments.length} valid`
  );

  // Step 3: Select Hook Variant
  const hookVariants = script.hookVariants ?? [script.hook];
  const selectedHook =
    options.hookVariant === 'random'
      ? Math.floor(Math.random() * hookVariants.length)
      : options.hookVariant ?? 0;
  console.log(`\n🎯 Selected Hook: ${selectedHook} - "${hookVariants[selectedHook]?.text ?? script.hook.text}"`);

  // Step 4: Generate Timestamps
  console.log('\n⏱️  Step 4: Generating timestamps...');
  const timestamps = generateComparisonTimestamps(script, timingProfile);
  console.log('   ✅ Timestamps generated');

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Save script
  const scriptPath = path.join(outputDir, 'script.json');
  await fs.writeFile(scriptPath, JSON.stringify(script, null, 2));
  console.log(`\n📁 Script saved: ${scriptPath}`);

  // Save timestamps
  const timestampsPath = path.join(outputDir, 'timestamps.txt');
  await fs.writeFile(timestampsPath, timestamps);
  console.log(`📁 Timestamps saved: ${timestampsPath}`);

  // If dry-run, stop here
  if (options.dryRun) {
    console.log('\n✅ Dry run complete!');
    console.log('\n📋 YouTube Chapters:');
    console.log('─'.repeat(30));
    console.log(timestamps);
    console.log('─'.repeat(30));

    return {
      success: true,
      script,
      timestamps,
      outputPath: outputDir,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Step 5: Generate TTS Audio
  console.log('\n🎤 Step 5: Generating TTS audio...');
  const audioDir = path.join(outputDir, 'audio');
  await fs.mkdir(audioDir, { recursive: true });

  let audioManifest: ComparisonAudioManifest;
  try {
    audioManifest = await generateAllComparisonAudio(
      script,
      voiceConfig,
      audioDir,
      (current, total, phase) => {
        process.stdout.write(`\r   Progress: ${current}/${total} segments (${phase})    `);
      }
    );
    console.log(`\n   ✅ Audio generated: ${audioManifest.totalDuration.toFixed(1)}s total`);

    // Save audio manifest
    await saveAudioManifest(audioManifest, outputDir);
    console.log(`📁 Audio manifest saved`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`TTS generation failed: ${errorMsg}`);
    console.error(`   ❌ TTS generation failed: ${errorMsg}`);

    return {
      success: false,
      script,
      timestamps,
      outputPath: outputDir,
      errors,
    };
  }

  // Step 6: Render Video (if autoRender is enabled)
  if (options.autoRender) {
    console.log('\n🎬 Step 6: Rendering video...');
    console.log('   ⚠️  Rendering requires manual execution:');
    console.log(`   npx tsx scripts/render-comparison.ts ${options.channelId} ${path.basename(outputDir)}`);
    // Note: Full Remotion rendering integration would be done in a separate script
  } else {
    console.log('\n⏭️  Skipping video rendering (use --render to enable)');
  }

  console.log('\n📋 YouTube Chapters:');
  console.log('─'.repeat(30));
  console.log(timestamps);
  console.log('─'.repeat(30));

  console.log('\n🎉 Pipeline complete!');
  console.log(`📂 Output: ${outputDir}`);

  return {
    success: true,
    script,
    timestamps,
    audioManifest,
    outputPath: outputDir,
    errors: errors.length > 0 ? errors : undefined,
  };
}

