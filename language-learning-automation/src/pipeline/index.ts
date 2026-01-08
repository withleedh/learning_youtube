import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig, listChannels } from '../config/loader';
import { generateScript, saveScript, createSampleScript } from '../script/generator';
import { generateAllAudio, createMockAudioFiles } from '../tts/generator';
import type { ChannelConfig } from '../config/types';
import type { Script } from '../script/types';
import type { AudioFile } from '../tts/types';
import type { Category } from '../script/types';

export interface PipelineOptions {
  channelId: string;
  category?: Category;
  topic?: string;
  useMockTTS?: boolean;
  useSampleScript?: boolean;
  outputDir?: string;
}

export interface PipelineResult {
  success: boolean;
  channelId: string;
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
  outputDir: string;
  error?: string;
}

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * Run the full pipeline for a single channel
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { channelId, category, topic, useMockTTS = false, useSampleScript = false } = options;

  console.log(`\n🚀 Starting pipeline for channel: ${channelId}`);

  try {
    // Step 1: Load config
    console.log('📋 Loading channel configuration...');
    const config = await loadConfig(channelId);
    console.log(`   ✓ Loaded config for "${config.meta.name}"`);

    // Step 2: Generate or load script
    console.log('📝 Generating script...');
    let script: Script;
    if (useSampleScript) {
      script = createSampleScript(config, category || 'conversation');
      console.log('   ✓ Created sample script (mock mode)');
    } else {
      script = await generateScript(config, category, topic);
      console.log(`   ✓ Generated script: "${script.metadata.title.target}"`);
    }

    // Step 3: Setup output directory
    const dateStr = new Date().toISOString().split('T')[0];
    const outputDir = options.outputDir || path.join(DEFAULT_OUTPUT_DIR, channelId, dateStr);
    await fs.mkdir(outputDir, { recursive: true });
    const audioDir = path.join(outputDir, 'audio');
    await fs.mkdir(audioDir, { recursive: true });

    // Step 4: Save script
    const scriptPath = await saveScript(script, outputDir);
    console.log(`   ✓ Saved script to: ${scriptPath}`);

    // Step 5: Generate TTS audio
    console.log('🔊 Generating TTS audio...');
    let audioFiles: AudioFile[];
    if (useMockTTS) {
      audioFiles = await createMockAudioFiles(script, audioDir);
      console.log(`   ✓ Created ${audioFiles.length} mock audio files`);
    } else {
      audioFiles = await generateAllAudio(script, config, audioDir, (current, total) => {
        console.log(`   Processing sentence ${current}/${total}...`);
      });
      console.log(`   ✓ Generated ${audioFiles.length} audio files`);
    }

    console.log(`\n✅ Pipeline completed for ${channelId}`);
    console.log(`   Output directory: ${outputDir}`);

    return {
      success: true,
      channelId,
      config,
      script,
      audioFiles,
      outputDir,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Pipeline failed for ${channelId}: ${errorMessage}`);

    return {
      success: false,
      channelId,
      config: {} as ChannelConfig,
      script: {} as Script,
      audioFiles: [],
      outputDir: '',
      error: errorMessage,
    };
  }
}

/**
 * Run pipeline for all available channels
 */
export async function runAllPipelines(
  options: Omit<PipelineOptions, 'channelId'>
): Promise<PipelineResult[]> {
  const channels = await listChannels();

  if (channels.length === 0) {
    console.log('⚠️ No channels found in channels/ directory');
    return [];
  }

  console.log(`\n📺 Running pipeline for ${channels.length} channel(s): ${channels.join(', ')}`);

  const results: PipelineResult[] = [];

  for (const channelId of channels) {
    const result = await runPipeline({ ...options, channelId });
    results.push(result);
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n📊 Pipeline Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);

  return results;
}
