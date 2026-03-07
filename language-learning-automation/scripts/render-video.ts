import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import type { AudioFile } from '../src/tts/types';
import { calculateExpectedAudioCount } from '../src/tts/types';
import { calculateIntroDuration } from '../src/compositions/Intro';
import { calculateStep1Duration } from '../src/compositions/Step1';
import { calculateStep2Duration } from '../src/compositions/Step2';
import { calculateStep3Duration } from '../src/compositions/Step3';
import { calculateStep4Duration } from '../src/compositions/Step4';
import { STEP_TRANSITION_DURATION } from '../src/compositions/StepTransition';
import { getTimelineLabels } from '../src/pipeline/index';

/**
 * Copy directory recursively
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Setup public folder by copying output assets
 */
async function setupPublicFolder(channelId: string, outputFolder: string): Promise<void> {
  const sourceDir = path.join(process.cwd(), 'output', channelId, outputFolder);
  const assetsDir = path.join(process.cwd(), 'output', channelId, 'assets');
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const publicDir = path.join(process.cwd(), 'public');

  console.log('\n📁 Setting up public folder...');

  // Clear and recreate public folder
  try {
    await fs.rm(publicDir, { recursive: true, force: true });
  } catch {
    // ignore if doesn't exist
  }
  await fs.mkdir(publicDir, { recursive: true });

  // Copy output folder contents to public/
  console.log(`   Copying ${outputFolder}/ → public/`);
  await copyDir(sourceDir, publicDir);

  // Copy shared assets directly to public/assets/
  try {
    await fs.access(assetsDir);
    console.log(`   Copying assets/ → public/assets/`);
    await copyDir(assetsDir, path.join(publicDir, 'assets'));
  } catch {
    console.log(`   ⚠️ No shared assets folder found`);
  }

  // Copy channel config for Remotion preview
  try {
    console.log(`   Copying ${channelId}.json → public/config.json`);
    await fs.copyFile(configPath, path.join(publicDir, 'config.json'));
  } catch {
    console.log(`   ⚠️ Channel config not found`);
  }

  // Find and copy script.json for Remotion preview
  const files = await fs.readdir(sourceDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && !f.includes('manifest'));
  if (scriptFile) {
    console.log(`   Copying ${scriptFile} → public/script.json`);
    await fs.copyFile(path.join(sourceDir, scriptFile), path.join(publicDir, 'script.json'));
  }

  console.log('   ✅ Public folder ready');
}

