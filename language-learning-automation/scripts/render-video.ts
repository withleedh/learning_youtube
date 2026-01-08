import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import type { AudioFile } from '../src/tts/types';

async function renderVideo() {
  console.log('🎬 Starting video render...\n');

  const baseDir = path.join(process.cwd(), 'output/english/2026-01-08');

  // Load script
  const scriptPath = path.join(baseDir, '2026-01-08_conversation.json');
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels/english.json');
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Load audio manifest and convert to staticFile paths
  const manifestPath = path.join(baseDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);

  // Convert absolute paths to staticFile paths for Remotion
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `audio/${path.basename(af.path)}`,
  }));

  console.log(`📝 Script: ${script.metadata.title.target}`);
  console.log(`🎤 Audio files: ${audioFiles.length}`);
  console.log(`📊 Sentences: ${script.sentences.length}`);
  console.log(`🔊 Sample audio path: ${audioFiles[0].path}`);

  // Background image path (relative to public folder)
  const backgroundImage = 'background.png';
  console.log(`🖼️ Background image: ${backgroundImage}`);

  // Bundle the Remotion project
  console.log('\n📦 Bundling Remotion project...');
  const publicDir = path.join(process.cwd(), 'public');
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (config) => config,
    publicDir,
  });

  console.log(`📂 Public dir: ${publicDir}`);
  console.log(`📦 Bundle location: ${bundleLocation}`);

  // Select the Main composition
  console.log('🎯 Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'Main',
    inputProps: {
      config,
      script,
      audioFiles,
      backgroundImage,
    },
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
    inputProps: {
      config,
      script,
      audioFiles,
      backgroundImage,
    },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   Progress: ${(progress * 100).toFixed(1)}%`);
    },
  });

  console.log(`\n\n✅ Video rendered successfully!`);
  console.log(`📁 Output: ${outputPath}`);

  // Get file size
  const stats = await fs.stat(outputPath);
  console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

renderVideo().catch(console.error);
