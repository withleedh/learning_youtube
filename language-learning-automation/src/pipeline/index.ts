import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig, listChannels } from '../config/loader';
import { generateScript, saveScript, createSampleScript } from '../script/generator';
import { generateAllAudio, createMockAudioFiles } from '../tts/generator';
import { IntroGenerator } from '../intro/generator';
import {
  generateBackgroundImage,
  generateThumbnail,
  generateSceneImages,
} from '../image/generator';
import { getGeminiApiKey, GEMINI_MODELS } from '../config/gemini';
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
  /** Auto-render video after pipeline completes */
  autoRender?: boolean;
  /** Render individual Shorts for each sentence */
  renderShorts?: boolean;
  /** Number of topic candidates to generate (default: 3) */
  topicCandidates?: number;
  /** Number of script candidates to generate (default: 3) */
  scriptCandidates?: number;
}

export interface PipelineResult {
  success: boolean;
  channelId: string;
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
  outputDir: string;
  /** Generated background image path (legacy single image) */
  backgroundImagePath?: string;
  /** Generated scene image paths (new multi-scene) */
  sceneImagePaths?: string[];
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
    autoRender = false,
    renderShorts = false,
    scriptCandidates = 3,
  } = options;

  console.log(`\n🚀 Starting pipeline for channel: ${channelId}`);

  try {
    // Step 1: Load config
    console.log('📋 Loading channel configuration...');
    const config = await loadConfig(channelId);
    console.log(`   ✓ Loaded config for "${config.meta.name}"`);

    // Step 1.5: Check and generate all required assets if needed
    if (!skipIntro) {
      await ensureChannelAssets(config);
    }

    // Step 2: Generate or load script
    console.log('📝 Generating script...');
    let script: Script;
    if (useSampleScript) {
      script = createSampleScript(config, category || 'conversation');
      console.log('   ✓ Created sample script (mock mode)');
    } else {
      script = await generateScript(config, category, topic, scriptCandidates);
      console.log(`   ✓ Generated script: "${script.metadata.title.target}"`);
    }

    // Step 3: Setup output directory (날짜 + 타임스탬프로 고유 폴더 생성)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // 2026-01-08
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // 153045
    const folderName = `${dateStr}_${timeStr}`; // 2026-01-08_153045
    const outputDir = options.outputDir || path.join(DEFAULT_OUTPUT_DIR, channelId, folderName);
    await fs.mkdir(outputDir, { recursive: true });
    const audioDir = path.join(outputDir, 'audio');
    await fs.mkdir(audioDir, { recursive: true });

    // Step 4: Save script
    const scriptPath = await saveScript(script, outputDir);
    console.log(`   ✓ Saved script to: ${scriptPath}`);

    // Step 5: Generate background image(s)
    let backgroundImagePath: string | undefined;
    let sceneImagePaths: string[] | undefined;

    if (!skipImage) {
      // Check if script has scenePrompts (new format)
      if (script.metadata.scenePrompts && script.metadata.scenePrompts.length > 0) {
        console.log('🎨 Generating multi-scene images with character consistency...');
        try {
          sceneImagePaths = await generateSceneImages(
            script,
            outputDir,
            config.theme.preferredArtStyle
          );
          // Use first scene as background for legacy compatibility
          if (sceneImagePaths.length > 0) {
            backgroundImagePath = sceneImagePaths[0];
          }
          console.log(`   ✓ Generated ${sceneImagePaths.length} scene images`);
        } catch (imageError) {
          console.warn(`   ⚠️ Failed to generate scene images: ${imageError}`);
          // Fallback to single image
          console.log('   🔄 Falling back to single background image...');
          try {
            backgroundImagePath = await generateBackgroundImage(
              script.metadata.topic,
              script.metadata.title.target,
              outputDir,
              script.metadata.imagePrompt,
              config.theme.preferredArtStyle
            );
          } catch (fallbackError) {
            console.warn(`   ⚠️ Fallback also failed: ${fallbackError}`);
          }
        }
      } else {
        // Legacy: single background image
        console.log('🎨 Generating background image...');
        try {
          backgroundImagePath = await generateBackgroundImage(
            script.metadata.topic,
            script.metadata.title.target,
            outputDir,
            script.metadata.imagePrompt,
            config.theme.preferredArtStyle
          );
          console.log(`   ✓ Generated background image: ${backgroundImagePath}`);
        } catch (imageError) {
          console.warn(`   ⚠️ Failed to generate background image: ${imageError}`);
        }
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

    // Save audio manifest
    const manifestPath = path.join(audioDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(audioFiles, null, 2));
    console.log(`   ✓ Saved audio manifest: ${manifestPath}`);

    // Shared assets are already set up by ensureChannelAssets
    console.log('📦 Shared assets ready');

    console.log(`\n✅ Pipeline completed for ${channelId}`);
    console.log(`   Output directory: ${outputDir}`);

    // Auto-render video if requested
    if (autoRender) {
      console.log(`\n🎬 Auto-rendering video...`);
      const folderName = path.basename(outputDir);
      await renderVideo(channelId, folderName, outputDir);
    }

    // Render Shorts if requested
    if (renderShorts) {
      console.log(`\n📱 Rendering Shorts...`);
      const folderName = path.basename(outputDir);
      await renderShortsBatch(channelId, folderName, outputDir);
    }

    return {
      success: true,
      channelId,
      config,
      script,
      audioFiles,
      outputDir,
      backgroundImagePath,
      sceneImagePaths,
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
 * Ensure all required assets exist for a channel in output/{channelId}/assets/
 * Generate missing assets automatically
 */
async function ensureChannelAssets(config: ChannelConfig): Promise<void> {
  const channelOutputDir = path.join(DEFAULT_OUTPUT_DIR, config.channelId);
  const assetsDir = path.join(channelOutputDir, 'assets');
  const introDir = path.join(assetsDir, 'intro');

  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(introDir, { recursive: true });

  console.log('📦 Checking required assets...');

  // Required assets list
  const requiredAssets = [
    'intro.mp3', // background music (shared across channels)
    'intro-viral.mp3',
    'intro-narration.mp3',
    'intro-step1.mp3',
    'intro-step2.mp3',
    'intro-step3.mp3',
    'intro-step4.mp3',
    'intro-closing.mp3',
    'step-transition-1.mp3',
    'step-transition-2.mp3',
    'step-transition-3.mp3',
    'step-transition-4.mp3',
    'bell.wav',
    'intro/background.png',
    'thumbnail.png',
  ];

  // Check which assets are missing
  const missingAssets: string[] = [];
  for (const asset of requiredAssets) {
    const assetPath = path.join(assetsDir, asset);
    try {
      await fs.access(assetPath);
    } catch {
      missingAssets.push(asset);
    }
  }

  if (missingAssets.length === 0) {
    console.log('   ✓ All required assets exist');
    return;
  }

  console.log(`   ⚠️ Missing ${missingAssets.length} assets, generating...`);

  // Generate missing TTS assets (exclude intro.mp3 which is music, not TTS)
  const ttsAssets = missingAssets.filter((a) => a.endsWith('.mp3') && a !== 'intro.mp3');
  if (ttsAssets.length > 0) {
    await generateAllTTSAssets(config, assetsDir, ttsAssets);
  }

  // Copy intro.mp3 (background music) from english channel if missing
  if (missingAssets.includes('intro.mp3')) {
    const englishIntroPath = path.join(DEFAULT_OUTPUT_DIR, 'english', 'assets', 'intro.mp3');
    const publicIntroPath = path.join(process.cwd(), 'public', 'assets', 'english', 'intro.mp3');
    const destIntroPath = path.join(assetsDir, 'intro.mp3');

    try {
      await fs.access(englishIntroPath);
      await fs.copyFile(englishIntroPath, destIntroPath);
      console.log('   ✓ Copied intro.mp3 from english channel');
    } catch {
      try {
        await fs.access(publicIntroPath);
        await fs.copyFile(publicIntroPath, destIntroPath);
        console.log('   ✓ Copied intro.mp3 from public assets');
      } catch {
        console.log('   ⚠️ intro.mp3 not found, skipping');
      }
    }
  }

  // Generate bell.wav if missing (copy from english channel or create silence)
  if (missingAssets.includes('bell.wav')) {
    const englishBellPath = path.join(DEFAULT_OUTPUT_DIR, 'english', 'assets', 'bell.wav');
    const publicBellPath = path.join(process.cwd(), 'public', 'assets', 'english', 'bell.wav');
    const destBellPath = path.join(assetsDir, 'bell.wav');

    try {
      // Try to copy from english output first
      await fs.access(englishBellPath);
      await fs.copyFile(englishBellPath, destBellPath);
      console.log('   ✓ Copied bell.wav from english channel');
    } catch {
      try {
        // Try public folder
        await fs.access(publicBellPath);
        await fs.copyFile(publicBellPath, destBellPath);
        console.log('   ✓ Copied bell.wav from public assets');
      } catch {
        console.log('   ⚠️ bell.wav not found, skipping');
      }
    }
  }

  // Generate intro background image if missing
  if (missingAssets.includes('intro/background.png')) {
    try {
      const apiKey = getGeminiApiKey();
      console.log('   🎨 Generating intro background image...');
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
    } catch {
      console.log('   ⚠️ GEMINI_API_KEY not set, skipping intro background');
    }
  }

  // Generate thumbnail if missing
  if (missingAssets.includes('thumbnail.png')) {
    try {
      getGeminiApiKey(); // Check if API key exists
      console.log('   🎨 Generating thumbnail...');
      const thumbnailConfig = config.thumbnail || {};
      await generateThumbnail({
        channelName: thumbnailConfig.channelName || config.meta.name,
        characterStyle: thumbnailConfig.characterStyle || 'animals',
        customCharacters: thumbnailConfig.customCharacters,
        backgroundColor: thumbnailConfig.backgroundColor || 'dark blue',
        outputPath: path.join(assetsDir, 'thumbnail.png'),
      });
    } catch {
      console.log('   ⚠️ GEMINI_API_KEY not set, skipping thumbnail');
    }
  }
}

/**
 * Generate all required TTS assets for a channel
 */
async function generateAllTTSAssets(
  config: ChannelConfig,
  outputDir: string,
  missingAssets: string[]
): Promise<void> {
  const { EdgeTTS } = await import('@andresaya/edge-tts');

  // Voice mapping based on native language (viewer's language)
  const voiceMap: Record<string, string> = {
    Korean: 'ko-KR-SunHiNeural',
    Japanese: 'ja-JP-NanamiNeural',
    Chinese: 'zh-CN-XiaoxiaoNeural',
    English: 'en-US-JennyNeural',
    Spanish: 'es-ES-ElviraNeural',
    French: 'fr-FR-DeniseNeural',
    German: 'de-DE-KatjaNeural',
  };

  const voice = voiceMap[config.meta.nativeLanguage] || voiceMap['English'];

  // Language name in native language
  const languageNames: Record<string, Record<string, string>> = {
    Korean: {
      English: '영어',
      Japanese: '일본어',
      Chinese: '중국어',
      Spanish: '스페인어',
      French: '프랑스어',
      German: '독일어',
      Korean: '한국어',
    },
    English: {
      English: 'English',
      Japanese: 'Japanese',
      Chinese: 'Chinese',
      Spanish: 'Spanish',
      French: 'French',
      German: 'German',
      Korean: 'Korean',
    },
  };

  const langNames = languageNames[config.meta.nativeLanguage] || languageNames['English'];
  const targetLangName = langNames[config.meta.targetLanguage] || config.meta.targetLanguage;

  // TTS content based on native language
  const isKorean = config.meta.nativeLanguage === 'Korean';

  const ttsContent: Record<string, string> = {
    'intro-viral.mp3': isKorean
      ? `${targetLangName} 문장을 반복해서 듣고, ${targetLangName}가 들리는 순간을 느껴보세요.`
      : `Listen to ${targetLangName} sentences repeatedly and feel the moment when ${targetLangName} starts to click.`,
    'intro-narration.mp3': isKorean
      ? '이 영상은 다음 네 단계로 진행됩니다.'
      : 'This video consists of four steps.',
    'intro-step1.mp3': isKorean
      ? '첫 번째 단계. 자막 없이 전체 흐름을 파악합니다. 소리에만 집중하며 상황을 상상해보세요.'
      : 'Step one. Get the big picture without subtitles. Focus on the sounds and imagine the situation.',
    'intro-step2.mp3': isKorean
      ? '두 번째 단계. 자막과 함께 들으며 내용을 이해합니다. 안 들렸던 부분을 확인하세요.'
      : 'Step two. Listen with subtitles to understand the content. Check the parts you missed.',
    'intro-step3.mp3': isKorean
      ? '세 번째 단계. 느리게, 빈칸, 빠르게 반복 훈련을 합니다. 이 단계에서 귀가 열리기 시작합니다.'
      : 'Step three. Practice with slow, fill-in-the-blank, and fast repetition. This is where your ears start to open.',
    'intro-step4.mp3': isKorean
      ? '네 번째 단계. 다시 자막 없이 들어봅니다. 놀랍게 선명해진 소리를 직접 확인하세요.'
      : 'Step four. Listen again without subtitles. Experience how much clearer it sounds now.',
    'intro-closing.mp3': isKorean ? '자, 그럼 시작해볼까요?' : "Alright, let's get started!",
    'step-transition-1.mp3': isKorean
      ? '스텝 원. 자막 없이 듣기'
      : 'Step one. Listen without subtitles.',
    'step-transition-2.mp3': isKorean
      ? '스텝 투. 자막 보며 듣기'
      : 'Step two. Listen with subtitles.',
    'step-transition-3.mp3': isKorean ? '스텝 쓰리. 반복 훈련' : 'Step three. Repetition training.',
    'step-transition-4.mp3': isKorean ? '스텝 포. 최종 확인' : 'Step four. Final check.',
  };

  for (const asset of missingAssets) {
    const text = ttsContent[asset];
    if (!text) continue;

    const assetPath = path.join(outputDir, asset);

    try {
      const tts = new EdgeTTS();
      await tts.synthesize(text, voice, { rate: '+0%' });
      await fs.writeFile(assetPath, await tts.toBuffer());
      console.log(`   ✓ Generated ${asset}`);
    } catch (error) {
      console.error(`   ❌ Failed to generate ${asset}: ${error}`);
    }
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

/**
 * Render video from pipeline output
 */
async function renderVideo(
  channelId: string,
  folderName: string,
  outputDir: string
): Promise<void> {
  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, selectComposition } = await import('@remotion/renderer');

  // Find script file
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && f !== 'manifest.json');

  if (!scriptFile) {
    throw new Error(`No script file found in ${outputDir}`);
  }

  // Load script
  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Load audio manifest
  const manifestPath = path.join(outputDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);

  // Convert to staticFile paths (with folderName prefix for dynamic files)
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `${folderName}/audio/${path.basename(af.path)}`,
  }));

  // Check for multi-scene images first
  let sceneImages: string[] | undefined;
  if (script.metadata.scenePrompts && script.metadata.scenePrompts.length > 0) {
    const sceneCount = script.metadata.scenePrompts.length;
    sceneImages = [];
    for (let i = 1; i <= sceneCount; i++) {
      const scenePath = path.join(outputDir, `scene_${i}.png`);
      try {
        await fs.access(scenePath);
        sceneImages.push(`${folderName}/scene_${i}.png`);
      } catch {
        // Scene image doesn't exist, skip
      }
    }
    if (sceneImages.length > 0) {
      console.log(`📸 Found ${sceneImages.length} scene images for multi-scene rendering`);
    } else {
      sceneImages = undefined;
    }
  }

  // Background image - use scene_1 if available, otherwise background.png
  let backgroundImage = `${folderName}/background.png`;
  if (sceneImages && sceneImages.length > 0) {
    backgroundImage = sceneImages[0]; // Use first scene as fallback background
  } else {
    // Check if legacy background.png exists
    try {
      await fs.access(path.join(outputDir, 'background.png'));
    } catch {
      // No background.png, check for scene_1.png
      try {
        await fs.access(path.join(outputDir, 'scene_1.png'));
        backgroundImage = `${folderName}/scene_1.png`;
      } catch {
        console.warn('⚠️ No background image found!');
      }
    }
  }

  // Bundle - use channel output folder as publicDir (contains both shared assets and run folders)
  console.log('📦 Bundling Remotion project...');
  const channelOutputDir = path.join(DEFAULT_OUTPUT_DIR, channelId);
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (config) => config,
    publicDir: channelOutputDir,
  });

  // Select composition with all required inputProps
  // Asset paths use assets/ prefix (shared assets in output/{channelId}/assets/)
  console.log('🎯 Selecting composition...');
  const inputProps = {
    config,
    script,
    audioFiles,
    backgroundImage,
    sceneImages, // 🆕 Multi-scene images for character consistency
    // Shared asset paths
    thumbnailPath: 'assets/thumbnail.png',
    viralNarrationPath: 'assets/intro-viral.mp3',
    viralNarrationDuration: 5.256,
    guideNarrationPath: 'assets/intro-narration.mp3',
    guideNarrationDuration: 3.936,
    stepNarrationPaths: [
      'assets/intro-step1.mp3',
      'assets/intro-step2.mp3',
      'assets/intro-step3.mp3',
      'assets/intro-step4.mp3',
    ],
    stepNarrationDurations: [8.52, 8.904, 9.72, 7.464],
    closingNarrationPath: 'assets/intro-closing.mp3',
    closingNarrationDuration: 2.952,
    stepTransitionTtsPaths: [
      'assets/step-transition-1.mp3',
      'assets/step-transition-2.mp3',
      'assets/step-transition-3.mp3',
      'assets/step-transition-4.mp3',
    ],
    stepTransitionBellPath: 'assets/bell.wav',
    endingBackgroundPath: 'assets/intro/background.png',
  };

  // Generate thumbnail with title text
  console.log('\n🖼️ Generating thumbnail...');
  const thumbnailPath = path.join(outputDir, 'episode_thumbnail.png');

  // Use scene_1.png if available, otherwise background.png
  let thumbnailSourcePath = path.join(outputDir, 'background.png');
  const scene1Path = path.join(outputDir, 'scene_1.png');
  try {
    await fs.access(scene1Path);
    thumbnailSourcePath = scene1Path;
    console.log('   Using scene_1.png as thumbnail source');
  } catch {
    console.log('   Using background.png as thumbnail source');
  }

  // Generate subtitle based on target language and native language
  const subtitleText = generateThumbnailSubtitle(
    config.meta.targetLanguage,
    config.meta.nativeLanguage
  );
  await generateVideoThumbnail(
    thumbnailSourcePath,
    script.metadata.title.native,
    subtitleText,
    thumbnailPath
  );
  console.log(`✅ Thumbnail created: ${thumbnailPath}`);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'Main',
    inputProps,
  });

  // Render
  const videoPath = path.join(outputDir, 'video.mp4');
  console.log(`🎬 Rendering video to: ${videoPath}`);
  console.log(
    `   Duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / 30).toFixed(1)}s)`
  );

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: videoPath,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   Progress: ${(progress * 100).toFixed(1)}%`);
    },
  });

  const stats = await fs.stat(videoPath);
  console.log(`\n\n✅ Video rendered successfully!`);
  console.log(`📁 Output: ${videoPath}`);
  console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Generate YouTube timestamp file
  console.log('\n📝 Generating upload_info.txt with timeline...');
  const { calculateIntroDuration } = await import('../compositions/Intro');
  const { calculateStep1Duration } = await import('../compositions/Step1');
  const { calculateStep2Duration } = await import('../compositions/Step2');
  const { calculateStep3Duration } = await import('../compositions/Step3');
  const { calculateStep4Duration } = await import('../compositions/Step4');
  const { STEP_TRANSITION_DURATION } = await import('../compositions/StepTransition');

  const FPS = 30;
  const framesToSeconds = (frames: number) => frames / FPS;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Use actual TTS durations from inputProps
  const introDuration = calculateIntroDuration(
    inputProps.viralNarrationDuration,
    inputProps.guideNarrationDuration,
    inputProps.stepNarrationDurations,
    inputProps.closingNarrationDuration
  );
  const step1Duration = calculateStep1Duration(audioFiles);
  const step2Duration = calculateStep2Duration(script.sentences, audioFiles);
  const step3Duration = calculateStep3Duration(
    script.sentences,
    audioFiles,
    config.content.repeatCount
  );
  const step4Duration = calculateStep4Duration(audioFiles);

  let currentFrame = 0;
  const timeline: Array<{ time: string; label: string }> = [];

  // 언어별 타임라인 라벨
  const timelineLabels = getTimelineLabels(config.meta.nativeLanguage);

  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: timelineLabels.intro });
  currentFrame += introDuration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: timelineLabels.step1,
  });
  currentFrame += step1Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: timelineLabels.step2,
  });
  currentFrame += step2Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: timelineLabels.step3,
  });
  currentFrame += step3Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: timelineLabels.step4 });
  currentFrame += step4Duration;

  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: timelineLabels.ending });

  const uploadInfoPath = path.join(outputDir, 'upload_info.txt');
  const timelineText = timeline.map((t) => `${t.time} ${t.label}`).join('\n');
  const uploadInfo = `${timelineLabels.timelineHeader}:
