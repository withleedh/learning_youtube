import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import type { AudioFile } from '../src/tts/types';
import { calculateIntroDuration } from '../src/compositions/Intro';
import { calculateStep1Duration } from '../src/compositions/Step1';
import { calculateStep2Duration } from '../src/compositions/Step2';
import { calculateStep3Duration } from '../src/compositions/Step3';
import { calculateStep4Duration } from '../src/compositions/Step4';
import { STEP_TRANSITION_DURATION } from '../src/compositions/StepTransition';

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

  // Load audio manifest and convert to staticFile paths
  const manifestPath = path.join(baseDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);

  // Convert absolute paths to staticFile paths for Remotion (with outputFolder prefix)
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `${outputFolder}/audio/${path.basename(af.path)}`,
  }));

  console.log(`📝 Script: ${script.metadata.title.target}`);
  console.log(`🎤 Audio files: ${audioFiles.length}`);
  console.log(`📊 Sentences: ${script.sentences.length}`);
  console.log(`🔊 Sample audio path: ${audioFiles[0].path}`);

  // Background image path (with outputFolder prefix for dynamic files)
  const backgroundImage = `${outputFolder}/background.png`;
  console.log(`🖼️ Background image: ${backgroundImage}`);

  // Bundle the Remotion project - use channel output folder as publicDir
  console.log('\n📦 Bundling Remotion project...');
  const channelOutputDir = path.join(process.cwd(), 'output', channelId);
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (config) => config,
    publicDir: channelOutputDir,
  });

  console.log(`📂 Public dir: ${channelOutputDir}`);
  console.log(`📦 Bundle location: ${bundleLocation}`);

  // Build inputProps with all asset paths
  // Asset paths use assets/ prefix (shared assets in output/{channelId}/assets/)
  const inputProps = {
    config,
    script,
    audioFiles,
    backgroundImage,
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

  console.log(`\n\n✅ Video rendered successfully!`);
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

  // Calculate timeline
  let currentFrame = 0;
  const timeline: Array<{ time: string; label: string }> = [];

  // Intro
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: '인트로 (필수!)' });
  currentFrame += introDuration;

  // Step 1
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: 'Step 1. 자막 없이 듣기',
  });
  currentFrame += step1Duration;

  // Step 2
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: 'Step 2. 자막 보며 듣기',
  });
  currentFrame += step2Duration;

  // Step 3
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: 'Step 3. 문장별 3단계 훈련',
  });
  currentFrame += step3Duration;

  // Step 4
  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: 'Step 4. 최종 확인' });
  currentFrame += step4Duration;

  // Ending
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: '마무리' });

  const uploadInfoPath = path.join(baseDir, 'upload_info.txt');
  const timelineText = timeline.map((t) => `${t.time} ${t.label}`).join('\n');
  const uploadInfo = `타임라인:
${timelineText}

제목: ${script.metadata.title.target}
토픽: ${script.metadata.topic}
카테고리: ${script.category}
`;

  await fs.writeFile(uploadInfoPath, uploadInfo, 'utf-8');
  console.log(`✅ Upload info created: ${uploadInfoPath}`);
  console.log('\n타임라인:');
  timeline.forEach((t) => console.log(`  ${t.time} ${t.label}`));
}

renderVideo().catch(console.error);