async function renderVideo() {
  console.log('🎬 Starting video render...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/render-video.ts <channelId> <outputFolder>');
    console.error('Example: npx ts-node scripts/render-video.ts english 2026-01-08_153045');
    process.exit(1);
  }

  const channelId = args[0];
  const outputFolder = args[1];
  const baseDir = path.join(process.cwd(), 'output', channelId, outputFolder);

  // Check if directory exists
  try {
    await fs.access(baseDir);
  } catch {
    console.error(`❌ Output directory not found: ${baseDir}`);
    process.exit(1);
  }

  // Find script file (look for any .json file that's not manifest.json)
  const files = await fs.readdir(baseDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && f !== 'manifest.json');

  if (!scriptFile) {
    console.error(`❌ No script file found in ${baseDir}`);
    process.exit(1);
  }

  // Load script
  const scriptPath = path.join(baseDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Load audio manifest
  const manifestPath = path.join(baseDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);
  const expectedAudioCount = calculateExpectedAudioCount(script.sentences.length);

  if (rawAudioFiles.length < expectedAudioCount) {
    console.error(
      `❌ Audio manifest incomplete: expected ${expectedAudioCount} audio files, got ${rawAudioFiles.length}`
    );
    process.exit(1);
  }

  // Setup public folder (copy assets before bundling)
  await setupPublicFolder(channelId, outputFolder);

  // Convert paths to simple staticFile paths (now relative to public/)
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `audio/${path.basename(af.path)}`,
  }));

  console.log(`\n📝 Script: ${script.metadata.title.target}`);
  console.log(`🎤 Audio files: ${audioFiles.length}`);
  console.log(`📊 Sentences: ${script.sentences.length}`);
  console.log(`🔊 Sample audio path: ${audioFiles[0].path}`);

  // Check for multi-scene images first
  let sceneImages: string[] | undefined;
  if (script.metadata.scenePrompts && script.metadata.scenePrompts.length > 0) {
    const sceneCount = script.metadata.scenePrompts.length;
    sceneImages = [];
    for (let i = 1; i <= sceneCount; i++) {
      const scenePath = path.join(baseDir, `scene_${i}.png`);
      try {
        await fs.access(scenePath);
        sceneImages.push(`scene_${i}.png`);
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

  // Background image path - use scene_1.png if available, otherwise background.png
  let backgroundImage = 'background.png';
  if (sceneImages && sceneImages.length > 0) {
    backgroundImage = sceneImages[0]; // Use first scene as fallback background
  } else {
    // Check if legacy background.png exists
    try {
      await fs.access(path.join(baseDir, 'background.png'));
    } catch {
      // No background.png, check for scene_1.png
      try {
        await fs.access(path.join(baseDir, 'scene_1.png'));
        backgroundImage = 'scene_1.png';
      } catch {
        console.warn('⚠️ No background image found!');
      }
    }
  }
  console.log(`🖼️ Background image: ${backgroundImage}`);

  // Bundle the Remotion project - use public/ as publicDir
  console.log('\n📦 Bundling Remotion project...');
  const publicDir = path.join(process.cwd(), 'public');
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (config) => config,
    publicDir,
  });

  console.log(`📂 Public dir: ${publicDir}`);
  console.log(`📦 Bundle location: ${bundleLocation}`);

  // Build inputProps with simplified asset paths
  const inputProps = {
    config,
    script,
    audioFiles,
    backgroundImage,
    sceneImages, // 🆕 Multi-scene images for character consistency
    // Shared asset paths (in public/assets/)
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

  // Select the Main composition
  console.log('🎯 Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'Main',
    inputProps,
  });

  // Output path
  const outputPath = path.join(baseDir, 'video.mp4');

  // Render the video
  console.log(`\n🎬 Rendering video to: ${outputPath}`);
  console.log(
    `   Duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / 30).toFixed(1)}s)`
  );

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   Progress: ${(progress * 100).toFixed(1)}%`);
    },
  });

  // Remove metadata (Remotion watermark)
  console.log(`\n\n🧹 Removing metadata...`);
  const { removeVideoMetadata } = await import('../src/video/utils');
  await removeVideoMetadata(outputPath);

  console.log(`\n✅ Video rendered successfully!`);
  console.log(`📁 Output: ${outputPath}`);

  // Get file size
  const stats = await fs.stat(outputPath);
  console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Calculate actual timeline based on composition durations
  console.log('\n📝 Generating upload_info.txt with actual timeline...');

  const FPS = 30;
  const framesToSeconds = (frames: number) => frames / FPS;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate durations (same logic as Main.tsx)
  const introDuration = calculateIntroDuration();
  const step1Duration = calculateStep1Duration(audioFiles);
  const step2Duration = calculateStep2Duration(script.sentences, audioFiles);
  const step3Duration = calculateStep3Duration(
    script.sentences,
    audioFiles,
    config.content.repeatCount
  );
  const step4Duration = calculateStep4Duration(audioFiles);

  // Get timeline labels based on native language
  const timelineLabels = getTimelineLabels(config.meta.nativeLanguage);

  // Calculate timeline
  let currentFrame = 0;
  const timeline: Array<{ time: string; label: string }> = [];

  // Intro
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: timelineLabels.intro });
  currentFrame += introDuration;

  // Step 1
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: timelineLabels.step1,
  });
  currentFrame += step1Duration;

  // Step 2
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: timelineLabels.step2,
  });
  currentFrame += step2Duration;

  // Step 3
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: timelineLabels.step3,
  });
  currentFrame += step3Duration;

  // Step 4
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: timelineLabels.step4 });
  currentFrame += step4Duration;

  // Ending
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: timelineLabels.ending });

  const uploadInfoPath = path.join(baseDir, 'upload_info.txt');
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

renderVideo().catch(console.error);
