#!/usr/bin/env npx ts-node

/**
 * CLI Script for Survival Quiz Generation
 *
 * Usage:
 *   npx ts-node scripts/generate-survival.ts --channel <channelId> [options]
 *
 * Options:
 *   --channel, -c    Channel ID (required for full pipeline)
 *   --rounds, -r     Number of rounds (default: 50)
 *   --seed, -s       Random seed for reproducibility
 *   --render         Auto-render video after generation
 *   --skip-audio     Skip audio generation
 *   --output, -o     Output directory
 *   --test-audio     Test single audio generation (cat/dog/both)
 *   --text, -t       Text to speak for test audio
 *   --pitch, -p      Pitch adjustment (-20 to 20)
 *   --help, -h       Show help
 */

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { promises as fs } from 'fs';
import path from 'path';
import { runSurvivalPipeline, estimateVideoDuration } from '../src/survival/pipeline';
import { DEFAULT_SURVIVAL_TIMING } from '../src/survival/timing';
import { synthesizeWithGoogle } from '../src/tts/google';
import { createFixedVoiceConfig, type VoiceEntry } from '../src/survival/audio';

// =============================================================================
// Channel Config
// =============================================================================

interface SurvivalChannelConfig {
  id: string;
  name: string;
  description?: string;
  rounds: number;
  categories?: string[];
  voice?: {
    cat?: { gender?: string; pitch?: number };
    dog?: { gender?: string; pitch?: number };
  };
}

async function loadChannelConfig(channelId: string): Promise<SurvivalChannelConfig | null> {
  const configPath = path.join('channels', `${channelId}.json`);
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as SurvivalChannelConfig;
  } catch {
    return null;
  }
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CLIOptions {
  channel: string;
  rounds: number | undefined;
  seed?: number;
  render: boolean;
  skipAudio: boolean;
  output: string;
  help: boolean;
  // Test audio options
  testAudio?: 'cat' | 'dog' | 'both';
  text?: string;
  pitch?: number;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    channel: '',
    rounds: undefined, // Will be loaded from channel config if not specified
    seed: undefined,
    render: false,
    skipAudio: false,
    output: 'output/survival',
    help: false,
    testAudio: undefined,
    text: undefined,
    pitch: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--channel':
      case '-c':
        options.channel = args[++i] || '';
        break;
      case '--rounds':
      case '-r':
        options.rounds = parseInt(args[++i], 10) || undefined;
        break;
      case '--seed':
      case '-s':
        options.seed = parseInt(args[++i], 10);
        break;
      case '--render':
        options.render = true;
        break;
      case '--skip-audio':
        options.skipAudio = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i] || 'output/survival';
        break;
      case '--test-audio': {
        const testType = args[++i] || 'both';
        if (testType === 'cat' || testType === 'dog' || testType === 'both') {
          options.testAudio = testType;
        } else {
          options.testAudio = 'both';
        }
        break;
      }
      case '--text':
      case '-t':
        options.text = args[++i] || '';
        break;
      case '--pitch':
      case '-p':
        options.pitch = parseFloat(args[++i]) || 0;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🎮 Survival Quiz Generator

Usage:
  npx tsx scripts/generate-survival.ts --channel <channelId> [options]
  npx tsx scripts/generate-survival.ts --test-audio <cat|dog|both> [options]

Options:
  --channel, -c    Channel ID (required for full pipeline)
  --rounds, -r     Number of rounds (default: 50)
  --seed, -s       Random seed for reproducibility
  --render         Auto-render video after generation
  --skip-audio     Skip audio generation
  --output, -o     Output directory (default: output/survival)
  --help, -h       Show this help message

Test Audio Options:
  --test-audio     Test single audio: cat, dog, or both
  --text, -t       Text to speak (default: "Hello, nice to meet you!")
  --pitch, -p      Custom pitch adjustment (-20 to 20)
  --seed, -s       Seed for voice selection

Examples:
  # Generate 50-round quiz for channel "survival"
  npx tsx scripts/generate-survival.ts -c survival

  # Generate 10-round quiz with seed for testing
  npx tsx scripts/generate-survival.ts -c test -r 10 -s 12345

  # Test cat voice with custom text
  npx tsx scripts/generate-survival.ts --test-audio cat -t "What's up?"

  # Test both voices with custom pitch
  npx tsx scripts/generate-survival.ts --test-audio both -p 5

  # Test with specific seed (reproducible voice selection)
  npx tsx scripts/generate-survival.ts --test-audio both -s 42