${timelineText}

${timelineLabels.titleLabel}: ${script.metadata.title.target}
${timelineLabels.topicLabel}: ${script.metadata.topic}
${timelineLabels.categoryLabel}: ${script.category}
`;

  await fs.writeFile(uploadInfoPath, uploadInfo, 'utf-8');
  console.log(`✅ Upload info created: ${uploadInfoPath}`);
  console.log(`\n${timelineLabels.timelineHeader}:`);
  timeline.forEach((t) => console.log(`  ${t.time} ${t.label}`));
}

/**
 * Get timeline labels based on native language
 */
export function getTimelineLabels(nativeLanguage: string = 'Korean') {
  const labels: Record<
    string,
    {
      timelineHeader: string;
      intro: string;
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      ending: string;
      titleLabel: string;
      topicLabel: string;
      categoryLabel: string;
    }
  > = {
    Korean: {
      timelineHeader: '타임라인',
      intro: '인트로',
      step1: 'Step 1. 전체 흐름 파악 (자막 없이 듣기)',
      step2: 'Step 2. 자막 보며 듣기',
      step3: 'Step 3. 문장별 3단계 훈련',
      step4: 'Step 4. 최종 확인',
      ending: '마무리',
      titleLabel: '제목',
      topicLabel: '토픽',
      categoryLabel: '카테고리',
    },
    English: {
      timelineHeader: 'Timeline',
      intro: 'Intro (Must Watch!)',
      step1: 'Step 1. Listen Without Subtitles',
      step2: 'Step 2. Listen With Subtitles',
      step3: 'Step 3. Sentence Repetition Training',
      step4: 'Step 4. Final Review',
      ending: 'Ending',
      titleLabel: 'Title',
      topicLabel: 'Topic',
      categoryLabel: 'Category',
    },
    Japanese: {
      timelineHeader: 'タイムライン',
      intro: 'イントロ（必見！）',
      step1: 'Step 1. 字幕なしで聞く',
      step2: 'Step 2. 字幕を見ながら聞く',
      step3: 'Step 3. 文ごとの3段階トレーニング',
      step4: 'Step 4. 最終確認',
      ending: 'エンディング',
      titleLabel: 'タイトル',
      topicLabel: 'トピック',
      categoryLabel: 'カテゴリ',
    },
    Chinese: {
      timelineHeader: '时间轴',
      intro: '开场（必看！）',
      step1: 'Step 1. 无字幕听力',
      step2: 'Step 2. 有字幕听力',
      step3: 'Step 3. 句子重复训练',
      step4: 'Step 4. 最终复习',
      ending: '结尾',
      titleLabel: '标题',
      topicLabel: '主题',
      categoryLabel: '类别',
    },
  };

  return labels[nativeLanguage] || labels['English'];
}

/**
 * Generate thumbnail subtitle text based on languages
 */
function generateThumbnailSubtitle(_targetLanguage: string, nativeLanguage: string): string {
  // 언어별 후킹 문구 (간단하게)
  if (nativeLanguage === 'Korean') {
    return `인생이 바뀌는 10분 영어`;
  } else if (nativeLanguage === 'Japanese') {
    return `毎日10分リスニング`;
  } else {
    return `10 Mins Daily Listening`;
  }
}

/**
 * Generate video thumbnail with title text overlay
 */
async function generateVideoThumbnail(
  backgroundPath: string,
  titleText: string,
  subtitleText: string,
  outputPath: string
): Promise<void> {
  const { createCanvas, loadImage } = await import('canvas');

  // YouTube thumbnail size: 1280x720
  const WIDTH = 1280;
  const HEIGHT = 720;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Load and draw background image
  try {
    const bgImage = await loadImage(backgroundPath);
    const scale = Math.max(WIDTH / bgImage.width, HEIGHT / bgImage.height);
    const scaledWidth = bgImage.width * scale;
    const scaledHeight = bgImage.height * scale;
    const x = (WIDTH - scaledWidth) / 2;
    const y = (HEIGHT - scaledHeight) / 2;
    ctx.drawImage(bgImage, x, y, scaledWidth, scaledHeight);
  } catch {
    // If background fails, use dark gradient
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Add bottom gradient overlay (transparent to dark)
  const gradient = ctx.createLinearGradient(0, HEIGHT * 0.5, 0, HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw title text (white, smaller, above subtitle)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Title - white text with black stroke (125% size)
  let titleFontSize = 90; // 72 * 1.25
  if (titleText.length > 20) titleFontSize = 79; // 63 * 1.25
  if (titleText.length > 30) titleFontSize = 68; // 54 * 1.25

  ctx.font = `bold ${titleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;

  // Subtitle - pink/magenta (dynamic sizing based on text length)
  let subtitleFontSize = 135; // 기본 크기 (한국어용)
  if (subtitleText.length > 15) subtitleFontSize = 110; // 영어 "Korean Listening Practice"
  if (subtitleText.length > 25) subtitleFontSize = 90;
  if (subtitleText.length > 35) subtitleFontSize = 75;

  const subtitleY = HEIGHT - 30;
  const titleY = subtitleY - subtitleFontSize - 24; // 24px gap

  // Draw title with stroke (outline) first, then fill
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(titleText, WIDTH / 2, titleY);

  // Fill white text on top
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(titleText, WIDTH / 2, titleY);

  // Subtitle with stroke
  ctx.font = `bold ${subtitleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(subtitleText, WIDTH / 2, subtitleY);

  // Fill pink text on top
  ctx.fillStyle = '#FF1493'; // Deep pink / magenta
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(subtitleText, WIDTH / 2, subtitleY);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

/**
 * Render individual Shorts for each sentence
 */
async function renderShortsBatch(
  channelId: string,
  folderName: string,
  outputDir: string
): Promise<void> {
  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, selectComposition } = await import('@remotion/renderer');
  const { generateQuizChoices } = await import('../compositions/ListeningQuizShort');

  // Create shorts output directory
  const shortsDir = path.join(outputDir, 'shorts');
  await fs.mkdir(shortsDir, { recursive: true });

  // Find script file
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && f !== 'manifest.json');

  if (!scriptFile) {
    throw new Error(`No script file found in ${outputDir}`);
  }

  // Load script
  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  let script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Check if any sentence is missing wrongWordChoices
  const needsWrongWords = script.sentences.some(
    (s) => !s.wrongWordChoices || s.wrongWordChoices.length < 2
  );

  if (needsWrongWords) {
    console.log('🤖 Generating missing wrongWordChoices with GPT...');
    script = await generateMissingWrongAnswers(script, config);
    // Save updated script
    await fs.writeFile(scriptPath, JSON.stringify(script, null, 2));
    console.log('   ✅ Updated script with wrongWordChoices');
  }

  // Load audio manifest
  const manifestPath = path.join(outputDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);

  // Convert to staticFile paths
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `${folderName}/audio/${path.basename(af.path)}`,
  }));

  // Build scene image mapping from scenePrompts
  const scenePrompts = script.metadata.scenePrompts || [];
  const sceneImages: string[] = [];

  // Check which scene images exist
  for (let i = 1; i <= 10; i++) {
    const scenePath = path.join(outputDir, `scene_${i}.png`);
    try {
      await fs.access(scenePath);
      sceneImages.push(`${folderName}/scene_${i}.png`);
    } catch {
      break; // No more scene images
    }
  }

  console.log(`   🖼️ Found ${sceneImages.length} scene images`);

  // Helper function to get background image for a sentence
  const getBackgroundForSentence = (sentenceId: number): string => {
    // If we have scenePrompts and scene images, find the matching scene
    if (scenePrompts.length > 0 && sceneImages.length > 0) {
      for (let i = 0; i < scenePrompts.length; i++) {
        const [start, end] = scenePrompts[i].sentenceRange;
        if (sentenceId >= start && sentenceId <= end) {
          // Return corresponding scene image (1-indexed)
          if (i < sceneImages.length) {
            return sceneImages[i];
          }
        }
      }
    }

    // Fallback: use scene_1 or legacy background
    if (sceneImages.length > 0) {
      return sceneImages[0];
    }
    return `${folderName}/background.png`;
  };

  // Bundle Remotion project
  console.log('📦 Bundling Remotion project for Shorts...');
  const channelOutputDir = path.join(DEFAULT_OUTPUT_DIR, channelId);
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (cfg) => cfg,
    publicDir: channelOutputDir,
  });

  // Render each sentence as a Quiz Short
  const totalSentences = script.sentences.length;
  console.log(`📱 Rendering ${totalSentences} Quiz Shorts...`);

  for (let i = 0; i < script.sentences.length; i++) {
    const sentence = script.sentences[i];
    const audioFile = audioFiles.find((af) => af.sentenceId === sentence.id && af.speed === '1.0x');
    const slowAudioFile = audioFiles.find(
      (af) => af.sentenceId === sentence.id && af.speed === '0.8x'
    );

    if (!audioFile) {
      console.warn(`   ⚠️ No audio for sentence ${sentence.id}, skipping`);
      continue;
    }

    // Get the appropriate background image for this sentence
    const backgroundImage = getBackgroundForSentence(sentence.id);

    // Generate quiz choices from wrongWordChoices or fallback
    const quizSentence = {
      ...sentence,
      choices:
        sentence.wrongWordChoices && sentence.wrongWordChoices.length >= 2
          ? createChoicesFromWrongAnswers(
              sentence.blankAnswer,
              sentence.wrongWordChoices,
              sentence.id
            )
          : generateQuizChoices(sentence),
    };

    // Use ListeningQuizShort composition
    const compositionId = 'ListeningQuizShort';

    const inputProps = {
      sentence: quizSentence,
      audioFile,
      slowAudioFile,
      config,
      backgroundImage,
      sentenceIndex: i + 1,
      episodeTitle: script.metadata.title.native,
    };

    // Extract scene number from background path for logging
    const sceneMatch = backgroundImage.match(/scene_(\d+)/);
    const sceneInfo = sceneMatch ? ` [Scene ${sceneMatch[1]}]` : '';
    console.log(
      `   [${i + 1}/${totalSentences}]${sceneInfo} "${sentence.target.substring(0, 30)}..."`
    );

    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps,
      });

      const outputPath = path.join(shortsDir, `quiz_${String(i + 1).padStart(2, '0')}.mp4`);

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        onProgress: ({ progress }) => {
          process.stdout.write(
            `\r   [${i + 1}/${totalSentences}] Progress: ${(progress * 100).toFixed(1)}%`
          );
        },
      });

      const stats = await fs.stat(outputPath);
      console.log(
        `\n   ✅ quiz_${String(i + 1).padStart(2, '0')}.mp4 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
      );
    } catch (error) {
      console.error(`\n   ❌ Failed to render Short ${i + 1}: ${error}`);
    }
  }

  console.log(`\n✅ Quiz Shorts batch rendering completed!`);
  console.log(`📁 Output: ${shortsDir}`);
}

