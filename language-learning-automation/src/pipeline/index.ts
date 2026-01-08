import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig, listChannels } from '../config/loader';
import { generateScript, saveScript, createSampleScript } from '../script/generator';
import { generateAllAudio, createMockAudioFiles } from '../tts/generator';
import { IntroGenerator } from '../intro/generator';
import { generateBackgroundImage } from '../image/generator';
import type { IntroAssetConfig } from '../intro/types';
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
  /** Skip intro asset generation */
  skipIntro?: boolean;
  /** Skip background image generation */
  skipImage?: boolean;
}

export interface PipelineResult {
  success: boolean;
  channelId: string;
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
  outputDir: string;
  /** Generated background image path */
  backgroundImagePath?: string;
  error?: string;
}

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * Run the full pipeline for a single channel
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const {
    channelId,
    category,
    topic,
    useMockTTS = false,
    useSampleScript = false,
    skipIntro = false,
    skipImage = false,
  } = options;

  console.log(`\n🚀 Starting pipeline for channel: ${channelId}`);

  try {
    // Step 1: Load config
    console.log('📋 Loading channel configuration...');
    const config = await loadConfig(channelId);
    console.log(`   ✓ Loaded config for "${config.meta.name}"`);

    // Step 1.5: Check and generate intro assets if needed
    if (!skipIntro) {
      await ensureIntroAssets(config);
    }

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

    // Step 5: Generate background image
    let backgroundImagePath: string | undefined;
    if (!skipImage) {
      console.log('🎨 Generating background image...');
      try {
        backgroundImagePath = await generateBackgroundImage(
          script.metadata.topic,
          script.metadata.title.target,
          outputDir
        );
        console.log(`   ✓ Generated background image: ${backgroundImagePath}`);
      } catch (imageError) {
        console.warn(`   ⚠️ Failed to generate background image: ${imageError}`);
        // Continue without image - not a fatal error
      }
    }

    // Step 6: Generate TTS audio
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
      backgroundImagePath,
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
 * Ensure intro assets exist for a channel, generate if missing
 */
async function ensureIntroAssets(config: ChannelConfig): Promise<void> {
  const assetsDir = path.join(process.cwd(), 'public', 'assets', config.channelId);
  const introDir = path.join(assetsDir, 'intro');
  const manifestPath = path.join(introDir, 'manifest.json');

  // Check if intro assets already exist
  try {
    await fs.access(manifestPath);
    console.log('🎨 Intro assets already exist, skipping generation');
    return;
  } catch {
    // Assets don't exist, need to generate
  }

  // Check for required TTS files
  const viralTtsPath = path.join(assetsDir, 'intro-viral.mp3');
  const guideTtsPath = path.join(assetsDir, 'intro-narration.mp3');

  let needViralTts = false;
  let needGuideTts = false;

  try {
    await fs.access(viralTtsPath);
  } catch {
    needViralTts = true;
  }

  try {
    await fs.access(guideTtsPath);
  } catch {
    needGuideTts = true;
  }

  // Generate TTS if needed
  if (needViralTts || needGuideTts) {
    console.log('🎙️ Generating intro TTS narrations...');
    await generateIntroTTS(config, assetsDir, needViralTts, needGuideTts);
  }

  // Generate intro background image if GEMINI_API_KEY is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log('🎨 Generating intro background image...');
    const introConfig: IntroAssetConfig = {
      channelId: config.channelId,
      channelName: config.meta.name,
      targetLanguage: config.meta.targetLanguage,
      nativeLanguage: config.meta.nativeLanguage,
      primaryColor: config.theme.primaryColor,
      secondaryColor: config.theme.secondaryColor || '#FF69B4',
      style: 'modern',
    };

    const generator = new IntroGenerator(apiKey);
    await generator.generateIntroAssets(introConfig, { outputDir: assetsDir });
  } else {
    console.log('⚠️ GEMINI_API_KEY not set, skipping intro background generation');
  }
}

/**
 * Generate intro TTS files
 */
async function generateIntroTTS(
  config: ChannelConfig,
  outputDir: string,
  needViral: boolean,
  needGuide: boolean
): Promise<void> {
  const { EdgeTTS } = await import('@andresaya/edge-tts');

  // Voice mapping based on native language
  const voiceMap: Record<string, string> = {
    Korean: 'ko-KR-SunHiNeural',
    Japanese: 'ja-JP-NanamiNeural',
    Chinese: 'zh-CN-XiaoxiaoNeural',
    English: 'en-US-JennyNeural',
  };

  const voice = voiceMap[config.meta.nativeLanguage] || voiceMap['Korean'];

  // Language name in native language
  const languageMap: Record<string, string> = {
    English: '영어',
    Japanese: '일본어',
    Chinese: '중국어',
    Spanish: '스페인어',
    French: '프랑스어',
    German: '독일어',
  };

  const languageName = languageMap[config.meta.targetLanguage] || config.meta.targetLanguage;

  await fs.mkdir(outputDir, { recursive: true });

  if (needViral) {
    const viralText = `${languageName} 문장을 반복해서 듣고, ${languageName}가 들리는 순간을 느껴보세요.`;
    const viralPath = path.join(outputDir, 'intro-viral.mp3');

    const tts = new EdgeTTS();
    await tts.synthesize(viralText, voice, { rate: '+0%' });
    await fs.writeFile(viralPath, tts.toBuffer());
    console.log(`   ✓ Generated viral TTS: ${viralPath}`);
  }

  if (needGuide) {
    const guideText = '이 영상은 다음 네 단계로 진행됩니다.';
    const guidePath = path.join(outputDir, 'intro-narration.mp3');

    const tts = new EdgeTTS();
    await tts.synthesize(guideText, voice, { rate: '+0%' });
    await fs.writeFile(guidePath, tts.toBuffer());
    console.log(`   ✓ Generated guide TTS: ${guidePath}`);
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