Environment Variables:
  GEMINI_API_KEY   Required for script generation
`);
}

// =============================================================================
// Test Audio Generation
// =============================================================================

async function generateTestAudio(
  character: 'cat' | 'dog',
  text: string,
  voice: VoiceEntry,
  outputDir: string
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `test_${character}_pitch${voice.pitch ?? 0}.mp3`;
  const outputPath = path.join(outputDir, filename);

  console.log(`🎤 Generating ${character} audio...`);
  console.log(`   Voice: ${voice.name} (${voice.gender})`);
  console.log(`   Pitch: ${voice.pitch ?? 0} semitones`);
  console.log(`   Text: "${text}"`);

  const audioBuffer = await synthesizeWithGoogle(
    text,
    'en-US',
    voice.name,
    voice.gender,
    1.0,
    voice.pitch ?? 0
  );

  await fs.writeFile(outputPath, audioBuffer);
  console.log(`   ✅ Saved: ${outputPath}`);

  return outputPath;
}

// =============================================================================
// Copy to Public Folder
// =============================================================================

async function copyToPublic(outputDir: string, roundCount: number): Promise<void> {
  const publicAudioDir = 'public/survival-audio';
  const publicScriptPath = 'public/survival-script.json';

  // Clear existing audio files
  try {
    const existingFiles = await fs.readdir(publicAudioDir);
    for (const file of existingFiles) {
      await fs.unlink(path.join(publicAudioDir, file));
    }
    console.log(`   🗑️  Cleared ${existingFiles.length} existing audio files`);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(publicAudioDir, { recursive: true });
  }

  // Copy only audio files for the current round count
  const audioDir = path.join(outputDir, 'audio');
  try {
    const audioFiles = await fs.readdir(audioDir);
    // Filter to only include files for rounds 1 to roundCount
    const validRoundPattern = new RegExp(
      `^round_(${Array.from({ length: roundCount }, (_, i) => String(i + 1).padStart(2, '0')).join('|')})_`
    );
    const mp3Files = audioFiles.filter((f) => f.endsWith('.mp3') && validRoundPattern.test(f));
    for (const file of mp3Files) {
      await fs.copyFile(path.join(audioDir, file), path.join(publicAudioDir, file));
    }
    console.log(`   🔊 Copied ${mp3Files.length} audio files to ${publicAudioDir}`);
  } catch (err) {
    console.log(`   ⚠️  No audio files to copy: ${err}`);
  }

  // Copy script
  const scriptPath = path.join(outputDir, 'script.json');
  try {
    await fs.copyFile(scriptPath, publicScriptPath);
    console.log(`   📝 Copied script to ${publicScriptPath}`);
  } catch (err) {
    console.log(`   ⚠️  Failed to copy script: ${err}`);
  }

  console.log('   ✅ Ready for Remotion preview!');
}

async function runTestAudio(options: CLIOptions): Promise<void> {
  const text = options.text || 'Hello, nice to meet you!';
  const outputDir = path.join(options.output, 'test-audio');

  // Get voice config (with character pitches)
  // Use seed for reproducible voice selection, or random if not provided
  const voiceConfig = createFixedVoiceConfig(options.seed);

  console.log('🎵 Test Audio Generator');
  console.log('=======================');
  console.log(`📝 Text: "${text}"`);
  console.log(`🎲 Seed: ${options.seed ?? 'random'}`);
  console.log(`🐱 Cat voice: ${voiceConfig.catVoice.name}`);
  console.log(`🐶 Dog voice: ${voiceConfig.dogVoice.name}`);
  console.log('');

  // Override pitch if specified
  if (options.pitch !== undefined) {
    voiceConfig.catVoice.pitch = options.pitch;
    voiceConfig.dogVoice.pitch = options.pitch;
    console.log(`🎚️  Custom pitch override: ${options.pitch}`);
    console.log('');
  }

  const results: string[] = [];

  if (options.testAudio === 'cat' || options.testAudio === 'both') {
    console.log('🐱 Cat Voice:');
    const catPath = await generateTestAudio('cat', text, voiceConfig.catVoice, outputDir);
    results.push(catPath);
    console.log('');
  }

  if (options.testAudio === 'dog' || options.testAudio === 'both') {
    console.log('🐶 Dog Voice:');
    const dogPath = await generateTestAudio('dog', text, voiceConfig.dogVoice, outputDir);
    results.push(dogPath);
    console.log('');
  }

  console.log('✅ Test audio generation complete!');
  console.log('');
  console.log('📁 Output files:');
  results.forEach((p) => console.log(`   ${p}`));
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Cat pitch range: +3 to +6 (cute/playful)');
  console.log('   - Dog pitch range: -2 to -4 (friendly/warm)');
  console.log('   - Use --pitch to test custom values');
  console.log('   - Use --seed for reproducible voice selection');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Test audio mode
  if (options.testAudio) {
    await runTestAudio(options);
    process.exit(0);
  }

  // Full pipeline mode - requires channel
  if (!options.channel) {
    console.error('❌ Error: Channel ID is required');
    console.error('   Use --channel or -c to specify the channel');
    console.error('   Or use --test-audio to test voice generation');
    console.error('   Use --help for more information');
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Load channel config
  const channelConfig = await loadChannelConfig(options.channel);
  if (channelConfig) {
    console.log(`📋 Loaded channel config: channels/${options.channel}.json`);
  }

  // Determine round count: CLI > channel config > default (50)
  const roundCount = options.rounds ?? channelConfig?.rounds ?? 50;

  console.log('🎮 Survival Quiz Generator');
  console.log('========================');
  console.log(`📺 Channel: ${options.channel}`);
  console.log(`🎯 Rounds: ${roundCount}${channelConfig?.rounds ? ' (from config)' : ''}`);
  if (options.seed !== undefined) {
    console.log(`🎲 Seed: ${options.seed}`);
  }
  console.log(`📁 Output: ${options.output}`);
  console.log(`🎬 Auto-render: ${options.render ? 'Yes' : 'No'}`);
  console.log(`🔊 Audio: ${options.skipAudio ? 'Skipped' : 'Enabled'}`);
  console.log('');

  // Estimate duration
  const duration = estimateVideoDuration(roundCount, DEFAULT_SURVIVAL_TIMING);
  console.log(`⏱️  Estimated video duration: ${duration.formatted}`);
  console.log('');

  // Run pipeline
  console.log('🚀 Starting pipeline...');
  console.log('');

  const result = await runSurvivalPipeline({
    channelId: options.channel,
    roundCount: roundCount,
    seed: options.seed,
    outputDir: options.output,
    autoRender: options.render,
    skipAudio: options.skipAudio,
    onProgress: (stage, progress, total) => {
      const percentage = Math.round((progress / total) * 100);
      console.log(`   [${stage}] ${progress}/${total} (${percentage}%)`);
    },
  });

  console.log('');

  if (result.success) {
    console.log('✅ Pipeline completed successfully!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   📁 Output directory: ${result.outputDir}`);
    console.log(`   📝 Script: ${result.script.rounds.length} rounds`);
    console.log(`   🏆 Winner: ${result.script.ending.winner}`);
    console.log(`   🐱 Cat wins: ${result.script.ending.catWins}`);
    console.log(`   🐶 Dog wins: ${result.script.ending.dogWins}`);
    console.log('');
    console.log('📋 Validation:');
    console.log(`   ✓ Valid rounds: ${result.validationResults.validRounds}`);
    console.log(`   ✗ Invalid rounds: ${result.validationResults.invalidRounds}`);
    if (result.validationResults.warnings.length > 0) {
      console.log(`   ⚠ Warnings: ${result.validationResults.warnings.length}`);
    }
    console.log('');
    console.log('📺 SEO:');
    console.log(`   Title: ${result.seoMetadata.title}`);
    console.log(`   Tags: ${result.seoMetadata.tags.length} tags`);
    console.log('');
    console.log('📍 Timestamps:');
    result.timestamps.forEach((ts) => console.log(`   ${ts}`));

    // Copy to public folder for Remotion preview
    console.log('');
    console.log('📦 Copying to public folder for Remotion...');
    await copyToPublic(result.outputDir, result.script.rounds.length);
  } else {
    console.error('❌ Pipeline failed!');
    console.error(`   Error: ${result.error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