/**
 * Create quiz choices from wrongWordChoices array (단어 기반)
 */
function createChoicesFromWrongAnswers(
  blankAnswer: string,
  wrongWordChoices: string[],
  sentenceId: number
): Array<{ text: string; isCorrect: boolean }> {
  const correctIndex = sentenceId % 3;
  const choices: Array<{ text: string; isCorrect: boolean }> = [];
  let wrongIdx = 0;

  for (let i = 0; i < 3; i++) {
    if (i === correctIndex) {
      choices.push({ text: blankAnswer, isCorrect: true });
    } else {
      choices.push({ text: wrongWordChoices[wrongIdx++] || blankAnswer, isCorrect: false });
    }
  }

  return choices;
}

/**
 * Generate missing wrongWordChoices using GPT (단어 기반 오답)
 */
async function generateMissingWrongAnswers(
  script: Script,
  _config: ChannelConfig
): Promise<Script> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  // wrongWordChoices가 없는 문장 필터링
  const sentencesNeedingWrongWords = script.sentences.filter(
    (s) => !s.wrongWordChoices || s.wrongWordChoices.length < 2
  );

  if (sentencesNeedingWrongWords.length === 0) {
    return script;
  }

  const prompt = `Role: You are an Expert Language Assessment Specialist creating word-based quiz distractors.

Task:
For each blankAnswer word provided below, generate 2 phonetically similar WRONG WORDS.
These will be used in A/B/C word-choice quizzes in 5-second YouTube Shorts.

CRITICAL: Output must be SINGLE WORDS only, not sentences or phrases!

Techniques for creating confusing wrong word choices:
1. **Minimal pairs:** "walk" vs "work", "play" vs "pay", "right" vs "light"
2. **Similar sounds:** "hear" vs "here", "their" vs "there", "some" vs "same"
3. **Tense confusion:** "meet" vs "met", "like" vs "liked"
4. **Rhyming words:** "meeting" vs "eating" vs "beating"
5. **Similar spelling:** "familiar" vs "similar", "coffee" vs "copy"

Words to process:
${sentencesNeedingWrongWords.map((s) => `ID ${s.id}: blankAnswer="${s.blankAnswer}" (sentence: "${s.target}")`).join('\n')}

Output Format:
- Return ONLY a valid JSON object.
- Do NOT use markdown code blocks.
- Each value must be an array of exactly 2 SINGLE WORDS.

Example Output:
{
  "wrongWordChoices": {
    "1": ["eating", "beating"],
    "2": ["similar", "family"],
    "3": ["copy", "coughing"]
  }
}

Generate ONLY the JSON output.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('   ⚠️ Could not parse GPT response, using fallback');
      return script;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const wrongWordChoicesMap = parsed.wrongWordChoices || {};

    // Update sentences with generated wrongWordChoices
    const updatedSentences = script.sentences.map((sentence) => {
      if (!sentence.wrongWordChoices || sentence.wrongWordChoices.length < 2) {
        const generated = wrongWordChoicesMap[String(sentence.id)];
        if (generated && Array.isArray(generated) && generated.length >= 2) {
          return { ...sentence, wrongWordChoices: generated.slice(0, 2) };
        }
      }
      return sentence;
    });

    return { ...script, sentences: updatedSentences };
  } catch (error) {
    console.warn(`   ⚠️ GPT wrongWordChoices generation failed: ${error}`);
    return script;
  }
}
